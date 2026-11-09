// 店内固定装置：收银台、POS、关东煮、热食柜、杂志架、购物篮、自动门
import * as THREE from 'three';
import { glowTexture, softShadowTexture, posterTexture } from './textures.js';

const SHOP_X1 = 6.5;
const SHOP_ZBACK = -14.6;

function box(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/* --------------------------------------------------- 顾客显示屏画布 */
function makeDisplay() {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 192;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  let last = '';
  const draw = (lines, total) => {
    ctx.fillStyle = '#0a0d10';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#7ef2c0';
    ctx.font = '700 30px "Yu Gothic","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.slice(-4).forEach((ln, i) => {
      ctx.fillStyle = 'rgba(126,242,192,0.78)';
      ctx.fillText(ln, 18, 16 + i * 34);
    });
    ctx.fillStyle = '#fff3c4';
    ctx.font = '800 52px "Yu Gothic","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${total}円`, c.width - 18, c.height - 76);
    ctx.font = '500 22px "Yu Gothic","Microsoft YaHei",sans-serif';
    ctx.fillStyle = 'rgba(255,243,196,0.6)';
    ctx.fillText('合计', c.width - 18, c.height - 28);
    tex.needsUpdate = true;
  };
  draw(['欢迎光临'], 0);
  return { canvas: c, ctx, tex, draw };
}

/* --------------------------------------------------------- 关东煮锅 */
function buildOden(parent, x, y, z) {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xb9bfc4, roughness: 0.28, metalness: 0.85 });
  const broth = new THREE.MeshStandardMaterial({ color: 0x6b4218, roughness: 0.18, metalness: 0.1 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.24, 0.16, 20, 1, true), steel);
  pot.position.y = 0.08;
  g.add(pot);
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 20), steel);
  bottom.position.y = 0.01;
  g.add(bottom);
  const surface = new THREE.Mesh(new THREE.CircleGeometry(0.238, 20), broth);
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 0.13;
  g.add(surface);
  // 隔板
  for (const dx of [-0.08, 0.08]) {
    const div = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.13, 0.44), steel);
    div.position.set(dx, 0.075, 0);
    g.add(div);
  }
  // 串：鱼丸 / 萝卜 / 鸡蛋 / 福袋
  const skewerMat = new THREE.MeshStandardMaterial({ color: 0xd8c8a8, roughness: 0.8 });
  const items = [
    { r: 0.032, color: 0xe0c9a0, y: 0.15 },
    { r: 0.038, color: 0xf0ead8, y: 0.16 },
    { r: 0.026, color: 0xf2e8c8, y: 0.15 },
    { r: 0.03, color: 0xc89a5a, y: 0.16 },
    { r: 0.034, color: 0xe8d6b0, y: 0.16 },
  ];
  let i = 0;
  for (const sx of [-0.14, 0, 0.14]) {
    for (const sz of [-0.1, 0.08]) {
      const it = items[i % items.length];
      i++;
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.3, 5), skewerMat);
      stick.position.set(sx, 0.2, sz);
      g.add(stick);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(it.r, 10, 8), new THREE.MeshStandardMaterial({ color: it.color, roughness: 0.6 }));
      ball.position.set(sx, it.y, sz);
      g.add(ball);
    }
  }
  // 锅盖
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.012, 20), steel);
  lid.position.set(0.3, 0.02, -0.18);
  lid.rotation.z = 0.06;
  g.add(lid);

  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/* ------------------------------------------------------ 烤肠机 / 热食 */
function buildHotCase(parent, x, z) {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0xcfd3d6, roughness: 0.38, metalness: 0.45 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xcfe4ee, transparent: true, opacity: 0.16, roughness: 0.05,
    metalness: 0, side: THREE.DoubleSide, depthWrite: false,
  });
  // 柜体
  box(1.0, 0.75, 0.55, body, 0, 0.375, 0, g);
  // 玻璃罩
  const gs = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.4, 0.5), glass);
  gs.position.set(0, 0.95, 0);
  g.add(gs);
  // 内胆热光
  const hotLight = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.04), new THREE.MeshBasicMaterial({ color: 0xffb35a }));
  hotLight.rotation.x = Math.PI / 2;
  hotLight.position.set(0, 0.76, 0);
  g.add(hotLight);
  // 烤肠滚轮
  const rollerMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a4, roughness: 0.3, metalness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 8), rollerMat);
    r.rotation.z = Math.PI / 2;
    r.position.set(0, 0.82, -0.15 + i * 0.15);
    g.add(r);
  }
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.16, 3, 6), new THREE.MeshStandardMaterial({ color: 0xc2492a, roughness: 0.55 }));
    s.rotation.z = Math.PI / 2;
    s.position.set(-0.4 + (i % 3) * 0.32, 0.855, -0.15 + Math.floor(i / 3) * 0.15);
    g.add(s);
  }
  // 顶灯
  box(0.98, 0.04, 0.52, new THREE.MeshBasicMaterial({ color: 0xfff0d8 }), 0, 1.16, 0, g);
  g.position.set(x, 1.02, z);
  parent.add(g);
  return g;
}

/* ---------------------------------------------------------- 杂志架 */
function buildMagazineRack(parent, x, z) {
  const g = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.4, metalness: 0.55 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a7358, roughness: 0.7 });

  box(0.5, 0.9, 2.2, wood, 0, 0.45, 0, g);
  for (let lvl = 0; lvl < 3; lvl++) {
    const y = 0.28 + lvl * 0.3;
    box(0.55, 0.03, 2.2, frame, 0, y, 0, g);
    for (let i = 0; i < 5; i++) {
      const mag = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.24, 0.17),
        new THREE.MeshStandardMaterial({ map: posterTexture(i % 3), roughness: 0.75 })
      );
      mag.position.set(0.26, y + 0.14, -0.9 + i * 0.45);
      mag.rotation.z = -0.18;
      g.add(mag);
    }
  }
  g.position.set(x, 0.02, z);
  parent.add(g);
  return g;
}

/* ------------------------------------------------------- 购物篮堆 */
function buildBaskets(parent, x, z) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xc23a2e, roughness: 0.5, metalness: 0.05 });
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.32), mat);
    b.position.set(0, 0.1 + i * 0.1, 0);
    b.rotation.y = 0.04 * i;
    g.add(b);
  }
  g.position.set(x, 0.02, z);
  parent.add(g);
  return g;
}

/* ---------------------------------------------------------- 复印机 */
function buildCopier(parent, x, z) {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0xd4d8da, roughness: 0.45, metalness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2e32, roughness: 0.5 });
  box(0.9, 1.0, 0.7, body, 0, 0.5, 0, g);
  box(1.0, 0.06, 0.76, dark, 0, 1.03, 0, g);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshBasicMaterial({ color: 0x1b2a36 }));
  top.rotation.x = -Math.PI / 2;
  top.position.set(0, 1.07, 0);
  g.add(top);
  g.position.set(x, 0.02, z);
  parent.add(g);
  return g;
}

/* ------------------------------------------------------------ 主构建 */
export function buildFixtures() {
  const group = new THREE.Group();
  const colliders = [];
  const interactables = [];
  const display = makeDisplay();

  const matCounter = new THREE.MeshStandardMaterial({ color: 0x6d5844, roughness: 0.55, metalness: 0.05 });
  const matCounterTop = new THREE.MeshStandardMaterial({ color: 0xdfe2e0, roughness: 0.22, metalness: 0.25 });
  const matDark = new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.45, metalness: 0.4 });
  const matMetal = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.3, metalness: 0.85 });
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xe8e8e2, roughness: 0.6 });
  const matRed = new THREE.MeshStandardMaterial({ color: 0xc23a2e, roughness: 0.5 });

  /* ------------------------------------------------------- 收银台 */
  const cashGroup = new THREE.Group();
  const CZ = -4.65; // 柜台中心 z
  const CY = 1.0;
  box(3.35, CY, 0.78, matCounter, 4.2, CY / 2, CZ, cashGroup);
  box(3.5, 0.06, 0.92, matCounterTop, 4.2, CY + 0.03, CZ, cashGroup);
  // 柜台前沿的亮条
  box(3.4, 0.05, 0.03, new THREE.MeshBasicMaterial({ color: 0x8ff0c8 }), 4.2, 0.86, CZ + 0.4, cashGroup);

  // 收银机（底座 + 双屏）
  box(0.42, 0.1, 0.3, matDark, 3.35, CY + 0.09, CZ - 0.08, cashGroup);
  const stand = box(0.12, 0.32, 0.1, matMetal, 3.35, CY + 0.26, CZ - 0.1, cashGroup);
  // 店员侧的屏
  const clerkScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), new THREE.MeshBasicMaterial({ color: 0x1b2f3a }));
  clerkScreen.position.set(3.35, CY + 0.44, CZ - 0.16);
  clerkScreen.rotation.y = Math.PI;
  cashGroup.add(clerkScreen);
  // 顾客侧显示屏（会更新）
  const displayMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.21),
    new THREE.MeshBasicMaterial({ map: display.tex })
  );
  displayMesh.position.set(3.35, CY + 0.36, CZ + 0.3);
  cashGroup.add(displayMesh);
  const dg = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture(), color: 0x7ef2c0, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  dg.scale.set(0.9, 0.6, 1);
  dg.position.set(3.35, CY + 0.36, CZ + 0.34);
  cashGroup.add(dg);

  // 扫码枪
  const gun = new THREE.Group();
  box(0.05, 0.05, 0.14, matDark, 0, 0, 0, gun);
  box(0.05, 0.1, 0.05, matDark, 0, -0.05, -0.03, gun);
  const gunTip = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
  gunTip.position.set(0, 0.001, 0.071);
  gun.add(gunTip);
  gun.position.set(3.72, CY + 0.09, CZ + 0.14);
  gun.rotation.set(0.5, 0.3, 0);
  cashGroup.add(gun);

  // 找零盘
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 16), matDark);
  tray.position.set(3.95, CY + 0.07, CZ + 0.16);
  cashGroup.add(tray);
  // 硬币堆
  for (let i = 0; i < 5; i++) {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.004, 8), new THREE.MeshStandardMaterial({ color: 0xc9a860, roughness: 0.3, metalness: 0.8 }));
    coin.position.set(3.93 + (i % 3) * 0.02, CY + 0.085 + i * 0.005, CZ + 0.13 + Math.floor(i / 3) * 0.02);
    cashGroup.add(coin);
  }

  // 小票机
  box(0.16, 0.2, 0.14, matWhite, 4.75, CY + 0.18, CZ - 0.08, cashGroup);
  const receiptPaper = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.12), new THREE.MeshBasicMaterial({ color: 0xf7f7f2 }));
  receiptPaper.position.set(4.75, CY + 0.34, CZ - 0.02);
  cashGroup.add(receiptPaper);

  // 关东煮
  buildOden(cashGroup, 5.35, CY + 0.06, CZ - 0.02);
  // 保温柜
  buildHotCase(cashGroup, 4.6, CZ - 0.75);
  cashGroup.position.y = 0.02;
  group.add(cashGroup);

  // 柜台碰撞
  colliders.push(
    new THREE.Box3(new THREE.Vector3(2.5, 0, CZ - 0.5), new THREE.Vector3(5.95, CY + 0.1, CZ + 0.5))
  );
  colliders.push(
    new THREE.Box3(new THREE.Vector3(4.05, 0, -5.85), new THREE.Vector3(5.15, 1.5, -5.05))
  );

  // 收银台交互点
  interactables.push({
    object: cashGroup, kind: 'checkout', label: '结账', hint: '按 E', point: new THREE.Vector3(4.2, 1.48, -4.3),
  });

  // 收银台区域亮一点（照亮店员）
  const counterLight = new THREE.PointLight(0xffeed2, 5.5, 7, 2);
  counterLight.position.set(4.0, 2.55, -5.1);
  group.add(counterLight);

  // 柜台下的杂物（纸箱、拖把）
  const cartonMat = new THREE.MeshStandardMaterial({ color: 0xb99a6a, roughness: 0.9 });
  box(0.5, 0.36, 0.4, cartonMat, 5.7, 0.2, -5.9, group);
  box(0.44, 0.3, 0.36, cartonMat, 5.75, 0.52, -5.95, group);

  /* --------------------------------------------------- 杂志架（窗边） */
  buildMagazineRack(group, -6.05, -4.7);
  colliders.push(new THREE.Box3(new THREE.Vector3(-6.35, 0, -5.85), new THREE.Vector3(-5.7, 1.0, -3.55)));
  interactables.push({
    object: group.children[group.children.length - 1], kind: 'magazine', label: '翻翻杂志', hint: '',
    point: new THREE.Vector3(-5.9, 1.4, -4.7),
  });

  /* ------------------------------------------------------ 购物篮堆 */
  buildBaskets(group, 2.15, -3.85);
  colliders.push(new THREE.Box3(new THREE.Vector3(1.9, 0, -4.05), new THREE.Vector3(2.4, 0.7, -3.65)));

  /* ---------------------------------------------------- 后墙复印机 */
  buildCopier(group, 5.1, -13.9);
  colliders.push(new THREE.Box3(new THREE.Vector3(4.6, 0, -14.3), new THREE.Vector3(5.6, 1.1, -13.5)));

  /* -------------------------------------------------------- 自动门 */
  const doorGroup = new THREE.Group();
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xc8e2ec, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.14,
    envMapIntensity: 1.8, side: THREE.DoubleSide, depthWrite: false,
  });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x5a6066, roughness: 0.3, metalness: 0.8 });
  const doorW = 1.22;
  const doorH = 2.42;
  const makePanel = (dir) => {
    const p = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(doorW - 0.08, doorH - 0.1), glassMat);
    glass.position.set(0, doorH / 2, 0);
    p.add(glass);
    // 边框
    box(0.05, doorH, 0.06, frameMat, -doorW / 2 + 0.03, doorH / 2, 0, p);
    box(0.05, doorH, 0.06, frameMat, doorW / 2 - 0.03, doorH / 2, 0, p);
    box(doorW, 0.05, 0.06, frameMat, 0, doorH - 0.02, 0, p);
    box(doorW, 0.06, 0.06, frameMat, 0, 0.03, 0, p);
    // 拉手
    box(0.03, 0.7, 0.03, frameMat, -dir * (doorW / 2 - 0.16), 1.2, 0.05, p);
    return p;
  };
  const panelL = makePanel(1);
  panelL.position.set(-0.31, 0, 0);
  const panelR = makePanel(-1);
  panelR.position.set(0.31, 0, 0);
  doorGroup.add(panelL, panelR);
  doorGroup.position.set(0.35, 0.02, -3.38);
  group.add(doorGroup);

  // 门内的地垫
  const mat = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x2e3336, roughness: 0.95 })
  );
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(0.35, 0.025, -4.05);
  group.add(mat);

  /* -------------------------------------------------------- 出口风口 */
  // 门口上方的「欢迎光临」电子门铃
  box(0.5, 0.16, 0.1, matDark, 0.35, 2.62, -3.55, group);

  // 自动门开合状态
  const doorState = { open: 0, target: 0 };
  const api = {
    display,
    updateDoor(dt, playerPos) {
      const near = playerPos.z > -6.2 && playerPos.z < -2.0 && Math.abs(playerPos.x - 0.35) < 2.6;
      doorState.target = near ? 1 : 0;
      doorState.open += (doorState.target - doorState.open) * Math.min(1, dt * 6);
      const slide = doorState.open * 0.72;
      panelL.position.x = -0.31 - slide;
      panelR.position.x = 0.31 + slide;
    },
    get doorOpen() {
      return doorState.open;
    },
  };

  return { group, colliders, interactables, api };
}
