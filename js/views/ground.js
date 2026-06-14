// 单渔场鱼列表（场景化）
import { groundById, fishByGround, rarities } from '../data/fish.js';
import { fishSvg } from '../render/fishSvg.js';
import { setScene } from '../render/scene.js';
import { navigate } from '../util/router.js';
import { fishCard } from './codex.js';

export function ground(params) {
  const g = groundById[params.id];
  if (!g) return navigate('/home'), document.createElement('div');

  const list = fishByGround(g.id);
  setScene(g, list);

  const el = document.createElement('div');
  el.className = 'view view-ground';
  el.innerHTML = `
    <div class="topbar">
      <button class="btn btn-ghost" data-go="/home">← 渔场</button>
      <span class="topbar__title">${g.icon} ${g.name}</span>
      <button class="btn btn-ghost" data-go="/codex">全图鉴</button>
    </div>
    <div class="ground-intro">
      <p>${g.desc}</p>
      <div class="ground-intro__bar">
        <span class="ground-intro__count">栖息 ${list.length} 种鱼</span>
        <button class="btn btn-primary btn-sm" data-go="/tank/${g.id}">🐠 进入 3D 水族馆</button>
      </div>
    </div>
    <div class="fish-grid">${list.map(fishCard).join('')}</div>
  `;

  el.querySelectorAll('[data-go]').forEach((b) =>
    b.addEventListener('click', () => navigate(b.dataset.go))
  );
  el.querySelectorAll('[data-fish]').forEach((c) =>
    c.addEventListener('click', () => navigate('/fish/' + c.dataset.fish))
  );
  return el;
}
