import { describe, it, beforeEach, afterEach } from 'node:test';
import { strictEqual, deepStrictEqual, ok } from 'node:assert';
import { Event } from '../src/event.js';
import { Property } from '../src/property.js';

describe('Event', () => {
  const sampleEvents = {
    11001: { id: 11001, event: '童年事件1', type: 'daily', include: 'AGE>3&AGE<16', effect: { STYLE: 1 }, repeatable: false },
    11002: { id: 11002, event: '童年事件2', type: 'social', exclude: 'CHROME>5', effect: { TECH: 1 }, repeatable: true, cooldown: 3 },
    12001: { id: 12001, event: '青年事件', type: 'combat', include: 'AGE>14', effect: { CHROME: 1, HUMANITY: -1 }, repeatable: false },
    18001: { id: 18001, event: '死亡事件', type: 'special', NoRandom: true, effect: { LIFE: -1 } },
    19001: { id: 19001, event: '日常事件', type: 'daily', effect: { EDDIES: 1 }, repeatable: true, cooldown: 2 },
    20001: { id: 20001, event: '剧情事件', type: 'story', branch: ['STYLE>5:20002'], effect: { STYLE: 2 } },
    20002: { id: 20002, event: '剧情分支', type: 'story', effect: { STYLE: 3 } }
  };

  it('initial() 加载事件数据', () => {
    const event = new Event();
    event.initial(sampleEvents);
    strictEqual(event.get(11001).event, '童年事件1');
    strictEqual(event.get(18001).NoRandom, true);
  });

  it('check() NoRandom 过滤', () => {
    const event = new Event();
    event.initial(sampleEvents);
    const prop = new Property();
    prop.change('AGE', 10);
    strictEqual(event.check(11001, prop), true);
    strictEqual(event.check(18001, prop), false);
  });

  it('check() include 条件', () => {
    const event = new Event();
    event.initial(sampleEvents);
    const prop = new Property();
    prop.change('AGE', 5);
    strictEqual(event.check(11001, prop), true);
    prop.change('AGE', 20);
    strictEqual(event.check(11001, prop), false);
  });

  it('check() exclude 条件', () => {
    const event = new Event();
    event.initial(sampleEvents);
    const prop = new Property();
    prop.change('AGE', 5);
    prop.set('CHROME', 2);
    strictEqual(event.check(11002, prop), true);
    prop.set('CHROME', 6);
    strictEqual(event.check(11002, prop), false);
  });

  it('check() ID_AGE_RANGES 隐式年龄过滤', () => {
    const event = new Event();
    event.initial(sampleEvents);
    const prop = new Property();
    prop.change('AGE', 5);
    strictEqual(event.check(12001, prop), false);
    prop.change('AGE', 16);
    strictEqual(event.check(12001, prop), true);
  });

  it('do() 普通事件返回正确结构', () => {
    const event = new Event();
    event.initial(sampleEvents);
    const prop = new Property();
    const results = event.do(11001, prop);
    strictEqual(results.length, 1);
    strictEqual(results[0].id, 11001);
    strictEqual(results[0].event, '童年事件1');
    strictEqual(results[0].next, null);
  });

  it('do() branch 分支跳转', () => {
    const event = new Event();
    event.initial(sampleEvents);
    const prop = new Property();
    prop.set('STYLE', 6);
    const results = event.do(20001, prop);
    strictEqual(results.length, 1);
    strictEqual(results[0].next, 20002);
  });

  it('do() branch 无匹配走默认', () => {
    const event = new Event();
    event.initial(sampleEvents);
    const prop = new Property();
    prop.change('STYLE', 3);
    const results = event.do(20001, prop);
    strictEqual(results.length, 1);
    strictEqual(results[0].next, null);
  });

  it('random() 权重随机选择', () => {
    const event = new Event();
    event.initial(sampleEvents);
    const prop = new Property();
    prop.change('AGE', 5);
    const selected = event.random([[11001, 2], [11002, 1]], prop);
    ok([11001, 11002].includes(selected));
  });

  it('pickByType() 按类型选取事件', () => {
    const event = new Event();
    event.initial(sampleEvents);
    const prop = new Property();
    prop.change('AGE', 5);
    const extraState = { eventCooldowns: new Map(), age: 5, turn: 180 };
    const eid = event.pickByType('social', 5, prop, extraState);
    strictEqual(eid, 11002);
  });

  it('pickByType() 冷却期内排除可重复事件', () => {
    const event = new Event();
    event.initial(sampleEvents);
    const prop = new Property();
    prop.change('AGE', 5);
    // 11002的cooldown是3（年），转为旬=3*36=108
    // lastTurn=180 (相当于AGE=5)，当前turn=216 (相当于AGE=6)，(216-180)=36 < 108，冷却未过
    const extraState = { eventCooldowns: new Map([[11002, 180]]), age: 6, turn: 216 };
    const eid = event.pickByType('social', 6, prop, extraState);
    strictEqual(eid, null);
  });

  it('pickByType() 非重复事件通过EVT排除', () => {
    const event = new Event();
    event.initial(sampleEvents);
    const prop = new Property();
    prop.change('AGE', 5);
    prop.change('EVT', [11001]);
    const extraState = { eventCooldowns: new Map(), age: 5, turn: 180 };
    const eid = event.pickByType('daily', 5, prop, extraState);
    strictEqual(eid, 19001);
  });

  it('pickByType() 死亡事件ID范围被排除', () => {
    const event = new Event();
    event.initial({
      18001: { id: 18001, event: '死亡', type: 'special', NoRandom: true },
      19001: { id: 19001, event: '日常', type: 'special', effect: { EDDIES: 1 } }
    });
    const prop = new Property();
    prop.change('AGE', 30);
    const extraState = { eventCooldowns: new Map(), age: 30, turn: 1080 };
    const eid = event.pickByType('special', 30, prop, extraState);
    strictEqual(eid, 19001);
  });

  it('getEventMeta() 返回正确元数据', () => {
    const event = new Event();
    event.initial(sampleEvents);
    const meta = event.getEventMeta(11002);
    strictEqual(meta.type, 'social');
    strictEqual(meta.repeatable, true);
    strictEqual(meta.cooldown, 3);
    strictEqual(meta.itemAward, null);
  });

  it('checkCooldown() 正确判断（现有事件按年转旬）', () => {
    const event = new Event();
    event.initial(sampleEvents);
    // 11002: cooldown=3（年），转为旬=108
    // 当前turn=360（相当于AGE=10），从未触发过 → true（冷却已过）
    strictEqual(event.checkCooldown(11002, 360, undefined), true);
    // lastTurn=180（相当于AGE=5），(360-180)=180 >= 108 → true（冷却已过）
    strictEqual(event.checkCooldown(11002, 360, 180), true);
    // lastTurn=288（相当于AGE=8），(360-288)=72 < 108 → false（冷却未过）
    strictEqual(event.checkCooldown(11002, 360, 288), false);
  });

  // ====== 模块三：事件机制核实新增测试 ======

  describe('数据校验', () => {
    let warnings;
    const origWarn = console.warn;

    beforeEach(() => {
      warnings = [];
      console.warn = (...args) => warnings.push(args.join(' '));
    });

    afterEach(() => {
      console.warn = origWarn;
    });

    it('initial() repeatable=true 但 cooldown=0 时发出警告', () => {
      const event = new Event();
      event.initial({
        19001: { id: 19001, event: '可重复无冷却', type: 'daily', repeatable: true, cooldown: 0, effect: { EDDIES: 1 } }
      });
      ok(warnings.length > 0);
      ok(warnings.some(w => w.includes('19001') && w.includes('repeatable') && w.includes('cooldown')));
    });

    it('initial() repeatable=true 且 cooldown>0 时不发出警告', () => {
      const event = new Event();
      event.initial({
        19001: { id: 19001, event: '可重复有冷却', type: 'daily', repeatable: true, cooldown: 3, effect: { EDDIES: 1 } }
      });
      strictEqual(warnings.length, 0);
    });

    it('initial() itemAward 格式不以 wpn_/cyber_/drug_ 开头时发出警告', () => {
      const event = new Event();
      event.initial({
        19001: { id: 19001, event: '物品奖励', type: 'daily', itemAward: 'bad_item', effect: { EDDIES: 1 } }
      });
      ok(warnings.some(w => w.includes('19001') && w.includes('itemAward')));
    });

    it('initial() itemAward 格式正确时不发出警告', () => {
      const event = new Event();
      event.initial({
        19001: { id: 19001, event: '物品奖励', type: 'daily', itemAward: 'wpn_001', effect: { EDDIES: 1 } }
      });
      strictEqual(warnings.filter(w => w.includes('itemAward')).length, 0);
    });

    it('initial() branch 目标不存在时发出警告', () => {
      const event = new Event();
      event.initial({
        20001: { id: 20001, event: '剧情', type: 'story', branch: ['STYLE>5:29999'], effect: { STYLE: 2 } }
      });
      ok(warnings.some(w => w.includes('20001') && w.includes('29999')));
    });

    it('initial() branch 目标存在时不发出警告', () => {
      const event = new Event();
      event.initial({
        20001: { id: 20001, event: '剧情', type: 'story', branch: ['STYLE>5:20002'], effect: { STYLE: 2 } },
        20002: { id: 20002, event: '分支', type: 'story', effect: { STYLE: 3 } }
      });
      strictEqual(warnings.filter(w => w.includes('branch')).length, 0);
    });
  });

  describe('死亡事件排除', () => {
    it('pickByType() 排除18000-18999范围内的死亡事件（即使非NoRandom）', () => {
      const event = new Event();
      event.initial({
        18001: { id: 18001, event: '死亡1', type: 'daily', effect: { EDDIES: 1 }, repeatable: true },
        18050: { id: 18050, event: '死亡2', type: 'daily', effect: { EDDIES: 1 }, repeatable: true },
        18999: { id: 18999, event: '死亡边界', type: 'daily', effect: { EDDIES: 1 }, repeatable: true },
        19001: { id: 19001, event: '日常', type: 'daily', effect: { EDDIES: 1 }, repeatable: true },
        17999: { id: 17999, event: '佣兵', type: 'daily', effect: { EDDIES: 1 }, repeatable: true }
      });
      const prop = new Property();
      prop.change('AGE', 30);
      const extraState = { eventCooldowns: new Map(), age: 30, turn: 1080 };
      // 重复多次确保不会抽到死亡事件
      const picked = new Set();
      for (let i = 0; i < 50; i++) {
        const eid = event.pickByType('daily', 30, prop, extraState);
        if (eid !== null) picked.add(eid);
      }
      ok(!picked.has(18001), '18001不应被选中');
      ok(!picked.has(18050), '18050不应被选中');
      ok(!picked.has(18999), '18999不应被选中');
      ok(picked.has(19001), '19001应该被选中');
      ok(picked.has(17999), '17999应该被选中');
    });

    it('pickWeightedFromPool() 排除18000-18999范围内的死亡事件', () => {
      const event = new Event();
      event.initial({
        18001: { id: 18001, event: '死亡', type: 'daily', effect: { EDDIES: 1 }, repeatable: true },
        19001: { id: 19001, event: '日常', type: 'daily', effect: { EDDIES: 1 }, repeatable: true }
      });
      const prop = new Property();
      prop.change('AGE', 30);
      const extraState = { eventCooldowns: new Map(), age: 30, turn: 1080 };
      const selected = event.pickWeightedFromPool([18001, 19001], prop, extraState, 1);
      ok(!selected.includes(18001), '18001不应被选中');
      ok(selected.includes(19001), '19001应该被选中');
    });
  });

  describe('TURN 条件和新ID范围', () => {
    it('check() 对 include:"TURN<36" 的事件在 turn=10 时通过', () => {
      const event = new Event();
      event.initial({
        30001: { id: 30001, event: '幼儿事件', type: 'daily', include: 'TURN<36', effect: { STYLE: 1 } }
      });
      const prop = new Property();
      prop.set('TURN', 10);
      strictEqual(event.check(30001, prop), true);
    });

    it('check() 对 include:"TURN<36" 的事件在 turn=40 时拒绝', () => {
      const event = new Event();
      event.initial({
        30001: { id: 30001, event: '幼儿事件', type: 'daily', include: 'TURN<36', effect: { STYLE: 1 } }
      });
      const prop = new Property();
      prop.set('TURN', 40);
      strictEqual(event.check(30001, prop), false);
    });

    it('事件 ID=30001（新范围）在 turn=200 时通过（无显式条件，走ID_TURN_RANGES）', () => {
      const event = new Event();
      event.initial({
        30001: { id: 30001, event: '幼儿期事件', type: 'daily', effect: { STYLE: 1 }, repeatable: true, cooldown: 5 }
      });
      const prop = new Property();
      prop.set('TURN', 200);
      // 30001在ID_TURN_RANGES中: minTurn=0, maxTurn=216，200在范围内
      strictEqual(event.check(30001, prop), true);
    });

    it('事件 ID=30001 在 turn=220 时拒绝（超出ID_TURN_RANGES）', () => {
      const event = new Event();
      event.initial({
        30001: { id: 30001, event: '幼儿期事件', type: 'daily', effect: { STYLE: 1 }, repeatable: true, cooldown: 5 }
      });
      const prop = new Property();
      prop.set('TURN', 220);
      strictEqual(event.check(30001, prop), false);
    });

    it('装备事件 ID=30500 无年龄限制（maxTurn=9999）', () => {
      const event = new Event();
      event.initial({
        30500: { id: 30500, event: '装备事件', type: 'economy', effect: { EDDIES: 10 }, repeatable: true, cooldown: 5 }
      });
      const prop = new Property();
      prop.set('TURN', 500);
      strictEqual(event.check(30500, prop), true);
    });

    it('pickByType() 传入 extraState 含 turn 后正常工作', () => {
      const event = new Event();
      event.initial({
        30001: { id: 30001, event: '幼儿事件', type: 'daily', include: 'TURN<36', effect: { STYLE: 1 }, repeatable: true, cooldown: 5 }
      });
      const prop = new Property();
      prop.set('TURN', 10);
      const extraState = { eventCooldowns: new Map(), age: 1, turn: 10 };
      const eid = event.pickByType('daily', 1, prop, extraState);
      strictEqual(eid, 30001);
    });
  });

  describe('冷却双轨', () => {
    it('新事件(>=30000)冷却按旬', () => {
      const event = new Event();
      event.initial({
        30001: { id: 30001, event: '新事件', type: 'daily', effect: { STYLE: 1 }, repeatable: true, cooldown: 10 }
      });
      // cooldown=10旬，lastTurn=0，当前turn=5：(5-0)=5 < 10，冷却未过
      strictEqual(event.checkCooldown(30001, 5, 0), false);
      // 当前turn=15：(15-0)=15 >= 10，冷却已过
      strictEqual(event.checkCooldown(30001, 15, 0), true);
    });

    it('现有事件(<30000)冷却按年转旬', () => {
      const event = new Event();
      event.initial({
        19001: { id: 19001, event: '日常事件', type: 'daily', effect: { EDDIES: 1 }, repeatable: true, cooldown: 1 }
      });
      // cooldown=1年→36旬，lastTurn=0，当前turn=35：(35-0)=35 < 36，冷却未过
      strictEqual(event.checkCooldown(19001, 35, 0), false);
      // 当前turn=36：(36-0)=36 >= 36，冷却已过
      strictEqual(event.checkCooldown(19001, 36, 0), true);
    });
  });
});
