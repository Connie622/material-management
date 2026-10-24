// 截图工具：用 CDP 正确模拟视口后截整页，避免 --window-size 与视口不一致造成的裁剪伪影。
// 用法：node scripts/screenshot.mjs <url> <width> <height> <输出文件> [截图前执行的 JS]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const [url, widthArg, heightArg, outFile, preScript] = process.argv.slice(2);
if (!url || !outFile) {
  console.error('用法：node scripts/screenshot.mjs <url> <width> <height> <输出文件>');
  process.exit(2);
}
const WIDTH = Number(widthArg || 1280);
const HEIGHT = Number(heightArg || 900);
const PORT = 9334;

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

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wuzi-shot-'));
const child = spawn(browser, [
  '--headless=new', '--disable-gpu', '--no-first-run',
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${PORT}`,
  'about:blank'
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

try {
  await waitForDevtools();
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const target = list.find(item => item.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
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
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 2,
    mobile: WIDTH < 600
  });
  await send('Page.navigate', { url });
  await new Promise(resolve => setTimeout(resolve, 3500));

  if (preScript) {
    await send('Runtime.evaluate', { expression: preScript, awaitPromise: true });
    await new Promise(resolve => setTimeout(resolve, 1200));
  }

  const capture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  const data = capture.result?.data;
  if (!data) throw new Error('截图失败：' + JSON.stringify(capture.result || capture));
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(outFile, Buffer.from(data, 'base64'));
  console.log(`已保存 ${outFile}（${(fs.statSync(outFile).size / 1024).toFixed(1)} KB，视口 ${WIDTH}x${HEIGHT}）`);
  ws.close();
} finally {
  child.kill();
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch { /* 忽略 */ }
}
