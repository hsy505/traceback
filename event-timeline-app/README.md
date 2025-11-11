# 📅 事件追溯时间轴应用

一个基于 Kimi K2 API 和 vis-timeline 的事件追溯可视化应用，可以自动搜索网络新闻并以时间轴形式展示事件发展历程。

## ✨ 功能特点

- 🔍 **智能搜索**：使用 Kimi K2 API 的内置 `$web_search` 工具自动搜索网络信息
- 📊 **时间轴可视化**：基于 vis-timeline 库，支持缩放、拖拽等交互操作
- 🎯 **自定义时间范围**：默认一年，可自定义起止日期
- 📱 **响应式设计**：支持桌面和移动设备
- 💰 **成本优化**：使用 Kimi K2 模型，成本约为 Claude 的 1/6

## 🏗️ 技术栈

### 后端
- **Node.js** + **Express** - 服务器框架
- **Kimi K2 API** - AI 模型和网络搜索
- **OpenAI SDK** - API 客户端（兼容 Kimi）

### 前端
- **原生 HTML/CSS/JavaScript** - 无构建步骤
- **vis-timeline** - 时间轴可视化库

## 📁 项目结构

```
event-timeline-app/
├── backend/
│   ├── server.js          # Express 服务器
│   ├── package.json       # 依赖配置
│   └── .env.example       # 环境变量模板
├── frontend/
│   ├── index.html         # 主页面
│   ├── style.css          # 样式文件
│   └── app.js             # 前端逻辑
└── README.md              # 本文件
```

## 🚀 快速开始

### 1. 获取 Kimi API Key

1. 访问 [Kimi 开放平台](https://platform.moonshot.cn/)
2. 注册/登录账号
3. 在控制台创建 API Key
4. 复制 API Key 备用

### 2. 安装依赖

```bash
cd event-timeline-app/backend
npm install
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的 Kimi API Key
# KIMI_API_KEY=your_actual_api_key_here
```

### 4. 启动应用

```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

### 5. 使用应用

1. 在浏览器打开 `http://localhost:3000`
2. 输入想要追溯的事件（如：Tesla 新车发布）
3. 选择时间范围（默认过去一年）
4. 点击"🔍 搜索事件"
5. 等待 AI 搜索并生成时间轴

## 📝 使用示例

### 示例查询

- **科技事件**：
  - "OpenAI GPT-5 发布"
  - "特斯拉 Cybertruck 交付"
  - "苹果 Vision Pro 上市"

- **体育赛事**：
  - "2024巴黎奥运会"
  - "世界杯足球赛"

- **社会热点**：
  - "新冠疫情发展"
  - "碳中和政策"

### API 调用示例

```javascript
// POST /api/search-events
{
  "event": "Tesla 新车发布",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}

// 响应
{
  "success": true,
  "data": {
    "events": [
      {
        "date": "2024-03-15",
        "title": "特斯拉发布新款 Model 3",
        "summary": "特斯拉在美国发布了全新升级的 Model 3...",
        "source": "TechCrunch",
        "url": "https://example.com/article"
      }
      // ... 更多事件
    ]
  },
  "query": {
    "event": "Tesla 新车发布",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }
}
```

## 💰 成本估算

基于 Kimi K2 定价（$0.15/$2.50 per 1M tokens）：

| 使用场景 | 每月查询次数 | Token 消耗 | 预估成本 |
|---------|------------|----------|---------|
| 个人使用 | 50 次 | ~1M tokens | $1-2 |
| 轻度使用 | 200 次 | ~4M tokens | $4-8 |
| 中度使用 | 1000 次 | ~20M tokens | $20-40 |

> 注：实际成本取决于每次查询的复杂度和返回的事件数量

## 🔧 配置选项

### 环境变量

```bash
# .env 文件
KIMI_API_KEY=your_kimi_api_key    # 必填：Kimi API Key
PORT=3000                         # 可选：服务器端口（默认 3000）
```

### 前端配置

修改 `frontend/app.js` 中的 `API_BASE_URL`：

```javascript
const API_BASE_URL = 'http://localhost:3000/api';
```

### 时间轴配置

修改 `frontend/app.js` 中的 `options` 对象可以自定义时间轴样式：

```javascript
const options = {
    height: '300px',        // 时间轴高度
    zoomMin: ...,          // 最小缩放级别
    zoomMax: ...,          // 最大缩放级别
    orientation: 'top',    // 时间轴方向
    // ... 更多选项
};
```

## 🛠️ 开发模式

```bash
# 使用 --watch 模式，代码修改后自动重启
npm run dev
```

## 📚 API 文档

### POST /api/search-events

搜索事件时间轴

**请求体：**
```json
{
  "event": "string",      // 必填：事件名称
  "startDate": "string",  // 可选：开始日期 (YYYY-MM-DD)
  "endDate": "string"     // 可选：结束日期 (YYYY-MM-DD)
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "date": "YYYY-MM-DD",
        "title": "事件标题",
        "summary": "事件摘要",
        "source": "来源",
        "url": "链接"
      }
    ]
  },
  "query": { ... }
}
```

### GET /api/health

健康检查接口

**响应：**
```json
{
  "status": "ok",
  "message": "Backend is running"
}
```

## ❓ 常见问题

### Q: 搜索失败，提示 API Key 错误？
A: 检查 `.env` 文件中的 `KIMI_API_KEY` 是否正确填写。

### Q: 搜索结果为空？
A: 可能是事件描述不够明确，或者网络上确实没有相关信息。尝试使用更具体的关键词。

### Q: 时间轴显示异常？
A: 检查浏览器控制台是否有错误，确保 vis-timeline CDN 加载成功。

### Q: 如何修改搜索返回的事件数量？
A: 编辑 `backend/server.js` 中的提示词，修改 "10-15 个关键时间节点" 为你想要的数量。

## 🚧 待优化功能

- [ ] 支持多语言搜索
- [ ] 导出时间轴为图片/PDF
- [ ] 事件收藏和历史记录
- [ ] 多事件对比功能
- [ ] 更丰富的时间轴样式
- [ ] 服务端缓存优化

## 📄 许可证

MIT License

## 🙏 致谢

- [Moonshot AI (Kimi)](https://www.moonshot.cn/) - AI 模型和网络搜索能力
- [vis-timeline](https://visjs.github.io/vis-timeline/) - 时间轴可视化库
- [Express](https://expressjs.com/) - Web 框架

## 📮 反馈与支持

如有问题或建议，欢迎提交 Issue。

---

**Made with ❤️ using Kimi K2**
