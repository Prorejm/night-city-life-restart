import { describe, it, beforeEach } from 'node:test';
import { strictEqual, deepStrictEqual, ok } from 'node:assert';
import { Life } from '../src/life.js';

// 模拟 fetch 用于数据加载
global.fetch = async (url) => {
  const dataMap = {
    'data/talents.json': {},
    'data/events.json': {
      10001: { id: 10001, event: '出身', type: 'special', NoRandom: true, effect: {} },
      19001: { id: 19001, event: '日常', type: 'daily', effect: { EDDIES: 1 }, repeatable: true, cooldown: 1 },
      24001: { id: 24001, event: '中间人出价8000欧回收副心脏', type: 'story', effect: { EDDIES: 4, TECH: 1 }, repeatable: false, tags: ['story'] }
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

describe('Life Quest Integration', () => {
  let life;

  beforeEach(async () => {
    life = new Life();
    await life.initial();
    life.restart([]);
    // 设置足够属性避免早期死亡
    life.property.change('STYLE', 5);
    life.property.change('TECH', 5);
    life.property.change('CHROME', 2);
    life.property.change('EDDIES', 50);
    life.property.change('HUMANITY', 10);
    life.property.change('LIFE', 3);
  });

  it('重启后questSystem为空', () => {
    const qs = life.getQuestSystem();
    ok(qs);
    strictEqual(qs.getActiveQuests().length, 0);
  });

  it('执行fixer事件(24001-24500)后自动接取任务', () => {
    // 24001是fixer事件
    const results = life.testExecuteEvent(24001);
    ok(results.length > 0);
    const qs = life.getQuestSystem();
    strictEqual(qs.getActiveQuests().length, 1);
    strictEqual(qs.getActiveQuests()[0].sourceEventId, 24001);
  });

  it('非fixer事件不会接取任务', () => {
    // 19001是日常事件
    const results = life.testExecuteEvent(19001);
    const qs = life.getQuestSystem();
    strictEqual(qs.getActiveQuests().length, 0);
  });

  it('任务完成后奖励应用到属性', async () => {
    // 先度过出生阶段（AGE 0→1）
    life.turnNext();
    const qs = life.getQuestSystem();
    qs.acceptQuest({
      id: 'q_test',
      title: '测试任务',
      objectives: [{ text: '完成', completed: false, turnRequired: 1 }],
      rewards: { EDDIES: 10, STYLE: 2 },
      penalties: {},
      deadline: 20,
      acceptedTurn: life.property.get('TURN')
    });
    const beforeEddies = life.property.get('EDDIES');
    const beforeStyle = life.property.get('STYLE');
    // 推进一回合触发processTurn
    life.turnNext();
    strictEqual(qs.getCompletedQuests().length, 1);
    // 随机事件可能导致EDDIES额外变化，只检查增加了至少10
    ok(life.property.get('EDDIES') >= beforeEddies + 10, `EDDIES应至少增加10: ${beforeEddies} -> ${life.property.get('EDDIES')}`);
    strictEqual(life.property.get('STYLE'), beforeStyle + 2);
  });

  it('任务过期后惩罚应用到属性', () => {
    const qs = life.getQuestSystem();
    qs.acceptQuest({
      id: 'q_test2',
      title: '过期任务',
      objectives: [{ text: '完成', completed: false, turnRequired: 999 }],
      rewards: {},
      penalties: { EDDIES: -10 },
      deadline: 2,
      acceptedTurn: life.property.get('TURN')
    });
    const beforeEddies = life.property.get('EDDIES');
    // 推进3回合使任务过期
    life.turnNext();
    life.turnNext();
    life.turnNext();
    strictEqual(qs.getFailedQuests().length, 1);
    strictEqual(life.property.get('EDDIES'), beforeEddies - 10);
  });

  it('turnNext返回结果包含quest状态信息', () => {
    // 先度过出生阶段（AGE 0→1）
    life.turnNext();
    const qs = life.getQuestSystem();
    qs.acceptQuest({
      id: 'q_test3',
      title: '回合任务',
      objectives: [{ text: '完成', completed: false, turnRequired: 1 }],
      rewards: { EDDIES: 5 },
      penalties: {},
      deadline: 10,
      acceptedTurn: life.property.get('TURN')
    });
    const result = life.turnNext();
    ok(result.questUpdates);
    strictEqual(result.questUpdates.completed.length, 1);
    strictEqual(result.questUpdates.completed[0].quest.id, 'q_test3');
  });
});
