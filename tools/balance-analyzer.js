#!/usr/bin/env node
/**
 * 夜之城人生重开模拟器 - 数值平衡分析工具
 * 扫描 events.json 中所有事件的 effect，输出统计报告
 * 
 * 用法: node tools/balance-analyzer.js [events.json路径]
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 解析命令行参数
const eventsPath = process.argv[2] || resolve(__dirname, '..', 'data', 'events.json');

// 读取事件数据
let eventsData;
try {
  const raw = readFileSync(eventsPath, 'utf-8');
  eventsData = JSON.parse(raw);
} catch (e) {
  console.error(`错误: 无法读取 ${eventsPath}`);
  console.error(e.message);
  process.exit(1);
}

// 属性列表
const PROPERTIES = ['STYLE', 'TECH', 'CHROME', 'EDDIES', 'HUMANITY', 'LIFE'];

// ID范围对应的年龄段名称
const AGE_RANGES = [
  { label: '出身(10000-10999)', min: 10000, max: 10999 },
  { label: '童年(11000-11999)', min: 11000, max: 11999 },
  { label: '青年出道(12000-13999)', min: 12000, max: 13999 },
  { label: '佣兵传奇(14000-17999)', min: 14000, max: 17999 },
  { label: '死亡事件(18000-18999)', min: 18000, max: 18999 },
  { label: '日常事件(19000-19999)', min: 19000, max: 19999 },
  { label: '剧情事件(20000-20999)', min: 20000, max: 20999 },
];

// 事件类型列表
const EVENT_TYPES = new Set();

// ========== 统计收集 ==========

// 1. 各属性总正向/负向变化量
const propStats = {};
for (const prop of PROPERTIES) {
  propStats[prop] = { positive: 0, negative: 0, total: 0, count: 0 };
}

// 2. 各年龄段平均属性变化
const ageRangeStats = {};
for (const range of AGE_RANGES) {
  ageRangeStats[range.label] = {};
  for (const prop of PROPERTIES) {
    ageRangeStats[range.label][prop] = { positive: 0, negative: 0, total: 0, count: 0 };
  }
}

// 3. 属性变化极端值 top20
const extremes = []; // { id, event, property, value }

// 4. 各类型事件平均收益/风险比
const typeStats = {}; // type -> { totalGain, totalRisk, count, gain: {prop: sum}, risk: {prop: sum} }

// ========== 遍历事件 ==========

for (const [idStr, event] of Object.entries(eventsData)) {
  const id = Number(idStr);
  const effect = event.effect;
  if (!effect || typeof effect !== 'object') continue;

  const eventType = event.type || 'special';
  EVENT_TYPES.add(eventType);

  // 初始化类型统计
  if (!typeStats[eventType]) {
    typeStats[eventType] = { totalGain: 0, totalRisk: 0, count: 0, gains: {}, risks: {} };
  }

  // 确定年龄段
  let ageLabel = '其他';
  for (const range of AGE_RANGES) {
    if (id >= range.min && id <= range.max) {
      ageLabel = range.label;
      break;
    }
  }

  for (const [prop, value] of Object.entries(effect)) {
    if (!PROPERTIES.includes(prop)) continue;
    if (typeof value !== 'number') continue;

    // 全局统计
    propStats[prop].count++;
    propStats[prop].total += value;
    if (value > 0) propStats[prop].positive += value;
    if (value < 0) propStats[prop].negative += value;

    // 年龄段统计
    if (ageRangeStats[ageLabel]) {
      ageRangeStats[ageLabel][prop].count++;
      ageRangeStats[ageLabel][prop].total += value;
      if (value > 0) ageRangeStats[ageLabel][prop].positive += value;
      if (value < 0) ageRangeStats[ageLabel][prop].negative += value;
    }

    // 极端值记录
    extremes.push({ id, event: event.event || '', property: prop, value });

    // 类型收益/风险统计
    if (value > 0) {
      typeStats[eventType].totalGain += value;
      typeStats[eventType].gains[prop] = (typeStats[eventType].gains[prop] || 0) + value;
    } else if (value < 0) {
      typeStats[eventType].totalRisk += Math.abs(value);
      typeStats[eventType].risks[prop] = (typeStats[eventType].risks[prop] || 0) + Math.abs(value);
    }
  }

  typeStats[eventType].count++;
}

// ========== 输出报告 ==========

const divider = '='.repeat(72);
const thinDivider = '-'.repeat(72);

console.log(divider);
console.log('  夜之城人生重开模拟器 - 数值平衡分析报告');
console.log(`  数据源: ${eventsPath}`);
console.log(`  事件总数: ${Object.keys(eventsData).length}`);
console.log(divider);

// 1. 各属性总正向/负向变化量
console.log('\n[1] 各属性总正向/负向变化量');
console.log(thinDivider);
console.log(
  '属性'.padEnd(10) +
  '正向变化'.padStart(10) +
  '负向变化'.padStart(10) +
  '净变化'.padStart(10) +
  '事件数'.padStart(8) +
  '均值'.padStart(8)
);
console.log(thinDivider);
for (const prop of PROPERTIES) {
  const s = propStats[prop];
  const avg = s.count > 0 ? (s.total / s.count).toFixed(2) : '0';
  console.log(
    prop.padEnd(10) +
    String(s.positive).padStart(10) +
    String(s.negative).padStart(10) +
    String(s.total).padStart(10) +
    String(s.count).padStart(8) +
    avg.padStart(8)
  );
}

// 2. 各年龄段平均属性变化
console.log('\n[2] 各年龄段平均属性变化');
console.log(thinDivider);
for (const range of AGE_RANGES) {
  const label = range.label;
  const stats = ageRangeStats[label];
  const totalEvents = PROPERTIES.reduce((sum, p) => sum + stats[p].count, 0);
  if (totalEvents === 0) continue;

  console.log(`\n  ${label} (共 ${totalEvents} 条属性变化)`);
  console.log(
    '    ' +
    '属性'.padEnd(10) +
    '正向'.padStart(8) +
    '负向'.padStart(8) +
    '净变化'.padStart(8) +
    '均值'.padStart(8)
  );
  for (const prop of PROPERTIES) {
    const s = stats[prop];
    if (s.count === 0) continue;
    const avg = (s.total / s.count).toFixed(2);
    console.log(
      '    ' +
      prop.padEnd(10) +
      String(s.positive).padStart(8) +
      String(s.negative).padStart(8) +
      String(s.total).padStart(8) +
      avg.padStart(8)
    );
  }
}

// 3. 属性变化极端值 top20
console.log('\n[3] 属性变化极端值 Top 20 (按绝对值)');
console.log(thinDivider);
const sortedExtremes = extremes
  .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
  .slice(0, 20);
for (let i = 0; i < sortedExtremes.length; i++) {
  const e = sortedExtremes[i];
  const sign = e.value > 0 ? '+' : '';
  const eventText = e.event.length > 30 ? e.event.slice(0, 30) + '...' : e.event;
  console.log(
    `  ${String(i + 1).padStart(2)}. [${e.id}] ${e.property}: ${sign}${e.value}  | ${eventText}`
  );
}

// 4. 各类型事件平均收益/风险比
console.log('\n[4] 各类型事件平均收益/风险比');
console.log(thinDivider);
const allTypes = Object.entries(typeStats).sort((a, b) => b[1].count - a[1].count);
for (const [type, stats] of allTypes) {
  const ratio = stats.totalRisk > 0
    ? (stats.totalGain / stats.totalRisk).toFixed(2)
    : stats.totalGain > 0 ? 'INF' : 'N/A';

  console.log(`  类型: ${type} (共 ${stats.count} 个事件)`);

  // 收益明细
  const gainsEntries = Object.entries(stats.gains).sort((a, b) => b[1] - a[1]);
  if (gainsEntries.length > 0) {
    const gainsStr = gainsEntries.map(([p, v]) => `${p}:+${v}`).join(', ');
    console.log(`    收益: ${gainsStr}`);
  } else {
    console.log('    收益: 无');
  }

  // 风险明细
  const risksEntries = Object.entries(stats.risks).sort((a, b) => b[1] - a[1]);
  if (risksEntries.length > 0) {
    const risksStr = risksEntries.map(([p, v]) => `${p}:-${v}`).join(', ');
    console.log(`    风险: ${risksStr}`);
  } else {
    console.log('    风险: 无');
  }

  console.log(`    总收益: ${stats.totalGain} | 总风险: ${stats.totalRisk} | 收益/风险比: ${ratio}`);
  console.log();
}

console.log(divider);
console.log('  分析完成');
console.log(divider);
