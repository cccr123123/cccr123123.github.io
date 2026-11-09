// 便利店外壳：建筑、玻璃立面、招牌灯箱、遮阳篷、侧招、门口杂物、撑伞的人
import * as THREE from 'three';
import {
  signTexture,
  coffeeSignTexture,
  posterTexture,
  awningTexture,
  glowTexture,
  softShadowTexture,
} from './textures.js';

export const FACADE = {
  W: 13.2,
  frontZ: -3.4,
  backZ: -14.6,
  h: 4.6,
  sill: 0.55,
  head: 3.15,
  doorTop: 2.42,
  doorL: -1.02,
  doorR: 1.78,
};

function box(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function plane(w, h, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function glowSprite(map, color, size, opacity, x, y, z, parent) {
  const m = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map, color, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  m.scale.set(size, size, 1);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

const UMBRELLA = new THREE.Vector4(2.27, -1.07, 2.4, 0.7);

export function buildExterior() {
  const { W, frontZ, backZ, h, sill, head, doorTop } = FACADE;
  const group = new THREE.Group();
  const lights = [];
  const sprites = [];
  const colliders = [];

  const glow = glowTexture();
  const shadow = softShadowTexture();

  /* ------------------------------------------------------------ 材质 */
  const matWall = new THREE.MeshStandardMaterial({ color: 0x2b3037, roughness: 0.92, metalness: 0.05 });
  const matWallDark = new THREE.MeshStandardMaterial({ color: 0x181b20, roughness: 0.9, metalness: 0.1 });
  const matTrim = new THREE.MeshStandardMaterial({ color: 0x0d1014, roughness: 0.55, metalness: 0.55 });
  const matMetal = new THREE.MeshStandardMaterial({ color: 0x50565e, roughness: 0.42, metalness: 0.85 });
  const matSignBox = new THREE.MeshStandardMaterial({
    color: 0xd9dccf, emissive: 0xb9c4ac, emissiveIntensity: 0.16, roughness: 0.7,
  });
  const matIceWhite = new THREE.MeshBasicMaterial({ color: 0xeef6ff });
  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0xa9c9d4, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.11,
    envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false,
  });

  /* --------------------------------------------------------- 主体结构 */
  box(0.3, h, frontZ - backZ, matWall, -W / 2, h / 2, (frontZ + backZ) / 2, group);
  box(0.3, h, frontZ - backZ, matWall, W / 2, h / 2, (frontZ + backZ) / 2, group);
  box(W, h, 0.3, matWallDark, 0, h / 2, backZ, group);
  box(W + 0.5, 0.3, frontZ - backZ + 0.6, matWallDark, 0, h + 0.14, (frontZ + backZ) / 2, group);
  box(W + 0.7, 0.18, 0.5, matTrim, 0, h - 0.05, frontZ + 0.1, group);

  // 外墙的少量表情（分格线）
  for (let i = 0; i < 6; i++) {
    box(0.02, h - 0.4, 0.04, matTrim, -W / 2 + 0.16, h / 2, frontZ + (i / 6) * (frontZ - backZ) * 0.0 + 0.01, group);
  }

  /* ------------------------------------------------------- 前立面 */
  // 窗台墙（门洞两侧分段）
  box(-1.02 - -6.6, sill, 0.34, matWallDark, (-1.02 + -6.6) / 2, sill / 2, frontZ, group);
  box(6.6 - 1.78, sill, 0.34, matWallDark, (6.6 + 1.78) / 2, sill / 2, frontZ, group);
  // 上沿墙
  box(W, h - head, 0.34, matWall, 0, (head + h) / 2, frontZ, group);
  // 门洞上方
  box(FACADE.doorR - FACADE.doorL, head - doorTop, 0.34, matWallDark, (FACADE.doorL + FACADE.doorR) / 2, (doorTop + head) / 2, frontZ, group);

  // 立柱
  for (const mx of [-6.35, -1.02, 1.78, 6.35]) {
    box(0.26, head - sill, 0.4, matTrim, mx, (sill + head) / 2, frontZ, group);
  }
  // 窗顶横档
  box(W, 0.12, 0.4, matTrim, 0, head, frontZ, group);
  // 门框
  box(0.1, doorTop - sill, 0.16, matMetal, FACADE.doorL, (sill + doorTop) / 2, frontZ + 0.04, group);
  box(0.1, doorTop - sill, 0.16, matMetal, FACADE.doorR, (sill + doorTop) / 2, frontZ + 0.04, group);
  box(FACADE.doorR - FACADE.doorL + 0.1, 0.09, 0.16, matMetal, (FACADE.doorL + FACADE.doorR) / 2, doorTop, frontZ + 0.04, group);

  // 玻璃（左右橱窗）
  const glassW_L = -1.02 - -6.35 - 0.26;
  const glassW_R = 6.35 - 1.78 - 0.26;
  const glassH = head - sill - 0.12;
  const gl = plane(glassW_L, glassH, matGlass, (-1.02 - 6.35) / 2, (sill + head) / 2, frontZ, group);
  const gr = plane(glassW_R, glassH, matGlass, (1.78 + 6.35) / 2, (sill + head) / 2, frontZ, group);
  gl.renderOrder = 4;
  gr.renderOrder = 4;

  /* --------------------------------------------- 玻璃上的海报 / 贴纸 */
  const pA = new THREE.MeshStandardMaterial({ map: posterTexture(0), roughness: 0.82, metalness: 0, side: THREE.DoubleSide });
  const pB = new THREE.MeshStandardMaterial({ map: posterTexture(1), roughness: 0.82, metalness: 0, side: THREE.DoubleSide });
  const pC = new THREE.MeshStandardMaterial({ map: posterTexture(2), roughness: 0.82, metalness: 0, side: THREE.DoubleSide });
  const pa = plane(1.5, 2.1, pA, -4.35, 1.75, frontZ + 0.06, group);
  const pb = plane(1.5, 2.1, pB, -2.15, 1.75, frontZ + 0.06, group);
  const pc = plane(1.5, 2.1, pC, 4.55, 1.75, frontZ + 0.06, group);
  pa.renderOrder = 5;
  pb.renderOrder = 5;
  pc.renderOrder = 5;

  /* ------------------------------------------------------- 招牌灯箱 */
  const signW = W + 0.4;
  const signH = 1.4;
  const signY = h + 0.72;
  box(signW, signH, 0.55, matSignBox, 0, signY, frontZ + 0.1, group);
  const signFace = new THREE.Mesh(
    new THREE.PlaneGeometry(signW - 0.1, signH - 0.1),
    new THREE.MeshBasicMaterial({ map: signTexture(), color: 0xcfd8c8 })
  );
  signFace.position.set(0, signY, frontZ + 0.38);
  group.add(signFace);

  sprites.push(glowSprite(glow, 0xbaffd8, 7.5, 0.13, 0, signY, frontZ + 0.9, group));
  sprites.push(glowSprite(glow, 0x7ef2c0, 4.4, 0.14, -4.4, signY + 0.1, frontZ + 0.8, group));
  sprites.push(glowSprite(glow, 0x7ef2c0, 4.4, 0.14, 4.4, signY + 0.1, frontZ + 0.8, group));

  // 招牌下方的「珈琲」挂招
  const sideSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 1.28, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.7 })
  );
  sideSign.position.set(5.6, 3.92, frontZ + 0.3);
  group.add(sideSign);
  const sideFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.64, 1.18),
    new THREE.MeshBasicMaterial({ map: coffeeSignTexture(), color: 0xd8d8d0 })
  );
  sideFace.position.set(5.6, 3.92, frontZ + 0.38);
  group.add(sideFace);
  box(0.035, 0.5, 0.035, matMetal, 5.38, 4.82, frontZ + 0.3, group);
  box(0.035, 0.5, 0.035, matMetal, 5.82, 4.82, frontZ + 0.3, group);
  sprites.push(glowSprite(glow, 0xffa64d, 2.2, 0.26, 5.6, 3.92, frontZ + 0.75, group));

  /* --------------------------------------------------------- 遮阳篷 */
  const awTex = awningTexture();
  const awMat = new THREE.MeshStandardMaterial({
    map: awTex, roughness: 0.88, side: THREE.DoubleSide,
    emissive: 0xffffff, emissiveMap: awTex, emissiveIntensity: 0.1,
  });
  const aw = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.1, 1.15), awMat);
  aw.position.set(0, 3.28, frontZ + 0.52);
  aw.rotation.x = 0.2;
  group.add(aw);
  const awSkirt = new THREE.Mesh(new THREE.PlaneGeometry(12.4, 0.26), awMat);
  awSkirt.position.set(0, 3.04, frontZ + 1.11);
  group.add(awSkirt);

  // 门口上方的灯管（照亮门前的雨）
  box(12.2, 0.05, 0.1, matIceWhite, 0, 3.06, frontZ + 0.26, group);
  box(12.2, 0.02, 0.26, new THREE.MeshBasicMaterial({ color: 0x30465c }), 0, 3.11, frontZ + 0.16, group);

  /* ------------------------------------------------ 门口的小物件 */
  const rnd = (a, b) => a + Math.random() * (b - a);
  // 伞架
  const matBasket = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.5, metalness: 0.7 });
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.75, 14, 1, true), matBasket);
  basket.position.set(2.35, 0.38, -2.65);
  group.add(basket);
  const basketBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 14), matBasket);
  basketBottom.position.set(2.35, 0.03, -2.65);
  group.add(basketBottom);
  const umbrellaMat = new THREE.MeshStandardMaterial({ color: 0x1d2b33, roughness: 0.7 });
  const umbrellaMat2 = new THREE.MeshStandardMaterial({ color: 0x5e2027, roughness: 0.7 });
  const umbrellaMat3 = new THREE.MeshStandardMaterial({ color: 0x2b3a2e, roughness: 0.7 });
  // 塞得乱七八糟的伞
  for (let i = 0; i < 7; i++) {
    const mat = i % 3 === 0 ? umbrellaMat2 : i % 3 === 1 ? umbrellaMat : umbrellaMat3;
    const u = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.022, 1.05, 8), mat);
    u.position.set(2.35 + rnd(-0.14, 0.14), 0.72 + rnd(-0.05, 0.05), -2.65 + rnd(-0.14, 0.14));
    u.rotation.z = rnd(-0.26, 0.26);
    u.rotation.x = rnd(-0.16, 0.16);
    group.add(u);
  }
  // 掉在地上的一把伞
  {
    const u = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.022, 1.05, 8), umbrellaMat);
    u.position.set(1.65, 0.05, -2.15);
    u.rotation.set(Math.PI / 2, 0, 0.6);
    group.add(u);
  }

  // 垃圾桶
  const trashMat = new THREE.MeshStandardMaterial({ color: 0x2f3439, roughness: 0.6, metalness: 0.3 });
  const trash = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.24, 0.95, 16), trashMat);
  trash.position.set(-5.6, 0.475, -2.7);
  group.add(trash);
  box(0.56, 0.06, 0.56, matMetal, -5.6, 0.97, -2.7, group);

  // 门口的快递纸箱（堆得歪歪扭扭）
  const matCardboard = new THREE.MeshStandardMaterial({ color: 0xa8875a, roughness: 0.95 });
  for (const [x, z, s, rot] of [[-4.85, -2.35, 0.52, 0.35], [-4.45, -2.62, 0.42, -0.55], [-4.95, -2.78, 0.36, 0.9]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.72, s * 0.85), matCardboard);
    b.position.set(x, s * 0.36, z);
    b.rotation.y = rot;
    b.rotation.z = rnd(-0.08, 0.08);
    group.add(b);
  }

  // 被风吹到地上的传单
  const matPaper = new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.95 });
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(rnd(0.16, 0.26), rnd(0.2, 0.3)), matPaper);
    f.rotation.set(-Math.PI / 2 + rnd(-0.06, 0.06), 0, rnd(0, Math.PI * 2));
    f.position.set(rnd(-5.0, 5.0), 0.016, rnd(-2.9, -0.5));
    group.add(f);
  }

  // A 型广告牌
  const boardMat = new THREE.MeshStandardMaterial({ map: posterTexture(2), side: THREE.DoubleSide, roughness: 0.86 });
  const board = new THREE.Group();
  const b1 = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.0), boardMat);
  b1.position.set(0, 0.55, 0.08);
  b1.rotation.x = 0.16;
  board.add(b1);
  const b2 = b1.clone();
  b2.position.set(0, 0.55, -0.08);
  b2.rotation.x = -0.16;
  b2.rotation.y = Math.PI;
  board.add(b2);
  board.position.set(-3.95, 0, -2.45);
  group.add(board);

  // 门口的地面暖光
  const lightPool = new THREE.Mesh(
    new THREE.PlaneGeometry(10.5, 5.0),
    new THREE.MeshBasicMaterial({
      map: glow, color: 0xffd9a3, transparent: true, opacity: 0.17,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  lightPool.rotation.x = -Math.PI / 2;
  lightPool.position.set(0, 0.012, -0.9);
  lightPool.renderOrder = 2;
  group.add(lightPool);

  /* ------------------------------------------------- 檐下撑伞的人 */
  buildUmbrellaPerson(group, glow, shadow);

  /* ----------------------------------------------------------- 灯光 */
  // 招牌是自发光材质，不需要额外点光；只留一盏把门口地面和雨帘照亮
  const doorSpill = new THREE.PointLight(0xffd8a6, 14, 11, 2);
  doorSpill.position.set(0.6, 2.7, -2.8);
  group.add(doorSpill);
  lights.push(doorSpill);

  /* ------------------------------------------------------- 碰撞体 */
  // 建筑两侧与后墙（玩家不能穿墙）
  colliders.push(
    new THREE.Box3(new THREE.Vector3(-W / 2 - 0.4, 0, backZ), new THREE.Vector3(-W / 2 + 0.3, 3, frontZ)),
    new THREE.Box3(new THREE.Vector3(W / 2 - 0.3, 0, backZ), new THREE.Vector3(W / 2 + 0.4, 3, frontZ)),
    new THREE.Box3(new THREE.Vector3(-W / 2, 0, backZ - 0.4), new THREE.Vector3(W / 2, 3, backZ + 0.3))
  );
  // 门口杂物
  colliders.push(new THREE.Box3(new THREE.Vector3(2.05, 0, -2.94), new THREE.Vector3(2.65, 1.2, -2.36)));
  colliders.push(new THREE.Box3(new THREE.Vector3(-5.9, 0, -3.0), new THREE.Vector3(-5.3, 1.1, -2.4)));
  colliders.push(new THREE.Box3(new THREE.Vector3(-4.35, 0, -2.6), new THREE.Vector3(-3.55, 1.0, -2.3)));
  // 撑伞的人
  colliders.push(new THREE.Box3(new THREE.Vector3(1.75, 0, -1.3), new THREE.Vector3(2.4, 1.8, -0.7)));

  return { group, lights, sprites, colliders, UMBRELLA, FACADE };
}

/* ------------------------------------------- 檐下撑透明伞的人影 */
function buildUmbrellaPerson(parent, glow, shadowTex) {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x101317, roughness: 0.92 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.58, 4, 12), dark);
  body.position.y = 1.02;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), dark);
  head.position.y = 1.55;
  g.add(head);
  for (const dx of [-0.1, 0.1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.46, 3, 8), dark);
    leg.position.set(dx, 0.4, 0);
    g.add(leg);
  }
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.3, 3, 8), dark);
  arm.position.set(0.19, 1.26, 0.02);
  arm.rotation.z = -0.7;
  g.add(arm);

  const matRod = new THREE.MeshStandardMaterial({ color: 0x2b3036, roughness: 0.45, metalness: 0.6 });
  const UMB_Y = 1.72;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 1.4, 6), matRod);
  shaft.position.set(0.22, 1.6, 0.02);
  g.add(shaft);

  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0xcfe4f0, metalness: 0, roughness: 0.06, transparent: true, opacity: 0.34,
    side: THREE.DoubleSide, envMapIntensity: 2.6, depthWrite: false,
    emissive: 0x22303a, emissiveIntensity: 0.9,
  });
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 20, 9, 0, Math.PI * 2, 0, Math.PI * 0.44), canopyMat
  );
  canopy.position.set(0.22, UMB_Y, 0.02);
  canopy.renderOrder = 3;
  g.add(canopy);

  const ribMat = new THREE.MeshStandardMaterial({ color: 0x4a525c, roughness: 0.4, metalness: 0.55 });
  const apexY = UMB_Y + 0.6;
  const edgeY = UMB_Y + 0.6 * Math.cos(Math.PI * 0.44);
  const edgeR = 0.6 * Math.sin(Math.PI * 0.44);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const dir = new THREE.Vector3(edgeR * Math.cos(a), edgeY - apexY, edgeR * Math.sin(a)).normalize();
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.78, 4), ribMat);
    rib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    rib.position.set(0.22 + edgeR * 0.5 * Math.cos(a), (apexY + edgeY) / 2, 0.02 + edgeR * 0.5 * Math.sin(a));
    g.add(rib);
  }
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.1, 6), ribMat);
  tip.position.set(0.22, apexY + 0.04, 0.02);
  g.add(tip);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.59, 0.007, 5, 34), ribMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0.22, edgeY, 0.02);
  g.add(rim);

  const foot = new THREE.Mesh(
    new THREE.PlaneGeometry(1.25, 1.25),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.55, depthWrite: false })
  );
  foot.rotation.x = -Math.PI / 2;
  foot.position.set(0, 0.016, 0);
  foot.renderOrder = 1;
  g.add(foot);

  g.position.set(2.05, 0, -1.35);
  g.rotation.y = 0.3;
  parent.add(g);
  return g;
}
