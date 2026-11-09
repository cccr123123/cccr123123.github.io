// 店内空间：地板、吊顶、灯管、四排双面货架 + 商品摆放
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GOODS, createGoodsMesh } from './goods.js';
import { shopFloorTexture, glowTexture, softShadowTexture, posterTexture, wallTexture, metalTexture, floorRoughTexture, normalFromHeight, wallHeight, metalHeight, floorHeight } from './textures.js';

export const SHOP = {
  x0: -6.5,
  x1: 6.5,
  zFront: -3.4,
  zBack: -14.6,
  h: 3.32,
  yFloor: 0.02,
};

/** 四条货架中心线（C 让开门口正对的位置） */
const ROWS = [
  { x: -4.6, left: 'drink', right: 'snack' },
  { x: -1.9, left: 'noodle', right: 'choco' },
  { x: 1.85, left: 'bread', right: 'snack2' },
  { x: 4.6, left: 'drink2', right: 'daily' },
];

const ROW_Z0 = -6.2;
const ROW_Z1 = -12.2;
const ROW_W = 1.08; // 两面板之间总宽
const ROW_H = 1.56;

function box(w, h, d, mat, x, y, z, parent) {
  // 统一用圆角盒：现实里没有绝对锋利的边，倒角后边缘会有真实高光
  const r = Math.min(0.012, Math.min(w, h, d) * 0.32);
  const geo = r > 0.0015 ? new RoundedBoxGeometry(w, h, d, 1, r) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function plane(w, h, mat, x, y, z, rx, ry, parent) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  if (rx !== undefined) m.rotation.x = rx;
  if (ry !== undefined) m.rotation.y = ry;
  parent.add(m);
  return m;
}

/** 价签条 */
function priceStripTexture() {
  const W = 512;
  const H = 64;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f6f4ee';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const prices = ['128円', '158円', '188円', '228円', '298円', '548円'];
  for (let i = 0; i < 8; i++) {
    const x = (i + 0.5) * (W / 8);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(i * (W / 8) + 2, 2, W / 8 - 4, H - 4);
    ctx.fillStyle = '#1b1b1b';
    ctx.font = '700 26px "Yu Gothic","Microsoft YaHei",sans-serif';
    ctx.fillText(prices[i % prices.length], x, H / 2 + 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(2, 1);
  return t;
}

/** 货架某一层该放哪些商品（轮询 + 打散，避免整层都一样） */
function pickGoods(pool, n) {
  const out = [];
  if (!pool.length) return out;
  let idx = (Math.random() * pool.length) | 0;
  for (let i = 0; i < n; i++) {
    out.push(pool[idx % pool.length]);
    idx++;
  }
  return out;
}

const POOLS = {
  drink: ['coffee_latte', 'tea_green', 'cola', 'water', 'milk', 'oj', 'sports', 'blackcoffee', 'soda', 'tea_black', 'energy'],
  drink2: ['water', 'tea_green', 'cola', 'milk', 'oj', 'soda', 'sports'],
  snack: ['chips_salt', 'chocolate', 'melonpan', 'chips_consomme', 'cookie', 'gum', 'mint', 'nuts', 'senbei', 'banana', 'apple'],
  snack2: ['chips_consomme', 'cookie', 'nuts', 'senbei', 'cheese', 'gum'],
  choco: ['chocolate', 'cookie', 'mint', 'gum', 'nuts'],
  noodle: ['cup_noodle_shoyu', 'cup_noodle_miso', 'pasta', 'curry'],
  daily: ['tissue', 'mask', 'battery', 'lighter', 'toothbrush'],
  bread: ['melonpan', 'sandwich_egg', 'burger', 'yogurt', 'pudding', 'bento_karaage'],
};

export function buildInterior() {
  const group = new THREE.Group();
  const colliders = [];
  const interactables = [];
  const lights = [];
  const shelfSlots = [];

  const glow = glowTexture();

  /* --------------------------------------------------------- 材质 */
  // 法线贴图：让表面有真实的凹凸起伏
  const wallNrm = normalFromHeight(wallHeight(), 256, 2.6);
  wallNrm.wrapS = wallNrm.wrapT = THREE.RepeatWrapping;
  wallNrm.repeat.set(2, 1);

  const metalNrm = normalFromHeight(metalHeight(), 256, 1.6);
  metalNrm.wrapS = metalNrm.wrapT = THREE.RepeatWrapping;
  metalNrm.repeat.set(2, 2);

  const floorNrm = normalFromHeight(floorHeight(), 256, 2.2);
  floorNrm.wrapS = floorNrm.wrapT = THREE.RepeatWrapping;
  floorNrm.repeat.set(4, 2);

  const matFloor = new THREE.MeshStandardMaterial({
    map: shopFloorTexture(),
    normalMap: floorNrm,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughnessMap: floorRoughTexture(),
    roughness: 0.34,
    metalness: 0.08,
    envMapIntensity: 1.1,
    color: 0xb9bdb4,
  });
  const matWall = new THREE.MeshStandardMaterial({
    map: wallTexture(),
    normalMap: wallNrm,
    normalScale: new THREE.Vector2(1.0, 1.0),
    color: 0xe9e7e2,
    roughness: 0.92,
    metalness: 0,
  });
  const matCeil = new THREE.MeshStandardMaterial({
    color: 0xd2cfc3,
    roughness: 0.92,
    emissive: 0x7a756a,
    emissiveIntensity: 0.55,
    side: THREE.DoubleSide,
  });
  const matShelf = new THREE.MeshStandardMaterial({
    map: metalTexture(),
    normalMap: metalNrm,
    normalScale: new THREE.Vector2(0.55, 0.55),
    color: 0x9aa0a8,
    roughness: 0.38,
    metalness: 0.45,
    envMapIntensity: 1.25,
  });
  const matShelfFrame = new THREE.MeshStandardMaterial({
    map: metalTexture(),
    normalMap: metalNrm,
    normalScale: new THREE.Vector2(0.5, 0.5),
    color: 0x828890,
    roughness: 0.3,
    metalness: 0.82,
    envMapIntensity: 1.45,
  });
  const matBase = new THREE.MeshStandardMaterial({ color: 0x4a4f52, roughness: 0.55, metalness: 0.3 });
  const matTube = new THREE.MeshStandardMaterial({
    color: 0xd8d5c8,
    emissive: 0xfff4dc,
    emissiveIntensity: 1.1,
    roughness: 0.6,
  });
  const matPrice = new THREE.MeshBasicMaterial({ map: priceStripTexture() });

  /* --------------------------------------------------------- 地板 */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(SHOP.x1 - SHOP.x0, SHOP.zFront - SHOP.zBack),
    matFloor
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, SHOP.yFloor, (SHOP.zFront + SHOP.zBack) / 2);
  group.add(floor);

  /* --------------------------------------------------------- 吊顶 */
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(SHOP.x1 - SHOP.x0, SHOP.zFront - SHOP.zBack),
    matCeil
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, SHOP.h, (SHOP.zFront + SHOP.zBack) / 2);
  group.add(ceil);

  // 吊顶灯管：沿 z 三列
  const matShaft = new THREE.MeshBasicMaterial({
    color: 0xfff2d8,
    transparent: true,
    opacity: 0.011,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (const lx of [-4.2, -0.4, 3.4]) {
    for (let i = 0; i < 4; i++) {
      const lz = -4.6 - i * 2.6;
      box(0.14, 0.05, 2.3, matTube, lx, SHOP.h - 0.05, lz, group);
      box(0.3, 0.07, 2.45, new THREE.MeshStandardMaterial({ color: 0xc8c8c0, roughness: 0.6 }), lx, SHOP.h - 0.02, lz, group);
      // 体积光：灯管下方的一束柔光（拉长成条状）
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 1.0, 2.9, 8, 1, true), matShaft);
      shaft.position.set(lx, SHOP.h - 1.52, lz);
      shaft.scale.z = 2.2;
      shaft.renderOrder = 2;
      group.add(shaft);
    }
  }

  /* --------------------------------------------------------- 墙 */
  // 后墙 / 左右墙由 exterior 的外壳提供，这里只补内侧饰面
  const wallBack = box(SHOP.x1 - SHOP.x0, SHOP.h, 0.06, matWall, 0, SHOP.h / 2, SHOP.zBack + 0.03, group);
  const wallL = box(0.06, SHOP.h, SHOP.zFront - SHOP.zBack, matWall, SHOP.x0 + 0.03, SHOP.h / 2, (SHOP.zFront + SHOP.zBack) / 2, group);
  const wallR = box(0.06, SHOP.h, SHOP.zFront - SHOP.zBack, matWall, SHOP.x1 - 0.03, SHOP.h / 2, (SHOP.zFront + SHOP.zBack) / 2, group);

  // 踢脚线
  for (const [x, z, w, d] of [
    [0, SHOP.zBack + 0.05, SHOP.x1 - SHOP.x0, 0.08],
    [SHOP.x0 + 0.05, (SHOP.zFront + SHOP.zBack) / 2, 0.08, SHOP.zFront - SHOP.zBack],
    [SHOP.x1 - 0.05, (SHOP.zFront + SHOP.zBack) / 2, 0.08, SHOP.zFront - SHOP.zBack],
  ]) {
    box(w, 0.1, d, matBase, x, 0.05, z, group);
  }

  /* ------------------------------------------------ 墙面海报 / 价目牌 */
  const posterMats = [0, 1, 2].map((i) => new THREE.MeshStandardMaterial({
    map: posterTexture(i), roughness: 0.8, metalness: 0,
  }));
  // 左墙
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.6), posterMats[1]);
  p1.position.set(SHOP.x0 + 0.05, 1.7, -8.4);
  p1.rotation.y = Math.PI / 2;
  group.add(p1);
  const p2 = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.6), posterMats[2]);
  p2.position.set(SHOP.x0 + 0.05, 1.7, -10.6);
  p2.rotation.y = Math.PI / 2;
  group.add(p2);
  // 右墙
  const p3 = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.6), posterMats[0]);
  p3.position.set(SHOP.x1 - 0.05, 1.7, -8.0);
  p3.rotation.y = -Math.PI / 2;
  group.add(p3);

  // 更多海报（便利店的墙永远是满的）
  const p4 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.55), posterMats[1]);
  p4.position.set(SHOP.x0 + 0.05, 1.72, -12.5);
  p4.rotation.y = Math.PI / 2;
  group.add(p4);
  const p5 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.55), posterMats[2]);
  p5.position.set(SHOP.x1 - 0.05, 1.72, -10.8);
  p5.rotation.y = -Math.PI / 2;
  group.add(p5);
  const p6 = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.7), posterMats[0]);
  p6.position.set(4.6, 1.78, SHOP.zBack + 0.08);
  group.add(p6);
  const p7 = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.35), posterMats[1]);
  p7.position.set(SHOP.x0 + 0.05, 1.66, -5.9);
  p7.rotation.y = Math.PI / 2;
  group.add(p7);
  // 后墙冷柜上方的小价目牌
  const priceBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 0.42),
    new THREE.MeshBasicMaterial({ color: 0x17352a })
  );
  priceBoard.position.set(-4.2, 2.9, SHOP.zBack + 0.06);
  group.add(priceBoard);
  const priceText = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0, 0.3),
    new THREE.MeshBasicMaterial({ map: priceStripTexture(), color: 0x9ff0c8 })
  );
  priceText.position.set(-4.2, 2.9, SHOP.zBack + 0.08);
  group.add(priceText);

  // 天花板格栅（增加细节层次）
  const grillMat = new THREE.MeshStandardMaterial({ color: 0x9a978c, roughness: 0.7, metalness: 0.2 });
  for (let i = 0; i < 6; i++) {
    box(SHOP.x1 - SHOP.x0, 0.03, 0.08, grillMat, 0, SHOP.h - 0.02, -4.6 - i * 2.0, group);
  }

  /* ---------------------------------------- 接触阴影（让物体落地） */
  const contactShadow = softShadowTexture();
  const makeContact = (w, d, x, z, opacity = 0.5) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({
        map: contactShadow, transparent: true, opacity, depthWrite: false, color: 0x000000,
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.016, z);
    m.renderOrder = 1;
    group.add(m);
    return m;
  };
  for (const row of ROWS) {
    makeContact(ROW_W + 1.0, ROW_Z0 - ROW_Z1 + 0.8, row.x, (ROW_Z0 + ROW_Z1) / 2, 0.45);
  }

  /* --------------------------------------------------- 双面货架 */
  const goodsById = Object.fromEntries(GOODS.map((g) => [g.id, g]));
  const goodsPoolAll = GOODS.filter((g) => g.shelf !== 'cold');

  for (const row of ROWS) {
    const rowGroup = new THREE.Group();
    const zc = (ROW_Z0 + ROW_Z1) / 2;
    const zLen = ROW_Z0 - ROW_Z1;

    // 底座
    box(ROW_W, 0.12, zLen, matBase, row.x, 0.06, zc, rowGroup);
    // 中央背板
    box(0.05, ROW_H, zLen, matShelf, row.x, ROW_H / 2, zc, rowGroup);
    // 顶盖
    box(ROW_W + 0.06, 0.04, zLen, matShelfFrame, row.x, ROW_H, zc, rowGroup);

    // 两侧各三层
    const levels = [0.16, 0.62, 1.08];
    for (const side of [-1, 1]) {
      for (let li = 0; li < levels.length; li++) {
        const ly = levels[li];
        // 层板
        box(ROW_W / 2, 0.035, zLen, matShelf, row.x + (side * ROW_W) / 4, ly, zc, rowGroup);
        // 前沿挡板 + 价签
        const edgeX = row.x + side * (ROW_W / 2 - 0.02);
        box(0.02, 0.07, zLen, matShelfFrame, edgeX, ly + 0.05, zc, rowGroup);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(zLen - 0.2, 0.055), matPrice);
        sign.position.set(edgeX + side * 0.012, ly + 0.032, zc);
        sign.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        rowGroup.add(sign);

        // 商品
        const poolKey = side < 0 ? row.left : row.right;
        const pool = (POOLS[poolKey] || []).map((id) => goodsById[id]).filter(Boolean);
        const poolFallback = pool.length ? pool : goodsPoolAll;
        const count = 10;
        const items = pickGoods(poolFallback, count);
        const usable = zLen - 0.32;
        for (let i = 0; i < count; i++) {
          const goods = items[i];
          const scale = 0.9 + Math.random() * 0.2;
          const mesh = createGoodsMesh(goods, scale);
          const z = ROW_Z1 + 0.16 + (i / (count - 1)) * usable + (Math.random() - 0.5) * 0.06;
          const x = row.x + side * (ROW_W / 2 - 0.17) + (Math.random() - 0.5) * 0.03;
          mesh.position.set(x, ly + 0.02, z);
          // 商品不是立正站好的：随机歪一点，偶尔有倒下的
          mesh.rotation.y = (side > 0 ? -Math.PI / 2 : Math.PI / 2) + (Math.random() - 0.5) * 0.55;
          if (Math.random() > 0.9) {
            mesh.rotation.z = (Math.random() - 0.5) * 1.1;
            mesh.position.y = ly + 0.05;
          }
          rowGroup.add(mesh);
          shelfSlots.push(mesh);
          interactables.push({
            object: mesh,
            kind: 'goods',
            goods,
            label: `拿起 ${goods.name}`,
            hint: `${goods.price}円`,
          });
          // 商品后面再塞一个「背衬」商品，看起来更满（不可交互）
          if (i % 2 === 0) {
            const back = createGoodsMesh(goods, scale * 0.95);
            back.position.set(x - side * 0.12, ly + 0.02, z + 0.02);
            back.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
            rowGroup.add(back);
          }
        }
      }
    }

    group.add(rowGroup);

    // 碰撞盒（整排）
    colliders.push(
      new THREE.Box3(
        new THREE.Vector3(row.x - ROW_W / 2 - 0.02, 0, ROW_Z1),
        new THREE.Vector3(row.x + ROW_W / 2 + 0.02, ROW_H, ROW_Z0)
      )
    );
  }

  /* ------------------------------------------- 货架端头堆头（促销陈列） */
  const endGoods = ['chips_consomme', 'cookie', 'nuts', 'senbei', 'cup_noodle_miso', 'tissue', 'mask', 'chocolate', 'banana', 'gum'];
  let ei = 0;
  for (const row of ROWS) {
    for (const ez of [ROW_Z0 + 0.62, ROW_Z1 - 0.62]) {
      const stand = new THREE.Group();
      box(0.66, 0.44, 0.66, matShelf, 0, 0.22, 0, stand);
      box(0.7, 0.03, 0.7, matShelfFrame, 0, 0.45, 0, stand);
      for (let k = 0; k < 3; k++) {
        const id = endGoods[ei++ % endGoods.length];
        const g = goodsById[id];
        if (!g) continue;
        const m = createGoodsMesh(g, 1.0);
        m.position.set(-0.19 + (k % 3) * 0.19, 0.46, (k % 2) * 0.12 - 0.06);
        m.rotation.y = Math.random() * 0.6 - 0.3;
        stand.add(m);
        interactables.push({
          object: m, kind: 'goods', goods: g,
          label: `拿起 ${g.name}`, hint: `${g.price}円`,
        });
      }
      stand.position.set(row.x, 0.02, ez);
      group.add(stand);
      colliders.push(new THREE.Box3(
        new THREE.Vector3(row.x - 0.36, 0, ez - 0.36),
        new THREE.Vector3(row.x + 0.36, 0.5, ez + 0.36)
      ));
    }
  }

  /* ------------------------------------------- 天花板吊牌（促销牌） */
  const makeTagTexture = (text) => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f6f4ec';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#c23a2e';
    ctx.lineWidth = 7;
    ctx.strokeRect(7, 7, 242, 114);
    ctx.fillStyle = '#c23a2e';
    ctx.font = '700 58px "Yu Gothic","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 68);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const tagTexts = ['特価', '新発売', 'おすすめ', 'SALE', '冷たい', 'あったか'];
  let ti = 0;
  const tagLineMat = new THREE.MeshBasicMaterial({ color: 0x8a8a82 });
  for (const row of ROWS) {
    for (let k = 0; k < 2; k++) {
      const tex = makeTagTexture(tagTexts[ti++ % tagTexts.length]);
      const tag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.66, 0.33),
        new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.94,
          metalness: 0,
          side: THREE.DoubleSide,
          emissive: 0x1c1b18,
          emissiveIntensity: 1,
        })
      );
      const tx = row.x + (k ? 0.62 : -0.62);
      const tz = -7.0 - k * 2.8;
      tag.position.set(tx, 2.44, tz);
      tag.rotation.y = k ? -0.25 : 0.25;
      group.add(tag);
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.6, 4), tagLineMat);
      line.position.set(tx, 2.72, tz);
      group.add(line);
    }
  }

  /* --------------------------------------------------- 后墙冷柜 */
  const fridgeGroup = new THREE.Group();
  const fridgeW = 8.6;
  const fridgeH = 2.42;
  const fridgeZ = SHOP.zBack + 0.34;
  // 柜体
  box(fridgeW + 0.3, fridgeH + 0.34, 0.72, new THREE.MeshStandardMaterial({ color: 0xd8dce0, roughness: 0.42, metalness: 0.3 }), -1.6, (fridgeH + 0.34) / 2, fridgeZ - 0.1, fridgeGroup);

  // 玻璃门里的一排排饮料（用发光贴图 + 实物混排）
  // 冷柜内部背光
  box(fridgeW - 0.1, fridgeH - 0.1, 0.04, new THREE.MeshBasicMaterial({ color: 0x6d8ea2 }), -1.6, fridgeH / 2 + 0.2, fridgeZ - 0.28, fridgeGroup);
  const shelfCount = 4;
  for (let s = 0; s < shelfCount; s++) {
    const sy = 0.36 + s * 0.55;
    box(fridgeW, 0.03, 0.5, matShelf, -1.6, sy, fridgeZ, fridgeGroup);
    // 放饮料
    for (let i = 0; i < 9; i++) {
      const pool = ['coffee_latte', 'tea_green', 'cola', 'water', 'milk'];
      const goods = goodsById[pool[(i + s) % pool.length]];
      const mesh = createGoodsMesh(goods, 1.0);
      const x = -1.6 - fridgeW / 2 + 0.42 + (i / 8) * (fridgeW - 0.8);
      mesh.position.set(x, sy + 0.02, fridgeZ);
      fridgeGroup.add(mesh);
      shelfSlots.push(mesh);
      interactables.push({
        object: mesh, kind: 'goods', goods,
        label: `拿起 ${goods.name}`, hint: `${goods.price}円`,
      });
    }
  }

  // 冷柜门框（竖向铝条）
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.3, metalness: 0.8 });
  for (let i = 0; i <= 4; i++) {
    const x = -1.6 - fridgeW / 2 + (i / 4) * fridgeW;
    box(0.05, fridgeH, 0.06, doorMat, x, fridgeH / 2 + 0.2, fridgeZ + 0.36, fridgeGroup);
  }
  box(fridgeW, 0.05, 0.06, doorMat, -1.6, fridgeH + 0.2, fridgeZ + 0.36, fridgeGroup);
  box(fridgeW, 0.05, 0.06, doorMat, -1.6, 0.2, fridgeZ + 0.36, fridgeGroup);

  // 冷柜上方的店招灯箱
  const headerMat = new THREE.MeshBasicMaterial({ color: 0x1f5343 });
  box(fridgeW, 0.34, 0.1, headerMat, -1.6, fridgeH + 0.48, fridgeZ + 0.3, fridgeGroup);
  group.add(fridgeGroup);

  colliders.push(
    new THREE.Box3(
      new THREE.Vector3(-1.6 - fridgeW / 2 - 0.2, 0, fridgeZ - 0.45),
      new THREE.Vector3(-1.6 + fridgeW / 2 + 0.2, fridgeH + 0.4, fridgeZ + 0.42)
    )
  );

  /* ------------------------------------------------------- 灯光 */
  for (let i = 0; i < 3; i++) {
    const l = new THREE.PointLight(0xffe9c8, 3.2, 9, 2);
    l.position.set(-0.4 + (i % 2) * 1.4, 2.9, -5.4 - i * 3.2);
    group.add(l);
    lights.push(l);
  }
  // 冷柜的光晕
  const fg = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glow, color: 0xbfe6ff, transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  fg.scale.set(5.5, 2.6, 1);
  fg.position.set(-1.6, 1.7, SHOP.zBack + 0.9);
  group.add(fg);

  /* ------------------------------------------------ 墙面碰撞（房间边界） */
  const t = 0.2;
  colliders.push(
    new THREE.Box3(new THREE.Vector3(SHOP.x0 - t, 0, SHOP.zBack - t), new THREE.Vector3(SHOP.x0, 3, SHOP.zFront)),
    new THREE.Box3(new THREE.Vector3(SHOP.x1, 0, SHOP.zBack - t), new THREE.Vector3(SHOP.x1 + t, 3, SHOP.zFront)),
    new THREE.Box3(new THREE.Vector3(SHOP.x0, 0, SHOP.zBack - t), new THREE.Vector3(SHOP.x1, 3, SHOP.zBack))
    // 前立面（门洞那一侧）不封死，留出门让玩家走进去
  );

  return { group, colliders, interactables, lights, shelfSlots, SHOP };
}
