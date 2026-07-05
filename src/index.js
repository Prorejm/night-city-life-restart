// 入口文件 - 夜之城人生重开模拟器

import { App } from './app.js';

window.app = new App();

document.addEventListener('DOMContentLoaded', () => {
  // 加载动画完成后再初始化
  setTimeout(() => {
    window.app.initial();
  }, 2200); // 配合CSS loading动画的2s时长
});
