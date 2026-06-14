// GLB/GLTF 鱼模型加载 + 程序化动画（摆身 + 自动张嘴）+ 模型检查器
// 用于测试用户提供的真实 3D 模型（无内置动画时由本模块补动画）。
// 返回与 buildFish3D 相同的接口 { group, update(t), dispose, len, info }，可直接插入 scene3d 的动画循环。
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';

const loader = new GLTFLoader();
const AXES = ['x', 'y', 'z'];

// 由几何包围盒推断长轴（身体方向）与最薄轴（左右摆动方向）——与模型朝向无关
function geomAxes(geo) {
  geo.computeBoundingBox();
  const b = geo.boundingBox;
  const size = new THREE.Vector3();
  b.getSize(size);
  const s = [size.x, size.y, size.z];
  let lo = 0, la = 0;
  for (let i = 1; i < 3; i++) {
    if (s[i] > s[lo]) lo = i;
    if (s[i] < s[la]) la = i;
  }
  return { long: AXES[lo], lat: AXES[la], len: s[lo] || 1, min: b.min[AXES[lo]] };
}

// 在材质顶点着色器里注入沿长轴的正弦行波弯曲（尾部权重大）——任何静态网格可用
function injectBend(mat, ax) {
  const u = {
    uTime: { value: 0 },
    uAmp: { value: ax.len * 0.05 },
    uLen: { value: ax.len },
    uMin: { value: ax.min },
  };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader =
      'uniform float uTime,uAmp,uLen,uMin;\n' +
      sh.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float _bt=(transformed.${ax.long}-uMin)/max(uLen,0.0001);
        float _bw=pow(clamp(1.0-_bt,0.0,1.0),1.3);
        transformed.${ax.lat}+=sin(uTime*2.2-_bt*5.5)*uAmp*_bw;`
      );
  };
  mat.needsUpdate = true;
  return u;
}

function build(gltf, { single, hints }) {
  const root = gltf.scene;
  const info = { meshes: [], bones: [], morphs: [], animations: (gltf.animations || []).map((a) => a.name || '(unnamed)'), skinned: false, jaw: 'none' };

  root.traverse((o) => {
    if (o.isBone) info.bones.push(o.name);
    if (o.isSkinnedMesh) info.skinned = true;
    if (o.isMesh) {
      info.meshes.push(o.name || '(mesh)');
      if (o.morphTargetDictionary) info.morphs.push(...Object.keys(o.morphTargetDictionary));
    }
  });

  // ---- 归一化：重置中心 + 缩放到目标长度(4) + 可选朝向微调 ----
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  root.position.sub(center);
  const inner = new THREE.Group();
  inner.add(root);
  inner.scale.setScalar((hints.scale || 1) * (4 / maxDim));
  if (Array.isArray(hints.rotation)) inner.rotation.set(hints.rotation[0] || 0, hints.rotation[1] || 0, hints.rotation[2] || 0);
  const group = new THREE.Group();
  group.add(inner);

  // ---- 摆身：仅当无骨骼且无自带动画时注入着色器弯曲 ----
  const bends = [];
  const disposables = [];
  if (!info.skinned && info.animations.length === 0) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const cloned = mats.map((m) => {
        const c = m.clone();
        disposables.push(c);
        bends.push(injectBend(c, geomAxes(o.geometry)));
        return c;
      });
      o.material = Array.isArray(o.material) ? cloned : cloned[0];
    });
  }

  // ---- 张嘴：自动探测下颌骨 / morph ----
  let jaw = null;
  root.traverse((o) => {
    if (jaw) return;
    if (o.isBone && /jaw|下颌|颌|mandible|chin|mouth|嘴/i.test(o.name)) {
      jaw = { type: 'bone', node: o, q0: o.quaternion.clone() };
    }
  });
  if (!jaw) {
    root.traverse((o) => {
      if (jaw || !o.isMesh || !o.morphTargetDictionary) return;
      const key = Object.keys(o.morphTargetDictionary).find((k) => /mouth|open|jaw|aa|kuchi|嘴|张/i.test(k));
      if (key) jaw = { type: 'morph', mesh: o, idx: o.morphTargetDictionary[key], key };
    });
  }
  info.jaw = jaw ? (jaw.type === 'bone' ? `bone:${jaw.node.name}` : `morph:${jaw.key}`) : 'none（无可驱动下颌，整条为融合网格时属正常）';

  // ---- 自带动画 ----
  let mixer = null;
  if (gltf.animations && gltf.animations.length) {
    mixer = new THREE.AnimationMixer(root);
    gltf.animations.forEach((c) => mixer.clipAction(c).play());
  }

  let lastT = 0;
  function update(t) {
    for (const u of bends) u.uTime.value = t;
    if (jaw) {
      const open = Math.sin(t * 2.5) * 0.5 + 0.5; // 0..1 周期张合
      if (jaw.type === 'morph') {
        if (jaw.mesh.morphTargetInfluences) jaw.mesh.morphTargetInfluences[jaw.idx] = open;
      } else {
        jaw.node.quaternion.copy(jaw.q0);
        jaw.node.rotateX(open * 0.35);
      }
    }
    if (mixer) { mixer.update(Math.max(0, t - lastT)); }
    lastT = t;
  }

  function dispose() {
    if (mixer) mixer.stopAllAction();
    root.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); }
          m.dispose?.();
        });
      }
    });
    disposables.forEach((d) => d.dispose && d.dispose());
  }

  // 控制台打印检查器结果
  console.log(
    `%c[xFish 模型检查器] ${gltf.scene.name || ''}\n` +
    `  网格(${info.meshes.length}): ${info.meshes.join(', ') || '—'}\n` +
    `  骨骼(${info.bones.length}): ${info.bones.slice(0, 30).join(', ') || '—'}\n` +
    `  形变morph(${info.morphs.length}): ${info.morphs.join(', ') || '—'}\n` +
    `  自带动画(${info.animations.length}): ${info.animations.join(', ') || '—'}\n` +
    `  张嘴: ${info.jaw}  |  摆身: ${bends.length ? '着色器弯曲(已启用)' : '由骨骼/自带动画驱动'}`,
    'color:#86ecc8'
  );

  return { group, update, dispose, len: 4, info };
}

/**
 * 加载 GLB/GLTF 鱼模型。
 * @returns {Promise<{group, update, dispose, len, info}>}
 */
export function loadFishModel(url, { single = false, hints = {} } = {}) {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => {
      try { resolve(build(gltf, { single, hints })); } catch (e) { reject(e); }
    }, undefined, reject);
  });
}
