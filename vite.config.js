import { defineConfig } from 'vite';
import { resolve } from 'path';
import { generate } from './scripts/generate-templates.mjs';

// 构建前把 templates.mjs 里的模板预编译成 render 函数：
// 运行时不再需要 Vue 模板编译器（它用 new Function，会被 CSP 的 script-src 'self' 拦掉）。
function precompileTemplates() {
  return {
    name: 'wuzi-precompile-templates',
    buildStart() {
      generate();
    }
  };
}

export default defineConfig({
  root: 'frontend',
  base: '/',
  publicDir: resolve(__dirname, 'public'),
  plugins: [precompileTemplates()],
  // vue.esm-bundler.js 要求构建时替换这些编译期标志；
  // 不替换会在浏览器里抛 "__VUE_OPTIONS_API__ is not defined" 并导致整页白屏。
  define: {
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
  },
  build: {
    outDir: resolve(__dirname, 'frontend/dist'),
    emptyOutDir: true
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3100',
      '/uploads': 'http://localhost:3100',
      '/qrcodes': 'http://localhost:3100'
    }
  },
  resolve: {
    alias: {
      // 只用运行时版本：不含模板编译器，从根上杜绝 new Function / unsafe-eval
      vue: 'vue/dist/vue.runtime.esm-bundler.js'
    }
  }
});
