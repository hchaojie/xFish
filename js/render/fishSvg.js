// 参数化 SVG 鱼插画生成器
// 核心思路：用一组参数（体型/配色/花纹/鳍/尾）拼装出辨识度高、彩色的矢量鱼。
// 同一函数同时服务于：详情页大图、列表卡片小图、场景中游动的小鱼群。
// 所有鱼朝向：默认头朝右（+X 方向）。viewBox 统一为 0 0 200 120。

let UID = 0;
const uid = (p) => `${p}${(++UID).toString(36)}`;

// ---- 体型轮廓：返回鱼身主路径 d（不含鳍尾），头部在右侧 ----
const BODIES = {
  // 纺锤形：常规流线鱼（鲤、鲢、金枪…）
  spindle: 'M40,60 C55,30 120,28 165,55 C170,58 170,62 165,65 C120,92 55,90 40,60 Z',
  // 鱼雷形：更瘦长高速（草鱼、翘嘴、鲈、鲅）
  torpedo: 'M30,60 C50,38 130,36 170,56 C174,58 174,62 170,64 C130,84 50,82 30,60 Z',
  // 卵圆形：圆胖（鲫鱼）
  oval: 'M45,60 C58,28 120,26 160,52 C166,57 166,63 160,68 C120,94 58,92 45,60 Z',
  // 高身侧扁：背部隆起（鳜、鲷、石斑、罗非）
  deep: 'M42,60 C52,22 130,22 168,55 C172,58 172,62 168,65 C130,98 52,98 42,60 Z',
  // 极扁菱形（鳊鱼）
  flat: 'M48,60 C56,18 128,18 162,55 C166,58 166,62 162,65 C128,102 56,102 48,60 Z',
  // 大头形（鳙、鲢胖头）
  bighead: 'M30,60 C48,24 130,30 168,55 C172,58 172,62 168,65 C130,90 48,96 30,60 Z',
  // 鲶鱼：扁头长身
  catfish: 'M28,62 C46,46 132,40 172,56 C176,58 176,64 172,66 C132,86 46,82 28,62 Z',
  // 黑鱼：长圆筒蛇头
  snakehead: 'M26,60 C42,48 140,44 176,56 C180,58 180,62 176,64 C140,80 42,76 26,60 Z',
  // 带状（带鱼）
  ribbon: 'M20,60 C60,52 150,50 184,58 C186,59 186,61 184,62 C150,72 60,70 20,60 Z',
  // 嘴突出的旗鱼/剑鱼身（吻另画）
  billfish: 'M55,60 C75,40 140,40 175,57 C179,59 179,61 175,63 C140,82 75,82 55,60 Z',
  // 鲨鱼：纺锤+尖吻
  shark: 'M30,62 C52,42 140,40 184,58 C187,59 187,62 184,64 C140,82 52,84 30,62 Z',
  // 鮟鱇：宽扁大头
  angler: 'M40,66 C44,40 120,38 165,58 C170,60 170,66 165,70 C120,92 50,92 40,66 Z',
  // 翻车鱼：近圆盘、尾部截断
  mola: 'M55,60 C55,22 110,18 150,38 C168,47 168,73 150,82 C110,102 55,98 55,60 Z',
};

// ---- 尾鳍 ----
function tailPath(type) {
  switch (type) {
    case 'fan':    return 'M42,60 C20,42 14,46 10,42 C18,55 18,65 10,78 C14,74 20,78 42,60 Z';
    case 'fork':   return 'M40,60 C22,50 8,40 6,38 C16,52 16,68 6,82 C8,80 22,70 40,60 Z';
    case 'lunate': return 'M52,60 C34,46 18,30 12,30 C26,46 26,74 12,90 C18,90 34,74 52,60 Z';
    case 'round':  return 'M40,60 C24,50 14,52 8,50 C16,57 16,63 8,70 C14,68 24,70 40,60 Z';
    case 'pointed':return 'M30,60 C24,56 12,58 4,60 C12,62 24,64 30,60 Z';
    case 'hetero': return 'M40,62 C26,50 16,30 10,28 C20,46 22,62 12,76 C18,72 30,70 40,62 Z'; // 鲨鱼歪尾
    case 'clavus': return 'M58,42 C66,44 70,52 70,60 C70,68 66,76 58,78 C62,68 62,52 58,42 Z'; // 翻车鱼舵鳍
    default:       return 'M42,60 C22,48 12,50 8,48 C16,56 16,64 8,72 C12,70 22,72 42,60 Z';
  }
}

// ---- 背鳍 / 特征鳍 ----
function dorsalPath(type) {
  switch (type) {
    case 'spiny':  return 'M70,32 L78,16 L86,30 L96,14 L104,30 L116,16 L122,34 Z';
    case 'long':   return 'M60,40 C90,28 140,30 160,42 C140,44 90,46 60,46 Z';
    case 'sail':   return 'M70,40 C90,2 150,4 165,40 C140,30 95,30 70,40 Z'; // 旗鱼帆
    case 'shark':  return 'M95,36 L112,8 L120,40 Z';
    case 'finlet': return 'M75,38 L86,26 L96,38 M110,42 l5,-5 M122,44 l5,-5 M134,46 l5,-5'; // 金枪小鳍
    case 'ribbon': return 'M30,52 C80,44 160,44 184,52'; // 带鱼长背鳍（描边）
    case 'mola':   return 'M105,18 C112,4 120,4 124,16 C118,14 110,14 105,18 Z';
    case 'crescent':return 'M95,40 C108,18 128,20 134,40 C120,34 105,34 95,40 Z';
    case 'round':
    default:       return 'M75,38 C95,24 130,26 145,40 C125,40 95,40 75,38 Z';
  }
}

function pectoralPath() {
  return 'M105,72 C112,90 124,94 132,92 C124,86 118,78 116,70 Z';
}

// ---- 花纹叠加（返回 SVG 片段字符串），裁剪在鱼身内 ----
function patternEls(pattern, clipId, colors) {
  const dark = colors[0];
  switch (pattern) {
    case 'scales': {
      let s = '';
      for (let y = 38; y <= 82; y += 11) {
        for (let x = 50; x <= 168; x += 13) {
          s += `<path d="M${x},${y} a6,6 0 0 1 12,0" fill="none" stroke="${dark}" stroke-opacity="0.28" stroke-width="1.4"/>`;
        }
      }
      return s;
    }
    case 'stripes': {
      let s = '';
      for (let x = 70; x <= 165; x += 16) {
        s += `<rect x="${x}" y="20" width="4" height="80" fill="${dark}" fill-opacity="0.30"/>`;
      }
      return s;
    }
    case 'bars': {
      let s = '';
      for (let x = 64; x <= 160; x += 20) {
        s += `<rect x="${x}" y="22" width="8" height="76" fill="${dark}" fill-opacity="0.22" rx="3"/>`;
      }
      return s;
    }
    case 'dots':
    case 'spots': {
      const pts = [[70,48],[92,68],[112,44],[130,66],[150,50],[84,80],[120,82],[148,76],[100,54]];
      return pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${pattern==='dots'?3:4.5}" fill="${dark}" fill-opacity="0.30"/>`).join('');
    }
    case 'blotch': {
      const pts = [[78,46,11,8],[112,70,14,9],[145,50,10,7],[95,78,9,6],[130,40,8,6],[160,66,8,5]];
      return pts.map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${dark}" fill-opacity="0.30"/>`).join('');
    }
    case 'mottle': {
      let s = '';
      const seeds = [[70,50],[96,64],[120,46],[140,70],[86,76],[150,54],[110,80],[130,58]];
      seeds.forEach(([x, y], i) => {
        s += `<ellipse cx="${x}" cy="${y}" rx="${5 + (i % 3) * 2}" ry="${4 + (i % 2) * 2}" fill="${dark}" fill-opacity="0.22"/>`;
      });
      return s;
    }
    case 'plain':
    default:
      return '';
  }
}

/**
 * 生成一条鱼的 SVG 字符串。
 * @param {object} p 来自 fish.svg 的参数
 * @param {object} opts { size, swim } size 决定宽度(px)；swim=true 添加轻微摆尾动画类
 * @returns {string} <svg>…</svg>
 */
export function fishSvg(p, opts = {}) {
  const { size = 200, swim = false, flip = false } = opts;
  const colors = p.palette || ['#5a7d9a', '#88a8c0', '#d6e3ee'];
  const [c0, c1, c2] = colors;
  const gradId = uid('g');
  const clipId = uid('c');
  const bodyD = BODIES[p.body] || BODIES.spindle;

  const tail = `<path class="fin-tail" d="${tailPath(p.tail)}" fill="${c1}" stroke="${c0}" stroke-width="1.5" stroke-opacity="0.5"/>`;
  const dorsal = p.fin === 'ribbon'
    ? `<path d="${dorsalPath('ribbon')}" fill="none" stroke="${c0}" stroke-width="6" stroke-opacity="0.55" stroke-linecap="round"/>`
    : `<path d="${dorsalPath(p.fin)}" fill="${c1}" stroke="${c0}" stroke-width="1.2" stroke-opacity="0.5" ${p.fin==='finlet'?'fill="none" stroke-width="2"':''}/>`;
  const pectoral = `<path d="${pectoralPath()}" fill="${c1}" fill-opacity="0.85" stroke="${c0}" stroke-width="1" stroke-opacity="0.4"/>`;

  // 旗鱼/剑鱼的长吻
  const bill = p.bill ? `<path d="M175,58 L205,57 L205,60 L175,62 Z" fill="${c0}"/>` : '';
  // 鮟鱇发光诱饵
  const lure = p.lure
    ? `<path d="M150,40 C140,18 120,14 112,26" fill="none" stroke="${c0}" stroke-width="2.5"/>
       <circle cx="111" cy="27" r="6" fill="#fff3a0"><animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite"/></circle>`
    : '';
  // 鲶鱼/鲤鱼触须
  const whiskers = p.whiskers
    ? `<path d="M170,58 C185,54 192,52 198,50 M170,64 C185,68 192,70 198,72" fill="none" stroke="${c0}" stroke-width="1.6" stroke-linecap="round" stroke-opacity="0.7"/>`
    : '';
  // 翘嘴上翘的下颌
  const upmouth = p.upmouth ? `<path d="M168,58 L182,50 L180,55 Z" fill="${c0}"/>` : '';

  const eyeX = p.body === 'mola' ? 132 : 150;
  const eyeY = p.body === 'angler' ? 56 : 54;
  const mouth = p.body === 'angler'
    ? `<path d="M158,66 q8,8 -2,12" fill="none" stroke="${c0}" stroke-width="2"/>`
    : `<path d="M170,60 q6,1 4,5" fill="none" stroke="${c0}" stroke-width="1.4" stroke-opacity="0.6"/>`;

  const inner = `
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c0}"/>
        <stop offset="0.55" stop-color="${c1}"/>
        <stop offset="1" stop-color="${c2}"/>
      </linearGradient>
      <clipPath id="${clipId}"><path d="${bodyD}"/></clipPath>
    </defs>
    ${bill}
    <g class="fish-tail-grp">${tail}</g>
    ${dorsal}
    <path d="${bodyD}" fill="url(#${gradId})" stroke="${c0}" stroke-width="1.5" stroke-opacity="0.45"/>
    <g clip-path="url(#${clipId})">${patternEls(p.pattern, clipId, colors)}
      <path d="M40,60 C90,52 160,52 184,58" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="3"/>
    </g>
    ${pectoral}
    ${upmouth}${mouth}
    <circle cx="${eyeX}" cy="${eyeY}" r="6.5" fill="#fff"/>
    <circle cx="${eyeX + 1}" cy="${eyeY}" r="3.6" fill="#16242e"/>
    <circle cx="${eyeX + 2.5}" cy="${eyeY - 1.5}" r="1.2" fill="#fff"/>
    ${whiskers}${lure}
  `;

  // 水平镜像：在 210 宽的 viewBox 内翻转，保持鱼仍在画面内（朝左）
  const transform = flip ? ' transform="translate(210,0) scale(-1,1)"' : '';
  const h = Math.round(size * 0.6);
  return `<svg class="fish-svg${swim ? ' swim' : ''}" viewBox="0 0 210 120" width="${size}" height="${h}" xmlns="http://www.w3.org/2000/svg" role="img"><g${transform}>${inner}</g></svg>`;
}
