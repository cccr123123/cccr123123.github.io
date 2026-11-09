// 程序化贴图库：所有画面素材都用 canvas 现画，不依赖任何外部图片。
// 这样最终产物是一份可以双击直接打开的静态文件。
import * as THREE from 'three';

const JP = '"Yu Gothic","Meiryo","Hiragino Sans","Microsoft YaHei","PingFang SC",system-ui,sans-serif';
const MINCHO = '"Yu Mincho","Hiragino Mincho ProN","Songti SC","SimSun",serif';

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d') };
}

function toTexture(canvas, { srgb = true, repeat, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.needsUpdate = true;
  return t;
}

/* ---------------------------------------------------------------- 噪声 */

function hash2(x, y, seed = 0) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

/** 可平铺的 value noise fbm，返回 Float32Array(size*size)，值域 0..1 */
function fbmTile(size, freq, octaves = 4, seed = 0) {
  const out = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  let f = freq;
  for (let o = 0; o < octaves; o++) {
    const grid = new Float32Array(f * f);
    for (let i = 0; i < grid.length; i++) grid[i] = Math.random();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const gx = (x / size) * f;
        const gy = (y / size) * f;
        const x0 = Math.floor(gx) % f;
        const y0 = Math.floor(gy) % f;
        const x1 = (x0 + 1) % f;
        const y1 = (y0 + 1) % f;
        const fx = gx - Math.floor(gx);
        const fy = gy - Math.floor(gy);
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);
        const a = grid[y0 * f + x0];
        const b = grid[y0 * f + x1];
        const c = grid[y1 * f + x0];
        const d = grid[y1 * f + x1];
        const v = (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
        out[y * size + x] += v * amp;
      }
    }
    total += amp;
    amp *= 0.5;
    f *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** 把 fbm 转成可采样 canvas（灰度） */
function fbmCanvas(size, freq, octaves, seed, { contrast = 1, brightness = 1 } = {}) {
  const data = fbmTile(size, freq, octaves, seed);
  const { c, ctx } = canvas2d(size, size);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < data.length; i++) {
    let v = Math.pow(data[i], contrast) * brightness;
    v = Math.max(0, Math.min(1, v));
    const p = i * 4;
    img.data[p] = img.data[p + 1] = img.data[p + 2] = v * 255;
    img.data[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { c, ctx };
}

/* ------------------------------------------------------- 招牌 / 灯箱 */

/** 便利店主招牌：乳白灯箱 + 墨绿字 + 橙色 24H */
export function signTexture() {
  const W = 2048;
  const H = 360;
  const { c, ctx } = canvas2d(W, H);

  // 灯箱底色：微微发暖的乳白
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#fbfdf6');
  bg.addColorStop(0.55, '#f2f6ea');
  bg.addColorStop(1, '#e8eede');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 顶部极细的绿线
  ctx.fillStyle = '#0f6b4f';
  ctx.fillRect(0, 0, W, 10);

  // 主字
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0b3d31';
  ctx.font = `700 168px ${JP}`;
  ctx.letterSpacing = '10px';
  ctx.fillText('星野マート', 92, H * 0.47);

  // 右侧 24H 橙块
  const bx = W - 400;
  ctx.fillStyle = '#e85d1f';
  ctx.beginPath();
  ctx.roundRect(bx, 46, 300, H - 132, 26);
  ctx.fill();
  ctx.fillStyle = '#fff6ec';
  ctx.font = `800 132px ${JP}`;
  ctx.textAlign = 'center';
  ctx.fillText('24H', bx + 150, 46 + (H - 132) / 2 + 6);

  // 下方的罗马字小字
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(11,61,49,0.72)';
  ctx.font = `500 44px ${JP}`;
  ctx.letterSpacing = '6px';
  ctx.fillText('HOSHINO MART', 96, H * 0.92);

  // 灯箱表面的竖向光带（模拟灯管）
  ctx.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 26; i++) {
    const x = (i / 26) * W;
    const g = ctx.createLinearGradient(x, 0, x + 26, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.28)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 26, H);
  }
  ctx.globalCompositeOperation = 'source-over';

  return toTexture(c);
}

/** 侧面竖招牌：COFFEE */
export function sideSignTexture() {
  const { c, ctx } = canvas2d(256, 1024);
  ctx.fillStyle = '#120f0b';
  ctx.fillRect(0, 0, 256, 1024);

  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, 'rgba(255,170,80,0.10)');
  g.addColorStop(0.5, 'rgba(255,190,110,0.20)');
  g.addColorStop(1, 'rgba(255,170,80,0.10)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 1024);

  ctx.strokeStyle = 'rgba(255,180,90,0.55)';
  ctx.lineWidth = 5;
  ctx.strokeRect(16, 16, 224, 992);

  // 竖排文字
  ctx.save();
  ctx.translate(128, 480);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffb75e';
  ctx.shadowColor = '#ff9a3c';
  ctx.shadowBlur = 26;
  ctx.font = `700 104px ${JP}`;
  const word = 'COFFEE';
  for (let i = 0; i < word.length; i++) {
    ctx.fillText(word[i], 0, (i - (word.length - 1) / 2) * 118);
  }
  ctx.restore();

  // 底部一个咖啡杯图形
  ctx.save();
  ctx.translate(128, 880);
  ctx.strokeStyle = '#ffb75e';
  ctx.lineWidth = 7;
  ctx.shadowColor = '#ff9a3c';
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.moveTo(-46, -34);
  ctx.lineTo(40, -34);
  ctx.lineTo(30, 30);
  ctx.lineTo(-36, 30);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(50, -6, 22, -Math.PI * 0.45, Math.PI * 0.45);
  ctx.stroke();
  // 热气
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 26, -48);
    ctx.bezierCurveTo(i * 26 + 18, -70, i * 26 - 18, -88, i * 26, -108);
    ctx.stroke();
  }
  ctx.restore();

  return toTexture(c);
}

/** 侧招牌：竖排「珈琲」，挂在主灯箱下方 */
export function coffeeSignTexture() {
  const { c, ctx } = canvas2d(256, 512);
  ctx.fillStyle = '#100d0a';
  ctx.fillRect(0, 0, 256, 512);

  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, 'rgba(255,170,80,0.14)');
  g.addColorStop(0.5, 'rgba(255,190,110,0.22)');
  g.addColorStop(1, 'rgba(255,170,80,0.10)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 512);

  ctx.strokeStyle = 'rgba(255,180,90,0.45)';
  ctx.lineWidth = 4;
  ctx.strokeRect(11, 11, 234, 490);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffc27c';
  ctx.shadowColor = '#ff9a3c';
  ctx.shadowBlur = 26;
  ctx.font = `700 132px ${MINCHO}`;
  ctx.fillText('珈', 128, 150);
  ctx.fillText('琲', 128, 310);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,190,114,0.72)';
  ctx.font = `500 40px ${JP}`;
  ctx.letterSpacing = '4px';
  ctx.fillText('COFFEE', 128, 442);

  return toTexture(c);
}

/** 门口 OPEN 小灯牌 */
export function openSignTexture() {
  const { c, ctx } = canvas2d(512, 256);
  ctx.fillStyle = '#c81f1f';
  ctx.fillRect(0, 0, 512, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,255,255,0.22)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = 'rgba(255,240,230,0.9)';
  ctx.lineWidth = 8;
  ctx.strokeRect(18, 18, 476, 220);
  ctx.fillStyle = '#fff4ec';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 132px ${JP}`;
  ctx.letterSpacing = '8px';
  ctx.fillText('OPEN', 256, 118);
  ctx.font = `500 38px ${JP}`;
  ctx.fillText('24 HOURS', 256, 202);
  return toTexture(c);
}

/** 玻璃窗上的海报（抽象化的便利店促销图） */
export function posterTexture(variant = 0) {
  const { c, ctx } = canvas2d(512, 720);
  const palettes = [
    ['#f7d84f', '#d8442a', '#2b2b2b'],
    ['#8fe0c8', '#125e52', '#fdf6e3'],
    ['#ff9c6e', '#3a1d1d', '#ffe9c9'],
  ];
  const [a, b, d] = palettes[variant % palettes.length];

  ctx.fillStyle = d;
  ctx.fillRect(0, 0, 512, 720);

  // 上半大色块
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, 512, 300);
  ctx.fillStyle = b;
  ctx.beginPath();
  ctx.arc(256, 150, 118, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = d;
  ctx.beginPath();
  ctx.arc(256, 150, 78, 0, Math.PI * 2);
  ctx.fill();

  // 文字块（用抽象条代替具体文案，避免糊字）
  ctx.fillStyle = b;
  ctx.font = `800 62px ${JP}`;
  ctx.textAlign = 'center';
  ctx.fillText(variant === 1 ? 'ホット' : 'NEW', 256, 400);
  ctx.font = `700 48px ${JP}`;
  ctx.fillStyle = d;
  ctx.fillText(variant === 1 ? 'COFFEE' : 'ARRIVAL', 256, 470);

  // 价格标签
  ctx.fillStyle = a;
  ctx.beginPath();
  ctx.roundRect(150, 540, 212, 92, 12);
  ctx.fill();
  ctx.fillStyle = b;
  ctx.font = `800 60px ${JP}`;
  ctx.fillText('128円', 256, 602);

  // 底部小字
  ctx.font = `500 24px ${JP}`;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText('HOSHINO MART  24H', 256, 686);

  return toTexture(c);
}

/* ------------------------------------------------------- 地面材质 */

/** 人行道砖：可平铺 */
export function sidewalkTexture() {
  const S = 512;
  const { c, ctx } = canvas2d(S, S);
  const noise = fbmCanvas(S, 8, 4, 11, { contrast: 1.4, brightness: 1.0 });

  // 砖格：4 列 x 8 行，错缝
  const bw = S / 4;
  const bh = S / 8;
  ctx.fillStyle = '#20242a';
  ctx.fillRect(0, 0, S, S);
  for (let row = 0; row < 8; row++) {
    const off = row % 2 === 0 ? 0 : bw / 2;
    for (let col = -1; col < 5; col++) {
      const x = col * bw + off + 2;
      const y = row * bh + 2;
      const w = bw - 4;
      const h = bh - 4;
      const v = 56 + Math.random() * 22;
      ctx.fillStyle = `rgb(${v | 0},${(v + 4) | 0},${(v + 9) | 0})`;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 3);
      ctx.fill();
      // 每块砖轻微高光边
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, w - 2, h - 2, 3);
      ctx.stroke();
    }
  }

  // 叠一层噪声细节
  ctx.globalAlpha = 0.16;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(noise.c, 0, 0, S, S);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  return toTexture(c, { repeat: [1, 1] });
}

/** 湿沥青（带碎石颗粒） */
export function asphaltTexture() {
  const S = 512;
  const { c, ctx } = canvas2d(S, S);
  ctx.fillStyle = '#191b1f';
  ctx.fillRect(0, 0, S, S);

  // 碎石颗粒
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const r = Math.random() * 1.6 + 0.3;
    const v = Math.random() > 0.5 ? 46 + Math.random() * 40 : 12 + Math.random() * 18;
    ctx.fillStyle = `rgba(${v | 0},${(v + 3) | 0},${(v + 6) | 0},${0.35 + Math.random() * 0.45})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 大块色差
  ctx.globalAlpha = 0.22;
  ctx.globalCompositeOperation = 'overlay';
  const n = fbmCanvas(S, 4, 4, 5, { contrast: 1.2, brightness: 1 });
  ctx.drawImage(n.c, 0, 0, S, S);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  return toTexture(c, { repeat: [1, 1] });
}

/** 水洼遮罩：亮 = 积水（湿），暗 = 干（粗） */
export function puddleTexture() {
  const S = 512;
  const { c, ctx } = canvas2d(S, S);
  const n1 = fbmTile(S, 3, 4, 21);
  const n2 = fbmTile(S, 9, 3, 77);
  const img = ctx.createImageData(S, S);
  for (let i = 0; i < n1.length; i++) {
    // 大尺度 + 小尺度混合，拉到合适阈值区间
    let v = n1[i] * 0.75 + n2[i] * 0.25;
    v = Math.max(0, Math.min(1, (v - 0.32) * 2.4));
    const p = i * 4;
    img.data[p] = img.data[p + 1] = img.data[p + 2] = v * 255;
    img.data[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: false, repeat: [1, 1] });
}

/** 店内浅色地砖 */
export function shopFloorTexture() {
  const S = 1024;
  const { c, ctx } = canvas2d(S, S);
  ctx.fillStyle = '#cfd3cc';
  ctx.fillRect(0, 0, S, S);
  const n = 4;
  const step = S / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const v = 208 + Math.random() * 18;
      ctx.fillStyle = `rgb(${v | 0},${(v + 2) | 0},${(v - 4) | 0})`;
      ctx.fillRect(x * step + 1.5, y * step + 1.5, step - 3, step - 3);
      ctx.strokeStyle = 'rgba(120,130,125,0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x * step + 1.5, y * step + 1.5, step - 3, step - 3);
    }
  }
  return toTexture(c, { repeat: [4, 2] });
}

/* --------------------------------------------------- 远景 / 其他 */

/** 居民楼窗户阵列（emissive 用） */
export function buildingWindowsTexture() {
  const W = 256;
  const H = 512;
  const { c, ctx } = canvas2d(W, H);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  const cols = 7;
  const rows = 16;
  const cw = W / cols;
  const ch = H / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (Math.random() > 0.32) continue;
      const warm = Math.random();
      const r = 255;
      const g = 190 + warm * 50;
      const b = 120 + warm * 80;
      const a = 0.22 + Math.random() * 0.58;
      ctx.fillStyle = `rgba(${r},${g | 0},${b | 0},${a})`;
      const pad = cw * 0.22;
      ctx.fillRect(x * cw + pad, y * ch + ch * 0.22, cw - pad * 2, ch * 0.42);
    }
  }
  return toTexture(c);
}

/** 自动贩卖机正面 */
export function vendingTexture() {
  const W = 512;
  const H = 900;
  const { c, ctx } = canvas2d(W, H);

  // 机身：暗红 + 白顶
  ctx.fillStyle = '#c62a2a';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f2f2ee';
  ctx.fillRect(0, 0, W, 92);

  // 顶部小字
  ctx.fillStyle = '#c62a2a';
  ctx.font = `800 40px ${JP}`;
  ctx.textAlign = 'center';
  ctx.fillText('DRINK', W / 2, 62);

  // 商品展示窗
  ctx.fillStyle = '#0c0f12';
  ctx.fillRect(28, 118, W - 56, 520);

  // 3x4 商品格
  const cols = 3;
  const rows = 4;
  const gw = (W - 56) / cols;
  const gh = 520 / rows;
  const colors = ['#ff6b3d', '#4ad6b0', '#ffd84d', '#5aa8ff', '#ff8ab0', '#b7ff6b', '#ff4d4d', '#8f7bff'];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = 28 + x * gw;
      const py = 118 + y * gh;
      // 背光
      ctx.fillStyle = 'rgba(190,225,255,0.12)';
      ctx.fillRect(px + 6, py + 6, gw - 12, gh - 12);
      // 瓶子
      const col = colors[(x + y * cols) % colors.length];
      const bw = gw * 0.32;
      const bh = gh * 0.55;
      const bx = px + gw / 2 - bw / 2;
      const by = py + gh * 0.62 - bh / 2;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, bw * 0.28);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(bx + bw * 0.2, by + bh * 0.18, bw * 0.2, bh * 0.5);
      // 瓶盖
      ctx.fillStyle = '#e9e9e3';
      ctx.fillRect(bx + bw * 0.28, by - bh * 0.12, bw * 0.44, bh * 0.14);
      // 价签
      ctx.fillStyle = '#ffd84d';
      ctx.fillRect(px + gw * 0.5 - 26, py + gh - 34, 52, 20);
    }
  }

  // 投币 / 按钮区
  ctx.fillStyle = '#2a2a2c';
  ctx.fillRect(28, 660, W - 56, 90);
  ctx.fillStyle = '#8affc1';
  ctx.beginPath();
  ctx.arc(96, 705, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff6464';
  ctx.beginPath();
  ctx.arc(150, 705, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d8d8d2';
  ctx.font = `600 30px ${JP}`;
  ctx.textAlign = 'right';
  ctx.fillText('130円', W - 70, 716);

  // 取物口
  ctx.fillStyle = '#08090b';
  ctx.fillRect(64, 790, W - 128, 66);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 3;
  ctx.strokeRect(64, 790, W - 128, 66);

  return toTexture(c);
}

/** 遮阳篷条纹 */
export function awningTexture() {
  const W = 512;
  const H = 128;
  const { c, ctx } = canvas2d(W, H);
  const colors = ['#7c1f22', '#e9e2d4'];
  const stripes = 12;
  const sw = W / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = colors[i % 2];
    ctx.fillRect(i * sw, 0, sw + 1, H);
  }
  // 布面脏污
  ctx.globalAlpha = 0.18;
  const n = fbmCanvas(256, 6, 3, 33, { contrast: 1.5, brightness: 1 });
  ctx.drawImage(n.c, 0, 0, W, H);
  ctx.globalAlpha = 1;
  return toTexture(c);
}

/** 冷柜玻璃门（发光冷白 + 商品剪影） */
export function fridgeTexture() {
  const W = 1024;
  const H = 512;
  const { c, ctx } = canvas2d(W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#eaf6ff');
  g.addColorStop(0.55, '#d3e9f7');
  g.addColorStop(1, '#a9c8dc');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 里面一排排饮料
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 26; i++) {
      const x = i * 39 + 10 + (row % 2) * 6;
      const y = 60 + row * 108;
      const col = ['#b0563c', '#3f8f7d', '#b39a45', '#4f7fa8', '#a8657c', '#7fa05a'][(i + row) % 6];
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y, 24, 72);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(x + 4, y + 6, 7, 40);
    }
    // 层板
    ctx.fillStyle = 'rgba(80,110,130,0.45)';
    ctx.fillRect(0, 60 + row * 108 + 78, W, 5);
  }

  // 门框竖条
  for (let i = 0; i <= 4; i++) {
    ctx.fillStyle = 'rgba(40,55,65,0.55)';
    ctx.fillRect((i / 4) * W - 6, 0, 12, H);
  }
  // 玻璃反光
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createLinearGradient(0, 0, W, H);
  gl.addColorStop(0.0, 'rgba(255,255,255,0)');
  gl.addColorStop(0.42, 'rgba(255,255,255,0.3)');
  gl.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';

  return toTexture(c);
}

/** 径向光晕（sprite 用） */
export function glowTexture() {
  const S = 256;
  const { c, ctx } = canvas2d(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.22, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.16)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return toTexture(c);
}

/** 柔和的圆形暗影（接触阴影贴花） */
export function softShadowTexture() {
  const S = 128;
  const { c, ctx } = canvas2d(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.85)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return toTexture(c, { srgb: false });
}

/** 夜色等距柱状环境贴图（给玻璃 / 金属提供反射） */
export function envTexture() {
  const W = 1024;
  const H = 512;
  const { c, ctx } = canvas2d(W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#05070d');
  g.addColorStop(0.42, '#0a1120');
  g.addColorStop(0.52, '#243044');
  g.addColorStop(0.58, '#3a2f2a');
  g.addColorStop(0.66, '#0d1117');
  g.addColorStop(1, '#04050a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 地平线上的城市光斑
  ctx.globalCompositeOperation = 'lighter';
  const blobs = [
    [140, 268, 90, 'rgba(255,150,70,0.35)'],
    [360, 276, 120, 'rgba(255,190,110,0.22)'],
    [620, 264, 80, 'rgba(120,220,255,0.18)'],
    [860, 272, 140, 'rgba(255,140,60,0.25)'],
    [500, 256, 60, 'rgba(160,255,220,0.14)'],
  ];
  for (const [x, y, r, col] of blobs) {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, col);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';

  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** 店内墙面：米白 + 污渍 + 分格板缝 */
export function wallTexture() {
  const S = 1024;
  const { c, ctx } = canvas2d(S, S);
  ctx.fillStyle = '#d6d0c2';
  ctx.fillRect(0, 0, S, S);

  // 斑驳污渍
  const n = fbmCanvas(S, 5, 4, 41, { contrast: 1.7, brightness: 1 });
  ctx.globalAlpha = 0.16;
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(n.c, 0, 0, S, S);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // 靠近地面的返潮痕迹
  const g = ctx.createLinearGradient(0, S * 0.72, 0, S);
  g.addColorStop(0, 'rgba(90,80,66,0)');
  g.addColorStop(1, 'rgba(90,80,66,0.22)');
  ctx.fillStyle = g;
  ctx.fillRect(0, S * 0.72, S, S * 0.28);

  // 板缝
  ctx.strokeStyle = 'rgba(60,56,48,0.10)';
  ctx.lineWidth = 2;
  const step = S / 4;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(S, i * step); ctx.stroke();
  }
  // 细噪点
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 1, 1);
  }
  return toTexture(c, { repeat: [2, 1] });
}

/** 金属拉丝（货架、柜台） */
export function metalTexture() {
  const S = 1024;
  const { c, ctx } = canvas2d(S, S);
  ctx.fillStyle = '#b4b1a8';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 1200; i++) {
    const y = Math.random() * S;
    const a = 0.03 + Math.random() * 0.07;
    ctx.strokeStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    ctx.lineWidth = 0.5 + Math.random();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(S, y + (Math.random() - 0.5) * 3);
    ctx.stroke();
  }
  // 少量划痕
  for (let i = 0; i < 30; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.08})`;
    ctx.lineWidth = 0.7;
    const x = Math.random() * S;
    const y = Math.random() * S;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 90, y + (Math.random() - 0.5) * 20);
    ctx.stroke();
  }
  return toTexture(c, { repeat: [2, 2] });
}

/** 地板粗糙度：积水 / 磨损让反光不均匀 */
export function floorRoughTexture() {
  const S = 256;
  const { c, ctx } = canvas2d(S, S);
  const n1 = fbmTile(S, 4, 4, 91);
  const n2 = fbmTile(S, 11, 3, 55);
  const img = ctx.createImageData(S, S);
  for (let i = 0; i < n1.length; i++) {
    // 大部分是较光滑的瓷砖，少量粗糙带
    let v = n1[i] * 0.7 + n2[i] * 0.3;
    v = Math.max(0, Math.min(1, (v - 0.35) * 1.8 + 0.28));
    const p = i * 4;
    const g = v * 255;
    img.data[p] = img.data[p + 1] = img.data[p + 2] = g;
    img.data[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: false, repeat: [5, 3] });
}

/* --------------------------------------------------- 法线贴图工具 */

/** 从高度图（Float32Array, size*size, 0..1）生成切线空间法线贴图 */
export function normalFromHeight(height, size, strength = 2.2, aniso = 8) {
  const { c, ctx } = canvas2d(size, size);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const ym = (y - 1 + size) % size;
      const yp = (y + 1) % size;
      const l = height[y * size + xm];
      const r = height[y * size + xp];
      const u = height[ym * size + x];
      const d = height[yp * size + x];
      let nx = (l - r) * strength;
      let ny = (u - d) * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const p = i * 4;
      img.data[p] = (nx * 0.5 + 0.5) * 255;
      img.data[p + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[p + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: false, aniso });
}

/** 墙面的高度图：板缝下凹 + 轻微起伏 */
export function wallHeight() {
  const S = 256;
  const h = new Float32Array(S * S);
  const n = fbmTile(S, 8, 4, 17);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      let v = 0.5 + (n[i] - 0.5) * 0.22;
      // 板缝（每 1/4 处下凹）
      const seam = 0.012;
      const fx = Math.min(x % (S / 4), S / 4 - (x % (S / 4))) / S;
      const fy = Math.min(y % (S / 4), S / 4 - (y % (S / 4))) / S;
      if (fx < seam) v -= 0.28;
      if (fy < seam) v -= 0.28;
      h[i] = Math.max(0, Math.min(1, v));
    }
  }
  return h;
}

/** 金属高度图：横向拉丝纹理 */
export function metalHeight() {
  const S = 256;
  const h = new Float32Array(S * S);
  const n = fbmTile(S, 4, 3, 29);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      // 沿 x 方向的细密拉丝
      const brush = Math.sin(y * 2.7) * 0.03 + (Math.random() - 0.5) * 0.02;
      h[i] = Math.max(0, Math.min(1, 0.5 + (n[i] - 0.5) * 0.15 + brush));
    }
  }
  return h;
}

/** 地板高度图：砖缝下凹 + 砖面轻微起伏 */
export function floorHeight() {
  const S = 256;
  const h = new Float32Array(S * S);
  const n = fbmTile(S, 10, 3, 63);
  const cell = S / 4;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const fx = Math.min(x % cell, cell - (x % cell)) / S;
      const fy = Math.min(y % cell, cell - (y % cell)) / S;
      let v = 0.55 + (n[i] - 0.5) * 0.18;
      if (fx < 0.008) v -= 0.35;
      if (fy < 0.008) v -= 0.35;
      h[i] = Math.max(0, Math.min(1, v));
    }
  }
  return h;
}

/** 细密的雨点波纹专用噪声（给地面 shader 做不规则水痕） */
export function waterNoiseTexture() {
  const S = 256;
  const { c, ctx } = canvas2d(S, S);
  const n = fbmCanvas(S, 12, 4, 91, { contrast: 1.1, brightness: 1 });
  ctx.drawImage(n.c, 0, 0);
  return toTexture(c, { srgb: false, repeat: [1, 1], aniso: 4 });
}

export { canvas2d, toTexture, fbmCanvas, MINCHO };
