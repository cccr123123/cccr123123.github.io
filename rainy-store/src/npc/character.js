// 低多边形动漫角色：几何体拼装 + 简单关节动画
// 默认面向 +Z 方向
import * as THREE from 'three';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.82,
    metalness: opts.metalness ?? 0.04,
    ...opts,
  });
}

/** 简单动漫脸：两只眼睛 + 一张嘴 */
function buildFace(headGroup, headR, eyeColor = 0x241a16, expr = 'smile') {
  const eyeGeo = new THREE.SphereGeometry(headR * 0.115, 8, 6);
  const eyeMat = new THREE.MeshStandardMaterial({ color: eyeColor, roughness: 0.35, metalness: 0.05 });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(sx * headR * 0.38, headR * 0.1, headR * 0.86);
    eye.scale.set(1, 1.15, 0.5);
    headGroup.add(eye);
  }
  // 嘴：一小段弧（用两个小球拼也行，这里用细长扁球）
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x4a2a24, roughness: 0.6 });
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.09, 8, 6), mouthMat);
  mouth.position.set(0, -headR * 0.34, headR * 0.9);
  mouth.scale.set(1.5, 0.45, 0.4);
  headGroup.add(mouth);
  return { mouth };
}

/**
 * @param {object} cfg
 *   skin/hair/shirt/pants/apron/accent 颜色
 *   height 身高倍率
 *   style 'clerk' | 'customer'
 */
export function buildCharacter(cfg = {}) {
  const {
    skin = 0xe8c4a8,
    hair = 0x1d1a1e,
    shirt = 0xf2f2ec,
    pants = 0x2b3038,
    apron = null,
    accent = 0x8ff0c8,
    hairStyle = 'short',
    scale = 1,
  } = cfg;

  const root = new THREE.Group();
  const body = new THREE.Group(); // 用于整体缩放
  root.add(body);

  const skinMat = mat(skin, { roughness: 0.75 });
  const hairMat = mat(hair, { roughness: 0.7 });
  const shirtMat = mat(shirt, { roughness: 0.85 });
  const pantsMat = mat(pants, { roughness: 0.9 });
  const shoeMat = mat(0x22252a, { roughness: 0.7 });

  /* ------------------------------------------------------------ 腿 */
  const legY = 0.42;
  const legs = new THREE.Group();
  for (const sx of [-1, 1]) {
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.42, 3, 8), pantsMat);
    thigh.position.set(sx * 0.085, legY + 0.2, 0);
    legs.add(thigh);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.055, 0.16), shoeMat);
    foot.position.set(sx * 0.085, 0.03, 0.02);
    legs.add(foot);
  }
  body.add(legs);

  /* ------------------------------------------------------------ 躯干 */
  const torso = new THREE.Group();
  torso.position.y = 0.79;
  body.add(torso);

  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.148, 0.132, 0.5, 10), shirtMat);
  chest.position.y = 0.25;
  torso.add(chest);
  // 髋部
  const hip = new THREE.Mesh(new THREE.CylinderGeometry(0.132, 0.12, 0.16, 10), pantsMat);
  hip.position.y = 0.01;
  torso.add(hip);

  // 围裙
  if (apron !== null) {
    const apronMat = mat(apron, { roughness: 0.8 });
    const ap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.46, 0.03), apronMat);
    ap.position.set(0, 0.2, 0.132);
    torso.add(ap);
    const bib = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.17, 0.02), apronMat);
    bib.position.set(0, 0.44, 0.132);
    torso.add(bib);
    // 围裙上的名牌
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, 0.05),
      new THREE.MeshBasicMaterial({ color: accent })
    );
    badge.position.set(0, 0.42, 0.146);
    torso.add(badge);
  }

  // 领口
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, 0.07, 8), shirtMat);
  collar.position.y = 0.52;
  torso.add(collar);

  /* ------------------------------------------------------------ 头 */
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.09, 8), skinMat);
  neck.position.y = 0.55;
  torso.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.y = 0.66;
  torso.add(headGroup);

  const headR = 0.128;
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 12, 10), skinMat);
  head.scale.set(1, 1.08, 0.98);
  headGroup.add(head);

  // 头发（注意别盖住脸：θ 只到 0.44π，后脑勺单独一圈）
  const hairGroup = new THREE.Group();
  if (hairStyle === 'short') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(headR * 1.06, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.44),
      hairMat
    );
    cap.position.y = 0.006;
    hairGroup.add(cap);
    const back = new THREE.Mesh(
      new THREE.SphereGeometry(headR * 1.04, 12, 8, Math.PI, Math.PI, 0, Math.PI * 0.72),
      hairMat
    );
    back.position.y = 0.004;
    hairGroup.add(back);
    const bang = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.045, 0.03), hairMat);
    bang.position.set(0, headR * 0.74, headR * 0.84);
    bang.rotation.x = -0.3;
    hairGroup.add(bang);
  } else if (hairStyle === 'bob') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(headR * 1.07, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.44),
      hairMat
    );
    hairGroup.add(cap);
    const back = new THREE.Mesh(
      new THREE.SphereGeometry(headR * 1.06, 12, 8, Math.PI, Math.PI, 0, Math.PI * 0.85),
      hairMat
    );
    hairGroup.add(back);
    // 两鬓垂下来
    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.1, 3, 6), hairMat);
      side.position.set(sx * headR * 0.95, -0.045, -0.012);
      hairGroup.add(side);
    }
  } else {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(headR * 1.05, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.44),
      hairMat
    );
    hairGroup.add(cap);
  }
  headGroup.add(hairGroup);

  const face = buildFace(headGroup, headR);

  /* ------------------------------------------------------------ 手臂 */
  const armGroups = {};
  for (const sx of [-1, 1]) {
    const key = sx < 0 ? 'left' : 'right';
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.175, 0.5, 0); // 肩关节
    torso.add(pivot);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.3, 3, 8), shirtMat);
    upper.position.y = -0.18;
    pivot.add(upper);
    // 前臂
    const fore = new THREE.Group();
    fore.position.y = -0.36;
    pivot.add(fore);
    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.037, 0.22, 3, 8), skinMat);
    forearm.position.y = -0.12;
    fore.add(forearm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), skinMat);
    hand.position.y = -0.25;
    fore.add(hand);
    armGroups[key] = { pivot, fore, hand };

    // 默认站姿：手臂微微外展
    pivot.rotation.z = sx * 0.08;
    pivot.rotation.x = 0.04;
    fore.rotation.x = -0.12;
  }

  body.scale.setScalar(scale);

  /* ------------------------------------------------- 动画状态机 */
  const state = {
    t: Math.random() * 10,
    lookTarget: null,
    yaw: 0,
    nod: 0,
    scan: 0, // 0..1 扫码动作进度
    wave: 0,
    talking: false,
    mode: 'idle',
  };

  function update(dt) {
    state.t += dt;

    // 呼吸
    const breath = Math.sin(state.t * 1.8) * 0.008;
    torso.position.y = 0.79 + breath * 0.4;
    torso.scale.y = 1 + breath;

    // 面向目标
    if (state.lookTarget) {
      const dx = state.lookTarget.x - root.position.x;
      const dz = state.lookTarget.z - root.position.z;
      const targetYaw = Math.atan2(dx, dz);
      let d = targetYaw - state.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      state.yaw += d * Math.min(1, dt * 3.2);
      root.rotation.y = state.yaw;
    }

    // 头部微动 + 点头
    state.nod = Math.max(0, state.nod - dt * 1.6);
    const nodA = Math.sin((1 - state.nod) * Math.PI) * 0.22 * (state.nod > 0 ? 1 : 0);
    headGroup.rotation.x = nodA + Math.sin(state.t * 1.1) * 0.03;
    headGroup.rotation.y = Math.sin(state.t * 0.7) * 0.08;

    // 说话：头部轻点 + 嘴动
    if (state.talking) {
      headGroup.rotation.x += Math.sin(state.t * 9) * 0.012;
      face.mouth.scale.y = 0.45 + Math.abs(Math.sin(state.t * 13)) * 0.35;
    } else {
      face.mouth.scale.y += (0.45 - face.mouth.scale.y) * Math.min(1, dt * 8);
    }

    // 扫码：右臂抬起→向下扫
    if (state.scan > 0) {
      state.scan = Math.max(0, state.scan - dt * 0.9);
      const p = 1 - state.scan; // 0→1
      const phase = Math.sin(p * Math.PI);
      armGroups.right.pivot.rotation.x = -1.15 * phase;
      armGroups.right.fore.rotation.x = -0.5 * phase;
      armGroups.right.pivot.rotation.z = 0.1 * phase;
    } else {
      // 待机手臂
      const sway = Math.sin(state.t * 1.4) * 0.025;
      armGroups.left.pivot.rotation.x = 0.04 + sway;
      armGroups.right.pivot.rotation.x = 0.04 - sway;
      armGroups.left.fore.rotation.x = -0.12;
      armGroups.right.fore.rotation.x = -0.12;
      armGroups.right.pivot.rotation.z = -0.08;
    }

    // 打招呼（挥手）
    if (state.wave > 0) {
      state.wave = Math.max(0, state.wave - dt * 0.6);
      const w = Math.sin(state.t * 9) * 0.35 * Math.min(1, state.wave * 2);
      armGroups.left.pivot.rotation.x = -1.6 + w * 0.3;
      armGroups.left.pivot.rotation.z = 0.35 + w;
    }

    // 双腿轻微交替
    const wf = Math.sin(state.t * 1.2) * 0.01;
    legs.rotation.x = wf;
  }

  return {
    root,
    body,
    parts: { headGroup, torso, legs, armGroups, face },
    state,
    update,
    setLookTarget(v) {
      state.lookTarget = v;
    },
    nod() {
      state.nod = 1;
    },
    scanOnce() {
      state.scan = 1;
    },
    waveOnce() {
      state.wave = 1;
    },
    setTalking(v) {
      state.talking = v;
    },
    get position() {
      return root.position;
    },
  };
}

/** 店员预设 */
export function buildClerk(pos = new THREE.Vector3(3.9, 0.02, -5.55)) {
  const c = buildCharacter({
    skin: 0xeed0b4,
    hair: 0x241e20,
    shirt: 0xf5f5ee,
    pants: 0x2a2f38,
    apron: 0x1f5a45,
    accent: 0x8ff0c8,
    hairStyle: 'bob',
    scale: 1.0,
  });
  c.root.position.copy(pos);
  c.root.rotation.y = 0;
  return c;
}

/** 顾客预设 */
export function buildCustomer(pos = new THREE.Vector3(-0.5, 0.02, -8.5)) {
  const c = buildCharacter({
    skin: 0xe0bb9c,
    hair: 0x2e2118,
    shirt: 0x3a4450,
    pants: 0x262b33,
    apron: null,
    hairStyle: 'short',
    scale: 1.0,
  });
  c.root.position.copy(pos);
  return c;
}
