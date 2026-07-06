import { describe, it } from 'node:test';
import { strictEqual, deepStrictEqual, ok } from 'node:assert';
import { Inventory } from '../src/inventory.js';

describe('Inventory', () => {
  const sampleItems = {
    wpn_001: { id: 'wpn_001', name: 'M-179E', type: 'weapon', quality: 'rare', effect: { STYLE: 1 } },
    wpn_002: { id: 'wpn_002', name: '宪法捍卫者', type: 'weapon', quality: 'epic', effect: { STYLE: 2 } },
    wpn_010: { id: 'wpn_010', name: '普鲁托之握', type: 'weapon', quality: 'legendary', effect: { STYLE: 3 } },
    cyber_001: { id: 'cyber_001', name: '歧路司光学', type: 'cyberware', quality: 'rare', effect: { TECH: 1 } },
    cyber_020: { id: 'cyber_020', name: '荷鲁斯之眼', type: 'cyberware', quality: 'legendary', effect: { TECH: 3 } },
    drug_001: { id: 'drug_001', name: '黑梦', type: 'drug', effect: { HUMANITY: -1 } },
    drug_002: { id: 'drug_002', name: '蓝月', type: 'drug', effect: { HUMANITY: -2 } }
  };

  it('addItem() 正确分类武器', () => {
    const inv = new Inventory(sampleItems);
    const r1 = inv.addItem('wpn_001');
    strictEqual(r1.added, true);
    strictEqual(r1.equipped, true);
    const r2 = inv.addItem('wpn_001');
    strictEqual(r2.added, false);
    const stats = inv.getAllStats();
    strictEqual(stats.weaponCount, 1);
    strictEqual(stats.weaponsByQuality.rare, 1);
  });

  it('addItem() 正确分类义体', () => {
    const inv = new Inventory(sampleItems);
    const r = inv.addItem('cyber_001');
    strictEqual(r.added, true);
    strictEqual(r.equipped, true);
    const stats = inv.getAllStats();
    strictEqual(stats.cyberCount, 1);
  });

  it('addItem() 正确分类药品', () => {
    const inv = new Inventory(sampleItems);
    const r = inv.addItem('drug_001');
    strictEqual(r.added, true);
    strictEqual(r.equipped, false);
    const stats = inv.getAllStats();
    strictEqual(stats.totalDrugs, 1);
  });

  it('reset() 清空所有列表', () => {
    const inv = new Inventory(sampleItems);
    inv.addItem('wpn_001');
    inv.addItem('cyber_001');
    inv.addItem('drug_001');
    inv.reset();
    const stats = inv.getAllStats();
    strictEqual(stats.weaponCount, 0);
    strictEqual(stats.cyberCount, 0);
    strictEqual(stats.totalDrugs, 0);
  });

  it('getAllStats() 统计不朽物品', () => {
    const inv = new Inventory(sampleItems);
    inv.addItem('wpn_010');
    inv.addItem('cyber_020');
    const stats = inv.getAllStats();
    strictEqual(stats.legendaryItems.weapons.length, 1);
    strictEqual(stats.legendaryItems.cyberware.length, 1);
  });

  it('removeItem() 移除物品', () => {
    const inv = new Inventory(sampleItems);
    inv.addItem('wpn_001');
    strictEqual(inv.removeItem('wpn_001'), true);
    strictEqual(inv.removeItem('wpn_001'), false);
    const stats = inv.getAllStats();
    strictEqual(stats.weaponCount, 0);
  });

  it('getRecentItems() 返回最近获得的物品', () => {
    const inv = new Inventory(sampleItems);
    inv.addItem('wpn_001');
    inv.addItem('cyber_001');
    inv.addItem('drug_001');
    const recent = inv.getRecentItems(2);
    strictEqual(recent.length, 2);
    strictEqual(recent[0].id, 'drug_001');
    strictEqual(recent[1].id, 'cyber_001');
  });
});
