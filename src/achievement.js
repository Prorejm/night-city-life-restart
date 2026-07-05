// 成就系统

import { evaluateCondition, parseCondition } from './functions/condition.js';

export class Achievement {
  #achievements;
  #recipes;
  #conditionCache;

  constructor(achievementData = {}, recipeData = {}) {
    this.#achievements = achievementData;
    this.#recipes = recipeData;
    this.#conditionCache = new Map();
  }

  initial(data) {
    if (data) this.#achievements = data;
    // 预解析成就条件
    for (const [id, ach] of Object.entries(this.#achievements)) {
      if (ach.condition) {
        this.#conditionCache.set(id, parseCondition(ach.condition));
      }
    }
  }

  // 检查所有成就
  checkAll(property, inventoryStats) {
    const unlocked = [];
    const unlockedRecipes = [];

    const state = property.getAll ? property.getAll() : property;

    const extraState = {
      legendaryCount: inventoryStats.legendaryCount || 0,
      legendaryWeapons: inventoryStats.legendaryWeapons || [],
      legendaryCyberware: inventoryStats.legendaryCyberware || []
    };

    for (const [id, ach] of Object.entries(this.#achievements)) {
      const cond = this.#conditionCache.get(id);
      if (cond && evaluateCondition(cond, state, extraState)) {
        unlocked.push({
          id: ach.id || id,
          name: ach.name,
          description: ach.description,
          icon: ach.icon,
          category: ach.category
        });

        // 检查奖励配方
        if (ach.reward_recipe && this.#recipes[ach.reward_recipe]) {
          if (!unlockedRecipes.find(r => r.id === ach.reward_recipe)) {
            unlockedRecipes.push(this.#recipes[ach.reward_recipe]);
          }
        }
      }
    }

    return { unlocked, unlockedRecipes };
  }
}
