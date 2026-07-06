// 物品/武器/义体清单系统

export class Inventory {
  #itemsData;
  #owned;
  #equipped; // Set<itemId> 已装备的物品

  constructor(itemsData = {}) {
    this.#itemsData = itemsData;
    this.#owned = { weapons: [], cyberware: [], drugs: [] };
    this.#equipped = new Set();
  }

  /**
   * 添加物品到清单
   * @param {string} itemId
   * @param {Property} [property] - 传入 Property 实例以自动应用装备加成
   * @returns {{added: boolean, equipped: boolean}}
   */
  addItem(itemId, property) {
    const item = this.#itemsData[itemId];
    if (!item) return { added: false, equipped: false };

    // 判断物品类型
    let list;
    const isCyberware = item.type === 'cyber' || item.type === 'cyberware' || itemId.startsWith('cyber_') || itemId.startsWith('imp_');
    const isDrug = itemId.startsWith('drug_') || item.type === 'drug' || item.type === 'consumable';

    if (isCyberware) {
      list = this.#owned.cyberware;
    } else if (isDrug) {
      list = this.#owned.drugs;
    } else {
      list = this.#owned.weapons;
    }

    // 武器/义体不重复获取（药品可叠加）
    if (!isDrug && list.includes(itemId)) return { added: false, equipped: false };

    list.push(itemId);

    // 武器和义体自动装备
    let equipped = false;
    if (!isDrug && item.effect) {
      equipped = this.equip(itemId, property);
    }

    return { added: true, equipped };
  }

  /**
   * 装备物品 - 应用属性加成到Property
   * @param {string} itemId
   * @param {Property} [property]
   * @returns {boolean}
   */
  equip(itemId, property) {
    if (this.#equipped.has(itemId)) return false;
    const item = this.#itemsData[itemId];
    if (!item || !item.effect) return false;

    // 检查是否拥有
    const allIds = [...this.#owned.weapons, ...this.#owned.cyberware, ...this.#owned.drugs];
    if (!allIds.includes(itemId)) return false;

    this.#equipped.add(itemId);

    // 应用装备加成
    if (property) {
      for (const [type, value] of Object.entries(item.effect)) {
        if (typeof value === 'number') {
          property.setEquipBonus(type, value);
        }
      }
    }

    return true;
  }

  /**
   * 卸下装备 - 移除属性加成
   * @param {string} itemId
   * @param {Property} [property]
   * @returns {boolean}
   */
  unequip(itemId, property) {
    if (!this.#equipped.has(itemId)) return false;
    const item = this.#itemsData[itemId];
    if (!item) return false;

    this.#equipped.delete(itemId);

    // 移除装备加成
    if (property && item.effect) {
      for (const [type, value] of Object.entries(item.effect)) {
        if (typeof value === 'number') {
          property.removeEquipBonus(type, value);
        }
      }
    }

    return true;
  }

  /**
   * 检查物品是否已装备
   */
  isEquipped(itemId) {
    return this.#equipped.has(itemId);
  }

  /**
   * 获取所有已装备物品
   */
  getEquipped() {
    return [...this.#equipped].map(id => this.#itemsData[id]).filter(Boolean);
  }

  /**
   * 获取已装备物品的属性加成总和
   */
  getEquippedBonuses() {
    const bonuses = {};
    for (const itemId of this.#equipped) {
      const item = this.#itemsData[itemId];
      if (item && item.effect) {
        for (const [type, value] of Object.entries(item.effect)) {
          if (typeof value === 'number') {
            bonuses[type] = (bonuses[type] || 0) + value;
          }
        }
      }
    }
    return bonuses;
  }

  /**
   * 获取已装备的义体数量（用于CHROME计算）
   */
  getEquippedCyberwareCount() {
    let count = 0;
    for (const itemId of this.#equipped) {
      if (itemId.startsWith('imp_') || itemId.startsWith('cyber_')) count++;
    }
    return count;
  }

  // 获取所有武器
  getWeapons() {
    return this.#owned.weapons.map(id => ({
      ...this.#itemsData[id],
      _id: id,
      _equipped: this.#equipped.has(id)
    })).filter(Boolean);
  }

  // 获取所有义体
  getCyberware() {
    return this.#owned.cyberware.map(id => ({
      ...this.#itemsData[id],
      _id: id,
      _equipped: this.#equipped.has(id)
    })).filter(Boolean);
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
      equippedBonuses: this.getEquippedBonuses(),
      equippedCount: this.#equipped.size
    };
  }

  // 获取所有药品
  getDrugs() {
    return this.#owned.drugs.map(id => ({
      ...this.#itemsData[id],
      _id: id
    })).filter(Boolean);
  }

  // 使用药品（从背包移除一个）
  useDrug(itemId) {
    const list = this.#owned.drugs;
    const idx = list.indexOf(itemId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    return true;
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
      ...this.#owned.weapons.map(id => ({ ...this.#itemsData[id], _id: id, _type: 'weapon' })).filter(Boolean),
      ...this.#owned.cyberware.map(id => ({ ...this.#itemsData[id], _id: id, _type: 'cyberware' })).filter(Boolean),
      ...this.#owned.drugs.map(id => ({ ...this.#itemsData[id], _id: id, _type: 'drug' })).filter(Boolean)
    ];
    return all.slice(-count).reverse();
  }

  // 序列化
  serialize() {
    return {
      owned: { ...this.#owned },
      equipped: [...this.#equipped]
    };
  }

  // 反序列化
  restore(data) {
    if (!data) return;
    if (data.owned) {
      this.#owned.weapons = data.owned.weapons || [];
      this.#owned.cyberware = data.owned.cyberware || [];
      this.#owned.drugs = data.owned.drugs || [];
    }
    if (data.equipped) {
      this.#equipped = new Set(data.equipped);
    }
  }

  reset() {
    this.#owned = { weapons: [], cyberware: [], drugs: [] };
    this.#equipped = new Set();
  }
}
