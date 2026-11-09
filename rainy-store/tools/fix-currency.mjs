// 一次性修复：货币符号改成日元「円」+ 提高关键贴图分辨率
// （用 Node 做字符串替换，避免 PowerShell 的 $ / [ 插值问题）
import { readFileSync, writeFileSync } from 'node:fs';

const files = [
  'src/ui/hud.js',
  'src/systems/shop.js',
  'src/goods.js',
  'src/interior.js',
  'src/fixtures.js',
  'src/textures.js',
  'index.html',
];

for (const f of files) {
  let t = readFileSync(f, 'utf8');
  const before = t;
  // ¥${xxx}  →  ${xxx}円
  t = t.replace(/¥\$\{([a-zA-Z0-9_.]+)\}/g, '$${$1}円');
  // ¥128 → 128円
  t = t.replace(/¥(\d+)/g, '$1円');
  if (t !== before) {
    writeFileSync(f, t, 'utf8');
    console.log('currency:', f);
  }
}

// 贴图分辨率 512 → 1024（墙 / 金属 / 地板）
let tex = readFileSync('src/textures.js', 'utf8');
const targets = ['shopFloorTexture', 'wallTexture', 'metalTexture'];
let changed = 0;
for (const name of targets) {
  const re = new RegExp(`(export function ${name}\\(\\) \\{\\n  const S = )512;`);
  if (re.test(tex)) {
    tex = tex.replace(re, '$11024;');
    changed++;
  }
}
if (changed) {
  writeFileSync('src/textures.js', tex, 'utf8');
  console.log('texture res bumped:', changed);
}
console.log('done');
