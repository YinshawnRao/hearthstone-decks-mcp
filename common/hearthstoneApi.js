import fetch from 'node-fetch';
import { config } from './config.js';

class HearthstoneAPI {
  constructor() {
    this.cardsCache = null;
    this.cacheTimestamp = null;
    this.cacheTtl = config.cache.cardDataTtl * 60 * 60 * 1000; // 转换为毫秒
  }

  /**
   * 获取所有卡牌数据（带缓存）
   */
  async getAllCards() {
    const now = Date.now();
    
    // 检查缓存是否有效
    if (this.cardsCache && this.cacheTimestamp && (now - this.cacheTimestamp < this.cacheTtl)) {
      return this.cardsCache;
    }

    try {
      console.error('Fetching card data from Hearthstone API...');
      const response = await fetch(config.hearthstone.cardApiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const cards = await response.json();
      
      // 创建ID到卡牌的映射，方便查找
      const cardsMap = new Map();
      const dbfIdMap = new Map();
      cards.forEach(card => {
        if (card.id) {
          cardsMap.set(card.id, card);
        }
        if (card.dbfId) {
          dbfIdMap.set(card.dbfId, card);
        }
      });

      // 将两个映射都缓存
      this.cardsCache = { byId: cardsMap, byDbfId: dbfIdMap };
      this.cacheTimestamp = now;
      
      console.error(`Loaded ${cardsMap.size} cards from Hearthstone API`);
      return this.cardsCache;
    } catch (error) {
      console.error('Error fetching card data:', error);
      throw new Error(`Failed to fetch card data: ${error.message}`);
    }
  }

  /**
   * 根据卡牌ID获取卡牌信息
   */
  async getCardById(cardId) {
    const cardsData = await this.getAllCards();
    return cardsData.byId.get(cardId) || null;
  }

  /**
   * 根据卡牌DBF ID获取卡牌信息
   */
  async getCardByDbfId(dbfId) {
    const cardsData = await this.getAllCards();
    return cardsData.byDbfId.get(dbfId) || null;
  }

  /**
   * 批量获取卡牌信息
   */
  async getCardsByIds(cardIds) {
    const cardsData = await this.getAllCards();
    const result = [];
    
    for (const cardId of cardIds) {
      const card = cardsData.byId.get(cardId);
      if (card) {
        result.push(card);
      }
    }
    
    return result;
  }

  /**
   * 批量获取卡牌信息（通过DBF ID）
   */
  async getCardsByDbfIds(dbfIds) {
    const cardsData = await this.getAllCards();
    const result = [];
    
    for (const dbfId of dbfIds) {
      const card = cardsData.byDbfId.get(dbfId);
      if (card) {
        result.push(card);
      }
    }
    
    return result;
  }

  /**
   * 搜索卡牌（按名称）
   */
  async searchCardsByName(name) {
    const cardsData = await this.getAllCards();
    const nameToSearch = name.toLowerCase();
    const result = [];
    
    for (const [cardId, card] of cardsData.byId) {
      if (card.name && card.name.toLowerCase().includes(nameToSearch)) {
        result.push(card);
      }
    }
    
    return result;
  }

  /**
   * 生成卡牌封面图URL
   */
  getCardImageUrl(cardId) {
    return config.hearthstone.cardImageUrlTemplate.replace('{CARD_ID}', cardId);
  }

  /**
   * 为卡牌添加封面图URL
   */
  addImageUrlToCard(card) {
    if (!card || !card.id) return card;
    
    return {
      ...card,
      imageUrl: this.getCardImageUrl(card.id)
    };
  }

  /**
   * 为多张卡牌添加封面图URL
   */
  addImageUrlToCards(cards) {
    return cards.map(card => this.addImageUrlToCard(card));
  }
}

export const hearthstoneAPI = new HearthstoneAPI();
