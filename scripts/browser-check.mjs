// 真实浏览器检查：用本机已安装的 Edge/Chrome 无头模式加载页面，
// 抓取最终 DOM、控制台错误和截图。
// 之所以需要它：happy-dom 不执行 CSP，会漏掉 "new Function 被 script-src 'self' 拦截" 这类问题，
// 而那正是首次部署白屏的根因。
// 用法：node scripts/browser-check.mjs [baseUrl]
// 找不到浏览器时输出 SKIP 并以 0 退出（不阻断其它检查）。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const BASE = (process.argv[2] || 'http://127.0.0.1:3100').replace(/\/+$/, '');

const CANDIDATES = [
  process.env.BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].filter(Boolean);

const browser = CANDIDATES.find(candidate => fs.existsSync(candidate));
if (!browser) {
  console.log('SKIP  未找到 Edge/Chrome，跳过真实浏览器检查（可用 BROWSER_PATH 指定）');
  process.exit(0);
}

const screenshotDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wuzi-browser-'));
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wuzi-profile-'));

async function loadPage(route, { screenshot = '' } = {}) {
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${profileDir}`,
    '--virtual-time-budget=8000',
    '--window-size=1280,900',
    '--enable-logging=stderr',
    '--log-level=0',
    '--dump-dom'
  ];
  if (screenshot) args.push(`--screenshot=${screenshot}`);
  args.push(`${BASE}${route}`);

  let stdout = '';
  let stderr = '';
  try {
    const result = await run(browser, args, { maxBuffer: 32 * 1024 * 1024, windowsHide: true });
    stdout = result.stdout || '';
    stderr = result.stderr || '';
  } catch (error) {
    // 浏览器退出码非 0 时 stdout 里仍可能有 DOM
    stdout = error.stdout || '';
    stderr = error.stderr || '';
  }
  return { dom: stdout, console: stderr };
}

let failures = 0;
function check(label, condition, detail = '') {
  if (condition) console.log(`  PASS  ${label}${detail ? `  ${detail}` : ''}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? `  ${detail}` : ''}`);
  }
}

function consoleProblems(text) {
  const patterns = [
    /Uncaught[^\r\n]*/gi,
    /EvalError[^\r\n]*/gi,
    /Refused to[^\r\n]*/gi,
    /Failed to load[^\r\n]*/gi
  ];
  const found = new Set();
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) found.add(match[0].trim());
  }
  return [...found];
}

console.log(`\n浏览器：${browser}`);
console.log(`目标：  ${BASE}`);

console.log('\n=== 前台 / ===');
const front = await loadPage('/', { screenshot: path.join(screenshotDir, 'front.png') });
const frontProblems = consoleProblems(front.console);
check('无脚本错误', frontProblems.length === 0, frontProblems.slice(0, 3).join(' | '));
check('Vue 已挂载（不再是加载占位）', !front.dom.includes('加载中…'), `DOM ${front.dom.length} 字符`);
check('渲染出顶部与标签页', front.dom.includes('物资台账') && front.dom.includes('物资清单'));
check('渲染出物资列表', front.dom.includes('打印纸 A4 70g') && front.dom.includes('一次性手套'));
check('渲染出操作按钮', front.dom.includes('取出') && front.dom.includes('借出') && front.dom.includes('入库'));
check('渲染出未归还标签', front.dom.includes('未归还'));

console.log('\n=== 后台 /admin ===');
const admin = await loadPage('/admin', { screenshot: path.join(screenshotDir, 'admin.png') });
const adminProblems = consoleProblems(admin.console);
check('无脚本错误', adminProblems.length === 0, adminProblems.slice(0, 3).join(' | '));
check('登录页已渲染', admin.dom.includes('物资管理后台') && admin.dom.includes('用户名'));
check('不再是加载占位', !admin.dom.includes('检查登录状态…'));

console.log(`\n截图目录：${screenshotDir}`);
console.log(`结果：${failures === 0 ? '真实浏览器渲染正常' : `${failures} 项失败`}\n`);
process.exit(failures === 0 ? 0 : 1);
