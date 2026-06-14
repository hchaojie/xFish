// 全图鉴：网格 + 按渔场/稀有度筛选 + 名称搜索
import { fish, grounds, groundById, rarities } from '../data/fish.js';
import { fishSvg } from '../render/fishSvg.js';
import { setScene } from '../render/scene.js';
import { navigate } from '../util/router.js';

// 复用的鱼卡片（也供 ground 视图使用）
export function fishCard(f) {
  const r = rarities[f.rarity];
  const stars = '★'.repeat(r.stars) + '☆'.repeat(4 - r.stars);
  const g = groundById[f.groundId];
  return `
    <article class="fish-card" data-fish="${f.id}" data-rarity="${f.rarity}" data-ground="${[f.groundId, ...(f.alsoIn || [])].join(' ')}" data-name="${f.name}${f.alias || ''}${f.enName}${f.sciName}">
      <div class="fish-card__art ${f.imageUrl ? 'has-photo' : ''}" style="--accent:${g.theme.accent}">${f.imageUrl ? `<img src="${f.imageUrl}" alt="${f.name}" loading="lazy" />` : fishSvg(f.svg, { size: 160, swim: true })}</div>
      <div class="fish-card__info">
        <div class="fish-card__name">${f.name}${f.alias ? `<span class="fish-card__alias">俗名 ${f.alias}</span>` : ''}</div>
        <div class="fish-card__sci">${f.sciName}</div>
        <div class="fish-card__meta">
          <span class="rarity" style="color:${r.color}" title="${r.name}">${stars}</span>
          <span class="ground-tag">${g.icon} ${g.name}</span>
        </div>
      </div>
    </article>`;
}

export function codex() {
  setScene(null);
  const el = document.createElement('div');
  el.className = 'view view-codex';

  const groundOpts = ['<button class="chip chip-active" data-ground="all">全部渔场</button>']
    .concat(grounds.map((g) => `<button class="chip" data-ground="${g.id}">${g.icon} ${g.name}</button>`))
    .join('');
  const rarityOpts = ['<button class="chip chip-active" data-rarity="all">全部稀有度</button>']
    .concat(
      Object.entries(rarities).map(
        ([k, r]) => `<button class="chip" data-rarity="${k}" style="--rc:${r.color}">${r.name}</button>`
      )
    )
    .join('');

  el.innerHTML = `
    <div class="topbar">
      <button class="btn btn-ghost" data-go="/home">← 首页</button>
      <span class="topbar__title">📖 全部图鉴</span>
      <span class="topbar__spacer"></span>
    </div>
    <div class="filters">
      <input class="search" type="search" placeholder="🔍 搜索鱼名 / 学名 / 英文名" />
      <div class="chip-row" data-filter="ground">${groundOpts}</div>
      <div class="chip-row" data-filter="rarity">${rarityOpts}</div>
    </div>
    <div class="fish-grid">${fish.map(fishCard).join('')}</div>
    <div class="empty-hint" hidden>没有符合条件的鱼，换个筛选试试 🐠</div>
  `;

  const state = { ground: 'all', rarity: 'all', q: '' };
  const grid = el.querySelector('.fish-grid');
  const empty = el.querySelector('.empty-hint');

  function apply() {
    let visible = 0;
    grid.querySelectorAll('.fish-card').forEach((c) => {
      const okG = state.ground === 'all' || c.dataset.ground.split(' ').includes(state.ground);
      const okR = state.rarity === 'all' || c.dataset.rarity === state.rarity;
      const okQ = !state.q || c.dataset.name.toLowerCase().includes(state.q);
      const show = okG && okR && okQ;
      c.hidden = !show;
      if (show) visible++;
    });
    empty.hidden = visible !== 0;
  }

  el.querySelectorAll('.chip-row').forEach((row) => {
    const key = row.dataset.filter;
    row.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      row.querySelectorAll('.chip').forEach((c) => c.classList.remove('chip-active'));
      chip.classList.add('chip-active');
      state[key] = chip.dataset[key];
      apply();
    });
  });
  el.querySelector('.search').addEventListener('input', (e) => {
    state.q = e.target.value.trim().toLowerCase();
    apply();
  });

  el.querySelectorAll('[data-go]').forEach((b) =>
    b.addEventListener('click', () => navigate(b.dataset.go))
  );
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('[data-fish]');
    if (card) navigate('/fish/' + card.dataset.fish);
  });
  return el;
}
