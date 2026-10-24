// 由 scripts/generate-templates.mjs 从 templates.js 的 toastTemplate 自动生成，请勿手改。
import { renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass } from "vue"

export function renderToast(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", { class: "toast-stack" }, [
    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.toasts, (t) => {
      return (_openBlock(), _createElementBlock("div", {
        key: t.id,
        class: _normalizeClass(["toast", t.kind])
      }, _toDisplayString(t.message), 3))
    }), 128))
  ]))
}
