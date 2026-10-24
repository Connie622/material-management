-- 物资管理系统 SQLite schema
-- 设计原则：库存（materials.stock）是结果，流水（stock_txns）是事实。
-- 任何库存变动都必须与流水在同一个事务内完成，且只增不改（撤销用标记，不删行）。
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  spec TEXT NOT NULL DEFAULT '',
  category_id TEXT NOT NULL DEFAULT 'cat-other',
  unit TEXT NOT NULL DEFAULT '个',
  -- 是否需要归还：0=消耗品（取出即减），1=可归还器材（借出可还）
  needs_return INTEGER NOT NULL DEFAULT 0 CHECK (needs_return IN (0, 1)),
  -- 在库数量（最小单位，整数）
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  -- 低库存预警阈值
  safety_stock INTEGER NOT NULL DEFAULT 0,
  location TEXT NOT NULL DEFAULT '',
  image TEXT,
  image_thumb TEXT,
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 出入库流水：只增不改。撤销 = revoked 置 1 并回滚库存，行永久保留。
CREATE TABLE IF NOT EXISTS stock_txns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id TEXT NOT NULL,
  material_name TEXT NOT NULL,
  material_spec TEXT NOT NULL DEFAULT '',
  material_unit TEXT NOT NULL DEFAULT '',
  -- in=入库 out=取出(消耗) borrow=借出 return=归还 adjust=管理员校准
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'borrow', 'return', 'adjust')),
  qty INTEGER NOT NULL CHECK (qty > 0),
  before_stock INTEGER NOT NULL,
  after_stock INTEGER NOT NULL,
  operator TEXT NOT NULL DEFAULT '',
  operator_phone TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  ref_type TEXT NOT NULL DEFAULT '',
  ref_id TEXT NOT NULL DEFAULT '',
  revoked INTEGER NOT NULL DEFAULT 0 CHECK (revoked IN (0, 1)),
  revoked_by TEXT NOT NULL DEFAULT '',
  revoked_reason TEXT NOT NULL DEFAULT '',
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

-- 借用单（器材类）：支持部分归还
CREATE TABLE IF NOT EXISTS borrows (
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL,
  material_name TEXT NOT NULL,
  material_unit TEXT NOT NULL DEFAULT '',
  qty INTEGER NOT NULL CHECK (qty > 0),
  returned_qty INTEGER NOT NULL DEFAULT 0,
  borrower TEXT NOT NULL,
  borrower_phone TEXT NOT NULL DEFAULT '',
  due_at TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partial', 'closed', 'lost')),
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT '',
  target_id TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category_id, active);
CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);
CREATE INDEX IF NOT EXISTS idx_txns_material ON stock_txns(material_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_txns_created ON stock_txns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_txns_operator ON stock_txns(operator);
CREATE INDEX IF NOT EXISTS idx_borrows_status ON borrows(status, created_at);
CREATE INDEX IF NOT EXISTS idx_borrows_borrower ON borrows(borrower);
