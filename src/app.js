// 应用主控 - 夜之城人生重开模拟器

import { Life } from './life.js';

const GRADE_LABELS = ['普通', '稀有', '史诗', '传说'];
const GRADE_COLORS = ['#808080', '#00bfff', '#aa00ff', '#ffd700'];

export class App {
  #life;
  #selectedTalents;
  #talentPool;
  #points;
  #allocated;

  constructor() {
    this.#life = new Life();
    this.#selectedTalents = [];
    this.#talentPool = [];
    this.#points = 20;
    this.#allocated = { STYLE: 0, TECH: 0, CHROME: 0, EDDIES: 0 };
  }

  async initial() {
    try {
      this.#updateLoadStatus('正在加载天赋配置…');
      const loaded = await this.#life.initial();
      if (!loaded) throw new Error('数据加载失败');
      
      this.#updateLoadStatus('正在校准神经接口…');
      await this.#delay(800);
      
      this.#showPage('menu');
    } catch (e) {
      this.#updateLoadStatus('加载失败: ' + e.message);
      console.error(e);
    }
  }

  startGame() {
    this.#resetGame();
    this.#showPage('talent');
    this.#generateTalentPool();
  }

  rerollTalents() {
    this.#selectedTalents = [];
    this.#generateTalentPool();
  }

  #generateTalentPool() {
    const allTalents = this.#life.talent.getAll();
    // 稀有度权重: 普通88.9%, 稀有10%, 史诗1%, 传说0.1%
    const weighted = [
      { grade: 0, weight: 88.9 },
      { grade: 1, weight: 10 },
      { grade: 2, weight: 1 },
      { grade: 3, weight: 0.1 }
    ];

    // 按权重生成10个天赋
    const pool = [];
    while (pool.length < 10) {
      // 先选等级
      let r = Math.random() * 100;
      let selectedGrade = 0;
      for (const w of weighted) {
        if ((r -= w.weight) < 0) { selectedGrade = w.grade; break; }
      }
      // 从该等级随机选一个
      const gradeTalents = allTalents.filter(t => t.grade === selectedGrade);
      if (gradeTalents.length > 0) {
        const t = gradeTalents[Math.floor(Math.random() * gradeTalents.length)];
        if (!pool.find(p => p.id === t.id)) {
          pool.push(t);
        }
      }
    }
    this.#talentPool = pool;
    this.#renderTalents();
  }

  #renderTalents() {
    const container = document.getElementById('talent-pool');
    container.innerHTML = '';
    let html = '';
    for (const t of this.#talentPool) {
      const isSelected = this.#selectedTalents.includes(t.id);
      html += `<div class="talent-card grade-${t.grade} ${isSelected ? 'selected' : ''}" 
        onclick="window.app.toggleTalent(${t.id})" data-id="${t.id}">
        <div class="talent-name">${t.name}</div>
        <div class="talent-desc">${t.description || ''}</div>
        <div class="talent-grade">${GRADE_LABELS[t.grade] || ''}</div>
      </div>`;
    }
    container.innerHTML = html;
    this.#updateConfirmBtn();
  }

  toggleTalent(id) {
    const idx = this.#selectedTalents.indexOf(id);
    if (idx >= 0) {
      this.#selectedTalents.splice(idx, 1);
    } else if (this.#selectedTalents.length < 3) {
      this.#selectedTalents.push(id);
    }
    this.#renderTalents();
  }

  #updateConfirmBtn() {
    const btn = document.getElementById('confirm-talent-btn');
    btn.textContent = `✓ 确认选择 (${this.#selectedTalents.length}/3)`;
    btn.style.display = this.#selectedTalents.length === 3 ? 'inline-block' : 'none';
  }

  confirmTalents() {
    if (this.#selectedTalents.length !== 3) return;
    this.#showPage('allocate');
    this.#renderAllocation();
  }

  #renderAllocation() {
    const container = document.getElementById('allocate-controls');
    const attrs = [
      { key: 'STYLE', label: 'STYLE', desc: '街头声望' },
      { key: 'TECH', label: 'TECH', desc: '技术/网络' },
      { key: 'CHROME', label: 'CHROME', desc: '义体化' },
      { key: 'EDDIES', label: '€DDS', desc: '欧元' }
    ];

    let html = '';
    for (const attr of attrs) {
      html += `<div class="allocate-row">
        <label title="${attr.desc}">${attr.label}</label>
        <input type="range" min="0" max="10" value="${this.#allocated[attr.key]}" 
          oninput="window.app.updateAlloc('${attr.key}', this.value)">
        <span class="value" id="alloc-${attr.key}">${this.#allocated[attr.key]}</span>
      </div>`;
    }
    container.innerHTML = html;
    this.#updateAllocDisplay();

    // 显示已选天赋
    const disp = document.getElementById('selected-talents-display');
    let talentsHtml = '<div style="font-size:0.75em;color:#888;">已激活天赋:</div><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:5px;">';
    for (const id of this.#selectedTalents) {
      const t = this.#life.talent.get(id);
      if (t) {
        talentsHtml += `<span style="padding:4px 10px;background:rgba(0,255,247,0.1);border:1px solid ${GRADE_COLORS[t.grade] || '#555'};border-radius:2px;font-size:0.7em;color:${GRADE_COLORS[t.grade] || '#ccc'};">${t.name}</span>`;
      }
    }
    talentsHtml += '</div>';
    disp.innerHTML = talentsHtml;
  }

  updateAlloc(key, value) {
    const old = this.#allocated[key];
    const diff = Number(value) - old;
    if (this.#points - diff < 0) return;
    this.#points -= diff;
    this.#allocated[key] = Number(value);
    this.#updateAllocDisplay();
  }

  #updateAllocDisplay() {
    document.getElementById('points-left').textContent = this.#points;
    for (const key of ['STYLE', 'TECH', 'CHROME', 'EDDIES']) {
      const el = document.getElementById(`alloc-${key}`);
      if (el) el.textContent = this.#allocated[key];
    }
  }

  async startLife() {
    this.#life.restart(this.#selectedTalents);
    // 应用分配属性
    for (const [key, val] of Object.entries(this.#allocated)) {
      this.#life.property.change(key, val);
    }
    this.#showPage('life');
    this.#updateHUD();
    document.getElementById('log').innerHTML = '';
  }

  async nextYear() {
    const btn = document.getElementById('next-btn');
    btn.disabled = true;
    btn.textContent = '⏳ 正在接入…';

    const result = this.#life.ageNext();
    this.#updateHUD();
    this.#appendEvents(result);

    if (result.isDead) {
      btn.textContent = '☠ 人生终结';
      btn.disabled = true;
      await this.#delay(1500);
      this.#showSummary();
    } else {
      btn.disabled = false;
      btn.textContent = '▶ 继续 (下一岁)';
    }
  }

  #updateHUD() {
    const p = this.#life.property;
    const age = p.get('AGE');
    document.getElementById('ageDisplay').textContent = age;
    document.getElementById('statStyle').textContent = p.get('STYLE');
    document.getElementById('statTech').textContent = p.get('TECH');
    document.getElementById('statChrome').textContent = p.get('CHROME');
    document.getElementById('statEddies').textContent = p.get('EDDIES');
    document.getElementById('statHumanity').textContent = p.get('HUMANITY');

    document.getElementById('panelStyle').textContent = p.get('STYLE');
    document.getElementById('panelTech').textContent = p.get('TECH');
    document.getElementById('panelChrome').textContent = p.get('CHROME');
    document.getElementById('panelEddies').textContent = p.get('EDDIES');
    const h = p.get('HUMANITY');
    const hEl = document.getElementById('panelHumanity');
    hEl.textContent = h;
    hEl.className = 'stat-value' + (h <= 0 ? ' danger' : h <= 3 ? ' warning' : '');
    document.getElementById('panelLife').textContent = p.get('LIFE');
  }

  #appendEvents(result) {
    const log = document.getElementById('log');
    for (const ev of result.events) {
      const div = document.createElement('div');
      div.className = 'event-entry' + (ev.isDeath ? ' death-event' : '');
      const ageHtml = `<div class="event-age">▼ AGE ${result.age || this.#life.getAge()}</div>`;
      const textHtml = `<div class="event-text">${ev.event || ''}</div>`;
      const postHtml = ev.postEvent ? `<div class="event-post">${ev.postEvent}</div>` : '';
      div.innerHTML = ageHtml + textHtml + postHtml;
      log.appendChild(div);
    }
    log.scrollTop = log.scrollHeight;
  }

  #showSummary() {
    const summary = this.#life.getSummary();
    if (!summary) { this.#showPage('menu'); return; }
    this.#showPage('summary');
    
    const container = document.getElementById('summary-content');
    let html = `<div class="summary-title">☠ 人生终结</div>`;

    // 综合评分
    html += `<div class="summary-card" style="text-align:center;">
      <div class="overall-score">${summary.overall.rating.title}</div>
      <div class="overall-title">综合评分 ${summary.overall.score}</div>
      <div style="font-size:0.8em;color:#888;margin-top:8px;">享年 ${summary.age} 岁</div>
    </div>`;

    // 属性评级
    html += `<div class="summary-card"><h3>● 属性评级</h3><div class="rating-grid">`;
    for (const [key, val] of Object.entries(summary.ratings)) {
      html += `<div class="rating-item">
        <div class="r-label">${key.toUpperCase()}</div>
        <div class="r-value">${val.title}</div>
        <div class="r-desc">${val.desc}</div>
      </div>`;
    }
    html += `</div></div>`;

    // 装备统计
    html += `<div class="summary-card"><h3>● 装备清单</h3>
      <div style="display:flex;gap:15px;font-size:0.8em;flex-wrap:wrap;">
        <span>武器: 普通${summary.weapons.common||0} / 精良${summary.weapons.uncommon||0} / 稀有${summary.weapons.rare||0} / 史诗${summary.weapons.epic||0} / <span style="color:var(--cyber-yellow);">不朽${summary.weapons.legendary||0}</span></span>
      </div>
      <div style="display:flex;gap:15px;font-size:0.8em;margin-top:5px;">
        <span>义体: 普通${summary.cyberware.common||0} / <span style="color:var(--cyber-yellow);">不朽${summary.cyberware.legendary||0}</span></span>
      </div>
      <div style="display:flex;gap:15px;font-size:0.8em;margin-top:5px;">
        <span>载具: <span style="color:var(--cyber-cyan);">${summary.vehicleCount||0}</span> 辆</span>
        <span>药品消耗: <span style="color:var(--cyber-cyan);">${summary.drugCount||0}</span> 次</span>
      </div>`;

    // 不朽清单
    if (summary.legendaryItems.weapons.length > 0 || summary.legendaryItems.cyberware.length > 0) {
      html += `<div style="margin-top:10px;"><div style="font-size:0.75em;color:var(--cyber-yellow);margin-bottom:5px;">✦ 不朽物品</div><div class="item-list">`;
      for (const w of summary.legendaryItems.weapons) {
        html += `<div class="item-entry"><div class="item-name">[武器] ${w.name}</div><div class="item-desc">${w.description||''}</div>${w.lore?`<div class="item-lore">${w.lore}</div>`:''}</div>`;
      }
      for (const c of summary.legendaryItems.cyberware) {
        html += `<div class="item-entry"><div class="item-name">[义体] ${c.name}</div><div class="item-desc">${c.description||''}</div>${c.lore?`<div class="item-lore">${c.lore}</div>`:''}</div>`;
      }
      html += `</div></div>`;
    }
    html += `</div>`;

    // 载具清单
    if (summary.vehicles && summary.vehicles.length > 0) {
      html += `<div class="summary-card"><h3>● 载具收藏</h3><div class="item-list">`;
      for (const v of summary.vehicles) {
        html += `<div class="item-entry"><div class="item-name">${v.name}</div><div class="item-desc">${v.brand||''} · ${v.class||''}</div></div>`;
      }
      html += `</div></div>`;
    }

    // 成就
    if (summary.achievements.length > 0) {
      html += `<div class="summary-card"><h3>● 成就解锁</h3><div class="achv-list">`;
      for (const a of summary.achievements) {
        html += `<div class="achv-entry">
          <span class="achv-icon">${a.icon||'🏆'}</span>
          <span class="achv-name">${a.name}</span>
          <div class="achv-desc">${a.description}</div>
        </div>`;
      }
      html += `</div></div>`;
    }

    // 来生酒配方
    if (summary.afterlifeRecipes.length > 0) {
      html += `<div class="summary-card"><h3>● 来生酒单</h3><div class="recipe-list">`;
      for (const r of summary.afterlifeRecipes) {
        html += `<div class="recipe-entry" style="border-left:3px solid ${r.color||'#555'};">
          <div class="recipe-name" style="color:${r.color||'#ccc'};">${r.name}</div>
          <div class="recipe-ingredients">材料: ${(r.ingredients||[]).join(' + ')}</div>
          <div class="recipe-glass">酒杯: ${r.glass||'标准杯'}</div>
          <div class="recipe-desc">${r.description}</div>
        </div>`;
      }
      html += `</div></div>`;
    }

    container.innerHTML = html;
  }

  #resetGame() {
    this.#selectedTalents = [];
    this.#talentPool = [];
    this.#points = 20;
    this.#allocated = { STYLE: 0, TECH: 0, CHROME: 0, EDDIES: 0 };
  }

  #showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  #updateLoadStatus(msg) {
    const el = document.getElementById('load-status');
    if (el) el.textContent = msg;
  }

  #delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}
