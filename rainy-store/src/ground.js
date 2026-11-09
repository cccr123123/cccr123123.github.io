// 湿地面：以 Reflector 的镜面渲染为底，改写 shader 做
// 水洼遮罩 / 雨滴涟漪 / 菲涅尔 / 人行道与沥青分区 / 场景雾
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { puddleTexture, waterNoiseTexture, sidewalkTexture, asphaltTexture } from './textures.js';

const VS = /* glsl */ `
  uniform mat4 textureMatrix;
  varying vec4 vUv;
  varying vec3 vWorldPos;

  #include <common>
  #include <fog_pars_vertex>

  void main() {
    vUv = textureMatrix * vec4(position, 1.0);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`;

const FS = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D uPuddle;
  uniform sampler2D uNoise;
  uniform sampler2D uBrick;
  uniform sampler2D uAsphalt;
  uniform float uTime;
  uniform float uWet;
  uniform float uRain;
  uniform float uSidewalkZ;

  varying vec4 vUv;
  varying vec3 vWorldPos;

  #include <common>
  #include <fog_pars_fragment>

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // 一片雨滴涟漪：每个格子一个扩散的环，生命周期循环
  float rippleLayer(vec2 xz, float t, float density, float speed, float seed) {
    vec2 g = xz * density;
    vec2 id = floor(g) + seed;
    vec2 f = fract(g) - 0.5;
    float h = hash21(id);
    float phase = fract(t * speed + h * 7.13);
    float radius = phase * 0.42;
    float d = length(f);
    float ring = smoothstep(0.05, 0.0, abs(d - radius));
    float inner = smoothstep(0.03, 0.0, abs(d - radius * 0.55)) * 0.45;
    ring = (ring + inner) * smoothstep(0.5, 0.32, d);
    // 只有一部分格子在下雨点
    ring *= step(0.55, hash21(id + 17.0));
    float fade = (1.0 - phase);
    return ring * fade * fade;
  }

  void main() {
    vec3 wp = vWorldPos;
    vec2 xz = wp.xz;

    // z 小于 uSidewalkZ 是人行道，大于则是马路
    float walk = step(xz.y, uSidewalkZ);

    // ---- 表面
    vec3 asphalt = texture2D(uAsphalt, xz * 0.4).rgb;
    vec3 brick = texture2D(uBrick, xz * 0.6).rgb;
    vec3 base = mix(asphalt, brick, walk);

    float detail = texture2D(uNoise, xz * 0.11).r;
    base *= 0.78 + 0.42 * detail;

    // ---- 积水遮罩（两个尺度叠加）
    float p1 = texture2D(uPuddle, xz * 0.042).r;
    float p2 = texture2D(uPuddle, xz * 0.145 + 0.37).r;
    float puddle = clamp(p1 * 0.78 + p2 * 0.42, 0.0, 1.0);
    puddle = mix(0.06, 1.0, puddle);
    puddle *= mix(1.0, 0.55, walk);
    puddle = smoothstep(0.22, 0.95, puddle);

    // ---- 雨滴涟漪
    float ripple = 0.0;
    ripple += rippleLayer(xz, uTime, 3.1, 0.55, 0.0);
    ripple += rippleLayer(xz, uTime * 1.13 + 3.1, 5.0, 0.72, 7.0) * 0.7;
    ripple += rippleLayer(xz, uTime * 0.87 + 9.4, 7.6, 0.9, 3.0) * 0.4;
    ripple *= uRain;
    ripple *= mix(0.35, 1.0, puddle);

    // ---- 反射采样（投影坐标 + 涟漪/水波扰动）
    vec2 suv = vUv.xy / max(vUv.w, 0.0001);
    float wob = texture2D(uNoise, xz * 1.7 + vec2(uTime * 0.013, uTime * 0.007)).r - 0.5;
    float wob2 = texture2D(uNoise, xz * 3.9 - vec2(uTime * 0.02, 0.0)).r - 0.5;
    vec2 distort = vec2(wob * 0.0022 + wob2 * 0.0009) * (0.25 + puddle * 1.1);
    // 涟漪的径向推力
    vec2 rg = fract(xz * 1.15) - 0.5;
    distort += rg * ripple * 0.006;

    vec3 refl = texture2D(tDiffuse, suv + distort).rgb;

    // ---- 菲涅尔
    vec3 viewDir = normalize(cameraPosition - wp);
    float fres = pow(1.0 - clamp(viewDir.y, 0.0, 1.0), 2.2);

    float wetness = clamp((0.12 + puddle * 0.86) * uWet, 0.0, 1.0);
    float reflAmt = wetness * mix(0.22, 1.0, fres);

    vec3 reflCol = refl * mix(0.42, 0.9, fres) * vec3(0.84, 0.9, 1.0);

    vec3 col = base * (1.0 - reflAmt) + reflCol * reflAmt;

    // 涟漪亮边 + 涟漪把反射打碎
    col += (vec3(0.5, 0.62, 0.78) * 0.42 + refl * 0.3) * ripple * (0.22 + fres * 0.9);

    // 湿了之后整体压暗一点，更接地
    col *= mix(0.7, 1.0, clamp(wetness + 0.35, 0.0, 1.0));

    // 人行道边缘的一条浅色路缘线
    float curb = smoothstep(0.055, 0.0, abs(xz.y - uSidewalkZ)) * step(abs(xz.x), 42.0);
    col = mix(col, col * 0.55 + vec3(0.30, 0.32, 0.34) * 0.55, curb * 0.8);

    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }
`;

export function createWetGround({
  width = 170,
  depth = 110,
  centerZ = 14,
  sidewalkZ = 0.62,
} = {}) {
  const geo = new THREE.PlaneGeometry(width, depth);
  const reflector = new Reflector(geo, {
    clipBias: 0.004,
    textureWidth: 640,
    textureHeight: 640,
    color: 0x88919e,
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.set(0, 0, centerZ);

  const mat = reflector.material;
  const textureMatrix = mat.uniforms.textureMatrix.value;
  const reflectionTex = mat.uniforms.tDiffuse.value;

  // 换掉 FragmentShader，并补上需要的 uniform
  mat.vertexShader = VS;
  mat.fragmentShader = FS;
  mat.uniforms = Object.assign(
    THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    {
      tDiffuse: { value: reflectionTex },
      textureMatrix: { value: textureMatrix },
      uPuddle: { value: puddleTexture() },
      uNoise: { value: waterNoiseTexture() },
      uBrick: { value: sidewalkTexture() },
      uAsphalt: { value: asphaltTexture() },
      uTime: { value: 0 },
      uWet: { value: 1.0 },
      uRain: { value: 1.0 },
      uSidewalkZ: { value: sidewalkZ },
    }
  );
  // 贴图按世界坐标平铺，关掉 sRGB→linear 的错误重复设置
  mat.uniforms.uBrick.value.wrapS = mat.uniforms.uBrick.value.wrapT = THREE.RepeatWrapping;
  mat.uniforms.uAsphalt.value.wrapS = mat.uniforms.uAsphalt.value.wrapT = THREE.RepeatWrapping;
  mat.uniforms.uPuddle.value.wrapS = mat.uniforms.uPuddle.value.wrapT = THREE.RepeatWrapping;
  mat.uniforms.uNoise.value.wrapS = mat.uniforms.uNoise.value.wrapT = THREE.RepeatWrapping;
  mat.fog = true;
  mat.needsUpdate = true;

  // 路缘石（三维的一小条，增加地面起伏感）
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x565b60, roughness: 0.55, metalness: 0.1 });
  const curb = new THREE.Mesh(new THREE.BoxGeometry(84, 0.1, 0.3), curbMat);
  curb.position.set(0, 0.045, sidewalkZ + 0.02);

  // 店门前的一小段台阶 / 门槛
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x4a4f55, roughness: 0.5, metalness: 0.1 });
  const step = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.08, 0.36), stepMat);
  step.position.set(0, 0.04, -3.0);

  const group = new THREE.Group();
  group.add(reflector, curb, step);

  return {
    group,
    reflector,
    uniforms: mat.uniforms,
    update(elapsed, rainLevel, wetness) {
      mat.uniforms.uTime.value = elapsed;
      mat.uniforms.uRain.value = rainLevel;
      mat.uniforms.uWet.value = wetness;
    },
  };
}
