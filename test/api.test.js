// HTTP 层测试：并发扣减不超取 + 免登录接口可用
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const PORT = 3999;
const BASE = `http://127.0.0.1:${PORT}`;

function waitForServer(deadlineMs = 20000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (Date.now() - started > deadlineMs) return reject(new Error('服务启动超时'));
      try {
        const response = await fetch(`${BASE}/healthz`);
        if (response.ok) return resolve();
      } catch { /* 还没起来 */ }
      setTimeout(tick, 200);
    };
    tick();
  });
}

async function call(pathname, { method = 'GET', body, headers = {} } = {}) {
  const options = { method, headers: { ...headers } };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${BASE}${pathname}`, options);
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { status: response.status, payload };
}

let child = null;
let dataDir = '';

test.before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wuzi-api-'));
  child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, ADMIN_PASSWORD: 'test-password-123', NODE_ENV: 'test' },
    stdio: 'ignore'
  });
  await waitForServer();
});

test.after(() => {
  if (child) child.kill();
});

test('免登录可以查看物资清单', async () => {
  const { status, payload } = await call('/api/public/materials');
  assert.equal(status, 200);
  assert.equal(payload.success, true);
  assert.ok(Array.isArray(payload.data));
});

test('免登录可以入库新建物资，并按需取出', async () => {
  const inbound = await call('/api/public/stock-in', {
    method: 'POST',
    body: {
      qty: 100,
      operator: '张三',
      newMaterial: { name: '一次性手套', spec: 'M 码', categoryId: 'cat-lab', unit: '只', needsReturn: false }
    }
  });
  assert.equal(inbound.status, 200);
  assert.equal(inbound.payload.data.createdNew, true);
  assert.equal(inbound.payload.data.afterStock, 100);
  const materialId = inbound.payload.data.material.id;

  const out = await call('/api/public/stock-out', {
    method: 'POST',
    body: { materialId, qty: 3, operator: '李四' }
  });
  assert.equal(out.status, 200);
  assert.equal(out.payload.data.afterStock, 97);
});

test('缺少经手人姓名时被拒绝', async () => {
  const { payload } = await call('/api/public/stock-in', {
    method: 'POST',
    body: { qty: 5, newMaterial: { name: '无主物资', categoryId: 'cat-other', unit: '个' } }
  });
  assert.equal(payload.success, false);
  assert.match(payload.message, /经手人/);
});

test('同名物资不会被重复建档', async () => {
  const body = {
    qty: 1,
    operator: '张三',
    newMaterial: { name: '重复测试物资', categoryId: 'cat-other', unit: '个' }
  };
  const first = await call('/api/public/stock-in', { method: 'POST', body });
  assert.equal(first.status, 200);
  const second = await call('/api/public/stock-in', { method: 'POST', body });
  assert.equal(second.status, 400);
  assert.equal(second.payload.code, 'DUPLICATE_MATERIAL');
  assert.equal(second.payload.existingId, first.payload.data.material.id);
});

test('并发 20 次取用，库存 5 时只允许成功 5 次，不会超卖', async () => {
  const inbound = await call('/api/public/stock-in', {
    method: 'POST',
    body: { qty: 5, operator: '管理员', newMaterial: { name: '并发测试物资', categoryId: 'cat-other', unit: '个' } }
  });
  const materialId = inbound.payload.data.material.id;

  const attempts = Array.from({ length: 20 }, (_, index) => call('/api/public/stock-out', {
    method: 'POST',
    body: { materialId, qty: 1, operator: `并发${index}` }
  }));
  const results = await Promise.all(attempts);
  const succeeded = results.filter(item => item.status === 200).length;
  const rejected = results.filter(item => item.status === 400).length;

  assert.equal(succeeded, 5, '应当只有 5 次成功');
  assert.equal(rejected, 15, '应当有 15 次因库存不足被拒');

  const list = await call('/api/public/materials');
  const material = list.payload.data.find(item => item.id === materialId);
  assert.equal(material.stock, 0);
  assert.ok(material.stock >= 0, '库存不允许为负');
});

test('管理员能撤销流水并回滚库存', async () => {
  const login = await call('/api/admin/login', { method: 'POST', body: { username: 'admin', password: 'test-password-123' } });
  assert.equal(login.status, 200);
  const sid = login.payload.data.sessionId;
  const auth = { 'x-session-id': sid };

  const inbound = await call('/api/public/stock-in', {
    method: 'POST',
    body: { qty: 10, operator: '张三', newMaterial: { name: '撤销测试物资', categoryId: 'cat-other', unit: '个' } }
  });
  const materialId = inbound.payload.data.material.id;
  const outbound = await call('/api/public/stock-out', { method: 'POST', body: { materialId, qty: 4, operator: '李四' } });
  const txnId = outbound.payload.data.txnId;

  const revoke = await call(`/api/admin/txns/${txnId}/revoke`, { method: 'POST', body: { reason: '测试撤销' }, headers: auth });
  assert.equal(revoke.status, 200);
  assert.equal(revoke.payload.data.stock, 10);

  const txns = await call(`/api/admin/txns?materialId=${materialId}`, { headers: auth });
  const revoked = txns.payload.data.items.find(item => item.id === txnId);
  assert.equal(revoked.revoked, true);
});

test('管理员接口未登录时返回 401', async () => {
  const { status } = await call('/api/admin/overview');
  assert.equal(status, 401);
});
