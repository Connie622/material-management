// 物资管理系统 - 服务端
// 设计要点：
// 1) 前台完全免登录，只按「经手人姓名」留痕；管理员走独立登录。
// 2) 库存数量以最小单位整数管理，扣减在 SQLite 写锁事务内完成，不允许负库存。
// 3) 流水只增不改，纠错靠「撤销 + 回滚」并保留痕迹。
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const multer = require('multer');
const QRCode = require('qrcode');
const sharp = require('sharp');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createStore, AppError } = require('./db/store');

const PORT = Number(process.env.PORT) || 3100;
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(__dirname, 'uploads');
const QR_DIR = process.env.QR_DIR ? path.resolve(process.env.QR_DIR) : path.join(__dirname, 'public/qrcodes');
const DATABASE_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(DATA_DIR, 'material-management.sqlite');
const APP_BASE_URL = String(process.env.APP_BASE_URL || '').trim().replace(/\/+$/, '');
const FRONTEND_DIST_DIR = path.join(__dirname, 'frontend', 'dist');
const STATIC_DIR = fs.existsSync(path.join(FRONTEND_DIST_DIR, 'index.html')) ? FRONTEND_DIST_DIR : path.join(__dirname, 'frontend');

if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD) {
  throw new Error('生产环境必须设置 ADMIN_PASSWORD');
}

[UPLOAD_DIR, QR_DIR].forEach(dir => fs.mkdirSync(dir, { recursive: true }));
const store = createStore({ dataDir: DATA_DIR, databasePath: DATABASE_PATH });

// ---------- 密码与会话 ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const expected = Buffer.from(parts[2], 'hex');
  const actual = crypto.scryptSync(password, parts[1], 64);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const sessions = new Map();

function createSession(admin) {
  const sid = crypto.randomBytes(24).toString('hex');
  sessions.set(sid, { id: admin.id, username: admin.username, role: admin.role, at: Date.now() });
  return sid;
}

function readSession(req) {
  const sid = req.headers['x-session-id'] || req.cookies?.mm_session;
  if (!sid) return null;
  const session = sessions.get(String(sid));
  if (!session) return null;
  if (Date.now() - session.at > SESSION_TTL_MS) {
    sessions.delete(String(sid));
    return null;
  }
  session.at = Date.now();
  return session;
}

function authenticateAdmin(req, res, next) {
  const session = readSession(req);
  if (!session) return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: '未登录管理后台' });
  req.admin = session;
  next();
}

// ---------- 初始化管理员 ----------
{
  const username = String(process.env.ADMIN_USERNAME || 'admin').trim() || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const result = store.ensureAdmin({ username, passwordHash: hashPassword(password) });
  if (result.created) {
    console.log(`\n  已创建管理员账号：${username}`);
    if (!process.env.ADMIN_PASSWORD) console.warn('  ⚠️  使用开发默认密码 admin123，部署前请设置 ADMIN_PASSWORD。\n');
  }
}

// ---------- 通用工具 ----------
function ok(res, data) {
  res.json({ success: true, data });
}

function fail(res, status, code, message, extra = {}) {
  res.status(status).json({ success: false, code, message, ...extra });
}

function asInt(value, field, { min = 1, max = 999999 } = {}) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new AppError('INVALID', `${field}需为 ${min}-${max} 的整数`);
  }
  return n;
}

function cleanText(value, max = 200) {
  return String(value ?? '').trim().slice(0, max);
}

// 经手人姓名：免登录场景下唯一的责任落点，默认必填。
function requireOperator(rawOperator, settings) {
  const operator = cleanText(rawOperator, 30);
  if (settings.requireOperatorName && !operator) {
    throw new AppError('INVALID', '请填写经手人姓名');
  }
  return operator || '匿名';
}

function enforceDailyLimit(operator, settings) {
  const limit = Number(settings.dailyOpLimit) || 0;
  if (limit <= 0) return;
  if (store.countTodayOps(operator) >= limit) {
    throw new AppError('RATE_LIMITED', `「${operator}」今日操作已达上限 ${limit} 次，如需继续请联系管理员`);
  }
}

// ---------- 中间件 ----------
const app = express();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      // HTTP 部署不能保留 upgrade-insecure-requests，否则浏览器会把脚本升级到 HTTPS 导致白屏。
      upgradeInsecureRequests: null
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
// 极简 cookie 解析（只用于口令放行，避免额外依赖）
app.use((req, res, next) => {
  const header = req.headers.cookie || '';
  req.cookies = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) req.cookies[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  next();
});
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use('/qrcodes', express.static(QR_DIR, { maxAge: '1d' }));
app.use(express.static(STATIC_DIR, { index: false }));

const publicLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });
const writeLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
app.use('/api/public', publicLimiter);
app.use(['/api/public/stock-in', '/api/public/stock-out', '/api/public/borrow', '/api/public/return'], writeLimiter);

// 轻口令（默认关闭，后台可一键开启）
const GATE_SECRET = process.env.GATE_SECRET || crypto.randomBytes(16).toString('hex');
function gateToken(code) {
  return crypto.createHmac('sha256', GATE_SECRET).update(String(code)).digest('hex');
}
function gatePassed(req, settings) {
  if (!settings.gateEnabled) return true;
  return req.cookies?.mm_gate === gateToken(settings.gateCode);
}
function requireGate(req, res, next) {
  const settings = store.getSettings();
  if (gatePassed(req, settings)) return next();
  return fail(res, 403, 'GATE_REQUIRED', '请输入访问口令');
}

// ---------- 图片上传 ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new AppError('INVALID', '仅支持 JPEG / PNG / WebP 图片'));
    }
    cb(null, true);
  }
});

async function optimizeImage(buffer, materialId) {
  const base = `${materialId}-${Date.now().toString(36)}`;
  const detailName = `${base}-detail.webp`;
  const thumbName = `${base}-thumb.webp`;
  await sharp(buffer).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 }).toFile(path.join(UPLOAD_DIR, detailName));
  await sharp(buffer).rotate().resize({ width: 420, height: 420, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 }).toFile(path.join(UPLOAD_DIR, thumbName));
  return { image: `/uploads/${detailName}`, imageThumb: `/uploads/${thumbName}` };
}

// ================= 前台（免登录） =================
app.get('/api/public/config', (req, res) => {
  const settings = store.getSettings();
  ok(res, {
    siteTitle: settings.siteTitle,
    siteFooterQuote: settings.siteFooterQuote,
    siteIcp: settings.siteIcp,
    siteStartedAt: settings.siteStartedAt,
    gateEnabled: settings.gateEnabled,
    gatePassed: gatePassed(req, settings),
    requireOperatorName: settings.requireOperatorName,
    allowAnonymousStockIn: settings.allowAnonymousStockIn,
    allowAnonymousCreate: settings.allowAnonymousCreate,
    dailyOpLimit: settings.dailyOpLimit
  });
});

app.post('/api/public/gate', (req, res) => {
  const settings = store.getSettings();
  if (!settings.gateEnabled) return ok(res, { gatePassed: true });
  const code = cleanText(req.body?.code, 60);
  if (!settings.gateCode || code !== settings.gateCode) {
    return fail(res, 403, 'GATE_REQUIRED', '口令不正确');
  }
  res.cookie('mm_gate', gateToken(settings.gateCode), { maxAge: 7 * 24 * 3600 * 1000, httpOnly: true, sameSite: 'lax' });
  ok(res, { gatePassed: true });
});

app.get('/api/public/categories', requireGate, (req, res) => ok(res, store.listCategories()));

app.get('/api/public/materials', requireGate, (req, res) => {
  const materials = store.listMaterials({
    q: cleanText(req.query.q, 60),
    categoryId: cleanText(req.query.categoryId, 60)
  });
  ok(res, materials);
});

app.get('/api/public/borrows', requireGate, (req, res) => {
  ok(res, store.listBorrows({ q: cleanText(req.query.q, 60), status: cleanText(req.query.status, 20) }));
});

app.get('/api/public/recent', requireGate, (req, res) => {
  ok(res, store.listTxns({ limit: 8 }).items);
});

// 入库：可对已有物资加数量，也可「新建并入库」
app.post('/api/public/stock-in', (req, res) => {
  const settings = store.getSettings();
  const body = req.body || {};
  const operator = requireOperator(body.operator, settings);
  enforceDailyLimit(operator, settings);
  const qty = asInt(body.qty, '入库数量');
  const note = cleanText(body.note, 200);
  const materialId = cleanText(body.materialId, 60);

  let material;
  let createdNew = false;
  const run = () => {
    if (!materialId) {
      if (!settings.allowAnonymousCreate || !settings.allowAnonymousStockIn) {
        throw new AppError('FORBIDDEN', '当前不允许自助新建物资，请联系管理员');
      }
      const draft = body.newMaterial || {};
      if (!cleanText(draft.name, 60)) throw new AppError('INVALID', '请填写物资名称');
      // 同名物资已存在时不再新建，避免同一种物资被录成多条（管理员可用「合并」清理历史重复）
      const duplicate = store.findActiveMaterialByName(draft.name);
      if (duplicate) {
        throw new AppError('DUPLICATE_MATERIAL',
          `已存在同名物资「${duplicate.name}」，请直接选择它入库`,
          { existingId: duplicate.id, existingStock: duplicate.stock });
      }
      material = store.createMaterial({
        name: draft.name,
        spec: draft.spec,
        categoryId: draft.categoryId,
        unit: draft.unit,
        needsReturn: draft.needsReturn,
        location: draft.location,
        safetyStock: draft.safetyStock,
        notes: draft.notes,
        stock: 0
      }, { createdBy: operator });
      createdNew = true;
    } else {
      if (!settings.allowAnonymousStockIn) throw new AppError('FORBIDDEN', '当前不允许自助入库，请联系管理员');
      material = store.getMaterial(materialId);
      if (!material) throw new AppError('NOT_FOUND', '物资不存在');
    }
    const applied = store.stockIn({ materialId: material.id, qty, operator, note });
    return applied;
  };

  const applied = store.transaction(run);
  ok(res, {
    createdNew,
    txnId: applied.txnId,
    material: applied.material,
    beforeStock: applied.before,
    afterStock: applied.after
  });
});

// 取出（消耗品出库）
app.post('/api/public/stock-out', (req, res) => {
  const settings = store.getSettings();
  const body = req.body || {};
  const operator = requireOperator(body.operator, settings);
  enforceDailyLimit(operator, settings);
  const qty = asInt(body.qty, '取出数量');
  const materialId = cleanText(body.materialId, 60);
  const note = cleanText(body.note, 200);
  const material = store.getMaterial(materialId);
  if (!material) throw new AppError('NOT_FOUND', '物资不存在');
  if (material.needsReturn) {
    throw new AppError('INVALID', '该物资需要归还，请使用「借出」');
  }
  const applied = store.stockOut({ materialId, qty, operator, note });
  ok(res, { txnId: applied.txnId, material: applied.material, beforeStock: applied.before, afterStock: applied.after });
});

// 借出（器材类）
app.post('/api/public/borrow', (req, res) => {
  const settings = store.getSettings();
  const body = req.body || {};
  const operator = requireOperator(body.operator, settings);
  enforceDailyLimit(operator, settings);
  const qty = asInt(body.qty, '借出数量');
  const materialId = cleanText(body.materialId, 60);
  const material = store.getMaterial(materialId);
  if (!material) throw new AppError('NOT_FOUND', '物资不存在');
  if (!material.needsReturn) throw new AppError('INVALID', '该物资为消耗品，请使用「取出」');
  const result = store.borrowOut({
    materialId,
    qty,
    borrower: operator,
    borrowerPhone: cleanText(body.operatorPhone, 20),
    dueAt: cleanText(body.dueAt, 30) || null,
    note: cleanText(body.note, 200)
  });
  ok(res, { borrow: result.borrow, txnId: result.txnId, material: result.material });
});

// 归还（支持部分归还）
app.post('/api/public/return', (req, res) => {
  const settings = store.getSettings();
  const body = req.body || {};
  const operator = requireOperator(body.operator, settings);
  const qty = asInt(body.qty, '归还数量');
  const borrowId = cleanText(body.borrowId, 60);
  const result = store.returnBorrow({
    borrowId,
    qty,
    operator,
    operatorPhone: cleanText(body.operatorPhone, 20),
    note: cleanText(body.note, 200)
  });
  ok(res, { borrow: result.borrow, txnId: result.txnId, material: result.material });
});

// ================= 后台（需登录） =================
app.post('/api/admin/login', loginLimiter, (req, res) => {
  const username = cleanText(req.body?.username, 40);
  const password = String(req.body?.password || '');
  const admin = store.findAdminByUsername(username);
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return fail(res, 401, 'INVALID_CREDENTIALS', '用户名或密码错误');
  }
  const sid = createSession(admin);
  ok(res, { sessionId: sid, user: { id: admin.id, username: admin.username, role: admin.role } });
});

app.post('/api/admin/logout', (req, res) => {
  const sid = req.headers['x-session-id'];
  if (sid) sessions.delete(String(sid));
  ok(res, { loggedOut: true });
});

app.get('/api/admin/check', (req, res) => {
  const session = readSession(req);
  ok(res, { isAdmin: Boolean(session), user: session ? { username: session.username, role: session.role } : null });
});

app.get('/api/admin/overview', authenticateAdmin, (req, res) => ok(res, store.overview()));

app.get('/api/admin/materials', authenticateAdmin, (req, res) => {
  ok(res, store.listMaterials({
    q: cleanText(req.query.q, 60),
    categoryId: cleanText(req.query.categoryId, 60),
    includeInactive: req.query.includeInactive === '1'
  }));
});

app.post('/api/admin/materials', authenticateAdmin, upload.single('image'), async (req, res) => {
  const body = req.body || {};
  let image = null;
  let imageThumb = null;
  const material = store.createMaterial({
    name: body.name,
    spec: body.spec,
    categoryId: body.categoryId,
    unit: body.unit,
    needsReturn: body.needsReturn === true || body.needsReturn === 'true' || body.needsReturn === '1',
    location: body.location,
    safetyStock: body.safetyStock,
    notes: body.notes,
    stock: 0
  }, { createdBy: req.admin.username });
  if (req.file) {
    const optimized = await optimizeImage(req.file.buffer, material.id);
    image = optimized.image;
    imageThumb = optimized.imageThumb;
    store.updateMaterial(material.id, { image, imageThumb });
  }
  store.audit(req.admin.username, 'material_create', 'material', material.id, `新增物资：${material.name}`);
  ok(res, store.getMaterial(material.id));
});

app.put('/api/admin/materials/:id', authenticateAdmin, upload.single('image'), async (req, res) => {
  const body = req.body || {};
  const patch = {
    name: body.name,
    spec: body.spec,
    categoryId: body.categoryId,
    unit: body.unit,
    safetyStock: body.safetyStock,
    location: body.location,
    notes: body.notes
  };
  if (body.needsReturn !== undefined) {
    patch.needsReturn = body.needsReturn === true || body.needsReturn === 'true' || body.needsReturn === '1';
  }
  if (body.active !== undefined) {
    patch.active = body.active === true || body.active === 'true' || body.active === '1';
  }
  if (req.file) {
    const optimized = await optimizeImage(req.file.buffer, req.params.id);
    patch.image = optimized.image;
    patch.imageThumb = optimized.imageThumb;
  }
  const material = store.updateMaterial(req.params.id, patch);
  store.audit(req.admin.username, 'material_update', 'material', material.id, `修改物资：${material.name}`);
  ok(res, material);
});

// 校准库存（管理员直接改正数量，会留下 adjust 流水）
app.post('/api/admin/materials/:id/adjust', authenticateAdmin, (req, res) => {
  const material = store.getMaterial(req.params.id);
  if (!material) throw new AppError('NOT_FOUND', '物资不存在');
  const target = asInt(req.body?.stock, '校准后库存', { min: 0 });
  const reason = cleanText(req.body?.reason, 200) || '管理员校准';
  const delta = target - material.stock;
  if (delta === 0) return ok(res, material);
  const applied = store.transaction(() => store.applyStockChange({
    materialId: material.id,
    qty: Math.abs(delta),
    type: 'adjust',
    direction: delta > 0 ? 1 : -1,
    operator: req.admin.username,
    note: reason
  }));
  store.audit(req.admin.username, 'stock_adjust', 'material', material.id,
    `校准库存 ${material.stock} → ${target}（${reason}）`);
  ok(res, applied.material);
});

app.post('/api/admin/materials/merge', authenticateAdmin, (req, res) => {
  const result = store.mergeMaterials({
    targetId: cleanText(req.body?.targetId, 60),
    sourceIds: Array.isArray(req.body?.sourceIds) ? req.body.sourceIds.map(id => cleanText(id, 60)) : [],
    actor: req.admin.username
  });
  ok(res, result);
});

app.get('/api/admin/categories', authenticateAdmin, (req, res) => ok(res, store.listCategories()));
app.post('/api/admin/categories', authenticateAdmin, (req, res) => {
  const category = store.createCategory({ name: req.body?.name, sortOrder: req.body?.sortOrder });
  store.audit(req.admin.username, 'category_create', 'category', category.id, `新增分类：${category.name}`);
  ok(res, category);
});
app.put('/api/admin/categories/:id', authenticateAdmin, (req, res) => {
  ok(res, store.updateCategory(req.params.id, { name: req.body?.name, sortOrder: req.body?.sortOrder }));
});
app.delete('/api/admin/categories/:id', authenticateAdmin, (req, res) => {
  store.deleteCategory(req.params.id);
  store.audit(req.admin.username, 'category_delete', 'category', req.params.id, '删除分类');
  ok(res, { deleted: true });
});

app.get('/api/admin/txns', authenticateAdmin, (req, res) => {
  ok(res, store.listTxns({
    materialId: cleanText(req.query.materialId, 60),
    operator: cleanText(req.query.operator, 30),
    type: cleanText(req.query.type, 20),
    from: cleanText(req.query.from, 30),
    to: cleanText(req.query.to, 30),
    limit: Number(req.query.limit) || 50,
    offset: Number(req.query.offset) || 0
  }));
});

app.post('/api/admin/txns/:id/revoke', authenticateAdmin, (req, res) => {
  const result = store.revokeTxn({
    txnId: Number(req.params.id),
    actor: req.admin.username,
    reason: cleanText(req.body?.reason, 200)
  });
  ok(res, result);
});

app.get('/api/admin/borrows', authenticateAdmin, (req, res) => {
  ok(res, store.listBorrows({
    q: cleanText(req.query.q, 60),
    status: cleanText(req.query.status, 20),
    limit: Number(req.query.limit) || 100
  }));
});

app.post('/api/admin/borrows/:id/lost', authenticateAdmin, (req, res) => {
  ok(res, store.markBorrowLost({
    borrowId: req.params.id,
    actor: req.admin.username,
    note: cleanText(req.body?.note, 200)
  }));
});

app.get('/api/admin/settings', authenticateAdmin, (req, res) => {
  const settings = store.getSettings();
  // 口令本身不回显，只告诉是否已设置
  ok(res, { ...settings, gateCode: settings.gateCode ? '__SET__' : '' });
});

app.put('/api/admin/settings', authenticateAdmin, (req, res) => {
  const body = req.body || {};
  const patch = {};
  for (const key of ['siteTitle', 'siteFooterQuote', 'siteIcp', 'requireOperatorName', 'allowAnonymousStockIn', 'allowAnonymousCreate', 'dailyOpLimit', 'gateEnabled', 'lowStockAlert']) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  if (typeof body.gateCode === 'string' && body.gateCode !== '__SET__') patch.gateCode = cleanText(body.gateCode, 60);
  const settings = store.updateSettings(patch);
  store.audit(req.admin.username, 'settings_update', 'settings', '', JSON.stringify(patch));
  ok(res, { ...settings, gateCode: settings.gateCode ? '__SET__' : '' });
});

app.post('/api/admin/password', authenticateAdmin, (req, res) => {
  const current = String(req.body?.currentPassword || '');
  const next = String(req.body?.newPassword || '');
  const admin = store.findAdminByUsername(req.admin.username);
  if (!admin || !verifyPassword(current, admin.passwordHash)) {
    throw new AppError('INVALID', '当前密码不正确');
  }
  if (next.length < 8) throw new AppError('INVALID', '新密码至少 8 位');
  store.updateAdminPassword(admin.id, hashPassword(next));
  store.audit(req.admin.username, 'password_change', 'admin', admin.id, '修改管理员密码');
  ok(res, { changed: true });
});

app.get('/api/admin/audit', authenticateAdmin, (req, res) => {
  ok(res, store.listAudit(Number(req.query.limit) || 50));
});

// 导出流水 Excel
app.get('/api/admin/export/txns.xlsx', authenticateAdmin, async (req, res) => {
  const { items } = store.listTxns({
    materialId: cleanText(req.query.materialId, 60),
    operator: cleanText(req.query.operator, 30),
    type: cleanText(req.query.type, 20),
    from: cleanText(req.query.from, 30),
    to: cleanText(req.query.to, 30),
    limit: 500
  });
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('出入库流水');
  sheet.columns = [
    { header: '流水号', key: 'id', width: 10 },
    { header: '时间', key: 'createdAt', width: 22 },
    { header: '类型', key: 'type', width: 10 },
    { header: '物资', key: 'materialName', width: 22 },
    { header: '规格', key: 'materialSpec', width: 16 },
    { header: '数量', key: 'qty', width: 8 },
    { header: '单位', key: 'materialUnit', width: 8 },
    { header: '变动前', key: 'beforeStock', width: 10 },
    { header: '变动后', key: 'afterStock', width: 10 },
    { header: '经手人', key: 'operator', width: 14 },
    { header: '备注', key: 'note', width: 30 },
    { header: '状态', key: 'state', width: 12 }
  ];
  const typeLabels = { in: '入库', out: '取出', borrow: '借出', return: '归还', adjust: '校准' };
  for (const txn of items) {
    sheet.addRow({
      ...txn,
      type: typeLabels[txn.type] || txn.type,
      createdAt: txn.createdAt.replace('T', ' ').slice(0, 19),
      state: txn.revoked ? `已撤销（${txn.revokedReason || '无原因'}）` : '有效'
    });
  }
  sheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="txns-${Date.now()}.xlsx"`);
  res.send(Buffer.from(buffer));
});

// 生成门户二维码
app.post('/api/admin/qrcode/portal', authenticateAdmin, async (req, res) => {
  const base = APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
  const target = cleanText(req.body?.url, 300) || `${base}/`;
  const filename = `portal-${crypto.createHash('md5').update(target).digest('hex').slice(0, 8)}.png`;
  await QRCode.toFile(path.join(QR_DIR, filename), target, { width: 512, margin: 2 });
  ok(res, { url: target, qrcode: `/qrcodes/${filename}` });
});

// ---------- 页面与错误处理 ----------
app.get('/healthz', (req, res) => res.json({ success: true, status: 'ok', uptime: process.uptime() }));

const sendIndex = (req, res) => res.sendFile(path.join(STATIC_DIR, 'index.html'));
app.get('/admin', sendIndex);
app.get('/', sendIndex);
app.get(/^\/(?!api\/).*/, sendIndex);

app.use((req, res) => fail(res, 404, 'NOT_FOUND', '接口不存在'));

app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    const status = err.code === 'NOT_FOUND' ? 404
      : err.code === 'UNAUTHORIZED' ? 401
        : err.code === 'FORBIDDEN' ? 403
          : err.code === 'CONFLICT' ? 409
            : err.code === 'RATE_LIMITED' ? 429
              : 400;
    const extra = {};
    if (err.stock !== undefined) extra.stock = err.stock;
    if (err.existingId !== undefined) extra.existingId = err.existingId;
    if (err.existingStock !== undefined) extra.existingStock = err.existingStock;
    return fail(res, status, err.code, err.message, extra);
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? '图片不能超过 20 MB' : err.message;
    return fail(res, 400, 'UPLOAD_FAILED', message);
  }
  console.error('[error]', err);
  fail(res, 500, 'INTERNAL_ERROR', '服务器内部错误');
});

app.listen(PORT, () => {
  console.log(`\n🚀 物资管理系统已启动`);
  console.log(`\n  前台（免登录）: http://localhost:${PORT}/`);
  console.log(`  管理后台:       http://localhost:${PORT}/admin\n`);
});
