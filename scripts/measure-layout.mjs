// 布局诊断：用 CDP 连无头浏览器，量出真实视口与溢出元素。
// 用法：node scripts/measure-layout.mjs [url] [width] [height]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const URL_TARGET = process.argv[2] || 'http://127.0.0.1:3100/';
const WIDTH = Number(process.argv[3] || 390);
const HEIGHT = Number(process.argv[4] || 844);
const PORT = 9333;

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

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wuzi-cdp-'));
const child = spawn(browser, [
  '--headless=new', '--disable-gpu', '--no-first-run',
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${PORT}`,
  `--window-size=${WIDTH},${HEIGHT}`,
  'about:blank'
], { stdio: 'ignore' });

async function waitForDevtools(deadline = 20000) {
  const start = Date.now();
  while (Date.now() - start < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return await response.json();
    } catch { /* 还没起来 */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('DevTools 未就绪');
}

const EXPRESSION = `(() => {
  const vw = window.innerWidth;
  const de = document.documentElement;
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.right > vw + 1 || rect.width > vw + 1) {
      const cls = typeof el.className === 'string' ? el.className.split(' ').slice(0, 3).join('.') : '';
      offenders.push({
        tag: el.tagName.toLowerCase() + (cls ? '.' + cls : ''),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        scrollW: el.scrollWidth
      });
    }
  }
  return JSON.stringify({
    innerWidth: vw,
    docScrollWidth: de.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
    overflowX: getComputedStyle(document.body).overflowX,
    offenders: offenders.slice(0, 15)
  }, null, 1);
})()`;

let failures = 0;
try {
  await waitForDevtools();
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const target = list.find(item => item.type === 'page');
  if (!target) throw new Error('找不到页面 target');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let seq = 0;
  const pending = new Map();
  const opened = new Promise(resolve => ws.addEventListener('open', resolve));
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

  await opened;
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: URL_TARGET });
  await new Promise(resolve => setTimeout(resolve, 3500));

  const result = await send('Runtime.evaluate', { expression: EXPRESSION, returnByValue: true });
  const value = result.result?.result?.value;
  if (!value) {
    console.log('测量失败：', JSON.stringify(result.result || result));
    failures += 1;
  } else {
    const data = JSON.parse(value);
    console.log(`视口宽度: ${data.innerWidth}`);
    console.log(`文档 scrollWidth: ${data.docScrollWidth}`);
    console.log(`body scrollWidth/clientWidth: ${data.bodyScrollWidth} / ${data.bodyClientWidth}`);
    console.log(`body overflow-x: ${data.overflowX}`);
    console.log(`溢出元素 ${data.offenders.length} 个：`);
    for (const item of data.offenders) {
      console.log(`  ${item.tag}  left=${item.left} right=${item.right} width=${item.width} scrollW=${item.scrollW}`);
    }
    if (data.docScrollWidth > data.innerWidth + 1) failures += 1;
  }
  ws.close();
} finally {
  child.kill();
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch { /* 忽略 */ }
}

process.exit(failures === 0 ? 0 : 1);
