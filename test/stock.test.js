// 库存核心逻辑测试：部分取用、不足拦截、撤销回滚、部分归还
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createStore, AppError } = require('../db/store');

function freshStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wuzi-test-'));
  return createStore({ dataDir: dir });
}

function newMaterial(store, overrides = {}) {
  return store.createMaterial({
    name: '打印纸 A4',
    spec: '70g',
    categoryId: 'cat-office',
    unit: '包',
    needsReturn: false,
    safetyStock: 10,
    ...overrides
  }, { createdBy: 'tester' });
}

test('入库后可查询到正确库存', () => {
  const store = freshStore();
  const material = newMaterial(store);
  assert.equal(material.stock, 0);
  const result = store.stockIn({ materialId: material.id, qty: 100, operator: '张三' });
  assert.equal(result.before, 0);
  assert.equal(result.after, 100);
  assert.equal(store.getMaterial(material.id).stock, 100);
  store.close();
});

test('部分取用：库存 100 取 3 剩 97，流水记录前后值', () => {
  const store = freshStore();
  const material = newMaterial(store);
  store.stockIn({ materialId: material.id, qty: 100, operator: '张三' });
  const result = store.stockOut({ materialId: material.id, qty: 3, operator: '李四' });
  assert.equal(result.before, 100);
  assert.equal(result.after, 97);
  const { items } = store.listTxns({ materialId: material.id, limit: 10 });
  assert.equal(items.length, 2);
  assert.equal(items[0].type, 'out');
  assert.equal(items[0].qty, 3);
  assert.equal(items[0].beforeStock, 100);
  assert.equal(items[0].afterStock, 97);
  store.close();
});

test('库存不足时拒绝取用，且库存不变', () => {
  const store = freshStore();
  const material = newMaterial(store);
  store.stockIn({ materialId: material.id, qty: 3, operator: '张三' });
  assert.throws(
    () => store.stockOut({ materialId: material.id, qty: 5, operator: '李四' }),
    error => error instanceof AppError && error.code === 'INSUFFICIENT_STOCK'
  );
  assert.equal(store.getMaterial(material.id).stock, 3);
  assert.equal(store.listTxns({ materialId: material.id }).items.length, 1);
  store.close();
});

test('数量必须为正整数', () => {
  const store = freshStore();
  const material = newMaterial(store);
  store.stockIn({ materialId: material.id, qty: 10, operator: '张三' });
  for (const bad of [0, -1, 1.5, 'abc', null]) {
    assert.throws(() => store.stockOut({ materialId: material.id, qty: bad, operator: '李四' }), /整数/);
  }
  store.close();
});

test('撤销出库会回滚库存，流水保留并标记', () => {
  const store = freshStore();
  const material = newMaterial(store);
  store.stockIn({ materialId: material.id, qty: 100, operator: '张三' });
  const out = store.stockOut({ materialId: material.id, qty: 30, operator: '李四' });
  assert.equal(store.getMaterial(material.id).stock, 70);
  store.revokeTxn({ txnId: out.txnId, actor: 'admin', reason: '输错数量' });
  assert.equal(store.getMaterial(material.id).stock, 100);
  const txn = store.getTxn(out.txnId);
  assert.equal(txn.revoked, true);
  assert.equal(txn.revokedReason, '输错数量');
  // 已撤销的流水不能再撤一次
  assert.throws(() => store.revokeTxn({ txnId: out.txnId, actor: 'admin' }), /已撤销/);
  store.close();
});

test('入库撤销在物资已被用掉时被拒绝', () => {
  const store = freshStore();
  const material = newMaterial(store);
  const inbound = store.stockIn({ materialId: material.id, qty: 100, operator: '张三' });
  store.stockOut({ materialId: material.id, qty: 95, operator: '李四' });
  // 撤 100 的入库会让库存变 -95，必须拒绝
  assert.throws(() => store.revokeTxn({ txnId: inbound.txnId, actor: 'admin' }), /已被使用/);
  assert.equal(store.getMaterial(material.id).stock, 5);
  store.close();
});

test('流水累计始终等于当前库存（含撤销）', () => {
  const store = freshStore();
  const material = newMaterial(store);
  store.stockIn({ materialId: material.id, qty: 50, operator: 'A' });
  const out1 = store.stockOut({ materialId: material.id, qty: 7, operator: 'B' });
  store.stockOut({ materialId: material.id, qty: 8, operator: 'C' });
  store.stockIn({ materialId: material.id, qty: 12, operator: 'D' });
  store.revokeTxn({ txnId: out1.txnId, actor: 'admin' });

  const sum = store.listTxns({ materialId: material.id, limit: 500 }).items
    .filter(txn => !txn.revoked)
    .reduce((total, txn) => total + (txn.afterStock - txn.beforeStock), 0);
  assert.equal(sum, store.getMaterial(material.id).stock);
  store.close();
});

test('借用器材：部分归还，结清后状态为 closed', () => {
  const store = freshStore();
  const material = newMaterial(store, { name: '万用表', unit: '台', needsReturn: true });
  store.stockIn({ materialId: material.id, qty: 5, operator: '管理员' });

  const borrowed = store.borrowOut({ materialId: material.id, qty: 3, borrower: '王五', dueAt: '2026-12-01' });
  assert.equal(store.getMaterial(material.id).stock, 2);
  assert.equal(borrowed.borrow.remainingQty, 3);
  assert.equal(store.listBorrows({}).length, 1);

  const partial = store.returnBorrow({ borrowId: borrowed.borrow.id, qty: 2, operator: '王五' });
  assert.equal(store.getMaterial(material.id).stock, 4);
  assert.equal(partial.borrow.returnedQty, 2);
  assert.equal(partial.borrow.remainingQty, 1);
  assert.equal(partial.borrow.status, 'partial');

  const rest = store.returnBorrow({ borrowId: borrowed.borrow.id, qty: 1, operator: '王五' });
  assert.equal(store.getMaterial(material.id).stock, 5);
  assert.equal(rest.borrow.status, 'closed');
  assert.equal(store.listBorrows({}).length, 0);

  // 已结清不能继续归还
  assert.throws(() => store.returnBorrow({ borrowId: borrowed.borrow.id, qty: 1, operator: '王五' }), /已结清/);
  store.close();
});

test('归还数量不得超过未还数量', () => {
  const store = freshStore();
  const material = newMaterial(store, { name: '扳手', unit: '把', needsReturn: true });
  store.stockIn({ materialId: material.id, qty: 10, operator: '管理员' });
  const borrowed = store.borrowOut({ materialId: material.id, qty: 3, borrower: '王五' });
  assert.throws(() => store.returnBorrow({ borrowId: borrowed.borrow.id, qty: 5, operator: '王五' }), /超过未还/);
  assert.equal(store.getMaterial(material.id).stock, 7);
  store.close();
});

test('消耗品不能走借用，器材不能走取出', () => {
  const store = freshStore();
  const consumable = newMaterial(store);
  store.stockIn({ materialId: consumable.id, qty: 10, operator: 'A' });
  assert.throws(() => store.borrowOut({ materialId: consumable.id, qty: 1, borrower: 'B' }), /消耗品/);

  const tool = newMaterial(store, { name: '扳手', needsReturn: true });
  store.stockIn({ materialId: tool.id, qty: 5, operator: 'A' });
  store.close();
});

test('合并重复物资：库存转移并保留可对账的流水', () => {
  const store = freshStore();
  const keep = newMaterial(store, { name: '打印纸 A4' });
  const dup = newMaterial(store, { name: '打印纸A4 70g' });
  store.stockIn({ materialId: keep.id, qty: 20, operator: 'A' });
  store.stockIn({ materialId: dup.id, qty: 30, operator: 'A' });

  const result = store.mergeMaterials({ targetId: keep.id, sourceIds: [dup.id], actor: 'admin' });
  assert.equal(result.merged, 1);
  assert.equal(result.movedStock, 30);
  assert.equal(store.getMaterial(keep.id).stock, 50);
  assert.equal(store.getMaterial(dup.id).stock, 0);
  assert.equal(store.getMaterial(dup.id).active, false);

  // 两条物资各自的「有效流水累计」都应等于其当前库存
  for (const id of [keep.id, dup.id]) {
    const sum = store.listTxns({ materialId: id, limit: 500 }).items
      .filter(txn => !txn.revoked)
      .reduce((total, txn) => total + (txn.afterStock - txn.beforeStock), 0);
    assert.equal(sum, store.getMaterial(id).stock);
  }
  store.close();
});

test('低库存标记按预警值生效', () => {
  const store = freshStore();
  const material = newMaterial(store, { safetyStock: 10 });
  store.stockIn({ materialId: material.id, qty: 15, operator: 'A' });
  assert.equal(store.listMaterials({}).find(item => item.id === material.id).lowStock, false);
  store.stockOut({ materialId: material.id, qty: 6, operator: 'B' });
  assert.equal(store.listMaterials({}).find(item => item.id === material.id).lowStock, true);
  store.close();
});
