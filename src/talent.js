// 天赋系统 - 赛博朋克版

import { evaluateCondition, parseCondition } from './functions/condition.js';

export class Talent {
  #talentData;
  #conditionCache;

  constructor() {
    this.#talentData = new Map();
    this.#conditionCache = new Map();
  }

  initial(data) {
    if (!data) return;
    for (const [id, talent] of Object.entries(data)) {
      this.#talentData.set(Number(id), talent);
      if (talent.condition) {
        this.#conditionCache.set(Number(id), parseCondition(talent.condition));
      }
    }
  }

  get(talentId) {
    return this.#talentData.get(Number(talentId)) || null;
  }

  getAll() {
    return Array.from(this.#talentData.values());
  }

  // 检查天赋是否可触发
  do(talentId, property) {
    const talent = this.#talentData.get(Number(talentId));
    if (!talent) return null;

    // 检查条件
    if (talent.condition) {
      const cond = this.#conditionCache.get(Number(talentId));
      if (cond) {
        const state = property.getAll();
        if (!evaluateCondition(cond, state)) {
          return null;
        }
      }
    }

    // 返回效果
    return {
      effect: talent.effect || null
    };
  }

  // 按等级获取天赋
  getByGrade(grade) {
    return Array.from(this.#talentData.values())
      .filter(t => t.grade === grade);
  }

  // 获取互斥组
  getExclusiveGroups() {
    const groups = [];
    const processed = new Set();
    
    for (const [id, talent] of this.#talentData) {
      if (processed.has(id)) continue;
      if (talent.exclusive && talent.exclusive.length > 0) {
        const group = [id, ...talent.exclusive];
        group.forEach(gid => processed.add(gid));
        groups.push(group);
      }
    }
    
    return groups;
  }
}
