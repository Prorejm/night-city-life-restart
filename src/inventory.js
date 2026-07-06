// 物品/武器/义体清单系统

export class Inventory {
  #itemsData;
  #owned;

  constructor(itemsData = {}) {
    this.#itemsData = itemsData;
    this.#owned = { weapons: [], cyberware: [], drugs: [] };
  }

  // 添加物品到清单
  addItem(itemId) {
    const item = this.#itemsData[itemId];
    if (!item) return false;

    // 判断物品类型
    let list;
    if (item.type === 'cyber' || item.type === 'cyberware' || itemId.startsWith('cyber_') || itemId.startsWith('imp_')) {
      list = this.#owned.cyberware;
    } else if (itemId.startsWith('drug_') || item.type === 'drug' || item.type === 'consumable') {
      list = this.#owned.drugs;
    } else {
      list = this.#owned.weapons;
    }

    // 不重复获取
    if (list.includes(itemId)) return false;

    list.push(itemId);
    return true;
  }

  // 获取所有武器
  getWeapons() {
    return this.#owned.weapons.map(id => this.#itemsData[id]).filter(Boolean);
  }

  // 获取所有义体
  getCyberware() {
    return this.#owned.cyberware.map(id => this.#itemsData[id]).filter(Boolean);
  }

  // 获取不朽武器
  getLegendaryWeapons() {
    return this.getWeapons().filter(w => w.quality === 'legendary');
  }

  // 获取不朽义体
  getLegendaryCyberware() {
    return this.getCyberware().filter(c => c.quality === 'legendary');
  }

  // 判断是否为不朽物品
  isLegendary(itemId) {
    const item = this.#itemsData[itemId];
    return item && item.quality === 'legendary';
  }

  // 获取不朽物品总数
  getLegendaryCount() {
    return this.getLegendaryWeapons().length + this.getLegendaryCyberware().length;
  }

  // 获取完整统计数据
  getAllStats() {
    const weapons = this.getWeapons();
    const cyberware = this.getCyberware();
    const drugs = this.getDrugs();
    const legendaryWeapons = this.getLegendaryWeapons();
    const legendaryCyberware = this.getLegendaryCyberware();

    return {
      weapons,
      cyberware,
      drugs,
      weaponCount: weapons.length,
      cyberCount: cyberware.length,
      totalDrugs: drugs.length,
      legendaryWeapons,
      legendaryCyberware,
      legendaryCount: this.getLegendaryCount(),
      legendaryItems: {
        weapons: legendaryWeapons,
        cyberware: legendaryCyberware
      },
      weaponsByQuality: {
        common: weapons.filter(w => w.quality === 'common').length,
        uncommon: weapons.filter(w => w.quality === 'uncommon').length,
        rare: weapons.filter(w => w.quality === 'rare').length,
        epic: weapons.filter(w => w.quality === 'epic').length,
        legendary: legendaryWeapons.length
      },
      cyberwareByQuality: {
        common: cyberware.filter(c => c.quality === 'common').length,
        legendary: legendaryCyberware.length
      },
      drugsByType: {
        stimulant: drugs.filter(d => d.type === 'stimulant').length,
        depressant: drugs.filter(d => d.type === 'depressant').length,
        hallucinogen: drugs.filter(d => d.type === 'hallucinogen').length
      }
    };
  }

  // 获取所有药品
  getDrugs() {
    return this.#owned.drugs.map(id => this.#itemsData[id]).filter(Boolean);
  }

  // 移除物品
  removeItem(itemId) {
    const item = this.#itemsData[itemId];
    if (!item) return false;

    let list;
    if (item.type === 'cyber' || item.type === 'cyberware' || itemId.startsWith('cyber_') || itemId.startsWith('imp_')) {
      list = this.#owned.cyberware;
    } else if (itemId.startsWith('drug_') || item.type === 'drug' || item.type === 'consumable') {
      list = this.#owned.drugs;
    } else {
      list = this.#owned.weapons;
    }

    const idx = list.indexOf(itemId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    return true;
  }

  // 获取最近获得的N个物品
  getRecentItems(count = 5) {
    const all = [
      ...this.#owned.weapons.map(id => this.#itemsData[id]).filter(Boolean).map(i => ({ ...i, _type: 'weapon' })),
      ...this.#owned.cyberware.map(id => this.#itemsData[id]).filter(Boolean).map(i => ({ ...i, _type: 'cyberware' })),
      ...this.#owned.drugs.map(id => this.#itemsData[id]).filter(Boolean).map(i => ({ ...i, _type: 'drug' }))
    ];
    // 按添加顺序的逆序返回（最近添加的在前面）
    // 由于我们没有精确的时间戳，简单返回所有物品的倒序
    return all.slice(-count).reverse();
  }

  reset() {
    this.#owned = { weapons: [], cyberware: [], drugs: [] };
  }
}
