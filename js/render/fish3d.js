// 程序化 3D 鱼模型生成器
// 复用 fish.svg 的参数（body / palette / pattern / fin / tail），用 Three.js 实时构建：
//   - 由环形截面缝合出的流线鱼身（顶点色实现背深腹浅渐变 + 条纹）
//   - 背鳍 / 胸鳍 / 尾鳍（按类型生成 2D 形状的薄片）
//   - 摆尾游动动画（逐顶点正弦波形变 + 尾鳍摆动）
// 预留：若 fish.modelUrl 存在，调用方可改用 GLTFLoader 加载真实模型（见 scene3d.js）。
import * as THREE from 'three';

// 每种体型 → 3D 剖面参数
const BODY3D = {
  spindle:   { len: 4.0, girth: 0.85, gA: 0.42, hMul: 1.00, wMul: 0.42, headSharp: 0.35 },
  torpedo:   { len: 4.4, girth: 0.70, gA: 0.40, hMul: 0.95, wMul: 0.40, headSharp: 0.55 },
  oval:      { len: 3.4, girth: 0.95, gA: 0.45, hMul: 1.05, wMul: 0.45, headSharp: 0.30 },
  deep:      { len: 3.4, girth: 1.05, gA: 0.46, hMul: 1.40, wMul: 0.40, headSharp: 0.30 },
  flat:      { len: 3.4, girth: 1.00, gA: 0.46, hMul: 1.55, wMul: 0.30, headSharp: 0.28 },
  bighead:   { len: 3.8, girth: 0.92, gA: 0.36, hMul: 1.05, wMul: 0.46, headSharp: 0.18 },
  catfish:   { len: 4.2, girth: 0.78, gA: 0.32, hMul: 0.82, wMul: 0.52, headSharp: 0.22 },
  snakehead: { len: 4.6, girth: 0.62, gA: 0.42, hMul: 0.85, wMul: 0.55, headSharp: 0.30 },
  ribbon:    { len: 6.2, girth: 0.50, gA: 0.30, hMul: 1.70, wMul: 0.15, headSharp: 0.45 },
  billfish:  { len: 5.2, girth: 0.62, gA: 0.42, hMul: 1.00, wMul: 0.40, headSharp: 0.80 },
  shark:     { len: 5.0, girth: 0.72, gA: 0.40, hMul: 1.05, wMul: 0.52, headSharp: 0.55 },
  angler:    { len: 3.2, girth: 1.02, gA: 0.30, hMul: 0.95, wMul: 0.62, headSharp: 0.15 },
  mola:      { len: 3.0, girth: 1.35, gA: 0.50, hMul: 1.55, wMul: 0.30, headSharp: 0.22 },
};

const NS = 30; // 纵向环数
const NR = 18; // 每环径向点数

function lerpColor(out, a, b, t) { out.copy(a).lerp(b, t); return out; }

// 构建鱼身几何 + 顶点色，返回 { geometry, basePositions, len }
function buildBody(p, colors) {
  const B = BODY3D[p.body] || BODY3D.spindle;
  const { len, girth, gA, hMul, wMul, headSharp } = B;

  const c0 = new THREE.Color(colors[0]); // 背
  const c1 = new THREE.Color(colors[1]); // 中
  const c2 = new THREE.Color(colors[2]); // 腹

  const positions = [];
  const colorArr = [];
  const uvs = [];
  const tmp = new THREE.Color();

  for (let i = 0; i <= NS; i++) {
    const t = i / NS; // 0 尾 → 1 头
    const x = (t - 0.5) * len;

    // 围度包络：两端收拢，gA 处最粗
    let env = t < gA ? t / gA : (1 - t) / (1 - gA);
    const expo = t < gA ? 0.55 : 0.4 + headSharp; // 头部越尖收得越快
    env = Math.pow(Math.max(env, 0.0001), expo);
    const r = Math.max(girth * env, girth * 0.03);

    // 条纹/斑纹：按环位置压暗
    let shade = 1;
    if (p.pattern === 'stripes' || p.pattern === 'bars') {
      shade = Math.sin(t * Math.PI * (p.pattern === 'stripes' ? 16 : 9)) > 0.4 ? 0.62 : 1;
    } else if (p.pattern === 'spots' || p.pattern === 'dots' || p.pattern === 'blotch' || p.pattern === 'mottle') {
      shade = (Math.sin(i * 12.9898) * 43758.5453 % 1) > 0.62 ? 0.74 : 1; // 伪随机斑块
    }

    for (let j = 0; j <= NR; j++) {
      const a = (j / NR) * Math.PI * 2;
      const sy = Math.sin(a);
      const y = sy * r * hMul;
      const z = Math.cos(a) * r * wMul;
      positions.push(x, y, z);
      uvs.push(t, j / NR);

      // 顶点色：腹(c2) → 中(c1) → 背(c0)，按竖直方向
      const ty = (sy + 1) / 2; // 0 腹 .. 1 背
      if (ty < 0.5) lerpColor(tmp, c2, c1, ty * 2);
      else lerpColor(tmp, c1, c0, (ty - 0.5) * 2);
      colorArr.push(tmp.r * shade, tmp.g * shade, tmp.b * shade);
    }
  }

  const indices = [];
  const ring = NR + 1;
  for (let i = 0; i < NS; i++) {
    for (let j = 0; j < NR; j++) {
      const a = i * ring + j;
      const b = a + ring;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colorArr, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return { geo, base: Float32Array.from(positions), len };
}

// 由一组 2D 点生成薄片鳍 mesh（位于局部 XY 平面）
function finMesh(points2d, material) {
  const shape = new THREE.Shape();
  points2d.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  const g = new THREE.ShapeGeometry(shape);
  return new THREE.Mesh(g, material);
}

function tailShape(type) {
  switch (type) {
    case 'fork':    return [[0, 0], [-0.9, 0.95], [-0.5, 0.12], [-0.95, 0], [-0.5, -0.12], [-0.9, -0.95]];
    case 'lunate':  return [[0, 0], [-0.7, 1.25], [-0.35, 0.1], [-0.7, -1.25]];
    case 'round':   return [[0, 0], [-0.7, 0.5], [-0.85, 0], [-0.7, -0.5]];
    case 'pointed': return [[0, 0], [-0.9, 0.25], [-1.1, 0], [-0.9, -0.25]];
    case 'hetero':  return [[0, 0], [-0.6, 1.1], [-0.35, 0.15], [-0.95, -0.2], [-0.5, -0.55]];
    case 'clavus':  return [[0, 0.9], [-0.45, 0.7], [-0.45, -0.7], [0, -0.9]];
    case 'fan':
    default:        return [[0, 0], [-0.85, 0.75], [-0.6, 0], [-0.85, -0.75]];
  }
}

function dorsalShape(type) {
  switch (type) {
    case 'sail':    return [[1.6, 0], [1.1, 1.7], [-0.3, 1.9], [-1.2, 0.2]];
    case 'shark':   return [[0.5, 0], [0.0, 1.3], [-0.6, 0]];
    case 'spiny':   return [[1.2, 0], [1.0, 0.7], [0.7, 0.2], [0.4, 0.8], [0.1, 0.25], [-0.2, 0.7], [-0.5, 0]];
    case 'long':    return [[1.8, 0], [0.6, 0.5], [-1.6, 0.5], [-1.8, 0]];
    case 'crescent':return [[0.7, 0], [0.2, 0.9], [-0.5, 0.2]];
    case 'finlet':  return [[0.8, 0], [0.4, 0.55], [-0.1, 0.1], [-0.5, 0]];
    case 'round':
    default:        return [[0.9, 0], [0.2, 0.7], [-0.7, 0]];
  }
}

/**
 * 构建一条 3D 鱼。
 * @returns {{group: THREE.Group, update: (t:number)=>void, dispose: ()=>void}}
 */
export function buildFish3D(p, opts = {}) {
  const colors = p.palette || ['#5a7d9a', '#88a8c0', '#d6e3ee'];
  const group = new THREE.Group();
  const disposables = [];

  const bodyMat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.55, metalness: 0.15, side: THREE.DoubleSide,
  });
  disposables.push(bodyMat);

  const { geo, base, len } = buildBody(p, colors);
  disposables.push(geo);
  const body = new THREE.Mesh(geo, bodyMat);
  group.add(body);

  const finMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colors[1]), roughness: 0.6, metalness: 0.1,
    side: THREE.DoubleSide, transparent: true, opacity: 0.9,
  });
  disposables.push(finMat);

  // 尾鳍（在尾端，绕 Y 摆动）
  const tail = finMesh(tailShape(p.tail), finMat);
  disposables.push(tail.geometry);
  tail.position.x = -len / 2;
  const tailPivot = new THREE.Group();
  tailPivot.position.x = -len / 2 + 0.05;
  tail.position.x = -0.05;
  tailPivot.add(tail);
  group.add(tailPivot);

  // 背鳍（沿背部，立于 XY 平面）
  const B = BODY3D[p.body] || BODY3D.spindle;
  const dorsal = finMesh(dorsalShape(p.fin), finMat);
  disposables.push(dorsal.geometry);
  dorsal.position.set(len * 0.05, B.girth * B.hMul * 0.7, 0);
  group.add(dorsal);

  // 胸鳍 ×2（身体两侧偏下、靠头）
  const pecPts = [[0, 0], [-0.7, -0.35], [-0.5, -0.7], [0.1, -0.4]];
  const pecL = finMesh(pecPts, finMat); disposables.push(pecL.geometry);
  const pecR = pecL.clone();
  pecL.position.set(len * 0.18, -B.girth * 0.25, B.girth * B.wMul * 0.7);
  pecL.rotation.set(Math.PI / 2, 0, -0.4);
  pecR.position.set(len * 0.18, -B.girth * 0.25, -B.girth * B.wMul * 0.7);
  pecR.rotation.set(-Math.PI / 2, 0, -0.4);
  group.add(pecL, pecR);

  // 旗鱼/剑鱼长吻
  if (p.bill) {
    const billGeo = new THREE.ConeGeometry(0.06, len * 0.45, 8);
    disposables.push(billGeo);
    const bill = new THREE.Mesh(billGeo, bodyMat);
    bill.rotation.z = -Math.PI / 2;
    bill.position.x = len / 2 + len * 0.2;
    group.add(bill);
  }
  // 鮟鱇发光诱饵
  let lureMesh = null;
  if (p.lure) {
    const lg = new THREE.SphereGeometry(0.12, 12, 12);
    disposables.push(lg);
    const lm = new THREE.MeshStandardMaterial({ color: 0xfff3a0, emissive: 0xffe066, emissiveIntensity: 1.4 });
    disposables.push(lm);
    lureMesh = new THREE.Mesh(lg, lm);
    lureMesh.position.set(len * 0.55, B.girth * B.hMul + 0.5, 0);
    group.add(lureMesh);
  }

  // 眼睛 ×2
  const eyeGeo = new THREE.SphereGeometry(0.14, 12, 12);
  disposables.push(eyeGeo);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111820, roughness: 0.2 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  disposables.push(eyeMat, whiteMat);
  const ex = len * 0.34, ey = B.girth * 0.18, ez = B.girth * B.wMul * 0.7;
  for (const sgn of [1, -1]) {
    const w = new THREE.Mesh(eyeGeo, whiteMat); w.position.set(ex, ey, ez * sgn); w.scale.setScalar(1.15);
    const e = new THREE.Mesh(eyeGeo, eyeMat); e.position.set(ex + 0.02, ey, ez * sgn * 1.02);
    group.add(w, e);
  }

  const pos = geo.attributes.position;
  const speed = opts.speed || 2.2;

  function update(time) {
    // 逐顶点摆尾：沿身长的正弦行波，尾部权重大
    for (let k = 0; k < pos.count; k++) {
      const bx = base[k * 3];
      const tb = bx / len + 0.5; // 0 尾 .. 1 头
      const weight = Math.pow(Math.max(0, 1 - tb), 1.4);
      const off = Math.sin(time * speed - tb * 5.5) * 0.5 * weight;
      pos.array[k * 3 + 2] = base[k * 3 + 2] + off;
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    // 尾鳍摆动
    tailPivot.rotation.y = Math.sin(time * speed - 1.2) * 0.6;
    // 胸鳍轻扇
    pecL.rotation.x = Math.PI / 2 + Math.sin(time * 3) * 0.25;
    pecR.rotation.x = -Math.PI / 2 - Math.sin(time * 3) * 0.25;
    if (lureMesh) lureMesh.material.emissiveIntensity = 1.0 + Math.sin(time * 3) * 0.6;
  }

  function dispose() { disposables.forEach((d) => d.dispose && d.dispose()); }

  return { group, update, dispose, len };
}
