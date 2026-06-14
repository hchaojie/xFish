// 鱼详情页：大幅 SVG 插画 + 丰富科普信息 + 数值条
import { fishById, groundById, rarities, fishByGround } from '../data/fish.js';
import { fishSvg } from '../render/fishSvg.js';
import { setScene } from '../render/scene.js';
import { navigate } from '../util/router.js';

function rangeText(arr, unit) {
  return arr[0] === arr[1] ? `${arr[0]} ${unit}` : `${arr[0]}–${arr[1]} ${unit}`;
}

// 用 max 归一化画一个数值条
function bar(label, value, max, unit, accent) {
  const pct = Math.max(4, Math.min(100, (value / max) * 100));
  return `<div class="stat-bar">
    <div class="stat-bar__top"><span>${label}</span><span>${value} ${unit}</span></div>
    <div class="stat-bar__track"><div class="stat-bar__fill" style="width:${pct}%;background:${accent}"></div></div>
  </div>`;
}

export function detail(params) {
  const f = fishById[params.id];
  if (!f) return navigate('/codex'), document.createElement('div');

  const g = groundById[f.groundId];
  const r = rarities[f.rarity];
  setScene(g, [f, ...fishByGround(g.id).filter((x) => x.id !== f.id)]);
  const stars = '★'.repeat(r.stars) + '☆'.repeat(4 - r.stars);

  // 图片：优先真实图片(imageUrl)，否则用自制 SVG 插画
  const art = f.imageUrl
    ? `<img class="detail-img" src="${f.imageUrl}" alt="${f.name}" />`
    : fishSvg(f.svg, { size: 360, swim: true });

  const facts = [
    ['学名', `<i>${f.sciName}</i>`],
    ['英文名', f.enName],
    ['所属渔场', `${g.icon} ${g.name}`],
    ['体长', rangeText(f.lengthCm, 'cm')],
    ['体重', rangeText(f.weightKg, 'kg')],
    ['活动水深', f.depth],
    ['适宜水温', f.waterTemp],
    ['活跃季节', f.season],
    ['食性', f.diet],
    ['生息环境', f.habitat],
    ['推荐饵料/钓法', f.baits],
  ];

  const el = document.createElement('div');
  el.className = 'view view-detail';
  el.innerHTML = `
    <div class="topbar">
      <button class="btn btn-ghost" data-go="/ground/${g.id}">← ${g.name}</button>
      <span class="topbar__title">${f.name}</span>
      <button class="btn btn-ghost" data-go="/codex">全图鉴</button>
    </div>

    <div class="detail-hero" style="--accent:${g.theme.accent}">
      <div class="detail-art">${art}</div>
      <div class="detail-head">
        <h1 class="detail-name">${f.name}</h1>
        <div class="detail-sub"><i>${f.sciName}</i> · ${f.enName}</div>
        <div class="detail-badges">
          <span class="badge" style="background:${r.color}22;color:${r.color};border-color:${r.color}55">${stars} ${r.name}</span>
          <span class="badge" style="--bc:${g.theme.accent}">${g.icon} ${g.name}</span>
        </div>
        <div class="detail-stats">
          ${bar('最大体长', f.lengthCm[1], 450, 'cm', g.theme.accent)}
          ${bar('最大体重', f.weightKg[1], 1000, 'kg', g.theme.accent)}
        </div>
      </div>
    </div>

    <section class="detail-section">
      <h2 class="section-title">科普介绍</h2>
      <p class="detail-desc">${f.desc}</p>
    </section>

    <section class="detail-section">
      <h2 class="section-title">档案数据</h2>
      <dl class="facts">
        ${facts.map(([k, v]) => `<div class="fact"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
      </dl>
    </section>

    <div class="detail-note">📷 当前展示为自制矢量插画；该鱼数据已预留真实照片位（imageUrl），后续可无缝替换为实拍图或 3D 模型。</div>
  `;

  el.querySelectorAll('[data-go]').forEach((b) =>
    b.addEventListener('click', () => navigate(b.dataset.go))
  );
  return el;
}
