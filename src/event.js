// 事件系统 - 赛博朋克版

import { evaluateCondition, parseCondition } from './functions/condition.js';

// 事件元数据默认值
const EVENT_META_DEFAULTS = {
  type: 'special',
  repeatable: false,
  weight: 1,
  cooldown: 0,
  itemAward: null,
  vehicleAward: null,
  drugAward: null,
  tags: []
};

// 死亡事件ID范围（专由 #checkDeath() 触发，不应出现在随机池中）
const DEATH_EVENT_ID_RANGE = { min: 18000, max: 18999 };

// ID范围对应的隐含年龄段
const ID_AGE_RANGES = [
  { minId: 10000, maxId: 10999, minAge: 0, maxAge: 2 },    // 出身事件：0-2岁
  { minId: 11000, maxId: 11999, minAge: 2, maxAge: 16 },   // 童年事件：2-16岁
  { minId: 12000, maxId: 13999, minAge: 14, maxAge: 28 },  // 青年出道：14-28岁
  { minId: 14000, maxId: 17999, minAge: 20, maxAge: 200 }, // 佣兵传奇：20岁+
  { minId: 18000, maxId: 18999, minAge: 0, maxAge: 200 },  // 死亡事件：任何年龄
  { minId: 19000, maxId: 19999, minAge: 0, maxAge: 200 },  // 日常事件：任何年龄
  { minId: 20000, maxId: 20999, minAge: 16, maxAge: 200 }, // 剧情事件：16岁+
];

// 新事件（>=30000）的 TURN 范围（用于没有显式 AGE/TURN 条件的事件）
const ID_TURN_RANGES = [
  { minId: 30000, maxId: 30499, minTurn: 0, maxTurn: 216 },   // 幼儿期(0-6岁)
  { minId: 30500, maxId: 30699, minTurn: 0, maxTurn: 9999 },  // 装备事件（无年龄限制）
];

export class Event {
  #eventData;
  #conditionCache;
  #typeGroups;

  constructor() {
    this.#eventData = new Map();
    this.#conditionCache = new Map();
    this.#typeGroups = new Map();
  }

  initial(data) {
    if (!data) return;
    for (const [id, event] of Object.entries(data)) {
      const eid = Number(id);
      // 存储事件数据，包含新元数据字段
      this.#eventData.set(eid, {
        ...event,
        id: eid,
        type: event.type || EVENT_META_DEFAULTS.type,
        repeatable: event.repeatable ?? EVENT_META_DEFAULTS.repeatable,
        weight: event.weight ?? EVENT_META_DEFAULTS.weight,
        cooldown: event.cooldown ?? EVENT_META_DEFAULTS.cooldown,
        itemAward: event.itemAward || null,
        vehicleAward: event.vehicleAward || null,
        drugAward: event.drugAward || null,
        tags: Array.isArray(event.tags) ? event.tags : []
      });

      // 预解析所有条件表达式
      if (event.include) {
        this.#conditionCache.set(`inc_${eid}`, parseCondition(event.include));
      }
      if (event.exclude) {
        this.#conditionCache.set(`exc_${eid}`, parseCondition(event.exclude));
      }
      if (event.branch) {
        this.#conditionCache.set(`br_${eid}`,
          event.branch.map(b => {
            if (typeof b === 'string') {
              const colonIdx = b.indexOf(':');
              if (colonIdx > 0) {
                return {
                  condition: parseCondition(b.slice(0, colonIdx)),
                  target: Number(b.slice(colonIdx + 1))
                };
              }
            }
            return null;
          }).filter(Boolean)
        );
      }

      // 构建类型分组索引
      const eventType = event.type || EVENT_META_DEFAULTS.type;
      if (!this.#typeGroups.has(eventType)) {
        this.#typeGroups.set(eventType, []);
      }
      this.#typeGroups.get(eventType).push(eid);
    }

    // 数据校验（初始化完成后对所有已加载事件进行检查）
    this.#validateEventData();
  }

  get(eventId) {
    return this.#eventData.get(Number(eventId)) || null;
  }

  // 检查事件是否可发生
  check(eventId, property) {
    const event = this.#eventData.get(Number(eventId));
    if (!event) return false;

    const state = property.getAll();

    // 检查 NoRandom
    if (event.NoRandom) return false;

    // 检查 exclude
    if (event.exclude) {
      const excCond = this.#conditionCache.get(`exc_${eventId}`);
      if (excCond && evaluateCondition(excCond, state)) {
        return false;
      }
    }

    // 检查 include
    if (event.include) {
      const incCond = this.#conditionCache.get(`inc_${eventId}`);
      if (incCond && !evaluateCondition(incCond, state)) {
        return false;
      }
    }

    // 如果事件没有显式的 AGE 条件，检查隐含的 ID 范围限制
    const inc = event.include || '';
    const exc = event.exclude || '';
    const hasAgeCondition = inc.includes('AGE') || exc.includes('AGE');
    const hasTurnCondition = inc.includes('TURN') || exc.includes('TURN');
    const eventIdNum = Number(eventId);

    // 新事件（>=30000）：如果没有显式 TURN 条件，检查 TURN 范围
    if (eventIdNum >= 30000) {
      if (!hasTurnCondition && !hasAgeCondition) {
        const turn = state.TURN || 0;
        if (!this.#isInIdTurnRange(eventIdNum, turn)) {
          return false;
        }
      }
      return true;
    }

    // 现有事件（<30000）：保持原有的 AGE 隐式过滤
    if (!hasAgeCondition && !this.#isInIdAgeRange(eventIdNum, state.AGE || 0)) {
      return false;
    }

    return true;
  }

  // 执行事件
  do(eventId, property, extraState = {}) {
    const event = this.#eventData.get(Number(eventId));
    if (!event) return null;

    const state = property.getAll();
    const results = [];

    // 检查 branch 分支
    if (event.branch) {
      const branches = this.#conditionCache.get(`br_${eventId}`);
      if (branches) {
        for (const branch of branches) {
          if (!branch.condition || evaluateCondition(branch.condition, state, extraState)) {
            // 执行分支事件
            results.push({
              id: eventId,
              event: event.event,
              postEvent: event.postEvent,
              effect: event.effect,
              next: branch.target
            });
            return results;
          }
        }
      }
    }

    // 普通事件
    results.push({
      id: eventId,
      event: event.event,
      postEvent: event.postEvent,
      effect: event.effect,
      next: null
    });

    return results;
  }

  // 按权重随机选择事件
  random(events, property) {
    const filtered = [];
    for (const ev of events) {
      let eventId, weight;
      if (Array.isArray(ev)) {
        eventId = ev[0];
        weight = ev[1];
      } else {
        eventId = ev;
        weight = 1;
      }

      if (this.check(eventId, property)) {
        filtered.push([eventId, weight]);
      }
    }

    if (filtered.length === 0) return null;

    // 权重随机
    const totalWeight = filtered.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * totalWeight;
    for (const [eventId, weight] of filtered) {
      if ((r -= weight) < 0) return eventId;
    }
    return filtered[filtered.length - 1][0];
  }

  // ========== 新增方法 ==========

  /**
   * 获取所有事件按 type 分组的 Map
   * @returns {Map<string, number[]>} type -> [eventId, ...]
   */
  getTypeGroups() {
    return new Map(this.#typeGroups);
  }

  /**
   * 从指定类型分组中随机选取一个事件
   * @param {string} type - 事件类型
   * @param {number} age - 当前年龄
   * @param {object} property - 属性对象
   * @param {object} extraState - 额外状态（含 eventCooldowns, turn 等）
   * @returns {number|null} eventId 或 null
   */
  pickByType(type, age, property, extraState = {}) {
    const group = this.#typeGroups.get(type);
    if (!group || group.length === 0) return null;

    const turn = extraState.turn || 0;
    const candidates = [];
    for (const eid of group) {
      // 死亡事件排除：18000-18999 范围的事件由 #checkDeath() 专门触发
      if (eid >= DEATH_EVENT_ID_RANGE.min && eid <= DEATH_EVENT_ID_RANGE.max) continue;

      // 条件检查
      if (!this.check(eid, property)) continue;

      const event = this.#eventData.get(eid);

      // 非重复事件：如果已在 EVT 列表中则跳过
      if (!event.repeatable) {
        const state = property.getAll();
        const evtList = state.EVT || [];
        if (evtList.includes(eid)) continue;
      }

      // 冷却双轨检查：新事件(>=30000)按旬冷却，现有事件(<30000)按年冷却转旬
      if (event.cooldown > 0 && event.repeatable) {
        const cooldowns = extraState.eventCooldowns || new Map();
        const cooldownTurns = (eid >= 30000)
          ? (event.cooldown || 0)          // 新事件：按旬
          : (event.cooldown || 0) * 36;    // 现有事件：按年转旬
        const lastTurn = cooldowns.get(eid);
        if (lastTurn !== undefined && (turn - lastTurn) < cooldownTurns) {
          continue;
        }
      }

      candidates.push([eid, event.weight || 1]);
    }

    if (candidates.length === 0) return null;

    // 权重随机选择
    const totalWeight = candidates.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * totalWeight;
    for (const [eid, w] of candidates) {
      if ((r -= w) < 0) return eid;
    }
    return candidates[candidates.length - 1][0];
  }

  /**
   * 从事件ID列表中按权重选取最多 maxPick 个不冲突的事件
   * @param {number[]} eventIds - 候选事件ID列表
   * @param {object} property - 属性对象
   * @param {object} extraState - 额外状态
   * @param {number} maxPick - 最多选取几个
   * @returns {number[]} 选中的事件ID数组
   */
  pickWeightedFromPool(eventIds, property, extraState = {}, maxPick = 1) {
    const selected = [];
    const usedTypes = new Set(); // 避免同一年选到多个完全相同类型的事件
    const age = extraState.age || 0;
    const turn = extraState.turn || 0;

    // 筛选可用候选
    const candidates = [];
    for (const eid of eventIds) {
      // 死亡事件排除
      if (eid >= DEATH_EVENT_ID_RANGE.min && eid <= DEATH_EVENT_ID_RANGE.max) continue;

      if (!this.check(eid, property)) continue;

      const event = this.#eventData.get(eid);
      if (!event) continue;

      // 非重复事件检查
      if (!event.repeatable) {
        const state = property.getAll();
        const evtList = state.EVT || [];
        if (evtList.includes(eid)) continue;
      }

      // 冷却双轨检查
      if (event.cooldown > 0 && event.repeatable) {
        const cooldowns = extraState.eventCooldowns || new Map();
        const cooldownTurns = (eid >= 30000)
          ? (event.cooldown || 0)          // 新事件：按旬
          : (event.cooldown || 0) * 36;    // 现有事件：按年转旬
        const lastTurn = cooldowns.get(eid);
        if (lastTurn !== undefined && (turn - lastTurn) < cooldownTurns) {
          continue;
        }
      }

      candidates.push({ eid, weight: event.weight || 1, type: event.type });
    }

    if (candidates.length === 0) return selected;

    // 按权重排序并逐个选取（避开类型冲突）
    const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
    const picked = new Set();

    for (let pickIdx = 0; pickIdx < maxPick; pickIdx++) {
      const available = candidates.filter(c => !picked.has(c.eid));
      if (available.length === 0) break;

      const tW = available.reduce((s, c) => s + c.weight, 0);
      let r = Math.random() * tW;
      for (const c of available) {
        if ((r -= c.weight) < 0) {
          selected.push(c.eid);
          picked.add(c.eid);
          break;
        }
      }
    }

    return selected;
  }

  /**
   * 获取事件元数据
   * @param {number} eventId
   * @returns {object|null} { type, repeatable, weight, cooldown, itemAward, vehicleAward, drugAward, tags }
   */
  getEventMeta(eventId) {
    const event = this.#eventData.get(Number(eventId));
    if (!event) return null;

    return {
      type: event.type,
      repeatable: event.repeatable,
      weight: event.weight,
      cooldown: event.cooldown,
      itemAward: event.itemAward,
      vehicleAward: event.vehicleAward,
      drugAward: event.drugAward,
      tags: [...event.tags]
    };
  }

  /**
   * 检查冷却是否已过
   * @param {number} eventId
   * @param {number} currentTurn - 当前回合（旬）
   * @param {number|undefined} lastTriggerTurn - 上次触发的回合
   * @returns {boolean} true = 冷却已过或无需冷却
   */
  checkCooldown(eventId, currentTurn, lastTriggerTurn) {
    const event = this.#eventData.get(Number(eventId));
    if (!event) return true;

    // 无冷却要求
    if (!event.cooldown || event.cooldown <= 0) return true;

    // 从未触发过
    if (lastTriggerTurn === undefined || lastTriggerTurn === null) return true;

    // 冷却双轨：新事件(>=30000)按旬冷却，现有事件(<30000)按年转旬
    const cooldownTurns = (Number(eventId) >= 30000)
      ? event.cooldown          // 新事件：按旬
      : event.cooldown * 36;    // 现有事件：按年转旬

    return (currentTurn - lastTriggerTurn) >= cooldownTurns;
  }

  /**
   * 根据事件ID范围检查是否匹配当前年龄（仅用于没有显式AGE条件的事件）
   * @param {number} eventId
   * @param {number} age
   * @returns {boolean}
   */
  #isInIdAgeRange(eventId, age) {
    for (const range of ID_AGE_RANGES) {
      if (eventId >= range.minId && eventId <= range.maxId) {
        return age >= range.minAge && age <= range.maxAge;
      }
    }
    return true; // 不在定义的范围内则放行
  }

  /**
   * 根据事件ID范围检查是否匹配当前回合（仅用于>=30000没有显式TURN条件的事件）
   * @param {number} eventId
   * @param {number} turn
   * @returns {boolean}
   */
  #isInIdTurnRange(eventId, turn) {
    for (const range of ID_TURN_RANGES) {
      if (eventId >= range.minId && eventId <= range.maxId) {
        return turn >= range.minTurn && turn <= range.maxTurn;
      }
    }
    return true; // 不在定义的范围内则放行
  }

  /**
   * 数据校验：在 initial() 完成后对所有已加载事件进行检查
   * 使用 console.warn 输出警告，不阻断加载
   */
  #validateEventData() {
    for (const [eid, event] of this.#eventData) {
      // 可重复事件未设置冷却 → 建议设置
      if (event.repeatable && (!event.cooldown || event.cooldown <= 0)) {
        console.warn(`[事件校验] 事件 ${eid} "${event.event}" repeatable=true 但 cooldown=0，建议设置冷却时间防止连续触发`);
      }

      // itemAward 格式检查
      if (event.itemAward && typeof event.itemAward === 'string') {
        if (!event.itemAward.startsWith('wpn_') && !event.itemAward.startsWith('cyber_') && !event.itemAward.startsWith('drug_') && !event.itemAward.startsWith('imp_')) {
          console.warn(`[事件校验] 事件 ${eid} "${event.event}" itemAward="${event.itemAward}" 格式不以 wpn_/cyber_/drug_/imp_ 开头`);
        }
      }

      // branch 目标存在性检查
      if (event.branch) {
        const branches = this.#conditionCache.get(`br_${eid}`);
        if (branches) {
          for (const branch of branches) {
            if (branch && !this.#eventData.has(branch.target)) {
              console.warn(`[事件校验] 事件 ${eid} "${event.event}" branch 目标 ${branch.target} 不存在`);
            }
          }
        }
      }
    }
  }
}
