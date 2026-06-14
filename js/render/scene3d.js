// Three.js 水下场景管理器
// 两种模式：
//   single=true  单鱼鉴赏（居中、可拖拽旋转观察）
//   single=false 3D 水族馆（多鱼沿路径游动）
// 含：主题化水体雾、海床、岩石、摇曳水草、上浮气泡群、太阳光与水面波光。
// 预留：若鱼数据含 modelUrl，可在此用 GLTFLoader 替换 buildFish3D（当前为程序化模型）。
import * as THREE from 'three';
import { OrbitControls } from '../../vendor/OrbitControls.js';
import { buildFish3D } from './fish3d.js';
import { loadFishModel } from './fishModel.js';

export function createScene3D(container, { ground, fish, single = false } = {}) {
  const theme = ground ? ground.theme : { top: '#1b4a6b', mid: '#0e2c44', deep: '#06121f', accent: '#5b9bd6' };
  const cMid = new THREE.Color(theme.mid);
  const cDeep = new THREE.Color(theme.deep);

  const W = () => container.clientWidth || 600;
  const H = () => container.clientHeight || 380;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.cursor = 'grab';

  const scene = new THREE.Scene();
  scene.background = cDeep.clone();
  scene.fog = new THREE.FogExp2(cMid.clone().lerp(cDeep, 0.3), single ? 0.018 : 0.03);

  const camera = new THREE.PerspectiveCamera(50, W() / H(), 0.1, 200);
  camera.position.set(single ? 0 : 2, single ? 1.2 : 3, single ? 9 : 16);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = single ? 5 : 8;
  controls.maxDistance = single ? 16 : 40;
  controls.maxPolarAngle = Math.PI * 0.92;
  controls.target.set(0, single ? 0 : 0.5, 0);
  controls.autoRotate = single;
  controls.autoRotateSpeed = 0.8;

  // ---- 光照 ----
  const hemi = new THREE.HemisphereLight(new THREE.Color(theme.top), cDeep, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(4, 12, 6);
  scene.add(sun);
  const shimmer = new THREE.PointLight(new THREE.Color(theme.accent), 0.8, 60);
  shimmer.position.set(-6, 8, 4);
  scene.add(shimmer);

  const disposables = [];
  const track = (o) => { if (o.geometry) disposables.push(o.geometry); if (o.material) disposables.push(o.material); return o; };

  // ---- 海床与装饰（水族馆模式才铺满）----
  if (!single) {
    const floorGeo = new THREE.CircleGeometry(40, 48);
    const floorMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(theme.deep).lerp(new THREE.Color('#caa86b'), 0.4), roughness: 1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -4;
    scene.add(floor); track(floor);

    // 岩石
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x55606a, roughness: 1, flatShading: true });
    disposables.push(rockMat);
    for (let i = 0; i < 7; i++) {
      const rg = new THREE.DodecahedronGeometry(0.6 + Math.random() * 1.4, 0);
      disposables.push(rg);
      const rock = new THREE.Mesh(rg, rockMat);
      const ang = Math.random() * Math.PI * 2, rad = 8 + Math.random() * 24;
      rock.position.set(Math.cos(ang) * rad, -3.7, Math.sin(ang) * rad);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.scale.y = 0.6;
      scene.add(rock);
    }

    // 水草（摇曳）
    var weeds = [];
    const weedMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(theme.accent).lerp(new THREE.Color('#2e7d4f'), 0.5), roughness: 0.8, side: THREE.DoubleSide });
    disposables.push(weedMat);
    for (let i = 0; i < 16; i++) {
      const h = 2 + Math.random() * 3;
      const wg = new THREE.PlaneGeometry(0.5, h, 1, 6);
      disposables.push(wg);
      const weed = new THREE.Mesh(wg, weedMat);
      const ang = Math.random() * Math.PI * 2, rad = 6 + Math.random() * 26;
      weed.position.set(Math.cos(ang) * rad, -4 + h / 2, Math.sin(ang) * rad);
      weed.rotation.y = Math.random() * Math.PI;
      weed.userData.phase = Math.random() * Math.PI * 2;
      weed.userData.h = h;
      scene.add(weed); weeds.push(weed);
    }
  }

  // ---- 上浮气泡 ----
  const BUB = single ? 60 : 220;
  const bubPos = new Float32Array(BUB * 3);
  const bubSpd = new Float32Array(BUB);
  const spread = single ? 8 : 34, ceil = single ? 8 : 12, floorY = single ? -6 : -4;
  for (let i = 0; i < BUB; i++) {
    bubPos[i * 3] = (Math.random() - 0.5) * spread;
    bubPos[i * 3 + 1] = floorY + Math.random() * (ceil - floorY);
    bubPos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    bubSpd[i] = 0.6 + Math.random() * 1.4;
  }
  const bubGeo = new THREE.BufferGeometry();
  bubGeo.setAttribute('position', new THREE.BufferAttribute(bubPos, 3));
  const bubMat = new THREE.PointsMaterial({ color: 0xcfeaff, size: 0.18, transparent: true, opacity: 0.5, depthWrite: false });
  disposables.push(bubGeo, bubMat);
  const bubbles = new THREE.Points(bubGeo, bubMat);
  scene.add(bubbles);

  // ---- 鱼 ----
  // 放置：设定缩放/位置/游动路径（程序化模型与 GLB 模型通用）
  function placeFish(b) {
    if (single) {
      b.group.position.set(0, 0, 0);
      b.group.scale.setScalar(2.4 / Math.max(b.len, 2));
      b.path = null;
    } else {
      b.group.scale.setScalar(0.5 + Math.random() * 0.5);
      b.path = {
        rx: 6 + Math.random() * 16, rz: 5 + Math.random() * 14,
        y: -2.5 + Math.random() * 6, phase: Math.random() * Math.PI * 2,
        spd: (0.12 + Math.random() * 0.18) * (Math.random() < 0.5 ? 1 : -1),
        bob: 0.4 + Math.random() * 0.6,
      };
    }
    return b;
  }

  const list = (fish || []).slice(0, single ? 1 : 8);
  const built = [];
  list.forEach((f) => {
    if (f.modelUrl) {
      // 真实 GLB 模型：异步加载；失败回退程序化模型
      loadFishModel(f.modelUrl, { single, hints: f.modelHints }).then((b) => {
        if (!running) { b.dispose(); return; }
        scene.add(b.group); built.push(placeFish(b));
        if (single) showModelInfo(b.info);
      }).catch((err) => {
        console.warn('GLB 加载失败，回退程序化模型：', err && err.message ? err.message : err);
        if (!running) return;
        const b = buildFish3D(f.svg, { speed: 2 });
        scene.add(b.group); built.push(placeFish(b));
      });
    } else {
      const b = buildFish3D(f.svg, { speed: 1.8 + Math.random() * 1.2 });
      scene.add(b.group); built.push(placeFish(b));
    }
  });

  // 单鱼模式下展示模型检查器结果（骨骼/morph/动画/张嘴）
  function showModelInfo(info) {
    const el = document.createElement('div');
    el.className = 'model-info';
    el.innerHTML =
      `网格 ${info.meshes.length} · 骨骼 ${info.bones.length} · morph ${info.morphs.length} · 动画 ${info.animations.length}<br>` +
      `张嘴：${info.jaw}`;
    container.appendChild(el);
  }

  // ---- 动画循环 ----
  const clock = new THREE.Clock();
  let raf = 0, running = true;
  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const t = clock.getElapsedTime();

    built.forEach((b) => {
      b.update(t);
      if (b.path) {
        const a = t * b.path.spd + b.path.phase;
        const x = Math.cos(a) * b.path.rx;
        const z = Math.sin(a) * b.path.rz;
        b.group.position.set(x, b.path.y + Math.sin(t * 0.6 + b.path.phase) * b.path.bob, z);
        const vx = -Math.sin(a) * b.path.rx * Math.sign(b.path.spd);
        const vz = Math.cos(a) * b.path.rz * Math.sign(b.path.spd);
        b.group.rotation.y = Math.atan2(-vz, vx);
      } else {
        b.group.rotation.y = Math.sin(t * 0.4) * 0.25;
        b.group.position.y = Math.sin(t * 0.8) * 0.2;
      }
    });

    // 气泡上浮
    const bp = bubGeo.attributes.position.array;
    for (let i = 0; i < BUB; i++) {
      bp[i * 3 + 1] += bubSpd[i] * 0.02;
      bp[i * 3] += Math.sin(t + i) * 0.004;
      if (bp[i * 3 + 1] > ceil) bp[i * 3 + 1] = floorY;
    }
    bubGeo.attributes.position.needsUpdate = true;

    // 水草摇曳
    if (typeof weeds !== 'undefined') {
      weeds.forEach((w) => { w.rotation.z = Math.sin(t * 0.8 + w.userData.phase) * 0.18; });
    }
    // 波光闪烁
    shimmer.intensity = 0.6 + Math.sin(t * 1.3) * 0.3;
    sun.intensity = 1.4 + Math.sin(t * 0.7) * 0.25;

    controls.update();
    renderer.render(scene, camera);
  }
  frame();

  // ---- 自适应 ----
  function onResize() {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
  }
  const ro = new ResizeObserver(onResize);
  ro.observe(container);

  // ---- 清理 ----
  function dispose() {
    running = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    controls.dispose();
    built.forEach((b) => b.dispose());
    disposables.forEach((d) => d.dispose && d.dispose());
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    const info = container.querySelector('.model-info');
    if (info) info.remove();
  }

  return { dispose };
}
