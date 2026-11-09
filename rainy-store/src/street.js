// 街道环境：天空、远景楼群、路灯、电线杆、自动贩卖机、路边停车
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowTexture, softShadowTexture, buildingWindowsTexture, vendingTexture } from './textures.js';

function box(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
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

/* ---------------------------------------------------------------- 天空 */

function buildSky() {
  const uniforms = {
    uTime: { value: 0 },
    uFlash: { value: 0 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uFlash;
      varying vec3 vDir;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 5; i++) {
          v += amp * noise(p);
          p *= 2.03;
          amp *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;

        // 夜空：顶部深蓝黑，向地平线过渡成带城市光污染的暖灰紫
        vec3 top = vec3(0.012, 0.018, 0.036);
        vec3 mid = vec3(0.030, 0.038, 0.062);
        vec3 hor = vec3(0.085, 0.070, 0.082);

        vec3 col = mix(mid, top, smoothstep(0.0, 0.7, h));
        col = mix(hor, col, smoothstep(-0.02, 0.3, h));

        // 城市光污染，贴地平线最亮
        float city = exp(-abs(h) * 8.0);
        col += vec3(0.17, 0.085, 0.04) * city;

        // 低垂的雨云
        vec2 cuv = d.xz / max(abs(h) + 0.16, 0.2);
        float cl = fbm(cuv * 1.1 + vec2(uTime * 0.004, uTime * 0.002));
        float cl2 = fbm(cuv * 2.6 - vec2(uTime * 0.006, 0.0));
        float cloud = smoothstep(0.42, 0.95, cl * 0.75 + cl2 * 0.35);
        cloud *= smoothstep(-0.02, 0.2, h);
        vec3 cloudCol = mix(vec3(0.075, 0.08, 0.105), vec3(0.16, 0.135, 0.15), city * 2.2);
        col = mix(col, cloudCol, cloud * 0.9);

        // 闪电照亮云层
        col += vec3(0.55, 0.62, 0.85) * uFlash * (0.35 + cloud * 0.9);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const sky = new THREE.Mesh(new THREE.SphereGeometry(240, 32, 16), mat);
  sky.frustumCulled = false;
  return { sky, uniforms };
}

/* ------------------------------------------------------------ 远景楼群 */

function buildSkyline(parent) {
  const winTex = buildingWindowsTexture();
  const matA = new THREE.MeshStandardMaterial({
    color: 0x151a23,
    roughness: 0.95,
    emissive: 0xffc98a,
    emissiveMap: winTex,
    emissiveIntensity: 0.3,
  });
  const matB = new THREE.MeshStandardMaterial({
    color: 0x12161d,
    roughness: 0.95,
    emissive: 0x9fd4ff,
    emissiveMap: winTex,
    emissiveIntensity: 0.18,
  });

  const rng = (a, b) => a + Math.random() * (b - a);

  // 远处的街区：左右两翼 + 便利店背后的天际线
  const spots = [];
  for (let i = 0; i < 18; i++) {
    // 左右翼
    const side = i % 2 === 0 ? -1 : 1;
    spots.push({
      x: side * rng(16, 54),
      z: rng(-40, 14),
      w: rng(5, 12),
      d: rng(5, 12),
      h: rng(9, 26),
    });
  }
  for (let i = 0; i < 14; i++) {
    spots.push({ x: rng(-54, 54), z: rng(-60, -22), w: rng(6, 16), d: rng(6, 16), h: rng(12, 32) });
  }

  const geomsA = [];
  const geomsB = [];
  for (const s of spots) {
    const g = new THREE.BoxGeometry(s.w, s.h, s.d);
    g.translate(s.x, s.h / 2, s.z);
    (Math.random() > 0.35 ? geomsA : geomsB).push(g);

    // 顶部的航空障碍灯
    if (s.h > 20 && Math.random() > 0.45) {
      const dot = glowSprite(glowTexture(), 0xff3b3b, 1.6, 0.6, s.x, s.h + 0.3, s.z, parent);
      dot.userData.blink = Math.random() * Math.PI * 2;
    }
  }
  // 合批：几十栋楼压成两个网格
  if (geomsA.length) parent.add(new THREE.Mesh(mergeGeometries(geomsA), matA));
  if (geomsB.length) parent.add(new THREE.Mesh(mergeGeometries(geomsB), matB));
}

/* ---------------------------------------------------------------- 路灯 */

function buildLamp(parent, x, z, height = 6.6) {
  const matPole = new THREE.MeshStandardMaterial({ color: 0x23272c, roughness: 0.55, metalness: 0.6 });
  const matLampHead = new THREE.MeshStandardMaterial({
    color: 0x2a2f35,
    roughness: 0.4,
    metalness: 0.7,
    emissive: 0xbfe0ff,
    emissiveIntensity: 0.35,
  });

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.105, height, 12), matPole);
  pole.position.set(x, height / 2, z);
  parent.add(pole);
  // 底座
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.24, 12), matPole);
  base.position.set(x, 0.12, z);
  parent.add(base);

  // 弯曲的灯臂（朝街道方向）
  const armDir = x > 0 ? -1 : 1;
  const armLen = 1.7;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, armLen, 8), matPole);
  arm.position.set(x + (armDir * armLen) / 2, height + 0.06, z);
  arm.rotation.z = Math.PI / 2;
  parent.add(arm);
  const elbow = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.24, 8), matPole);
  elbow.position.set(x, height - 0.06, z);
  parent.add(elbow);

  const hx = x + armDir * armLen;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.13, 0.3), matLampHead);
  head.position.set(hx, height + 0.02, z);
  parent.add(head);

  // 灯头下方的发光片
  const bulb = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.22),
    new THREE.MeshBasicMaterial({ color: 0xe8f4ff })
  );
  bulb.rotation.x = Math.PI / 2;
  bulb.position.set(hx, height - 0.05, z);
  parent.add(bulb);

  const glow = glowSprite(glowTexture(), 0xcfe6ff, 4.2, 0.5, hx, height - 0.1, z, parent);
  glow.userData.baseOpacity = 0.5;

  // 体积光锥（自定义 shader 做边缘渐隐）
  const coneH = height - 0.1;
  const coneMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xa9d4ff) },
      uIntensity: { value: 0.5 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying float vH;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vH = clamp((position.y / ${coneH.toFixed(2)} * 0.5) + 0.5, 0.0, 1.0);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying float vH;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
        float fall = pow(1.0 - vH, 1.9);
        float a = uIntensity * fall * (0.18 + edge * 0.5);
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
  });
  // ConeGeometry 的 y 从 -h/2 到 h/2，顶点在上 → 灯在顶点
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.0, coneH, 28, 1, true), coneMat);
  cone.position.set(hx, coneH / 2, z);
  cone.renderOrder = 5;
  parent.add(cone);

  // 灯光
  const spot = new THREE.SpotLight(0xcbe4ff, 85, 26, 0.62, 0.45, 1.7);
  spot.position.set(hx, height - 0.1, z);
  spot.target.position.set(hx, 0, z);
  parent.add(spot);
  parent.add(spot.target);

  return { spot, head, glow };
}

/* ----------------------------------------------------------- 消防栓 */

function buildHydrant(parent, x, z) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x77211f, roughness: 0.55, metalness: 0.18 });
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.21, 0.12, 12), mat);
  base.position.y = 0.06;
  g.add(base);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.15, 0.6, 12), mat);
  body.position.y = 0.42;
  g.add(body);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), mat);
  cap.position.y = 0.76;
  cap.scale.y = 0.72;
  g.add(cap);
  for (const sx of [-1, 1]) {
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.15, 8), mat);
    n.rotation.z = Math.PI / 2;
    n.position.set(sx * 0.18, 0.5, 0);
    g.add(n);
  }
  g.position.set(x, 0, z);
  parent.add(g);
  return g;
}

/* -------------------------------------------------------------- 电线杆 */

function buildPole(parent, x, z) {
  const matPole = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.9 });
  const matIns = new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.4, metalness: 0.2 });
  const H = 7.8;

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, H, 10), matPole);
  pole.position.set(x, H / 2, z);
  parent.add(pole);

  // 横担 x2
  for (const y of [7.2, 6.6]) {
    box(2.1, 0.07, 0.07, matPole, x, y, z, parent);
    for (const ox of [-0.9, -0.3, 0.3, 0.9]) {
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.14, 8), matIns);
      ins.position.set(x + ox, y + 0.1, z);
      parent.add(ins);
    }
  }
  // 变压器
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.72, 12), matPole);
  tr.position.set(x + 0.36, 5.6, z);
  parent.add(tr);

  return { x, z, H };
}

function buildWires(parent, poles) {
  const matWire = new THREE.MeshBasicMaterial({ color: 0x0a0c0f });
  const wires = [];
  // 每根杆和左右远处的锚点之间拉弧
  const anchors = [-42, 26];
  for (const p of poles) {
    for (const a of anchors) {
      for (const dy of [0, -0.14]) {
        const y0 = 7.2 + dy;
        const midY = y0 - 0.55 - Math.abs(a - p.x) * 0.012;
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(p.x, y0, p.z),
          new THREE.Vector3(p.x + (a - p.x) * 0.3, midY - 0.1, p.z + 0.1),
          new THREE.Vector3(p.x + (a - p.x) * 0.7, midY - 0.12, p.z + 0.16),
          new THREE.Vector3(a, y0 + 0.35, p.z + 0.2),
        ]);
        const geo = new THREE.TubeGeometry(curve, 26, 0.017, 4, false);
        const mesh = new THREE.Mesh(geo, matWire);
        parent.add(mesh);
        wires.push(mesh);
      }
    }
  }
  return wires;
}

/* ------------------------------------------------------------ 自动贩卖机 */

function buildVending(parent, x, z) {
  const g = new THREE.Group();
  const matBody = new THREE.MeshStandardMaterial({ color: 0x8e1f1f, roughness: 0.45, metalness: 0.25 });
  box(1.05, 1.92, 0.78, matBody, 0, 0.96, 0, g);
  // 正面发光面板
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.98, 1.82),
    new THREE.MeshBasicMaterial({ map: vendingTexture() })
  );
  face.position.set(0, 0.96, 0.395);
  g.add(face);
  // 顶部灯
  box(1.0, 0.05, 0.6, new THREE.MeshBasicMaterial({ color: 0x8fb0c8 }), 0, 1.93, 0.05, g);
  g.position.set(x, 0, z);
  parent.add(g);

  const l = new THREE.PointLight(0xa9d8ff, 9, 8, 2);
  l.position.set(x, 1.1, z + 0.85);
  parent.add(l);

  glowSprite(glowTexture(), 0x9fd0ff, 3.4, 0.45, x, 1.1, z + 0.9, parent);

  // 地面反光斑
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 2.6),
    new THREE.MeshBasicMaterial({
      map: glowTexture(),
      color: 0x8fc4ff,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(x, 0.015, z + 0.9);
  pool.renderOrder = 2;
  parent.add(pool);

  return g;
}

/* --------------------------------------------------------------- 路边车 */

function buildCar(parent, x, z, rotY = 0) {
  const g = new THREE.Group();
  const matBody = new THREE.MeshStandardMaterial({ color: 0x14181d, roughness: 0.28, metalness: 0.75 });
  const matGlass = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.15, metalness: 0.4 });
  const matTire = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.95 });

  box(4.3, 0.62, 1.86, matBody, 0, 0.62, 0, g);
  box(2.45, 0.52, 1.72, matGlass, -0.15, 1.16, 0, g);
  box(2.5, 0.06, 1.6, matBody, -0.15, 1.43, 0, g);
  for (const [wx, wz] of [[-1.4, 0.86], [1.4, 0.86], [-1.4, -0.86], [1.4, -0.86]]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 14), matTire);
    t.rotation.x = Math.PI / 2;
    t.position.set(wx, 0.32, wz);
    g.add(t);
  }
  // 尾灯（车尾朝 -x）
  for (const tz of [-0.62, 0.62]) {
    const tl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.14), new THREE.MeshBasicMaterial({ color: 0x50100f }));
    tl.position.set(-2.16, 0.72, tz);
    tl.rotation.y = -Math.PI / 2;
    g.add(tl);
  }

  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);

  // 接触阴影
  const sh = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 2.8),
    new THREE.MeshBasicMaterial({ map: softShadowTexture(), transparent: true, opacity: 0.6, depthWrite: false })
  );
  sh.rotation.x = -Math.PI / 2;
  sh.position.set(x, 0.01, z);
  sh.renderOrder = 1;
  parent.add(sh);

  return g;
}

/* ---------------------------------------------------------------- 斑马线 */

function buildCrosswalk(parent) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xbfc4c4,
    roughness: 0.55,
    metalness: 0.05,
    transparent: true,
    opacity: 0.3,
  });
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const st = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 0.62), mat);
    st.rotation.x = -Math.PI / 2;
    st.position.set(0, 0.008, i * 1.25);
    g.add(st);
  }
  g.position.set(15.5, 0, 2.2);
  parent.add(g);

  // 停止线
  const line = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 8), mat);
  line.rotation.x = -Math.PI / 2;
  line.position.set(9.8, 0.008, 6.2);
  parent.add(line);

  // 马路中间的虚线
  const dashMat = new THREE.MeshStandardMaterial({
    color: 0xcfd2c8,
    roughness: 0.62,
    transparent: true,
    opacity: 0.38,
  });
  for (let i = 0; i < 18; i++) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.16), dashMat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(-34 + i * 4.2, 0.009, 6.4);
    parent.add(d);
  }

  return g;
}

/* ---------------------------------------------------------------- 汇出 */

export function buildStreet() {
  const group = new THREE.Group();
  const { sky, uniforms: skyUniforms } = buildSky();
  group.add(sky);

  buildSkyline(group);

  // 路灯：近处一根，左侧远处一根
  const lampMain = buildLamp(group, 10.6, 1.9, 6.8);
  const lampFar = buildLamp(group, -17.5, 1.4, 6.2);

  // 电线杆 + 电线
  const p1 = buildPole(group, -11.2, 1.2);
  const p2 = buildPole(group, -30, 1.0);
  buildWires(group, [p1, p2]);

  // 自动贩卖机（便利店右侧）
  buildVending(group, 8.3, -2.5);

  // 路边停的车（雾里远处）
  buildCar(group, 19.5, 4.2, 0.02);

  // 斑马线
  buildCrosswalk(group);

  // 消防栓（前景）
  buildHydrant(group, 11.2, 3.4);

  // 街道远处的雾中光点（其他店家 / 车灯）
  const gl = glowTexture();
  const distant = [
    [-26, 0.7, 8, 0xff9a5a, 3.2, 0.22],
    [-38, 0.6, 6, 0xffb070, 4.0, 0.18],
    [-14, 2.6, -8, 0x88b8ff, 2.6, 0.14],
    [30, 0.8, 10, 0xff6a5a, 3.0, 0.2],
    [24, 3.2, -14, 0xa8ffe0, 3.4, 0.12],
    // 地平线上的城市光污染
    [-46, 1.4, -20, 0xffb070, 9, 0.09],
    [40, 1.8, -30, 0xffd0a0, 10, 0.07],
    [2, 9.5, -46, 0xffc890, 18, 0.05],
    [-30, 7.0, -40, 0xffd8b0, 12, 0.045],
  ];
  for (const [x, y, z, c, s, o] of distant) {
    glowSprite(gl, c, s, o, x, y, z, group);
  }

  return { group, sky, skyUniforms, lamps: [lampMain, lampFar], vending: true };
}
