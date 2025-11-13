import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// 辅助函数：从文本中提取 JSON
function extractJSON(text) {
  if (!text) return null;

  text = text.trim();

  // 尝试1: 检查是否已经是有效 JSON
  try {
    return JSON.parse(text);
  } catch (e) {
    // 继续尝试其他方法
  }

  // 尝试2: 从 markdown 代码块中提取
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch (e) {
      // 继续
    }
  }

  // 尝试3: 从 JSON 对象开始提取
  const jsonStart = text.indexOf('{');
  if (jsonStart !== -1) {
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = jsonStart; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            const jsonStr = text.substring(jsonStart, i + 1);
            try {
              return JSON.parse(jsonStr);
            } catch (e) {
              // 继续
            }
          }
        }
      }
    }
  }

  // 没有找到有效 JSON
  return null;
}

const app = express();
const PORT = process.env.PORT || 3000;

// 配置 Kimi API 客户端
const client = new OpenAI({
  apiKey: process.env.KIMI_API_KEY,
  baseURL: 'https://api.moonshot.cn/v1'
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// 搜索事件时间轴接口
app.post('/api/search-events', async (req, res) => {
  try {
    const { event, startDate, endDate } = req.body;

    if (!event) {
      return res.status(400).json({ error: 'Event name is required' });
    }

    // 计算默认时间范围（一年前到今天）
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];

    console.log(`Searching for event: "${event}" from ${start} to ${end}`);

    // 构建提示词
    const prompt = `请搜索关于"${event}"从 ${start} 到 ${end} 期间的重要新闻和事件。

要求：
1. 搜索并整理出 10-15 个关键时间节点
2. 每个事件包含：具体日期、标题、简短摘要（50字内）、来源链接
3. 按时间顺序排列（从早到晚）
4. 只返回 JSON 格式的数据，格式如下：

{
  "events": [
    {
      "date": "YYYY-MM-DD",
      "title": "事件标题",
      "summary": "事件摘要",
      "source": "来源网站名称",
      "url": "完整URL链接"
    }
  ]
}

请确保返回的是纯 JSON 格式，不要包含任何其他文字或解释。`;

    // 重试逻辑的辅助函数
    const makeRequestWithRetry = async (requestFn, maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await requestFn();
        } catch (error) {
          // 检查是否是速率限制错误
          if (error.status === 429 && attempt < maxRetries) {
            // 获取重试等待时间
            const retryAfter = parseInt(error.headers?.['retry-after'] || error.headers?.['x-retry-after'] || '1', 10);
            const waitTime = retryAfter * 1000; // 转换为毫秒

            console.log(`Rate limit hit (attempt ${attempt}/${maxRetries}). Waiting ${retryAfter}s before retry...`);

            // 等待指定时间后重试
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          // 如果不是速率限制错误，或已达到最大重试次数，抛出错误
          throw error;
        }
      }
    };

    // 声明 content 变量
    let content;

    // 调用 Kimi API，使用内置的 $web_search 工具
    const response = await makeRequestWithRetry(() =>
      client.chat.completions.create({
        model: 'moonshot-v1-128k',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的新闻事件整理助手。你会使用网络搜索工具查找相关信息，并以结构化的 JSON 格式返回结果。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [
          {
            type: 'builtin_function',
            function: {
              name: '$web_search'
            }
          }
        ],
        temperature: 0.3
      })
    );

    // 解析响应
    const message = response.choices[0].message;
    console.log('Response message:', JSON.stringify(message, null, 2));

    // 处理工具调用响应
    if (message.tool_calls && message.tool_calls.length > 0) {
      // 如果有工具调用，需要继续对话以获取最终结果
      console.log('Tool calls detected, processing...');

      // 构建工具调用的消息
      const messages = [
        {
          role: 'system',
          content: '你是一个专业的新闻事件整理助手。你会使用网络搜索工具查找相关信息，并以结构化的 JSON 格式返回结果。'
        },
        {
          role: 'user',
          content: prompt
        },
        {
          role: 'assistant',
          content: message.content,
          tool_calls: message.tool_calls
        }
      ];

      // 为每个工具调用添加结果
      for (const toolCall of message.tool_calls) {
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ result: 'Search completed', status: 'success' })
        });
      }

      // 再次调用 API 获取最终结果（使用重试逻辑）
      const finalResponse = await makeRequestWithRetry(() =>
        client.chat.completions.create({
          model: 'moonshot-v1-128k',
          messages: messages,
          temperature: 0.3
        })
      );

      content = finalResponse.choices[0].message.content;
      console.log('Final response content:', content);
    } else if (message.content) {
      content = message.content;
    } else {
      throw new Error('No content in response');
    }

    // 使用强大的 JSON 提取函数
    let result = extractJSON(content);

    // 如果提取失败，但内容是有效的 JSON 格式，直接解析
    if (!result && content && content.trim().startsWith('{')) {
      try {
        result = JSON.parse(content);
        console.log('Successfully parsed JSON directly from content');
      } catch (e) {
        console.log('Direct JSON parsing also failed:', e.message);

        // 尝试修复不完整的 JSON
        try {
          // 如果是由于字符串未终止导致的错误，尝试修复
          let fixedContent = content.trim();

          // 更智能的 JSON 修复策略
          // 1. 找到最后一个完整的事件对象
          const eventEndMatches = [...fixedContent.matchAll(/}/g)];
          let lastValidEventEnd = -1;

          // 从后往前找，确保找到的是事件对象的结束
          for (let i = eventEndMatches.length - 1; i >= 0; i--) {
            const endPos = eventEndMatches[i].index;
            const beforeEnd = fixedContent.substring(0, endPos + 1);

            // 检查这个结束位置是否可能是一个完整事件
            if (beforeEnd.includes('"date"') && beforeEnd.includes('"title"') && beforeEnd.includes('"summary"')) {
              lastValidEventEnd = endPos;
              break;
            }
          }

          if (lastValidEventEnd !== -1) {
            // 移除不完整的事件
            fixedContent = fixedContent.substring(0, lastValidEventEnd + 1);

            // 确保 events 数组正确结束
            if (fixedContent.includes('"events": [')) {
              // 如果最后一个事件后面有逗号，移除它
              if (fixedContent.endsWith(',')) {
                fixedContent = fixedContent.slice(0, -1);
              }
              fixedContent = fixedContent + '\n  ]\n}';
            }
          } else if (fixedContent.endsWith(',')) {
            // 如果是逗号结束，移除逗号并结束数组和对象
            fixedContent = fixedContent.slice(0, -1) + '\n  ]\n}';
          }

          // 再次尝试解析修复后的内容
          result = JSON.parse(fixedContent);
          console.log('Successfully parsed fixed JSON content');
        } catch (fixError) {
          console.log('JSON fixing also failed:', fixError.message);

          // 最终尝试：手动构建有效的事件数组
          try {
            const dateMatches = [...content.matchAll(/"date":\s*"([^"]+)"/g)];
            const titleMatches = [...content.matchAll(/"title":\s*"([^"]+)"/g)];
            const summaryMatches = [...content.matchAll(/"summary":\s*"([^"]+)"/g)];
            const sourceMatches = [...content.matchAll(/"source":\s*"([^"]+)"/g)];
            const urlMatches = [...content.matchAll(/"url":\s*"([^"]+)"/g)];

            if (dateMatches.length > 0 && titleMatches.length > 0) {
              const events = [];
              const minLength = Math.min(dateMatches.length, titleMatches.length, summaryMatches.length || dateMatches.length);

              for (let i = 0; i < minLength; i++) {
                events.push({
                  date: dateMatches[i] ? dateMatches[i][1] : '',
                  title: titleMatches[i] ? titleMatches[i][1] : '',
                  summary: summaryMatches[i] ? summaryMatches[i][1] : '',
                  source: sourceMatches[i] ? sourceMatches[i][1] : 'Unknown',
                  url: urlMatches[i] ? urlMatches[i][1] : ''
                });
              }

              result = { events };
              console.log('Successfully extracted events using regex parsing');
            }
          } catch (regexError) {
            console.log('Regex extraction also failed:', regexError.message);
          }
        }
      }
    }

    if (!result) {
      console.error('Failed to extract JSON from content');
      console.error('Raw content (first 500 chars):', content.substring(0, 500));
      throw new Error('Failed to parse JSON response: Invalid JSON format');
    }

    console.log('Extracted result:', JSON.stringify(result, null, 2).substring(0, 500));

    // 验证数据结构
    if (!result.events || !Array.isArray(result.events)) {
      throw new Error('Invalid response format: missing or invalid events array');
    }

    if (result.events.length === 0) {
      throw new Error('No events found in response');
    }

    res.json({
      success: true,
      data: result,
      query: { event, startDate: start, endDate: end }
    });

  } catch (error) {
    console.error('Error searching events:', error);

    // 提供更详细的错误信息用于调试
    const errorResponse = {
      success: false,
      error: error.message || 'Failed to search events',
      type: error.constructor.name
    };

    // 添加更多调试信息
    if (error.response?.data) {
      errorResponse.apiError = error.response.data;
    }
    if (error.cause) {
      errorResponse.cause = error.cause.message || error.cause.toString();
    }

    // 不同错误类型的特殊处理
    if (error.message.includes('API') || error.message.includes('Connection')) {
      errorResponse.suggestion = 'Please check if KIMI_API_KEY is valid and correctly configured in .env file';
    } else if (error.message.includes('JSON')) {
      errorResponse.suggestion = 'API response format issue. Please check the logs for more details.';
    }

    res.status(500).json(errorResponse);
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🚀 Event Timeline Backend Server is running!`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`\n📝 Make sure to set KIMI_API_KEY in .env file\n`);
});
