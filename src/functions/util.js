// 工具函数

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function max(a, b) {
  return a > b ? a : b;
}

export function min(a, b) {
  return a < b ? a : b;
}

export function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

export function average(arr) {
  return arr.length ? sum(arr) / arr.length : 0;
}

// 随机整数 [min, max]
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 按权重随机选择一个元素
// items: [[value, weight], ...]
export function weightedRandom(items) {
  const totalWeight = items.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * totalWeight;
  for (const [value, weight] of items) {
    if ((r -= weight) < 0) return value;
  }
  return items[items.length - 1][0];
}

// 从数组中随机选取 count 个不重复元素
export function randomSelect(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// 将数值限制在范围内
export function clamp(value, minVal, maxVal) {
  return Math.max(minVal, Math.min(maxVal, value));
}
