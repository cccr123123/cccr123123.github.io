// 便利店本体：建筑、玻璃立面、店内陈列、招牌灯箱、门口杂物
import * as THREE from 'three';
import {
  signTexture,
  coffeeSignTexture,
  openSignTexture,
  posterTexture,
  shopFloorTexture,
  awningTexture,
  fridgeTexture,
  glowTexture,
  softShadowTexture,
} from './textures.js';

const W = 13.2;          // 店面宽
const FRONT_Z = -3.2;    // 前立面 z
const BACK_Z = -9.6;     // 后墙 z
const H = 4.6;           // 檐口高度
const SILL = 0.55;       // 窗台
const HEAD = 3.15;       // 窗顶

function box(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.matrixAutoUpdate = false;
  m.updateMatrix();
  parent.add(m);
  return m;
}

function plane(w, h, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.matrixAutoUpdate = false;
  m.updateMatrix();
  parent.add(m);
  return m;
}

function glowSprite(map, color, size, opacity, x, y, z, parent) {
  const m = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map,
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  m.scale.set(size, size, 1);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

export function buildStore() {
  const group = new THREE.Group();
  const lights = [];
  const sprites = [];

  const glow = glowTexture();
  const shadow = softShadowTexture();

  /* ------------------------------------------------------------ 材质 */
  const matWall = new THREE.MeshStandardMaterial({ color: 0x2b3037, roughness: 0.92, metalness: 0.05 });
  const matWallDark = new THREE.MeshStandardMaterial({ color: 0x181b20, roughness: 0.9, metalness: 0.1 });
  const matTrim = new THREE.MeshStandardMaterial({ color: 0x0d1014, roughness: 0.55, metalness: 0.55 });
  const matMetal = new THREE.MeshStandardMaterial({ color: 0x50565e, roughness: 0.42, metalness: 0.85 });
  const matCeiling = new THREE.MeshStandardMaterial({ color: 0x9aa096, roughness: 0.9 });
  const matSignBox = new THREE.MeshStandardMaterial({
    color: 0xd9dccf,
    emissive: 0xb9c4ac,
    emissiveIntensity: 0.16,
    roughness: 0.7,
  });
  const matIceWhite = new THREE.MeshBasicMaterial({ color: 0xeef6ff });
  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0xa9c9d4,
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.13,
    envMapIntensity: 1.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  /* --------------------------------------------------------- 主体结构 */
  // 地面（店内）
  const floorMat = new THREE.MeshStandardMaterial({ map: shopFloorTexture(), roughness: 0.28, metalness: 0.05, envMapIntensity: 0.7 });
  const shopFloor = new THREE.Mesh(new THREE.PlaneGeometry(W, BACK_Z * -1 - FRONT_Z * -1), floorMat);
  shopFloor.rotation.x = -Math.PI / 2;
  shopFloor.position.set(0, 0.03, (FRONT_Z + BACK_Z) / 2);
  group.add(shopFloor);

  // 天花板
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, FRONT_Z - BACK_Z), matCeiling);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, H - 0.05, (FRONT_Z + BACK_Z) / 2);
  group.add(ceil);

  // 左右后墙
  box(0.28, H, FRONT_Z - BACK_Z, matWall, -W / 2, H / 2, (FRONT_Z + BACK_Z) / 2, group);
  box(0.28, H, FRONT_Z - BACK_Z, matWall, W / 2, H / 2, (FRONT_Z + BACK_Z) / 2, group);
  box(W, H, 0.3, matWallDark, 0, H / 2, BACK_Z, group);

  // 屋顶
  box(W + 0.5, 0.28, FRONT_Z - BACK_Z + 0.6, matWallDark, 0, H + 0.13, (FRONT_Z + BACK_Z) / 2, group);
  // 檐口
  box(W + 0.7, 0.18, 0.5, matTrim, 0, H - 0.05, FRONT_Z + 0.1, group);

  /* ------------------------------------------------------- 前立面 */
  // 窗台墙 + 上部墙
  box(W, SILL, 0.3, matWallDark, 0, SILL / 2, FRONT_Z, group);
  box(W, H - HEAD, 0.3, matWall, 0, (HEAD + H) / 2, FRONT_Z, group);

  // 立柱：左侧 / 门左 / 门右 / 右侧
  const mullions = [-6.35, -1.02, 1.78, 6.35];
  for (const mx of mullions) {
    box(0.26, HEAD - SILL, 0.34, matTrim, mx, (SILL + HEAD) / 2, FRONT_Z, group);
  }
  // 横档（窗顶部）
  box(W, 0.12, 0.34, matTrim, 0, HEAD, FRONT_Z, group);

  // 玻璃：左窗、右窗、门
  const glassL = plane(-1.02 - -6.35 - 0.26, HEAD - SILL - 0.12, matGlass, (-1.02 - 6.35) / 2 + 0.0, (SILL + HEAD) / 2, FRONT_Z, group);
  const glassR = plane(6.35 - 1.78 - 0.26, HEAD - SILL - 0.12, matGlass, (1.78 + 6.35) / 2, (SILL + HEAD) / 2, FRONT_Z, group);
  const glassDoorL = plane(1.25, HEAD - SILL - 0.12, matGlass, -0.27, (SILL + HEAD) / 2, FRONT_Z + 0.01, group);
  const glassDoorR = plane(1.25, HEAD - SILL - 0.12, matGlass, 1.02, (SILL + HEAD) / 2, FRONT_Z + 0.01, group);
  glassL.renderOrder = 3;
  glassR.renderOrder = 3;
  glassDoorL.renderOrder = 3;
  glassDoorR.renderOrder = 3;

  // 门框
  box(0.1, HEAD - SILL, 0.14, matMetal, -0.34, (SILL + HEAD) / 2, FRONT_Z + 0.02, group);
  box(0.1, HEAD - SILL, 0.14, matMetal, 1.12, (SILL + HEAD) / 2, FRONT_Z + 0.02, group);
  box(1.36, 0.08, 0.12, matMetal, -0.34, 2.42, FRONT_Z + 0.02, group);
  box(1.36, 0.08, 0.12, matMetal, 1.12, 2.42, FRONT_Z + 0.02, group);
  // 门把手
  box(0.06, 0.9, 0.06, matMetal, 0.04, 1.7, FRONT_Z + 0.06, group);
  box(0.06, 0.9, 0.06, matMetal, 0.74, 1.7, FRONT_Z + 0.06, group);

  // 门内挂着的 OPEN 灯牌
  const openSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.98, 0.49),
    new THREE.MeshBasicMaterial({ map: openSignTexture(), color: 0xcfcfc6, side: THREE.DoubleSide })
  );
  openSign.position.set(0.4, 2.6, FRONT_Z - 0.16);
  group.add(openSign);
  box(0.014, 0.2, 0.014, matTrim, 0.0, 2.9, FRONT_Z - 0.16, group);
  box(0.014, 0.2, 0.014, matTrim, 0.8, 2.9, FRONT_Z - 0.16, group);

  /* --------------------------------------------- 玻璃上的海报 / 贴纸 */
  const posterA = new THREE.MeshStandardMaterial({ map: posterTexture(0), roughness: 0.82, metalness: 0, side: THREE.DoubleSide });
  const posterB = new THREE.MeshStandardMaterial({ map: posterTexture(1), roughness: 0.82, metalness: 0, side: THREE.DoubleSide });
  const posterC = new THREE.MeshStandardMaterial({ map: posterTexture(2), roughness: 0.82, metalness: 0, side: THREE.DoubleSide });
  const pA = plane(1.5, 2.1, posterA, -4.35, 1.75, FRONT_Z + 0.055, group);
  pA.renderOrder = 4;
  const pB = plane(1.5, 2.1, posterB, -2.15, 1.75, FRONT_Z + 0.055, group);
  pB.renderOrder = 4;
  const pC = plane(1.5, 2.1, posterC, 4.55, 1.75, FRONT_Z + 0.055, group);
  pC.renderOrder = 4;

  /* ------------------------------------------------------- 招牌灯箱 */
  const signW = W + 0.4;
  const signH = 1.4;
  const signY = H + 0.72;
  // 灯箱体
  const signBody = box(signW, signH, 0.55, matSignBox, 0, signY, FRONT_Z + 0.1, group);
  // 正面灯箱画面
  const signFace = new THREE.Mesh(
    new THREE.PlaneGeometry(signW - 0.1, signH - 0.1),
    new THREE.MeshBasicMaterial({ map: signTexture(), color: 0xcfd8c8 })
  );
  signFace.position.set(0, signY, FRONT_Z + 0.1 + 0.278);
  group.add(signFace);

  // 招牌光晕（雨雾散射）
  sprites.push(glowSprite(glow, 0xbaffd8, 7.5, 0.13, 0, signY, FRONT_Z + 0.9, group));
  sprites.push(glowSprite(glow, 0x7ef2c0, 4.4, 0.16, -4.4, signY + 0.1, FRONT_Z + 0.8, group));
  sprites.push(glowSprite(glow, 0x7ef2c0, 4.4, 0.16, 4.4, signY + 0.1, FRONT_Z + 0.8, group));
  // 灯箱背面在雨雾里的泛光
  sprites.push(glowSprite(glow, 0x9fe8c6, 13, 0.07, 0, signY, FRONT_Z - 0.8, group));

  // 侧招：挂在主招牌下方的「珈琲」小灯箱
  const sideSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 1.28, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.7 })
  );
  sideSign.position.set(5.6, 3.92, FRONT_Z + 0.26);
  group.add(sideSign);
  const sideFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.64, 1.18),
    new THREE.MeshBasicMaterial({ map: coffeeSignTexture(), color: 0xd8d8d0 })
  );
  sideFace.position.set(5.6, 3.92, FRONT_Z + 0.34);
  group.add(sideFace);
  // 两根吊杆
  box(0.035, 0.5, 0.035, matMetal, 5.38, 4.82, FRONT_Z + 0.26, group);
  box(0.035, 0.5, 0.035, matMetal, 5.82, 4.82, FRONT_Z + 0.26, group);
  sprites.push(glowSprite(glow, 0xffa64d, 2.2, 0.26, 5.6, 3.92, FRONT_Z + 0.7, group));

  /* --------------------------------------------------------- 遮阳篷 */
  const awTex = awningTexture();
  const awMat = new THREE.MeshStandardMaterial({
    map: awTex,
    roughness: 0.88,
    side: THREE.DoubleSide,
    emissive: 0xffffff,
    emissiveMap: awTex,
    emissiveIntensity: 0.1,
  });
  const aw = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.1, 1.15), awMat);
  aw.position.set(0, 3.28, FRONT_Z + 0.52);
  aw.rotation.x = 0.2;
  group.add(aw);
  // 前垂边（瀑布一样挂下来的一小截）
  const awSkirt = new THREE.Mesh(new THREE.PlaneGeometry(12.4, 0.26), awMat);
  awSkirt.position.set(0, 3.04, FRONT_Z + 1.11);
  group.add(awSkirt);

  // 门口上方的日光灯管（照亮门前的雨帘）
  box(12.2, 0.05, 0.1, matIceWhite, 0, 3.06, FRONT_Z + 0.26, group);
  box(12.2, 0.02, 0.26, new THREE.MeshBasicMaterial({ color: 0x30465c }), 0, 3.11, FRONT_Z + 0.16, group);

  /* ------------------------------------------------------ 店内陈列 */
  const interior = new THREE.Group();
  interior.position.set(0, 0, 0);
  group.add(interior);

  // 后墙冷柜（发光）
  const fridgeMat = new THREE.MeshBasicMaterial({ map: fridgeTexture(), color: 0x7c8f9c });
  const fridge = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 2.55), fridgeMat);
  fridge.position.set(-1.4, 1.95, BACK_Z + 0.17);
  interior.add(fridge);
  const fg = glowSprite(glow, 0xbfe6ff, 7, 0.16, -1.4, 1.95, BACK_Z + 0.6, interior);
  sprites.push(fg);

  // 货架（两排）
  const matShelf = new THREE.MeshStandardMaterial({ color: 0xb9bec4, roughness: 0.55, metalness: 0.35 });
  const matShelfFrame = new THREE.MeshStandardMaterial({ color: 0x7d858c, roughness: 0.45, metalness: 0.6 });
  const goodsGeo = new THREE.BoxGeometry(0.17, 0.3, 0.24);
  const goodsMat = new THREE.MeshStandardMaterial({ color: 0x787878, roughness: 0.55, metalness: 0.02 });
  const palette = [0xb85a44, 0x4a9e88, 0xc0a04c, 0x5480a8, 0xb87288, 0x8ab05c, 0xb05a62, 0x7a68b0, 0xc2bcae];

  const shelfRows = [
    { x: -3.6, z: -6.5, w: 4.4 },
    { x: -3.6, z: -5.1, w: 4.4 },
  ];
  const dummy = new THREE.Object3D();
  let goodsCount = 0;
  for (const row of shelfRows) goodsCount += 3 * Math.floor(row.w / 0.22);

  const goods = new THREE.InstancedMesh(goodsGeo, goodsMat, goodsCount);
  const color = new THREE.Color();
  let gi = 0;
  for (const row of shelfRows) {
    for (let level = 0; level < 3; level++) {
      const y = 0.55 + level * 0.5;
      // 层板
      box(row.w, 0.04, 0.5, matShelf, row.x, y, row.z, interior);
      // 立柱
      box(0.05, 2.0, 0.05, matShelfFrame, row.x - row.w / 2, 1.0, row.z - 0.22, interior);
      box(0.05, 2.0, 0.05, matShelfFrame, row.x - row.w / 2, 1.0, row.z + 0.22, interior);
      box(0.05, 2.0, 0.05, matShelfFrame, row.x + row.w / 2, 1.0, row.z - 0.22, interior);
      box(0.05, 2.0, 0.05, matShelfFrame, row.x + row.w / 2, 1.0, row.z + 0.22, interior);
      // 商品
      const n = Math.floor(row.w / 0.22);
      for (let i = 0; i < n; i++) {
        dummy.position.set(row.x - row.w / 2 + 0.14 + i * 0.22, y + 0.17, row.z + (Math.random() - 0.5) * 0.1);
        dummy.rotation.set(0, (Math.random() - 0.5) * 0.25, 0);
        dummy.scale.set(1, 0.8 + Math.random() * 0.5, 1);
        dummy.updateMatrix();
        goods.setMatrixAt(gi, dummy.matrix);
        color.setHex(palette[(Math.random() * palette.length) | 0]);
        goods.setColorAt(gi, color);
        gi++;
      }
    }
  }
  goods.count = gi;
  goods.instanceMatrix.needsUpdate = true;
  if (goods.instanceColor) goods.instanceColor.needsUpdate = true;
  interior.add(goods);

  // 收银台
  const matCounter = new THREE.MeshStandardMaterial({ color: 0x6b5344, roughness: 0.6 });
  const matCounterTop = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.3, metalness: 0.2 });
  box(3.4, 0.95, 1.1, matCounter, 3.3, 0.475, -5.2, interior);
  box(3.6, 0.07, 1.25, matCounterTop, 3.3, 0.98, -5.2, interior);
  // 收银机
  box(0.5, 0.34, 0.4, new THREE.MeshStandardMaterial({ color: 0x1b1e22, roughness: 0.45 }), 3.1, 1.18, -5.1, interior);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.22),
    new THREE.MeshBasicMaterial({ color: 0x6fd4ff })
  );
  screen.position.set(3.1, 1.2, -4.89);
  interior.add(screen);
  const screenGlow = glowSprite(glow, 0x6fd4ff, 1.2, 0.5, 3.1, 1.2, -4.85, interior);
  sprites.push(screenGlow);
  // 收银台小物
  box(0.22, 0.3, 0.22, new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.8 }), 4.4, 1.16, -5.15, interior);

  // 店员剪影（站在收银台后）
  const matPerson = new THREE.MeshStandardMaterial({ color: 0x131519, roughness: 0.95 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.72, 4, 10), matPerson);
  torso.position.set(3.35, 1.12, -6.15);
  interior.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 12), matPerson);
  head.position.set(3.35, 1.68, -6.12);
  interior.add(head);

  // 天花板灯管
  for (let i = 0; i < 4; i++) {
    const lz = -4.4 - i * 1.35;
    box(3.8, 0.05, 0.12, matIceWhite, -2.0, H - 0.14, lz, interior);
    box(1.9, 0.05, 0.12, matIceWhite, 4.2, H - 0.14, lz, interior);
  }

  // 门口地垫（店内）
  const matMat = new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.95 });
  const doormat = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.3), matMat);
  doormat.rotation.x = -Math.PI / 2;
  doormat.position.set(0.4, 0.045, -3.9);
  interior.add(doormat);

  /* ------------------------------------------------ 门口的小物件 */
  // 伞架
  const matBasket = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.5, metalness: 0.7 });
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.75, 14, 1, true), matBasket);
  basket.position.set(2.35, 0.38, -2.55);
  group.add(basket);
  const basketBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 14), matBasket);
  basketBottom.position.set(2.35, 0.03, -2.55);
  group.add(basketBottom);
  // 两把收起的伞（细长锥形）
  const umbrellaMat = new THREE.MeshStandardMaterial({ color: 0x1d2b33, roughness: 0.7 });
  const umbrellaMat2 = new THREE.MeshStandardMaterial({ color: 0x5e2027, roughness: 0.7 });
  for (let i = 0; i < 3; i++) {
    const u = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.022, 1.05, 8), i % 2 ? umbrellaMat2 : umbrellaMat);
    u.position.set(2.25 + i * 0.11, 0.72, -2.62 + (i % 2) * 0.09);
    u.rotation.z = 0.08 - i * 0.05;
    u.rotation.x = 0.05 * (i - 1);
    group.add(u);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 6, 10, Math.PI), matMetal);
    handle.position.set(2.25 + i * 0.11, 1.26, -2.62 + (i % 2) * 0.09);
    handle.rotation.y = Math.PI / 2;
    group.add(handle);
  }

  // 垃圾桶
  const trashMat = new THREE.MeshStandardMaterial({ color: 0x2f3439, roughness: 0.6, metalness: 0.3 });
  const trash = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.24, 0.95, 16), trashMat);
  trash.position.set(-5.6, 0.475, -2.6);
  group.add(trash);
  box(0.56, 0.06, 0.56, matMetal, -5.6, 0.97, -2.6, group);

  // A 型广告牌
  const signBoardMat = new THREE.MeshStandardMaterial({
    map: posterTexture(2),
    side: THREE.DoubleSide,
    roughness: 0.86,
    metalness: 0,
  });
  const board = new THREE.Group();
  const b1 = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.0), signBoardMat);
  b1.position.set(0, 0.55, 0.08);
  b1.rotation.x = 0.16;
  board.add(b1);
  const b2 = b1.clone();
  b2.position.set(0, 0.55, -0.08);
  b2.rotation.x = -0.16;
  b2.rotation.y = Math.PI;
  board.add(b2);
  board.position.set(-3.95, 0, -2.35);
  group.add(board);

  // 门口地面暖色光斑
  const lightPool = new THREE.Mesh(
    new THREE.PlaneGeometry(10.5, 5.0),
    new THREE.MeshBasicMaterial({
      map: glow,
      color: 0xffd9a3,
      transparent: true,
      opacity: 0.17,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  lightPool.rotation.x = -Math.PI / 2;
  lightPool.position.set(0, 0.012, -0.9);
  lightPool.renderOrder = 2;
  group.add(lightPool);

  /* ----------------------------------------------------------- 灯光 */
  const inLight = new THREE.PointLight(0xffeacb, 22, 22, 2);
  inLight.position.set(-0.6, 3.5, -6.4);
  lights.push(inLight);

  const coldLight = new THREE.PointLight(0xd6ecff, 9, 12, 2);
  coldLight.position.set(-2.2, 2.7, -8.2);
  lights.push(coldLight);

  const doorLight = new THREE.PointLight(0xffd8a6, 16, 10, 2);
  doorLight.position.set(0.6, 2.95, -2.5);
  lights.push(doorLight);

  const signLight = new THREE.PointLight(0xffeed6, 2.4, 9, 2);
  signLight.position.set(0, 5.1, -2.2);
  lights.push(signLight);

  for (const l of lights) group.add(l);

  // 檐下躲雨的人（透明伞）
  const stander = buildUmbrellaPerson(group, glow, shadow);
  return { group, lights, sprites, stander, W, H, FRONT_Z, UMBRELLA };
}

/* ------------------------------------------- 檐下撑透明伞的人影 */

const UMBRELLA = new THREE.Vector4(2.27, -1.07, 2.4, 0.7);

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

  // 举伞的手臂
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.3, 3, 8), dark);
  arm.position.set(0.19, 1.26, 0.02);
  arm.rotation.z = -0.7;
  g.add(arm);

  // 伞杆
  const matRod = new THREE.MeshStandardMaterial({ color: 0x2b3036, roughness: 0.45, metalness: 0.6 });
  const UMB_Y = 1.72;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 1.4, 6), matRod);
  shaft.position.set(0.22, 1.6, 0.02);
  g.add(shaft);

  // 透明塑料伞面
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0xcfe4f0,
    metalness: 0,
    roughness: 0.06,
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
    envMapIntensity: 2.6,
    depthWrite: false,
    emissive: 0x22303a,
    emissiveIntensity: 0.9,
  });
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 20, 9, 0, Math.PI * 2, 0, Math.PI * 0.44),
    canopyMat
  );
  canopy.position.set(0.22, UMB_Y, 0.02);
  canopy.renderOrder = 3;
  g.add(canopy);

  // 伞骨：从伞尖放射到伞缘
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

  // 伞尖
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.1, 6), ribMat);
  tip.position.set(0.22, apexY + 0.04, 0.02);
  g.add(tip);

  // 伞缘骨环
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.59, 0.007, 5, 34),
    new THREE.MeshStandardMaterial({ color: 0x4a525c, roughness: 0.4, metalness: 0.55 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0.22, UMB_Y + 0.6 * Math.cos(Math.PI * 0.44), 0.02);
  g.add(rim);

  // 脚下一小片暗影
  const foot = new THREE.Mesh(
    new THREE.PlaneGeometry(1.25, 1.25),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.55, depthWrite: false })
  );
  foot.rotation.x = -Math.PI / 2;
  foot.position.set(0, 0.016, 0);
  foot.renderOrder = 1;
  g.add(foot);

  g.position.set(2.05, 0, -1.02);
  g.rotation.y = 0.3;
  parent.add(g);
  return g;
}
