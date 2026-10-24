// toast.mjs：由构建脚本预编译为 render 函数，不要改回组件里的 template 选项。
export const toastTemplate = `
    <div class="toast-stack">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.kind">{{ t.message }}</div>
    </div>
  `;
