# Claude Agent SDK Hello World Demo

这是一个展示如何使用 Claude Agent SDK 的入门示例。

## 安装步骤

1. 安装依赖：
```bash
npm install
```

2. 设置 Anthropic API 密钥：
```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

3. 创建必要的目录：
```bash
mkdir -p agent/custom_scripts
```

## 运行

```bash
npm start
```

## 核心功能

这个 SDK 的基础是 `query()` 函数，它返回异步消息流。SDK 会生成一个 Claude Code 进程作为子进程，并通过 stdin/stdout 与之通信来自主执行任务。

## 配置选项

query 函数接受以下参数：
- `maxTurns` - 对话轮次限制
- `cwd` - agent 的工作目录
- `model` - 模型选择（sonnet, opus, haiku 或 inherit）
- `executable` - Node.js 二进制文件路径
- `allowedTools` - 控制可用工具的数组

## 可用工具

Agent 可以访问：
- 文件操作（Read, Write, Edit）
- 搜索功能（Glob, Grep, WebSearch）
- 执行能力（Bash, Task）
- Web 操作和规划等实用功能

## Hook 系统

开发者可以实现 `PreToolUse` hooks 来验证工具使用。示例中强制要求 JavaScript 和 TypeScript 文件必须写入 `custom_scripts` 目录。

## 消息处理

SDK 返回三类消息：系统消息、助手响应和工具结果。提取 Claude 的文本需要过滤 `'assistant'` 类型的消息并在响应结构中定位文本内容。
