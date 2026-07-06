// 应用主控 - 夜之城人生重开模拟器

import { Life } from './life.js';

const GRADE_LABELS = ['普通', '稀有', '史诗', '传说'];
const GRADE_COLORS = ['#808080', '#00bfff', '#aa00ff', '#ffd700'];

// HTML转义工具（防XSS）
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class App {
  #life;
  #selectedTalents;
  #talentPool;
  #points;
  #allocated;
  #autoMode;
  #autoSpeed;
  #autoTimer;
  #runCount;
  #previousAchievementIds;

  constructor() {
    this.#life = new Life();
    this.#selectedTalents = [];
    this.#talentPool = [];
    this.#points = 20;
    this.#allocated = { STYLE: 0, TECH: 0, CHROME: 0, EDDIES: 0 };
    this.#autoMode = false;
    this.#autoSpeed = 200;
    this.#autoTimer = null;
    this.#runCount = 0;
    this.#previousAchievementIds = new Set();
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
      const desc = escapeHtml(t.description || '');
      const name = escapeHtml(t.name);
      html += `<div class="talent-card grade-${t.grade} ${isSelected ? 'selected' : ''}" 
        onclick="window.app.toggleTalent(${t.id})" data-id="${t.id}">
        <div class="talent-name">${name}</div>
        <div class="talent-desc">${desc}</div>
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
    this.#previousAchievementIds = new Set();
    // 应用分配属性
    for (const [key, val] of Object.entries(this.#allocated)) {
      this.#life.property.change(key, val);
    }
    this.#showPage('life');
    this.#updateHUD();
    document.getElementById('log').innerHTML = '';

    // 自动展示出生事件（AGE 0 → 1）
    await this.#delay(300);
    const birthResult = this.#life.ageNext();
    this.#updateHUD();
    this.#appendEvents(birthResult);
  }

  async nextTurn() {
    const btn = document.getElementById('next-btn');
    if (!this.#autoMode) {
      btn.disabled = true;
      btn.textContent = '⏳ 正在接入…';
    }

    const result = this.#life.ageNext();
    this.#updateHUD();
    this.#appendEvents(result);

    // 显示任务状态更新通知
    if (result.questUpdates) {
      this.#showQuestUpdates(result.questUpdates);
    }

    // 检查新解锁的成就
    const currentAchievements = this.#life.getCurrentAchievements();
    for (const ach of currentAchievements) {
      if (!this.#previousAchievementIds.has(ach.id)) {
        this.#previousAchievementIds.add(ach.id);
        this.#showAchievementUnlock(ach);
      }
    }

    if (result.isDead) {
      if (this.#autoMode) {
        // 自动模式：显示总结后停止自动，不再自动重启
        await this.#delay(800);
        this.#showSummary();
        this.stopAuto();
      } else {
        btn.textContent = '☠ 人生终结';
        btn.disabled = true;
        await this.#delay(1500);
        this.#showSummary();
      }
    } else {
      if (!this.#autoMode) {
        btn.disabled = false;
        btn.textContent = '▶ 继续 (下一旬)';
      }
    }
  }

  // 兼容别名
  async nextYear() {
    return this.nextTurn();
  }

  // 自动模式：连续推进年龄
  startAuto() {
    this.#autoMode = true;
    this.#autoSpeed = 200;
    document.getElementById('auto-btn').textContent = '⏹ 停止';
    document.getElementById('auto-btn').classList.add('active');
    document.getElementById('next-btn').disabled = true;
    this.#autoLoop();
  }

  #autoLoop() {
    if (!this.#autoMode) return;
    this.nextTurn().then(() => {
      if (!this.#autoMode) return;
      if (!this.#life || this.#life.property.get('LIFE') <= 0) return;
      this.#autoTimer = setTimeout(() => this.#autoLoop(), this.#autoSpeed);
    });
  }

  stopAuto() {
    this.#autoMode = false;
    if (this.#autoTimer) {
      clearTimeout(this.#autoTimer);
      this.#autoTimer = null;
    }
    document.getElementById('auto-btn').textContent = '⟳ 自动模拟';
    document.getElementById('auto-btn').classList.remove('active');
    const btn = document.getElementById('next-btn');
    btn.disabled = false;
    btn.textContent = '▶ 继续 (下一旬)';
  }

  toggleAuto() {
    if (this.#autoMode) {
      this.stopAuto();
    } else {
      this.startAuto();
    }
  }

  // 自动重新开始（保留计数）
  async #autoRestart() {
    if (!this.#autoMode) return;
    this.#runCount++;
    document.getElementById('run-count').textContent = `第 ${this.#runCount} 次人生`;

    this.#resetGame();
    // 自动随机选3个天赋
    const allTalents = this.#life.talent.getAll();
    const shuffled = [...allTalents].sort(() => Math.random() - 0.5);
    this.#selectedTalents = shuffled.slice(0, 3).map(t => t.id);

    this.#life.restart(this.#selectedTalents);
    // 随机分配属性
    for (const key of ['STYLE', 'TECH', 'CHROME', 'EDDIES']) {
      this.#life.property.change(key, Math.floor(Math.random() * 6));
    }

    this.#showPage('life');
    document.getElementById('log').innerHTML = '';

    // 展示出生事件
    const birthResult = this.#life.ageNext();
    this.#updateHUD();
    this.#appendEvents(birthResult);

    this.#autoTimer = setTimeout(() => this.#autoLoop(), 800);
  }

  #updateHUD() {
    const p = this.#life.property;
    const age = p.get('AGE');
    const month = p.get('MONTH');
    const phase = p.get('PHASE');
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) {
      const phaseNames = ['上旬', '中旬', '下旬'];
      timeDisplay.textContent = `${age}岁 ${month}月 ${phaseNames[phase] || ''}`;
    }

    // 顶部HUD数值 + 变化闪烁动画
    const headerStats = [
      { id: 'statStyle', val: p.get('STYLE') },
      { id: 'statTech', val: p.get('TECH') },
      { id: 'statChrome', val: p.get('CHROME') },
      { id: 'statEddies', val: p.get('EDDIES') },
      { id: 'statHumanity', val: p.get('HUMANITY') }
    ];
    for (const s of headerStats) {
      const el = document.getElementById(s.id);
      if (el && el.textContent !== String(s.val)) {
        el.textContent = s.val;
        el.classList.remove('changed');
        void el.offsetWidth; // 强制重绘
        el.classList.add('changed');
        setTimeout(() => el.classList.remove('changed'), 600);
      }
    }

    // 侧面板数值 + 变化闪烁动画
    const panelStats = [
      { id: 'panelStyle', val: p.get('STYLE') },
      { id: 'panelTech', val: p.get('TECH') },
      { id: 'panelChrome', val: p.get('CHROME') },
      { id: 'panelEddies', val: p.get('EDDIES') }
    ];
    for (const s of panelStats) {
      const el = document.getElementById(s.id);
      if (el && el.textContent !== String(s.val)) {
        el.textContent = s.val;
        el.classList.remove('changed');
        void el.offsetWidth; // 强制重绘
        el.classList.add('changed');
        setTimeout(() => el.classList.remove('changed'), 600);
      }
    }

    const h = p.get('HUMANITY');
    const hEl = document.getElementById('panelHumanity');
    if (hEl) {
      if (hEl.textContent !== String(h)) {
        hEl.textContent = h;
        hEl.classList.remove('changed');
        void hEl.offsetWidth;
        hEl.classList.add('changed');
        setTimeout(() => hEl.classList.remove('changed'), 600);
      }
      hEl.className = 'stat-value' + (h <= 0 ? ' danger' : h <= 3 ? ' warning' : '');
    }
    const lifeEl = document.getElementById('panelLife');
    if (lifeEl) {
      const life = p.get('LIFE');
      if (lifeEl.textContent !== String(life)) {
        lifeEl.textContent = life;
        lifeEl.classList.remove('changed');
        void lifeEl.offsetWidth;
        lifeEl.classList.add('changed');
        setTimeout(() => lifeEl.classList.remove('changed'), 600);
      }
    }

    // 更新物品栏UI
    this.updateInventoryUI();
    // 更新任务日志UI
    this.updateQuestLogUI();
  }

  #appendEvents(result) {
    const log = document.getElementById('log');
    const entries = result.events;
    entries.forEach((ev, index) => {
      // 年度跨越分隔线
      if (ev.isYearDivider) {
        const divider = document.createElement('div');
        divider.className = 'year-divider';
        divider.textContent = ev.event;
        log.appendChild(divider);
        return;
      }

      let cls = 'event-entry';
      if (ev.isDeath || ev.isInstantDeath) cls += ' death-event';
      if (ev.isBirth) cls += ' birth-event';
      if (ev.isTarot) cls += ' tarot-event';
      if (ev.isTraumaTeam) cls += ' trauma-event';
      const div = document.createElement('div');
      div.className = cls;

      // 阶梯延迟动画
      if (index > 0) {
        div.style.animationDelay = `${index * 0.15}s`;
      }

      const ageDiv = document.createElement('div');
      ageDiv.className = 'event-age';
      if (result.turn !== undefined) {
        const phaseNames = ['上旬', '中旬', '下旬'];
        ageDiv.textContent = `▼ ${result.age}岁 ${result.month}月 ${phaseNames[result.phase] || ''}`;
      } else {
        ageDiv.textContent = `▼ AGE ${result.age || this.#life.getAge()}`;
      }
      div.appendChild(ageDiv);

      const textDiv = document.createElement('div');
      textDiv.className = 'event-text';
      // 塔罗牌事件前缀
      if (ev.isTarot && ev.tarotName) {
        textDiv.textContent = `🔮 [${ev.tarotName}] ${ev.event || ''}`;
      } else if (ev.isTraumaTeam) {
        textDiv.textContent = `🏥 [创伤小组] ${ev.event || ''}`;
      } else if (ev.isInstantDeath) {
        textDiv.textContent = `💀 [致命] ${ev.event || ''}`;
      } else {
        textDiv.textContent = ev.event || '';
      }

      // 奖励标签
      if (ev.rewards) {
        const tags = [];
        if (ev.rewards.item) tags.push('🎁 获得物品');
        if (ev.rewards.vehicle) tags.push('🚗 获得载具');
        if (ev.rewards.drug) tags.push('💊 获得药品');
        if (tags.length > 0) {
          const tagSpan = document.createElement('span');
          tagSpan.className = 'reward-tag';
          tagSpan.textContent = ' ' + tags.join(' ');
          textDiv.appendChild(tagSpan);
        }
      }

      // 任务接取标签
      if (ev.isQuestAccepted) {
        const questSpan = document.createElement('span');
        questSpan.className = 'reward-tag';
        questSpan.style.color = '#ff66ff';
        questSpan.textContent = ' 📋 已接取任务';
        textDiv.appendChild(questSpan);
      }

      div.appendChild(textDiv);

      if (ev.postEvent) {
        const postDiv = document.createElement('div');
        postDiv.className = 'event-post';
        postDiv.textContent = ev.postEvent;
        div.appendChild(postDiv);
      }

      log.appendChild(div);
    });
    log.scrollTop = log.scrollHeight;
  }

  #showAchievementUnlock(ach) {
    const log = document.getElementById('log');
    const div = document.createElement('div');
    div.className = 'event-entry achievement-unlock';
    div.style.borderLeftColor = '#ffcc00';
    div.style.background = 'rgba(255,204,0,0.05)';

    const iconDiv = document.createElement('div');
    iconDiv.style.fontSize = '1.5em';
    iconDiv.style.marginBottom = '4px';
    iconDiv.textContent = ach.icon || '🏆';
    div.appendChild(iconDiv);

    const textDiv = document.createElement('div');
    textDiv.className = 'event-text';
    textDiv.style.color = '#ffcc00';
    textDiv.style.fontWeight = 'bold';
    textDiv.textContent = `✦ 成就解锁: ${ach.name}`;
    div.appendChild(textDiv);

    const descDiv = document.createElement('div');
    descDiv.style.fontSize = '0.75em';
    descDiv.style.color = '#cc9900';
    descDiv.style.marginTop = '4px';
    descDiv.textContent = ach.description || '';
    div.appendChild(descDiv);

    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  #showQuestUpdates(questUpdates) {
    const log = document.getElementById('log');

    // 显示完成的任务
    for (const { quest, rewards } of questUpdates.completed) {
      const div = document.createElement('div');
      div.className = 'event-entry quest-notify';
      div.style.borderLeftColor = '#00ffaa';
      div.style.background = 'rgba(0,255,170,0.05)';

      const textDiv = document.createElement('div');
      textDiv.className = 'event-text';
      textDiv.style.color = '#00ffaa';
      textDiv.style.fontWeight = 'bold';
      textDiv.textContent = `✅ 任务完成: ${quest.title}`;
      div.appendChild(textDiv);

      const rewardText = Object.entries(rewards || {})
        .map(([k, v]) => `${k}: ${v > 0 ? '+' : ''}${v}`)
        .join(', ');
      if (rewardText) {
        const rewardDiv = document.createElement('div');
        rewardDiv.style.fontSize = '0.75em';
        rewardDiv.style.color = '#66ffcc';
        rewardDiv.style.marginTop = '4px';
        rewardDiv.textContent = `奖励: ${rewardText}`;
        div.appendChild(rewardDiv);
      }

      log.appendChild(div);
    }

    // 显示失败的任务
    for (const quest of questUpdates.failed || []) {
      const div = document.createElement('div');
      div.className = 'event-entry quest-notify';
      div.style.borderLeftColor = '#ff0044';
      div.style.background = 'rgba(255,0,68,0.05)';

      const textDiv = document.createElement('div');
      textDiv.className = 'event-text';
      textDiv.style.color = '#ff0044';
      textDiv.style.fontWeight = 'bold';
      textDiv.textContent = `❌ 任务失败: ${quest.title}`;
      div.appendChild(textDiv);

      const penaltyText = Object.entries(quest.penalties || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      if (penaltyText) {
        const penaltyDiv = document.createElement('div');
        penaltyDiv.style.fontSize = '0.75em';
        penaltyDiv.style.color = '#ff6688';
        penaltyDiv.style.marginTop = '4px';
        penaltyDiv.textContent = `惩罚: ${penaltyText}`;
        div.appendChild(penaltyDiv);
      }

      log.appendChild(div);
    }

    if (questUpdates.completed.length > 0 || (questUpdates.failed && questUpdates.failed.length > 0)) {
      log.scrollTop = log.scrollHeight;
    }
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

    // 保存到 localStorage
    try {
      const history = JSON.parse(localStorage.getItem('nc-life-history') || '[]');
      const p = this.#life.property.getAll();
      history.unshift({
        date: new Date().toISOString(),
        age: summary.age,
        talentIds: summary.talentIds || [],
        finalProps: { STYLE: p.STYLE, TECH: p.TECH, CHROME: p.CHROME, EDDIES: p.EDDIES, HUMANITY: p.HUMANITY, LIFE: p.LIFE },
        achievementIds: summary.achievements.map(a => a.id || ''),
        deathReason: summary.deathReason
      });
      if (history.length > 20) history.pop();
      localStorage.setItem('nc-life-history', JSON.stringify(history));
    } catch (e) {
      console.error('保存历史记录失败:', e);
    }

    // 渲染历史记录表格
    try {
      const historyEl = document.getElementById('history-list');
      if (historyEl) {
        const history = JSON.parse(localStorage.getItem('nc-life-history') || '[]');
        const tbody = historyEl.querySelector('tbody');
        if (tbody) {
          tbody.innerHTML = history.slice(0, 5).map(h =>
            `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
              <td style="padding:6px;color:var(--cyber-text);">${new Date(h.date).toLocaleDateString()}</td>
              <td style="padding:6px;color:var(--cyber-yellow);">${h.age}岁</td>
              <td style="padding:6px;color:var(--cyber-red);">${h.deathReason || '存活'}</td>
            </tr>`
          ).join('');
        }
      }
    } catch (e) {
      console.error('渲染历史记录失败:', e);
    }
  }

  #resetGame() {
    this.#selectedTalents = [];
    this.#talentPool = [];
    this.#points = 20;
    this.#allocated = { STYLE: 0, TECH: 0, CHROME: 0, EDDIES: 0 };
  }

  #showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    const target = document.getElementById(pageId);

    if (!target || target.classList.contains('active')) return;

    // 当前页面添加leaving类
    pages.forEach(p => {
      if (p.classList.contains('active') && p.id !== pageId) {
        p.classList.add('leaving');
        p.classList.remove('active');
        setTimeout(() => p.classList.remove('leaving'), 400);
      }
    });

    // 新页面添加active
    target.classList.add('active');
  }

  #updateLoadStatus(msg) {
    const el = document.getElementById('load-status');
    if (el) el.textContent = msg;
  }

  toggleInventory() {
    const panel = document.getElementById('inventory-panel');
    if (panel) {
      panel.classList.toggle('collapsed');
      const toggle = panel.querySelector('.inventory-toggle');
      if (toggle) {
        toggle.textContent = panel.classList.contains('collapsed') ? '▼ 物品栏' : '▲ 物品栏';
      }
    }
  }

  toggleQuestLog() {
    const panel = document.getElementById('quest-panel');
    if (panel) {
      panel.classList.toggle('collapsed');
      const toggle = panel.querySelector('.quest-toggle');
      if (toggle) {
        toggle.textContent = panel.classList.contains('collapsed') ? '▼ 任务日志' : '▲ 任务日志';
      }
    }
  }

  updateQuestLogUI() {
    if (!this.#life) return;
    const qs = this.#life.getQuestSystem();
    const currentTurn = this.#life.property.get('TURN');

    // 活跃任务
    const activeEl = document.getElementById('quest-active');
    if (activeEl) {
      const active = qs.getActiveQuests();
      activeEl.innerHTML = active.length
        ? active.map(q => {
            const remaining = qs.getRemainingTurns(q.id, currentTurn);
            const progress = qs.getQuestProgress(q.id);
            const urgentClass = remaining <= 3 ? 'urgent' : '';
            return `<div class="quest-item">
              <div class="quest-title">${escapeHtml(q.title)}</div>
              <div class="quest-giver">中间人: ${escapeHtml(q.giver)}</div>
              <div class="quest-meta">
                <span class="quest-deadline ${urgentClass}">⏳ ${remaining}旬</span>
                <span class="quest-progress">${progress}%</span>
              </div>
            </div>`;
          }).join('')
        : '<div class="quest-empty">无活跃任务</div>';
    }

    // 已完成
    const completedEl = document.getElementById('quest-completed');
    if (completedEl) {
      const completed = qs.getCompletedQuests().slice(-5); // 只显示最近5个
      completedEl.innerHTML = completed.length
        ? completed.map(q => `<div class="quest-item completed">
          <div class="quest-title">${escapeHtml(q.title)}</div>
          <div class="quest-giver">${escapeHtml(q.giver)}</div>
        </div>`).join('')
        : '<div class="quest-empty">无</div>';
    }

    // 已失败
    const failedEl = document.getElementById('quest-failed');
    if (failedEl) {
      const failed = qs.getFailedQuests().slice(-3); // 只显示最近3个
      failedEl.innerHTML = failed.length
        ? failed.map(q => `<div class="quest-item failed">
          <div class="quest-title">${escapeHtml(q.title)}</div>
          <div class="quest-giver">${escapeHtml(q.giver)}</div>
        </div>`).join('')
        : '<div class="quest-empty">无</div>';
    }
  }

  updateInventoryUI() {
    if (!this.#life) return;
    const inv = this.#life.inventory;
    const vehicles = this.#life.getVehicles();

    // 渲染武器
    const weaponsEl = document.getElementById('inv-weapons');
    if (weaponsEl) {
      const stats = inv.getAllStats();
      weaponsEl.innerHTML = (stats.weapons || []).map(w =>
        `<div class="inv-item quality-${w.quality || 'common'}">${escapeHtml(w.name)}</div>`
      ).join('') || '<div class="inv-empty">无</div>';
    }

    // 渲染义体
    const cyberwareEl = document.getElementById('inv-cyberware');
    if (cyberwareEl) {
      const stats = inv.getAllStats();
      cyberwareEl.innerHTML = (stats.cyberware || []).map(c =>
        `<div class="inv-item quality-${c.quality || 'common'}">${escapeHtml(c.name)}</div>`
      ).join('') || '<div class="inv-empty">无</div>';
    }

    // 渲染载具
    const vehiclesEl = document.getElementById('inv-vehicles');
    if (vehiclesEl) {
      vehiclesEl.innerHTML = vehicles.map(v =>
        `<div class="inv-item">${escapeHtml(v.name || v.id)}</div>`
      ).join('') || '<div class="inv-empty">无</div>';
    }

    // 渲染药品
    const drugsEl = document.getElementById('inv-drugs');
    if (drugsEl) {
      const stats = inv.getAllStats();
      drugsEl.innerHTML = (stats.drugs || []).map(d =>
        `<div class="inv-item quality-${d.quality || 'common'}">${escapeHtml(d.name)}</div>`
      ).join('') || '<div class="inv-empty">无</div>';
    }
  }

  #delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}
