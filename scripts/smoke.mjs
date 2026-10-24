// 端到端冒烟验证：通过真实 HTTP 走一遍完整业务流程
// 默认启动一个独立的临时实例（临时数据目录、3199 端口），跑完即销毁，不污染正式数据。
// 用法：
//   node scripts/smoke.mjs                  # 独立实例（推荐）
//   node scripts/smoke.mjs --base=http://127.0.0.1:3100   # 指定已运行的实例（会写入其数据）
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.join(import.meta.dirname, '..');
const SMOKE_PORT = 3199;
const SMOKE_PASSWORD = 'smoke-password-123';

let BASE;
let adminPassword;
let child = null;
let tempDir = '';

const baseArg = process.argv.slice(2).find(item => item.startsWith('--base='));
if (baseArg) {
  BASE = baseArg.slice('--base='.length).replace(/\/+$/, '');
  adminPassword = fs.readFileSync(path.join(root, '.admin-password.local.txt'), 'utf8').trim();
} else {
  BASE = `http://127.0.0.1:${SMOKE_PORT}`;
  adminPassword = SMOKE_PASSWORD;
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wuzi-smoke-'));
  child = spawn(process.execPath, [path.join(root, 'server.js')], {
    env: { ...process.env, PORT: String(SMOKE_PORT), DATA_DIR: tempDir, ADMIN_PASSWORD: SMOKE_PASSWORD, NODE_ENV: 'test' },
    stdio: 'ignore'
  });
  await waitForServer();
}

async function waitForServer(deadlineMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < deadlineMs) {
    try {
      const response = await fetch(`${BASE}/healthz`);
      if (response.ok) return;
    } catch { /* 还没起来 */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('临时实例启动超时');
}

let passed = 0;
let failed = 0;
function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}${detail ? `  ${detail}` : ''}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? `  ${detail}` : ''}`);
  }
}

async function req(pathname, { method = 'GET', body, headers = {} } = {}) {
  const options = { method, headers: { ...headers } };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${BASE}${pathname}`, options);
  const contentType = response.headers.get('content-type') || '';
  let payload = null;
  let raw = null;
  if (contentType.includes('json')) payload = await response.json();
  else raw = Buffer.from(await response.arrayBuffer());
  return { status: response.status, payload, raw, contentType };
}

const data = payload => (payload && payload.success ? payload.data : null);

async function cleanup() {
  if (child) {
    // 等子进程真正退出，否则 Windows 上临时目录仍被 SQLite 文件占用，删除会报 EPERM
    await new Promise(resolve => {
      const timer = setTimeout(resolve, 5000);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
      child.kill();
    });
  }
  if (tempDir) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch (error) {
      console.log(`  （临时目录清理失败，可手动删除：${tempDir}）`);
    }
  }
}

try {
  console.log(`\n目标实例：${BASE}${child ? '（临时实例，跑完销毁）' : '（已运行实例）'}`);

  console.log(`\n=== 页面 ===`);
  for (const page of ['/', '/admin', '/healthz']) {
    const response = await req(page);
    check(`GET ${page}`, response.status === 200, `${response.status}`);
  }

  console.log(`\n=== 免登录前台 ===`);
  const config = data((await req('/api/public/config')).payload);
  check('读取前台配置', Boolean(config), JSON.stringify({ gate: config?.gateEnabled, nameRequired: config?.requireOperatorName }));

  const created = data((await req('/api/public/stock-in', {
    method: 'POST',
    body: { qty: 100, operator: '张三', note: '首次采购',
      newMaterial: { name: '打印纸 A4 70g', spec: '500张/包', categoryId: 'cat-office', unit: '包', location: 'A柜2层', safetyStock: 20 } }
  })).payload);
  check('入库并新建物资', created?.createdNew === true && created?.afterStock === 100, `库存=${created?.afterStock}`);
  const paperId = created.material.id;

  const duplicate = await req('/api/public/stock-in', {
    method: 'POST',
    body: { qty: 10, operator: '张三', newMaterial: { name: '打印纸 A4 70g', categoryId: 'cat-office', unit: '包' } }
  });
  check('同名物资被拦截（防重复建档）',
    duplicate.status === 400 && duplicate.payload?.code === 'DUPLICATE_MATERIAL' && duplicate.payload?.existingId === paperId,
    duplicate.payload?.message);

  const again = data((await req('/api/public/stock-in', {
    method: 'POST', body: { materialId: paperId, qty: 50, operator: '张三' }
  })).payload);
  check('对已有物资再加库存', again?.afterStock === 150, `库存=${again?.afterStock}`);

  const out = data((await req('/api/public/stock-out', {
    method: 'POST', body: { materialId: paperId, qty: 3, operator: '李四', note: '打印用' }
  })).payload);
  check('部分取用 3 包', out?.afterStock === 147, `库存=${out?.afterStock}（100+50-3）`);
  const outTxnId = out.txnId;

  const over = await req('/api/public/stock-out', { method: 'POST', body: { materialId: paperId, qty: 9999, operator: '李四' } });
  check('超量取用被拦截', over.status === 400 && /库存不足/.test(over.payload?.message || ''), over.payload?.message);

  const noName = await req('/api/public/stock-out', { method: 'POST', body: { materialId: paperId, qty: 1 } });
  check('未填经手人被拦截', noName.status === 400 && /经手人/.test(noName.payload?.message || ''), noName.payload?.message);

  console.log(`\n=== 器材借还（部分归还） ===`);
  const toolCreated = data((await req('/api/public/stock-in', {
    method: 'POST',
    body: { qty: 5, operator: '管理员',
      newMaterial: { name: '万用表', spec: 'DT9205A', categoryId: 'cat-instrument', unit: '台', needsReturn: true, location: 'B柜1层' } }
  })).payload);
  const toolId = toolCreated.material.id;
  check('入库器材 5 台', toolCreated?.afterStock === 5, `在库=${toolCreated?.afterStock}`);

  const wrongOp = await req('/api/public/stock-out', { method: 'POST', body: { materialId: toolId, qty: 1, operator: '王五' } });
  check('器材不能走「取出」', wrongOp.status === 400 && /借出/.test(wrongOp.payload?.message || ''), wrongOp.payload?.message);

  const borrowed = data((await req('/api/public/borrow', {
    method: 'POST', body: { materialId: toolId, qty: 3, operator: '王五', dueAt: '2026-12-31', note: '课程实验' }
  })).payload);
  check('借出 3 台', borrowed?.material?.stock === 2, `在库=${borrowed?.material?.stock}`);
  const borrowId = borrowed.borrow.id;

  const borrowList = data((await req('/api/public/borrows')).payload);
  check('未还清单出现该记录', Array.isArray(borrowList) && borrowList.some(item => item.id === borrowId && item.remainingQty === 3), `共 ${borrowList?.length} 条`);

  const partial = data((await req('/api/public/return', {
    method: 'POST', body: { borrowId, qty: 2, operator: '王五' }
  })).payload);
  check('部分归还 2 台', partial?.borrow?.returnedQty === 2 && partial?.borrow?.remainingQty === 1 && partial?.material?.stock === 4,
    `已还=${partial?.borrow?.returnedQty} 未还=${partial?.borrow?.remainingQty} 在库=${partial?.material?.stock}`);

  const overReturn = await req('/api/public/return', { method: 'POST', body: { borrowId, qty: 5, operator: '王五' } });
  check('归还超过未还被拦截', overReturn.status === 400 && /超过未还/.test(overReturn.payload?.message || ''), overReturn.payload?.message);

  const rest = data((await req('/api/public/return', {
    method: 'POST', body: { borrowId, qty: 1, operator: '王五' }
  })).payload);
  check('还清后结清', rest?.borrow?.status === 'closed' && rest?.material?.stock === 5, `状态=${rest?.borrow?.status} 在库=${rest?.material?.stock}`);

  console.log(`\n=== 管理后台 ===`);
  const unauthorized = await req('/api/admin/overview');
  check('未登录访问后台被拒绝', unauthorized.status === 401, `${unauthorized.status}`);

  const badLogin = await req('/api/admin/login', { method: 'POST', body: { username: 'admin', password: 'wrong-password' } });
  check('错误密码登录失败', badLogin.status === 401, badLogin.payload?.message);

  const login = data((await req('/api/admin/login', { method: 'POST', body: { username: 'admin', password: adminPassword } })).payload);
  check('管理员登录成功', Boolean(login?.sessionId), login?.user?.role);
  const auth = { 'x-session-id': login.sessionId };

  const overview = data((await req('/api/admin/overview', { headers: auth })).payload);
  check('概览统计', Boolean(overview) && overview.materialCount >= 2, `物资种类=${overview?.materialCount} 在库总量=${overview?.totalStock}`);

  const materials = data((await req('/api/admin/materials', { headers: auth })).payload);
  check('后台物资列表', Array.isArray(materials) && materials.length >= 2, `共 ${materials?.length} 种`);

  const txns = data((await req('/api/admin/txns?limit=100', { headers: auth })).payload);
  check('流水记录', txns?.total >= 7, `共 ${txns?.total} 条`);

  const revoke = data((await req(`/api/admin/txns/${outTxnId}/revoke`, { method: 'POST', body: { reason: '冒烟测试撤销' }, headers: auth })).payload);
  check('撤销取用并回滚库存', revoke?.stock === 150, `库存=${revoke?.stock}（147+3）`);

  const revokedTxn = data((await req(`/api/admin/txns?materialId=${paperId}`, { headers: auth })).payload)
    ?.items.find(item => item.id === outTxnId);
  check('撤销后流水保留并标记', revokedTxn?.revoked === true, `原因=${revokedTxn?.revokedReason}`);

  const adjust = data((await req(`/api/admin/materials/${paperId}/adjust`, {
    method: 'POST', body: { stock: 148, reason: '盘点差异' }, headers: auth
  })).payload);
  check('管理员校准库存', adjust?.stock === 148, `库存=${adjust?.stock}`);

  const exportRes = await req('/api/admin/export/txns.xlsx', { headers: auth });
  check('导出 Excel', exportRes.status === 200 && exportRes.raw?.length > 3000 && exportRes.contentType.includes('spreadsheetml'),
    `${exportRes.raw?.length} 字节`);

  const qr = data((await req('/api/admin/qrcode/portal', { method: 'POST', body: {}, headers: auth })).payload);
  const qrFile = qr && (await req(qr.qrcode));
  check('生成门户二维码', Boolean(qr?.qrcode) && qrFile.status === 200, qr?.qrcode);

  const settingsNow = data((await req('/api/admin/settings', { headers: auth })).payload);
  check('读取设置', settingsNow?.dailyOpLimit === 20 && settingsNow?.gateEnabled === false,
    `每日上限=${settingsNow?.dailyOpLimit} 口令开关=${settingsNow?.gateEnabled}`);

  const gateOn = data((await req('/api/admin/settings', {
    method: 'PUT', body: { gateEnabled: true, gateCode: 'test1234' }, headers: auth
  })).payload);
  check('开启口令开关', gateOn?.gateEnabled === true && gateOn?.gateCode === '__SET__', '口令不回显');

  const gated = await req('/api/public/materials');
  check('开启口令后前台被拦截', gated.status === 403 && gated.payload?.code === 'GATE_REQUIRED', gated.payload?.message);

  const gatePass = await req('/api/public/gate', { method: 'POST', body: { code: 'test1234' } });
  check('正确口令放行', gatePass.status === 200, '已下发口令 cookie');

  const gateOff = data((await req('/api/admin/settings', {
    method: 'PUT', body: { gateEnabled: false }, headers: auth
  })).payload);
  check('关闭口令开关恢复免登录', gateOff?.gateEnabled === false, '恢复默认');

  const health = (await req('/healthz')).payload;
  check('健康检查', health?.status === 'ok', health?.status);
} finally {
  await cleanup();
}

console.log(`\n结果：通过 ${passed} 项，失败 ${failed} 项\n`);
process.exit(failed === 0 ? 0 : 1);
