/* =========================================================
   奶罗牌
   提问 → 洗牌 → 抽牌 → 翻牌 → 解读
   只有「开始」和「再来一次」两个按钮，其余靠点牌推进
   ========================================================= */

(function () {
  'use strict';

  /* ---------- 小工具 ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rnd = n => Math.floor(Math.random() * n);

  function shuffleArr(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = rnd(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  const pick = (arr, seed) => arr[seed % arr.length];

  function roman(n) {
    if (n === 0) return '0';
    const map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let out = '';
    for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
    return out;
  }

  function vibrate(ms) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }

  /* ---------- 牌阵 ---------- */
  const SPREADS = [
    {
      id: 'three', label: '三张', hint: '过去 · 现在 · 未来', n: 3,
      positions: [{ name: '过去' }, { name: '现在' }, { name: '未来' }]
    },
    {
      id: 'five', label: '五张', hint: '核心 · 阻碍 · 建议 · 趋势 · 提醒', n: 5,
      positions: [
        { name: '核心' }, { name: '阻碍' }, { name: '建议' },
        { name: '趋势' }, { name: '提醒' }
      ]
    },
    {
      id: 'seven', label: '七张', hint: '过去 · 现在 · 未来 · 状态 · 环境 · 隐因 · 建议', n: 7,
      positions: [
        { name: '过去' }, { name: '现在' }, { name: '未来' },
        { name: '你的状态' }, { name: '环境' }, { name: '隐藏因素' }, { name: '建议' }
      ]
    }
  ];

  const STAGE_LABEL = { ask: '提问', shuffle: '洗牌', pick: '抽牌', reveal: '翻牌', result: '解读' };

  /* ---------- 主题 ---------- */
  const THEME_WORDS = {
    love: ['感情', '恋爱', '喜欢', '爱', '复合', '前任', '对象', '男友', '女友', '婚姻',
           '结婚', '伴侣', '暧昧', '表白', '分手', '关系', '暗恋', '约会', 'ta', '他', '她'],
    career: ['工作', '事业', '职场', '面试', 'offer', '升职', '老板', '同事', '创业', '项目',
             '跳槽', '离职', '学业', '考试', '论文', '考研', '学习', '学校', '实习', '录取', '合作'],
    money: ['钱', '财运', '收入', '投资', '理财', '股票', '基金', '负债', '贷款', '工资',
            '奖金', '生意', '买房', '存款', '开销'],
    self: ['自我', '内心', '状态', '情绪', '焦虑', '成长', '选择', '方向', '人生', '意义',
           '健康', '身体', '睡眠', '疲惫', '改变']
  };

  const THEME_LABEL = {
    love: '感情关系', career: '事业与学业', money: '金钱与资源',
    self: '自我与状态', general: '这件事'
  };

  function detectTheme(q) {
    const text = (q || '').toLowerCase();
    if (!text.trim()) return 'general';
    let best = 'general', bestScore = 0;
    Object.keys(THEME_WORDS).forEach(k => {
      let s = 0;
      THEME_WORDS[k].forEach(w => { if (text.includes(w)) s += w.length >= 2 ? 1 : 0.5; });
      if (s > bestScore) { bestScore = s; best = k; }
    });
    return best;
  }

  /* ---------- 文案 ---------- */
  const ELEMENT_TONE = {
    火: '行动和热情是主要动力，先动起来比想清楚更重要',
    水: '情绪和关系是主线，先照顾感受再谈对错',
    风: '思考和沟通占的比重很大，把话说开，结就松一半',
    土: '现实和资源是重点，钱、时间、身体都要算进来'
  };

  const THEME_TONE = {
    love: {
      up: ['在关系里，这份「{kw}」值得被认真对待，而不是被解释掉。',
           '这段关系正在提醒你「{kw}」——先承认它，再决定下一步。'],
      rev: ['关系里有一块没说开的地方，「{kw}」在提示你：先处理情绪，再处理问题。',
            '现在不适合追问结果，先让自己回到稳定的位置，「{kw}」会慢慢化开。']
    },
    career: {
      up: ['在这件事上，「{kw}」是你现在最值钱的筹码。',
           '局面允许你往前一步，把「{kw}」变成具体的动作。'],
      rev: ['卡点多半出在「{kw}」上，先承认它，再谈怎么绕过去。',
            '现在硬推也推不动，先把「{kw}」背后的准备补齐。']
    },
    money: {
      up: ['钱的部分在往好的方向走，「{kw}」意味着可以稳一点，但不必押上全部。',
           '把「{kw}」当作原则：能省的省，能算的算清楚。'],
      rev: ['「{kw}」提示有笔账还没算清，先核对数字再决定。',
            '现在不适合冒险，「{kw}」是提醒你守住底线。']
    },
    self: {
      up: ['你现在真正需要的是「{kw}」，它是一件每天都能做到的小事。',
           '「{kw}」正在成为你的力量来源，顺着它走，不会错太远。'],
      rev: ['「{kw}」是你最近最消耗的地方，先允许它存在，再慢慢放下。',
            '不必急着变好，先弄清楚「{kw}」是从什么时候开始的。']
    },
    general: {
      up: ['「{kw}」会是你接下来最有效的着力点。',
           '这件事可以往前推，把「{kw}」当作行动的切口。'],
      rev: ['事情暂时卡在「{kw}」上，绕过去不如正面处理。',
            '逆位不是坏事，它只是把「{kw}」提前摆到了你面前。']
    }
  };

  /* ---------- 牌面图形 ---------- */
  const MAJOR_ART = [
    `<circle cx="24" cy="40" r="10"/><path d="M24 30v-9l13-6"/><path d="M8 52c11 4 37 4 48 0"/><circle cx="47" cy="17" r="3"/>`,
    `<path d="M22 33c0-6 5-6 9 0s9 6 9 0-5-6-9 0-9 6-9 0Z"/><path d="M14 18l36 32"/><circle cx="14" cy="18" r="3"/>`,
    `<path d="M40 13a19 19 0 1 0 0 38 25 25 0 1 1 0-38Z"/><circle cx="47" cy="17" r="2.2"/><circle cx="51" cy="26" r="1.6"/>`,
    `<path d="M32 51S18 42 18 32a8 8 0 0 1 14-5 8 8 0 0 1 14 5c0 10-14 19-14 19Z"/><path d="M32 8v9"/><circle cx="32" cy="6" r="2.4"/>`,
    `<path d="M11 45h42l-6-23-11 10-4-14-4 14-11-10Z"/><path d="M13 51h38"/>`,
    `<path d="M32 8v46M20 19h24M22 30h20"/><circle cx="32" cy="8" r="2.6"/>`,
    `<circle cx="25" cy="32" r="11"/><circle cx="39" cy="32" r="11"/><path d="M32 12v6M32 46v6"/>`,
    `<circle cx="32" cy="34" r="17"/><circle cx="32" cy="34" r="6"/><path d="M32 17v34M15 34h34M20 22l24 24M44 22 20 46"/><path d="M26 8h12"/>`,
    `<path d="M22 28c0-6 6-6 10 0s10 6 10 0-6-6-10 0-10 6-10 0Z"/><path d="M32 40v10"/><path d="M24 54h16"/><path d="M26 54c2-4 10-4 12 0"/>`,
    `<path d="M32 8v12"/><path d="M21 22h22l-4 13H25Z"/><path d="M28 35v11h8V35"/><circle cx="32" cy="28" r="3.6"/><path d="M18 54h28"/>`,
    `<circle cx="32" cy="32" r="20"/><circle cx="32" cy="32" r="7"/><path d="M32 12v7M32 45v7M12 32h7M45 32h7"/><path d="M20 20l5 5M44 44l-5-5M44 20l-5 5M20 44l5-5"/>`,
    `<path d="M32 12v38"/><path d="M13 22h38"/><path d="M13 22l-6 12h12Z"/><path d="M51 22l-6 12h12Z"/><path d="M21 54h22"/>`,
    `<path d="M32 6v10"/><path d="M13 24h38L32 53Z"/><circle cx="32" cy="34" r="3"/>`,
    `<path d="M20 55 45 15"/><path d="M45 15C34 8 20 14 16 25c9 4 21 1 29-10Z"/><path d="M21 44c-6 0-8 4-8 9 6 0 8-4 8-9Z"/>`,
    `<path d="M13 18h15v6a7.5 7.5 0 0 1-15 0Z"/><path d="M36 38h15v6a7.5 7.5 0 0 1-15 0Z"/><path d="M28 25c5 1 3 12 8 13"/><path d="M13 18l-4 4M51 38l4 4"/>`,
    `<path d="M21 27c-5-9 4-14 11-7 7-7 16-2 11 7"/><circle cx="32" cy="39" r="12"/><circle cx="27" cy="37" r="1.6" fill="currentColor"/><circle cx="37" cy="37" r="1.6" fill="currentColor"/><path d="M26 46c4 3 8 3 12 0"/>`,
    `<path d="M20 55V26h24v29"/><path d="M27 26V14h10v12"/><path d="M35 6l-9 15h9l-7 13"/><path d="M14 55h36"/>`,
    `<path d="M32 8l6.2 16.6L55 27l-12.6 11.6L46 55l-14-9-14 9 3.6-16.4L9 27l16.8-2.4Z"/>`,
    `<path d="M41 13a19 19 0 1 0 0 38 25 25 0 1 1 0-38Z"/><circle cx="20" cy="16" r="2"/><circle cx="15" cy="28" r="1.6"/><circle cx="19" cy="41" r="1.8"/>`,
    `<circle cx="32" cy="32" r="12"/><path d="M32 6v8M32 50v8M6 32h8M50 32h8M13 13l6 6M45 45l6 6M51 13l-6 6M19 45l-6 6"/>`,
    `<path d="M12 40l24-14v26L12 40Z"/><path d="M40 27c8 0 13-4 13-11M40 41c8 0 13 4 13 11"/><path d="M20 42v12h8"/>`,
    `<ellipse cx="32" cy="32" rx="14" ry="22"/><ellipse cx="32" cy="32" rx="21" ry="12"/><path d="M18 12l-5 5M46 12l5 5M18 52l-5-5M46 52l5-5"/>`
  ];

  const SUIT_ART = {
    wands: `<path d="M15 51 43 17"/><circle cx="46" cy="13.5" r="4.6"/><path d="M55 22.5l3 1.8M39.5 6.5l-1.8-3M58 31l3-1" opacity=".75"/><path d="M21 44c-5.4.4-9 4.4-10.4 9.6 5.2-.6 9.2-4 10.4-9.6Z"/>`,
    cups: `<path d="M17.5 11h29v9.5a14.5 14.5 0 0 1-29 0Z"/><path d="M32 36.5V47"/><path d="M21.5 53h21"/><path d="M26.5 17.5c1.8 4.6 9.2 4.6 11 0" opacity=".65"/>`,
    swords: `<path d="M32 6l7 13v22H25V19Z"/><path d="M17 41h30"/><path d="M32 41v13"/><path d="M26 58h12"/>`,
    pentacles: `<circle cx="32" cy="32" r="22"/><polygon points="32,12 36.7,25.5 51,25.8 39.6,34.5 43.8,48.2 32,40 20.2,48.2 24.4,34.5 13,25.8 27.3,25.5"/>`
  };

  const RANK_SHORT = ['', '', '', '', '', '', '', '', '', '', '', '侍', '骑', '后', '王'];

  function iconSVG(card) {
    const body = card.arcana === 'major'
      ? MAJOR_ART[Number(card.numeral)]
      : SUIT_ART[card.suit];
    return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  function cardEl(card, opts = {}) {
    const { reversed = false, flipped = false, small = false } = opts;
    const num = card.arcana === 'major'
      ? roman(Number(card.numeral))
      : (card.rank <= 10 ? RANK_NUM[card.rank] : RANK_SHORT[card.rank]);

    const el = document.createElement('div');
    el.className = `tcard${small ? ' small' : ''}${flipped ? ' flipped' : ''}`;
    el.innerHTML = `
      <div class="tcard-in">
        <div class="tcard-face tcard-back">
          <img class="back-img" src="assets/cards/牌背.webp" alt="" draggable="false" onerror="this.remove()">
          <span class="back-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M16 3.6c4.3 6.4 7.6 11 7.6 14.6a7.6 7.6 0 1 1-15.2 0C8.4 14.6 11.7 10 16 3.6Z"/></svg></span>
        </div>
        <div class="tcard-face tcard-front${reversed ? ' rev' : ''}" style="--c:${SUITS[card.suit].color}">
          <img class="face-img" src="assets/cards_nai/${card.name}.webp" alt=""
               draggable="false"
               onload="this.parentNode.classList.add('has-face')"
               onerror="this.remove()">
          ${reversed ? '<span class="rev-badge">逆位</span>' : ''}
          <span class="num">${num}</span>
          <span class="art">${iconSVG(card)}</span>
          <span class="name">${card.name}<em>${card.en}</em></span>
        </div>
      </div>`;
    return el;
  }

  /* ---------- 状态 ---------- */
  const state = {
    spread: SPREADS[0],
    question: '',
    stage: 'ask',
    grid: [],       // 牌桌上的牌
    picks: [],      // 已选的牌
    theme: 'general',
    seed: 0,
    sheetOpen: false,
    bubbleOpen: false,
    busy: false
  };

  /* ---------- 星空 ---------- */
  function initStars() {
    const canvas = $('#stars');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, stars = [], raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(110, Math.round((w * h) / 20000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.2 + 0.25,
        base: Math.random() * 0.45 + 0.15,
        speed: Math.random() * 0.8 + 0.25,
        phase: Math.random() * Math.PI * 2
      }));
    };

    const draw = t => {
      const time = t / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const a = s.base + Math.sin(time * s.speed + s.phase) * 0.3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(244, 226, 190, ${Math.max(0.04, Math.min(0.85, a))})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(draw);
    });
  }

  /* ---------- 阶段 ---------- */
  function goPhase(name) {
    state.stage = name;
    $$('.phase').forEach(p => p.classList.toggle('active', p.id === 'phase-' + name));
    $('#stepLabel').textContent = STAGE_LABEL[name] || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- 提问 ---------- */
  function renderSpreads() {
    const box = $('#spreads');
    box.innerHTML = '';
    SPREADS.forEach(sp => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg';
      b.dataset.id = sp.id;
      b.setAttribute('role', 'tab');
      b.textContent = sp.label;
      b.addEventListener('click', () => { state.spread = sp; syncSpreads(); });
      box.appendChild(b);
    });
    syncSpreads();
  }

  function syncSpreads() {
    $$('#spreads .seg').forEach(b =>
      b.setAttribute('aria-selected', String(b.dataset.id === state.spread.id)));
    $('#spreadHint').textContent = state.spread.hint;
    $('#btnStart').textContent = `开始占卜 · 抽 ${state.spread.n} 张`;
  }

  /* ---------- 洗牌 ---------- */
  function start() {
    const q = $('#question').value.trim();
    state.question = q || '此刻，我最需要知道的是什么？';
    state.busy = false;

    const deck = $('#deckBtn');
    deck.classList.remove('shuffling');
    $('#shuffleHint').textContent = '轻点牌堆开始';
    goPhase('shuffle');
  }

  function shuffle() {
    if (state.busy || state.stage !== 'shuffle') return;
    state.busy = true;

    const deck = $('#deckBtn');
    deck.classList.add('shuffling');
    $('#shuffleHint').textContent = '洗牌中…';
    vibrate(10);

    setTimeout(() => {
      deck.classList.remove('shuffling');
      $('#shuffleHint').textContent = '牌已洗好';
      vibrate(8);
      setTimeout(() => {
        state.busy = false;
        buildFan();
        goPhase('pick');
      }, 480);
    }, 1500);
  }

  /* ---------- 抽牌 ---------- */
  function buildFan() {
    const n = state.spread.n;
    const total = n <= 3 ? 8 : 10;
    const deck = shuffleArr(DECK).slice(0, total);

    state.grid = deck.map(card => ({ card, reversed: Math.random() < 0.3 }));
    state.picks = [];

    const fan = $('#fan');
    fan.innerHTML = '';

    state.grid.forEach((item, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'fan-card';
      wrap.style.zIndex = String(i);
      wrap.dataset.index = String(i);
      wrap.setAttribute('role', 'button');
      wrap.setAttribute('tabindex', '0');
      wrap.setAttribute('aria-label', `第 ${i + 1} 张牌`);

      wrap.appendChild(cardEl(item.card));

      const take = () => takeCard(i, wrap);
      wrap.addEventListener('click', take);
      wrap.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); take(); }
      });

      fan.appendChild(wrap);
    });

    $('#pickTitle').textContent = `选 ${n} 张`;
    $('#pickHint').textContent = '凭直觉点，翻开就算选中。';
    updateCounter();

    requestAnimationFrame(() => {
      layoutFan();
      requestAnimationFrame(layoutFan);
    });
  }

  function layoutFan() {
    const fan = $('#fan');
    if (!fan) return;
    const items = $$('.fan-card', fan);
    if (!items.length) return;

    const W = fan.clientWidth || 360;
    const cardW = parseFloat(getComputedStyle(fan).getPropertyValue('--fw')) || 80;
    const maxAngle = window.innerWidth <= 360 ? 18 : 22;
    const arc = window.innerWidth <= 360 ? 20 : 26;

    // 让最外侧那张牌斜着也留在容器里
    const rad = maxAngle * Math.PI / 180;
    const extent = cardW * Math.cos(rad) + (cardW * 5 / 3) * Math.sin(rad);
    const spread = Math.max(180, Math.min(W - extent - 8, 440));

    items.forEach((node, i) => {
      const t = items.length === 1 ? 0 : (i / (items.length - 1)) * 2 - 1;
      node.style.setProperty('--x', (t * spread / 2).toFixed(1) + 'px');
      node.style.setProperty('--y', (t * t * arc).toFixed(1) + 'px');
      node.style.setProperty('--a', (t * maxAngle).toFixed(2) + 'deg');
    });
  }

  function takeCard(index, el) {
    if (state.busy) return;
    if (el.classList.contains('taken')) return;
    if (state.picks.length >= state.spread.n) return;

    el.classList.add('taken');
    state.picks.push(state.grid[index]);
    vibrate(8);
    updateCounter();

    // 抽走的牌从牌扇里收起来，剩下的牌重新排布
    setTimeout(() => {
      el.remove();
      layoutFan();
    }, 360);

    if (state.picks.length === state.spread.n) {
      state.busy = true;
      $('#pickHint').textContent = '选好了，正在为你摆牌…';
      setTimeout(() => {
        state.busy = false;
        buildSlots();
        goPhase('reveal');
      }, 720);
    }
  }

  function updateCounter() {
    const n = state.spread.n;
    const left = n - state.picks.length;
    $('#pickCount').textContent = `${state.picks.length} / ${n}`;
    $('#pickStatus').textContent = left > 0
      ? `还需要再选 ${left} 张`
      : '选好了，正在摆牌…';
  }

  /* ---------- 单张牌义（翻牌弹层与整体解读共用） ---------- */
  function cardReading(p, i, spread, theme, seed) {
    const pos = spread.positions[i].name;
    const info = p.reversed ? p.card.rev : p.card.up;
    const bridge = pick(THEME_TONE[theme][p.reversed ? 'rev' : 'up'], seed + i * 7)
      .replace('{kw}', info.kw[0]);
    return {
      index: i, pos,
      card: p.card, reversed: p.reversed,
      kw: info.kw, text: info.text, bridge
    };
  }

  /* ---------- 翻牌 ---------- */
  let revealDone = false;

  function allFlipped() {
    const cards = $$('#slots .tcard');
    return cards.length > 0 && cards.every(c => c.classList.contains('flipped'));
  }

  function buildSlots() {
    revealDone = false;
    state.theme = detectTheme(state.question);
    state.seed = hash(state.picks.map(p => p.card.id + (p.reversed ? 'r' : 'u')).join('|') + state.question);

    const box = $('#slots');
    box.className = 'slots' + (state.picks.length >= 7 ? ' many' : '');
    box.innerHTML = '';

    state.picks.forEach((p, i) => {
      const pos = state.spread.positions[i];
      const slot = document.createElement('div');
      slot.className = 'slot';

      const card = cardEl(p.card, { reversed: p.reversed });
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `${pos.name}，点击翻开`);

      const flip = () => {
        // 已经翻开的牌，再点一次可以重新看它的解读
        if (card.classList.contains('flipped')) {
          openSheet(cardReading(p, i, state.spread, state.theme, state.seed));
          return;
        }
        card.classList.add('flipped');
        slot.classList.add('done');
        card.setAttribute('aria-label', `${pos.name}：${p.card.name}${p.reversed ? '逆位' : '正位'}`);
        vibrate(12);

        const cr = cardReading(p, i, state.spread, state.theme, state.seed);
        setTimeout(() => openSheet(cr), 360);

        if (allFlipped()) {
          revealDone = true;
          $('#revealHint').textContent = '全部翻开，读完这张看整体。';
        }
      };

      card.addEventListener('click', flip);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
      });

      const label = document.createElement('div');
      label.className = 'slot-label';
      label.textContent = pos.name;

      slot.appendChild(card);
      slot.appendChild(label);
      box.appendChild(slot);
    });

    $('#revealHint').textContent = '点开一张，读一张。';
  }

  /* ---------- 单张解读弹层 ---------- */
  function openSheet(cr) {
    const scrim = $('#scrim');
    const sheet = $('#sheet');
    state.sheetOpen = true;

    $('#sheetPos').textContent = `${String(cr.index + 1).padStart(2, '0')} · ${cr.pos}`;
    $('#sheetName').innerHTML =
      `${cr.card.name}<span class="tag ${cr.reversed ? 'rev' : 'up'}">${cr.reversed ? '逆位' : '正位'}</span>`;
    $('#sheetText').textContent = cr.text + cr.bridge;
    $('#sheetKw').innerHTML = cr.kw.map(k => `<span>${k}</span>`).join('');

    const holder = $('#sheetCard');
    holder.innerHTML = '';
    holder.appendChild(cardEl(cr.card, { reversed: cr.reversed, flipped: true, small: true }));

    scrim.hidden = false;
    sheet.hidden = false;
    requestAnimationFrame(() => {
      scrim.classList.add('show');
      sheet.classList.add('show');
    });
    document.body.classList.add('sheet-locked');
    sheet.setAttribute('tabindex', '-1');
    sheet.focus({ preventScroll: true });
    vibrate(6);
  }

  function closeSheet() {
    if (!state.sheetOpen) return;
    state.sheetOpen = false;

    const scrim = $('#scrim');
    const sheet = $('#sheet');
    scrim.classList.remove('show');
    sheet.classList.remove('show');
    document.body.classList.remove('sheet-locked');
    setTimeout(() => { scrim.hidden = true; sheet.hidden = true; }, 320);

    if (revealDone) {
      revealDone = false;
      $('#revealHint').textContent = '正在生成整体解读…';
      setTimeout(showReading, 380);
    }
  }

  /* ---------- 解读 ---------- */
  function buildReading(question, spread, picks) {
    const n = picks.length;
    const theme = detectTheme(question);
    const upCount = picks.filter(p => !p.reversed).length;
    const seed = hash(picks.map(p => p.card.id + (p.reversed ? 'r' : 'u')).join('|') + question);

    const elCount = { 火: 0, 水: 0, 风: 0, 土: 0 };
    picks.forEach(p => { elCount[p.card.element]++; });
    const sorted = Object.entries(elCount).sort((a, b) => b[1] - a[1]);
    const topCount = sorted[0][1];
    const tied = sorted.filter(e => e[1] === topCount).map(e => e[0]);

    let overview;
    if (tied.length >= 3) {
      overview = `牌面元素很均衡（${tied.join('、')}都在场），不必只用一种方式应对。`;
    } else if (tied.length === 2) {
      overview = `「${tied[0]}」和「${tied[1]}」在共同推动这件事：${ELEMENT_TONE[tied[0]]}；同时，${ELEMENT_TONE[tied[1]]}。`;
    } else {
      overview = `「${tied[0]}」是主调：${ELEMENT_TONE[tied[0]]}。`;
    }

    if (upCount === n) overview += '全部正位，方向是顺的。';
    else if (upCount === 0) overview += '全部逆位，说明功课都还握在你自己手里。';
    else overview += `正逆位交错（${upCount} 正 ${n - upCount} 逆），事情有推进，也有拉扯。`;

    const isYesNo = /吗|是否|能不能|该不该|要不要|会不会|可不可以/.test(question);
    let verdict = '';
    if (isYesNo) {
      if (upCount / n >= 0.66) verdict = '倾向「可以」，时机比你想的更好。';
      else if (upCount / n >= 0.34) verdict = '倾向「可以，但有个前提」——先把逆位那张牌的事处理掉。';
      else verdict = '倾向「先缓一缓」，现在还不是硬推的时候。';
    }

    const cards = picks.map((p, i) => cardReading(p, i, spread, theme, seed));

    const advice = [];
    const upCards = cards.filter(c => !c.reversed);
    const revCards = cards.filter(c => c.reversed);
    if (upCards.length) advice.push(`把「${upCards[0].kw[0]}」当作接下来几天的着力点。`);
    if (revCards.length) advice.push(`「${revCards[0].kw[0]}」是绕不开的课题，别硬扛。`);
    if (!advice.length) advice.push('别急着找答案，先把眼前这一步走稳。');

    return { question, theme, verdict, overview, cards, advice };
  }

  function showReading() {
    const r = buildReading(state.question, state.spread, state.picks);
    state.reading = r;
    const d = new Date();

    $('#resultQuestion').textContent = r.question;
    $('#resultMeta').textContent =
      `${r.cards.length} 张牌 · ${THEME_LABEL[r.theme]} · ${d.getMonth() + 1} 月 ${d.getDate()} 日`;

    $('#summary').innerHTML = `
      <p>${r.overview}</p>
      ${r.verdict ? `<p class="verdict">${r.verdict}</p>` : ''}
      <div class="divider"></div>
      <p class="advice">建议：${r.advice.join('')}</p>`;

    const tiles = $('#tiles');
    tiles.className = 'tiles n' + r.cards.length;
    // 七张牌时把版面再收紧一点，尽量保持一屏
    $('#phase-result').classList.toggle('s7', r.cards.length === 7);
    tiles.innerHTML = '';
    r.cards.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tile';
      btn.setAttribute('aria-label', `${c.pos}：${c.card.name}，点开看解读`);
      btn.appendChild(cardEl(c.card, { reversed: c.reversed, flipped: true }));

      const label = document.createElement('span');
      label.className = 'tile-label';
      label.textContent = c.pos;
      btn.appendChild(label);

      btn.addEventListener('click', e => {
        e.stopPropagation();
        openBubble(c, btn);
      });
      tiles.appendChild(btn);
    });

    closeBubble();
    goPhase('result');
  }

  /* ---------- 结果页气泡 ---------- */
  function openBubble(cr, anchor) {
    const bubble = $('#bubble');
    $('#bubblePos').textContent = `${String(cr.index + 1).padStart(2, '0')} · ${cr.pos}`;
    $('#bubbleName').innerHTML =
      `${cr.card.name}<span class="tag ${cr.reversed ? 'rev' : 'up'}">${cr.reversed ? '逆位' : '正位'}</span>`;
    $('#bubbleText').textContent = cr.text + cr.bridge;
    $('#bubbleKw').innerHTML = cr.kw.map(k => `<span>${k}</span>`).join('');

    bubble.hidden = false;
    bubble.classList.remove('below');

    const bw = bubble.offsetWidth;
    const bh = bubble.offsetHeight;
    const r = anchor.getBoundingClientRect();

    let left = r.left + r.width / 2 - bw / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - bw - 12));

    let top = r.top - bh - 10;
    let below = false;
    if (top < 64) {
      top = r.bottom + 10;
      below = true;
    }

    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';
    bubble.classList.toggle('below', below);
    bubble.style.setProperty('--ax', (r.left + r.width / 2 - left) + 'px');

    state.bubbleOpen = true;
    vibrate(6);
  }

  function closeBubble() {
    if (!state.bubbleOpen) return;
    state.bubbleOpen = false;
    $('#bubble').hidden = true;
  }

  /* ---------- 赞助弹窗 ---------- */
  function openSponsor() {
    const m = $('#sponsorModal');
    if (!m || !m.hidden) return;
    m.hidden = false;
    requestAnimationFrame(() => m.classList.add('show'));
    vibrate(8);
  }

  function closeSponsor() {
    const m = $('#sponsorModal');
    if (!m || m.hidden) return;
    m.classList.remove('show');
    setTimeout(() => { m.hidden = true; }, 260);
  }

  /* ---------- 分享图（截图用） ---------- */
  const DROP_PATH = 'M16 4c4.3 6.4 7.4 10.8 7.4 14.3a7.4 7.4 0 1 1-14.8 0C8.6 14.8 11.7 10.4 16 4Z';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function openShare() {
    const r = state.reading;
    if (!r) return;
    const d = new Date();
    const poster = $('#sharePoster');
    poster.innerHTML = `
      <div class="sp-top">
        <span class="sp-brand">
          <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="${DROP_PATH}"/></svg>
          <b>奶罗牌</b>
        </span>
        <span>${d.getMonth() + 1} / ${d.getDate()}</span>
      </div>
      <p class="sp-q">${escapeHtml(r.question)}</p>
      <div class="sp-cards n${r.cards.length}">
        ${r.cards.map(c => `
          <figure class="sp-card">
            <img src="assets/cards_nai/${c.card.name}.webp" alt="${c.card.name}"
                 class="${c.reversed ? 'rev' : ''}" draggable="false">
            <figcaption>${escapeHtml(c.pos)}${c.reversed ? ' · 逆位' : ''}</figcaption>
          </figure>`).join('')}
      </div>
      <p class="sp-line">${escapeHtml(r.advice.join(''))}</p>
      <p class="sp-foot">奶罗牌 · 塔罗占卜</p>`;

    const layer = $('#shareLayer');
    layer.hidden = false;
    requestAnimationFrame(() => layer.classList.add('show'));
    vibrate(8);
  }

  function closeShare() {
    const layer = $('#shareLayer');
    if (!layer || layer.hidden) return;
    layer.classList.remove('show');
    setTimeout(() => { layer.hidden = true; }, 260);
  }

  /* ---------- 交互 ---------- */
  function again() {
    // 「再抽一次」回到提问环节，问题保留，改不改都行
    closeSponsor();
    closeShare();
    state.picks = [];
    state.busy = false;
    goPhase('ask');
    const q = $('#question');
    q.focus();
    q.setSelectionRange(q.value.length, q.value.length);
  }

  function backToAsk() {
    // 「换个问题」回到提问环节，并把输入清空
    closeSponsor();
    closeShare();
    state.picks = [];
    state.busy = false;
    $('#question').value = '';
    goPhase('ask');
    $('#question').focus();
  }

  function bind() {
    renderSpreads();

    $('#btnStart').addEventListener('click', start);
    $('#btnAgain').addEventListener('click', again);
    $('#btnBack').addEventListener('click', backToAsk);
    $('#deckBtn').addEventListener('click', shuffle);
    $('#sheetClose').addEventListener('click', closeSheet);
    $('#scrim').addEventListener('click', closeSheet);

    // 赞助弹窗
    $('#sponsorBtn').addEventListener('click', openSponsor);
    $('#sponsorClose').addEventListener('click', closeSponsor);
    $('#sponsorOk').addEventListener('click', closeSponsor);
    $('#sponsorModal').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeSponsor();
    });

    // 分享图
    $('#btnShare').addEventListener('click', openShare);
    $('#shareClose').addEventListener('click', closeShare);
    $('#shareLayer').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeShare();
    });

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (state.bubbleOpen) closeBubble();
      if (state.sheetOpen) closeSheet();
      closeSponsor();
      closeShare();
    });

    // 点气泡外面收起
    document.addEventListener('pointerdown', e => {
      if (!state.bubbleOpen) return;
      if (e.target.closest('#bubble') || e.target.closest('.tile')) return;
      closeBubble();
    });

    window.addEventListener('scroll', closeBubble, { passive: true });
    window.addEventListener('resize', closeBubble);

    $$('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const q = $('#question');
        q.value = chip.dataset.q;
        q.focus();
      });
    });

    document.addEventListener('pointerdown', e => {
      const t = e.target.closest('.btn, .chip, .seg');
      if (!t) return;
      const rect = t.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.6;
      const r = document.createElement('span');
      r.className = 'ripple';
      r.style.width = r.style.height = size + 'px';
      r.style.left = (e.clientX - rect.left - size / 2) + 'px';
      r.style.top = (e.clientY - rect.top - size / 2) + 'px';
      t.appendChild(r);
      setTimeout(() => r.remove(), 560);
    });

    window.addEventListener('resize', () => {
      if (state.stage === 'pick') layoutFan();
    });
  }

  /* ---------- 自动演示（?auto=1） ---------- */
  async function demo() {
    await sleep(300);
    $('#question').value = '我和 TA 的关系，接下来会怎么发展？';
    const three = $$('#spreads .seg').find(b => b.dataset.id === 'three');
    if (three) three.click();
    $('#btnStart').click();
    await sleep(400);
    $('#deckBtn').click();
    await sleep(2300);
    for (let i = 0; i < 3; i++) {
      const cards = $$('.fan-card').filter(c => !c.classList.contains('taken'));
      if (!cards.length) break;
      cards[Math.min(i * 2, cards.length - 1)].click();
      await sleep(320);
    }
    await sleep(1000);
    for (const c of $$('#slots .tcard')) {
      c.click();
      await sleep(760);
      closeSheet();
      await sleep(420);
    }
    await sleep(1200);
  }

  /* ---------- 启动 ---------- */
  initStars();
  bind();
  goPhase('ask');

  window.__tarot = { state, demo, buildReading, cardEl };

  if (new URLSearchParams(location.search).has('auto')) demo();
})();
