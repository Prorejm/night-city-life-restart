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

// ========== 死亡事件链定义 ==========
// 死亡不再是瞬间发生，而是危机→挣扎→结果的多段链式过程
// 链中的 branch 条件可能导向存活分支（chainTerminal: 'survive'）
// 链事件ID范围: 18101-18200
const DEATH_CHAINS = {
  gang: {
    start: 18101,
    events: {
      18101: {
        event: '几个帮派成员在暗巷里堵住了你。他们手里拎着扳手和焊接面罩，脸上带着不怀好意的笑容——你闻到了廉价合成酒精和血腥味。',
        effect: { LIFE: -1 },
        chainNext: 18102
      },
      18102: {
        event: '你想跑，但他们早有准备。一根电棍击中了你的后背，你跪倒在地。领头的俯下身，用扳手拍了拍你的脸。',
        effect: { LIFE: -1 },
        branch: ['STYLE>8:18103', 'TECH>8:18104', 'CHROME>10:18105'],
        chainNext: 18001
      },
      18103: {
        event: '你抬起头，冷冷地盯着他："你知道我是谁吗？"你的名声在这一刻像一面盾。他们犹豫了一下，骂骂咧咧地退回了黑暗中。你活下来了——但这次教训刻骨铭心。',
        effect: { STYLE: 1, HUMANITY: -1 },
        chainTerminal: 'survive'
      },
      18104: {
        event: '你悄悄激活了植入式通讯干扰器。他们的义眼同时闪烁——系统过载。趁着混乱，你滚进了一条排水沟，消失在夜之城的下水道网络中。',
        effect: { TECH: 1 },
        chainTerminal: 'survive'
      },
      18105: {
        event: '你的螳螂刀从手臂中弹出。虽然寡不敌众，但你的军用级义体让你杀出了一条血路。你浑身是血地逃到了安全地带——但你知道，这座城市的眼睛永远不会忘记。',
        effect: { CHROME: 1, HUMANITY: -2 },
        chainTerminal: 'survive'
      }
    }
  },
  corp: {
    start: 18111,
    events: {
      18111: {
        event: '你的银行账户突然被冻结，公寓的门锁变成了红色。你知道这意味着什么——企业的清理程序已经启动了。',
        effect: { EDDIES: -5 },
        chainNext: 18112
      },
      18112: {
        event: '无人机在你窗外盘旋。你的通讯器收到一条只有三个字的短信："别跑了。"你能感觉到死亡的气息——冰冷、精确、不带感情。',
        effect: { LIFE: -1 },
        branch: ['TECH>10:18113', 'STYLE>10:18114'],
        chainNext: 18006
      },
      18113: {
        event: '你在最后一秒黑入了大楼的消防系统。喷淋头爆开，烟雾弥漫整个走廊。在企业特工的怒吼声中，你从通风管道爬了出去——湿透、狼狈，但活着。',
        effect: { TECH: 1, EDDIES: -3 },
        chainTerminal: 'survive'
      },
      18114: {
        event: '你拨通了一个号码——来生酒吧的某个中间人欠你一个人情。五分钟后，一队"不明身份"的武装人员 intervened，双方交火中你趁乱逃离。夜之城的债，有时候能救命。',
        effect: { STYLE: 1, EDDIES: -5 },
        chainTerminal: 'survive'
      }
    }
  },
  cyber: {
    start: 18121,
    events: {
      18121: {
        event: '你的神经处理器突然发出尖锐的警报。视野边缘开始出现雪花噪点——这是义体排斥反应的前兆。你感觉到自己的左手正在失去控制。',
        effect: { LIFE: -1 },
        chainNext: 18122
      },
      18122: {
        event: '系统错误代码像瀑布一样冲刷你的视网膜。你的心脏——那颗改装过的赛博引擎——开始不规则跳动。每一次颤抖都像是有人在胸腔里拧螺丝。',
        effect: { LIFE: -1 },
        branch: ['TECH>12:18123'],
        chainNext: 18011
      },
      18123: {
        event: '你强行接入了义体的诊断端口，用 raw code 重写了固件。这是一场与机器的赛跑——你的意识在数据流中漂流了似乎永恒的几秒钟。然后，警报解除了。你浑身冷汗地靠在墙上，第一次觉得"活着"是一种奢侈。',
        effect: { TECH: 1, HUMANITY: -1 },
        chainTerminal: 'survive'
      }
    }
  },
  medical: {
    start: 18131,
    events: {
      18131: {
        event: '黑市诊所的手术出了差错。麻醉剂剂量不对——你在手术台上提前醒了过来。你能感觉到手术刀在皮肤下移动，但你的身体不听使唤。',
        effect: { LIFE: -1 },
        chainNext: 18132
      },
      18132: {
        event: '感染在几小时内扩散。你的体温飙升，视野模糊，每一次呼吸都像吞咽碎玻璃。那个"医生"已经不见了，只留下一瓶来历不明的抗生素。',
        effect: { LIFE: -1 },
        branch: ['EDDIES>10:18133'],
        chainNext: 18016
      },
      18133: {
        event: '你用最后的力气拨通了创伤小组的号码。钻石会员的优先级让你在一小时内被送上了浮空车。当镇静剂注入静脉时，你听到医生说："再晚十分钟就完了。"你活下来了——但账户里的数字让你想哭。',
        effect: { EDDIES: -10, LIFE: 1 },
        chainTerminal: 'survive'
      }
    }
  },
  combat: {
    start: 18141,
    events: {
      18141: {
        event: '子弹从四面八方射来。你躲在掩体后面，感觉到温热的血液从肩膀流下——你中弹了。对方的火力压制让你连头都抬不起来。',
        effect: { LIFE: -1 },
        chainNext: 18142
      },
      18142: {
        event: '弹药用尽。你听到了脚步声在靠近——沉重、谨慎、训练有素。你握紧了最后一颗手雷，手指悬在拉环上。',
        effect: { LIFE: -1 },
        branch: ['STYLE>10:18143', 'CHROME>12:18144'],
        chainNext: 18021
      },
      18143: {
        event: '就在最后一刻，远处传来了引擎的轰鸣——你的帮派兄弟们赶到了。双方在街道上展开了激烈的交火，你被拖上一辆装甲车，在呼啸的弹雨中逃离。夜之城的街头规则：永远不要独自面对死亡。',
        effect: { STYLE: 1, HUMANITY: -1 },
        chainTerminal: 'survive'
      },
      18144: {
        event: '你启动了皮下装甲的紧急模式。钛合金板从肋骨间弹出，挡住了致命的一击。你像一头受伤的野兽一样冲出了包围圈——虽然伤痕累累，但你的心脏还在跳动。',
        effect: { CHROME: 1, HUMANITY: -2 },
        chainTerminal: 'survive'
      }
    }
  },
  accident: {
    start: 18151,
    events: {
      18151: {
        event: '你驾驶的载具在一个急转弯处失控。金属撕裂的声音、玻璃碎裂的声音、然后是——寂静。你悬挂在安全带里，头顶的燃油正在滴落。',
        effect: { LIFE: -1 },
        chainNext: 18152
      },
      18152: {
        event: '火焰开始蔓延。你的腿被卡住了，每一次挣扎都带来钻心的疼痛。浓烟灌入肺部，视线越来越暗。',
        effect: { LIFE: -1 },
        branch: ['TECH>8:18153'],
        chainNext: 18026
      },
      18153: {
        event: '你用便携切片器黑入了车门的安全锁。液压装置松开的瞬间，你从燃烧的残骸中滚了出来。你在地上躺了很久，看着自己的载具化为火球——但你还活着。',
        effect: { TECH: 1 },
        chainTerminal: 'survive'
      }
    }
  },
  braindance: {
    start: 18161,
    events: {
      18161: {
        event: '你在超梦中陷得太深了。边界开始模糊——你分不清哪些是别人的记忆，哪些是你自己的。有人在超梦信号里埋了东西，你能感觉到它在你的神经通路中蔓延。',
        effect: { LIFE: -1 },
        chainNext: 18162
      },
      18162: {
        event: '你的视觉皮层被过量的感官数据淹没。你看到自己的双手在溶解，变成纯粹的数据流。海马体在发出求救信号——再这样下去，你将不再是"你"。',
        effect: { LIFE: -1 },
        branch: ['TECH>12:18163'],
        chainNext: 18031
      },
      18163: {
        event: '你强行切断了超梦连接——用 raw code 烧断了神经链接。剧烈的头痛让你呕吐了三次，但你的意识终于回到了自己的身体里。你发誓再也不碰未经认证的超梦——至少这个月不会。',
        effect: { TECH: 1, HUMANITY: -1 },
        chainTerminal: 'survive'
      }
    }
  },
  badlands: {
    start: 18171,
    events: {
      18171: {
        event: '恶土上的辐射风暴来得毫无预兆。你的载具抛锚了，水囊破了，GPS信号在沙暴中消失。四周只有无尽的黄沙和远处游荡的变异生物。',
        effect: { LIFE: -1 },
        chainNext: 18172
      },
      18172: {
        event: '夜幕降临，温度骤降。你能感觉到辐射在皮肤下灼烧，每一次呼吸都带着金属味。远处传来了引擎声——不知是救援还是夜游鬼。',
        effect: { LIFE: -1 },
        branch: ['STYLE>8:18173'],
        chainNext: 18036
      },
      18173: {
        event: '那是一支流浪者 clan 的车队。你的名声在恶土上也有回响——他们认出了你。一个满脸风霜的老妇人扔给你一瓶净水和一块防辐射布："在这鬼地方，活着的人互相帮助。"你跟着他们的车队回到了文明边缘。',
        effect: { STYLE: 1, HUMANITY: 1 },
        chainTerminal: 'survive'
      }
    }
  },
  natural: {
    start: 18181,
    events: {
      18181: {
        event: '你的身体在发出最后的警告。那颗改装过的心脏跳得越来越慢，每一次搏动都像是在与重力抗争。你靠在窗边，看着夜之城永不熄灭的霓虹灯——它们已经陪伴了你太多年。',
        effect: { LIFE: -1 },
        chainNext: 18182
      },
      18182: {
        event: '意识在漂移。你看到了过去的片段——第一次安装义体时的兴奋，第一次杀人后的噩梦，第一次在来生酒吧听到有人提起你名字时的骄傲。然后一切开始褪色。',
        effect: { LIFE: -1 },
        chainNext: 18040
      }
    }
  }
};

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
    // 推进buff持续时间
    this.#property.tickBuffs();
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

    // 死亡检查 —— 死亡事件链
    const alreadyDead = results.some(r => r.isDeath || r.isInstantDeath);
    if (!alreadyDead) {
      const traumaTeamEvent = results.find(r => r.isTraumaTeam);
      if (!traumaTeamEvent) {
        const chainInfo = this.#checkDeath();
        if (chainInfo) {
          const chainResults = this.#executeDeathChain(chainInfo.category);
          results.push(...chainResults);
        }
      }
    }

    // 判断最终是否死亡（经过死亡链后）
    const isDead = results.some(r => r.isDeath) || this.#property.isDead() || this.#property.isCyberpsycho();
    return { turn: newTurn, age: newAge, month, phase, events: results, questUpdates, isDead };
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
          // 战斗拼点：基础属性 + 装备武器加成
          const weaponBonus = this.#inventory ? this.#inventory.getEquippedBonuses().STYLE || 0 : 0;
          const power = ((state.STYLE || 0) + weaponBonus) * 0.3 + (state.TECH || 0) * 0.2 + (state.CHROME || 0) * 0.5 + Math.random() * 5;
          const difficulty = 5; // 默认难度
          if (power < difficulty) {
            // 战斗失败
            this.#property.effect({ LIFE: -1 });
            // 战斗失败后检查LIFE是否已<=0 → 进入死亡事件链
            const lifeAfterCombat = this.#property.get('LIFE');
            if (lifeAfterCombat <= 0) {
              const chainResults = this.#executeDeathChain('combat');
              results.push(result);
              results.push(...chainResults);
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

          // 检查事件导致 LIFE 降至 0 以下 → 进入死亡事件链
          const life = this.#property.get('LIFE');
          if (life <= 0) {
            const chainResults = this.#executeDeathChain('combat');
            results.push(result);
            results.push(...chainResults);
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
          const addResult = this.#inventory.addItem(resultMeta.itemAward, this.#property);
          rewards.item = resultMeta.itemAward;
          // 义体装备时触发人性惩罚
          if (addResult.equipped && resultMeta.itemAward.startsWith('imp_')) {
            const itemData = this.#itemsData[resultMeta.itemAward];
            if (itemData && itemData.effect) {
              // 检查是否增加了CHROME
              if (itemData.effect.CHROME) {
                const humanityLoss = Math.ceil(itemData.effect.CHROME * 0.5);
                this.#property.effect({ HUMANITY: -humanityLoss });
              }
            }
          }
        }

        // 新元数据字段：vehicleAward
        if (resultMeta && resultMeta.vehicleAward) {
          this.addVehicle(resultMeta.vehicleAward);
          rewards.vehicle = resultMeta.vehicleAward;
        }

        // 新元数据字段：drugAward → 药品进背包（不直接应用）
        if (resultMeta && resultMeta.drugAward) {
          this.#inventory.addItem(resultMeta.drugAward);
          this.#drugUsageCount++;
          rewards.drug = resultMeta.drugAward;
        }

        // 旧版兼容：ITEM_GAIN_EVENTS 映射
        const itemGain = ITEM_GAIN_EVENTS[result.id];
        if (itemGain && this.#inventory) {
          const addResult = this.#inventory.addItem(itemGain, this.#property);
          if (!rewards.item) rewards.item = itemGain;
          // 义体装备时触发人性惩罚
          if (addResult.equipped && itemGain.startsWith('imp_')) {
            const compatItemData = this.#itemsData[itemGain];
            if (compatItemData && compatItemData.effect && compatItemData.effect.CHROME) {
              const humanityLoss = Math.ceil(compatItemData.effect.CHROME * 0.5);
              this.#property.effect({ HUMANITY: -humanityLoss });
            }
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
    const life = this.#property.get('LIFE');

    // 0. 战斗/事件导致 LIFE <= 0 — 进入战斗死亡链
    if (life <= 0) {
      return { category: 'combat' };
    }

    // 1. 赛博精神病 (HUMANITY <= 0) — 进入义体故障死亡链
    if (this.#property.isCyberpsycho()) {
      return { category: 'cyber' };
    }

    // 2. 计算基础死亡概率（每旬）
    let deathChance = this.#calculateBaseDeathChancePerTurn(age);

    // 3. 风险因子修正
    const modifiers = this.#calculateDeathModifiers();
    let finalChance = deathChance + modifiers.total;

    // 4. 如果触发死亡，从加权池中选取具体死因类别，进入对应死亡链
    if (Math.random() < finalChance) {
      const entry = this.#selectWeightedDeath();
      return { category: entry.category };
    }

    return null;
  }

  /**
   * 执行死亡事件链
   * @param {string} category - 死亡链类别 (gang/corp/cyber/medical/combat/accident/braindance/badlands/natural)
   * @returns {Array} 链中所有事件结果
   */
  #executeDeathChain(category) {
    const chainDef = DEATH_CHAINS[category];
    if (!chainDef) return [];

    const results = [];
    let currentId = chainDef.start;

    while (currentId) {
      const eventData = chainDef.events[currentId];

      // 如果链中没有该ID，可能是引用了 DEATH_EVENTS 的终点
      if (!eventData) {
        const deathEvent = DEATH_EVENTS[currentId];
        if (deathEvent) {
          this.#property.change('LIFE', -1);
          this.#deathMessage = deathEvent.type;
          results.push({
            id: currentId,
            event: deathEvent.text,
            isDeathChain: true,
            isDeath: true,
            deathType: deathEvent.type
          });
        }
        break;
      }

      // 应用效果
      if (eventData.effect) {
        this.#property.effect(eventData.effect);
      }

      const result = {
        id: currentId,
        event: eventData.event,
        isDeathChain: true
      };

      // 链终点：死亡
      if (eventData.chainTerminal === 'death') {
        this.#property.change('LIFE', -1);
        const deathEntry = Object.entries(DEATH_EVENTS).find(([_, d]) => d.category === category);
        if (deathEntry) {
          this.#deathMessage = deathEntry[1].type;
          result.event = deathEntry[1].text;
          result.id = Number(deathEntry[0]);
        }
        result.isDeath = true;
        result.deathType = this.#deathMessage;
        results.push(result);
        break;
      }

      // 链终点：存活
      if (eventData.chainTerminal === 'survive') {
        result.isSurvived = true;
        // 确保存活后 LIFE 至少为 1（防止链中扣减过多导致意外死亡）
        if (this.#property.get('LIFE') <= 0) {
          this.#property.set('LIFE', 1);
        }
        results.push(result);
        break;
      }

      results.push(result);

      // 评估分支条件
      if (eventData.branch) {
        const matched = this.#evaluateChainBranch(eventData.branch);
        if (matched) {
          currentId = matched;
          continue;
        }
      }

      currentId = eventData.chainNext || null;
    }

    return results;
  }

  /**
   * 评估死亡链分支条件
   * @param {string[]} branchArray - 如 ['STYLE>8:18103', 'TECH>8:18104']
   * @returns {number|null} 匹配的分支目标ID
   */
  #evaluateChainBranch(branchArray) {
    const state = this.#property.getAll();
    for (const branchStr of branchArray) {
      const colonIdx = branchStr.lastIndexOf(':');
      if (colonIdx < 0) continue;
      const cond = branchStr.slice(0, colonIdx).trim();
      const targetId = Number(branchStr.slice(colonIdx + 1));
      if (!cond || isNaN(targetId)) continue;
      const parsed = parseCondition(cond);
      if (parsed && evaluateCondition(parsed, state)) {
        return targetId;
      }
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
