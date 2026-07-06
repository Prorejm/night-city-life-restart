// 事件合并工具 - 将生成的事件合并到现有events.json
// 用法: node tools/merge-events.js

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

const EVENTS_FILE = join(DATA_DIR, 'events.json');
const GENERATED_FILE = join(DATA_DIR, 'events-extended.json');
const BACKUP_FILE = join(DATA_DIR, 'events.json.bak');

// 读取文件
console.log('读取现有事件文件...');
const existing = JSON.parse(readFileSync(EVENTS_FILE, 'utf-8'));
console.log(`  现有事件数: ${Object.keys(existing).length}`);

console.log('读取生成的事件文件...');
const generated = JSON.parse(readFileSync(GENERATED_FILE, 'utf-8'));
console.log(`  生成事件数: ${Object.keys(generated).length}`);

// 备份原文件
console.log(`备份原文件到: ${BACKUP_FILE}`);
copyFileSync(EVENTS_FILE, BACKUP_FILE);

// 检查ID冲突
const existingIds = new Set(Object.keys(existing));
const generatedKeys = Object.keys(generated);
const conflicts = generatedKeys.filter(k => existingIds.has(k));

if (conflicts.length > 0) {
  console.error(`发现 ${conflicts.length} 个ID冲突:`);
  conflicts.slice(0, 10).forEach(k => console.error(`  - ID ${k}`));
  if (conflicts.length > 10) console.error(`  ... 还有 ${conflicts.length - 10} 个`);
  process.exit(1);
}

// 合并
const merged = { ...existing };
for (const [key, event] of Object.entries(generated)) {
  merged[key] = event;
}

// 按ID排序
const sortedKeys = Object.keys(merged).map(Number).sort((a, b) => a - b);
const sortedMerged = {};
for (const key of sortedKeys) {
  sortedMerged[String(key)] = merged[String(key)];
}

// 写入
console.log(`合并后总事件数: ${Object.keys(sortedMerged).length}`);
writeFileSync(EVENTS_FILE, JSON.stringify(sortedMerged, null, 2), 'utf-8');
console.log(`已写入: ${EVENTS_FILE}`);
console.log('完成!');
