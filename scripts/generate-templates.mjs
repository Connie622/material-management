// 把 templates.js 里的页面模板在构建时预编译成 render 函数。
// 这样运行时不需要 Vue 的模板编译器（它依赖 new Function，会被 CSP 的 script-src 'self' 拦掉）。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { toastTemplate } from '../frontend/src/templates/toast.mjs';
import { publicTemplate } from '../frontend/src/templates/public.mjs';
import { adminTemplate } from '../frontend/src/templates/admin.mjs';

const require = createRequire(import.meta.url);
const { compile } = require('@vue/compiler-dom');

const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'src');

const TARGETS = [
  { file: 'render-toast.gen.js', fn: 'renderToast', template: toastTemplate, source: 'toastTemplate' },
  { file: 'render-public.gen.js', fn: 'renderPublicApp', template: publicTemplate, source: 'publicTemplate' },
  { file: 'render-admin.gen.js', fn: 'renderAdminApp', template: adminTemplate, source: 'adminTemplate' }
];

export function generate({ log = false } = {}) {
  const written = [];
  for (const target of TARGETS) {
    const problems = [];
    const result = compile(target.template, {
      mode: 'module',
      prefixIdentifiers: true,
      onError: error => problems.push(error),
      onWarn: error => problems.push(error)
    });
    if (problems.length) {
      throw new Error(`模板编译失败（${target.source}）：${problems.map(item => item.message).join('; ')}`);
    }
    // 编译器固定导出名为 render，这里改成每个组件独立的名字
    const code = result.code.replace('export function render(', `export function ${target.fn}(`);
    if (!code.includes(`export function ${target.fn}(`)) {
      throw new Error(`未能重命名渲染函数：${target.source}`);
    }
    const content = `// 由 scripts/generate-templates.mjs 从 templates.js 的 ${target.source} 自动生成，请勿手改。\n${code}\n`;
    const outPath = path.join(srcDir, target.file);
    const previous = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '';
    if (previous !== content) {
      fs.writeFileSync(outPath, content, 'utf8');
      written.push(target.file);
    }
  }
  if (log) console.log(written.length ? `已生成：${written.join(', ')}` : '渲染函数已是最新');
  return written;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  generate({ log: true });
}
