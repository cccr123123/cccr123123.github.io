// 把 Poly Haven 的 .hdr（RGBE）降采样并内嵌成 base64 模块
// 目的：file:// 双击打开时不能用 XHR 拉素材，所以把环境光直接编进 JS
import { readFileSync, writeFileSync } from 'node:fs';

const [, , input, output, outW = '384'] = process.argv;
if (!input || !output) {
  console.error('usage: node embed-hdr.mjs <in.hdr> <out.js> [width]');
  process.exit(1);
}

/* ------------------------------------------------ 解析 .hdr (RGBE) */
function parseHDR(buf) {
  const bytes = new Uint8Array(buf);
  let pos = 0;
  const readLine = () => {
    let s = '';
    while (pos < bytes.length) {
      const c = bytes[pos++];
      if (c === 10) break;
      if (c !== 13) s += String.fromCharCode(c);
    }
    return s;
  };

  let line = readLine();
  if (!line.startsWith('#?')) throw new Error('不是 .hdr 文件');
  while (true) {
    line = readLine();
    if (line === '') break;
  }
  line = readLine();
  const m = line.match(/-Y (\d+) \+X (\d+)/);
  if (!m) throw new Error('分辨率行异常: ' + line);
  const h = +m[1];
  const w = +m[2];
  const rgbe = new Uint8Array(w * h * 4);

  if (w < 8 || w > 32768) {
    for (let i = 0; i < w * h * 4; i++) rgbe[i] = bytes[pos++];
  } else {
    const scanline = new Uint8Array(w * 4);
    for (let y = 0; y < h; y++) {
      const isRLE = bytes[pos] === 2 && bytes[pos + 1] === 2 && (((bytes[pos + 2] << 8) | bytes[pos + 3]) === w);
      if (!isRLE) {
        for (let i = 0; i < w * 4; i++) scanline[i] = bytes[pos++];
      } else {
        pos += 4;
        for (let c = 0; c < 4; c++) {
          let x = 0;
          while (x < w) {
            let count = bytes[pos++];
            if (count > 128) {
              count -= 128;
              const val = bytes[pos++];
              for (let i = 0; i < count; i++) scanline[x++ * 4 + c] = val;
            } else {
              for (let i = 0; i < count; i++) scanline[x++ * 4 + c] = bytes[pos++];
            }
          }
        }
      }
      rgbe.set(scanline, y * w * 4);
    }
  }
  return { w, h, rgbe };
}

const toLinear = (v, e) => (v === 0 ? 0 : (v + 0.5) * Math.pow(2, e - 136));

function encodeRGBE(r, g, b) {
  const v = Math.max(r, g, b);
  if (!(v > 1e-32)) return [0, 0, 0, 0];
  const e = Math.ceil(Math.log2(v));
  const scale = 256 / Math.pow(2, e);
  return [
    Math.min(255, Math.max(0, Math.floor(r * scale))),
    Math.min(255, Math.max(0, Math.floor(g * scale))),
    Math.min(255, Math.max(0, Math.floor(b * scale))),
    Math.max(0, Math.min(255, e + 128)),
  ];
}

/* ------------------------------------------------------ 处理 */
const src = parseHDR(readFileSync(input));
console.log(`源: ${src.w}x${src.h}`);

const nw = Math.min(+outW, src.w);
const nh = Math.round((nw * src.h) / src.w);
const out = new Uint8Array(nw * nh * 4);

const sx = src.w / nw;
const sy = src.h / nh;
for (let y = 0; y < nh; y++) {
  for (let x = 0; x < nw; x++) {
    let r = 0, g = 0, b = 0, n = 0;
    const x0 = Math.floor(x * sx);
    const x1 = Math.min(src.w, Math.ceil((x + 1) * sx));
    const y0 = Math.floor(y * sy);
    const y1 = Math.min(src.h, Math.ceil((y + 1) * sy));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const i = (yy * src.w + xx) * 4;
        const e = src.rgbe[i + 3];
        if (e === 0) { n++; continue; }
        const f = Math.pow(2, e - 136);
        r += (src.rgbe[i] + 0.5) * f;
        g += (src.rgbe[i + 1] + 0.5) * f;
        b += (src.rgbe[i + 2] + 0.5) * f;
        n++;
      }
    }
    if (n > 0) { r /= n; g /= n; b /= n; }
    const [R, G, B, E] = encodeRGBE(r, g, b);
    const o = (y * nw + x) * 4;
    out[o] = R; out[o + 1] = G; out[o + 2] = B; out[o + 3] = E;
  }
}

const b64 = Buffer.from(out).toString('base64');
const js = `// 自动生成：${input.split(/[\\\\/]/).pop()} 降采样到 ${nw}x${nh}（RGBE / base64）
export const ENV_HDR = {
  width: ${nw},
  height: ${nh},
  data: '${b64}',
};
`;
writeFileSync(output, js);
console.log(`输出: ${output}  ${nw}x${nh}  base64 ${Math.round(b64.length / 1024)} KB`);
