// 店内的生活痕迹：扫把、拖把桶、纸箱、垃圾桶、购物袋
import * as THREE from 'three';
import { metalTexture, wallTexture } from './textures.js';

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.75,
    metalness: opts.metalness ?? 0.05,
    map: opts.map || null,
  });
}

export function buildClutter() {
  const group = new THREE.Group();
  const colliders = [];
  const rnd = (a, b) => a + Math.random() * (b - a);

  const matPole = mat(0x8a8f94, { roughness: 0.35, metalness: 0.8 });
  const matBristle = mat(0xc8b070, { roughness: 0.95 });
  const matPlastic = mat(0x3a6a8a, { roughness: 0.5 });
  const matBin = mat(0x4a5054, { roughness: 0.6, metalness: 0.2 });
  const matCardboard = mat(0xb08e60, { roughness: 0.95, map: wallTexture() });
  const matTape = mat(0xd8c8a8, { roughness: 0.9 });

  /* ------------------------------------------------- 扫把 + 簸箕 */
  {
    const g = new THREE.Group();
    // 杆
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 1.15, 6), matPole);
    pole.position.y = 0.6;
    g.add(pole);
    // 扫把头
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.06), matBristle);
    head.position.set(0, 0.05, 0.02);
    g.add(head);
    const bristles = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.1, 0.05), mat(0xb8a060, { roughness: 1 }));
    bristles.position.set(0, 0.0, 0.02);
    g.add(bristles);
    // 簸箕
    const dust = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.18), matPlastic);
    dust.position.set(0.28, 0.02, 0.02);
    g.add(dust);
    const dustBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.02), matPlastic);
    dustBack.position.set(0.28, 0.08, -0.07);
    g.add(dustBack);
    const dustHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 5), matPole);
    dustHandle.position.set(0.28, 0.25, -0.07);
    dustHandle.rotation.x = -0.2;
    g.add(dustHandle);
    g.position.set(5.85, 0.02, -13.55);
    g.rotation.y = -0.5;
    g.rotation.z = 0.18; // 歪靠在墙上
    group.add(g);
    colliders.push(new THREE.Box3(new THREE.Vector3(5.55, 0, -13.8), new THREE.Vector3(6.15, 1.2, -13.25)));
  }

  /* --------------------------------------------------- 拖把 + 水桶 */
  {
    const g = new THREE.Group();
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.32, 14), mat(0x2a6a4a, { roughness: 0.55 }));
    bucket.position.y = 0.16;
    g.add(bucket);
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.145, 14), mat(0x3a5a48, { roughness: 0.2 }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.26;
    g.add(water);
    const wringer = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), matPlastic);
    wringer.position.set(0.06, 0.36, 0);
    g.add(wringer);
    // 拖把杆
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 6), matPole);
    handle.position.set(-0.02, 0.7, 0);
    handle.rotation.z = 0.14;
    g.add(handle);
    const mop = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.14, 8), mat(0xd8d0c0, { roughness: 1 }));
    mop.position.set(0.06, 0.12, 0);
    g.add(mop);
    g.position.set(6.0, 0.02, -12.4);
    g.rotation.y = 0.4;
    g.rotation.x = 0.06;
    group.add(g);
    colliders.push(new THREE.Box3(new THREE.Vector3(5.7, 0, -12.7), new THREE.Vector3(6.3, 1.3, -12.1)));
  }

  /* ------------------------------------------------------ 纸箱堆 */
  const cardboardSpots = [
    [5.55, -8.4, 0.6, 0.45, 0.5, 0.2],
    [5.6, -8.95, 0.5, 0.38, 0.45, -0.35],
    [5.55, -8.65, 0.45, 0.34, 0.42, 0.7, 0.62], // 叠在上面
    [-6.05, -12.9, 0.55, 0.42, 0.48, 0.1],
    [2.9, -13.7, 0.5, 0.36, 0.44, -0.2],
  ];
  for (const [x, z, w, h, d, rot, yLift] of cardboardSpots) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matCardboard);
    box.position.y = h / 2;
    g.add(box);
    // 封箱胶带
    const tape1 = new THREE.Mesh(new THREE.BoxGeometry(w * 1.005, 0.012, 0.06), matTape);
    tape1.position.y = h + 0.002;
    g.add(tape1);
    const tape2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, d * 1.005), matTape);
    tape2.position.y = h + 0.003;
    g.add(tape2);
    // 顶面缝隙
    const seam = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.006, 0.012), mat(0x6a5438, { roughness: 1 }));
    seam.position.y = h + 0.001;
    g.add(seam);
    g.position.set(x, (yLift || 0) + 0.02, z);
    g.rotation.y = rot;
    group.add(g);
    if (!yLift) {
      colliders.push(new THREE.Box3(
        new THREE.Vector3(x - w / 2, 0, z - d / 2),
        new THREE.Vector3(x + w / 2, h, z + d / 2)
      ));
    }
  }

  /* ------------------------------------------------------- 垃圾桶 */
  for (const [x, z] of [[2.55, -5.6], [-5.95, -13.45]]) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.6, 14), matBin);
    body.position.y = 0.3;
    g.add(body);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.014, 6, 18), mat(0x8a9096, { roughness: 0.3, metalness: 0.8 }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.6;
    g.add(rim);
    const bag = new THREE.Mesh(new THREE.CircleGeometry(0.18, 14), mat(0xd8d8d0, { roughness: 0.9 }));
    bag.rotation.x = -Math.PI / 2;
    bag.position.y = 0.58;
    g.add(bag);
    g.position.set(x, 0.02, z);
    group.add(g);
    colliders.push(new THREE.Box3(new THREE.Vector3(x - 0.22, 0, z - 0.22), new THREE.Vector3(x + 0.22, 0.65, z + 0.22)));
  }

  /* ------------------------------------------------ 地上的购物袋 */
  {
    const g = new THREE.Group();
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.16), mat(0xe8e8e0, { roughness: 0.85 }));
    bag.position.y = 0.16;
    bag.rotation.z = 0.35; // 倒在一边
    g.add(bag);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.006, 4, 12, Math.PI), mat(0xd0d0c8, { roughness: 0.9 }));
    handle.position.set(-0.12, 0.1, 0.02);
    handle.rotation.set(Math.PI / 2, 0, 0.5);
    g.add(handle);
    g.position.set(-2.1, 0.02, -4.15);
    g.rotation.y = 0.7;
    group.add(g);
  }

  /* ---------------------------------------- 散落物：纸团 / 传单 / 掉落商品 */
  // 纸团
  const matPaper = mat(0xe4e0d4, { roughness: 1 });
  for (let i = 0; i < 7; i++) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(rnd(0.025, 0.045), 6, 5), matPaper);
    ball.position.set(rnd(-5.6, 5.6), rnd(0.025, 0.045), rnd(-12.6, -4.2));
    ball.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
    ball.scale.set(1, 0.82, rnd(0.9, 1.2));
    group.add(ball);
  }
  // 传单（贴地、被踩过）
  const matFlyer = mat(0xf0ece0, { roughness: 0.95 });
  for (let i = 0; i < 4; i++) {
    const flyer = new THREE.Mesh(new THREE.PlaneGeometry(rnd(0.16, 0.26), rnd(0.2, 0.3)), matFlyer);
    flyer.rotation.set(-Math.PI / 2 + rnd(-0.1, 0.1), 0, rnd(0, Math.PI * 2));
    flyer.position.set(rnd(-5.0, 5.2), 0.018, rnd(-11.5, -4.0));
    group.add(flyer);
  }
  // 掉在货架旁边的商品（斜的）
  for (let i = 0; i < 3; i++) {
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.033, 0.033, 0.115, 12),
      mat(i === 0 ? 0xc0392b : i === 1 ? 0x3a86c8 : 0xd8a83a, { roughness: 0.5 })
    );
    can.rotation.set(Math.PI / 2, rnd(0, 3), rnd(0, 1.5));
    can.position.set(rnd(-4.6, 4.2), 0.035, rnd(-10.8, -5.2));
    group.add(can);
  }
  // 倒了的一摞纸箱（斜着）
  {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.44), matCardboard);
      b.position.set(rnd(-0.1, 0.1), 0.19 + i * 0.35, rnd(-0.06, 0.06));
      b.rotation.y = rnd(-0.3, 0.3);
      b.rotation.z = i * 0.06;
      g.add(b);
    }
    g.position.set(-5.85, 0.02, -9.4);
    g.rotation.y = 0.5;
    group.add(g);
    colliders.push(new THREE.Box3(new THREE.Vector3(-6.2, 0, -9.9), new THREE.Vector3(-5.4, 1.3, -8.9)));
  }

  return { group, colliders };
}
