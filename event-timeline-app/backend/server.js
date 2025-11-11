import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

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

    // 调用 Kimi API，使用内置的 $web_search 工具
    const response = await client.chat.completions.create({
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
    });

    // 解析响应
    let content = response.choices[0].message.content;
    console.log('Raw response:', content);

    // 尝试提取 JSON（处理可能的 markdown 代码块）
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }

    // 解析 JSON
    const result = JSON.parse(content);

    // 验证数据结构
    if (!result.events || !Array.isArray(result.events)) {
      throw new Error('Invalid response format');
    }

    res.json({
      success: true,
      data: result,
      query: { event, startDate: start, endDate: end }
    });

  } catch (error) {
    console.error('Error searching events:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search events',
      details: error.response?.data || error.toString()
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🚀 Event Timeline Backend Server is running!`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`\n📝 Make sure to set KIMI_API_KEY in .env file\n`);
});
