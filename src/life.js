// 游戏主循环 - 赛博朋克版

import { Property } from './property.js';
import { Talent } from './talent.js';
import { Event } from './event.js';
import { Inventory } from './inventory.js';
import { Achievement } from './achievement.js';
import { QuestSystem } from './quest.js';
import { generateSummary } from './functions/summary.js';
import { evaluateCondition, parseCondition } from './functions/condition.js';

// 事件类型权重配置
const TYPE_WEIGHTS = {
  daily: 40,
  social: 20,
  combat: 15,
  medical: 10,
  economy: 10,
  special: 5
};

// 死亡原因映射 (40条，按类别分组)
const DEATH_EVENTS = {
  // 帮派/街头暴力 (18001-18005)
  18001: { text: '你被漩涡帮抓到废弃工厂，他们对你进行了仪式性的残忍处刑。你的义体被拆下作为"祭品"，你的尖叫在铁皮墙壁间回荡……', type: '帮派处刑', category: 'gang' },
  18002: { text: '清道夫在歌舞伎的黑巷里袭击了你。当你醒来时，你的义体已经被粗暴地拆走了，留下的是一个千疮百孔的躯壳。', type: '清道夫袭击', category: 'gang' },
  18003: { text: '虎爪帮在歌舞伎的势力范围内抓住了你。日本刀在霓虹灯下闪过一道寒光，然后一切都结束了。', type: '虎爪帮灭口', category: 'gang' },
  18004: { text: '莫克斯帮的保镖把你当成了骚扰者。你甚至来不及解释，子弹就已经穿过了你的胸膛。', type: '莫克斯误杀', category: 'gang' },
  18005: { text: '六街帮的巡逻队把你当成了NCPD的线人。他们在荒地上给你"审判"，用的是铅弹和汽油。', type: '六街帮审判', category: 'gang' },

  // 企业/政治暗杀 (18006-18010)
  18006: { text: '你知道得太多了。企业的暗杀小组在你回家的路上"处理"了你。你的死亡被伪装成帮派火并，没有任何调查。', type: '企业暗杀', category: 'corp' },
  18007: { text: '荒坂的反情报部门锁定了你的位置。一枚精确制导的微型导弹从楼顶发射，你的公寓化为火海。', type: '荒坂清除', category: 'corp' },
  18008: { text: '军用科技的"回收小队"找到了你。他们不需要你的命，只需要你脑子里的数据——取走数据的过程就是致命的。', type: '军用科技回收', category: 'corp' },
  18009: { text: '康陶的AI安全系统把你标记为威胁。一队无人机在城市上空追踪你，直到你无处可逃。', type: '康陶无人机猎杀', category: 'corp' },
  18010: { text: '你在统一战争的炮火中死去。没有英雄的葬礼，没有人为你哀悼——你只是这场企业游戏中的又一个数字。', type: '战争阵亡', category: 'corp' },

  // 赛博精神病/义体故障 (18011-18015)
  18011: { text: '赛博精神病彻底吞噬了你。在疯狂的杀戮之后，你最后的意识看到自己残缺的双手——那些曾经是人类的东西——已经变成了纯粹的杀戮工具。', type: '赛博精神病', category: 'cyber' },
  18012: { text: '你新安装的神经处理器过载了。火花从你的太阳穴喷出，你的大脑在几毫秒内被烤熟。"便宜货"——你最后的念头。', type: '神经处理器过载', category: 'cyber' },
  18013: { text: '你的强化脊椎突然短路。你在电梯里像断了线的木偶一样倒下，义体肢体还在不受控制地抽搐。', type: '义体脊椎短路', category: 'cyber' },
  18014: { text: '歧路司光学植入物烧穿了你的视觉皮层。你死于失血——你用自己的手指挖出了眼睛，因为"它们不是我的眼睛"。', type: '光学植入物暴走', category: 'cyber' },
  18015: { text: 'Max-Tac小队找到了你。你的赛博精神病评分已经超过了安全阈值。他们不需要活口。几声枪响后，一切归于寂静。', type: 'Max-Tac击毙', category: 'cyber' },

  // 医疗/药物/手术事故 (18016-18020)
  18016: { text: '战斗药物的副作用让你的心脏停止了跳动。你的最后一刻是极度的兴奋，然后是永恒的黑暗。', type: '药物过量', category: 'medical' },
  18017: { text: '你在地下诊所做义体手术时，麻醉剂是劣质的。你在手术台上醒来，感受到每一次切割，直到休克夺走了你的生命。', type: '手术麻醉失效', category: 'medical' },
  18018: { text: '你购买的"黑市强化肾上腺素"被掺了毒。你的血管在几分钟内结晶化，死状极其痛苦。', type: '黑市药品中毒', category: 'medical' },
  18019: { text: '你的免疫系统排斥了新的义体植入物。全身性败血症在24小时内夺走了你的生命——连最便宜的义体医生都救不了你。', type: '义体排斥反应', category: 'medical' },
  18020: { text: '创伤小组的会员到期了。当你倒在街头流血时，他们的浮空车从你头顶飞过，去救一个钻石会员。你死在了等待中。', type: '创伤小组拒救', category: 'medical' },

  // 战斗/佣兵任务 (18021-18025)
  18021: { text: '你在一次企业突袭任务中被出卖了。你的小队被包围在仓库里，投降不被接受。你的尸体被烧焦以隐藏证据。', type: '佣兵任务出卖', category: 'combat' },
  18022: { text: '中间人给你的情报是错误的。你闯入了漩涡帮的据点，以为只有三个人——实际上有三十个。你没有机会拔枪。', type: '情报错误伏击', category: 'combat' },
  18023: { text: '你在夜之城郊外的公路上遭遇了NCPD的"清剿行动"。他们不在乎你是不是无辜的——在这个区域，所有人都是目标。', type: 'NCPD清剿', category: 'combat' },
  18024: { text: '你的狙击位置暴露了。对方的反击是一发火箭弹——你甚至没听到它的声音。', type: '狙击位置暴露', category: 'combat' },
  18025: { text: '你在来生酒吧接了一个"简单"的护送任务。客户是清道夫的诱饵，你的后脑勺挨了一记铁管。', type: '护送任务陷阱', category: 'combat' },

  // 意外/环境灾害 (18026-18030)
  18026: { text: '夜之城罕见的酸雨季开始了。你的廉价公寓屋顶漏水，腐蚀性的雨水滴在你的电源插座上。火灾在睡梦中夺走了你。', type: '酸雨季火灾', category: 'accident' },
  18027: { text: '你走在市政中心的天桥上，一段老化的结构突然坍塌。你从三十米高空坠落，下面就是车水马龙的街道。', type: '天桥坍塌', category: 'accident' },
  18028: { text: '你驾驶的老旧载具在恶土上抛锚了。夜间的辐射风暴在救援到来之前就摧毁了你的免疫系统。', type: '辐射风暴', category: 'accident' },
  18029: { text: '一场企业间的网络战导致城市电网崩溃。你被困在电梯里三天，缺氧和脱水最终击败了你。', type: '电网崩溃被困', category: 'accident' },
  18030: { text: '你误食了被污染的食物。夜之城的地下水系统早已崩溃，你只是又一个受害者。', type: '污染食物中毒', category: 'accident' },

  // 超梦/神经损伤 (18031-18035)
  18031: { text: '超梦成瘾毁了你的大脑。你躺在廉价公寓里，花环还戴在头上，但你的意识已经永远迷失在数据之海中。', type: '超梦脑死', category: 'braindance' },
  18032: { text: '你体验了一款非法的"黑色超梦"。录制者死于极度痛苦，而你同步体验了每一个细节。你的心脏无法承受。', type: '黑色超梦同步死亡', category: 'braindance' },
  18033: { text: '你的超梦编辑技能让你看到了不该看的东西。有人在超梦信号里埋了神经病毒——你的大脑在几秒内变成了浆糊。', type: '超梦神经病毒', category: 'braindance' },
  18034: { text: '连续72小时的超梦狂欢让你的海马体永久性损伤。你忘记了如何呼吸—— literally。', type: '超梦海马体损伤', category: 'braindance' },
  18035: { text: '你试图"录制"自己的死亡超梦作为艺术。装置出了故障，你在真正死亡前几秒钟陷入了无限循环的意识囚笼。', type: '死亡超梦循环', category: 'braindance' },

  // 恶土/流浪者特供 (18036-18040)
  18036: { text: '夜游鬼在恶土上伏击了你。你的车队被烧成了废铁，你的身体被留在荒漠中，成为秃鹫的食物。', type: '荒地遇袭', category: 'badlands' },
  18037: { text: '你得罪了流浪者 clan 的长老。在恶土上，这意味着被逐出营地——没有水，没有载具，只有无尽的沙漠和烈日。', type: '流浪者放逐', category: 'badlands' },
  18038: { text: '一群变异的郊狼攻击了你的营地。它们的牙齿和爪子带有放射性毒素——创伤小组不会来恶土。', type: '变异郊狼攻击', category: 'badlands' },
  18039: { text: '你在恶土上发现了一个"废弃"的企业设施。安全系统仍然在运行——自动炮塔把你打成了筛子。', type: '企业设施炮塔', category: 'badlands' },
  18040: { text: '老年。当生命离开你的身体时，你躺在破旧的公寓里，窗外是夜之城永不熄灭的霓虹灯。对于这座城市来说，你只是又一段被遗忘的故事。', type: '自然死亡', category: 'natural' }
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
  #questSystem;
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
  #birthEventResult;
  #hasFiredBirth;
  #traumaTeamCount;
  #tarotCount;

  constructor() {
    this.#property = new Property();
    this.#talent = new Talent();
    this.#event = new Event();
    this.#inventory = null;
    this.#achievement = null;
    this.#questSystem = new QuestSystem();
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
    this.#birthEventResult = null;
    this.#hasFiredBirth = false;
    this.#traumaTeamCount = 0;
    this.#tarotCount = 0;
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
    this.#questSystem.reset();
    this.#triggerTalents = new Set();
    this.#currentEvents = [];
    this.#deathMessage = '';
    this.#ownedVehicles = [];
    this.#consumedDrugs = [];
    this.#eventCooldowns = new Map();
    this.#drugUsageCount = 0;
    this.#brainDanceCount = 0;
    this.#birthEventResult = null;
    this.#hasFiredBirth = false;
    this.#traumaTeamCount = 0;
    this.#tarotCount = 0;

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

    // 随机选取一个出生事件并预执行
    this.#selectBirthEvent();
  }

  /**
   * 随机选取一个出生事件（10001-10008），在AGE 0时触发
   * 注意：出生事件检查跳过 NoRandom，因为出生事件是明确在此处选择的
   */
  #selectBirthEvent() {
    const birthIds = [10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008];
    const available = birthIds.filter(id => {
      const event = this.#event.get(id);
      if (!event) return false;
      // 出生事件只检查 include/exclude 条件，不检查 NoRandom
      const state = this.#property.getAll();
      if (event.exclude) {
        const excCond = parseCondition(event.exclude);
        if (excCond && evaluateCondition(excCond, state)) return false;
      }
      if (event.include) {
        const incCond = parseCondition(event.include);
        if (incCond && !evaluateCondition(incCond, state)) return false;
      }
      return true;
    });
    if (available.length === 0) return;
    const selectedId = available[Math.floor(Math.random() * available.length)];
    const results = this.#event.do(selectedId, this.#property);
    if (results && results.length > 0) {
      this.#birthEventResult = results;
      // 记录出生事件
      this.#property.change('EVT', [selectedId]);
      // 应用出生事件效果
      for (const r of results) {
        if (r.effect) {
          this.#property.effect(r.effect);
        }
      }
      this.#property.record();
    }
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

  // 处理年龄增长（向后兼容方法，内部调用36次turnNext）
  ageNext() {
    // 如果还在AGE 0，调用一次turnNext即可（出生事件）
    const currentAge = this.#property.get('AGE');
    if (currentAge === 0) {
      const result = this.turnNext();
      return { age: result.age, events: result.events, isDead: result.isDead };
    }

    // 调用36次turnNext推进一整年，汇总事件
    const allEvents = [];
    let lastResult = null;
    let hasAddedDivider = false;
    for (let i = 0; i < 36; i++) {
      lastResult = this.turnNext();
      if (lastResult.age > currentAge && !hasAddedDivider) {
        allEvents.push({
          id: 'year_divider',
          event: `═══ ${lastResult.age}岁 ═══`,
          isYearDivider: true
        });
        hasAddedDivider = true;
      }
      allEvents.push(...lastResult.events);
      if (lastResult.isDead) break;
    }

    return {
      age: lastResult ? lastResult.age : this.#property.get('AGE'),
      events: allEvents,
      isDead: this.#property.isDead() || this.#property.isCyberpsycho()
    };
  }

  // 核心方法：按旬推进
  turnNext() {
    const oldTurn = this.#property.get('TURN');
    const newTurn = oldTurn + 1;
    const oldAge = this.#property.get('AGE');
    const newAge = newTurn === 0 ? 0 : Math.floor(newTurn / 36) + 1;
    const month = Math.floor((newTurn % 36) / 3) + 1;
    const phase = newTurn % 3;

    this.#property.change('TURN', 1);
    if (newAge > oldAge) this.#property.change('AGE', newAge - oldAge);
    this.#property.set('MONTH', month);
    this.#property.set('PHASE', phase);

    const results = [];

    // AGE 0→1：出生事件（兼容原有逻辑，只触发一次）
    if (oldAge === 0 && newAge === 1) {
      if (this.#birthEventResult) {
        for (const r of this.#birthEventResult) {
          results.push({ ...r, isBirth: true });
        }
      }
      this.#hasFiredBirth = true;
      this.#processPendingTalents();
      this.#property.record();
      const death = this.#checkDeath();
      if (death) results.push(death);
      return { turn: newTurn, age: newAge, month, phase, events: results, questUpdates: { completed: [], failed: [], penalties: {} }, isDead: this.#property.isDead() || this.#property.isCyberpsycho() };
    }

    // 年度逻辑：天赋 + age.json（仅在跨年时触发）
    if (newAge > oldAge && newAge >= 2) {
      const ageKey = String(newAge);
      const ageConfig = this.#ageData[ageKey];
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

        // 处理年龄配置事件
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
    }

    // 处理待触发天赋
    this.#processPendingTalents();

    // 每旬随机事件
    const eventCount = this.#rollEventCountPerTurn(newAge, newTurn);
    for (let i = 0; i < eventCount; i++) {
      const eventId = this.#pickWeightedEvent(newAge, newTurn);
      if (eventId) {
        const eventResults = this.#executeEvent(eventId);
        results.push(...eventResults);
      }
    }

    // 每旬生活费（AGE>=16后，费率除以36）
    if (newAge >= 16) {
      const eddies = this.#property.get('EDDIES');
      if (eddies > 0) {
        let livingRate = 0.03;
        if (newAge >= 60) livingRate = 0.05;
        else if (newAge >= 41) livingRate = 0.04;
        else if (newAge >= 26) livingRate = 0.03;
        else livingRate = 0.02;
        const cost = Math.floor(eddies * livingRate / 36);
        if (cost > 0) this.#property.effect({ EDDIES: -cost });
      } else {
        // 破产惩罚降频：只在每年第一旬(phase===0)触发
        if (phase === 0) {
          this.#property.effect({ HUMANITY: -1, STYLE: -1 });
        }
      }
    }

    // 属性自然衰减（每年只在特定旬触发）
    if (newAge > 50 && phase === 0 && Math.random() < 0.1) {
      this.#property.effect({ STYLE: -1, TECH: -1 });
    }
    if (this.#property.get('CHROME') > 12 && phase === 0) {
      this.#property.effect({ HUMANITY: -1 });
    }

    // ===== 任务系统处理 =====
    const questUpdates = { completed: [], failed: [], penalties: {} };
    // 推进活跃任务的目标进度
    const completedQuests = this.#questSystem.processTurn(newTurn);
    for (const { quest, rewards } of completedQuests) {
      questUpdates.completed.push({ quest, rewards });
      // 应用任务完成奖励
      if (rewards) {
        this.#property.effect(rewards);
      }
    }
    // 检查过期任务
    const expiredPenalties = this.#questSystem.checkExpired(newTurn);
    if (expiredPenalties && Object.keys(expiredPenalties).length > 0) {
      questUpdates.penalties = expiredPenalties;
      this.#property.effect(expiredPenalties);
      // 收集失败任务信息用于UI展示
      const failedQuests = this.#questSystem.getFailedQuests();
      // 只展示本轮新失败的
      const newlyFailed = failedQuests.filter(q => q.failedThisTurn);
      for (const q of newlyFailed) {
        questUpdates.failed.push(q);
      }
    }

    // 记录状态
    this.#property.record();

    // 死亡检查
    const alreadyDead = results.some(r => r.isDeath || r.isInstantDeath);
    if (!alreadyDead) {
      const traumaTeamEvent = results.find(r => r.isTraumaTeam);
      if (!traumaTeamEvent) {
        const death = this.#checkDeath();
        if (death) results.push(death);
      }
    }

    return { turn: newTurn, age: newAge, month, phase, events: results, questUpdates, isDead: this.#property.isDead() || this.#property.isCyberpsycho() };
  }

  /**
   * 根据年龄段决定该年龄触发几个随机事件（按年计算，向后兼容）
   * @param {number} age
   * @returns {number} 事件数量
   */
  #rollEventCount(age) {
    return this.#rollEventCountPerTurn(age, age * 36);
  }

  /**
   * 根据年龄段决定每旬触发几个随机事件（概率降低）
   * @param {number} age
   * @param {number} turn
   * @returns {number} 事件数量（0或1为主）
   */
  #rollEventCountPerTurn(age, turn) {
    if (age <= 6) return Math.random() < (1 / 36) ? 1 : 0;
    if (age <= 15) return Math.random() < (1.4 / 36) ? 1 : 0;
    if (age <= 25) return Math.random() < (2.4 / 36) ? 1 : 0;
    if (age <= 50) return Math.random() < (2.3 / 36) ? 1 : 0;
    if (age <= 70) return Math.random() < (1.4 / 36) ? 1 : 0;
    return Math.random() < (1 / 36) ? 1 : 0;
  }

  /**
   * 基于类型权重选取一个事件
   * @param {number} age - 当前年龄
   * @param {number} turn - 当前回合
   * @returns {number|null} eventId
   */
  #pickWeightedEvent(age, turn) {
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

    // 获取当前已触发事件列表（用于排除 oneshot）
    const extraState = {
      eventCooldowns: this.#eventCooldowns,
      age: age,
      turn: turn
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
        // 获取事件元数据（用于战斗拼点、奖励判定等）
        const resultMeta = this.#event.getEventMeta(result.id);

        // ===== 直接死亡事件（isInstantDeath）=====
        if (resultMeta && resultMeta.isInstantDeath) {
          results.push({ ...result, isInstantDeath: true });
          this.#property.change('LIFE', -1);
          return results;
        }

        // ===== 创伤小组事件（isTraumaTeam）=====
        if (resultMeta && resultMeta.isTraumaTeam) {
          // 恢复LIFE
          this.#property.change('LIFE', resultMeta.traumaLifeRestore || 3);
          // 增加CHROME（义体化植入）
          this.#property.change('CHROME', resultMeta.traumaChromeGain || 2);
          // 人性下降（被迫接受更多义体）
          this.#property.change('HUMANITY', -(resultMeta.traumaHumanityLoss || 2));
          this.#traumaTeamCount++;
          results.push({ ...result, isTraumaTeam: true });
          currentId = result.next;
          continue;
        }

        // ===== 塔罗牌事件标记传递 =====
        if (resultMeta && resultMeta.isTarot) {
          result.isTarot = true;
          result.tarotName = resultMeta.tarotName || '未知塔罗';
          this.#tarotCount++;
        }

        // 战斗拼点判定（combat类型事件，在effect应用之前）
        if (resultMeta && resultMeta.type === 'combat' && result.effect) {
          const state = this.#property.getAll();
          const power = (state.STYLE || 0) * 0.3 + (state.TECH || 0) * 0.2 + (state.CHROME || 0) * 0.5 + Math.random() * 5;
          const difficulty = 5; // 默认难度
          if (power < difficulty) {
            // 战斗失败
            this.#property.effect({ LIFE: -1 });
            // 战斗失败后检查LIFE是否已<=0
            const lifeAfterCombat = this.#property.get('LIFE');
            if (lifeAfterCombat <= 0) {
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
        }

        // 应用效果
        if (result.effect) {
          this.#property.effect(result.effect);

          // 义体-人性自动平衡：CHROME增加但未指定HUMANITY变化时自动扣除人性
          if (result.effect.CHROME > 0 && (!result.effect.HUMANITY || result.effect.HUMANITY >= 0)) {
            const chromeGain = result.effect.CHROME;
            this.#property.effect({ HUMANITY: -Math.ceil(chromeGain * 0.5) });
          }

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
        // 构建奖励信息（供UI展示）
        const rewards = {
          item: null,
          vehicle: null,
          drug: null
        };

        // 新元数据字段：itemAward
        if (resultMeta && resultMeta.itemAward && this.#inventory) {
          this.#inventory.addItem(resultMeta.itemAward);
          rewards.item = resultMeta.itemAward;
          // 立即应用武器/义体的属性加成
          const itemData = this.#itemsData[resultMeta.itemAward];
          if (itemData && itemData.effect) {
            this.#property.effect(itemData.effect);
          }
        }

        // 新元数据字段：vehicleAward
        if (resultMeta && resultMeta.vehicleAward) {
          this.addVehicle(resultMeta.vehicleAward);
          rewards.vehicle = resultMeta.vehicleAward;
        }

        // 新元数据字段：drugAward
        if (resultMeta && resultMeta.drugAward) {
          this.addDrug(resultMeta.drugAward);
          this.#drugUsageCount++;
          rewards.drug = resultMeta.drugAward;
        }

        // 旧版兼容：ITEM_GAIN_EVENTS 映射
        const itemGain = ITEM_GAIN_EVENTS[result.id];
        if (itemGain && this.#inventory) {
          this.#inventory.addItem(itemGain);
          if (!rewards.item) rewards.item = itemGain;
          // 立即应用物品属性加成
          const compatItemData = this.#itemsData[itemGain];
          if (compatItemData && compatItemData.effect) {
            this.#property.effect(compatItemData.effect);
          }
        }

        // 处理可重复/一次性事件追踪
        if (resultMeta) {
          if (resultMeta.repeatable) {
            // 可重复事件：更新冷却记录（按turn记录）
            this.#eventCooldowns.set(result.id, this.#property.get('TURN'));
          } else {
            // 一次性事件：已通过 EVT 记录排除，无需额外操作
          }

          // 追踪特定事件类型计数
          if (resultMeta.type === 'combat') {
            // combat 事件可能伴随药物使用（通过 effect 中的 CHROME 变化来推断不精确，
            // 此处简单统计 combat 类型事件）
          }

          // 追踪药物/超梦相关事件
          if (resultMeta.tags) {
            if (resultMeta.tags.includes('drug') || resultMeta.tags.includes('substance')) {
              this.#drugUsageCount++;
            }
            if (resultMeta.tags.includes('braindance') || resultMeta.tags.includes('bd')) {
              this.#brainDanceCount++;
            }
          }
        }

        // ===== Fixer事件自动转化为任务（24001-24500）=====
        if (result.id >= 24001 && result.id <= 24500) {
          const questData = this.#buildQuestFromEvent(result.id, resultMeta);
          const quest = this.#questSystem.acceptQuest(questData);
          result.isQuestAccepted = true;
          result.questId = quest.id;
        }

        results.push({ ...result, rewards });
        currentId = result.next;
      }
    }

    return results;
  }

  /**
   * 从Fixer事件构建任务数据
   */
  #buildQuestFromEvent(eventId, eventMeta) {
    const currentTurn = this.#property.get('TURN');
    // 如果eventMeta不存在，尝试从event系统获取
    const meta = eventMeta || this.#event.get(eventId) || {};
    const eventText = meta.event || '';
    // 提取中间人名字（简单正则匹配）
    const giverMatch = eventText.match(/中间人[""']([^""']+)[""']/);
    const giver = giverMatch ? giverMatch[1] : (eventText.includes('企业中间人') ? '企业中间人' : '匿名中间人');
    // 从效果推导难度
    const eddiesReward = meta.effect ? (meta.effect.EDDIES || 1) : 1;
    const difficulty = Math.min(5, Math.max(1, Math.floor(eddiesReward / 2)));
    // 任务目标：需要经过若干回合完成
    const turnRequired = Math.floor(Math.random() * 3) + 1 + difficulty;

    return {
      id: `quest_${eventId}_${currentTurn}`,
      sourceEventId: eventId,
      title: this.#extractQuestTitle(eventText),
      description: eventText,
      giver,
      type: 'contract',
      difficulty,
      objectives: [{ text: '执行任务', completed: false, turnRequired, currentTurn: 0 }],
      rewards: meta.effect ? { ...meta.effect } : {},
      penalties: { EDDIES: -Math.max(1, Math.floor(eddiesReward * 0.5)), STYLE: -1 },
      deadline: 10 + difficulty * 5 + Math.floor(Math.random() * 10),
      acceptedTurn: currentTurn
    };
  }

  #extractQuestTitle(eventText) {
    if (!eventText) return '未命名任务';
    // 尝试提取核心动作
    const actions = ['回收', '处理掉', '暗杀', '护送', '调查', '窃取', '摧毁', '保卫', '渗透', '追踪'];
    for (const action of actions) {
      const idx = eventText.indexOf(action);
      if (idx >= 0) {
        // 取动作前后几个字作为标题
        const start = Math.max(0, idx - 4);
        const end = Math.min(eventText.length, idx + 12);
        return eventText.slice(start, end).trim();
      }
    }
    return eventText.slice(0, 15) + (eventText.length > 15 ? '…' : '');
  }

  #checkDeath() {
    const age = this.#property.get('AGE');
    const chrome = this.#property.get('CHROME');
    const humanity = this.#property.get('HUMANITY');
    const life = this.#property.get('LIFE');

    // 0. 战斗/事件导致 LIFE <= 0 — 立即战斗死亡
    if (life <= 0) {
      this.#property.change('LIFE', -1);
      this.#deathMessage = '战斗致死';
      return {
        id: 18021,
        event: DEATH_EVENTS[18021].text,
        isDeath: true,
        deathType: '战斗致死'
      };
    }

    // 1. 赛博精神病 (HUMANITY <= 0) — 立即结束，固定使用赛博精神病事件
    if (this.#property.isCyberpsycho()) {
      this.#property.change('LIFE', -1);
      this.#deathMessage = '赛博精神病';
      return {
        id: 18011,
        event: DEATH_EVENTS[18011].text,
        isDeath: true,
        deathType: '赛博精神病'
      };
    }

    // 2. 计算基础死亡概率（每旬）
    let deathChance = this.#calculateBaseDeathChancePerTurn(age);

    // 3. 风险因子修正
    const modifiers = this.#calculateDeathModifiers();
    let finalChance = deathChance + modifiers.total;

    // 4. 如果触发死亡，从加权池中选取具体死因
    if (Math.random() < finalChance) {
      const entry = this.#selectWeightedDeath();
      this.#property.change('LIFE', -1);
      this.#deathMessage = entry.type;
      return {
        id: entry.id,
        event: entry.text,
        isDeath: true,
        deathType: entry.type
      };
    }

    return null;
  }

  #calculateBaseDeathChancePerTurn(age) {
    if (age >= 80) return 0.3 / 36;
    if (age >= 70) return 0.15 / 36;
    if (age >= 60) return 0.07 / 36;
    if (age >= 50) return 0.035 / 36;
    if (age >= 40) return 0.02 / 36;
    if (age >= 30) return 0.012 / 36;
    if (age >= 20) return 0.005 / 36;
    if (age >= 10) return 0.002 / 36;
    return 0;
  }

  #calculateDeathModifiers() {
    const chrome = this.#property.get('CHROME');
    const humanity = this.#property.get('HUMANITY');
    const style = this.#property.get('STYLE');
    const eddies = this.#property.get('EDDIES');

    let total = 0;
    const categoryWeights = {};

    // 义体化修正
    if (chrome > 16) { total += 0.05; categoryWeights.cyber = (categoryWeights.cyber || 0) + 3; categoryWeights.medical = (categoryWeights.medical || 0) + 2; }
    else if (chrome > 12) { total += 0.03; categoryWeights.cyber = (categoryWeights.cyber || 0) + 2; categoryWeights.medical = (categoryWeights.medical || 0) + 1; }
    else if (chrome > 8) { total += 0.02; categoryWeights.cyber = (categoryWeights.cyber || 0) + 1; }

    // 人性修正
    if (humanity < 3) { total += 0.08; categoryWeights.cyber = (categoryWeights.cyber || 0) + 3; }
    else if (humanity < 5) { total += 0.03; categoryWeights.cyber = (categoryWeights.cyber || 0) + 1; }

    // 药物修正
    if (this.#drugUsageCount > 10) { total += 0.05; categoryWeights.medical = (categoryWeights.medical || 0) + 8; }
    else if (this.#drugUsageCount > 5) { total += 0.02; categoryWeights.medical = (categoryWeights.medical || 0) + 3; }

    // 超梦修正
    if (this.#brainDanceCount > 8) { total += 0.04; categoryWeights.braindance = (categoryWeights.braindance || 0) + 3; }
    else if (this.#brainDanceCount > 4) { total += 0.015; categoryWeights.braindance = (categoryWeights.braindance || 0) + 1; }

    // 战斗历史修正
    const state = this.#property.getAll();
    const evtList = state.EVT || [];
    const combatCount = evtList.filter(id => id >= 14000 && id < 18000).length;
    if (combatCount > 10) { total += 0.03; categoryWeights.combat = (categoryWeights.combat || 0) + 2; }
    else if (combatCount > 5) { total += 0.015; categoryWeights.combat = (categoryWeights.combat || 0) + 1; }

    // 经济破产修正
    if (eddies <= 0) { total += 0.03; categoryWeights.gang = (categoryWeights.gang || 0) + 1; }

    // 高声望+低经济 = 帮派目标
    if (style > 10 && eddies < 5) { total += 0.02; categoryWeights.gang = (categoryWeights.gang || 0) + 2; }

    return { total, categoryWeights };
  }

  #selectWeightedDeath(forceCategories = null) {
    const age = this.#property.get('AGE');
    const chrome = this.#property.get('CHROME');
    const humanity = this.#property.get('HUMANITY');

    // 构建候选死亡池
    let candidates = Object.entries(DEATH_EVENTS).map(([id, data]) => ({
      id: Number(id),
      text: data.text,
      type: data.type,
      category: data.category,
      weight: 10
    }));

    // 应用类别权重修正
    const modifiers = this.#calculateDeathModifiers();
    for (const candidate of candidates) {
      if (modifiers.categoryWeights[candidate.category]) {
        candidate.weight += modifiers.categoryWeights[candidate.category];
      }
    }

    // 根据状态过滤不可能的死因
    if (forceCategories) {
      candidates = candidates.filter(c => forceCategories.includes(c.category));
    } else {
      if (chrome === 0) {
        candidates = candidates.filter(c => c.category !== 'cyber');
      }
      if (age < 30) {
        candidates = candidates.filter(c => c.category !== 'natural');
      }
    }

    // 如果过滤后为空，回退到所有候选
    if (candidates.length === 0) {
      candidates = Object.entries(DEATH_EVENTS).map(([id, data]) => ({
        id: Number(id),
        text: data.text,
        type: data.type,
        category: data.category,
        weight: 10
      }));
    }

    // 高CHROME降低自然死亡权重
    if (chrome > 12) {
      for (const c of candidates) {
        if (c.category === 'natural') c.weight = Math.max(1, c.weight - 5);
      }
    }

    // 高drugUsage提升药物类权重（已在categoryWeights中处理，这里额外提升）
    if (this.#drugUsageCount > 10) {
      for (const c of candidates) {
        if (c.category === 'medical') c.weight += 3;
      }
    }

    // 加权随机选择
    const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
    let r = Math.random() * totalWeight;
    for (const candidate of candidates) {
      if ((r -= candidate.weight) < 0) return candidate;
    }
    return candidates[candidates.length - 1];
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
    invStats.drugCount = this.#drugUsageCount;
    invStats.traumaCount = this.#traumaTeamCount;
    invStats.tarotCount = this.#tarotCount;
    invStats.totalEddies = this.#property.get('TOTAL_EDDIES');
    invStats.unlockedRecipeCount = 0;

    const achResult = this.#achievement.checkAll(this.#property, invStats);
    invStats.unlockedRecipeCount = achResult.unlockedRecipes.length;

    // 重新检查成就（现在有了配方计数）
    const finalAchResult = this.#achievement.checkAll(this.#property, invStats);
    const summary = generateSummary(this.#property.getAll(), invStats, finalAchResult);
    summary.deathReason = this.#deathMessage || (this.#property.isCyberpsycho() ? '赛博精神病' : '未知');
    summary.talentIds = this.#property.get('TLT');
    return summary;
  }

  // 获取当前已解锁的成就列表（用于游戏过程中检测新成就）
  getCurrentAchievements() {
    if (!this.#inventory || !this.#achievement) return [];

    const invStats = this.#inventory.getAllStats();
    invStats.vehicleCount = this.#ownedVehicles.length;
    invStats.vehicles = this.#ownedVehicles.map(id => this.#vehicleData[id]).filter(Boolean);
    invStats.consumedDrugs = [...this.#consumedDrugs];
    invStats.drugCount = this.#drugUsageCount;
    invStats.traumaCount = this.#traumaTeamCount;
    invStats.tarotCount = this.#tarotCount;
    invStats.totalEddies = this.#property.get('TOTAL_EDDIES');

    const achResult = this.#achievement.checkAll(this.#property, invStats);
    return achResult.unlocked;
  }

  isEnd() {
    return this.#property.isDead() || this.#property.isCyberpsycho();
  }

  getAge() {
    return this.#property.get('AGE');
  }

  /**
   * 获取出生事件结果（用于开局展示）
   * @returns {Array|null}
   */
  getBirthEvent() {
    return this.#birthEventResult ? [...this.#birthEventResult] : null;
  }

  /**
   * 获取任务系统（供UI使用）
   * @returns {QuestSystem}
   */
  getQuestSystem() {
    return this.#questSystem;
  }

  /**
   * 测试辅助：直接执行指定事件（仅用于测试）
   * @param {number} eventId
   * @returns {Array} 事件结果
   */
  testExecuteEvent(eventId) {
    return this.#executeEvent(eventId);
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
    this.#drugUsageCount++;
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
