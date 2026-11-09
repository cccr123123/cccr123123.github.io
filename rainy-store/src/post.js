// 后处理：环境光遮蔽 → 景深 → 泛光 → 色调映射 → 电影调色
// 各 pass 都常驻，靠 enabled 开关来做画质档位
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

const GradeShader = {
  name: 'GradeShader',
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uVignette: { value: 0.95 },
    uGrain: { value: 0.05 },
    uAberration: { value: 1.0 },
    uFlash: { value: 0 },
    uContrast: { value: 1.07 },
    uFlare: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uAberration;
    uniform float uFlash;
    uniform float uContrast;
    uniform float uFlare;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);

      // 极轻微的镜头色散（边缘更明显）
      float ca = 0.0024 * r2 * uAberration;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - c * ca).b;

      // 镜头耀斑：沿画面中心方向拉长的横向光带（anamorphic 质感）
      vec3 flare = vec3(0.0);
      for (int i = 1; i <= 6; i++) {
        float t = float(i) / 6.0;
        vec2 fuv = uv - vec2(c.x * t * 0.28, c.y * t * 0.05);
        vec3 s = texture2D(tDiffuse, fuv).rgb;
        float b = max(0.0, dot(s, vec3(0.333)) - 0.70);
        flare += vec3(1.0, 0.72, 0.42) * b * (1.0 - t * 0.7);
      }
      col += flare * 0.3 * uFlare;

      // 暗角
      float vig = smoothstep(1.06, 0.18, length(c) * 1.38);
      col *= mix(1.0, vig, uVignette);

      // 日式生活流的暖调：暗部不死黑、亮部偏暖黄
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(col * vec3(0.98, 0.995, 1.03), col * vec3(1.07, 1.015, 0.95), smoothstep(0.18, 0.9, lum) * 0.8);

      // 轻微降饱和 + 对比（生活流不要脏、不要太硬）
      float l2 = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l2), col, 0.9);
      col = (col - 0.48) * uContrast + 0.48;

      // 高光柔化（镜头的轻微辉光）
      col = mix(col, col * vec3(1.02, 1.005, 0.985), smoothstep(0.65, 1.0, lum) * 0.5);

      // 胶片颗粒
      float g = hash(uv * uResolution + fract(uTime) * 371.0);
      float g2 = hash(uv * uResolution * 0.5 + fract(uTime * 0.7) * 113.0);
      col += ((g + g2) * 0.5 - 0.5) * uGrain * (1.0 - lum * 0.5);

      // 闪电
      col += vec3(0.42, 0.5, 0.72) * uFlash * 0.28;

      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};

export function createPost(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const pr = renderer.getPixelRatio();

  const target = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, {
    type: THREE.HalfFloatType,
    samples: 4,
  });

  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(pr);
  composer.setSize(size.x, size.y);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // 环境光遮蔽（只在「高」画质档启用）：让缝隙、墙角、货架下面自然变暗
  let gtao = null;
  try {
    gtao = new GTAOPass(scene, camera, size.x * pr, size.y * pr);
    gtao.output = GTAOPass.OUTPUT.Default;
    gtao.blendIntensity = 0.85;
    gtao.enabled = false;
    composer.addPass(gtao);
  } catch (err) {
    console.warn('[post] GTAO unavailable', err);
    gtao = null;
  }

  // 景深（默认中档开，明显的焦外）
  const bokeh = new BokehPass(scene, camera, {
    focus: 3.4,
    aperture: 0.0004,
    maxblur: 0.009,
  });
  bokeh.enabled = true;
  composer.addPass(bokeh);

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.42, 0.72, 0.8);
  composer.addPass(bloom);

  const output = new OutputPass();
  composer.addPass(output);

  const grade = new ShaderPass(GradeShader);
  grade.renderToScreen = true;
  grade.uniforms.uResolution.value.set(size.x * pr, size.y * pr);
  composer.addPass(grade);

  return {
    composer,
    bloom,
    bokeh,
    gtao,
    grade,
    renderPass,
    setSize(w, h) {
      const pr2 = renderer.getPixelRatio();
      composer.setPixelRatio(pr2);
      composer.setSize(w, h);
      bloom.setSize(w, h);
      bokeh.setSize?.(w, h);
      gtao?.setSize?.(w, h);
      grade.uniforms.uResolution.value.set(w * pr2, h * pr2);
    },
    /** 焦点距离（第一人称：看向哪里就对焦哪里） */
    setFocus(dist, aperture) {
      if (bokeh.uniforms && bokeh.uniforms.focus) {
        bokeh.uniforms.focus.value = dist;
        if (aperture !== undefined) bokeh.uniforms.aperture.value = aperture;
      }
    },
    setFlash(v) {
      grade.uniforms.uFlash.value = v;
    },
    setContrast(v) {
      grade.uniforms.uContrast.value = v;
    },
    update(elapsed) {
      grade.uniforms.uTime.value = elapsed;
    },
  };
}
