// 商品：数据 + 包装贴图（canvas 现画）+ 低多边形几何
import * as THREE from 'three';

const JP = '"Yu Gothic","Meiryo","Hiragino Sans","Microsoft YaHei","PingFang SC",sans-serif';

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d') };
}

function toTex(canvas, aniso = 8) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

/** 通用包装贴图：品牌带 + 图形 + 商品名 + 价格 */
function wrapTexture(cfg) {
  const W = 256;
  const H = 384;
  const { c, ctx } = canvas2d(W, H);
  const { bg1, bg2, accent, ink = '#ffffff', title, jp, price, art, badge } = cfg;

  const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
  g.addColorStop(0, bg1);
  g.addColorStop(1, bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 顶部品牌带
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 44);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 17px ${JP}`;
  ctx.fillText('HOSHINO MART', W / 2, 23);

  // 中部美术
  if (art) art(ctx, W, H);

  // 商品名（日文，最多两行）
  ctx.fillStyle = ink;
  ctx.font = `800 40px ${JP}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = splitLines(jp, 5);
  const lineH = 46;
  const startY = 196 - ((lines.length - 1) * lineH) / 2;
  lines.forEach((ln, i) => {
    // 轻微描边，保证在浅色底上也能读
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.strokeText(ln, W / 2, startY + i * lineH);
    ctx.fillText(ln, W / 2, startY + i * lineH);
  });

  // 中文名小字
  ctx.font = `500 20px ${JP}`;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fillText(title, W / 2, 196 + (lines.length * lineH) / 2 + 6);

  // 价格标签
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(W / 2 - 52, H - 62, 104, 40, 8);
  ctx.fill();
  ctx.fillStyle = '#c2382a';
  ctx.font = `800 30px ${JP}`;
  ctx.fillText(`${price}円`, W / 2, H - 41);

  // 角标
  if (badge) {
    ctx.fillStyle = badge.color;
    ctx.beginPath();
    ctx.arc(W - 42, 84, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `800 19px ${JP}`;
    ctx.fillText(badge.text, W - 42, 86);
  }

  return toTex(c);
}

function splitLines(text, perLine) {
  const out = [];
  let cur = '';
  for (const ch of text) {
    cur += ch;
    if (cur.length >= perLine) {
      out.push(cur);
      cur = '';
    }
  }
  if (cur) out.push(cur);
  return out.slice(0, 2);
}

/* ------------------------------------------------------------ 商品数据 */

const artSimple = (kind) => (ctx, W, H) => {
  ctx.save();
  ctx.globalAlpha = 0.9;
  if (kind === 'circle') {
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.arc(W / 2, 120, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 6;
    ctx.stroke();
  } else if (kind === 'stripe') {
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(0, 84, W, 60);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(0, 150, W, 8);
  } else if (kind === 'wave') {
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 7;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 96 + i * 24);
      ctx.bezierCurveTo(W * 0.3, 76 + i * 24, W * 0.7, 116 + i * 24, W, 96 + i * 24);
      ctx.stroke();
    }
  }
  ctx.restore();
};

export const GOODS = [
  {
    id: 'onigiri_sake', name: '鲑鱼饭团', jp: 'おにぎり 鮭', price: 128, kind: 'onigiri',
    shelf: 'cold', tint: 0xf3ead8,
    tex: () => wrapTexture({ bg1: '#f7f2e6', bg2: '#e8dcc4', accent: '#c8402f', ink: '#3a2b22', title: '鲑鱼饭团', jp: 'おにぎり 鮭', price: 128, art: artSimple('circle') }),
  },
  {
    id: 'onigiri_ume', name: '梅子饭团', jp: 'おにぎり 梅', price: 118, kind: 'onigiri',
    shelf: 'cold', tint: 0xf3ead8,
    tex: () => wrapTexture({ bg1: '#f7f2e6', bg2: '#e6d6c6', accent: '#a8335a', ink: '#3a2b22', title: '梅子饭团', jp: 'おにぎり 梅', price: 118, art: artSimple('circle') }),
  },
  {
    id: 'bento_karaage', name: '唐扬便当', jp: 'からあげ弁当', price: 548, kind: 'bento',
    shelf: 'cold', tint: 0x2a2a2e,
    tex: () => wrapTexture({ bg1: '#2b2b30', bg2: '#191919', accent: '#e07030', ink: '#fff4e6', title: '唐扬便当', jp: 'からあげ弁当', price: 548, art: artSimple('stripe'), badge: { color: '#e07030', text: '热' } }),
  },
  {
    id: 'bento_makunouchi', name: '幕之内便当', jp: '幕の内弁当', price: 598, kind: 'bento',
    shelf: 'cold', tint: 0x2a2a2e,
    tex: () => wrapTexture({ bg1: '#26302a', bg2: '#141814', accent: '#3f8f5a', ink: '#f2f7ea', title: '幕之内便当', jp: '幕の内弁当', price: 598, art: artSimple('wave') }),
  },
  {
    id: 'sandwich_egg', name: '蛋沙拉三明治', jp: 'たまごサンド', price: 298, kind: 'sandwich',
    shelf: 'cold', tint: 0xf6f2e8,
    tex: () => wrapTexture({ bg1: '#faf6ee', bg2: '#e9ddc8', accent: '#e8b03c', ink: '#4a3a22', title: '蛋沙拉三明治', jp: 'たまごサンド', price: 298, art: artSimple('stripe') }),
  },
  {
    id: 'coffee_latte', name: '微糖拿铁', jp: '微糖カフェラテ', price: 138, kind: 'can',
    shelf: 'drink', tint: 0x6b4a32,
    tex: () => wrapTexture({ bg1: '#7a5233', bg2: '#3d2718', accent: '#d9a86c', ink: '#fff2e0', title: '微糖拿铁', jp: '微糖カフェラテ', price: 138, art: artSimple('circle') }),
  },
  {
    id: 'tea_green', name: '绿茶', jp: '緑茶', price: 128, kind: 'bottle',
    shelf: 'drink', tint: 0x7fa860,
    tex: () => wrapTexture({ bg1: '#8fb86a', bg2: '#3f6b34', accent: '#d8e8b8', ink: '#f8fff0', title: '绿茶', jp: '緑茶', price: 128, art: artSimple('wave') }),
  },
  {
    id: 'cola', name: '可乐', jp: 'コーラ', price: 118, kind: 'can',
    shelf: 'drink', tint: 0xb03a2e,
    tex: () => wrapTexture({ bg1: '#c0392b', bg2: '#6b1710', accent: '#f2d05a', ink: '#fff6e0', title: '可乐', jp: 'コーラ', price: 118, art: artSimple('wave') }),
  },
  {
    id: 'water', name: '矿泉水', jp: '天然水', price: 98, kind: 'bottle',
    shelf: 'drink', tint: 0x9fc4e0,
    tex: () => wrapTexture({ bg1: '#cfe6f5', bg2: '#7fb2d8', accent: '#2a6aa8', ink: '#ffffff', title: '矿泉水', jp: '天然水', price: 98, art: artSimple('circle') }),
  },
  {
    id: 'cup_noodle_shoyu', name: '酱油杯面', jp: 'カップ麺 醤油', price: 228, kind: 'cup',
    shelf: 'shelf', tint: 0xb03a2e,
    tex: () => wrapTexture({ bg1: '#c8402f', bg2: '#7a1d14', accent: '#f2c14a', ink: '#fff6e6', title: '酱油杯面', jp: 'カップ麺 醤油', price: 228, art: artSimple('stripe') }),
  },
  {
    id: 'cup_noodle_miso', name: '味噌杯面', jp: 'カップ麺 味噌', price: 228, kind: 'cup',
    shelf: 'shelf', tint: 0xc07030,
    tex: () => wrapTexture({ bg1: '#d0832f', bg2: '#8a4413', accent: '#f2d67a', ink: '#fff8e6', title: '味噌杯面', jp: 'カップ麺 味噌', price: 228, art: artSimple('stripe') }),
  },
  {
    id: 'chips_salt', name: '盐味薯片', jp: 'ポテチ 塩', price: 158, kind: 'bag',
    shelf: 'shelf', tint: 0xd8b040,
    tex: () => wrapTexture({ bg1: '#e8c250', bg2: '#b3861c', accent: '#3f6b34', ink: '#fffbe8', title: '盐味薯片', jp: 'ポテチ 塩', price: 158, art: artSimple('wave') }),
  },
  {
    id: 'chocolate', name: '牛奶巧克力', jp: 'チョコレート', price: 188, kind: 'bar',
    shelf: 'shelf', tint: 0x6b4428,
    tex: () => wrapTexture({ bg1: '#5a3a24', bg2: '#2e1c10', accent: '#c9a06a', ink: '#fff2e2', title: '牛奶巧克力', jp: 'チョコレート', price: 188, art: artSimple('stripe') }),
  },
  {
    id: 'melonpan', name: '菠萝面包', jp: 'メロンパン', price: 138, kind: 'bread',
    shelf: 'shelf', tint: 0xd8a850,
    tex: () => wrapTexture({ bg1: '#e3b965', bg2: '#a87830', accent: '#f7efd8', ink: '#4a3418', title: '菠萝面包', jp: 'メロンパン', price: 138, art: artSimple('circle') }),
  },
  {
    id: 'milk', name: '牛奶', jp: '牛乳', price: 168, kind: 'bottle',
    shelf: 'drink', tint: 0xf2f4f6,
    tex: () => wrapTexture({ bg1: '#f7fafc', bg2: '#d6e2ea', accent: '#2f6fa8', ink: '#2a3a48', title: '牛奶', jp: '牛乳', price: 168, art: artSimple('wave') }),
  },
  {
    id: 'ice_vanilla', name: '香草冰淇淋', jp: 'バニラアイス', price: 258, kind: 'icecup',
    shelf: 'cold', tint: 0xf0e8d8,
    tex: () => wrapTexture({ bg1: '#f4efe4', bg2: '#d8c8b0', accent: '#c08a4a', ink: '#4a3a22', title: '香草冰淇淋', jp: 'バニラアイス', price: 258, art: artSimple('circle') }),
  },
  {
    id: 'oden_skewer', name: '关东煮串', jp: 'おでん', price: 100, kind: 'skewer',
    shelf: 'hot', tint: 0xd8b040,
    tex: () => wrapTexture({ bg1: '#e8d6a8', bg2: '#b89a5a', accent: '#7a4a1a', ink: '#4a3418', title: '关东煮串', jp: 'おでん', price: 100, art: artSimple('circle') }),
  },
];

/* -------------------------------------------------- 扩充商品（数据驱动） */
// [id, 中文名, 日文, 价格, 形状, 货架池, 底色1, 底色2, 强调色, 图形]
const EXTRA_GOODS = [
  // 饮料
  ['oj', '橙汁', 'オレンジ', 128, 'can', 'drink', '#e8842a', '#a84c10', '#ffd08a', 'circle'],
  ['sports', '运动饮料', 'スポーツ', 158, 'bottle', 'drink', '#3a86c8', '#164a7a', '#c8ecff', 'wave'],
  ['blackcoffee', '黑咖啡', 'ブラック', 138, 'can', 'drink', '#3a2a20', '#14100c', '#c9a06a', 'stripe'],
  ['soda', '碳酸水', '炭酸水', 108, 'bottle', 'drink', '#cfe6f2', '#8fb8cc', '#2a6a8a', 'circle'],
  ['tea_black', '红茶', '紅茶', 128, 'bottle', 'drink', '#b0472a', '#6a2010', '#f2c07a', 'wave'],
  ['energy', '能量饮料', 'エナジー', 248, 'can', 'drink', '#c8d820', '#5a6a08', '#1a2008', 'stripe'],
  // 便当 / 热食
  ['burger', '汉堡', 'ハンバーガー', 328, 'bento', 'cold', '#c8783a', '#7a3a10', '#ffe0b0', 'circle'],
  ['pasta', '意面', 'パスタ', 498, 'bento', 'cold', '#d8a04a', '#8a5a18', '#fff0c8', 'wave'],
  ['curry', '咖喱饭', 'カレー', 498, 'bento', 'cold', '#c08030', '#7a4a10', '#ffe8b0', 'circle'],
  ['salad', '蔬菜沙拉', 'サラダ', 298, 'bento', 'cold', '#5aa060', '#2a5a30', '#d8f0c8', 'wave'],
  // 乳制品 / 甜品
  ['yogurt', '酸奶', 'ヨーグルト', 148, 'icecup', 'cold', '#f4f4ee', '#d8d8cc', '#3a7ac8', 'circle'],
  ['pudding', '布丁', 'プリン', 168, 'icecup', 'cold', '#e8c878', '#a88030', '#5a3a10', 'circle'],
  ['cheese', '奶酪', 'チーズ', 228, 'bag', 'cold', '#f2d878', '#c8a038', '#5a4010', 'stripe'],
  ['banana', '香蕉', 'バナナ', 198, 'bag', 'shelf', '#e8c840', '#a88418', '#4a3a10', 'wave'],
  ['apple', '苹果', 'りんご', 158, 'bag', 'shelf', '#c83a3a', '#7a1a1a', '#ffd0d0', 'circle'],
  // 零食
  ['chips_consomme', '清汤薯片', 'ポテチ コンソメ', 158, 'bag', 'shelf', '#d8a83a', '#8a6410', '#2a4a2a', 'wave'],
  ['cookie', '饼干', 'クッキー', 188, 'bag', 'shelf', '#c89a6a', '#7a5428', '#ffe8c8', 'circle'],
  ['gum', '口香糖', 'ガム', 108, 'bar', 'shelf', '#4ab0a0', '#1a6a5a', '#e0fff8', 'stripe'],
  ['mint', '薄荷糖', 'ミント', 128, 'bar', 'shelf', '#3ac878', '#147a3a', '#e0ffe8', 'circle'],
  ['nuts', '坚果', 'ナッツ', 258, 'bag', 'shelf', '#a87848', '#5a3a18', '#ffe0b0', 'wave'],
  ['senbei', '米饼', 'せんべい', 148, 'bag', 'shelf', '#d8c8a0', '#8a7a50', '#5a3a1a', 'stripe'],
  // 日用品
  ['tissue', '纸巾', 'ティッシュ', 248, 'bag', 'shelf', '#e8f0f4', '#b8c8d0', '#2a5a8a', 'stripe'],
  ['mask', '口罩', 'マスク', 348, 'bag', 'shelf', '#f0f4f8', '#c8d8e0', '#3a7aaa', 'circle'],
  ['battery', '电池', '電池', 198, 'bar', 'shelf', '#2a2e34', '#101418', '#e8c040', 'stripe'],
  ['lighter', '打火机', 'ライター', 138, 'bar', 'shelf', '#c83a2a', '#6a1a10', '#ffe0c8', 'circle'],
  ['toothbrush', '牙刷', '歯ブラシ', 168, 'bar', 'shelf', '#3a9ad8', '#1a4a7a', '#e0f4ff', 'stripe'],
];

for (const [id, name, jp, price, kind, shelf, bg1, bg2, accent, art] of EXTRA_GOODS) {
  GOODS.push({
    id, name, jp, price, kind, shelf, tint: 0xffffff,
    tex: () => wrapTexture({
      bg1, bg2, accent, ink: '#ffffff', title: name, jp, price, art: artSimple(art),
    }),
  });
}

/* ------------------------------------------------------------ 几何形状 */

const GEO = {
  onigiri: new THREE.CylinderGeometry(0.062, 0.062, 0.028, 3),
  bento: new THREE.BoxGeometry(0.24, 0.055, 0.17),
  sandwich: new THREE.CylinderGeometry(0.07, 0.07, 0.04, 3),
  can: new THREE.CylinderGeometry(0.033, 0.033, 0.115, 14),
  bottle: new THREE.CylinderGeometry(0.034, 0.036, 0.19, 14),
  cup: new THREE.CylinderGeometry(0.052, 0.038, 0.115, 14),
  bag: new THREE.BoxGeometry(0.17, 0.23, 0.06),
  bar: new THREE.BoxGeometry(0.13, 0.08, 0.22),
  bread: new THREE.SphereGeometry(0.075, 14, 10),
  icecup: new THREE.CylinderGeometry(0.05, 0.036, 0.09, 14),
  skewer: new THREE.CapsuleGeometry(0.019, 0.15, 3, 8),
};

/** 每种形状的「立起来」姿态与包围盒高度 */
const SHAPE_FIT = {
  onigiri: { rot: [0, 0, Math.PI / 2], h: 0.124, lift: 0.062 },
  bento: { rot: [0, 0, 0], h: 0.055, lift: 0.028 },
  sandwich: { rot: [Math.PI / 2, 0, Math.PI / 2], h: 0.07, lift: 0.035 },
  can: { rot: [0, 0, 0], h: 0.115, lift: 0.0575 },
  bottle: { rot: [0, 0, 0], h: 0.19, lift: 0.095 },
  cup: { rot: [0, 0, 0], h: 0.115, lift: 0.0575 },
  bag: { rot: [0, 0, 0], h: 0.23, lift: 0.115 },
  bar: { rot: [0, 0, 0], h: 0.08, lift: 0.04 },
  bread: { rot: [0, 0, 0], h: 0.15, lift: 0.075 },
  icecup: { rot: [0, 0, 0], h: 0.09, lift: 0.045 },
  skewer: { rot: [0, 0, 0], h: 0.19, lift: 0.095 },
};

const texCache = new Map();
function getTex(goods) {
  if (!texCache.has(goods.id)) texCache.set(goods.id, goods.tex());
  return texCache.get(goods.id);
}

const matCache = new Map();
function getMat(goods) {
  if (!matCache.has(goods.id)) {
    matCache.set(
      goods.id,
      new THREE.MeshStandardMaterial({
        map: getTex(goods),
        roughness: 0.55,
        metalness: 0.05,
        color: 0xffffff,
      })
    );
  }
  return matCache.get(goods.id);
}

/** 建一个商品网格（原点在底部中心，方便直接放在货架上） */
export function createGoodsMesh(goods, scale = 1) {
  const geo = GEO[goods.kind];
  const fit = SHAPE_FIT[goods.kind];
  const mesh = new THREE.Mesh(geo, getMat(goods));
  mesh.rotation.set(fit.rot[0], fit.rot[1], fit.rot[2]);
  // 用一个外层 group 统一原点到底部
  const g = new THREE.Group();
  mesh.position.y = fit.lift;
  g.add(mesh);
  g.scale.setScalar(scale);
  g.userData.goods = goods;
  g.userData.height = fit.h * scale;
  return g;
}

export { wrapTexture, canvas2d, toTex };
