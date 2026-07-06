import { describe, it, beforeEach } from 'node:test';
import { strictEqual, deepStrictEqual, ok, throws } from 'node:assert';
import { LevelCurve } from '../src/level-curve.js';

describe('LevelCurve 指数等级曲线', () => {
  let curve;

  beforeEach(() => {
    // 基础经验a=100, 倍率r=2 (每级需要前一级的2倍)
    curve = new LevelCurve({ baseExp: 100, multiplier: 2, maxLevel: 10 });
  });

  it('初始状态正确', () => {
    strictEqual(curve.getLevel(), 0);
    strictEqual(curve.getExp(), 0);
    strictEqual(curve.getTotalExpForLevel(0), 0);
  });

  it('计算每级所需经验（指数增长）', () => {
    // 0→1: 100, 1→2: 200, 2→3: 400...
    strictEqual(curve.getExpRequiredForLevel(0), 100);
    strictEqual(curve.getExpRequiredForLevel(1), 200);
    strictEqual(curve.getExpRequiredForLevel(2), 400);
    strictEqual(curve.getExpRequiredForLevel(3), 800);
  });

  it('计算升到某级的累计总经验', () => {
    // 升到1级:100, 升到2级:100+200=300, 升到3级:700
    strictEqual(curve.getTotalExpForLevel(1), 100);
    strictEqual(curve.getTotalExpForLevel(2), 300);
    strictEqual(curve.getTotalExpForLevel(3), 700);
    strictEqual(curve.getTotalExpForLevel(4), 1500);
  });

  it('添加经验后正确升级', () => {
    curve.addExp(50);
    strictEqual(curve.getLevel(), 0); // 不到100不升级
    strictEqual(curve.getExp(), 50);

    curve.addExp(50);
    strictEqual(curve.getLevel(), 1); // 正好100，升到1级
    strictEqual(curve.getExp(), 0);
  });

  it('添加大量经验可连升多级', () => {
    curve.addExp(350); // 100+200+400=700才到3级, 350只够到2级
    strictEqual(curve.getLevel(), 2);
  });

  it('3倍率曲线正确', () => {
    const c3 = new LevelCurve({ baseExp: 100, multiplier: 3, maxLevel: 5 });
    strictEqual(c3.getExpRequiredForLevel(0), 100);
    strictEqual(c3.getExpRequiredForLevel(1), 300);
    strictEqual(c3.getExpRequiredForLevel(2), 900);
    strictEqual(c3.getTotalExpForLevel(3), 100 + 300 + 900); // 1300
  });

  it('获取当前等级进度百分比', () => {
    curve.addExp(50); // 在0级，已50/100
    strictEqual(curve.getProgressPercent(), 50);

    curve.addExp(50); // 升到1级
    strictEqual(curve.getProgressPercent(), 0); // 1级起点
  });

  it('序列化和恢复', () => {
    curve.addExp(150); // 升到1级，溢出50
    const data = curve.serialize();
    const c2 = new LevelCurve({ baseExp: 100, multiplier: 2 });
    c2.restore(data);
    strictEqual(c2.getLevel(), 1);
    strictEqual(c2.getExp(), 50);
  });

  it('不同baseExp和multiplier组合', () => {
    const c = new LevelCurve({ baseExp: 10, multiplier: 2.5, maxLevel: 5 });
    strictEqual(c.getExpRequiredForLevel(0), 10);
    strictEqual(c.getExpRequiredForLevel(1), 25);
    strictEqual(c.getExpRequiredForLevel(2), 62.5);
  });

  it('超过maxLevel不升级', () => {
    const c = new LevelCurve({ baseExp: 1, multiplier: 2, maxLevel: 3 });
    c.addExp(9999);
    strictEqual(c.getLevel(), 3); // 最高3级
  });

  it('getExpToNextLevel 返回正确值', () => {
    strictEqual(curve.getExpToNextLevel(), 100); // 0级到1级需要100
    curve.addExp(30);
    strictEqual(curve.getExpToNextLevel(), 70);
    curve.addExp(70);
    strictEqual(curve.getExpToNextLevel(), 200); // 1级到2级需要200
  });
});
