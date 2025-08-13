# hearthstone-decks-mcp

[![npm version](https://badge.fury.io/js/hearthstone-decks-mcp.svg)](https://badge.fury.io/js/hearthstone-decks-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

一个基于Model Context Protocol (MCP)的炉石传说卡组解析服务器，可以解析卡组代码并返回详细的卡牌信息和封面图。

## 功能特性

- 🎯 **卡组代码解析**: 解析炉石传说卡组代码，返回详细的卡组信息
- 🔍 **卡牌搜索**: 根据卡牌名称搜索炉石传说卡牌
- 📋 **卡牌详情**: 根据卡牌ID获取详细的卡牌信息
- 🖼️ **封面图支持**: 自动获取卡牌封面图URL
- 📊 **统计信息**: 提供卡组统计（法力值分布、稀有度统计等）
- 🔌 **多传输方式**: 支持标准输入输出、HTTP SSE、流式传输

## 安装

### 全局安装（推荐）

```bash
npm install -g hearthstone-decks-mcp
```

### 本地安装

```bash
npm install hearthstone-decks-mcp
```

## 快速开始

### 作为MCP服务器使用

在Cursor或其他支持MCP的客户端中配置：

```json
{
  "mcpServers": {
    "hearthstone-decks": {
      "command": "npx",
      "args": ["hearthstone-decks-mcp"]
    }
  }
}
```

### 独立运行

#### 标准输入输出模式（stdio）
```bash
npx hearthstone-decks-mcp
# 或者
hearthstone-decks-mcp
```

#### HTTP SSE模式
```bash
npx hearthstone-decks-mcp --transport=http
# 或者
hearthstone-decks-mcp --transport=http
```

### 命令行选项

- `--transport=stdio` - 使用标准输入输出模式（默认）
- `--transport=http` - 使用HTTP SSE模式

### 环境变量

```bash
# HTTP服务器配置
HTTP_PORT=3000          # HTTP服务器端口（默认3000）
HTTP_HOST=localhost     # HTTP服务器主机（默认localhost）

# 卡牌数据缓存配置
CARD_DATA_TTL=24        # 卡牌数据缓存时间（小时，默认24）
```

## API接口

### 工具列表

1. **parse_deck_code** - 解析卡组代码
   - 参数：
     - `deckCode` (string, 必需): 炉石传说卡组代码
     - `includeStats` (boolean, 可选): 是否包含统计信息，默认为true
   
2. **search_cards** - 搜索卡牌
   - 参数：
     - `cardName` (string, 必需): 要搜索的卡牌名称
     - `limit` (integer, 可选): 返回结果数量限制，默认为10
   
3. **get_card_info** - 获取卡牌详情
   - 参数：
     - `cardId` (string, 必需): 炉石传说卡牌ID

### HTTP API端点

当使用HTTP模式时，服务器提供以下端点：

- `GET /` - 测试页面
- `GET /sse` - Server-Sent Events端点
- `GET /tools` - 获取可用工具列表
- `POST /tools/{toolName}` - 调用指定工具
- `GET /health` - 健康检查

## 使用示例

### 1. 解析卡组代码

```bash
curl -X POST http://localhost:3000/tools/parse_deck_code \
  -H "Content-Type: application/json" \
  -d '{
    "deckCode": "AAECAZ8FBugE7QXUBfcF4gXtBQwBAfcC5wP5A/4D5wWJBpkH4wfXCOsE7QX3BQAA",
    "includeStats": true
  }'
```

### 2. 搜索卡牌

```bash
curl -X POST http://localhost:3000/tools/search_cards \
  -H "Content-Type: application/json" \
  -d '{
    "cardName": "火球术",
    "limit": 5
  }'
```

### 3. 获取卡牌详情

```bash
curl -X POST http://localhost:3000/tools/get_card_info \
  -H "Content-Type: application/json" \
  -d '{
    "cardId": "CS2_029"
  }'
```

## 返回数据格式

### 卡组解析结果

```json
{
  "success": true,
  "data": {
    "meta": {
      "version": 1,
      "format": "Standard",
      "totalCards": 30,
      "deckCode": "AAECAZ8F..."
    },
    "heroes": [
      {
        "id": "HERO_04",
        "name": "乌瑟尔",
        "cardClass": "PALADIN",
        "imageUrl": "https://art.hearthstonejson.com/v1/render/latest/zhCN/512x/HERO_04.png"
      }
    ],
    "cards": [
      {
        "id": "CS2_088",
        "name": "守护者祝福",
        "cost": 1,
        "type": "SPELL",
        "cardClass": "PALADIN",
        "rarity": "COMMON",
        "count": 2,
        "imageUrl": "https://art.hearthstonejson.com/v1/render/latest/zhCN/512x/CS2_088.png"
      }
    ],
    "statistics": {
      "totalCards": 30,
      "totalUnique": 15,
      "manaCurve": [2, 4, 6, 8, 4, 3, 2, 1, 0, 0, 0],
      "rarities": {
        "COMMON": 14,
        "RARE": 8,
        "EPIC": 4,
        "LEGENDARY": 4
      },
      "cardTypes": {
        "MINION": 20,
        "SPELL": 8,
        "WEAPON": 2
      },
      "classes": {
        "PALADIN": 15,
        "NEUTRAL": 15
      }
    }
  }
}
```

## 数据源

- **卡牌数据**: [HearthstoneJSON API](https://api.hearthstonejson.com/v1/latest/zhCN/cards.json)
- **卡牌封面图**: [HearthstoneJSON Render API](https://art.hearthstonejson.com/v1/render/latest/zhCN/512x/{CARD_ID}.png)

### 卡牌ID说明

炉石传说的卡牌有两种ID格式：

1. **字符串ID** (如 `CS2_029`): 这是卡牌的唯一字符串标识符
2. **DBF ID** (如 `315`): 这是卡牌的数字标识符，用于卡组代码中

卡组代码解析时会获得DBF ID，然后通过映射关系找到对应的字符串ID和卡牌详细信息。

## 开发

### 从源码运行

```bash
git clone https://github.com/yinshawnrao/hearthstone-decks-mcp.git
cd hearthstone-decks-mcp
npm install
npm start
```

### 开发模式

```bash
npm run dev  # 使用nodemon自动重启
```

### 测试

```bash
npm test
```

## 技术栈

- **Node.js** - 运行时环境
- **@modelcontextprotocol/sdk** - MCP协议支持
- **Express.js** - HTTP服务器
- **node-fetch** - HTTP客户端
- **Server-Sent Events** - 实时通信

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

### 提交Issue

- 报告Bug
- 请求新功能
- 改进建议

### 提交Pull Request

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开Pull Request

## 更新日志

### v1.0.0
- 初始版本发布
- 支持卡组代码解析
- 支持卡牌搜索
- 支持卡牌详情查询
- 支持HTTP和stdio传输模式
- 提供美观的测试界面

## 注意事项

1. 首次运行时会从HearthstoneJSON API下载卡牌数据，可能需要一些时间
2. 卡牌数据会缓存24小时（可配置）
3. 部分卡组代码可能需要最新的解析算法支持
4. 建议在生产环境中配置适当的缓存和错误处理

## 常见问题

### Q: 卡组代码解析失败怎么办？
A: 请确保卡组代码是有效的炉石传说卡组代码，格式类似于 `AAECAZ8F...`

### Q: 搜索不到某些卡牌？
A: 请检查卡牌名称是否正确，支持中文和英文名称搜索

### Q: 图片无法显示？
A: 图片URL来自HearthstoneJSON，请检查网络连接和API可用性
