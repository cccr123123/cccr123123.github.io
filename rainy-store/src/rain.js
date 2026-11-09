// 雨：围绕相机无限循环的雨丝线段 + 风向倾斜 + 屋檐下无雨
import * as THREE from 'three';

export function createRain({ count = 15000, area = 72, height = 30 } = {}) {
  const positions = new Float32Array(count * 2 * 3);
  const seeds = new Float32Array(count * 2 * 3);
  const tips = new Float32Array(count * 2);
  const speeds = new Float32Array(count * 2);

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * area;
    const z = (Math.random() - 0.5) * area;
    const phase = Math.random() * height;
    const speed = Math.random();
    for (let k = 0; k < 2; k++) {
      const idx = (i * 2 + k) * 3;
      positions[idx] = x;
      positions[idx + 1] = 0;
      positions[idx + 2] = z;
      seeds[idx] = x;
      seeds[idx + 1] = phase;
      seeds[idx + 2] = z;
      tips[i * 2 + k] = k;
      speeds[i * 2 + k] = speed;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  geo.setAttribute('aTip', new THREE.BufferAttribute(tips, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), area);

  const uniforms = {
    uTime: { value: 0 },
    uCam: { value: new THREE.Vector3() },
    uOpacity: { value: 0.23 },
    uWind: { value: 0.62 },
    uArea: { value: area },
    uHeight: { value: height },
    uDry: { value: new THREE.Vector4(0, -6.2, 6.95, 4.7) },
    uUmbrella: { value: new THREE.Vector4(0, 0, 3, 1) },
    uGlow: { value: new THREE.Vector4(0.4, -2.4, 8.0, 1.8) },
    uColor: { value: new THREE.Color(0x9fb6d6) },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aSeed;
      attribute float aTip;
      attribute float aSpeed;
      uniform float uTime;
      uniform vec3 uCam;
      uniform float uArea;
      uniform float uHeight;
      uniform float uWind;
      uniform vec4 uDry;
      uniform vec4 uUmbrella;
      uniform vec4 uGlow;
      varying float vAlpha;

      void main() {
        // 雨域跟随相机，用取模实现无限循环
        vec2 rel = mod(aSeed.xz - uCam.xz + uArea * 0.5, uArea) - uArea * 0.5;
        vec3 p;
        p.xz = uCam.xz + rel;

        float fallSpeed = 13.0 + aSpeed * 13.0;
        float fall = mod(aSeed.y - uTime * fallSpeed, uHeight);
        p.y = fall - 1.5;

        // 雨丝：底部端点更低，并顺风偏移（长拖尾更有电影感）
        float len = 0.55 + aSpeed * 1.05;
        p.y -= aTip * len;
        p.x -= aTip * (0.18 + uWind * 0.55);
        p.z += aTip * 0.12;

        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;

        float dist = length(mv.xyz);
        float nearFade = smoothstep(0.6, 3.4, dist);
        float farFade = 1.0 - smoothstep(17.0, 42.0, dist);

        // 屋檐 / 店内无雨
        vec2 dz = abs(p.xz - uDry.xy);
        float dry = step(dz.x, uDry.z) * step(dz.y, uDry.w);
        dry *= step(p.y, 6.0);      // 只挡屋檐高度以下（屋顶上方照常下雨）

        // 伞下也无雨
        float underU = step(length(p.xz - uUmbrella.xy), uUmbrella.w) * step(p.y, uUmbrella.z);
        dry = max(dry, underU);

        vAlpha = (1.0 - dry * 0.96) * nearFade * farFade * (0.35 + aTip * 0.65);
        vAlpha *= 0.55 + aSpeed * 0.7;

        // 店门口灯光打在雨帘上：靠近门口的一圈雨丝更亮
        vec2 gd = p.xz - uGlow.xy;
        float glow = exp(-dot(gd, gd) / (uGlow.z * 0.45)) * smoothstep(5.5, 0.0, p.y);
        vAlpha *= 1.0 + glow * uGlow.w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(uColor * vAlpha * uOpacity * 2.2, vAlpha * uOpacity);
      }
    `,
  });

  const mesh = new THREE.LineSegments(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;

  // 雨雾：几团缓慢漂移的雾光，增加体积感
  const fogSprites = [];
  const fogGeo = new THREE.PlaneGeometry(1, 1);
  const fogTex = makeFogTexture();
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(
      fogGeo,
      new THREE.MeshBasicMaterial({
        map: fogTex,
        color: 0x8ea6c4,
        transparent: true,
        opacity: 0.07 + Math.random() * 0.05,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    m.scale.set(26 + Math.random() * 18, 8 + Math.random() * 5, 1);
    m.position.set((Math.random() - 0.5) * 46, 1.6 + Math.random() * 2.2, -6 + Math.random() * 20);
    m.renderOrder = 4;
    m.userData.drift = (Math.random() - 0.5) * 0.25;
    m.userData.baseX = m.position.x;
    fogSprites.push(m);
  }

  return {
    mesh,
    uniforms,
    fogSprites,
    update(elapsed, camera) {
      uniforms.uTime.value = elapsed;
      uniforms.uCam.value.copy(camera.position);
      // 阵风：风力和雨势轻微起伏，雨丝不是死的
      const gust = Math.sin(elapsed * 0.37) * 0.22 + Math.sin(elapsed * 1.13 + 2.0) * 0.09;
      uniforms.uWind.value = 0.55 + gust;
      for (const f of fogSprites) {
        f.position.x = f.userData.baseX + Math.sin(elapsed * 0.05 + f.userData.drift * 10) * 2.5;
      }
    },
    setIntensity(v) {
      uniforms.uOpacity.value = 0.23 * v;
    },
    setWind(v) {
      uniforms.uWind.value = v;
    },
  };
}

function makeFogTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.5)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.16)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
