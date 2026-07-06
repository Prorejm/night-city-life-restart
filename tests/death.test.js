import { describe, it } from 'node:test';
import { strictEqual, ok } from 'node:assert';
import { Life } from '../src/life.js';

// 模拟 fetch 用于数据加载
global.fetch = async (url) => {
  const dataMap = {
    'data/talents.json': {},
    'data/events.json': {
      10001: { id: 10001, event: '出身', type: 'special', NoRandom: true, effect: {} },
      18001: { id: 18001, event: '死亡：帮派处刑', type: 'special', NoRandom: true, effect: { LIFE: -1 } },
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

describe('Death System', () => {
  let life;

  async function createLife() {
    const l = new Life();
    await l.initial();
    l.restart([]);
    l.ageNext(); // AGE 0→1
    return l;
  }

  it('赛博精神病必定触发死亡', async () => {
    life = await createLife();
    life.property.change('HUMANITY', -10);
    const result = life.ageNext();
    strictEqual(result.isDead, true);
    const deathEvent = result.events.find(e => e.isDeath);
    ok(deathEvent);
    strictEqual(deathEvent.deathType, '赛博精神病');
    ok(deathEvent.id >= 18001 && deathEvent.id <= 18040);
  });

  it('战斗导致LIFE<=0时触发战斗死亡链', async () => {
    life = await createLife();
    life.property.change('LIFE', -1);
    const result = life.ageNext();
    strictEqual(result.isDead, true);
    const deathEvent = result.events.find(e => e.isDeath);
    ok(deathEvent);
    // combat 链终点使用 DEATH_EVENTS 中的具体死因（18021-18025 范围）
    ok(deathEvent.deathType, '应有 deathType');
    ok(deathEvent.id >= 18021 && deathEvent.id <= 18025, `死亡事件ID ${deathEvent.id} 不在 combat 范围 18021-18025 内`);
  });

  it('死亡事件不重复触发', async () => {
    life = await createLife();
    life.property.change('LIFE', -1);
    const result = life.ageNext();
    const deathEvents = result.events.filter(e => e.isDeath);
    strictEqual(deathEvents.length, 1);
  });

  it('死亡事件ID在18001-18040范围内', async () => {
    life = await createLife();
    // 强制触发死亡概率检查：设置高年龄+高CHROME+低HUMANITY
    life.property.change('AGE', 50);
    life.property.change('CHROME', 15);
    life.property.change('HUMANITY', -5);

    let foundDeath = false;
    let attempts = 0;
    while (!foundDeath && attempts < 100) {
      life = await createLife();
      life.property.change('AGE', 50);
      life.property.change('CHROME', 15);
      life.property.change('HUMANITY', -5);
      const result = life.ageNext();
      if (result.isDead) {
        foundDeath = true;
        const deathEvent = result.events.find(e => e.isDeath);
        ok(deathEvent);
        ok(deathEvent.id >= 18001 && deathEvent.id <= 18040, `死亡事件ID ${deathEvent.id} 不在18001-18040范围内`);
      }
      attempts++;
    }
    ok(foundDeath, '100次尝试内未触发自然死亡');
  });

  it('高CHROME角色死亡时，死因倾向于赛博/医疗类而非自然死亡', async () => {
    const categoryCounts = { cyber: 0, medical: 0, natural: 0, other: 0 };
    const totalRuns = 50;

    for (let i = 0; i < totalRuns; i++) {
      life = await createLife();
      life.property.change('AGE', 60);
      life.property.change('CHROME', 18);
      life.property.change('HUMANITY', 2);

      let attempts = 0;
      let died = false;
      while (!died && attempts < 50) {
        const result = life.ageNext();
        if (result.isDead) {
          died = true;
          const deathEvent = result.events.find(e => e.isDeath);
          if (deathEvent) {
            const type = deathEvent.deathType;
            if (type.includes('赛博') || type.includes('义体') || type.includes('Max-Tac')) categoryCounts.cyber++;
            else if (type.includes('医疗') || type.includes('手术') || type.includes('药物')) categoryCounts.medical++;
            else if (type.includes('自然') || type.includes('老年')) categoryCounts.natural++;
            else categoryCounts.other++;
          }
        }
        attempts++;
      }
    }

    // 高CHROME角色应极少死于自然原因
    const totalDeaths = categoryCounts.cyber + categoryCounts.medical + categoryCounts.natural + categoryCounts.other;
    ok(totalDeaths > 0, '50次模拟中未触发任何自然死亡');
    const naturalRatio = categoryCounts.natural / totalDeaths;
    ok(naturalRatio < 0.3, `高CHROME角色自然死亡比例 ${naturalRatio.toFixed(2)} 过高，应<0.3`);
  });

  it('高drugUsage角色死亡时，死因倾向于药物类', async () => {
    const categoryCounts = { drug: 0, other: 0 };
    const totalRuns = 50;

    for (let i = 0; i < totalRuns; i++) {
      life = await createLife();
      life.property.change('AGE', 55);
      // 通过多次调用addDrug来模拟高药物使用
      // 注意：drug_001的effect是{HUMANITY: -1}，我们需要保持HUMANITY>0
      // 所以在addDrug后恢复HUMANITY，只保留drugUsageCount的增加
      for (let d = 0; d < 15; d++) {
        life.addDrug('drug_001');
        life.property.change('HUMANITY', 1); // 抵消药品的 Humanity 下降
      }

      let attempts = 0;
      let died = false;
      while (!died && attempts < 80) {
        const result = life.ageNext();
        if (result.isDead) {
          died = true;
          const deathEvent = result.events.find(e => e.isDeath);
          if (deathEvent) {
            const type = deathEvent.deathType;
            if (type.includes('药物') || type.includes('过量') || type.includes('中毒') || type.includes('黑市')) categoryCounts.drug++;
            else categoryCounts.other++;
          }
        }
        attempts++;
      }
    }

    const totalDeaths = categoryCounts.drug + categoryCounts.other;
    ok(totalDeaths > 0, '50次模拟中未触发任何死亡');
    const drugRatio = totalDeaths > 0 ? categoryCounts.drug / totalDeaths : 0;
    ok(drugRatio > 0.03, `高drugUsage角色药物死亡比例 ${drugRatio.toFixed(2)} 过低，应>0.03`);
  });
});
