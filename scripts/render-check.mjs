// 渲染冒烟：用 happy-dom 在 Node 里真实挂载打包产物，验证页面不是白屏。
// 用法：node scripts/render-check.mjs [baseUrl]
// 需要先启动服务（脚本会通过真实 HTTP 拉取数据）。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Window } from 'happy-dom';

const BASE = process.argv[2] || 'http://127.0.0.1:3100';
const root = path.join(import.meta.dirname, '..');
const distDir = path.join(root, 'frontend', 'dist');

const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
const placeholder = /<div id="app">([\s\S]*?)<\/div>/.exec(indexHtml);
if (!placeholder) {
  console.error('无法从 dist/index.html 解析 #app 容器');
  process.exit(1);
}
const assetFile = fs.readdirSync(path.join(distDir, 'assets')).find(name => name.endsWith('.js'));
if (!assetFile) {
  console.error('dist/assets 下没有 JS 产物，请先执行构建');
  process.exit(1);
}

const realFetch = globalThis.fetch;

// 每个路由都需要一个全新的模块实例（应用在模块顶层读取 location 并挂载）
async function renderRoute(route) {
  const window = new Window({ url: `${BASE}${route}` });
  window.document.body.innerHTML = `<div id="app">${placeholder[1]}</div>`;

  const globals = {
    window,
    document: window.document,
    navigator: window.navigator,
    location: window.location,
    history: window.history,
    localStorage: window.localStorage,
    sessionStorage: window.sessionStorage,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    Node: window.Node,
    SVGElement: window.SVGElement,
    DocumentFragment: window.DocumentFragment,
    Event: window.Event,
    CustomEvent: window.CustomEvent,
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: callback => setTimeout(() => callback(Date.now()), 0),
    // 页面里用的是相对路径，Node 的 fetch 需要绝对地址
    fetch: (input, init) => realFetch(new URL(String(input), BASE), init)
  };
  const previous = {};
  for (const [key, value] of Object.entries(globals)) {
    // Node 自身的 navigator/location 等是只读 getter，必须用 defineProperty 覆盖
    previous[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true, enumerable: true });
  }

  const tempFile = path.join(os.tmpdir(), `wuzi-bundle-${route.replace(/\W/g, '')}-${Date.now()}.mjs`);
  fs.copyFileSync(path.join(distDir, 'assets', assetFile), tempFile);

  const errors = [];
  const onError = error => errors.push(error);
  process.on('uncaughtException', onError);

  try {
    await import(`${pathToFileURL(tempFile).href}?r=${Date.now()}`);
    // 等 onMounted 里的异步请求与重渲染完成
    for (let i = 0; i < 40; i += 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
      if (!window.document.getElementById('app').innerHTML.includes('加载中')) break;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  } finally {
    process.off('uncaughtException', onError);
    fs.rmSync(tempFile, { force: true });
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }

  const html = window.document.getElementById('app').innerHTML;
  return { html, errors };
}

let failures = 0;
function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${label}${detail ? `  ${detail}` : ''}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? `  ${detail}` : ''}`);
  }
}

console.log('\n=== 前台 / ===');
const pub = await renderRoute('/');
check('页面已挂载（无脚本异常）', pub.errors.length === 0, pub.errors.map(item => item.message).join(' | '));
check('不再是加载占位', !pub.html.includes('加载中'), `渲染长度 ${pub.html.length}`);
check('顶部与标签页渲染', pub.html.includes('物资清单') && pub.html.includes('入库'));
check('物资列表渲染出服务端数据', pub.html.includes('打印纸 A4 70g'), pub.html.includes('一次性手套') ? '含多种物资' : '仅部分');
check('库存数量渲染', /已取完|在库|stock-num/.test(pub.html));
check('取出/借出按钮渲染', pub.html.includes('取出') && pub.html.includes('借出'));

console.log('\n=== 后台 /admin ===');
const admin = await renderRoute('/admin');
check('页面已挂载（无脚本异常）', admin.errors.length === 0, admin.errors.map(item => item.message).join(' | '));
check('登录页渲染', admin.html.includes('物资管理后台') && admin.html.includes('用户名'));
check('不再是加载占位', !admin.html.includes('检查登录状态'), `渲染长度 ${admin.html.length}`);

console.log(`\n结果：${failures === 0 ? '渲染正常' : `${failures} 项失败`}\n`);
process.exit(failures === 0 ? 0 : 1);
