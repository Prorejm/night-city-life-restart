// 游戏主循环 - 赛博朋克版

import { Property } from './property.js';
import { Talent } from './talent.js';
import { Event } from './event.js';
import { Inventory } from './inventory.js';
import { Achievement } from './achievement.js';
import { generateSummary } from './functions/summary.js';

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

// 特殊武器/义体获取事件映射
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
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    return response.json();
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

    const ageKey = String(newAge);
    const ageConfig = this.#ageData[ageKey];

    const results = [];

    // 1. 检查该年龄是否触发了特殊事件
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

      // 处理普通天赋触发（已拥有但未触发的）
      this.#processPendingTalents();

      // 2. 随机选择年龄事件
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
          this.#currentEvents.push(...eventResults);
        }
      }
    } else {
      // 没有该年龄的特殊配置，检查普通天赋触发
      this.#processPendingTalents();

      // 从通用事件池中选择
      const generalEventId = this.#pickGeneralEvent(newAge);
      if (generalEventId) {
        const eventResults = this.#executeEvent(generalEventId);
        results.push(...eventResults);
        this.#currentEvents.push(...eventResults);
      }
    }

    // 3. 记录当前状态
    this.#property.record();

    // 4. 检查死亡
    const deathCheck = this.#checkDeath();
    if (deathCheck) {
      results.push(deathCheck);
      this.#currentEvents.push(deathCheck);
    }

    return {
      age: newAge,
      events: results,
      isDead: this.#property.isDead() || this.#property.isCyberpsycho()
    };
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
        }

        // 记录事件
        this.#property.change('EVT', [result.id]);

        // 检查是否有物品获取
        const itemGain = ITEM_GAIN_EVENTS[result.id];
        if (itemGain && this.#inventory) {
          this.#inventory.addItem(itemGain);
        }

        results.push(result);
        currentId = result.next;
      }
    }

    return results;
  }

  #pickGeneralEvent(age) {
    // 简单通用事件：随着年龄增长，从各年龄段事件池随机
    const pools = [
      { min: 0, max: 6, pool: [10001, 10002, 10003, 10004] },
      { min: 7, max: 15, pool: [11001, 11002, 11003, 11004, 11005] },
      { min: 16, max: 25, pool: [12001, 12002, 12003, 12004, 12005] },
      { min: 26, max: 50, pool: [14001, 14002, 14003, 14004, 14005] },
      { min: 51, max: 200, pool: [17001, 17002, 17003] }
    ];

    for (const pool of pools) {
      if (age >= pool.min && age <= pool.max) {
        const parsed = pool.pool.map(id => [id, 1]);
        return this.#event.random(parsed, this.#property);
      }
    }

    return null;
  }

  #checkDeath() {
    const age = this.#property.get('AGE');
    const chrome = this.#property.get('CHROME');
    const humanity = this.#property.get('HUMANITY');
    const eddies = this.#property.get('EDDIES');

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
