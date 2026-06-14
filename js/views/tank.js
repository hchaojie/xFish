// 3D 水族馆：某渔场的鱼在逼真水下场景中游动，可拖拽旋转视角
import { groundById, fishByGround } from '../data/fish.js';
import { setScene } from '../render/scene.js';
import { navigate } from '../util/router.js';
import { createScene3D } from '../render/scene3d.js';

export function tank(params) {
  const g = groundById[params.id];
  if (!g) return navigate('/home'), document.createElement('div');
  setScene(g); // 2D 背景兜底（3D 加载前/失败时可见）

  const list = fishByGround(g.id);
  const el = document.createElement('div');
  el.className = 'view view-tank';
  el.innerHTML = `
    <div class="topbar">
      <button class="btn btn-ghost" data-go="/ground/${g.id}">← ${g.name}</button>
      <span class="topbar__title">🐠 ${g.name} · 3D 水族馆</span>
      <button class="btn btn-ghost" data-go="/codex">全图鉴</button>
    </div>
    <div class="tank-stage" aria-label="3D 水族馆场景">
      <div class="tank-canvas"></div>
      <div class="tank-hint">🖱️ 拖拽旋转视角 · 滚轮缩放 · 共 ${list.length} 种鱼在此游弋</div>
    </div>
    <p class="tank-note">3D 模型为按鱼种参数程序化生成（版权干净、可离线）。后续可为鱼种增加 <code>modelUrl</code> 并在 <code>scene3d</code> 中接入真实 GLTF 模型。</p>
  `;

  let scene = null;
  const canvas = el.querySelector('.tank-canvas');
  // 延迟到元素挂载后再创建，确保容器已有尺寸
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        scene = createScene3D(canvas, { ground: g, fish: list, single: false });
      } catch (e) {
        canvas.innerHTML = `<div class="tank-error">3D 场景初始化失败：${e.message}</div>`;
      }
    });
  });

  el.__cleanup = () => { if (scene) scene.dispose(); };

  el.querySelectorAll('[data-go]').forEach((b) =>
    b.addEventListener('click', () => navigate(b.dataset.go))
  );
  return el;
}
