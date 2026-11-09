// 视线交互：把可交互对象挂在场景里，用相机中心附近的射线挑选最近目标
import * as THREE from 'three';

export class Interactor {
  constructor(camera, { distance = 2.9, maxAngle = 0.55 } = {}) {
    this.camera = camera;
    this.distance = distance;
    this.maxAngle = maxAngle;
    this.targets = [];
    this.current = null;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = distance;

    this._camPos = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._objPos = new THREE.Vector3();
    this._center = new THREE.Vector2(0, 0);
    this._candidates = [];
    this.frame = 0;
  }

  add(target) {
    this.targets.push(target);
    return target;
  }

  remove(target) {
    const i = this.targets.indexOf(target);
    if (i >= 0) this.targets.splice(i, 1);
  }

  setEnabled(target, enabled) {
    target.disabled = !enabled;
    if (!enabled && this.current === target) this.current = null;
  }

  update() {
    this.camera.getWorldPosition(this._camPos);
    this.camera.getWorldDirection(this._dir);

    // 1) 距离 + 视角粗筛
    const cands = [];
    for (let i = 0; i < this.targets.length; i++) {
      const t = this.targets[i];
      if (t.disabled) continue;
      const p = t.point || t.object.getWorldPosition(this._objPos);
      const d = p.distanceTo(this._camPos);
      if (d > this.distance) continue;
      // 视线方向夹角
      const toObj = this._objPos.copy(p).sub(this._camPos).normalize();
      const cos = toObj.dot(this._dir);
      if (cos < Math.cos(this.maxAngle)) continue;
      cands.push({ t, d, cos });
    }

    if (!cands.length) {
      this.current = null;
      return null;
    }

    // 2) 用射线精确定位（避免隔着货架选中后面的东西）
    this._candidates.length = 0;
    for (const c of cands) this._candidates.push(c.t.object);

    this.raycaster.setFromCamera(this._center, this.camera);
    const hits = this.raycaster.intersectObjects(this._candidates, true);

    let best = null;
    if (hits.length) {
      // 找到最近的命中，映射回 target
      const hitObj = hits[0].object;
      for (const c of cands) {
        let o = hitObj;
        while (o) {
          if (o === c.t.object) {
            best = c.t;
            break;
          }
          o = o.parent;
        }
        if (best) break;
      }
    }
    // 射线没命中（比如交互点是个逻辑点）：用「距离 + 视线夹角」综合评分
    if (!best) {
      cands.sort((a, b) => {
        const sa = a.d * (1 + (1 - a.cos) * 3);
        const sb = b.d * (1 + (1 - b.cos) * 3);
        return sa - sb;
      });
      best = cands[0].t;
    }

    this.current = best;
    return best;
  }

  get target() {
    return this.current;
  }
}
