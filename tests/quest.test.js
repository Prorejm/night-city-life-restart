import { describe, it, beforeEach } from 'node:test';
import { strictEqual, deepStrictEqual, ok } from 'node:assert';
import { QuestSystem } from '../src/quest.js';

describe('QuestSystem', () => {
  let qs;

  beforeEach(() => {
    qs = new QuestSystem();
  });

  it('初始状态为空', () => {
    strictEqual(qs.getActiveQuests().length, 0);
    strictEqual(qs.getCompletedQuests().length, 0);
    strictEqual(qs.getFailedQuests().length, 0);
  });

  it('acceptQuest() 接取任务后加入活跃列表', () => {
    const quest = qs.acceptQuest({
      id: 'q_001',
      title: '测试任务',
      objectives: [{ text: '目标1', completed: false }],
      deadline: 10,
      acceptedTurn: 5
    });
    ok(quest);
    strictEqual(qs.getActiveQuests().length, 1);
    strictEqual(qs.getActiveQuests()[0].id, 'q_001');
    strictEqual(qs.getActiveQuests()[0].status, 'active');
  });

  it('advanceObjective() 推进任务目标（未完成时返回null）', () => {
    qs.acceptQuest({
      id: 'q_001',
      title: '测试任务',
      objectives: [
        { text: '目标1', completed: false },
        { text: '目标2', completed: false }
      ],
      deadline: 10,
      acceptedTurn: 5
    });
    // 推进第一个目标，但还有第二个目标未完成，所以返回null
    const result = qs.advanceObjective('q_001', 0);
    strictEqual(result, null);
    strictEqual(qs.getActiveQuests()[0].objectives[0].completed, true);
    strictEqual(qs.getActiveQuests()[0].objectives[1].completed, false);
  });

  it('所有目标完成后自动完成任务', () => {
    qs.acceptQuest({
      id: 'q_001',
      title: '测试任务',
      objectives: [{ text: '目标1', completed: false }],
      rewards: { EDDIES: 10 },
      deadline: 10,
      acceptedTurn: 5
    });
    const rewards = qs.advanceObjective('q_001', 0);
    deepStrictEqual(rewards, { EDDIES: 10 });
    strictEqual(qs.getActiveQuests().length, 0);
    strictEqual(qs.getCompletedQuests().length, 1);
    strictEqual(qs.getCompletedQuests()[0].status, 'completed');
  });

  it('checkExpired() 将超期任务标记为失败', () => {
    qs.acceptQuest({
      id: 'q_001',
      title: '测试任务',
      objectives: [{ text: '目标1', completed: false }],
      deadline: 5,
      acceptedTurn: 0,
      penalties: { EDDIES: -5 }
    });
    const penalties = qs.checkExpired(10);
    strictEqual(qs.getActiveQuests().length, 0);
    strictEqual(qs.getFailedQuests().length, 1);
    strictEqual(qs.getFailedQuests()[0].status, 'failed');
    deepStrictEqual(penalties, { EDDIES: -5 });
  });

  it('未超期任务不会被标记失败', () => {
    qs.acceptQuest({
      id: 'q_001',
      title: '测试任务',
      objectives: [{ text: '目标1', completed: false }],
      deadline: 10,
      acceptedTurn: 0
    });
    qs.checkExpired(5);
    strictEqual(qs.getActiveQuests().length, 1);
    strictEqual(qs.getFailedQuests().length, 0);
  });

  it('getQuestProgress() 返回正确进度百分比', () => {
    qs.acceptQuest({
      id: 'q_001',
      title: '测试任务',
      objectives: [
        { text: '目标1', completed: true },
        { text: '目标2', completed: false },
        { text: '目标3', completed: false }
      ],
      deadline: 10,
      acceptedTurn: 0
    });
    strictEqual(qs.getQuestProgress('q_001'), 33);
  });

  it('reset() 清空所有任务', () => {
    qs.acceptQuest({ id: 'q_001', title: 'T', objectives: [], deadline: 10, acceptedTurn: 0 });
    qs.reset();
    strictEqual(qs.getActiveQuests().length, 0);
    strictEqual(qs.getCompletedQuests().length, 0);
    strictEqual(qs.getFailedQuests().length, 0);
  });
});
