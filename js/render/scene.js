// 动态水下场景背景
// 根据渔场主题色渲染：渐变水体 + 光影焦散 + 上浮气泡 + 摇曳水草 + 游动鱼群
// 挂载到 #scene 元素（位于 #app 之下，z-index 较低）。

import { fishSvg } from './fishSvg.js';
import { fishByGround } from '../data/fish.js';

const sceneEl = () => document.getElementById('scene');

function rand(a, b) {
  return a + Math.random() * (b - a);
}

export function setScene(ground, swimFishList = null) {
  const el = sceneEl();
  if (!el) return;
  const t = ground ? ground.theme : { top: '#16324a', mid: '#0e2336', deep: '#06121f', accent: '#4a7fb0' };

  el.style.setProperty('--c-top', t.top);
  el.style.setProperty('--c-mid', t.mid);
  el.style.setProperty('--c-deep', t.deep);
  el.style.setProperty('--c-accent', t.accent);

  // 气泡
  let bubbles = '';
  for (let i = 0; i < 24; i++) {
    const size = rand(4, 16);
    bubbles += `<span class="bubble" style="left:${rand(0, 100)}%;width:${size}px;height:${size}px;animation-duration:${rand(7, 16)}s;animation-delay:${rand(0, 12)}s"></span>`;
  }

  // 焦散光束
  let beams = '';
  for (let i = 0; i < 4; i++) {
    beams += `<span class="lightbeam" style="left:${rand(8, 88)}%;animation-delay:${rand(0, 8)}s;width:${rand(40, 90)}px"></span>`;
  }

  // 水草（底部）
  let weeds = '';
  for (let i = 0; i < 9; i++) {
    const sway = rand(2.5, 5);
    const h = rand(60, 150);
    weeds += `<svg class="weed" style="left:${rand(2, 96)}%;height:${h}px;--sway:${sway}s;animation-delay:${rand(0, 3)}s" viewBox="0 0 30 150" preserveAspectRatio="none">
      <path d="M15,150 C5,110 25,90 12,55 C6,35 20,20 15,0" fill="none" stroke="${t.accent}" stroke-opacity="0.5" stroke-width="6" stroke-linecap="round"/>
    </svg>`;
  }

  // 游动鱼群（用本渔场或指定鱼种）
  const swimmers = (swimFishList || (ground ? fishByGround(ground.id) : [])).slice(0, 7);
  let fishHtml = '';
  swimmers.forEach((f, i) => {
    const dir = i % 2 === 0;
    const dur = rand(18, 34);
    const top = rand(12, 78);
    const size = rand(46, 96);
    fishHtml += `<div class="swimmer ${dir ? 'rtl' : 'ltr'}" style="top:${top}%;--dur:${dur}s;animation-delay:${rand(0, 14)}s">
      ${fishSvg(f.svg, { size, flip: dir })}
    </div>`;
  });

  el.innerHTML = `
    <div class="water"></div>
    <div class="beams">${beams}</div>
    <div class="bubbles">${bubbles}</div>
    <div class="swimmers">${fishHtml}</div>
    <div class="weeds">${weeds}</div>
    <div class="floor"></div>
  `;
}
