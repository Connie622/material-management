// 演示数据初始化：写入 4 种常用物资（幂等：同名物资已存在则只做入库，不重复建档）
// 用法：node scripts/seed.mjs [baseUrl]
const BASE = process.argv[2] || 'http://127.0.0.1:3100';

const DEMO = [
  { name: '打印纸 A4 70g', spec: '500张/包', categoryId: 'cat-office', unit: '包', location: 'A柜 2层', safetyStock: 20, stock: 100 },
  { name: '一次性手套', spec: 'M 码', categoryId: 'cat-lab', unit: '只', location: 'A柜 1层', safetyStock: 100, stock: 500 },
  { name: '记号笔', spec: '黑色', categoryId: 'cat-office', unit: '支', location: 'B柜 抽屉', safetyStock: 20, stock: 30 },
  { name: '万用表', spec: 'DT9205A', categoryId: 'cat-instrument', unit: '台', location: 'C柜 1层', safetyStock: 2, stock: 5, needsReturn: true }
];

async function req(pathname, options = {}) {
  const init = { method: options.method || 'GET', headers: { ...(options.headers || {}) } };
  if (options.body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }
  const response = await fetch(`${BASE}${pathname}`, init);
  return response.json();
}

const existing = (await req('/api/public/materials')).data || [];
const existingNames = new Set(existing.map(item => item.name));

let created = 0;
let restocked = 0;
for (const item of DEMO) {
  if (existingNames.has(item.name)) {
    const target = existing.find(entry => entry.name === item.name);
    await req('/api/public/stock-in', {
      method: 'POST',
      body: { materialId: target.id, qty: item.stock, operator: '初始化', note: '演示数据补货' }
    });
    restocked += 1;
    continue;
  }
  const result = await req('/api/public/stock-in', {
    method: 'POST',
    body: {
      qty: item.stock,
      operator: '初始化',
      note: '演示数据',
      newMaterial: {
        name: item.name,
        spec: item.spec,
        categoryId: item.categoryId,
        unit: item.unit,
        needsReturn: Boolean(item.needsReturn),
        location: item.location,
        safetyStock: item.safetyStock
      }
    }
  });
  if (result.success) created += 1;
  else console.log(`  写入失败：${item.name} → ${result.message}`);
}

console.log(`演示数据完成：新建 ${created} 种，补货 ${restocked} 种`);
