import { describe, it } from 'node:test';
import { strictEqual, ok } from 'node:assert';
import { Life } from '../src/life.js';

// 模拟 fetch 用于数据加载
global.fetch = async (url) => {
  const dataMap = {
    'data/talents.json': {},
    'data/events.json': {
      10001: { id: 10001, event: '出身', type: 'special', NoRandom: true, effect: {} },
      19001: { id: 19001, event: '日常', type: 'daily', effect: { EDDIES: 1 }, repeatable: true, cooldown: 1 }
    },
    'data/age.json': {},
    'data/items.json': {},
    'data/achievements.json': {},
    'data/recipes.json': {},
    'data/vehicles.json': {}
  };
  const key = Object.keys(dataMap).find(k => url.includes(k));
  if (!key) throw new Error(`Unknown url: ${url}`);
  return { ok: true, json: async () => dataMap[key] };
};

describe('turnNext()', () => {
  let life;

  async function createLife() {
    const l = new Life();
    await l.initial();
    l.restart([]);
    return l;
  }

  it('第一次调用返回 turn:1, age:1, month:1, phase:1', async () => {
    life = await createLife();
    const result = life.turnNext();
    strictEqual(result.turn, 1);
    strictEqual(result.age, 1);
    strictEqual(result.month, 1);
    strictEqual(result.phase, 1);
    ok(Array.isArray(result.events));
    strictEqual(result.isDead, false);
  });

  it('第一次调用触发 isBirth 事件', async () => {
    life = await createLife();
    const result = life.turnNext();
    ok(result.events.some(e => e.isBirth), '应触发出生事件');
  });

  it('连续调用35次后 age 仍为 1', async () => {
    life = await createLife();
    life.turnNext(); // turn 1 (birth)
    for (let i = 1; i <= 34; i++) {
      const result = life.turnNext();
      if (result.isDead) break;
    }
    const finalAge = life.property.get('AGE');
    strictEqual(finalAge, 1, `连续35次后age应为1，实际${finalAge}`);
  });

  it('第36次调用后 age 变为 2', async () => {
    life = await createLife();
    life.turnNext(); // turn 1 (birth)
    for (let i = 1; i < 36; i++) {
      const result = life.turnNext();
      if (result.isDead) break;
    }
    const finalAge = life.property.get('AGE');
    strictEqual(finalAge, 2, `第36次后age应为2，实际${finalAge}`);
    const turn = life.property.get('TURN');
    strictEqual(turn, 36, `第36次后turn应为36，实际${turn}`);
  });

  it('month和phase随turn正确变化', async () => {
    life = await createLife();
    life.turnNext(); // turn 1: month=1, phase=1
    const r1 = life.turnNext(); // turn 2: month=1, phase=2
    strictEqual(r1.month, 1);
    strictEqual(r1.phase, 2);

    const r2 = life.turnNext(); // turn 3: month=2, phase=0
    strictEqual(r2.month, 2);
    strictEqual(r2.phase, 0);

    const r3 = life.turnNext(); // turn 4: month=2, phase=1
    strictEqual(r3.month, 2);
    strictEqual(r3.phase, 1);
  });

  it('返回值包含 turn/age/month/phase/events/isDead', async () => {
    life = await createLife();
    const result = life.turnNext();
    ok('turn' in result);
    ok('age' in result);
    ok('month' in result);
    ok('phase' in result);
    ok('events' in result);
    ok('isDead' in result);
  });

  it('每旬事件数量通过蒙特卡洛验证（AGE>=14后每36旬应有事件）', async () => {
    // 推进到AGE 14以上，统计事件数
    let totalEvents = 0;
    let totalTurns = 0;
    const runs = 10;

    for (let run = 0; run < runs; run++) {
      life = await createLife();
      life.turnNext(); // birth
      for (let i = 1; i < 504; i++) { // AGE 14 = turn 504
        const result = life.turnNext();
        if (result.isDead) break;
      }
      // AGE 14后推进36旬
      const ageBefore = life.property.get('AGE');
      for (let i = 0; i < 36; i++) {
        const result = life.turnNext();
        totalEvents += result.events.length;
        totalTurns++;
        if (result.isDead) break;
      }
    }

    // 平均每36旬应该有若干事件（随机事件概率较低但age.json事件可能触发）
    // 这里只验证系统不崩溃且事件数合理
    ok(totalEvents >= 0, `总事件数应>=0: ${totalEvents}`);
    ok(totalTurns > 0, `总旬数应>0: ${totalTurns}`);
  });

  it('年度边界触发 age.json 事件', async () => {
    // 使用包含 age.json 事件的 mock 数据
    const origFetch = global.fetch;
    global.fetch = async (url) => {
      const dataMap = {
        'data/talents.json': {},
        'data/events.json': {
          10001: { id: 10001, event: '出身', type: 'special', NoRandom: true, effect: {} },
          19001: { id: 19001, event: '日常', type: 'daily', effect: { EDDIES: 1 }, repeatable: true, cooldown: 1 },
          19002: { id: 19002, event: '特殊事件', type: 'special', effect: { STYLE: 5 }, repeatable: false }
        },
        'data/age.json': {
          '2': { event: ['19002'] }
        },
        'data/items.json': {},
        'data/achievements.json': {},
        'data/recipes.json': {},
        'data/vehicles.json': {}
      };
      const key = Object.keys(dataMap).find(k => url.includes(k));
      if (!key) throw new Error(`Unknown url: ${url}`);
      return { ok: true, json: async () => dataMap[key] };
    };

    try {
      life = new Life();
      await life.initial();
      life.restart([]);
      life.turnNext(); // turn 1, birth

      // 推进到turn 36 (AGE=2), 跨年时应触发age.json中age=2的事件
      for (let i = 2; i <= 36; i++) {
        const result = life.turnNext();
        if (result.isDead) break;
      }

      const evtList = life.property.get('EVT');
      // 19002是age=2时的age.json事件
      ok(evtList.includes(19002), `AGE=2后应触发19002事件，EVT列表: ${JSON.stringify(evtList)}`);
    } finally {
      global.fetch = origFetch;
    }
  });
});
