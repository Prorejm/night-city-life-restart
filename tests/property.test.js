import { describe, it } from 'node:test';
import { strictEqual, deepStrictEqual, ok } from 'node:assert';
import { Property } from '../src/property.js';

describe('Property', () => {
  it('初始值正确', () => {
    const p = new Property();
    strictEqual(p.get('STYLE'), 0);
    strictEqual(p.get('TECH'), 0);
    strictEqual(p.get('CHROME'), 0);
    strictEqual(p.get('EDDIES'), 0);
    strictEqual(p.get('HUMANITY'), 10);
    strictEqual(p.get('LIFE'), 1);
    strictEqual(p.get('AGE'), 0);
    strictEqual(p.get('TURN'), 0);
    strictEqual(p.get('MONTH'), 1);
    strictEqual(p.get('PHASE'), 0);
    deepStrictEqual(p.get('TLT'), []);
    deepStrictEqual(p.get('EVT'), []);
  });

  it('change() 正值添加经验并提升等级（指数曲线）', () => {
    const p = new Property();
    // baseExp=1, multiplier=2
    // addExp(1): 0→1级
    p.change('STYLE', 1);
    strictEqual(p.get('STYLE'), 1);

    // addExp(2): 1级已有，加2经验 → 1→2需要2，正好升到2级
    p.change('STYLE', 2);
    strictEqual(p.get('STYLE'), 2);

    // addExp(7): 2→3需要4, 3→4需要8(不够) → 等级3
    p.change('STYLE', 7);
    strictEqual(p.get('STYLE'), 3);
  });

  it('change() 负值直接扣减等级', () => {
    const p = new Property();
    p.change('STYLE', 7); // 升到3级
    strictEqual(p.get('STYLE'), 3);
    p.change('STYLE', -2);
    strictEqual(p.get('STYLE'), 1);
    p.change('STYLE', -10); // 不会低于0
    strictEqual(p.get('STYLE'), 0);
  });

  it('change() HUMANITY 不会低于0', () => {
    const p = new Property();
    strictEqual(p.get('HUMANITY'), 10);
    p.change('HUMANITY', -15);
    strictEqual(p.get('HUMANITY'), 0);
  });

  it('change() LIFE 可以低于0', () => {
    const p = new Property();
    strictEqual(p.get('LIFE'), 1);
    p.change('LIFE', -3);
    strictEqual(p.get('LIFE'), -2);
  });

  it('isCyberpsycho() 在 HUMANITY<=0 时返回 true', () => {
    const p = new Property();
    strictEqual(p.isCyberpsycho(), false);
    p.change('HUMANITY', -10);
    strictEqual(p.isCyberpsycho(), true);
  });

  it('isDead() 在 LIFE<=0 时返回 true', () => {
    const p = new Property();
    strictEqual(p.isDead(), false);
    p.change('LIFE', -1);
    strictEqual(p.isDead(), true);
  });

  it('effect() 批量应用效果（经验值）', () => {
    const p = new Property();
    // STYLE+2: 0→1(剩1), 1→2需要2(不够) → 等级1
    // TECH+3: 0→1(剩2), 1→2需要2(剩0) → 等级2
    // HUMANITY-2: 10-2=8
    p.effect({ STYLE: 2, TECH: 3, HUMANITY: -2 });
    strictEqual(p.get('STYLE'), 1);
    strictEqual(p.get('TECH'), 2);
    strictEqual(p.get('HUMANITY'), 8);
  });

  it('record() 快照记录等级值', () => {
    const p = new Property();
    p.change('STYLE', 3); // 0→1(剩2), 1→2需要2(剩0) → 等级2
    p.record();
    p.change('STYLE', 4); // 2→3需要4(剩0) → 等级3
    const records = p.getRecords();
    strictEqual(records.length, 1);
    strictEqual(records[0].STYLE, 2);
  });

  it('reset() 恢复初始状态', () => {
    const p = new Property();
    p.change('STYLE', 5);
    p.change('HUMANITY', -3);
    p.record();
    p.reset();
    strictEqual(p.get('STYLE'), 0);
    strictEqual(p.get('HUMANITY'), 10);
    strictEqual(p.getRecords().length, 0);
  });

  it('change() 数组属性去重追加', () => {
    const p = new Property();
    p.change('TLT', [1001, 1002]);
    p.change('TLT', [1002, 1003]);
    deepStrictEqual(p.get('TLT'), [1001, 1002, 1003]);
  });

  it('set() 直接赋值MONTH', () => {
    const p = new Property();
    strictEqual(p.get('MONTH'), 1);
    p.set('MONTH', 6);
    strictEqual(p.get('MONTH'), 6);
  });

  it('set() 直接赋值PHASE', () => {
    const p = new Property();
    strictEqual(p.get('PHASE'), 0);
    p.set('PHASE', 2);
    strictEqual(p.get('PHASE'), 2);
  });

  it('set() 直接赋值AGE', () => {
    const p = new Property();
    p.set('AGE', 5);
    strictEqual(p.get('AGE'), 5);
  });

  it('change() TURN增加正确', () => {
    const p = new Property();
    p.change('TURN', 1);
    strictEqual(p.get('TURN'), 1);
    p.change('TURN', 5);
    strictEqual(p.get('TURN'), 6);
  });

  it('change() TURN允许负值', () => {
    const p = new Property();
    p.change('TURN', 3);
    p.change('TURN', -1);
    strictEqual(p.get('TURN'), 2);
  });

  it('record() 包含TURN/MONTH/PHASE', () => {
    const p = new Property();
    p.set('MONTH', 6);
    p.set('PHASE', 1);
    p.change('TURN', 5);
    p.record();
    const records = p.getRecords();
    strictEqual(records.length, 1);
    strictEqual(records[0].TURN, 5);
    strictEqual(records[0].MONTH, 6);
    strictEqual(records[0].PHASE, 1);
  });

  it('getAll() 包含TURN/MONTH/PHASE', () => {
    const p = new Property();
    const all = p.getAll();
    ok('TURN' in all);
    ok('MONTH' in all);
    ok('PHASE' in all);
    strictEqual(all.TURN, 0);
    strictEqual(all.MONTH, 1);
    strictEqual(all.PHASE, 0);
  });

  it('reset() 恢复TURN/MONTH/PHASE初始值', () => {
    const p = new Property();
    p.change('TURN', 10);
    p.set('MONTH', 6);
    p.set('PHASE', 2);
    p.reset();
    strictEqual(p.get('TURN'), 0);
    strictEqual(p.get('MONTH'), 1);
    strictEqual(p.get('PHASE'), 0);
  });

  it('getLevelInfo() 返回经验进度信息', () => {
    const p = new Property();
    p.change('STYLE', 1); // 1级, 0经验
    const info = p.getLevelInfo('STYLE');
    strictEqual(info.level, 1);
    strictEqual(info.exp, 0);
    strictEqual(info.nextRequired, 2); // 1→2需要2
    strictEqual(info.progress, 0);

    p.change('STYLE', 1); // 1级, 1经验
    const info2 = p.getLevelInfo('STYLE');
    strictEqual(info2.level, 1);
    strictEqual(info2.exp, 1);
    strictEqual(info2.progress, 50); // 1/2 = 50%
  });
});
