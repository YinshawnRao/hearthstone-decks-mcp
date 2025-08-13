import { hearthstoneAPI } from './hearthstoneApi.js';

/**
 * 炉石传说卡组代码解析器
 */
class DeckParser {
  constructor() {
    // 卡组代码版本映射
    this.deckVersions = {
      1: 'Standard',
      2: 'Wild'
    };
  }

  /**
   * 解析卡组代码
   * 炉石传说卡组代码是Base64编码的二进制数据
   */
  parseDeckCode(deckCode) {
    try {
      // 移除可能的前缀和空白字符
      const cleanCode = deckCode.replace(/^AAE[A-Z]*=*/, '').trim();
      
      // Base64解码
      const binaryData = Buffer.from(deckCode, 'base64');
      
      // 解析二进制数据
      const deck = this.parseBinaryDeckData(binaryData);
      
      return deck;
    } catch (error) {
      throw new Error(`Invalid deck code format: ${error.message}`);
    }
  }

  /**
   * 解析二进制卡组数据
   */
  parseBinaryDeckData(data) {
    let offset = 0;
    
    // 读取保留字节
    const reserved = data[offset];
    offset += 1;
    
    // 读取版本
    const version = data[offset];
    offset += 1;
    
    // 读取格式 (1=Wild, 2=Standard)
    const format = data[offset];
    offset += 1;
    
    // 读取英雄
    const numHeroes = this.readVarInt(data, offset);
    offset = numHeroes.newOffset;
    
    const heroes = [];
    for (let i = 0; i < numHeroes.value; i++) {
      const hero = this.readVarInt(data, offset);
      offset = hero.newOffset;
      heroes.push(hero.value);
    }
    
    // 读取单张卡牌 (数量为1)
    const numSingle = this.readVarInt(data, offset);
    offset = numSingle.newOffset;
    
    const singleCards = [];
    for (let i = 0; i < numSingle.value; i++) {
      const card = this.readVarInt(data, offset);
      offset = card.newOffset;
      singleCards.push({ id: card.value, count: 1 });
    }
    
    // 读取双张卡牌 (数量为2)
    const numDouble = this.readVarInt(data, offset);
    offset = numDouble.newOffset;
    
    const doubleCards = [];
    for (let i = 0; i < numDouble.value; i++) {
      const card = this.readVarInt(data, offset);
      offset = card.newOffset;
      doubleCards.push({ id: card.value, count: 2 });
    }
    
    // 读取多张卡牌 (数量 > 2)
    const numMultiple = this.readVarInt(data, offset);
    offset = numMultiple.newOffset;
    
    const multipleCards = [];
    for (let i = 0; i < numMultiple.value; i++) {
      const card = this.readVarInt(data, offset);
      offset = card.newOffset;
      const count = this.readVarInt(data, offset);
      offset = count.newOffset;
      multipleCards.push({ id: card.value, count: count.value });
    }
    
    // 合并所有卡牌
    const cards = [...singleCards, ...doubleCards, ...multipleCards];
    
    return {
      version,
      format: this.deckVersions[format] || 'Unknown',
      heroes,
      cards,
      totalCards: cards.reduce((sum, card) => sum + card.count, 0)
    };
  }

  /**
   * 读取变长整数 (VarInt)
   */
  readVarInt(data, offset) {
    let value = 0;
    let shift = 0;
    let currentOffset = offset;
    
    while (currentOffset < data.length) {
      const byte = data[currentOffset];
      value |= (byte & 0x7F) << shift;
      currentOffset++;
      
      if ((byte & 0x80) === 0) {
        break;
      }
      
      shift += 7;
    }
    
    return {
      value,
      newOffset: currentOffset
    };
  }

  /**
   * 解析卡组代码并返回详细的卡组信息
   */
  async parseDeckCodeWithDetails(deckCode) {
    try {
      // 解析卡组代码
      const deck = this.parseDeckCode(deckCode);
      
      // 获取英雄信息
      const heroDetails = await this.getHeroDetails(deck.heroes);
      
      // 获取卡牌详细信息
      const cardDetails = await this.getCardDetails(deck.cards);
      
      // 计算卡组统计信息
      const stats = this.calculateDeckStats(cardDetails);
      
      return {
        meta: {
          version: deck.version,
          format: deck.format,
          totalCards: deck.totalCards,
          deckCode: deckCode
        },
        heroes: heroDetails,
        cards: cardDetails,
        statistics: stats
      };
    } catch (error) {
      throw new Error(`Failed to parse deck: ${error.message}`);
    }
  }

  /**
   * 获取英雄详细信息
   */
  async getHeroDetails(heroIds) {
    const heroes = [];
    
    for (const heroId of heroIds) {
      // 使用DBF ID查找英雄
      const hero = await hearthstoneAPI.getCardByDbfId(heroId);
      if (hero) {
        heroes.push(hearthstoneAPI.addImageUrlToCard(hero));
      }
    }
    
    return heroes;
  }

  /**
   * 获取卡牌详细信息
   */
  async getCardDetails(cards) {
    const cardDetails = [];
    
    for (const card of cards) {
      // 使用DBF ID查找卡牌
      const cardInfo = await hearthstoneAPI.getCardByDbfId(card.id);
      if (cardInfo) {
        cardDetails.push({
          ...hearthstoneAPI.addImageUrlToCard(cardInfo),
          count: card.count
        });
      } else {
        // 如果找不到卡牌信息，保留基本信息
        cardDetails.push({
          dbfId: card.id,
          id: `UNKNOWN_${card.id}`,
          name: `Unknown Card (DBF ID: ${card.id})`,
          count: card.count,
          imageUrl: hearthstoneAPI.getCardImageUrl(`UNKNOWN_${card.id}`)
        });
      }
    }
    
    return cardDetails;
  }

  /**
   * 计算卡组统计信息
   */
  calculateDeckStats(cards) {
    const stats = {
      totalCards: 0,
      totalUnique: cards.length,
      manaCurve: Array(11).fill(0), // 0-10费用
      rarities: {},
      cardTypes: {},
      classes: {}
    };
    
    cards.forEach(card => {
      stats.totalCards += card.count;
      
      // 法力值分布
      const cost = card.cost || 0;
      if (cost <= 10) {
        stats.manaCurve[cost] += card.count;
      }
      
      // 稀有度统计
      if (card.rarity) {
        stats.rarities[card.rarity] = (stats.rarities[card.rarity] || 0) + card.count;
      }
      
      // 卡牌类型统计
      if (card.type) {
        stats.cardTypes[card.type] = (stats.cardTypes[card.type] || 0) + card.count;
      }
      
      // 职业统计
      if (card.cardClass) {
        stats.classes[card.cardClass] = (stats.classes[card.cardClass] || 0) + card.count;
      }
    });
    
    return stats;
  }
}

export const deckParser = new DeckParser();
