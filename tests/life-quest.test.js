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
      rewards: { EDDIES: 500, STYLE: 20 },
      penalties: {},
      deadline: 20,
      acceptedTurn: life.property.get('TURN')
    });
    const beforeEddies = life.property.get('EDDIES');
    const beforeStyle = life.property.get('STYLE');
    // 推进一回合触发processTurn
    life.turnNext();
    strictEqual(qs.getCompletedQuests().length, 1);
    // EDDIES直接数值，应增加500（可能被随机事件微调）
    ok(life.property.get('EDDIES') > beforeEddies, `EDDIES应增加: ${beforeEddies} -> ${life.property.get('EDDIES')}`);
    // STYLE经验值机制，+20经验应提升等级
    ok(life.property.get('STYLE') > beforeStyle, `STYLE应增加: ${beforeStyle} -> ${life.property.get('STYLE')}`);
  });

  it('任务过期后惩罚应用到属性', () => {
    // 先度过出生阶段（AGE 0→1）
    life.turnNext();
    const qs = life.getQuestSystem();
    qs.acceptQuest({
      id: 'q_test2',
      title: '过期任务',
      objectives: [{ text: '完成', completed: false, turnRequired: 999 }],
      rewards: {},
      penalties: { EDDIES: -500 },
      deadline: 2,
      acceptedTurn: life.property.get('TURN')
    });
    const beforeEddies = life.property.get('EDDIES');
    // 推进3回合使任务过期
    life.turnNext();
    life.turnNext();
    life.turnNext();
    strictEqual(qs.getFailedQuests().length, 1);
    ok(life.property.get('EDDIES') < beforeEddies, `EDDIES应减少: ${beforeEddies} -> ${life.property.get('EDDIES')}`);
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
