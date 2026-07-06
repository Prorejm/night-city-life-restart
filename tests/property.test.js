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

  it('change() 数值增加', () => {
    const p = new Property();
    p.change('STYLE', 3);
    strictEqual(p.get('STYLE'), 3);
  });

  it('change() 数值减少但不低于0（除LIFE外）', () => {
    const p = new Property();
    p.change('STYLE', 5);
    p.change('STYLE', -10);
    strictEqual(p.get('STYLE'), 0);
  });

  it('change() HUMANITY 不会低于0', () => {
    const p = new Property();
    p.change('HUMANITY', -15);
    strictEqual(p.get('HUMANITY'), 0);
  });

  it('change() LIFE 可以低于0', () => {
    const p = new Property();
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

  it('effect() 批量应用效果', () => {
    const p = new Property();
    p.effect({ STYLE: 2, TECH: 3, HUMANITY: -2 });
    strictEqual(p.get('STYLE'), 2);
    strictEqual(p.get('TECH'), 3);
    strictEqual(p.get('HUMANITY'), 8);
  });

  it('record() 快照正确', () => {
    const p = new Property();
    p.change('STYLE', 5);
    p.record();
    p.change('STYLE', 3);
    const records = p.getRecords();
    strictEqual(records.length, 1);
    strictEqual(records[0].STYLE, 5);
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
});
