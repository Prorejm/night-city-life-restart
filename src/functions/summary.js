// 人生总结评级系统 - 赛博朋克版

// 评级标准
const RATING_SCALES = {
  STYLE: [
    { min: 0, title: '无名小卒', desc: '街头没人认识你，这样也好' },
    { min: 1, title: '街头混混', desc: '开始在这座城市留下痕迹' },
    { min: 3, title: '小有名气', desc: '你的名字在几个街区里传开了' },
    { min: 5, title: '地区名人', desc: '在你常出没的地盘上，人们会向你点头致意' },
    { min: 8, title: '城市知名', desc: '整个夜之城都听说过你的名号' },
    { min: 12, title: '夜之城传奇', desc: '你的故事在来生酒吧被人传颂' },
    { min: 18, title: '不朽传说', desc: '即使你死了，夜之城也不会忘记你' }
  ],
  TECH: [
    { min: 0, title: '数字文盲', desc: '你连个人端口都不知道怎么用' },
    { min: 1, title: '菜鸟', desc: '能看懂基础的数据流' },
    { min: 3, title: '熟练工', desc: '日常黑客操作难不倒你' },
    { min: 6, title: '黑客', desc: '你可以黑进大多数企业系统' },
    { min: 10, title: '网络行者', desc: '你在网络世界中如鱼得水' },
    { min: 15, title: '黑墙行者', desc: '你曾穿越黑墙，看见了不该看的东西' },
    { min: 25, title: '赛博神明', desc: '你与数据合为一体，网络是你的领域' }
  ],
  CHROME: [
    { min: 0, title: '原装肉体', desc: '你的身体还是出厂设置' },
    { min: 1, title: '轻度改装', desc: '装了些基本玩意儿' },
    { min: 3, title: '半机械', desc: '你的身体里有一半是金属' },
    { min: 6, title: '重度义体', desc: '大部分器官都换过了' },
    { min: 10, title: '赛博怪物', desc: '你的义体多过血肉，人们开始害怕你' },
    { min: 15, title: '行走军火库', desc: '你就是一件活体武器' },
    { min: 25, title: '非人存在', desc: '你还能被称为"人"吗？' }
  ],
  EDDIES: [
    { min: 0, title: '赤贫', desc: '一个欧元都没有' },
    { min: 1, title: '温饱', desc: '勉强能糊口' },
    { min: 3, title: '小康', desc: '偶尔能在日本城吃顿好的' },
    { min: 6, title: '富裕', desc: '你在宪章山有一套公寓' },
    { min: 10, title: '企业高层', desc: '你的收入相当于中层企业高管' },
    { min: 15, title: '百万富豪', desc: '你可以在北橡买一栋别墅' },
    { min: 25, title: '荒坂董事级别', desc: '你的财富足以影响夜之城的经济走向' }
  ],
  HUMANITY: [
    { min: 0, title: '赛博精神病', desc: '你已失去人性，成为了失控的怪物。Max-Tac正在路上' },
    { min: 1, title: '边缘人', desc: '你正在滑向深渊，却毫不在意' },
    { min: 3, title: '冷漠', desc: '情感对你来说已经是一种奢侈品' },
    { min: 6, title: '正常', desc: '你在义体与人性之间找到了平衡' },
    { min: 9, title: '富有同情心', desc: '在这个冰冷的世界里，你依然保持着一颗温暖的心' },
    { min: 12, title: '圣人', desc: '夜之城不相信圣人，但你做到了' }
  ],
  AGE: [
    { min: 0, title: '胎死腹中', desc: '还没开始就结束了' },
    { min: 5, title: '早夭', desc: '夜之城的夜晚吞噬了你' },
    { min: 15, title: '街头新星', desc: '刚起步就陨落了' },
    { min: 30, title: '老江湖', desc: '你在夜之城活过了三十岁，这本身就是一种成就' },
    { min: 50, title: '传奇', desc: '你已成为夜之城的一个符号' },
    { min: 70, title: '活历史', desc: '你见证了夜之城半个世纪的变迁' },
    { min: 100, title: '夜之城不朽', desc: '你是这座城市的永恒传说' }
  ]
};

// 综合评级
const OVERALL_RATINGS = [
  { min: 0, title: 'D—公司资产', desc: '你的人生只是大企业账本上的一行数字' },
  { min: 10, title: 'D—街头垃圾', desc: '夜之城的回收站又添新货' },
  { min: 25, title: 'C—勉强合格', desc: '不算太好也不算太差，这就是大多数人的人生' },
  { min: 40, title: 'C+—街头混子', desc: '你在夜之城活出了自己的方式' },
  { min: 55, title: 'B—有点东西', desc: '你的故事值得在酒吧里讲一讲' },
  { min: 70, title: 'B+—狠角色', desc: '你在夜之城有一席之地' },
  { min: 85, title: 'A—真正的赛博朋克', desc: '你在霓虹灯下留下了不可磨灭的印记' },
  { min: 100, title: 'A+—夜之城传奇', desc: '你的名字将永远铭刻在这座城市的历史中' },
  { min: 120, title: 'S—不朽', desc: '你就是传奇本身' }
];

function getRating(value, scale) {
  let result = scale[0];
  for (const level of scale) {
    if (value >= level.min) {
      result = level;
    }
  }
  return result;
}

function getOverallScore(property) {
  const avg = (property.STYLE + property.TECH + property.CHROME + property.EDDIES) / 4;
  const humanFactor = property.HUMANITY / 10;
  const ageFactor = Math.min(property.AGE / 50, 1);
  return Math.round(avg * 10 + humanFactor * 20 + ageFactor * 20);
}

export function generateSummary(property, inventoryStats, achievementResult) {
  const ratings = {};
  for (const [key, scale] of Object.entries(RATING_SCALES)) {
    ratings[key.toLowerCase()] = getRating(property[key] || 0, scale);
  }

  const overallScore = getOverallScore(property);
  const overallRating = getRating(overallScore, OVERALL_RATINGS);

  return {
    ratings,
    overall: {
      score: overallScore,
      rating: overallRating
    },
    age: property.AGE,
    // 武器统计
    weapons: inventoryStats.weaponsByQuality || {},
    cyberware: inventoryStats.cyberwareByQuality || {},
    // 不朽清单
    legendaryItems: {
      weapons: (inventoryStats.legendaryWeapons || []).map(w => ({
        name: w.name,
        description: w.description,
        lore: w.lore
      })),
      cyberware: (inventoryStats.legendaryCyberware || []).map(c => ({
        name: c.name,
        description: c.description,
        lore: c.lore
      }))
    },
    // 载具统计
    vehicles: (inventoryStats.vehicles || []).map(v => ({
      name: v.name,
      brand: v.brand,
      class: v.class
    })),
    vehicleCount: inventoryStats.vehicleCount || 0,
    // 消耗品统计
    consumedDrugs: (inventoryStats.consumedDrugs || []),
    drugCount: (inventoryStats.consumedDrugs || []).length,
    // 成就
    achievements: (achievementResult.unlocked || []).map(a => ({
      name: a.name,
      icon: a.icon,
      description: a.description,
      category: a.category
    })),
    // 来生酒配方
    afterlifeRecipes: (achievementResult.unlockedRecipes || []).map(r => ({
      name: r.name,
      ingredients: r.ingredients,
      glass: r.glass,
      color: r.color,
      description: r.description,
      basedOn: r.based_on
    }))
  };
}
