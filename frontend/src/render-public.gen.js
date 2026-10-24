// 由 scripts/generate-templates.mjs 从 templates.js 的 publicTemplate 自动生成，请勿手改。
import { createElementVNode as _createElementVNode, vModelText as _vModelText, withKeys as _withKeys, withDirectives as _withDirectives, toDisplayString as _toDisplayString, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, createTextVNode as _createTextVNode, normalizeClass as _normalizeClass, renderList as _renderList, Fragment as _Fragment, vModelSelect as _vModelSelect, vModelCheckbox as _vModelCheckbox, withModifiers as _withModifiers, resolveComponent as _resolveComponent, createVNode as _createVNode } from "vue"

export function renderPublicApp(_ctx, _cache) {
  const _component_ToastStack = _resolveComponent("ToastStack")

  return (_openBlock(), _createElementBlock("div", null, [
    (_ctx.isGateBlocked)
      ? (_openBlock(), _createElementBlock("div", {
          key: 0,
          class: "center-page"
        }, [
          _createElementVNode("div", { class: "login-card" }, [
            _createElementVNode("img", {
              class: "login-emblem",
              src: "/assets/jnu-emblem.png",
              alt: "暨南大学"
            }),
            _createElementVNode("div", { class: "login-title" }, "需要访问口令"),
            _createElementVNode("div", { class: "login-sub" }, "请向管理员索取口令后进入物资台账"),
            _createElementVNode("div", { class: "field" }, [
              _withDirectives(_createElementVNode("input", {
                class: "input",
                "onUpdate:modelValue": $event => ((_ctx.gateCode) = $event),
                placeholder: "请输入口令",
                onKeyup: _withKeys(_ctx.submitGate, ["enter"])
              }, null, 40, ["onUpdate:modelValue", "onKeyup"]), [
                [_vModelText, _ctx.gateCode]
              ]),
              (_ctx.gateError)
                ? (_openBlock(), _createElementBlock("div", {
                    key: 0,
                    class: "hint hint-error"
                  }, _toDisplayString(_ctx.gateError), 1))
                : _createCommentVNode("", true)
            ]),
            _createElementVNode("button", {
              class: "btn btn-block mt-16",
              onClick: _ctx.submitGate
            }, "进入", 8, ["onClick"])
          ])
        ]))
      : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
          _createElementVNode("header", { class: "banner" }, [
            _createElementVNode("div", { class: "banner-inner" }, [
              _createElementVNode("div", { class: "banner-logo" }, [
                _createElementVNode("img", {
                  src: "/assets/jnu-emblem.png",
                  alt: "暨南大学网络空间安全学院"
                })
              ]),
              _createElementVNode("div", { class: "banner-text" }, [
                _createElementVNode("h1", { class: "banner-title" }, _toDisplayString(_ctx.config && _ctx.config.siteTitle ? _ctx.config.siteTitle : '物资台账'), 1),
                _createElementVNode("p", { class: "banner-sub" }, "暨南大学网络空间安全学院")
              ]),
              _createElementVNode("div", { class: "spacer" }),
              _createElementVNode("button", {
                class: "btn-glass",
                onClick: $event => (_ctx.openDialog('in'))
              }, [
                _createElementVNode("span", { class: "btn-glass-plus" }, "＋"),
                _createTextVNode(" 入库 ")
              ], 8, ["onClick"])
            ])
          ]),
          _createElementVNode("main", { class: "page" }, [
            _createElementVNode("div", { class: "panel seg-track" }, [
              _createElementVNode("button", {
                class: _normalizeClass(["seg", { active: _ctx.tab === 'materials' }]),
                onClick: $event => {_ctx.tab = 'materials'; _ctx.loadData()}
              }, "物资清单", 10, ["onClick"]),
              _createElementVNode("button", {
                class: _normalizeClass(["seg", { active: _ctx.tab === 'borrows' }]),
                onClick: $event => {_ctx.tab = 'borrows'; _ctx.loadData()}
              }, [
                _createTextVNode(" 未归还"),
                (_ctx.openBorrowCount)
                  ? (_openBlock(), _createElementBlock("span", {
                      key: 0,
                      class: "seg-badge"
                    }, _toDisplayString(_ctx.openBorrowCount), 1))
                  : _createCommentVNode("", true)
              ], 10, ["onClick"])
            ]),
            _createElementVNode("div", { class: "panel search-field" }, [
              _createElementVNode("span", { class: "search-icon" }, "🔍"),
              _withDirectives(_createElementVNode("input", {
                "onUpdate:modelValue": $event => ((_ctx.q) = $event),
                placeholder: _ctx.tab === 'materials' ? '搜索物资名称 / 规格 / 存放位置…' : '搜索借用人 / 电话 / 物资…',
                onKeyup: _withKeys(_ctx.loadData, ["enter"])
              }, null, 40, ["onUpdate:modelValue", "placeholder", "onKeyup"]), [
                [_vModelText, _ctx.q]
              ]),
              (_ctx.q)
                ? (_openBlock(), _createElementBlock("button", {
                    key: 0,
                    class: "search-clear",
                    onClick: $event => {_ctx.q = ''; _ctx.loadData()}
                  }, "清空", 8, ["onClick"]))
                : _createCommentVNode("", true)
            ]),
            (_ctx.tab === 'materials')
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "chips"
                }, [
                  _createElementVNode("button", {
                    class: _normalizeClass(["chip", { active: _ctx.activeCategory === '' }]),
                    onClick: $event => {_ctx.activeCategory = ''; _ctx.loadData()}
                  }, "全部", 10, ["onClick"]),
                  (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.categories, (c) => {
                    return (_openBlock(), _createElementBlock("button", {
                      key: c.id,
                      class: _normalizeClass(["chip", { active: _ctx.activeCategory === c.id }]),
                      onClick: $event => {_ctx.activeCategory = c.id; _ctx.loadData()}
                    }, _toDisplayString(c.name), 11, ["onClick"]))
                  }), 128))
                ]))
              : _createCommentVNode("", true),
            _createElementVNode("div", { class: "section-head" }, [
              _createElementVNode("div", { class: "section-title-group" }, [
                _createElementVNode("span", { class: "section-bar" }),
                _createElementVNode("div", null, [
                  _createElementVNode("h2", { class: "section-title" }, _toDisplayString(_ctx.tab === 'materials' ? '在库物资' : '未归还清单'), 1),
                  _createElementVNode("p", { class: "section-sub" }, _toDisplayString(_ctx.tab === 'materials' ? '显示当前在库的物资与剩余数量，消耗品可直接取出，器材需借出并归还' : '借出后的器材在此归还，支持部分归还'), 1)
                ])
              ]),
              _createElementVNode("span", { class: "section-count" }, _toDisplayString(_ctx.tab === 'materials' ? _ctx.materials.length + ' 种' : _ctx.borrows.length + ' 条'), 1)
            ]),
            (_ctx.loading)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 1,
                  class: "panel loading-block"
                }, [
                  _createElementVNode("div", { class: "spin" }),
                  _createTextVNode("加载中… ")
                ]))
              : (_ctx.tab === 'materials')
                ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                    (!_ctx.materials.length)
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 0,
                          class: "empty-plain"
                        }, [
                          _createElementVNode("div", { class: "empty-plain-title" }, "暂时没有在库物资"),
                          _createElementVNode("p", { class: "empty-plain-sub" }, "物资入库后会显示在这里，可直接取出或借出。")
                        ]))
                      : (_openBlock(), _createElementBlock("div", {
                          key: 1,
                          class: "panel"
                        }, [
                          _createElementVNode("ul", { class: "rows" }, [
                            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.materials, (m) => {
                              return (_openBlock(), _createElementBlock("li", {
                                key: m.id,
                                class: _normalizeClass(["row", { 'row-idle': m.stock === 0 }])
                              }, [
                                _createElementVNode("div", { class: "row-thumb" }, [
                                  (m.imageThumb)
                                    ? (_openBlock(), _createElementBlock("img", {
                                        key: 0,
                                        src: m.imageThumb,
                                        alt: m.name
                                      }, null, 8, ["src", "alt"]))
                                    : (_openBlock(), _createElementBlock("span", { key: 1 }, _toDisplayString(m.name.slice(0, 1)), 1))
                                ]),
                                _createElementVNode("div", { class: "row-main" }, [
                                  _createElementVNode("div", { class: "row-title" }, [
                                    _createElementVNode("span", { class: "row-name" }, _toDisplayString(m.name), 1),
                                    (m.spec)
                                      ? (_openBlock(), _createElementBlock("span", {
                                          key: 0,
                                          class: "tag tag-muted"
                                        }, _toDisplayString(m.spec), 1))
                                      : _createCommentVNode("", true),
                                    (m.needsReturn)
                                      ? (_openBlock(), _createElementBlock("span", {
                                          key: 1,
                                          class: "tag tag-brand"
                                        }, "可归还"))
                                      : _createCommentVNode("", true),
                                    (m.lowStock)
                                      ? (_openBlock(), _createElementBlock("span", {
                                          key: 2,
                                          class: "tag tag-warn"
                                        }, "库存偏低"))
                                      : _createCommentVNode("", true),
                                    (m.stock === 0)
                                      ? (_openBlock(), _createElementBlock("span", {
                                          key: 3,
                                          class: "tag tag-muted"
                                        }, "已无库存"))
                                      : _createCommentVNode("", true)
                                  ]),
                                  _createElementVNode("div", { class: "row-meta" }, [
                                    _createTextVNode(_toDisplayString(m.categoryName), 1),
                                    (m.location)
                                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                                          _createTextVNode(" · " + _toDisplayString(m.location), 1)
                                        ], 64))
                                      : _createCommentVNode("", true),
                                    (m.needsReturn && m.borrowedOut > 0)
                                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                                          _createTextVNode(" · 借出 " + _toDisplayString(m.borrowedOut) + _toDisplayString(m.unit), 1)
                                        ], 64))
                                      : _createCommentVNode("", true)
                                  ])
                                ]),
                                _createElementVNode("div", { class: "row-stock" }, [
                                  _createElementVNode("span", {
                                    class: _normalizeClass(["stock-num", m.stock === 0 ? 'stock-zero' : (m.lowStock ? 'stock-low' : 'stock-ok')])
                                  }, _toDisplayString(m.stock), 3),
                                  _createElementVNode("span", { class: "stock-unit" }, _toDisplayString(m.unit), 1)
                                ]),
                                _createElementVNode("div", { class: "row-actions" }, [
                                  (!m.needsReturn)
                                    ? (_openBlock(), _createElementBlock("button", {
                                        key: 0,
                                        class: "btn btn-sm",
                                        disabled: m.stock === 0,
                                        onClick: $event => (_ctx.openDialog('out', { material: m }))
                                      }, "取出", 8, ["disabled", "onClick"]))
                                    : (_openBlock(), _createElementBlock("button", {
                                        key: 1,
                                        class: "btn btn-sm",
                                        disabled: m.stock === 0,
                                        onClick: $event => (_ctx.openDialog('borrow', { material: m }))
                                      }, "借出", 8, ["disabled", "onClick"]))
                                ])
                              ], 2))
                            }), 128))
                          ])
                        ])),
                    _createElementVNode("div", { class: "other-block" }, [
                      _createElementVNode("div", null, [
                        _createElementVNode("div", { class: "other-block-label" }, "没找到要取的物资？"),
                        _createElementVNode("h3", { class: "other-block-title" }, "入库其他物资"),
                        _createElementVNode("p", { class: "other-block-desc" }, "列表里还没有的物资，可以直接填写名称与数量登记入库。")
                      ]),
                      _createElementVNode("button", {
                        class: "other-block-btn",
                        onClick: _ctx.openNewMaterial
                      }, "填写物资名称", 8, ["onClick"])
                    ])
                  ], 64))
                : (_openBlock(), _createElementBlock(_Fragment, { key: 3 }, [
                    (!_ctx.borrows.length)
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 0,
                          class: "empty-plain"
                        }, [
                          _createElementVNode("div", { class: "empty-plain-title" }, "暂时没有未归还的器材"),
                          _createElementVNode("p", { class: "empty-plain-sub" }, "器材借出后会出现在这里，可在此归还。")
                        ]))
                      : (_openBlock(), _createElementBlock("div", {
                          key: 1,
                          class: "panel"
                        }, [
                          _createElementVNode("ul", { class: "rows" }, [
                            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.borrows, (b) => {
                              return (_openBlock(), _createElementBlock("li", {
                                key: b.id,
                                class: "row"
                              }, [
                                _createElementVNode("div", { class: "row-thumb row-thumb-plain" }, _toDisplayString(b.borrower.slice(0, 1)), 1),
                                _createElementVNode("div", { class: "row-main" }, [
                                  _createElementVNode("div", { class: "row-title" }, [
                                    _createElementVNode("span", { class: "row-name" }, _toDisplayString(b.borrower), 1),
                                    _createElementVNode("span", { class: "tag tag-muted" }, _toDisplayString(b.materialName), 1),
                                    (_ctx.isOverdue(b))
                                      ? (_openBlock(), _createElementBlock("span", {
                                          key: 0,
                                          class: "tag tag-danger"
                                        }, "已逾期"))
                                      : _createCommentVNode("", true),
                                    (b.status === 'lost')
                                      ? (_openBlock(), _createElementBlock("span", {
                                          key: 1,
                                          class: "tag tag-danger"
                                        }, "已标记丢失"))
                                      : (b.status === 'partial')
                                        ? (_openBlock(), _createElementBlock("span", {
                                            key: 2,
                                            class: "tag tag-warn"
                                          }, "部分归还"))
                                        : _createCommentVNode("", true)
                                  ]),
                                  _createElementVNode("div", { class: "row-meta" }, [
                                    _createTextVNode(_toDisplayString(_ctx.fmtTime(b.createdAt)) + " 借出 · 借 " + _toDisplayString(b.qty) + _toDisplayString(b.materialUnit) + " · 已还 " + _toDisplayString(b.returnedQty), 1),
                                    (b.borrowerPhone)
                                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                                          _createTextVNode(" · " + _toDisplayString(b.borrowerPhone), 1)
                                        ], 64))
                                      : _createCommentVNode("", true),
                                    (b.dueAt)
                                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                                          _createTextVNode(" · 应还 " + _toDisplayString(_ctx.fmtDate(b.dueAt)), 1)
                                        ], 64))
                                      : _createCommentVNode("", true)
                                  ])
                                ]),
                                _createElementVNode("div", { class: "row-stock" }, [
                                  _createElementVNode("span", { class: "stock-num stock-low" }, _toDisplayString(b.remainingQty), 1),
                                  _createElementVNode("span", { class: "stock-unit" }, "未还")
                                ]),
                                _createElementVNode("div", { class: "row-actions" }, [
                                  _createElementVNode("button", {
                                    class: "btn btn-sm",
                                    disabled: b.status === 'lost',
                                    onClick: $event => (_ctx.openDialog('return', { borrow: b, material: _ctx.materialForReturn(b) }))
                                  }, "归还", 8, ["disabled", "onClick"])
                                ])
                              ]))
                            }), 128))
                          ])
                        ]))
                  ], 64)),
            _createElementVNode("footer", { class: "site-footer" }, [
              _createElementVNode("span", { class: "site-footer-line" }, "暨南大学网络空间安全学院 · 物资管理系统"),
              (_ctx.footerQuote)
                ? (_openBlock(), _createElementBlock("span", {
                    key: 0,
                    class: "site-footer-line site-footer-quote"
                  }, _toDisplayString(_ctx.footerQuote), 1))
                : _createCommentVNode("", true),
              _createElementVNode("span", { class: "site-footer-line site-footer-meta" }, [
                (_ctx.icp)
                  ? (_openBlock(), _createElementBlock("span", { key: 0 }, _toDisplayString(_ctx.icp), 1))
                  : _createCommentVNode("", true),
                (_ctx.icp && _ctx.uptimeText)
                  ? (_openBlock(), _createElementBlock("span", {
                      key: 1,
                      class: "site-footer-sep"
                    }, "·"))
                  : _createCommentVNode("", true),
                (_ctx.uptimeText)
                  ? (_openBlock(), _createElementBlock("span", { key: 2 }, "本站已运行 " + _toDisplayString(_ctx.uptimeText), 1))
                  : _createCommentVNode("", true)
              ])
            ])
          ]),
          (_ctx.dialog.open)
            ? (_openBlock(), _createElementBlock("div", {
                key: 0,
                class: "mask",
                onClick: _withModifiers(_ctx.closeDialog, ["self"])
              }, [
                _createElementVNode("div", { class: "sheet" }, [
                  _createElementVNode("button", {
                    class: "close-x",
                    onClick: _ctx.closeDialog
                  }, "✕", 8, ["onClick"]),
                  _createElementVNode("div", { class: "sheet-title" }, [
                    (_ctx.dialog.kind === 'in')
                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                          _createTextVNode("入库登记")
                        ], 64))
                      : (_ctx.dialog.kind === 'out')
                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                            _createTextVNode("取出：" + _toDisplayString(_ctx.dialog.material ? _ctx.dialog.material.name : ''), 1)
                          ], 64))
                        : (_ctx.dialog.kind === 'borrow')
                          ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                              _createTextVNode("借出：" + _toDisplayString(_ctx.dialog.material ? _ctx.dialog.material.name : ''), 1)
                            ], 64))
                          : (_openBlock(), _createElementBlock(_Fragment, { key: 3 }, [
                              _createTextVNode("归还：" + _toDisplayString(_ctx.dialog.borrow ? _ctx.dialog.borrow.materialName : ''), 1)
                            ], 64))
                  ]),
                  (_ctx.dialog.kind === 'in' && _ctx.dialog.material)
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 0,
                        class: "sheet-sub"
                      }, "当前库存 " + _toDisplayString(_ctx.dialog.material.stock) + _toDisplayString(_ctx.dialog.material.unit), 1))
                    : (_ctx.dialog.kind === 'out' || _ctx.dialog.kind === 'borrow')
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 1,
                          class: "sheet-sub"
                        }, "当前在库 " + _toDisplayString(_ctx.dialog.material ? _ctx.dialog.material.stock : 0) + _toDisplayString(_ctx.dialog.material ? _ctx.dialog.material.unit : ''), 1))
                      : (_ctx.dialog.kind === 'return')
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 2,
                            class: "sheet-sub"
                          }, "该单未还 " + _toDisplayString(_ctx.dialog.borrow ? _ctx.dialog.borrow.remainingQty : 0) + _toDisplayString(_ctx.dialog.borrow ? _ctx.dialog.borrow.materialUnit : ''), 1))
                        : _createCommentVNode("", true),
                  _createElementVNode("div", { class: "sheet-body" }, [
                    (_ctx.dialog.kind === 'in')
                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                          _createElementVNode("div", { class: "inline" }, [
                            _createElementVNode("button", {
                              class: _normalizeClass(["chip", { active: !_ctx.form.createMode }]),
                              onClick: $event => (_ctx.form.createMode = false)
                            }, "已有物资", 10, ["onClick"]),
                            _createElementVNode("button", {
                              class: _normalizeClass(["chip", { active: _ctx.form.createMode }]),
                              onClick: $event => (_ctx.form.createMode = true)
                            }, "新建物资", 10, ["onClick"])
                          ]),
                          (!_ctx.form.createMode)
                            ? (_openBlock(), _createElementBlock("div", {
                                key: 0,
                                class: "field"
                              }, [
                                _createElementVNode("label", null, "选择物资"),
                                _createElementVNode("select", {
                                  class: "select",
                                  value: _ctx.dialog.material ? _ctx.dialog.material.id : '',
                                  onChange: _ctx.onSelectMaterial
                                }, [
                                  _createElementVNode("option", { value: "" }, "请选择…"),
                                  (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.materials, (m) => {
                                    return (_openBlock(), _createElementBlock("option", {
                                      key: m.id,
                                      value: m.id
                                    }, [
                                      _createTextVNode(_toDisplayString(m.name), 1),
                                      (m.spec)
                                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                                            _createTextVNode("（" + _toDisplayString(m.spec) + "）", 1)
                                          ], 64))
                                        : _createCommentVNode("", true),
                                      _createTextVNode(" · 现有 " + _toDisplayString(m.stock) + _toDisplayString(m.unit), 1)
                                    ], 8, ["value"]))
                                  }), 128))
                                ], 40, ["value", "onChange"])
                              ]))
                            : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                                _createElementVNode("div", { class: "row-2" }, [
                                  _createElementVNode("div", { class: "field" }, [
                                    _createElementVNode("label", null, "物资名称 *"),
                                    _withDirectives(_createElementVNode("input", {
                                      class: "input",
                                      "onUpdate:modelValue": $event => ((_ctx.form.draft.name) = $event),
                                      placeholder: "如：打印纸 A4"
                                    }, null, 8, ["onUpdate:modelValue"]), [
                                      [_vModelText, _ctx.form.draft.name]
                                    ])
                                  ]),
                                  _createElementVNode("div", { class: "field" }, [
                                    _createElementVNode("label", null, "规格型号"),
                                    _withDirectives(_createElementVNode("input", {
                                      class: "input",
                                      "onUpdate:modelValue": $event => ((_ctx.form.draft.spec) = $event),
                                      placeholder: "如：70g / 500 张"
                                    }, null, 8, ["onUpdate:modelValue"]), [
                                      [_vModelText, _ctx.form.draft.spec]
                                    ])
                                  ])
                                ]),
                                _createElementVNode("div", { class: "row-2" }, [
                                  _createElementVNode("div", { class: "field" }, [
                                    _createElementVNode("label", null, "分类"),
                                    _withDirectives(_createElementVNode("select", {
                                      class: "select",
                                      "onUpdate:modelValue": $event => ((_ctx.form.draft.categoryId) = $event)
                                    }, [
                                      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.categories, (c) => {
                                        return (_openBlock(), _createElementBlock("option", {
                                          key: c.id,
                                          value: c.id
                                        }, _toDisplayString(c.name), 9, ["value"]))
                                      }), 128))
                                    ], 8, ["onUpdate:modelValue"]), [
                                      [_vModelSelect, _ctx.form.draft.categoryId]
                                    ])
                                  ]),
                                  _createElementVNode("div", { class: "field" }, [
                                    _createElementVNode("label", null, "计量单位"),
                                    _withDirectives(_createElementVNode("input", {
                                      class: "input",
                                      "onUpdate:modelValue": $event => ((_ctx.form.draft.unit) = $event),
                                      placeholder: "个 / 包 / 支"
                                    }, null, 8, ["onUpdate:modelValue"]), [
                                      [_vModelText, _ctx.form.draft.unit]
                                    ])
                                  ])
                                ]),
                                _createElementVNode("div", { class: "row-2" }, [
                                  _createElementVNode("div", { class: "field" }, [
                                    _createElementVNode("label", null, "存放位置"),
                                    _withDirectives(_createElementVNode("input", {
                                      class: "input",
                                      "onUpdate:modelValue": $event => ((_ctx.form.draft.location) = $event),
                                      placeholder: "如：A 柜 2 层"
                                    }, null, 8, ["onUpdate:modelValue"]), [
                                      [_vModelText, _ctx.form.draft.location]
                                    ])
                                  ]),
                                  _createElementVNode("div", { class: "field" }, [
                                    _createElementVNode("label", null, "低库存预警值"),
                                    _withDirectives(_createElementVNode("input", {
                                      class: "input",
                                      type: "number",
                                      min: "0",
                                      "onUpdate:modelValue": $event => ((_ctx.form.draft.safetyStock) = $event)
                                    }, null, 8, ["onUpdate:modelValue"]), [
                                      [
                                        _vModelText,
                                        _ctx.form.draft.safetyStock,
                                        void 0,
                                        { number: true }
                                      ]
                                    ])
                                  ])
                                ]),
                                _createElementVNode("label", { class: "switch" }, [
                                  _withDirectives(_createElementVNode("input", {
                                    type: "checkbox",
                                    "onUpdate:modelValue": $event => ((_ctx.form.draft.needsReturn) = $event)
                                  }, null, 8, ["onUpdate:modelValue"]), [
                                    [_vModelCheckbox, _ctx.form.draft.needsReturn]
                                  ]),
                                  _createElementVNode("span", { class: "track" }),
                                  _createElementVNode("span", { class: "switch-text" }, "此物资需要归还（器材类）")
                                ])
                              ], 64))
                        ], 64))
                      : _createCommentVNode("", true),
                    _createElementVNode("div", { class: "field" }, [
                      _createElementVNode("label", null, "数量（" + _toDisplayString(_ctx.unitOf || '单位') + "）", 1),
                      _createElementVNode("div", { class: "stepper" }, [
                        _createElementVNode("button", {
                          type: "button",
                          onClick: $event => (_ctx.step(-1))
                        }, "−", 8, ["onClick"]),
                        _withDirectives(_createElementVNode("input", {
                          type: "number",
                          min: "1",
                          max: _ctx.maxQty,
                          "onUpdate:modelValue": $event => ((_ctx.form.qty) = $event)
                        }, null, 8, ["max", "onUpdate:modelValue"]), [
                          [
                            _vModelText,
                            _ctx.form.qty,
                            void 0,
                            { number: true }
                          ]
                        ]),
                        _createElementVNode("button", {
                          type: "button",
                          onClick: $event => (_ctx.step(1))
                        }, "＋", 8, ["onClick"])
                      ]),
                      _createElementVNode("div", { class: "quick" }, [
                        _createElementVNode("button", {
                          type: "button",
                          onClick: $event => (_ctx.setQty(1))
                        }, "1", 8, ["onClick"]),
                        _createElementVNode("button", {
                          type: "button",
                          onClick: $event => (_ctx.setQty(2))
                        }, "2", 8, ["onClick"]),
                        _createElementVNode("button", {
                          type: "button",
                          onClick: $event => (_ctx.setQty(5))
                        }, "5", 8, ["onClick"]),
                        _createElementVNode("button", {
                          type: "button",
                          onClick: $event => (_ctx.setQty(10))
                        }, "10", 8, ["onClick"])
                      ])
                    ]),
                    _createElementVNode("div", {
                      class: _normalizeClass(["preview", { bad: _ctx.qtyInvalid }])
                    }, [
                      (_ctx.dialog.kind === 'in')
                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                            _createTextVNode("入库后库存：" + _toDisplayString(_ctx.afterStock) + _toDisplayString(_ctx.unitOf), 1)
                          ], 64))
                        : (_ctx.dialog.kind === 'return')
                          ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                              _createTextVNode("归还后在库：" + _toDisplayString(_ctx.afterStock) + _toDisplayString(_ctx.unitOf) + "，该单剩余：" + _toDisplayString(Math.max(0, (_ctx.dialog.borrow ? _ctx.dialog.borrow.remainingQty : 0) - (Number(_ctx.form.qty) || 0))) + _toDisplayString(_ctx.unitOf), 1)
                            ], 64))
                          : (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                              _createTextVNode(_toDisplayString(_ctx.qtyInvalid ? '数量超出范围' : '操作后剩余：' + _ctx.afterStock + _ctx.unitOf), 1)
                            ], 64))
                    ], 2),
                    _createElementVNode("div", { class: "field" }, [
                      _createElementVNode("label", null, "经手人姓名 " + _toDisplayString(_ctx.operatorRequired ? '*' : '（选填）'), 1),
                      _withDirectives(_createElementVNode("input", {
                        class: "input",
                        "onUpdate:modelValue": $event => ((_ctx.form.operator) = $event),
                        placeholder: "请填写你的姓名，用于留痕"
                      }, null, 8, ["onUpdate:modelValue"]), [
                        [_vModelText, _ctx.form.operator]
                      ])
                    ]),
                    (_ctx.dialog.kind === 'borrow')
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 1,
                          class: "field"
                        }, [
                          _createElementVNode("label", null, "预计归还日期（选填）"),
                          _withDirectives(_createElementVNode("input", {
                            class: "input",
                            type: "date",
                            "onUpdate:modelValue": $event => ((_ctx.form.dueAt) = $event)
                          }, null, 8, ["onUpdate:modelValue"]), [
                            [_vModelText, _ctx.form.dueAt]
                          ])
                        ]))
                      : _createCommentVNode("", true),
                    _createElementVNode("div", { class: "field" }, [
                      _createElementVNode("label", null, "备注（选填）"),
                      _withDirectives(_createElementVNode("textarea", {
                        class: "textarea",
                        "onUpdate:modelValue": $event => ((_ctx.form.note) = $event),
                        placeholder: "用途、来源等"
                      }, null, 8, ["onUpdate:modelValue"]), [
                        [_vModelText, _ctx.form.note]
                      ])
                    ])
                  ]),
                  _createElementVNode("div", { class: "sheet-foot" }, [
                    _createElementVNode("button", {
                      class: "btn btn-ghost",
                      onClick: _ctx.closeDialog
                    }, "取消", 8, ["onClick"]),
                    _createElementVNode("button", {
                      class: "btn",
                      disabled: _ctx.busy || _ctx.qtyInvalid,
                      onClick: _ctx.submit
                    }, _toDisplayString(_ctx.busy ? '提交中…' : (_ctx.dialog.kind === 'in' ? '确认入库' : _ctx.dialog.kind === 'out' ? '确认取出' : _ctx.dialog.kind === 'borrow' ? '确认借出' : '确认归还')), 9, ["disabled", "onClick"])
                  ])
                ])
              ], 8, ["onClick"]))
            : _createCommentVNode("", true)
        ], 64)),
    _createVNode(_component_ToastStack, { toasts: _ctx.toasts }, null, 8, ["toasts"])
  ]))
}
