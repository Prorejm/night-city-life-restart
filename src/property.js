// 属性系统 - 赛博朋克版（集成指数等级曲线）

import { LevelCurve } from './level-curve.js';

export const TYPES = {
  STYLE: 'STYLE',       // 街头声望
  TECH: 'TECH',         // 技术/网络
  CHROME: 'CHROME',     // 义体化程度
  EDDIES: 'EDDIES',     // 欧元
  HUMANITY: 'HUMANITY', // 人性
  LIFE: 'LIFE',         // 生命
  AGE: 'AGE',
  TLT: 'TLT',
  EVT: 'EVT',
  GANG: 'GANG',
  CORP: 'CORP',
  DIST: 'DIST',
  TURN: 'TURN',
  MONTH: 'MONTH',
  PHASE: 'PHASE'
};

// 需要经验值机制的数值属性及其配置
const LEVEL_ATTR_CONFIGS = {
  STYLE:   { baseExp: 1, multiplier: 2, maxLevel: 20 },
  TECH:    { baseExp: 1, multiplier: 2, maxLevel: 20 },
  CHROME:  { baseExp: 1, multiplier: 2, maxLevel: 20 },
  HUMANITY:{ baseExp: 1, multiplier: 2, maxLevel: 20 },
  LIFE:    { baseExp: 1, multiplier: 2, maxLevel: 20 }
};

// 不需要经验值机制的属性（直接数值）
const DIRECT_ATTRS = new Set([
  TYPES.AGE, TYPES.TURN, TYPES.MONTH, TYPES.PHASE, TYPES.EDDIES, TYPES.TOTAL_EDDIES
]);

export class Property {
  #state;
  #records;
  #levels; // Map<type, LevelCurve>
  #equipBonuses; // Map<type, number> 装备提供的属性加成
  #buffs; // Array<{type, value, turnsLeft}> 临时增益

  constructor() {
    this.#state = this.#getDefaultState();
    this.#records = [];
    this.#levels = new Map();
    this.#equipBonuses = new Map();
    this.#buffs = [];
    this.#initLevels();
  }

  #getDefaultState() {
    return {
      AGE: 0,
      TLT: [],
      EVT: [],
      GANG: [],
      CORP: [],
      DIST: '',
      TURN: 0,
      MONTH: 1,
      PHASE: 0,
      TOTAL_EDDIES: 0
    };
  }

  #initLevels() {
    for (const [type, config] of Object.entries(LEVEL_ATTR_CONFIGS)) {
      this.#levels.set(type, new LevelCurve(config));
    }
    // 设置初始等级
    this.#levels.get('HUMANITY').setLevel(10);
    this.#levels.get('LIFE').setLevel(1);
  }

  get(type) {
    const curve = this.#levels.get(type);
    if (curve) {
      const base = curve.getLevel();
      const equip = this.#equipBonuses.get(type) || 0;
      const buff = this.#buffs.filter(b => b.type === type).reduce((sum, b) => sum + b.value, 0);
      return base + equip + buff;
    }
    const val = this.#state[type];
    return val !== undefined ? val : 0;
  }

  // 获取不包含装备/buff的基础值
  getBase(type) {
    const curve = this.#levels.get(type);
    if (curve) return curve.getLevel();
    const val = this.#state[type];
    return val !== undefined ? val : 0;
  }

  // 直接赋值（用于MONTH/PHASE/AGE等需要覆盖的场景，以及等级直接设置）
  set(type, value) {
    const curve = this.#levels.get(type);
    if (curve && typeof value === 'number') {
      curve.setLevel(value, 0);
    } else {
      this.#state[type] = value;
    }
  }

  getAll() {
    const result = { ...this.#state };
    for (const [type, curve] of this.#levels) {
      result[type] = curve.getLevel();
    }
    return result;
  }

  // 为属性添加经验值（正数）或直接扣减等级（负数）
  change(type, value) {
    const curve = this.#levels.get(type);
    if (curve) {
      if (typeof value === 'number') {
        if (value > 0) {
          curve.addExp(value);
        } else if (value < 0) {
          // 负值直接扣减等级（LIFE允许负数）
          const minLevel = type === 'LIFE' ? -99 : 0;
          const newLevel = Math.max(minLevel, curve.getLevel() + value);
          curve.setLevel(newLevel, 0);
        }
      }
      return;
    }

    if (typeof value === 'number') {
      // 直接数值属性
      if (DIRECT_ATTRS.has(type) || type === TYPES.AGE || type === TYPES.TURN || type === TYPES.MONTH || type === TYPES.PHASE) {
        this.#state[type] = (this.#state[type] || 0) + value;
        if (type === TYPES.EDDIES) {
          if (this.#state[type] < 0) this.#state[type] = 0;
          if (value > 0) this.#state.TOTAL_EDDIES += value;
        }
      }
    } else if (Array.isArray(value)) {
      if (type === TYPES.TLT || type === TYPES.EVT || type === TYPES.GANG || type === TYPES.CORP) {
        if (!this.#state[type]) this.#state[type] = [];
        for (const v of value) {
          if (!this.#state[type].includes(v)) {
            this.#state[type].push(v);
          }
        }
      }
    }
  }

  // 批量应用效果（数值效果作为经验值添加）
  effect(effects) {
    if (!effects) return;
    for (const [key, value] of Object.entries(effects)) {
      this.change(key, value);
    }
  }

  // 获取属性的经验进度信息（用于UI）
  getLevelInfo(type) {
    const curve = this.#levels.get(type);
    if (!curve) return null;
    return {
      level: curve.getLevel(),
      exp: curve.getExp(),
      nextRequired: curve.getExpToNextLevel(),
      progress: curve.getProgressPercent()
    };
  }

  // 检查赛博精神病
  isCyberpsycho() {
    return this.get(TYPES.HUMANITY) <= 0;
  }

  // 检查是否死亡
  isDead() {
    return this.get(TYPES.LIFE) <= 0;
  }

  // ========== 装备加成管理 ==========

  // 设置装备加成（由Inventory调用）
  setEquipBonus(type, value) {
    if (value === 0) {
      this.#equipBonuses.delete(type);
    } else {
      this.#equipBonuses.set(type, (this.#equipBonuses.get(type) || 0) + value);
    }
  }

  // 移除装备加成（卸下装备时）
  removeEquipBonus(type, value) {
    const current = this.#equipBonuses.get(type) || 0;
    const newVal = current - value;
    if (newVal <= 0) {
      this.#equipBonuses.delete(type);
    } else {
      this.#equipBonuses.set(type, newVal);
    }
  }

  // 获取装备加成总值
  getEquipBonus(type) {
    return this.#equipBonuses.get(type) || 0;
  }

  // ========== 临时增益（Buff）管理 ==========

  // 添加buff（药品等消耗品）
  addBuff(type, value, durationTurns) {
    this.#buffs.push({ type, value, turnsLeft: durationTurns });
  }

  // 每旬推进buff持续时间，过期自动移除
  tickBuffs() {
    for (let i = this.#buffs.length - 1; i >= 0; i--) {
      this.#buffs[i].turnsLeft--;
      if (this.#buffs[i].turnsLeft <= 0) {
        this.#buffs.splice(i, 1);
      }
    }
  }

  // 获取活跃的buff列表
  getBuffs() {
    return this.#buffs.map(b => ({ ...b }));
  }

  // 获取buff对某属性的加成
  getBuffBonus(type) {
    return this.#buffs.filter(b => b.type === type).reduce((sum, b) => sum + b.value, 0);
  }

  // 记录当前属性快照
  record() {
    this.#records.push(this.getAll());
  }

  // 获取所有记录
  getRecords() {
    return [...this.#records];
  }

  // 重置
  reset() {
    this.#state = this.#getDefaultState();
    this.#records = [];
    this.#equipBonuses.clear();
    this.#buffs = [];
    for (const curve of this.#levels.values()) {
      curve.reset();
    }
    // 重新设置初始等级
    this.#levels.get('HUMANITY').setLevel(10);
    this.#levels.get('LIFE').setLevel(1);
  }
}
