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
   * @param {object} extraState - 额外状态（含 eventCooldowns 等）
   * @returns {number|null} eventId 或 null
   */
  pickByType(type, age, property, extraState = {}) {
    const group = this.#typeGroups.get(type);
    if (!group || group.length === 0) return null;

    const candidates = [];
    for (const eid of group) {
      // 条件检查
      if (!this.check(eid, property)) continue;

      const event = this.#eventData.get(eid);

      // 非重复事件：如果已在 EVT 列表中则跳过
      if (!event.repeatable) {
        const state = property.getAll();
        const evtList = state.EVT || [];
        if (evtList.includes(eid)) continue;
      }

      // 冷却检查
      if (event.cooldown > 0 && event.repeatable) {
        const cooldowns = extraState.eventCooldowns || new Map();
        const lastAge = cooldowns.get(eid);
        if (lastAge !== undefined && (age - lastAge) < event.cooldown) {
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

    // 筛选可用候选
    const candidates = [];
    for (const eid of eventIds) {
      if (!this.check(eid, property)) continue;

      const event = this.#eventData.get(eid);
      if (!event) continue;

      // 非重复事件检查
      if (!event.repeatable) {
        const state = property.getAll();
        const evtList = state.EVT || [];
        if (evtList.includes(eid)) continue;
      }

      // 冷却检查
      if (event.cooldown > 0 && event.repeatable) {
        const cooldowns = extraState.eventCooldowns || new Map();
        const lastAge = cooldowns.get(eid);
        if (lastAge !== undefined && (age - lastAge) < event.cooldown) {
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
   * @param {number} currentAge - 当前年龄
   * @param {number|undefined} lastTriggerAge - 上次触发的年龄
   * @returns {boolean} true = 冷却已过或无需冷却
   */
  checkCooldown(eventId, currentAge, lastTriggerAge) {
    const event = this.#eventData.get(Number(eventId));
    if (!event) return true;

    // 无冷却要求
    if (!event.cooldown || event.cooldown <= 0) return true;

    // 从未触发过
    if (lastTriggerAge === undefined || lastTriggerAge === null) return true;

    return (currentAge - lastTriggerAge) >= event.cooldown;
  }
}
