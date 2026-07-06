// 入口文件 - 夜之城人生重开模拟器

import { App } from './app.js';

window.app = new App();

// 数据雨背景动画
function initDataRain() {
  const canvas = document.getElementById('data-rain');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
  const fontSize = 14;
  const columns = Math.floor(canvas.width / fontSize);
  const drops = new Array(columns).fill(0);

  function draw() {
    ctx.fillStyle = 'rgba(10,10,15,0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00fff7';
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;
      ctx.globalAlpha = Math.random() * 0.3 + 0.05;
      ctx.fillText(char, x, y);

      if (y > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
    ctx.globalAlpha = 1;
  }

  setInterval(draw, 50);

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDataRain();
  // 加载动画完成后再初始化
  setTimeout(() => {
    window.app.initial();
  }, 2200); // 配合CSS loading动画的2s时长
});
