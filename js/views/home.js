// 首页 / 渔场选择
import { grounds, fishByGround } from '../data/fish.js';
import { fishSvg } from '../render/fishSvg.js';
import { setScene } from '../render/scene.js';
import { navigate } from '../util/router.js';

export function home() {
  setScene(null); // 深海主题氛围
  const total = grounds.reduce((n, g) => n + fishByGround(g.id).length, 0);

  const cards = grounds
    .map((g) => {
      const list = fishByGround(g.id);
      const preview = list[0] ? fishSvg(list[0].svg, { size: 120, swim: true }) : '';
      return `
      <button class="ground-card" data-go="/ground/${g.id}" style="--g-top:${g.theme.top};--g-mid:${g.theme.mid};--g-deep:${g.theme.deep};--g-accent:${g.theme.accent}">
        <div class="ground-card__scene">
          <span class="gc-bubble" style="left:20%"></span>
          <span class="gc-bubble" style="left:62%;animation-delay:2s"></span>
          <span class="gc-bubble" style="left:82%;animation-delay:4s"></span>
          <div class="gc-fish">${preview}</div>
        </div>
        <div class="ground-card__body">
          <div class="ground-card__title"><span class="gc-icon">${g.icon}</span>${g.name}</div>
          <div class="ground-card__short">${g.short}</div>
          <div class="ground-card__count">${list.length} 种鱼</div>
        </div>
      </button>`;
    })
    .join('');

  const el = document.createElement('div');
  el.className = 'view view-home';
  el.innerHTML = `
    <header class="hero">
      <h1 class="hero__title">🐟 xFish 鱼类图鉴</h1>
      <p class="hero__sub">为钓鱼与海洋爱好者打造的科普图鉴 · 收录 ${total} 种鱼 · ${grounds.length} 大渔场</p>
      <button class="btn btn-primary" data-go="/codex">浏览全部图鉴 →</button>
    </header>
    <h2 class="section-title">选择渔场</h2>
    <div class="ground-grid">${cards}</div>
    <footer class="home-foot">点击渔场进入对应的水下场景 · 数据与插画均为开源自制，可逐步替换为真实照片与 3D 模型</footer>
  `;

  el.querySelectorAll('[data-go]').forEach((b) =>
    b.addEventListener('click', () => navigate(b.dataset.go))
  );
  return el;
}
