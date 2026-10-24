// 配色对比：自动定位两张截图的横幅区域，按相对位置采样比较；
// 胶囊三态用 CDP 拿元素位置精确采样（含鼠标悬停态）。
// 用法：node scripts/compare-colors.mjs [baseUrl] [参考图路径]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sharp from 'sharp';

const BASE = (process.argv[2] || 'http://127.0.0.1:3100').replace(/\/+$/, '');
const REFERENCE = process.argv[3] || '';
const PORT = 9335;

async function loadRaw(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

function pixelAt(image, x, y) {
  const px = Math.max(0, Math.min(image.width - 1, Math.round(x)));
  const py = Math.max(0, Math.min(image.height - 1, Math.round(y)));
  const offset = (py * image.width + px) * image.channels;
  return [image.data[offset], image.data[offset + 1], image.data[offset + 2]];
}

function hex([r, g, b]) {
  return '#' + [r, g, b].map(value => Math.round(value).toString(16).padStart(2, '0')).join('');
}

function modeColor(image, x, y, half = 4) {
  const counter = new Map();
  for (let px = x - half; px <= x + half; px += 1) {
    for (let py = y - half; py <= y + half; py += 1) {
      const color = hex(pixelAt(image, px, py));
      counter.set(color, (counter.get(color) || 0) + 1);
    }
  }
  return [...counter.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

// 在图片上部找出横幅（深色区域）的包围盒；忽略右侧滚动条区域
function findBannerBox(image) {
  const limit = Math.floor(image.height * 0.22);
  const xLimit = Math.floor(image.width * 0.97);
  let minX = image.width;
  let maxX = -1;
  let minY = image.height;
  let maxY = -1;
  for (let y = 0; y < limit; y += 1) {
    for (let x = 0; x < xLimit; x += 1) {
      const [r, g, b] = pixelAt(image, x, y);
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance < 140) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x0: minX, x1: maxX, y0: minY, y1: maxY };
}

// 按颜色定位胶囊：取所有匹配像素的中位数中心（比找最长横向段更稳）
function findPillCenter(image, targetHex, tolerance = 6) {
  const target = [1, 3, 5].map(index => parseInt(targetHex.slice(index, index + 2), 16));
  const yLimit = Math.floor(image.height * 0.65);
  const xs = [];
  const ys = [];
  for (let y = 0; y < yLimit; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const [r, g, b] = pixelAt(image, x, y);
      if (Math.abs(r - target[0]) <= tolerance && Math.abs(g - target[1]) <= tolerance && Math.abs(b - target[2]) <= tolerance) {
        xs.push(x);
        ys.push(y);
      }
    }
  }
  if (xs.length < 200) return null;
  xs.sort((a, b) => a - b);
  ys.sort((a, b) => a - b);
  return { x: xs[Math.floor(xs.length / 2)], y: ys[Math.floor(ys.length / 2)], count: xs.length };
}

function distance(a, b) {
  const pa = [1, 3, 5].map(index => parseInt(a.slice(index, index + 2), 16));
  const pb = [1, 3, 5].map(index => parseInt(b.slice(index, index + 2), 16));
  return Math.sqrt(pa.reduce((sum, value, index) => sum + (value - pb[index]) ** 2, 0));
}

const CANDIDATES = [
  process.env.BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
].filter(Boolean);
const browser = CANDIDATES.find(item => fs.existsSync(item));
if (!browser) {
  console.log('SKIP 未找到浏览器');
  process.exit(0);
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wuzi-colors-'));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wuzi-colorprof-'));
const child = spawn(browser, [
  '--headless=new', '--disable-gpu', '--no-first-run',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`, 'about:blank'
], { stdio: 'ignore' });

async function waitForDevtools(deadline = 20000) {
  const start = Date.now();
  while (Date.now() - start < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return;
    } catch { /* 还没起来 */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('DevTools 未就绪');
}

let failures = 0;
let ws;
try {
  await waitForDevtools();
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const target = list.find(item => item.type === 'page');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  let seq = 0;
  const pending = new Map();
  await new Promise(resolve => ws.addEventListener('open', resolve));
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });
  const send = (method, params = {}) => new Promise(resolve => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${BASE}/` });
  await new Promise(resolve => setTimeout(resolve, 3000));

  const rects = await send('Runtime.evaluate', {
    expression: `(() => {
      const pick = selector => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
      };
      return JSON.stringify({ chipSelected: pick('.chip.active'), chipHover: pick('.chips .chip:nth-child(2)') });
    })()`,
    returnByValue: true
  });
  const points = JSON.parse(rects.result.result.value);

  const normalShot = path.join(workDir, 'normal.png');
  const capture1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(normalShot, Buffer.from(capture1.result.data, 'base64'));

  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: points.chipHover.x, y: points.chipHover.y });
  await new Promise(resolve => setTimeout(resolve, 500));
  const hoverShot = path.join(workDir, 'hover.png');
  const capture2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(hoverShot, Buffer.from(capture2.result.data, 'base64'));

  const mine = await loadRaw(normalShot);
  const hover = await loadRaw(hoverShot);
  const mineBanner = findBannerBox(mine);

  const rows = [];

  // 横幅左右两端：取横幅高度的 12%（顶部留白处，避开校徽与标题）
  const sampleBanner = (image, box, fx) => modeColor(
    image,
    Math.round(box.x0 + (box.x1 - box.x0) * fx),
    Math.round(box.y0 + (box.y1 - box.y0) * 0.12)
  );
  rows.push(['横幅左端', null, sampleBanner(mine, mineBanner, 0.05)]);
  rows.push(['横幅中段', null, sampleBanner(mine, mineBanner, 0.5)]);
  rows.push(['横幅右端', null, sampleBanner(mine, mineBanner, 0.95)]);

  // 页面背景：图片左下方空白处
  rows.push(['页面背景', null, modeColor(mine, Math.round(mine.width * 0.03), Math.round(mine.height * 0.9), 6)]);

  // 胶囊三态：按色块自动定位，避免硬编码坐标打偏
  const mineSelected = findPillCenter(mine, '#00667f');
  const mineHover = findPillCenter(hover, '#e4f3f6');
  rows.push(['胶囊-选中', null, mineSelected ? modeColor(mine, mineSelected.x, mineSelected.y, 6) : '未找到']);
  rows.push(['胶囊-悬停', null, mineHover ? modeColor(hover, mineHover.x, mineHover.y, 6) : '未找到']);

  if (REFERENCE && fs.existsSync(REFERENCE)) {
    const reference = await loadRaw(REFERENCE);
    const refBanner = findBannerBox(reference);
    rows[0][1] = sampleBanner(reference, refBanner, 0.05);
    rows[1][1] = sampleBanner(reference, refBanner, 0.5);
    rows[2][1] = sampleBanner(reference, refBanner, 0.95);
    rows[3][1] = modeColor(reference, Math.round(reference.width * 0.03), Math.round(reference.height * 0.9), 6);
    const refSelected = findPillCenter(reference, '#00667f');
    const refHover = findPillCenter(reference, '#e4f3f6');
    rows[4][1] = refSelected ? modeColor(reference, refSelected.x, refSelected.y, 6) : '未找到';
    rows[5][1] = refHover ? modeColor(reference, refHover.x, refHover.y, 6) : '未找到';
  }

  console.log('\n项目            参考值      实现值      色差');
  console.log('------------------------------------------------');
  for (const [label, targetColor, actualColor] of rows) {
    if (!targetColor) {
      console.log(`${label.padEnd(14)}  —            ${actualColor}      —`);
      continue;
    }
    const gap = distance(targetColor, actualColor);
    const ok = gap <= 12;
    if (!ok) failures += 1;
    console.log(`${label.padEnd(14)}  ${targetColor}    ${actualColor}    ${gap.toFixed(1).padStart(5)}  ${ok ? 'OK' : '偏差大'}`);
  }
  console.log(`\n截图：${normalShot} / hover.png`);
  console.log(`结果：${failures === 0 ? '配色与参考一致（色差 ≤ 12）' : `${failures} 项偏差过大`}\n`);
} finally {
  if (ws) ws.close();
  child.kill();
  await new Promise(resolve => setTimeout(resolve, 600));
  for (const dir of [profile, workDir]) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch { /* 忽略 */ }
  }
}

process.exit(failures === 0 ? 0 : 1);
