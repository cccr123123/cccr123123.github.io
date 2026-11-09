// 第一人称控制器：不锁定鼠标，按住左键拖动看四周（也可以按住右键）
// WASD / 方向键移动，Shift 小跑，带碰撞、头部起伏与脚步声回调
import * as THREE from 'three';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class FPControls {
  constructor(camera, domElement, { eyeHeight = 1.62, radius = 0.32 } = {}) {
    this.camera = camera;
    this.dom = domElement;
    this.eyeHeight = eyeHeight;
    this.radius = radius;

    this.position = new THREE.Vector3(0.4, 0, 9.5); // 脚底位置（y 固定 0）
    this.yaw = 0; // 0 = 面向 -z
    this.pitch = 0;
    this.velocity = new THREE.Vector3();

    this.walkSpeed = 2.9;
    this.runSpeed = 5.0;
    this.keys = new Set();
    this.colliders = [];
    this.enabled = true;

    this.bobPhase = 0;
    this.bobAmount = 0;
    this.stepAccum = 0;
    this.onStep = null;
    this.onMoveStateChange = null;
    this.moving = false;

    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.sensitivity = 0.0024;

    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._wish = new THREE.Vector3();
    this._next = new THREE.Vector3();

    this._onDown = this._onPointerDown.bind(this);
    this._onMove = this._onPointerMove.bind(this);
    this._onUp = this._onPointerUp.bind(this);
    this._onKeyDown = (e) => this._onKey(e, true);
    this._onKeyUp = (e) => this._onKey(e, false);

    this.bind();
  }

  bind() {
    this.dom.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
    window.addEventListener('pointercancel', this._onUp);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    // 失焦时清空按键，避免「一直往前走」
    window.addEventListener('blur', () => this.keys.clear());
  }

  _onPointerDown(e) {
    if (!this.enabled) return;
    if (e.button !== 0 && e.button !== 2) return;
    // 点在 HUD 上时不转视角
    if (e.target !== this.dom) return;
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.dom.style.cursor = 'grabbing';
    e.preventDefault();
  }

  _onPointerMove(e) {
    if (!this.dragging || !this.enabled) return;
    // 保险：鼠标键已经在别处松开（比如点在 HUD 上），强制结束拖动，避免视角跳变
    if (e.pointerType === 'mouse' && e.buttons === 0) {
      this.dragging = false;
      this.dom.style.cursor = 'grab';
      return;
    }
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.yaw -= dx * this.sensitivity;
    this.pitch -= dy * this.sensitivity;
    this.pitch = clamp(this.pitch, -1.35, 1.35);
  }

  _onPointerUp() {
    if (!this.dragging) return;
    this.dragging = false;
    this.dom.style.cursor = 'grab';
  }

  _onKey(e, down) {
    if (!this.enabled && down) return;
    const code = e.code;
    if (down && (code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD'
      || code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight'
      || code === 'ShiftLeft' || code === 'ShiftRight')) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      e.preventDefault();
    }
    if (down) this.keys.add(code);
    else this.keys.delete(code);
  }

  setStart(x, z, yaw = 0) {
    this.position.set(x, 0, z);
    this.yaw = yaw;
    this.pitch = 0;
    this.velocity.set(0, 0, 0);
  }

  addCollider(box) {
    this.colliders.push(box);
    return box;
  }

  /** 用中心 + 尺寸建一个碰撞盒 */
  addBox(cx, cz, w, d, yMin = 0, yMax = 3) {
    const box = new THREE.Box3(
      new THREE.Vector3(cx - w / 2, yMin, cz - d / 2),
      new THREE.Vector3(cx + w / 2, yMax, cz + d / 2)
    );
    this.colliders.push(box);
    return box;
  }

  clearColliders() {
    this.colliders.length = 0;
  }

  /** 圆（玩家）vs AABB：把玩家推出所有相交的盒子 */
  _resolve(pos) {
    const r = this.radius;
    for (let i = 0; i < this.colliders.length; i++) {
      const b = this.colliders[i];
      // 只需要 xz 平面上的碰撞
      const cx = clamp(pos.x, b.min.x, b.max.x);
      const cz = clamp(pos.z, b.min.z, b.max.z);
      let dx = pos.x - cx;
      let dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;

      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * r;
        pos.z = cz + (dz / d) * r;
      } else {
        // 圆心在盒子里：沿最近的边推出去
        const toLeft = pos.x - b.min.x;
        const toRight = b.max.x - pos.x;
        const toBack = pos.z - b.min.z;
        const toFront = b.max.z - pos.z;
        const m = Math.min(toLeft, toRight, toBack, toFront);
        if (m === toLeft) pos.x = b.min.x - r;
        else if (m === toRight) pos.x = b.max.x + r;
        else if (m === toBack) pos.z = b.min.z - r;
        else pos.z = b.max.z + r;
      }
    }
  }

  update(dt) {
    if (!this.enabled) {
      this._applyCamera(0);
      return;
    }
    dt = Math.min(dt, 0.05);

    const k = this.keys;
    this._forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this._right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this._wish.set(0, 0, 0);

    if (k.has('KeyW') || k.has('ArrowUp')) this._wish.add(this._forward);
    if (k.has('KeyS') || k.has('ArrowDown')) this._wish.sub(this._forward);
    if (k.has('KeyD') || k.has('ArrowRight')) this._wish.add(this._right);
    if (k.has('KeyA') || k.has('ArrowLeft')) this._wish.sub(this._right);

    const running = k.has('ShiftLeft') || k.has('ShiftRight');
    const speed = running ? this.runSpeed : this.walkSpeed;

    if (this._wish.lengthSq() > 0) this._wish.normalize().multiplyScalar(speed);

    // 平滑加减速（约 0.15s 到位）
    const accel = 1 - Math.exp(-dt * 13);
    this.velocity.lerp(this._wish, accel);

    this._next.copy(this.position).addScaledVector(this.velocity, dt);
    this._resolve(this._next);
    const moved = Math.hypot(this._next.x - this.position.x, this._next.z - this.position.z);
    this.position.copy(this._next);

    const wasMoving = this.moving;
    this.moving = moved > 0.0008;
    if (this.moving !== wasMoving && this.onMoveStateChange) this.onMoveStateChange(this.moving, running);

    // 头部起伏 + 脚步声
    const speedNow = this.velocity.length();
    if (this.moving) {
      const freq = running ? 9.5 : 6.6;
      this.bobPhase += dt * freq;
      this.bobAmount += (1 - this.bobAmount) * Math.min(1, dt * 6);
      this.stepAccum += moved;
      if (this.stepAccum > (running ? 1.15 : 0.82)) {
        this.stepAccum = 0;
        if (this.onStep) this.onStep(running);
      }
    } else {
      this.bobAmount += (0 - this.bobAmount) * Math.min(1, dt * 8);
    }

    this._applyCamera(this.bobAmount, speedNow);
  }

  _applyCamera(bobAmount) {
    const bobY = Math.sin(this.bobPhase * 2) * 0.032 * bobAmount;
    const bobX = Math.cos(this.bobPhase) * 0.018 * bobAmount;
    const sway = Math.sin(this.bobPhase) * 0.006 * bobAmount;

    // 手持呼吸感：永远存在的极轻微浮动（站着不动也有）
    const t = performance.now() * 0.001;
    const breatheY = Math.sin(t * 0.63) * 0.0085 + Math.sin(t * 1.37) * 0.0028;
    const breatheX = Math.sin(t * 0.41 + 1.1) * 0.0042;
    const breatheRoll = Math.sin(t * 0.53 + 0.4) * 0.0026;

    this.camera.position.set(
      this.position.x + Math.cos(this.yaw) * (bobX + breatheX),
      this.eyeHeight + bobY + breatheY,
      this.position.z - Math.sin(this.yaw) * (bobX + breatheX)
    );
    this._euler.set(this.pitch, this.yaw, sway + breatheRoll, 'YXZ');
    this.camera.quaternion.setFromEuler(this._euler);
  }

  /** 视线的水平朝向（0..π，用于 NPC 判断玩家面向） */
  get lookDirection() {
    return this._forward;
  }
}
