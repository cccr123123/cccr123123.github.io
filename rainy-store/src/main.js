// 雨夜便利店 —— 第一人称版主控
import * as THREE from 'three';
import { createWetGround } from './ground.js';
import { buildStreet } from './street.js';
import { buildExterior } from './exterior.js';
import { buildInterior } from './interior.js';
import { buildFixtures } from './fixtures.js';
import { buildClutter } from './clutter.js';
import { createRain } from './rain.js';
import { createPost } from './post.js';
import { AudioSystem } from './audio.js';
import { FPControls } from './player/fpControls.js';
import { Interactor } from './systems/interact.js';
import { ShopSystem } from './systems/shop.js';
import { DialogueSystem } from './systems/dialogue.js';
import { HUD } from './ui/hud.js';
import { buildClerk, buildCustomer } from './npc/character.js';
import { envTexture } from './textures.js';
import { ENV_HDR } from './env-hdr.js';

/** 解码内嵌的 RGBE 环境图（夜晚街道 HDRi，CC0 / Poly Haven） */
function decodeEnvHDR() {
  const bin = atob(ENV_HDR.data);
  const rgbe = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) rgbe[i] = bin.charCodeAt(i);
  const w = ENV_HDR.width;
  const h = ENV_HDR.height;
  const f32 = new Float32Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const e = rgbe[i * 4 + 3];
    const f = e ? Math.pow(2, e - 136) : 0;
    f32[i * 4] = rgbe[i * 4] * f;
    f32[i * 4 + 1] = rgbe[i * 4 + 1] * f;
    f32[i * 4 + 2] = rgbe[i * 4 + 2] * f;
    f32[i * 4 + 3] = 1;
  }
  // 转成 half float：显存减半，PMREM 处理也快很多
  const half = new Uint16Array(w * h * 4);
  for (let i = 0; i < f32.length; i++) half[i] = THREE.DataUtils.toHalfFloat(f32[i]);
  const tex = new THREE.DataTexture(half, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/* --------------------------------------------------------------- 基础 */

const canvas = document.getElementById('scene');
const loader = document.getElementById('loader');
const loaderText = document.getElementById('loader-text');
const btnEnter = document.getElementById('btn-enter');

function fail(msg) {
  if (loaderText) {
    loaderText.textContent = msg;
    loaderText.classList.add('err');
  }
  if (loader) loader.classList.add('hide');
  console.error(msg);
}
window.addEventListener('error', (e) => fail('出错了：' + (e.message || e)));
window.addEventListener('unhandledrejection', (e) => fail('出错了：' + (e.reason && e.reason.message ? e.reason.message : e.reason)));

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  fail('这台设备的浏览器没有可用的 WebGL。');
  throw e;
}
const DPR = Math.min(window.devicePixelRatio || 1, 1.3);
renderer.setPixelRatio(DPR);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.87;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a1018, 0.026);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.06, 240);
camera.position.set(0.4, 1.62, 7.5);
scene.add(camera);

/* -------------------------------------------------------------- 环境 */

const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
const envSrc = decodeEnvHDR();
const envRT = pmrem.fromEquirectangular(envSrc);
scene.environment = envRT.texture;
scene.environmentIntensity = 0.45;
envSrc.dispose?.();
pmrem.dispose();

const hemi = new THREE.HemisphereLight(0x2b3d5e, 0x0c1016, 0.22);
scene.add(hemi);
const hemiBase = hemi.intensity;
const moon = new THREE.DirectionalLight(0x6f8cc0, 0.28);
moon.position.set(-16, 20, -12);
moon.castShadow = false;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.left = -22;
moon.shadow.camera.right = 22;
moon.shadow.camera.top = 22;
moon.shadow.camera.bottom = -22;
moon.shadow.camera.near = 1;
moon.shadow.camera.far = 70;
moon.shadow.bias = -0.0012;
moon.shadow.normalBias = 0.02;
scene.add(moon);
// 室内基础照明（HDR 环境光已经提供了一部分）
const ambient = new THREE.AmbientLight(0xfff0dc, 0.018);
scene.add(ambient);

// 室内主投影光（天花板中央往下打，给货架和柜台一个统一方向）
// 光比是「立体感」的关键：环境光压低、主光提高，阴影才会真的陷下去
const shopSpot = new THREE.SpotLight(0xffe9c8, 26, 16, 1.15, 0.5, 1.35);
shopSpot.position.set(-0.2, 3.2, -8.4);
shopSpot.target.position.set(-0.2, 0, -8.4);
shopSpot.castShadow = false;
shopSpot.shadow.mapSize.set(2048, 2048);
shopSpot.shadow.camera.near = 0.4;
shopSpot.shadow.camera.far = 16;
shopSpot.shadow.bias = -0.0008;
shopSpot.shadow.normalBias = 0.015;
shopSpot.shadow.radius = 2.5;
scene.add(shopSpot, shopSpot.target);
const shadowLights = [moon, shopSpot];

/* -------------------------------------------------------------- 场景 */

const ground = createWetGround({ sidewalkZ: 0.62 });
scene.add(ground.group);

const street = buildStreet();
scene.add(street.group);

const exterior = buildExterior();
scene.add(exterior.group);

const interior = buildInterior();
scene.add(interior.group);

const fixtures = buildFixtures();
scene.add(fixtures.group);

const clutter = buildClutter();
scene.add(clutter.group);

const rain = createRain({ count: 13500, area: 74, height: 30 });
rain.uniforms.uUmbrella.value.copy(exterior.UMBRELLA);
scene.add(rain.mesh);
for (const f of rain.fogSprites) scene.add(f);

/* -------------------------------------------------------------- NPC */

const clerk = buildClerk();
scene.add(clerk.root);
const customer = buildCustomer();
scene.add(customer.root);

/* -------------------------------------------- 湿地面反射的性能策略 */
// 进店后冻结反射（省掉一整遍场景渲染）；室外渲染反射时临时隐藏室内
const origReflectOnBefore = ground.reflector.onBeforeRender;
let groundFrozen = false;
const hideInReflection = [interior.group, fixtures.group, clerk.root, customer.root];
ground.reflector.onBeforeRender = function (r, s, c) {
  if (groundFrozen) return;
  const saved = hideInReflection.map((o) => o.visible);
  for (const o of hideInReflection) o.visible = false;
  origReflectOnBefore.call(this, r, s, c);
  hideInReflection.forEach((o, i) => { o.visible = saved[i]; });
};

/* ------------------------------------------------------------ 玩家 */
const controls = new FPControls(camera, renderer.domElement, { eyeHeight: 1.62, radius: 0.3 });
controls.setStart(0.4, 7.0, 0);

// 室外碰撞
for (const b of exterior.colliders) controls.addCollider(b);
// 前立面的窗与墙（留出门洞）
controls.addBox(-3.81, -3.4, 5.58, 0.4);
controls.addBox(4.19, -3.4, 4.82, 0.4);
// 室内碰撞
for (const b of interior.colliders) controls.addCollider(b);
for (const b of fixtures.colliders) controls.addCollider(b);
for (const b of clutter.colliders) controls.addCollider(b);

/* --------------------------------------------------------- 交互/系统 */

const hud = new HUD();
hud.playerPos = controls.position;

const interactor = new Interactor(camera, { distance: 3.0, maxAngle: 0.6 });

// 商品
for (const t of interior.interactables) interactor.add(t);
// 收银台
for (const t of fixtures.interactables) interactor.add(t);

// 店员
const clerkTarget = {
  object: clerk.root,
  kind: 'clerk',
  label: '和店员说话',
  hint: '',
  point: new THREE.Vector3(clerk.root.position.x, 1.5, clerk.root.position.z + 0.45),
  source: clerk,
};
interactor.add(clerkTarget);

const audio = new AudioSystem();

const shop = new ShopSystem({
  scene,
  camera,
  interactor,
  hud,
  clerk,
  fixtures,
  audio,
  onMessage: (t) => hud.showMessage(t),
});

const dialogue = new DialogueSystem({
  hud,
  clerk,
  shop,
  audio,
  controls,
  interactor,
});

/* ------------------------------------------------------- NPC 行为 */

let customerState = { idx: 0, wait: 1.2, speed: 0.55 };
const customerPath = [
  new THREE.Vector3(-2.45, 0.02, -6.9),
  new THREE.Vector3(-2.45, 0.02, -12.7),
  new THREE.Vector3(1.45, 0.02, -12.7),
  new THREE.Vector3(1.45, 0.02, -6.9),
];
customer.root.position.copy(customerPath[0]);

function updateCustomer(dt, t) {
  const st = customerState;
  if (st.wait > 0) {
    st.wait -= dt;
    customer.update(dt);
    return;
  }
  const target = customerPath[st.idx];
  const dx = target.x - customer.root.position.x;
  const dz = target.z - customer.root.position.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.08) {
    st.idx = (st.idx + 1) % customerPath.length;
    st.wait = 1.8 + Math.random() * 2.6;
    return;
  }
  const step = Math.min(d, st.speed * dt);
  customer.root.position.x += (dx / d) * step;
  customer.root.position.z += (dz / d) * step;
  customer.setLookTarget(target);
  customer.update(dt);
}

/* --------------------------------------------------------- 后处理 */

const post = createPost(renderer, scene, camera);

/* ------------------------------------------------------------ 状态 */

const state = {
  ready: false,
  started: false,
  rainLevel: 1,
  indoor: 0,
};

const _focusTmp = new THREE.Vector3();

/* --------------------------------------------------------- 画质档位 */

const QUALITY = {
  low: { label: '低', dpr: 1.0, shadows: false, bloom: false, dof: false, gtao: false, env: 0.3, contrast: 1.03 },
  mid: { label: '中', dpr: 1.15, shadows: true, bloom: true, dof: true, gtao: false, env: 0.3, contrast: 1.1 },
  high: { label: '高', dpr: 1.4, shadows: true, bloom: true, dof: true, gtao: true, env: 0.36, contrast: 1.12 },
};
const QUALITY_ORDER = ['low', 'mid', 'high'];
state.quality = 'mid';

function applyQuality(level) {
  const q = QUALITY[level] || QUALITY.mid;
  state.quality = level;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dpr));
  renderer.shadowMap.enabled = q.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  if (post) {
    post.bloom.enabled = q.bloom;
    post.bokeh.enabled = q.dof;
    if (post.gtao) post.gtao.enabled = !!q.gtao;
    post.setContrast(q.contrast);
  }
  scene.environmentIntensity = q.env;

  for (const l of shadowLights) l.castShadow = q.shadows;
  if (q.shadows) {
    scene.traverse((o) => {
      if (o.isMesh || o.isInstancedMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  } else {
    scene.traverse((o) => {
      if (o.isMesh || o.isInstancedMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
      }
    });
  }

  // 景深强度随档位微调
  if (post) post.setFocus(3.4, q.dof ? 0.0004 : 0);

  onResize();
  const btn = document.getElementById('btn-quality');
  if (btn) btn.textContent = `画质 ${q.label}`;
}

document.getElementById('btn-quality')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const i = QUALITY_ORDER.indexOf(state.quality);
  applyQuality(QUALITY_ORDER[(i + 1) % QUALITY_ORDER.length]);
  renderer.domElement.focus?.();
});

try {
  applyQuality('mid');
} catch (err) {
  window.__bootError = String((err && err.stack) || err);
  console.error('[quality boot]', err);
}

/* ------------------------------------------------------------ 交互 */

function currentAction() {
  if (dialogue.open) return;
  const t = interactor.target;
  if (!t) return;

  if (t.kind === 'goods') {
    shop.pickup(t);
  } else if (t.kind === 'checkout') {
    if (shop.phase === 'paying') {
      shop.pay();
      hud.hidePay();
    } else if (shop.isBusy) {
      hud.showMessage('稍等一下，正在结账…');
    } else {
      shop.beginCheckout();
    }
  } else if (t.kind === 'clerk') {
    dialogue.start();
  } else if (t.kind === 'magazine') {
    hud.showMessage('这个月的杂志还蛮好看的（翻了翻）');
    audio.pick();
  }
}

window.addEventListener('keydown', (e) => {
  if (!state.started) return;
  if (e.code === 'KeyE') {
    if (dialogue.open) dialogue.advance();
    else currentAction();
    e.preventDefault();
  }
  if (dialogue.open && /^Digit[1-5]$/.test(e.code)) {
    dialogue.choose(Number(e.code.slice(5)) - 1);
    e.preventDefault();
  }
  if (e.code === 'KeyQ' && !dialogue.open) {
    shop.putBack();
    e.preventDefault();
  }
  if (e.code === 'Escape' && dialogue.open) {
    dialogue.close();
  }
});

// 关闭按钮 / 点对话框空白处也能推进或关闭
document.getElementById('dlg-close')?.addEventListener('click', (e) => {
  e.stopPropagation();
  dialogue.close();
});
document.getElementById('dialogue')?.addEventListener('click', (e) => {
  if (e.target.closest('.dlg-opt') || e.target.closest('.dlg-close')) return;
  if (dialogue.open) dialogue.advance();
});

document.addEventListener('click', (e) => {
  const opt = e.target.closest && e.target.closest('.dlg-opt');
  if (opt) {
    dialogue.choose(Number(opt.dataset.i));
  }
});

/* ------------------------------------------------------------ 声音 */

const btnAudio = document.getElementById('btn-audio');
btnAudio?.addEventListener('click', async (e) => {
  e.stopPropagation();
  const on = await audio.toggle();
  btnAudio.classList.toggle('on', on);
  btnAudio.textContent = on ? '声音 开' : '声音 关';
  // 点完按钮把键盘焦点还给画布，避免后续按键丢失
  renderer.domElement.focus?.();
});

/* ------------------------------------------------------------ 开始 */

const QUERY = new URLSearchParams(location.search);
const AUTO_ENTER = QUERY.has('auto');

function applyPosParam() {
  const p = QUERY.get('pos');
  if (!p) return;
  const [x, z, yaw] = p.split(',').map(Number);
  if (Number.isFinite(x) && Number.isFinite(z)) controls.setStart(x, z, Number.isFinite(yaw) ? yaw : 0);
}
applyPosParam();

function enterGame(withAudio = false) {
  state.started = true;
  // 默认静音：主人可以在左下角自己开声音（避免一进来就被雨声糊一脸）
  if (withAudio) {
    audio.start().then(() => {
      btnAudio.classList.add('on');
      btnAudio.textContent = '声音 开';
    }).catch(() => {});
  }
  if (loader) loader.classList.add('hide');
  setTimeout(() => { if (loader) loader.remove(); }, 1300);
  if (hud) hud.showMessage('按住鼠标拖动看四周 · WASD 走动 · 靠近东西按 E', 5.5);
  // 主动把焦点拿回来，避免第一次按键丢失
  if (renderer.domElement && renderer.domElement.focus) renderer.domElement.focus();
}

function prepareEnter() {
  if (AUTO_ENTER) {
    enterGame(QUERY.get('sound') === '1');
    runDemo(QUERY.get('demo'));
    return;
  }
  if (loaderText) loaderText.textContent = '准备好了 — 雨还在下';
  if (btnEnter) {
    btnEnter.hidden = false;
    btnEnter.addEventListener('click', () => enterGame(false), { once: true });
  }
}

/** 演示/截图用：?auto=1&demo=checkout | dialogue | basket */
function runDemo(kind) {
  if (!kind) return;
  if (kind === 'basket') {
    setTimeout(() => {
      shop.giveSpecial('onigiri_sake', 1);
      shop.giveSpecial('melonpan', 1);
      shop.giveSpecial('coffee_latte', 1);
      hud.showMessage('拿起了 3 件商品');
    }, 900);
  } else if (kind === 'checkout') {
    setTimeout(() => {
      shop.giveSpecial('onigiri_sake', 1);
      shop.giveSpecial('melonpan', 1);
      shop.giveSpecial('coffee_latte', 1);
      controls.setStart(4.2, -3.55, 0);
      setTimeout(() => shop.beginCheckout(), 700);
    }, 900);
  } else if (kind === 'receipt') {
    setTimeout(() => {
      shop.giveSpecial('onigiri_sake', 1);
      shop.giveSpecial('bento_karaage', 1);
      shop.giveSpecial('coffee_latte', 1);
      controls.setStart(4.2, -3.55, 0);
      setTimeout(() => shop.beginCheckout(), 500);
      setTimeout(() => shop.pay(), 7000);
    }, 700);
  } else if (kind === 'dialogue') {
    setTimeout(() => {
      controls.setStart(3.9, -4.35, 0);
      setTimeout(() => dialogue.start(), 700);
    }, 900);
  }
}

/* ------------------------------------------------------------ 主循环 */

const clock = new THREE.Clock();
let elapsed = 0;
let frames = 0;
let fpsTimer = 0;
let fps = 0;

// 闪电
let nextFlashAt = 6 + Math.random() * 8;
let flashAge = -1;
let flashEnergy = 1;

function updateLightning(t, dt) {
  if (flashAge >= 0) {
    flashAge += dt;
    const a = flashAge;
    let v = 0;
    v += Math.exp(-a * 22) * (a < 0.55 ? 1 : 0);
    v += Math.exp(-Math.max(0, a - 0.13) * 17) * 0.6;
    v *= flashEnergy;
    street.skyUniforms.uFlash.value = v;
    post.setFlash(v);
    hemi.intensity = hemiBase + v * 2.2;
    if (a > 2.2) {
      flashAge = -1;
      street.skyUniforms.uFlash.value = 0;
      post.setFlash(0);
      hemi.intensity = hemiBase;
    }
  }
  if (t > nextFlashAt) {
    flashAge = 0;
    flashEnergy = 0.5 + Math.random() * 0.7;
    nextFlashAt = t + 14 + Math.random() * 20;
    if (audio.enabled) audio.thunder(1.6 + Math.random() * 2.0);
  }
}

let prevDoor = 0;

function tick() {
  // 后台标签页里 rAF 会被暂停，用 setTimeout 兜底（逻辑与声音照常）
  if (document.hidden) setTimeout(tick, 33);
  else requestAnimationFrame(tick);

  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  // 单帧里任何一处出错都不能让整个循环停掉（画面冻住是最糟的）
  try {
    // 玩家
    controls.update(dt);

    // 交互
    if (!dialogue.open) {
      interactor.update();
      const t = interactor.target;
      if (t) hud.setPrompt(t.label, t.hint || '');
      else hud.setPrompt(null);
    } else {
      interactor.current = null;
      hud.setPrompt(null);
    }

    // 系统
    shop.update(dt);
    dialogue.update(dt);
    hud.update(dt);

    // 门
    fixtures.api.updateDoor(dt, controls.position);
    const doorNow = fixtures.api.doorOpen;
    if (prevDoor < 0.5 && doorNow >= 0.5) audio.doorBell();
    prevDoor = doorNow;

    // NPC
    clerk.setLookTarget(controls.position);
    clerk.update(dt);
    updateCustomer(dt, elapsed);

    // 声音
    audio.update(dt, controls.position);

    // 环境
    rain.update(elapsed, camera);
    ground.update(elapsed, state.rainLevel, 0.9);
    post.update(elapsed);
    updateLightning(elapsed, dt);

    // 动态对焦：焦点跟着「你看的东西」走（看近处背景糊，看远处前景糊）
    {
      const tg = interactor.target;
      let targetFocus = state.indoor ? 2.8 : 9.0;
      if (tg) {
        const p = tg.point || tg.object.getWorldPosition(_focusTmp);
        if (p) {
          targetFocus = camera.position.distanceTo(p);
          targetFocus = Math.max(0.7, Math.min(14, targetFocus));
        }
      }
      const cur = state.focus || 3.4;
      state.focus = cur + (targetFocus - cur) * Math.min(1, dt * 2.4);
      post.setFocus(state.focus, 0.0004);
    }

    const indoorNow = controls.position.z < -3.2 ? 1 : 0;
    if (indoorNow !== state.indoor) {
      state.indoor = indoorNow;
      // 进店后雾淡一点，免得室内发灰；同时冻结地面反射省性能
      scene.fog.density = indoorNow ? 0.008 : 0.026;
      groundFrozen = indoorNow === 1;
    }

    // 保底：对话已关闭但控制没恢复
    if (!dialogue.open && !controls.enabled) controls.enabled = true;

    post.composer.render();
  } catch (err) {
    if (!state._errLogged) {
      state._errLogged = true;
      window.__lastError = String((err && err.stack) || err);
      console.error('[frame error]', err);
    }
  }

  frames++;
  fpsTimer += dt;
  if (fpsTimer > 1) {
    fps = Math.round(frames / fpsTimer);
    frames = 0;
    fpsTimer = 0;
    state.slowSeconds = 0;
  }
}

/* ------------------------------------------------------------ 启动 */

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  post.setSize(w, h);
}
window.addEventListener('resize', onResize);

// 直接开跑：shader 会在第一帧按需编译（之前先 compile 会让启动卡好几秒）
tick();
prepareEnter();

window.__rainyMart = {
  get fps() { return fps; },
  scene, camera, renderer, controls, interactor, shop, dialogue, hud, state,
  get info() { return renderer.info; },
  get time() { return elapsed; },
  /** 测一帧的真实 draw call / 三角形数（含反射与后处理） */
  measure() {
    renderer.info.autoReset = false;
    renderer.info.reset();
    post.composer.render();
    const out = {
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      programs: renderer.info.programs.length,
    };
    renderer.info.autoReset = true;
    return out;
  },
};
