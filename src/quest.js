// 任务待办系统 - 赛博朋克版中间人任务追踪

export class QuestSystem {
  #activeQuests;
  #completedQuests;
  #failedQuests;
  #questMap;

  constructor() {
    this.#activeQuests = [];
    this.#completedQuests = [];
    this.#failedQuests = [];
    this.#questMap = new Map();
  }

  /**
   * 从事件数据接取任务
   * @param {Object} questData - 任务数据
   * @returns {Object} 创建的任务对象
   */
  acceptQuest(questData) {
    const quest = {
      id: questData.id,
      sourceEventId: questData.sourceEventId || null,
      title: questData.title || '未命名任务',
      description: questData.description || '',
      giver: questData.giver || '未知中间人',
      type: questData.type || 'contract',
      difficulty: questData.difficulty || 1,
      objectives: (questData.objectives || []).map(o => ({
        text: o.text || '',
        completed: o.completed || false,
        turnRequired: o.turnRequired || 0,
        currentTurn: 0
      })),
      rewards: questData.rewards || {},
      penalties: questData.penalties || {},
      deadline: questData.deadline || 20,
      acceptedTurn: questData.acceptedTurn || 0,
      status: 'active',
      createdAt: Date.now()
    };

    this.#activeQuests.push(quest);
    this.#questMap.set(quest.id, quest);
    return quest;
  }

  /**
   * 推进任务目标
   * @param {string} questId - 任务ID
   * @param {number} objectiveIndex - 目标索引
   * @returns {Object|null} 如果所有目标完成返回奖励，否则返回null
   */
  advanceObjective(questId, objectiveIndex) {
    const quest = this.#questMap.get(questId);
    if (!quest || quest.status !== 'active') return null;

    const obj = quest.objectives[objectiveIndex];
    if (!obj || obj.completed) return null;

    obj.completed = true;

    // 检查是否所有目标完成
    const allDone = quest.objectives.every(o => o.completed);
    if (allDone) {
      return this.#completeQuest(quest);
    }

    return null;
  }

  /**
   * 自动推进任务（每旬调用）
   * 根据当前回合数自动推进有回合要求的目标
   * @param {number} currentTurn - 当前回合
   * @returns {Array} 完成的任务列表
   */
  processTurn(currentTurn) {
    const completed = [];
    const toComplete = [];
    for (const quest of this.#activeQuests) {
      for (const obj of quest.objectives) {
        if (!obj.completed && obj.turnRequired > 0) {
          obj.currentTurn++;
          if (obj.currentTurn >= obj.turnRequired) {
            obj.completed = true;
          }
        }
      }
      // 检查是否所有目标完成
      const allDone = quest.objectives.every(o => o.completed);
      if (allDone) {
        toComplete.push(quest);
      }
    }
    // 在遍历结束后再完成任务，避免遍历中修改数组
    for (const quest of toComplete) {
      const rewards = this.#completeQuest(quest);
      completed.push({ quest, rewards });
    }
    return completed;
  }

  /**
   * 检查过期任务
   * @param {number} currentTurn - 当前回合
   * @returns {Object} 所有失败任务的合并惩罚
   */
  checkExpired(currentTurn) {
    const expired = [];
    for (let i = this.#activeQuests.length - 1; i >= 0; i--) {
      const quest = this.#activeQuests[i];
      if ((currentTurn - quest.acceptedTurn) >= quest.deadline) {
        expired.push(quest);
        this.#activeQuests.splice(i, 1);
        quest.status = 'failed';
        this.#failedQuests.push(quest);
      }
    }

    // 合并所有惩罚
    const totalPenalties = {};
    for (const quest of expired) {
      for (const [key, value] of Object.entries(quest.penalties || {})) {
        totalPenalties[key] = (totalPenalties[key] || 0) + value;
      }
    }
    return totalPenalties;
  }

  /**
   * 完成任务（内部方法）
   */
  #completeQuest(quest) {
    const idx = this.#activeQuests.indexOf(quest);
    if (idx >= 0) this.#activeQuests.splice(idx, 1);
    quest.status = 'completed';
    this.#completedQuests.push(quest);
    return { ...quest.rewards };
  }

  /**
   * 获取任务进度百分比
   */
  getQuestProgress(questId) {
    const quest = this.#questMap.get(questId);
    if (!quest) return 0;
    const total = quest.objectives.length;
    if (total === 0) return 100;
    const done = quest.objectives.filter(o => o.completed).length;
    return Math.round((done / total) * 100);
  }

  /**
   * 获取剩余回合数
   */
  getRemainingTurns(questId, currentTurn) {
    const quest = this.#questMap.get(questId);
    if (!quest || quest.status !== 'active') return 0;
    return Math.max(0, quest.deadline - (currentTurn - quest.acceptedTurn));
  }

  /**
   * 获取指定ID的任务
   */
  getQuest(questId) {
    return this.#questMap.get(questId) || null;
  }

  getActiveQuests() {
    return [...this.#activeQuests];
  }

  getCompletedQuests() {
    return [...this.#completedQuests];
  }

  getFailedQuests() {
    return [...this.#failedQuests];
  }

  /**
   * 序列化为JSON
   */
  serialize() {
    return {
      active: this.#activeQuests.map(q => this.#stripQuest(q)),
      completed: this.#completedQuests.map(q => this.#stripQuest(q)),
      failed: this.#failedQuests.map(q => this.#stripQuest(q))
    };
  }

  #stripQuest(q) {
    return {
      id: q.id,
      sourceEventId: q.sourceEventId,
      title: q.title,
      description: q.description,
      giver: q.giver,
      type: q.type,
      difficulty: q.difficulty,
      objectives: q.objectives.map(o => ({ ...o })),
      rewards: { ...q.rewards },
      penalties: { ...q.penalties },
      deadline: q.deadline,
      acceptedTurn: q.acceptedTurn,
      status: q.status
    };
  }

  /**
   * 从JSON恢复
   */
  restore(data) {
    this.reset();
    if (data.active) {
      for (const q of data.active) {
        this.#activeQuests.push({ ...q });
        this.#questMap.set(q.id, this.#activeQuests[this.#activeQuests.length - 1]);
      }
    }
    if (data.completed) {
      for (const q of data.completed) {
        this.#completedQuests.push({ ...q });
        this.#questMap.set(q.id, this.#completedQuests[this.#completedQuests.length - 1]);
      }
    }
    if (data.failed) {
      for (const q of data.failed) {
        this.#failedQuests.push({ ...q });
        this.#questMap.set(q.id, this.#failedQuests[this.#failedQuests.length - 1]);
      }
    }
  }

  reset() {
    this.#activeQuests = [];
    this.#completedQuests = [];
    this.#failedQuests = [];
    this.#questMap = new Map();
  }
}
