// 属性系统 - 赛博朋克版

export const TYPES = {
  STYLE: 'STYLE',       // 街头声望
  TECH: 'TECH',         // 技术/网络
  CHROME: 'CHROME',     // 义体化程度
  EDDIES: 'EDDIES',     // 欧元
  HUMANITY: 'HUMANITY', // 人性 (初始10)
  LIFE: 'LIFE',         // 生命
  AGE: 'AGE',
  TLT: 'TLT',
  EVT: 'EVT',
  GANG: 'GANG',
  CORP: 'CORP',
  DIST: 'DIST',
  TURN: 'TURN',         // 回合数（旬）
  MONTH: 'MONTH',       // 当前月份(1-12)
  PHASE: 'PHASE'         // 旬(0=上旬, 1=中旬, 2=下旬)
};

export class Property {
  #state;
  #records;  // 每岁属性快照

  constructor() {
    this.#state = this.#getDefaultState();
    this.#records = [];
  }

  #getDefaultState() {
    return {
      STYLE: 0,
      TECH: 0,
      CHROME: 0,
      EDDIES: 0,
      HUMANITY: 10,
      LIFE: 1,
      AGE: 0,
      TLT: [],
      EVT: [],
      GANG: [],
      CORP: [],
      DIST: '',
      TURN: 0,
      MONTH: 1,
      PHASE: 0
    };
  }

  get(type) {
    const val = this.#state[type];
    return val !== undefined ? val : 0;
  }

  // 直接赋值（用于MONTH/PHASE等需要覆盖而非增减的场景）
  set(type, value) {
    this.#state[type] = value;
  }

  getAll() {
    return { ...this.#state };
  }

  change(type, value) {
    if (typeof value === 'number') {
      if (type === TYPES.HUMANITY) {
        this.#state.HUMANITY = Math.max(0, this.#state.HUMANITY + value);
      } else if (type === TYPES.CHROME) {
        this.#state.CHROME = Math.max(0, this.#state.CHROME + value);
      } else if (type === TYPES.LIFE) {
        this.#state.LIFE += value;
      } else if (type === TYPES.AGE) {
        this.#state.AGE += value;
      } else if (type === TYPES.EDDIES) {
        this.#state.EDDIES = Math.max(0, this.#state.EDDIES + value);
      } else if (type === TYPES.STYLE) {
        this.#state.STYLE = Math.max(0, this.#state.STYLE + value);
      } else if (type === TYPES.TECH) {
        this.#state.TECH = Math.max(0, this.#state.TECH + value);
      } else if (type === TYPES.TURN) {
        this.#state.TURN += value;
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

  // 批量应用效果
  effect(effects) {
    if (!effects) return;
    for (const [key, value] of Object.entries(effects)) {
      this.change(key, value);
    }
  }

  // 检查赛博精神病
  isCyberpsycho() {
    return this.#state.HUMANITY <= 0;
  }

  // 检查是否死亡
  isDead() {
    return this.#state.LIFE <= 0;
  }

  // 记录当前属性快照
  record() {
    this.#records.push({ ...this.#state });
  }

  // 获取所有记录
  getRecords() {
    return [...this.#records];
  }

  // 重置
  reset() {
    this.#state = this.#getDefaultState();
    this.#records = [];
  }
}
