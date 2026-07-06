// 事件数据完整性验证脚本
// 用法: node tools/validate-data.js

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

const VALID_TYPES = ['daily', 'social', 'combat', 'medical', 'economy', 'special', 'story', 'infancy', 'gear', 'none', ''];
const VALID_EFFECT_PROPS = ['STYLE', 'TECH', 'CHROME', 'EDDIES', 'HUMANITY', 'LIFE', 'AGE', 'TLT', 'EVT', 'GANG', 'CORP', 'DIST'];
const VALID_ITEM_PREFIXES = ['wpn_', 'cyber_', 'drug_', 'imp_'];
const DEATH_EVENT_RANGE = { min: 18000, max: 18999 };

let errorCount = 0;
let warnCount = 0;

function loadJSON(filename) {
  try {
    return JSON.parse(readFileSync(join(DATA_DIR, filename), 'utf-8'));
  } catch (e) {
    console.error(`[错误] 无法读取 ${filename}: ${e.message}`);
    process.exit(1);
  }
}

function error(msg) {
  console.error(`[错误] ${msg}`);
  errorCount++;
}

function warn(msg) {
  console.warn(`[警告] ${msg}`);
  warnCount++;
}

function info(msg) {
  console.log(`[信息] ${msg}`);
}

function validateEventEffects(eid, effect) {
  if (!effect || typeof effect !== 'object') return;
  for (const [key, value] of Object.entries(effect)) {
    // 数组类型的属性（EVT, TLT）跳过值检查
    if (Array.isArray(value)) continue;
    if (typeof value !== 'number') {
      error(`事件 ${eid}: effect.${key}="${value}" 不是数字类型`);
      continue;
    }
    if (!VALID_EFFECT_PROPS.includes(key)) {
      warn(`事件 ${eid}: effect 属性 "${key}" 不在已知属性列表中`);
    }
  }
}

function validateEvents() {
  const events = loadJSON('events.json');
  const items = loadJSON('items.json');
  const vehicles = loadJSON('vehicles.json');
  const eventIds = new Set(Object.keys(events).map(Number));

  info(`总事件数: ${eventIds.size}`);

  // 检查重复ID
  const rawKeys = Object.keys(events);
  const seenKeys = new Set();
  for (const key of rawKeys) {
    if (seenKeys.has(key)) {
      error(`重复的事件ID键: ${key}`);
    }
    seenKeys.add(key);
  }

  let emptyCount = 0;
  let typeInvalidCount = 0;
  let awardInvalidCount = 0;
  let branchInvalidCount = 0;
  let effectExtremeCount = 0;

  for (const [idStr, event] of Object.entries(events)) {
    const eid = Number(idStr);

    // 空文本检查
    if (!event.event || typeof event.event !== 'string' || event.event.trim() === '') {
      error(`事件 ${eid}: 事件文本为空`);
      emptyCount++;
    }

    // type 检查
    if (event.type && !VALID_TYPES.includes(event.type)) {
      error(`事件 ${eid}: type="${event.type}" 不在允许集合中 [${VALID_TYPES.join(', ')}]`);
      typeInvalidCount++;
    }

    // effect 检查
    if (event.effect) {
      validateEventEffects(eid, event.effect);
      // 极端值检查
      if (event.effect.HUMANITY !== undefined && event.effect.HUMANITY < -3) {
        warn(`事件 ${eid}: HUMANITY 变化 ${event.effect.HUMANITY} 超过 -3 阈值`);
        effectExtremeCount++;
      }
      if (event.effect.EDDIES !== undefined && Math.abs(event.effect.EDDIES) > 6) {
        warn(`事件 ${eid}: EDDIES 变化 ${event.effect.EDDIES} 超过 ±6 阈值`);
        effectExtremeCount++;
      }
      if (event.effect.CHROME !== undefined && event.effect.CHROME > 2) {
        warn(`事件 ${eid}: CHROME 变化 ${event.effect.CHROME} 超过 +2 阈值`);
        effectExtremeCount++;
      }
      if (event.effect.LIFE !== undefined && event.effect.LIFE !== 0) {
        warn(`事件 ${eid}: LIFE 直接变化 ${event.effect.LIFE}，通常应由战斗系统控制`);
      }
    }

    // itemAward 检查
    if (event.itemAward) {
      if (!VALID_ITEM_PREFIXES.some(p => event.itemAward.startsWith(p))) {
        warn(`事件 ${eid}: itemAward="${event.itemAward}" 格式不以 wpn_/cyber_/drug_ 开头`);
        awardInvalidCount++;
      } else if (!items[event.itemAward]) {
        error(`事件 ${eid}: itemAward="${event.itemAward}" 在 items.json 中不存在`);
        awardInvalidCount++;
      }
    }

    // vehicleAward 检查
    if (event.vehicleAward && !vehicles[event.vehicleAward]) {
      error(`事件 ${eid}: vehicleAward="${event.vehicleAward}" 在 vehicles.json 中不存在`);
      awardInvalidCount++;
    }

    // drugAward 检查
    if (event.drugAward && !items[event.drugAward]) {
      error(`事件 ${eid}: drugAward="${event.drugAward}" 在 items.json 中不存在`);
      awardInvalidCount++;
    }

    // branch 目标检查
    if (event.branch && Array.isArray(event.branch)) {
      for (const b of event.branch) {
        if (typeof b === 'string') {
          const colonIdx = b.indexOf(':');
          if (colonIdx > 0) {
            const target = Number(b.slice(colonIdx + 1));
            if (!eventIds.has(target)) {
              error(`事件 ${eid}: branch 目标 ${target} 不存在`);
              branchInvalidCount++;
            }
          }
        }
      }
    }

    // 死亡事件应有 NoRandom
    if (eid >= DEATH_EVENT_RANGE.min && eid <= DEATH_EVENT_RANGE.max && !event.NoRandom) {
      warn(`事件 ${eid}: 死亡事件范围(18000-18999)但未设置 NoRandom: true`);
    }
  }

  info(`--- 验证统计 ---`);
  info(`空文本: ${emptyCount}`);
  info(`无效type: ${typeInvalidCount}`);
  info(`无效奖励引用: ${awardInvalidCount}`);
  info(`无效分支目标: ${branchInvalidCount}`);
  info(`极端effect值: ${effectExtremeCount}`);
}

// 按年龄段统计
function analyzeAgeDistribution() {
  const events = loadJSON('events.json');
  const ranges = [
    { name: '出身(10000-10999)', min: 10000, max: 10999 },
    { name: '童年(11000-11999)', min: 11000, max: 11999 },
    { name: '青年(12000-13999)', min: 12000, max: 13999 },
    { name: '佣兵(14000-17999)', min: 14000, max: 17999 },
    { name: '死亡(18000-18999)', min: 18000, max: 18999 },
    { name: '日常(19000-19999)', min: 19000, max: 19999 },
    { name: '剧情(20000-20999)', min: 20000, max: 20999 },
    { name: '其他(21000+)', min: 21000, max: 99999 }
  ];

  info('--- 年龄段分布 ---');
  for (const range of ranges) {
    const count = Object.keys(events).filter(id => {
      const n = Number(id);
      return n >= range.min && n <= range.max;
    }).length;
    if (count > 0) {
      info(`  ${range.name}: ${count}`);
    }
  }
}

// 按类型统计
function analyzeTypeDistribution() {
  const events = loadJSON('events.json');
  const typeCounts = {};
  for (const event of Object.values(events)) {
    const t = event.type || 'none';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  info('--- 类型分布 ---');
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    info(`  ${type}: ${count}`);
  }
}

// 执行验证
console.log('===== 夜之城人生重开模拟器 - 数据验证工具 =====\n');
validateEvents();
console.log();
analyzeAgeDistribution();
console.log();
analyzeTypeDistribution();
console.log();

if (errorCount > 0) {
  console.error(`验证完成: ${errorCount} 个错误, ${warnCount} 个警告`);
  process.exit(1);
} else {
  console.log(`验证完成: ${warnCount} 个警告, 0 个错误`);
  process.exit(0);
}
