import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { config } from './common/config.js';
import { deckParser } from './common/deckParser.js';
import { hearthstoneAPI } from './common/hearthstoneApi.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HearthstoneDecksMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "hearthstone-decks-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.sseClients = new Set(); // 存储所有SSE客户端
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // 注册工具列表处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "parse_deck_code",
            description: "解析炉石传说卡组代码，返回详细的卡组信息，包括卡牌详情和封面图",
            inputSchema: {
              type: "object",
              properties: {
                deckCode: {
                  type: "string",
                  description: "炉石传说卡组代码（如：AAECAZ8FBugE7QXUBfcF4gXtBQwBAfcC5wP5A/4D5wWJBpkH4wfXCOsE7QX3BQAA）"
                },
                includeStats: {
                  type: "boolean",
                  description: "是否包含卡组统计信息（法力值分布、稀有度统计等），默认为true",
                  default: true
                }
              },
              required: ["deckCode"]
            }
          },
          {
            name: "search_cards",
            description: "根据卡牌名称搜索炉石传说卡牌信息",
            inputSchema: {
              type: "object",
              properties: {
                cardName: {
                  type: "string",
                  description: "要搜索的卡牌名称（支持模糊搜索）"
                },
                limit: {
                  type: "integer",
                  description: "返回结果数量限制，默认为10",
                  default: 10,
                  minimum: 1,
                  maximum: 50
                }
              },
              required: ["cardName"]
            }
          },
          {
            name: "get_card_info",
            description: "根据卡牌ID获取详细的炉石传说卡牌信息",
            inputSchema: {
              type: "object",
              properties: {
                cardId: {
                  type: "string",
                  description: "炉石传说卡牌ID"
                }
              },
              required: ["cardId"]
            }
          }
        ]
      };
    });

    // 注册工具调用处理器
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "parse_deck_code":
          return await this.parseDeckCode(args);
        case "search_cards":
          return await this.searchCards(args);
        case "get_card_info":
          return await this.getCardInfo(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  /**
   * 解析卡组代码工具
   */
  async parseDeckCode(args) {
    try {
      const { deckCode, includeStats = true } = args;

      if (!deckCode || typeof deckCode !== 'string') {
        throw new Error('deckCode is required and must be a string');
      }

      console.error(`Parsing deck code: ${deckCode.substring(0, 20)}...`);

      // 解析卡组代码
      const deckInfo = await deckParser.parseDeckCodeWithDetails(deckCode);

      // 如果不需要统计信息，则移除
      if (!includeStats) {
        delete deckInfo.statistics;
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              data: deckInfo
            }, null, 2)
          }
        ]
      };

    } catch (error) {
      console.error('Error parsing deck code:', error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message,
              code: 'DECK_PARSE_ERROR'
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }

  /**
   * 搜索卡牌工具
   */
  async searchCards(args) {
    try {
      const { cardName, limit = 10 } = args;

      if (!cardName || typeof cardName !== 'string') {
        throw new Error('cardName is required and must be a string');
      }

      console.error(`Searching cards with name: ${cardName}`);

      // 搜索卡牌
      const cards = await hearthstoneAPI.searchCardsByName(cardName);
      
      // 添加封面图URL并限制结果数量
      const cardsWithImages = hearthstoneAPI.addImageUrlToCards(cards.slice(0, limit));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              data: {
                cards: cardsWithImages,
                total: cards.length,
                returned: cardsWithImages.length,
                searchTerm: cardName
              }
            }, null, 2)
          }
        ]
      };

    } catch (error) {
      console.error('Error searching cards:', error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message,
              code: 'CARD_SEARCH_ERROR'
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }

  /**
   * 获取卡牌信息工具
   */
  async getCardInfo(args) {
    try {
      const { cardId } = args;

      if (!cardId || typeof cardId !== 'string') {
        throw new Error('cardId is required and must be a string');
      }

      console.error(`Getting card info for ID: ${cardId}`);

      // 获取卡牌信息
      const card = await hearthstoneAPI.getCardById(cardId);

      if (!card) {
        throw new Error(`Card with ID ${cardId} not found`);
      }

      // 添加封面图URL
      const cardWithImage = hearthstoneAPI.addImageUrlToCard(card);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              data: cardWithImage
            }, null, 2)
          }
        ]
      };

    } catch (error) {
      console.error('Error getting card info:', error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message,
              code: 'CARD_INFO_ERROR'
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }

  // 广播消息给所有SSE客户端
  broadcastToSSEClients(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    this.sseClients.forEach(client => {
      try {
        client.write(message);
      } catch (error) {
        console.error('Error sending SSE message:', error);
        this.sseClients.delete(client);
      }
    });
  }

  // HTTP SSE传输实现
  createHttpSseTransport() {
    const app = express();
    
    // 启用CORS
    app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept', 'Cache-Control']
    }));

    app.use(express.json());
    
    // 提供静态文件服务
    app.use('/static', express.static(path.join(__dirname, 'public')));

    // 主页重定向到测试页面
    app.get('/', (req, res) => {
      res.redirect('/static/test-client.html');
    });

    // SSE端点
    app.get('/sse', (req, res) => {
      // 设置SSE头
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // 发送初始连接事件
      res.write('data: {"type":"connection","message":"Connected to Hearthstone Decks MCP Server","timestamp":"' + new Date().toISOString() + '"}\n\n');

      // 添加到客户端集合
      this.sseClients.add(res);

      // 处理客户端断开连接
      req.on('close', () => {
        console.error('SSE client disconnected');
        this.sseClients.delete(res);
      });

      req.on('error', () => {
        this.sseClients.delete(res);
      });
    });

    // 工具列表端点
    app.get('/tools', async (req, res) => {
      try {
        const tools = [
          {
            name: "parse_deck_code",
            description: "解析炉石传说卡组代码，返回详细的卡组信息，包括卡牌详情和封面图",
            inputSchema: {
              type: "object",
              properties: {
                deckCode: {
                  type: "string",
                  description: "炉石传说卡组代码（如：AAECAZ8FBugE7QXUBfcF4gXtBQwBAfcC5wP5A/4D5wWJBpkH4wfXCOsE7QX3BQAA）"
                },
                includeStats: {
                  type: "boolean",
                  description: "是否包含卡组统计信息（法力值分布、稀有度统计等），默认为true",
                  default: true
                }
              },
              required: ["deckCode"]
            }
          },
          {
            name: "search_cards",
            description: "根据卡牌名称搜索炉石传说卡牌信息",
            inputSchema: {
              type: "object",
              properties: {
                cardName: {
                  type: "string",
                  description: "要搜索的卡牌名称（支持模糊搜索）"
                },
                limit: {
                  type: "integer",
                  description: "返回结果数量限制，默认为10",
                  default: 10,
                  minimum: 1,
                  maximum: 50
                }
              },
              required: ["cardName"]
            }
          },
          {
            name: "get_card_info",
            description: "根据卡牌ID获取详细的炉石传说卡牌信息",
            inputSchema: {
              type: "object",
              properties: {
                cardId: {
                  type: "string",
                  description: "炉石传说卡牌ID"
                }
              },
              required: ["cardId"]
            }
          }
        ];
        
        res.json({ tools });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 工具调用端点
    app.post('/tools/:toolName', async (req, res) => {
      try {
        const { toolName } = req.params;
        const args = req.body;

        console.error(`Tool called: ${toolName} with args:`, args);

        // 广播工具调用开始事件
        this.broadcastToSSEClients({
          type: 'tool_call_start',
          tool: toolName,
          arguments: args,
          timestamp: new Date().toISOString()
        });

        let result;
        switch (toolName) {
          case 'parse_deck_code':
            result = await this.parseDeckCode(args);
            break;
          case 'search_cards':
            result = await this.searchCards(args);
            break;
          case 'get_card_info':
            result = await this.getCardInfo(args);
            break;
          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }

        // 广播工具调用结果
        this.broadcastToSSEClients({
          type: 'tool_call_result',
          tool: toolName,
          result: result,
          timestamp: new Date().toISOString()
        });

        res.json(result);
      } catch (error) {
        const errorResponse = {
          type: 'tool_call_error',
          tool: req.params.toolName,
          error: error.message,
          timestamp: new Date().toISOString()
        };

        // 广播错误事件
        this.broadcastToSSEClients(errorResponse);

        res.status(500).json({
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message
            }, null, 2)
          }],
          isError: true
        });
      }
    });

    // 健康检查端点
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        server: 'hearthstone-decks-mcp-server',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        sseClients: this.sseClients.size
      });
    });

    return app;
  }

  async runStdio() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Hearthstone Decks MCP Server running on stdio");
    console.error("Server name: hearthstone-decks-server");
    console.error("Available tools: parse_deck_code, search_cards, get_card_info");
  }

  async runHttp() {
    const app = this.createHttpSseTransport();
    
    return new Promise((resolve, reject) => {
      const httpServer = app.listen(config.http.port, config.http.host, (error) => {
        if (error) {
          reject(error);
        } else {
          console.error(`Hearthstone Decks MCP Server running on http://${config.http.host}:${config.http.port}`);
          console.error(`SSE endpoint: http://${config.http.host}:${config.http.port}/sse`);
          console.error(`Tools endpoint: http://${config.http.host}:${config.http.port}/tools`);
          console.error(`Health check: http://${config.http.host}:${config.http.port}/health`);
          console.error(`Test client: http://${config.http.host}:${config.http.port}/`);
          resolve(httpServer);
        }
      });
    });
  }

  async run() {
    // 根据命令行参数选择传输方式
    const args = process.argv.slice(2);
    const transportArg = args.find(arg => arg.startsWith('--transport='));
    const transport = transportArg ? transportArg.split('=')[1] : 'stdio';

    if (transport === 'http') {
      await this.runHttp();
    } else {
      await this.runStdio();
    }
  }
}

// 启动服务器
const server = new HearthstoneDecksMCPServer();
server.run().catch(console.error);
