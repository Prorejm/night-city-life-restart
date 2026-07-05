// 游戏主循环 - 赛博朋克版

import { Property } from './property.js';
import { Talent } from './talent.js';
import { Event } from './event.js';
import { Inventory } from './inventory.js';
import { Achievement } from './achievement.js';
import { generateSummary } from './functions/summary.js';

// 事件类型权重配置
const TYPE_WEIGHTS = {
  daily: 40,
  social: 20,
  combat: 15,
  medical: 10,
  economy: 10,
  special: 5
};

// 死亡原因映射
const DEATH_EVENTS = {
  18001: '你被漩涡帮抓到废弃工厂，他们对你进行了仪式性的残忍处刑。你的义体被拆下作为"祭品"，你的尖叫在铁皮墙壁间回荡……',
  18002: '清道夫在歌舞伎的黑巷里袭击了你。当你醒来时，你的义体已经被粗暴地拆走了，留下的是一个千疮百孔的躯壳。',
  18003: 'Max-Tac小队找到了你。你的赛博精神病评分已经超过了安全阈值。他们不需要活口。几声枪响后，一切归于寂静。',
  18004: '你知道得太多了。企业的暗杀小组在你回家的路上"处理"了你。你的死亡被伪装成帮派火并，没有任何调查。',
  18005: '赛博精神病彻底吞噬了你。在疯狂的杀戮之后，你最后的意识看到自己残缺的双手——那些曾经是人类的东西——已经变成了纯粹的杀戮工具。',
  18006: '超梦成瘾毁了你的大脑。你躺在廉价公寓里，花环还戴在头上，但你的意识已经永远迷失在数据之海中。',
  18007: '夜游鬼在恶土上伏击了你。你的车队被烧成了废铁，你的身体被留在荒漠中，成为秃鹫的食物。',
  18008: '战斗药物的副作用让你的心脏停止了跳动。你的最后一刻是极度的兴奋，然后是永恒的黑暗。',
  18009: '虎爪帮在歌舞伎的势力范围内抓住了你。日本刀在霓虹灯下闪过一道寒光，然后一切都结束了。',
  18010: '你在统一战争的炮火中死去。没有英雄的葬礼，没有人为你哀悼——你只是这场企业游戏中的又一个数字。',
  18011: '老年。当生命离开你的身体时，你躺在破旧的公寓里，窗外是夜之城永不熄灭的霓虹灯。对于这座城市来说，你只是又一段被遗忘的故事。',
  18012: '你消失了。没有尸体，没有凶杀案——就像你从未存在过一样。夜之城的黑暗吞没了一切痕迹。'
};

// 特殊武器/义体获取事件映射（向后兼容旧事件）
const ITEM_GAIN_EVENTS = {
  13001: 'wpn_001',  // M-179E 阿喀琉斯
  13002: 'wpn_002',  // 宪法捍卫者
  13005: 'wpn_010',  // 普鲁托之握 (不朽)
  13006: 'wpn_015',  // 米斯特汀 (不朽)
  13010: 'cyber_001', // 歧路司光学
  13011: 'cyber_002', // 智能连接
  13015: 'cyber_020', // 荷鲁斯之眼 (不朽)
  13016: 'cyber_021', // 提尔之臂 (不朽)
};

// Combat type 标签事件
const COMBAT_TYPE_TAG = 'combat';

export class Life {
  #property;
  #talent;
  #event;
  #inventory;
  #achievement;
  #triggerTalents;
  #ageData;
  #currentEvents;
  #deathMessage;
  #itemsData;
  #achievementData;
  #recipeData;
  #vehicleData;
  #bonusPoints;
  #ownedVehicles;
  #consumedDrugs;
  #eventCooldowns;
  #drugUsageCount;
  #brainDanceCount;

  constructor() {
    this.#property = new Property();
    this.#talent = new Talent();
    this.#event = new Event();
    this.#inventory = null;
    this.#achievement = null;
    this.#triggerTalents = new Set();
    this.#ageData = {};
    this.#currentEvents = [];
    this.#deathMessage = '';
    this.#itemsData = {};
    this.#achievementData = {};
    this.#recipeData = {};
    this.#vehicleData = {};
    this.#bonusPoints = 0;
    this.#ownedVehicles = [];
    this.#consumedDrugs = [];
    this.#eventCooldowns = new Map();
    this.#drugUsageCount = 0;
    this.#brainDanceCount = 0;
  }

  async initial() {
    try {
      const [talentsData, eventsData, ageData, itemsData, achData, recipesData, vehiclesData] = await Promise.all([
        this.#loadJSON('data/talents.json'),
        this.#loadJSON('data/events.json'),
        this.#loadJSON('data/age.json'),
        this.#loadJSON('data/items.json'),
        this.#loadJSON('data/achievements.json'),
        this.#loadJSON('data/recipes.json'),
        this.#loadJSON('data/vehicles.json')
      ]);

      this.#talent.initial(talentsData);
      this.#event.initial(eventsData);
      this.#ageData = ageData;
      this.#itemsData = itemsData || {};
      this.#achievementData = achData || {};
      this.#recipeData = recipesData || {};
      this.#vehicleData = vehiclesData || {};

      this.#inventory = new Inventory(this.#itemsData);
      this.#achievement = new Achievement(this.#achievementData, this.#recipeData);

      return true;
    } catch (e) {
      console.error('数据加载失败:', e);
      return false;
    }
  }

  async #loadJSON(path) {
    // 尝试多个路径以兼容 dev server 和 file:// 两种模式
    const paths = [path, `data/${path.replace('../data/', '')}`, `../${path}`];
    for (const p of paths) {
      try {
        const response = await fetch(p);
        if (response.ok) return response.json();
      } catch (e) {
        // 继续尝试下一个路径
      }
    }
    throw new Error(`Failed to load ${path}`);
  }

  restart(selectedTalents) {
    // 重置状态
    this.#property.reset();
    this.#inventory.reset();
    this.#triggerTalents = new Set();
    this.#currentEvents = [];
    this.#deathMessage = '';
    this.#ownedVehicles = [];
    this.#consumedDrugs = [];
    this.#eventCooldowns = new Map();
    this.#drugUsageCount = 0;
    this.#brainDanceCount = 0;

    // 应用基础初始属性
    this.#property.change('EDDIES', 2);
    this.#property.change('STYLE', 1);

    // 应用所选天赋的初始效果
    for (const talentId of selectedTalents) {
      const talent = this.#talent.get(talentId);
      if (talent) {
        this.#property.change('TLT', [talentId]);

        // 如果天赋有即时生效的effect
        if (talent.effect) {
          this.#property.effect(talent.effect);
        }

        // 如果天赋有status（额外分配点数）
        if (talent.status) {
          this.#bonusPoints = (this.#bonusPoints || 0) + talent.status;
        }
      }
    }

    // 记录首年
    this.#property.record();
  }

  get property() {
    return this.#property;
  }

  get inventory() {
    return this.#inventory;
  }

  get talent() {
    return this.#talent;
  }

  // 处理年龄增长
  ageNext() {
    const age = this.#property.get('AGE');
    const newAge = age + 1;
    this.#property.change('AGE', 1);

    const results = [];

    const ageKey = String(newAge);
    const ageConfig = this.#ageData[ageKey];

    // 1. 检查该年龄是否触发了特殊事件（age.json 配置）
    if (ageConfig) {
      // 处理天赋触发
      if (ageConfig.talent) {
        const talentIds = typeof ageConfig.talent === 'string'
          ? ageConfig.talent.split(',').map(Number)
          : (Array.isArray(ageConfig.talent) ? ageConfig.talent : []);

        for (const tId of talentIds) {
          const talentResult = this.#talent.do(tId, this.#property);
          if (talentResult && talentResult.effect) {
            this.#property.effect(talentResult.effect);
            this.#triggerTalents.add(tId);
          }
        }
      }

      // 处理年龄配置事件（优先）
      if (ageConfig.event && ageConfig.event.length > 0) {
        const parsedEvents = ageConfig.event.map(ev => {
          if (typeof ev === 'string') {
            const parts = ev.split('*');
            return [Number(parts[0]), parts.length > 1 ? Number(parts[1]) : 1];
          }
          return [Number(ev), 1];
        });

        const selectedEventId = this.#event.random(parsedEvents, this.#property);
        if (selectedEventId !== null) {
          const eventResults = this.#executeEvent(selectedEventId);
          results.push(...eventResults);
        }
      }
    }

    // 2. 处理待触发天赋
    this.#processPendingTalents();

    // 3. 从类型权重池中触发多事件
    const eventCount = this.#rollEventCount(newAge);
    for (let i = 0; i < eventCount; i++) {
      const eventId = this.#pickWeightedEvent(newAge);
      if (eventId) {
        const eventResults = this.#executeEvent(eventId);
        results.push(...eventResults);
      }
    }

    // 4. 记录状态
    this.#property.record();

    // 5. 死亡检查
    const death = this.#checkDeath();
    if (death) {
      results.push(death);
    }

    return { age: newAge, events: results, isDead: this.#property.isDead() || this.#property.isCyberpsycho() };
  }

  /**
   * 根据年龄段决定该年龄触发几个随机事件
   * @param {number} age
   * @returns {number} 事件数量
   */
  #rollEventCount(age) {
    if (age <= 6) return 1;
    if (age <= 15) return Math.random() < 0.4 ? 2 : 1;
    if (age <= 25) return 2 + (Math.random() < 0.4 ? 1 : 0);
    if (age <= 50) return 2 + (Math.random() < 0.3 ? 1 : 0);
    if (age <= 70) return Math.random() < 0.4 ? 2 : 1;
    return 1;
  }

  /**
   * 基于类型权重选取一个事件
   * @param {number} age - 当前年龄
   * @returns {number|null} eventId
   */
  #pickWeightedEvent(age) {
    // 构建加权类型列表
    const types = Object.entries(TYPE_WEIGHTS);
    const totalWeight = types.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * totalWeight;

    let selectedType = 'daily';
    for (const [type, weight] of types) {
      if ((r -= weight) < 0) {
        selectedType = type;
        break;
      }
    }

    // 获取当前年龄已触发事件列表（用于排除 oneshot）
    const state = this.#property.getAll();
    const extraState = {
      eventCooldowns: this.#eventCooldowns,
      age: age
    };

    // 尝试从选中类型中选取事件
    const eventId = this.#event.pickByType(selectedType, age, this.#property, extraState);
    if (eventId !== null) return eventId;

    // 如果选中类型没有可用事件，尝试 fallback 到 special 类型
    if (selectedType !== 'special') {
      const fallbackId = this.#event.pickByType('special', age, this.#property, extraState);
      if (fallbackId !== null) return fallbackId;
    }

    return null;
  }

  #processPendingTalents() {
    const talents = this.#property.get('TLT');
    for (const tId of talents) {
      if (!this.#triggerTalents.has(tId)) {
        const result = this.#talent.do(tId, this.#property);
        if (result && result.effect) {
          this.#property.effect(result.effect);
          this.#triggerTalents.add(tId);
        }
      }
    }
  }

  /**
   * 执行事件（增强版：支持 itemAward/vehicleAward/drugAward 和冷却追踪）
   * @param {number} eventId
   * @returns {Array} 事件结果数组
   */
  #executeEvent(eventId) {
    const results = [];
    let currentId = eventId;

    while (currentId) {
      const eventResults = this.#event.do(currentId, this.#property);
      if (!eventResults || eventResults.length === 0) break;

      for (const result of eventResults) {
        // 应用效果
        if (result.effect) {
          this.#property.effect(result.effect);

          // 检查战斗事件导致 LIFE 降至 0 以下 → 即死
          const life = this.#property.get('LIFE');
          if (life <= 0) {
            const combatDeath = {
              id: 18001,
              event: '你在一次激烈的街头火拼中倒下了。弹片撕裂了你的护甲，鲜血浸透了霓虹灯下的水泥地面。这是夜之城——只有强者才能活着离开。',
              isDeath: true,
              deathType: '战斗致死'
            };
            results.push(result);
            results.push(combatDeath);
            this.#property.change('LIFE', -1);
            return results;
          }
        }

        // 记录事件到 EVT
        this.#property.change('EVT', [result.id]);

        // 检查事件元数据
        const meta = this.#event.getEventMeta(result.id);

        // 新元数据字段：itemAward
        if (meta && meta.itemAward && this.#inventory) {
          this.#inventory.addItem(meta.itemAward);
        }

        // 新元数据字段：vehicleAward
        if (meta && meta.vehicleAward) {
          this.addVehicle(meta.vehicleAward);
        }

        // 新元数据字段：drugAward
        if (meta && meta.drugAward) {
          this.addDrug(meta.drugAward);
          this.#drugUsageCount++;
        }

        // 旧版兼容：ITEM_GAIN_EVENTS 映射
        const itemGain = ITEM_GAIN_EVENTS[result.id];
        if (itemGain && this.#inventory) {
          this.#inventory.addItem(itemGain);
        }

        // 处理可重复/一次性事件追踪
        if (meta) {
          if (meta.repeatable) {
            // 可重复事件：更新冷却记录
            this.#eventCooldowns.set(result.id, this.#property.get('AGE'));
          } else {
            // 一次性事件：已通过 EVT 记录排除，无需额外操作
          }

          // 追踪特定事件类型计数
          if (meta.type === 'combat') {
            // combat 事件可能伴随药物使用（通过 effect 中的 CHROME 变化来推断不精确，
            // 此处简单统计 combat 类型事件）
          }

          // 追踪药物/超梦相关事件
          if (meta.tags) {
            if (meta.tags.includes('drug') || meta.tags.includes('substance')) {
              this.#drugUsageCount++;
            }
            if (meta.tags.includes('braindance') || meta.tags.includes('bd')) {
              this.#brainDanceCount++;
            }
          }
        }

        results.push(result);
        currentId = result.next;
      }
    }

    return results;
  }

  #checkDeath() {
    const age = this.#property.get('AGE');
    const chrome = this.#property.get('CHROME');
    const humanity = this.#property.get('HUMANITY');
    const eddies = this.#property.get('EDDIES');

    // 0. LIFE 已降至 0 以下（由 #executeEvent 中的战斗即死检查处理，此处兜底）
    if (this.#property.get('LIFE') <= 0) {
      this.#property.change('LIFE', -1);
      return {
        id: 18001,
        event: DEATH_EVENTS[18001],
        isDeath: true,
        deathType: '战斗致死'
      };
    }

    // 1. 赛博精神病 (HUMANITY <= 0)
    if (this.#property.isCyberpsycho()) {
      this.#property.change('LIFE', -1);
      return {
        id: 18005,
        event: DEATH_EVENTS[18005],
        isDeath: true,
        deathType: '赛博精神病'
      };
    }

    // 2. 随机死亡概率（随年龄增加）
    let deathChance = 0;
    if (age >= 80) deathChance = 0.15;
    else if (age >= 70) deathChance = 0.08;
    else if (age >= 60) deathChance = 0.04;
    else if (age >= 50) deathChance = 0.02;
    else if (age >= 30) deathChance = 0.005;

    // 高义体化增加死亡概率
    if (chrome > 8) deathChance += 0.02;
    if (chrome > 12) deathChance += 0.03;

    // 低人性增加死亡概率
    if (humanity < 3) deathChance += 0.03;

    // 药物滥用增加死亡概率
    if (this.#drugUsageCount > 10) {
      deathChance += 0.05;
    }

    // 超梦滥用增加死亡概率（脑损伤）
    if (this.#brainDanceCount > 8) {
      deathChance += 0.03;
    }

    if (Math.random() < deathChance) {
      const deathTypes = this.#getRandomDeathType();
      this.#property.change('LIFE', -1);
      return {
        id: deathTypes.id,
        event: deathTypes.text,
        isDeath: true,
        deathType: deathTypes.type
      };
    }

    return null;
  }

  #getRandomDeathType() {
    const deaths = [
      { id: 18001, text: DEATH_EVENTS[18001], type: '帮派处刑', weight: 10 },
      { id: 18002, text: DEATH_EVENTS[18002], type: '清道夫袭击', weight: 10 },
      { id: 18003, text: DEATH_EVENTS[18003], type: 'Max-Tac击毙', weight: 5 },
      { id: 18004, text: DEATH_EVENTS[18004], type: '企业暗杀', weight: 8 },
      { id: 18006, text: DEATH_EVENTS[18006], type: '超梦脑死', weight: 3 },
      { id: 18007, text: DEATH_EVENTS[18007], type: '荒地遇袭', weight: 5 },
      { id: 18008, text: DEATH_EVENTS[18008], type: '药物过量', weight: 7 },
      { id: 18009, text: DEATH_EVENTS[18009], type: '虎爪帮灭口', weight: 5 },
      { id: 18010, text: DEATH_EVENTS[18010], type: '战争阵亡', weight: 3 },
      { id: 18011, text: DEATH_EVENTS[18011], type: '自然死亡', weight: 15 },
    ];

    const totalWeight = deaths.reduce((s, d) => s + d.weight, 0);
    let r = Math.random() * totalWeight;
    for (const death of deaths) {
      if ((r -= death.weight) < 0) return death;
    }
    return deaths[deaths.length - 1];
  }

  // 获取当前事件
  getCurrentEvents() {
    return [...this.#currentEvents];
  }

  // 获取人生总结
  getSummary() {
    if (!this.#inventory || !this.#achievement) return null;

    const invStats = this.#inventory.getAllStats();
    invStats.vehicleCount = this.#ownedVehicles.length;
    invStats.vehicles = this.#ownedVehicles.map(id => this.#vehicleData[id]).filter(Boolean);
    invStats.consumedDrugs = [...this.#consumedDrugs];
    invStats.unlockedRecipeCount = 0;

    const achResult = this.#achievement.checkAll(this.#property, invStats);
    invStats.unlockedRecipeCount = achResult.unlockedRecipes.length;

    // 重新检查成就（现在有了配方计数）
    const finalAchResult = this.#achievement.checkAll(this.#property, invStats);
    return generateSummary(this.#property.getAll(), invStats, finalAchResult);
  }

  isEnd() {
    return this.#property.isDead() || this.#property.isCyberpsycho();
  }

  getAge() {
    return this.#property.get('AGE');
  }

  // 载具方法
  addVehicle(vehicleId) {
    if (!this.#vehicleData[vehicleId]) return false;
    if (!this.#ownedVehicles.includes(vehicleId)) {
      this.#ownedVehicles.push(vehicleId);
      return true;
    }
    return false;
  }

  getVehicles() {
    return this.#ownedVehicles.map(id => this.#vehicleData[id]).filter(Boolean);
  }

  // 消耗品方法
  addDrug(drugId) {
    if (!this.#itemsData[drugId]) return false;
    this.#consumedDrugs.push(drugId);
    // 应用消耗品效果
    const drug = this.#itemsData[drugId];
    if (drug.effect) {
      this.#property.effect(drug.effect);
    }
    return true;
  }

  getConsumedDrugs() {
    return [...this.#consumedDrugs];
  }
}
