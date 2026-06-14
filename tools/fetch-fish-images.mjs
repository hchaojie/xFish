// 抓取每种鱼的真实照片（开放许可）并回填到应用。
// 来源：Wikimedia / Wikipedia（按学名取词条首图，再查该图的许可与作者）。
// 仅保留 公有领域 / CC0 / CC-BY / CC-BY-SA（默认排除 NC、ND）；可用 ALLOW_NC=true 放宽到 CC-BY-NC。
// 输出：assets/fish/<id>.<ext>、assets/fish/credits.json、js/data/images.js
// 说明：本脚本需联网，设计为在 GitHub Actions（CI）中运行；本地容器因网络白名单无法访问。
import { fish } from '../js/data/fish.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'assets/fish');
const ALLOW_NC = String(process.env.ALLOW_NC || 'false').toLowerCase() === 'true';
const UA = 'xFish-image-bot/1.0 (https://github.com/hchaojie/xFish; contact: hchaojie@gmail.com)';
const API = 'https://en.wikipedia.org/w/api.php';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

// 带退避重试的 fetch：对 429/503 按 Retry-After 或指数退避重试
async function fetchRetry(url, opts = {}, tries = 5) {
  let last;
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, opts);
    if (res.ok) return res;
    last = res.status;
    if ((res.status === 429 || res.status === 503) && i < tries - 1) {
      const ra = parseInt(res.headers.get('retry-after') || '', 10);
      const wait = Number.isFinite(ra) ? ra * 1000 : 800 * 2 ** i;
      await sleep(Math.min(wait, 8000));
      continue;
    }
    break;
  }
  throw new Error(`HTTP ${last}`);
}

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  const res = await fetchRetry(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
  return res.json();
}

// 排除非照片的首图（分布图/地图/示意图/矢量图标）
const NON_PHOTO = /distribution|locator|range[_-]?map|\bmap\b|diagram|chart|\.svg$/i;

// 词条首图（原图 URL + 文件名）
async function leadImage(title) {
  const j = await api({ action: 'query', prop: 'pageimages', piprop: 'original|name', titles: title, redirects: '1' });
  const page = j?.query?.pages?.[0];
  if (!page || page.missing) return null;
  const file = page.pageimage;
  const src = page.original?.source;
  if (!file || !src) return null;
  if (NON_PHOTO.test(file)) return null; // 跳过分布图等非照片
  return { file, src };
}

// 查询某文件的许可与作者
async function fileMeta(file) {
  const j = await api({ action: 'query', prop: 'imageinfo', iiprop: 'extmetadata|url', iiurlwidth: '900', titles: `File:${file}` });
  const ii = j?.query?.pages?.[0]?.imageinfo?.[0];
  if (!ii) return null;
  const ex = ii.extmetadata || {};
  return {
    thumb: ii.thumburl || ii.url,
    descUrl: ii.descriptionurl,
    machine: (ex.License?.value || '').toLowerCase(),
    shortName: stripHtml(ex.LicenseShortName?.value) || (ex.License?.value || ''),
    licenseUrl: ex.LicenseUrl?.value || '',
    author: stripHtml(ex.Artist?.value) || stripHtml(ex.Credit?.value) || 'Unknown',
  };
}

function licenseOk(machine, shortName) {
  const s = `${machine} ${shortName}`.toLowerCase();
  if (/\bnd\b|no-?deriv/.test(s)) return false;            // 排除禁止演绎
  if (!ALLOW_NC && /\bnc\b|noncommercial|non-commercial/.test(s)) return false; // 默认排除非商用
  return /cc0|public ?domain|\bpd\b|cc[\s-]?by/.test(s);   // 接受 CC0/PD/CC-BY(-SA)
}

function extOf(url) {
  const m = url.split('?')[0].match(/\.(jpe?g|png|webp|gif)$/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
}

async function download(url, dest) {
  const res = await fetchRetry(url, { headers: { 'User-Agent': UA } });
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return buf.length;
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const images = {};
  const report = [];

  for (const f of fish) {
    const candidates = [f.sciName, f.enName].filter(Boolean);
    let done = false;
    for (const title of candidates) {
      try {
        const lead = await leadImage(title);
        if (!lead) continue;
        if (/\.svg$/i.test(lead.file)) continue; // 跳过矢量图标
        const meta = await fileMeta(lead.file);
        if (!meta || !meta.thumb) continue;
        if (!licenseOk(meta.machine, meta.shortName)) {
          report.push(`SKIP  ${f.id}  (license: ${meta.shortName || meta.machine || '未知'})`);
          continue;
        }
        const ext = extOf(meta.thumb);
        const rel = `assets/fish/${f.id}.${ext}`;
        const bytes = await download(meta.thumb, resolve(ROOT, rel));
        images[f.id] = {
          url: rel,
          license: meta.shortName,
          licenseUrl: meta.licenseUrl,
          author: meta.author,
          source: 'Wikimedia Commons',
          sourceUrl: meta.descUrl,
        };
        report.push(`OK    ${f.id}  ${(bytes / 1024).toFixed(0)}KB  ${meta.shortName}  «${title}»`);
        done = true;
        break;
      } catch (e) {
        report.push(`ERR   ${f.id}  «${title}»  ${e.message}`);
      }
      await sleep(700);
    }
    if (!done && !images[f.id]) report.push(`MISS  ${f.id}  无合规图片，保留插画`);
    await sleep(1100);
  }

  // 写出生成文件
  const banner = '// 自动生成：tools/fetch-fish-images.mjs。请勿手改。\n';
  await writeFile(resolve(ROOT, 'js/data/images.js'), `${banner}export const images = ${JSON.stringify(images, null, 2)};\n`);
  await writeFile(resolve(OUT_DIR, 'credits.json'), JSON.stringify(images, null, 2) + '\n');

  console.log('\n' + report.join('\n'));
  const ok = Object.keys(images).length;
  console.log(`\n完成：${ok}/${fish.length} 种鱼取得开放许可照片（ALLOW_NC=${ALLOW_NC}）。`);
}

run().catch((e) => { console.error(e); process.exit(1); });
