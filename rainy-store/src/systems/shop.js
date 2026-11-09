// 购物与结账：拿商品 → 放进篮子 → 收银台 → 扫码 → 付款 → 找零 → 小票
import * as THREE from 'three';
import { createGoodsMesh, GOODS } from '../goods.js';

const CASHIER_TABLE = { y: 1.06, z: -4.62, x0: 2.85, step: 0.3 };

export class ShopSystem {
  constructor({ scene, camera, interactor, hud, clerk, fixtures, audio, onMessage }) {
    this.scene = scene;
    this.camera = camera;
    this.interactor = interactor;
    this.hud = hud;
    this.clerk = clerk;
    this.fixtures = fixtures;
    this.audio = audio;
    this.onMessage = onMessage || (() => {});

    this.cart = [];
    this.maxCart = 6;
    this.wallet = 5000;
    this.phase = 'idle'; // idle | placing | scanning | paying | change | done
    this.timer = 0;
    this.scanIdx = 0;
    this.total = 0;
    this.change = 0;
    this.placed = [];
    this.lines = [];

    // 手里的购物篮
    this.basket = this._buildBasket();
    camera.add(this.basket);
    scene.add(camera);
    this.slots = [];
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        this.slots.push(new THREE.Vector3(-0.085 + col * 0.085, -0.04 + row * 0.03, -0.05 + row * 0.055));
      }
    }
  }

  _buildBasket() {
    const g = new THREE.Group();
    const red = new THREE.MeshStandardMaterial({ color: 0xc03a2c, roughness: 0.55, metalness: 0.05 });
    const w = 0.3;
    const d = 0.21;
    const h = 0.13;
    // 底
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), red);
    bottom.position.y = -0.055;
    g.add(bottom);
    // 四壁
    const wallMat = red;
    const mk = (bw, bh, bd, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), wallMat);
      m.position.set(x, y, z);
      g.add(m);
    };
    mk(w, h, 0.012, 0, -0.0, -d / 2);
    mk(w, h, 0.012, 0, -0.0, d / 2);
    mk(0.012, h, d, -w / 2, 0, 0);
    mk(0.012, h, d, w / 2, 0, 0);
    // 提手
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 5, 14, Math.PI), red);
    handle.position.set(0, 0.07, 0);
    handle.rotation.x = Math.PI;
    g.add(handle);

    g.scale.setScalar(0.62);
    g.position.set(0.4, -0.5, -0.6);
    g.rotation.set(0.12, -0.12, 0.05);
    return g;
  }

  /* ------------------------------------------------- 拿起 / 放回 */

  pickup(target) {
    if (this.phase !== 'idle') {
      this.onMessage('先把东西结了吧～');
      return false;
    }
    if (this.cart.length >= this.maxCart) {
      this.onMessage('篮子装不下了，先结账吧');
      return false;
    }
    const goods = target.goods;
    target.object.visible = false;
    target.disabled = true;

    const mesh = createGoodsMesh(goods, 0.4);
    mesh.position.copy(this.slots[this.cart.length]);
    mesh.rotation.set(0.18, Math.random() * 1.4, -0.08);
    this.basket.add(mesh);

    this.cart.push({ goods, mesh, source: target });
    this.audio.pick();
    this.onMessage(`拿起了 ${goods.name}（${goods.price}円）`);
    this.hud.updateCart(this.cart, this.wallet);
    return true;
  }

  /** 把最后拿的一件放回货架 */
  putBack() {    if (!this.cart.length || this.phase !== 'idle') return false;
    const entry = this.cart.pop();
    this.basket.remove(entry.mesh);
    if (entry.source) {
      entry.source.object.visible = true;
      entry.source.disabled = false;
    }
    this.onMessage(`放回了 ${entry.goods.name}`);
    this.hud.updateCart(this.cart, this.wallet);
    return true;
  }

  /** 特殊渠道获得（比如店员给的关东煮） */
  giveSpecial(id, count = 1) {
    const goods = GOODS.find((g) => g.id === id);
    if (!goods) return false;
    const before = this.cart.length;
    for (let i = 0; i < count; i++) {
      if (this.cart.length >= this.maxCart) break;
      const mesh = createGoodsMesh(goods, 0.4);
      mesh.position.copy(this.slots[this.cart.length]);
      mesh.rotation.set(0.18, Math.random() * 1.4, -0.08);
      this.basket.add(mesh);
      this.cart.push({ goods, mesh, source: null });
    }
    this.hud.updateCart(this.cart, this.wallet);
    this.onMessage(`拿到了 ${goods.name} ×${this.cart.length - before}`);
    return true;
  }

  /* ------------------------------------------------------- 结账 */

  beginCheckout() {
    if (this.phase !== 'idle') return false;
    if (!this.cart.length) {
      this.onMessage('篮子里还没有东西哦');
      return false;
    }
    this.phase = 'placing';
    this.timer = 0;
    this.scanIdx = 0;
    this.total = 0;
    this.lines = [];
    this.placed = [];

    // 篮子里的商品清空，依次落到台面
    for (const entry of this.cart) this.basket.remove(entry.mesh);

    this.cart.forEach((entry, i) => {
      const mesh = createGoodsMesh(entry.goods, 0.95);
      mesh.position.set(CASHIER_TABLE.x0 + i * CASHIER_TABLE.step, 1.42, CASHIER_TABLE.z);
      this.scene.add(mesh);
      this.placed.push({
        mesh,
        targetY: CASHIER_TABLE.y,
        targetX: CASHIER_TABLE.x0 + i * CASHIER_TABLE.step,
        drop: 0,
        done: false,
        goods: entry.goods,
      });
    });

    this.cart = [];
    this.hud.updateCart(this.cart, this.wallet);
    this.fixtures.api.display.draw(['结账中…'], 0);
    if (this.clerk) this.clerk.nod();
    this.audio.beep(660, 0.06);
    return true;
  }

  /** 付款（按 E） */
  pay() {
    if (this.phase !== 'paying') return false;
    const paid = Math.ceil(this.total / 1000) * 1000;
    this.change = paid - this.total;
    this.wallet = Math.max(0, this.wallet - this.total);
    this.phase = 'change';
    this.timer = 0;
    this.fixtures.api.display.draw([...this.lines, '已付款'], this.total);
    this.audio.coin();
    if (this.clerk) this.clerk.nod();
    this.onMessage(`支付 ${paid}円，找零 ${this.change}円`);
    this.hud.updateCart([], this.wallet);
    return true;
  }

  /* ------------------------------------------------------- 主循环 */

  update(dt) {
    this.timer += dt;

    switch (this.phase) {
      case 'placing': {
        let allDone = true;
        for (const p of this.placed) {
          if (p.done) continue;
          allDone = false;
          p.drop = Math.min(1, p.drop + dt * 4.2);
          const e = 1 - Math.pow(1 - p.drop, 3);
          p.mesh.position.y = 1.42 + (p.targetY - 1.42) * e;
          if (p.drop >= 1) {
            p.done = true;
            this.audio.tap();
          }
        }
        if (allDone && this.timer > 0.6) {
          this.phase = 'scanning';
          this.timer = 0;
          this.scanIdx = 0;
        }
        break;
      }
      case 'scanning': {
        const interval = 0.72;
        if (this.timer > interval) {
          this.timer = 0;
          if (this.scanIdx < this.placed.length) {
            const p = this.placed[this.scanIdx];
            this.scanIdx++;
            this.total += p.goods.price;
            this.lines.push(`${p.goods.name}  ${p.goods.price}円`);
            this.fixtures.api.display.draw(this.lines, this.total);
            this.audio.beep(1180 + Math.random() * 180, 0.07);
            if (this.clerk) this.clerk.scanOnce();
            this.hud.updateCart([], this.wallet);
          } else {
            this.phase = 'paying';
            this.timer = 0;
            this.audio.beep(880, 0.12);
            this.hud.showPay(this.total);
          }
        }
        break;
      }
      case 'change': {
        if (this.timer > 1.4) {
          this.phase = 'done';
          this.timer = 0;
          this.hud.showReceipt({
            lines: this.lines,
            total: this.total,
            change: this.change,
            wallet: this.wallet,
          });
          if (this.clerk) this.clerk.nod();
        }
        break;
      }
      case 'done': {
        if (this.timer > 3.2) {
          // 商品收走
          for (const p of this.placed) this.scene.remove(p.mesh);
          this.placed = [];
          this.phase = 'idle';
          this.total = 0;
          this.change = 0;
          this.lines = [];
          this.fixtures.api.display.draw(['欢迎光临'], 0);
          this.hud.hideReceipt();
          this.hud.updateCart([], this.wallet);
        }
        break;
      }
      default:
        break;
    }
  }

  get isBusy() {
    return this.phase !== 'idle';
  }

  get totalNow() {
    return this.total;
  }
}
