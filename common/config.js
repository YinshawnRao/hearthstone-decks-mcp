import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

export const config = {
  http: {
    port: process.env.HTTP_PORT || 3000,
    host: process.env.HTTP_HOST || 'localhost'
  },
  hearthstone: {
    // 炉石传说JSON API基础URL
    cardApiUrl: 'https://api.hearthstonejson.com/v1/latest/zhCN/cards.json',
    // 卡牌封面图URL模板
    cardImageUrlTemplate: 'https://art.hearthstonejson.com/v1/render/latest/zhCN/512x/{CARD_ID}.png'
  },
  cache: {
    // 卡牌数据缓存时间 (小时)
    cardDataTtl: process.env.CARD_DATA_TTL || 24
  }
};
