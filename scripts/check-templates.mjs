// 模板静态校验：把 templates.mjs 里的每个模板交给 Vue 编译器编译，
// 在不启动浏览器的情况下先发现模板语法错误。
// 用法：node scripts/check-templates.mjs
import path from 'node:path';
import { createRequire } from 'node:module';
import { toastTemplate } from '../frontend/src/templates/toast.mjs';
import { publicTemplate } from '../frontend/src/templates/public.mjs';
import { adminTemplate } from '../frontend/src/templates/admin.mjs';

const require = createRequire(import.meta.url);
const { compile } = require('@vue/compiler-dom');

const TARGETS = [
  { name: 'toastTemplate', source: toastTemplate },
  { name: 'publicTemplate', source: publicTemplate },
  { name: 'adminTemplate', source: adminTemplate }
];

let failures = 0;
for (const target of TARGETS) {
  try {
    const result = compile(target.source, { mode: 'module', prefixIdentifiers: true });
    if (!result.code || !result.code.includes('export function render(')) {
      throw new Error('编译结果异常');
    }
    console.log(`  PASS  ${target.name}（模板 ${target.source.length} 字符 → 渲染函数 ${result.code.length} 字符）`);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL  ${target.name}: ${error.message}`);
  }
}

console.log(`\n共校验 ${TARGETS.length} 个模板，失败 ${failures} 个\n`);
process.exit(failures === 0 ? 0 : 1);
