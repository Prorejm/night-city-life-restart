// 事件系统 - 赛博朋克版

import { evaluateCondition, parseCondition } from './functions/condition.js';

export class Event {
  #eventData;
  #conditionCache;

  constructor() {
    this.#eventData = new Map();
    this.#conditionCache = new Map();
  }

  initial(data) {
    if (!data) return;
    for (const [id, event] of Object.entries(data)) {
      const eid = Number(id);
      this.#eventData.set(eid, {
        ...event,
        id: eid
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
}
