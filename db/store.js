// SQLite 数据访问层：面向库存的实时 SQL 操作。
// 与旧项目「读全量 JSON → 改 → 写全量」不同，这里用 BEGIN IMMEDIATE + 原子更新，
// 保证并发扣减不会出现超取（负库存）。
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

class AppError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    Object.assign(this, extra);
  }
}

const DEFAULT_SETTINGS = {
  siteTitle: '物资台账',
  siteFooterQuote: '今宵酒醒何处？杨柳岸，晓风残月。',
  siteIcp: '豫ICP备2026040615号-1',
  requireOperatorName: true,
  allowAnonymousStockIn: true,
  allowAnonymousCreate: true,
  dailyOpLimit: 20,
  gateEnabled: false,
  gateCode: '',
  lowStockAlert: true
};

// 分类只表达「这是什么 / 用在哪」，不再重复表达「是否归还」（那是 needs_return 的职责）。
// 这样就不会出现「器材被标成消耗品」这类自相矛盾的数据。
const DEFAULT_CATEGORIES = [
  { id: 'cat-office', name: '办公用品', sortOrder: 1 },
  { id: 'cat-lab', name: '活动耗材', sortOrder: 2 },
  { id: 'cat-instrument', name: '仪器器材', sortOrder: 3 },
  { id: 'cat-media', name: '摄影器材', sortOrder: 4 },
  { id: 'cat-other', name: '其他', sortOrder: 9 }
];

// 早期版本的「耗材 / 器材」分类与 needs_return 语义重复，迁移到按用途划分的分类。
const CATEGORY_ID_MIGRATIONS = {
  'cat-supplies': 'cat-lab',
  'cat-tools': 'cat-instrument'
};

const TXN_TYPES = new Set(['in', 'out', 'borrow', 'return', 'adjust']);

function nowIso() {
  return new Date().toISOString();
}

function toInt(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function materialFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    spec: row.spec,
    categoryId: row.category_id,
    unit: row.unit,
    needsReturn: Boolean(row.needs_return),
    stock: Number(row.stock),
    safetyStock: Number(row.safety_stock),
    location: row.location,
    image: row.image,
    imageThumb: row.image_thumb,
    notes: row.notes,
    active: Boolean(row.active),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function txnFromRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    materialId: row.material_id,
    materialName: row.material_name,
    materialSpec: row.material_spec,
    materialUnit: row.material_unit,
    type: row.type,
    qty: Number(row.qty),
    beforeStock: Number(row.before_stock),
    afterStock: Number(row.after_stock),
    operator: row.operator,
    operatorPhone: row.operator_phone,
    note: row.note,
    refType: row.ref_type,
    refId: row.ref_id,
    revoked: Boolean(row.revoked),
    revokedBy: row.revoked_by,
    revokedReason: row.revoked_reason,
    revokedAt: row.revoked_at,
    createdAt: row.created_at
  };
}

function borrowFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    materialId: row.material_id,
    materialName: row.material_name,
    materialUnit: row.material_unit,
    qty: Number(row.qty),
    returnedQty: Number(row.returned_qty),
    remainingQty: Number(row.qty) - Number(row.returned_qty),
    borrower: row.borrower,
    borrowerPhone: row.borrower_phone,
    dueAt: row.due_at,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    closedAt: row.closed_at
  };
}

function createStore({ dataDir, databasePath = path.join(dataDir, 'material-management.sqlite') }) {
  fs.mkdirSync(dataDir, { recursive: true });
  const firstRun = !fs.existsSync(databasePath);

  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schemaSql);

  let depth = 0;
  function transaction(fn) {
    if (depth > 0) return fn();
    // IMMEDIATE 立即取得写锁，后续「读余额→扣减」在锁内完成，不会被其它写入插入。
    db.exec('BEGIN IMMEDIATE');
    depth += 1;
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    } finally {
      depth -= 1;
    }
  }

  function audit(actor, action, targetType, targetId, summary) {
    db.prepare(`INSERT INTO audit_logs (actor, action, target_type, target_id, summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`).run(actor || '', action, targetType || '', String(targetId || ''), summary || '', nowIso());
  }

  // ---------- 初始化种子数据 ----------
  function seed() {
    transaction(() => {
      const categoryCount = Number(db.prepare('SELECT COUNT(*) AS n FROM categories').get().n);
      if (categoryCount === 0) {
        const insert = db.prepare('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)');
        for (const c of DEFAULT_CATEGORIES) insert.run(c.id, c.name, c.sortOrder);
      }
      const settingCount = Number(db.prepare('SELECT COUNT(*) AS n FROM settings').get().n);
      if (settingCount === 0) {
        const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
        for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) insert.run(key, JSON.stringify(value));
      }
      // 站点起始时间：用于页脚「本站已运行 X 天 X 小时」，只在缺失时写入
      const started = db.prepare("SELECT value FROM settings WHERE key = 'siteStartedAt'").get();
      if (!started) {
        db.prepare("INSERT INTO settings (key, value) VALUES ('siteStartedAt', ?)").run(JSON.stringify(nowIso()));
      }
    });
  }

  // 分类体系迁移：把旧的「耗材/器材」并到新的用途分类，已有物资一并改挂。
  // 用 settings.categoriesVersion 保证只跑一次，避免覆盖管理员后续的自定义分类。
  function migrateCategories() {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'categoriesVersion'").get();
    let version = 0;
    if (row) {
      try {
        version = Number(JSON.parse(row.value));
      } catch {
        version = 0;
      }
    }
    if (version >= 4) return false;
    transaction(() => {
      const insert = db.prepare('INSERT OR IGNORE INTO categories (id, name, sort_order) VALUES (?, ?, ?)');
      // 只归一化内置分类的排序，不动管理员可能改过的名称
      const order = db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
      for (const category of DEFAULT_CATEGORIES) {
        insert.run(category.id, category.name, category.sortOrder);
        order.run(category.sortOrder, category.id);
      }
      for (const [oldId, newId] of Object.entries(CATEGORY_ID_MIGRATIONS)) {
        db.prepare('UPDATE materials SET category_id = ? WHERE category_id = ?').run(newId, oldId);
        db.prepare('DELETE FROM categories WHERE id = ?').run(oldId);
      }
      // v4：分类改名「实验耗材 → 活动耗材」，仅在仍是旧名称时改，避免覆盖自定义名称
      db.prepare("UPDATE categories SET name = '活动耗材' WHERE id = 'cat-lab' AND name = '实验耗材'").run();
      db.prepare(`INSERT INTO settings (key, value) VALUES ('categoriesVersion', '4')
        ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run();
      audit('system', 'categories_migrate', 'category', '', '分类体系升级为按用途划分');
    });
    return true;
  }
  function listCategories() {
    return db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, name ASC').all()
      .map(row => ({ id: row.id, name: row.name, sortOrder: Number(row.sort_order) }));
  }

  function createCategory({ name, sortOrder }) {
    const trimmed = String(name || '').trim();
    if (!trimmed) throw new AppError('INVALID', '分类名称不能为空');
    const id = `cat-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    db.prepare('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)')
      .run(id, trimmed, toInt(sortOrder) ?? 99);
    return { id, name: trimmed, sortOrder: toInt(sortOrder) ?? 99 };
  }

  function updateCategory(id, { name, sortOrder }) {
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) throw new AppError('NOT_FOUND', '分类不存在');
    const trimmed = String(name ?? existing.name).trim();
    if (!trimmed) throw new AppError('INVALID', '分类名称不能为空');
    db.prepare('UPDATE categories SET name = ?, sort_order = ? WHERE id = ?')
      .run(trimmed, toInt(sortOrder) ?? Number(existing.sort_order), id);
    return { id, name: trimmed };
  }

  function deleteCategory(id) {
    if (id === 'cat-other') throw new AppError('INVALID', '「其他」分类不能删除');
    const used = Number(db.prepare('SELECT COUNT(*) AS n FROM materials WHERE category_id = ?').get(id).n);
    if (used > 0) throw new AppError('INVALID', `该分类下还有 ${used} 种物资，请先改分类`);
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  }

  // ---------- 物资 ----------
  function listMaterials({ q = '', categoryId = '', includeInactive = false } = {}) {
    const where = [];
    const params = [];
    if (!includeInactive) where.push('m.active = 1');
    if (categoryId) {
      where.push('m.category_id = ?');
      params.push(categoryId);
    }
    const keyword = String(q || '').trim();
    if (keyword) {
      where.push('(m.name LIKE ? OR m.spec LIKE ? OR m.location LIKE ? OR m.id LIKE ?)');
      const like = `%${keyword}%`;
      params.push(like, like, like, like);
    }
    const sql = `SELECT m.*, c.name AS category_name FROM materials m
      LEFT JOIN categories c ON c.id = m.category_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY m.active DESC, c.sort_order ASC, m.name ASC`;
    const rows = db.prepare(sql).all(...params);
    const borrowRows = db.prepare(`SELECT material_id, SUM(qty - returned_qty) AS out_qty, COUNT(*) AS open_count
      FROM borrows WHERE status IN ('open', 'partial') GROUP BY material_id`).all();
    const borrowMap = new Map(borrowRows.map(r => [r.material_id, { outQty: Number(r.out_qty), openCount: Number(r.open_count) }]));
    return rows.map(row => {
      const material = materialFromRow(row);
      const borrowed = borrowMap.get(material.id);
      return {
        ...material,
        categoryName: row.category_name || '未分类',
        borrowedOut: borrowed ? borrowed.outQty : 0,
        openBorrowCount: borrowed ? borrowed.openCount : 0,
        lowStock: material.safetyStock > 0 && material.stock <= material.safetyStock
      };
    });
  }

  function getMaterial(id) {
    const row = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);
    return materialFromRow(row);
  }

  // 开放建档场景下，同名物资是最常见的数据质量问题，入库前先查重。
  function findActiveMaterialByName(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;
    return materialFromRow(db.prepare('SELECT * FROM materials WHERE active = 1 AND name = ? LIMIT 1').get(trimmed));
  }

  function createMaterial(payload, { createdBy = '' } = {}) {
    const name = String(payload.name || '').trim();
    if (!name) throw new AppError('INVALID', '物资名称不能为空');
    const unit = String(payload.unit || '').trim() || '个';
    const categoryId = String(payload.categoryId || 'cat-other').trim();
    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId);
    if (!category) throw new AppError('INVALID', '分类不存在');
    const stock = toInt(payload.stock) ?? 0;
    if (stock < 0) throw new AppError('INVALID', '初始库存不能为负数');
    const safetyStock = toInt(payload.safetyStock) ?? 0;
    if (safetyStock < 0) throw new AppError('INVALID', '预警阈值不能为负数');
    const id = `MAT${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const timestamp = nowIso();
    db.prepare(`INSERT INTO materials (
      id, name, spec, category_id, unit, needs_return, stock, safety_stock, location,
      image, image_thumb, notes, active, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`).run(
      id, name, String(payload.spec || '').trim(), categoryId, unit,
      payload.needsReturn ? 1 : 0, stock, safetyStock, String(payload.location || '').trim(),
      payload.image || null, payload.imageThumb || null, String(payload.notes || '').trim(),
      createdBy, timestamp, timestamp
    );
    return getMaterial(id);
  }

  function updateMaterial(id, payload) {
    const existing = getMaterial(id);
    if (!existing) throw new AppError('NOT_FOUND', '物资不存在');
    const next = {
      name: String(payload.name ?? existing.name).trim(),
      spec: String(payload.spec ?? existing.spec).trim(),
      categoryId: String(payload.categoryId ?? existing.categoryId).trim(),
      unit: String(payload.unit ?? existing.unit).trim() || '个',
      needsReturn: payload.needsReturn === undefined ? existing.needsReturn : Boolean(payload.needsReturn),
      safetyStock: toInt(payload.safetyStock) ?? existing.safetyStock,
      location: String(payload.location ?? existing.location).trim(),
      notes: String(payload.notes ?? existing.notes).trim(),
      active: payload.active === undefined ? existing.active : Boolean(payload.active)
    };
    if (!next.name) throw new AppError('INVALID', '物资名称不能为空');
    if (!db.prepare('SELECT id FROM categories WHERE id = ?').get(next.categoryId)) {
      throw new AppError('INVALID', '分类不存在');
    }
    db.prepare(`UPDATE materials SET name = ?, spec = ?, category_id = ?, unit = ?, needs_return = ?,
      safety_stock = ?, location = ?, notes = ?, active = ?, updated_at = ? WHERE id = ?`).run(
      next.name, next.spec, next.categoryId, next.unit, next.needsReturn ? 1 : 0,
      next.safetyStock, next.location, next.notes, next.active ? 1 : 0, nowIso(), id
    );
    if (payload.image !== undefined || payload.imageThumb !== undefined) {
      db.prepare('UPDATE materials SET image = ?, image_thumb = ? WHERE id = ?')
        .run(payload.image || null, payload.imageThumb || null, id);
    }
    return getMaterial(id);
  }

  // 合并重复物资：把 sourceIds 的在库数量并入 targetId，源物资停用但保留历史流水。
  function mergeMaterials({ targetId, sourceIds = [], actor = '' } = {}) {
    const target = getMaterial(targetId);
    if (!target) throw new AppError('NOT_FOUND', '目标物资不存在');
    const ids = sourceIds.filter(id => id && id !== targetId);
    if (ids.length === 0) throw new AppError('INVALID', '请选择要合并的物资');
    return transaction(() => {
      let moved = 0;
      for (const sourceId of ids) {
        const source = getMaterial(sourceId);
        if (!source) continue;
        if (source.needsReturn !== target.needsReturn) {
          throw new AppError('INVALID', `「${source.name}」与目标物资的归还属性不一致，不能合并`);
        }
        const openBorrow = db.prepare("SELECT COUNT(*) AS n FROM borrows WHERE material_id = ? AND status IN ('open','partial')").get(sourceId);
        if (Number(openBorrow.n) > 0) {
          throw new AppError('INVALID', `「${source.name}」还有未归还记录，不能合并`);
        }
        if (source.stock > 0) {
          const before = target.stock;
          const after = before + source.stock;
          const timestamp = nowIso();
          db.prepare('UPDATE materials SET stock = ?, updated_at = ? WHERE id = ?').run(after, timestamp, targetId);
          db.prepare(`INSERT INTO stock_txns (material_id, material_name, material_spec, material_unit, type, qty,
            before_stock, after_stock, operator, note, created_at) VALUES (?, ?, ?, ?, 'adjust', ?, ?, ?, ?, ?, ?)`).run(
            targetId, target.name, target.spec, target.unit, source.stock, before, after, actor,
            `合并自「${source.name}」（${source.id}）`, timestamp
          );
          target.stock = after;
          moved += source.stock;
        }
        // 源物资库存清零并停用：流水保留，库存归零，保证「库存 = 流水累计」不变。
        if (source.stock > 0) {
          db.prepare(`INSERT INTO stock_txns (material_id, material_name, material_spec, material_unit, type, qty,
            before_stock, after_stock, operator, note, created_at) VALUES (?, ?, ?, ?, 'adjust', ?, ?, ?, ?, ?, ?)`).run(
            sourceId, source.name, source.spec, source.unit, source.stock, source.stock, 0, actor,
            `合并至「${target.name}」（${target.id}）`, nowIso()
          );
        }
        db.prepare('UPDATE materials SET stock = 0, active = 0, updated_at = ? WHERE id = ?').run(nowIso(), sourceId);
      }
      audit(actor, 'material_merge', 'material', targetId, `合并 ${ids.length} 条物资，移入库存 ${moved}`);
      return { targetId, merged: ids.length, movedStock: moved };
    });
  }

  // ---------- 库存核心 ----------
  // direction: +1 增加（入库/归还），-1 减少（取出/借出）
  function applyStockChange({ materialId, type, qty, direction, operator, operatorPhone = '', note = '', refType = '', refId = '' }) {
    if (!TXN_TYPES.has(type)) throw new AppError('INVALID', '流水类型无效');
    const amount = toInt(qty);
    if (!amount || amount <= 0) throw new AppError('INVALID', '数量必须是大于 0 的整数');
    const material = getMaterial(materialId);
    if (!material) throw new AppError('NOT_FOUND', '物资不存在');
    if (!material.active) throw new AppError('INVALID', '该物资已停用');

    const before = material.stock;
    const after = before + direction * amount;
    if (after < 0) {
      throw new AppError('INSUFFICIENT_STOCK', `库存不足：当前仅剩 ${before}${material.unit}`, { stock: before });
    }
    const timestamp = nowIso();
    // 条件更新：即使锁机制出现意外，也不会把库存写成负数。
    const result = db.prepare('UPDATE materials SET stock = ?, updated_at = ? WHERE id = ? AND stock = ?')
      .run(after, timestamp, materialId, before);
    if (Number(result.changes) !== 1) {
      throw new AppError('CONFLICT', '库存已被其他操作修改，请重试');
    }
    const inserted = db.prepare(`INSERT INTO stock_txns (material_id, material_name, material_spec, material_unit,
      type, qty, before_stock, after_stock, operator, operator_phone, note, ref_type, ref_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      material.id, material.name, material.spec, material.unit, type, amount, before, after,
      operator, operatorPhone, note, refType, refId, timestamp
    );
    return { txnId: Number(inserted.lastInsertRowid), material: getMaterial(materialId), before, after };
  }

  function stockIn({ materialId, qty, operator, operatorPhone, note }) {
    return transaction(() => applyStockChange({
      materialId, qty, type: 'in', direction: 1, operator, operatorPhone, note
    }));
  }

  function stockOut({ materialId, qty, operator, operatorPhone, note }) {
    return transaction(() => applyStockChange({
      materialId, qty, type: 'out', direction: -1, operator, operatorPhone, note
    }));
  }

  function listTxns({ materialId = '', operator = '', type = '', from = '', to = '', limit = 50, offset = 0, includeRevoked = true } = {}) {
    const where = [];
    const params = [];
    if (materialId) {
      where.push('material_id = ?');
      params.push(materialId);
    }
    if (operator) {
      where.push('operator LIKE ?');
      params.push(`%${operator}%`);
    }
    if (type) {
      where.push('type = ?');
      params.push(type);
    }
    if (from) {
      where.push('created_at >= ?');
      params.push(from);
    }
    if (to) {
      where.push('created_at <= ?');
      params.push(to);
    }
    if (!includeRevoked) where.push('revoked = 0');
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = Number(db.prepare(`SELECT COUNT(*) AS n FROM stock_txns ${clause}`).get(...params).n);
    const rows = db.prepare(`SELECT * FROM stock_txns ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`)
      .all(...params, Math.min(Math.max(toInt(limit) ?? 50, 1), 500), Math.max(toInt(offset) ?? 0, 0));
    return { total, items: rows.map(txnFromRow) };
  }

  function getTxn(id) {
    return txnFromRow(db.prepare('SELECT * FROM stock_txns WHERE id = ?').get(id));
  }

  // 撤销：按 (after − before) 的反向回滚库存，流水保留并标记，保证可追溯。
  function revokeTxn({ txnId, actor, reason = '' }) {
    return transaction(() => {
      const txn = getTxn(txnId);
      if (!txn) throw new AppError('NOT_FOUND', '流水不存在');
      if (txn.revoked) throw new AppError('INVALID', '该流水已撤销，不能重复撤销');
      const material = getMaterial(txn.materialId);
      if (!material) throw new AppError('NOT_FOUND', '物资已不存在');
      const delta = txn.afterStock - txn.beforeStock;
      const nextStock = material.stock - delta;
      if (nextStock < 0) {
        throw new AppError('INVALID', `无法撤销：撤销后库存会变成 ${nextStock}，该批物资已被使用`);
      }
      const timestamp = nowIso();
      const updated = db.prepare('UPDATE materials SET stock = ?, updated_at = ? WHERE id = ? AND stock = ?')
        .run(nextStock, timestamp, material.id, material.stock);
      if (Number(updated.changes) !== 1) throw new AppError('CONFLICT', '库存已被其他操作修改，请重试');
      db.prepare(`UPDATE stock_txns SET revoked = 1, revoked_by = ?, revoked_reason = ?, revoked_at = ? WHERE id = ?`)
        .run(actor || '', reason, timestamp, txnId);
      audit(actor, 'txn_revoke', 'stock_txn', txnId, `撤销流水 #${txnId}（${txn.materialName} ${txn.type} ${txn.qty}），原因：${reason || '未填写'}`);
      return { txnId, stock: nextStock };
    });
  }

  // ---------- 借用（器材类，P1 完整启用；接口已就绪） ----------
  function borrowOut({ materialId, qty, borrower, borrowerPhone = '', dueAt = null, note = '' }) {
    const material = getMaterial(materialId);
    if (!material) throw new AppError('NOT_FOUND', '物资不存在');
    if (!material.needsReturn) throw new AppError('INVALID', '该物资为消耗品，请使用「取出」');
    return transaction(() => {
      const id = `BR${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      db.prepare(`INSERT INTO borrows (id, material_id, material_name, material_unit, qty, returned_qty,
        borrower, borrower_phone, due_at, status, note, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 'open', ?, ?)`)
        .run(id, material.id, material.name, material.unit, toInt(qty), borrower, borrowerPhone, dueAt, note, nowIso());
      const applied = applyStockChange({
        materialId, qty, type: 'borrow', direction: -1,
        operator: borrower, operatorPhone: borrowerPhone, note, refType: 'borrow', refId: id
      });
      return { borrow: borrowFromRow(db.prepare('SELECT * FROM borrows WHERE id = ?').get(id)), ...applied };
    });
  }

  function returnBorrow({ borrowId, qty, operator, operatorPhone = '', note = '' }) {
    return transaction(() => {
      const row = db.prepare('SELECT * FROM borrows WHERE id = ?').get(borrowId);
      if (!row) throw new AppError('NOT_FOUND', '借用记录不存在');
      const borrow = borrowFromRow(row);
      if (borrow.status === 'closed') throw new AppError('INVALID', '该借用单已结清');
      if (borrow.status === 'lost') throw new AppError('INVALID', '该借用单已标记丢失');
      const amount = toInt(qty);
      if (!amount || amount <= 0) throw new AppError('INVALID', '归还数量必须是大于 0 的整数');
      if (amount > borrow.remainingQty) {
        throw new AppError('INVALID', `归还数量超过未还数量（未还 ${borrow.remainingQty}${borrow.materialUnit}）`);
      }
      const applied = applyStockChange({
        materialId: borrow.materialId, qty: amount, type: 'return', direction: 1,
        operator, operatorPhone, note, refType: 'borrow', refId: borrow.id
      });
      const returnedQty = borrow.returnedQty + amount;
      const status = returnedQty >= borrow.qty ? 'closed' : 'partial';
      db.prepare('UPDATE borrows SET returned_qty = ?, status = ?, closed_at = ? WHERE id = ?')
        .run(returnedQty, status, status === 'closed' ? nowIso() : null, borrow.id);
      return { borrow: borrowFromRow(db.prepare('SELECT * FROM borrows WHERE id = ?').get(borrow.id)), ...applied };
    });
  }

  function listBorrows({ q = '', status = '', limit = 100 } = {}) {
    const where = [];
    const params = [];
    if (status) {
      where.push('status = ?');
      params.push(status);
    } else {
      where.push("status IN ('open','partial','lost')");
    }
    const keyword = String(q || '').trim();
    if (keyword) {
      where.push('(borrower LIKE ? OR borrower_phone LIKE ? OR material_name LIKE ? OR id LIKE ?)');
      const like = `%${keyword}%`;
      params.push(like, like, like, like);
    }
    const rows = db.prepare(`SELECT * FROM borrows WHERE ${where.join(' AND ')}
      ORDER BY CASE status WHEN 'lost' THEN 0 WHEN 'open' THEN 1 ELSE 2 END, created_at ASC
      LIMIT ?`).all(...params, Math.min(Math.max(toInt(limit) ?? 100, 1), 500));
    return rows.map(borrowFromRow);
  }

  function markBorrowLost({ borrowId, actor, note = '' }) {
    return transaction(() => {
      const row = db.prepare('SELECT * FROM borrows WHERE id = ?').get(borrowId);
      if (!row) throw new AppError('NOT_FOUND', '借用记录不存在');
      if (row.status === 'closed') throw new AppError('INVALID', '该借用单已结清');
      db.prepare("UPDATE borrows SET status = 'lost', note = ?, closed_at = ? WHERE id = ?")
        .run(note, nowIso(), borrowId);
      audit(actor, 'borrow_lost', 'borrow', borrowId, `标记丢失：${row.material_name} ${row.qty - row.returned_qty}`);
      return borrowFromRow(db.prepare('SELECT * FROM borrows WHERE id = ?').get(borrowId));
    });
  }

  // ---------- 管理员 ----------
  function findAdminByUsername(username) {
    const row = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(String(username || '').trim());
    if (!row) return null;
    return { id: row.id, username: row.username, passwordHash: row.password_hash, role: row.role };
  }

  function ensureAdmin({ username = 'admin', passwordHash, role = 'super_admin' }) {
    const existing = findAdminByUsername(username);
    const timestamp = nowIso();
    if (existing) {
      db.prepare('UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = ?')
        .run(passwordHash, timestamp, existing.id);
      return { ...existing, passwordHash, created: false };
    }
    const id = `admin-${Date.now().toString(36)}`;
    db.prepare('INSERT INTO admin_users (id, username, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, username, passwordHash, role, timestamp, timestamp);
    return { id, username, passwordHash, role, created: true };
  }

  function updateAdminPassword(id, passwordHash) {
    db.prepare('UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = ?').run(passwordHash, nowIso(), id);
  }

  // ---------- 设置 ----------
  function getSettings() {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    return settings;
  }

  function updateSettings(patch = {}) {
    const allowed = Object.keys(DEFAULT_SETTINGS);
    transaction(() => {
      const upsert = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
      for (const [key, value] of Object.entries(patch)) {
        if (!allowed.includes(key)) continue;
        if (key === 'dailyOpLimit') {
          const limit = toInt(value);
          if (limit === null || limit < 0 || limit > 1000) throw new AppError('INVALID', '每日上限需为 0-1000 的整数');
          upsert.run(key, JSON.stringify(limit));
          continue;
        }
        upsert.run(key, JSON.stringify(value));
      }
    });
    return getSettings();
  }

  // 单人单日操作次数（按经手人姓名统计，含删除的不可用；用于防批量刷）
  function countTodayOps(operator) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Number(db.prepare("SELECT COUNT(*) AS n FROM stock_txns WHERE operator = ? AND created_at >= ? AND revoked = 0")
      .get(String(operator || ''), start.toISOString()).n);
  }

  // ---------- 概览 ----------
  function overview() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const todayStart = start.toISOString();
    const materialCount = Number(db.prepare('SELECT COUNT(*) AS n FROM materials WHERE active = 1').get().n);
    const totalStock = Number(db.prepare('SELECT COALESCE(SUM(stock), 0) AS n FROM materials WHERE active = 1').get().n);
    const todayIn = Number(db.prepare("SELECT COUNT(*) AS n FROM stock_txns WHERE type = 'in' AND revoked = 0 AND created_at >= ?").get(todayStart).n);
    const todayOut = Number(db.prepare("SELECT COUNT(*) AS n FROM stock_txns WHERE type IN ('out','borrow') AND revoked = 0 AND created_at >= ?").get(todayStart).n);
    const openBorrows = Number(db.prepare("SELECT COALESCE(SUM(qty - returned_qty), 0) AS n FROM borrows WHERE status IN ('open','partial')").get().n);
    const lowStock = listMaterials().filter(m => m.lowStock).slice(0, 20);
    const recent = listTxns({ limit: 10 }).items;
    const categoryStats = db.prepare(`SELECT c.name, COUNT(m.id) AS kinds, COALESCE(SUM(m.stock), 0) AS stock
      FROM categories c LEFT JOIN materials m ON m.category_id = c.id AND m.active = 1
      GROUP BY c.id ORDER BY c.sort_order`).all()
      .map(row => ({ name: row.name, kinds: Number(row.kinds), stock: Number(row.stock) }));
    return {
      materialCount,
      totalStock,
      todayIn,
      todayOut,
      openBorrows,
      lowStock,
      recent,
      categoryStats
    };
  }

  function listAudit(limit = 50) {
    return db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?').all(Math.min(Math.max(toInt(limit) ?? 50, 1), 500))
      .map(row => ({
        id: Number(row.id),
        actor: row.actor,
        action: row.action,
        targetType: row.target_type,
        targetId: row.target_id,
        summary: row.summary,
        createdAt: row.created_at
      }));
  }

  seed();
  migrateCategories();

  return {
    databasePath,
    firstRun,
    transaction,
    audit,
    listCategories, createCategory, updateCategory, deleteCategory,
    listMaterials, getMaterial, createMaterial, updateMaterial, mergeMaterials, findActiveMaterialByName,
    stockIn, stockOut, applyStockChange,
    listTxns, getTxn, revokeTxn,
    borrowOut, returnBorrow, listBorrows, markBorrowLost,
    findAdminByUsername, ensureAdmin, updateAdminPassword,
    getSettings, updateSettings, countTodayOps,
    overview, listAudit,
    close: () => db.close()
  };
}

module.exports = { createStore, AppError, DEFAULT_SETTINGS };
