// 由 scripts/generate-templates.mjs 从 templates.js 的 adminTemplate 自动生成，请勿手改。
import { createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, vModelText as _vModelText, withDirectives as _withDirectives, withKeys as _withKeys, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass, renderList as _renderList, Fragment as _Fragment, vModelSelect as _vModelSelect, vModelCheckbox as _vModelCheckbox, withModifiers as _withModifiers, resolveComponent as _resolveComponent, createVNode as _createVNode } from "vue"

export function renderAdminApp(_ctx, _cache) {
  const _component_ToastStack = _resolveComponent("ToastStack")

  return (_openBlock(), _createElementBlock("div", null, [
    (_ctx.checking)
      ? (_openBlock(), _createElementBlock("div", {
          key: 0,
          class: "loading"
        }, [
          _createElementVNode("div", { class: "spin" }),
          _createTextVNode("检查登录状态…")
        ]))
      : (!_ctx.authed)
        ? (_openBlock(), _createElementBlock("div", {
            key: 1,
            class: "login-wrap"
          }, [
            _createElementVNode("div", { class: "login-card" }, [
              _createElementVNode("img", {
                class: "login-emblem",
                src: "/assets/jnu-emblem.png",
                alt: "暨南大学"
              }),
              _createElementVNode("div", { class: "login-title" }, "物资管理后台"),
              _createElementVNode("div", { class: "login-sub" }, "仅管理员需要登录"),
              _createElementVNode("div", { class: "stack" }, [
                _createElementVNode("div", { class: "field" }, [
                  _createElementVNode("label", null, "用户名"),
                  _withDirectives(_createElementVNode("input", {
                    class: "input",
                    "onUpdate:modelValue": $event => ((_ctx.login.username) = $event),
                    autocomplete: "username"
                  }, null, 8, ["onUpdate:modelValue"]), [
                    [_vModelText, _ctx.login.username]
                  ])
                ]),
                _createElementVNode("div", { class: "field" }, [
                  _createElementVNode("label", null, "密码"),
                  _withDirectives(_createElementVNode("input", {
                    class: "input",
                    type: "password",
                    "onUpdate:modelValue": $event => ((_ctx.login.password) = $event),
                    autocomplete: "current-password",
                    onKeyup: _withKeys(_ctx.doLogin, ["enter"])
                  }, null, 40, ["onUpdate:modelValue", "onKeyup"]), [
                    [_vModelText, _ctx.login.password]
                  ])
                ]),
                (_ctx.loginError)
                  ? (_openBlock(), _createElementBlock("div", {
                      key: 0,
                      class: "hint",
                      style: {"color":"#dc2626"}
                    }, _toDisplayString(_ctx.loginError), 1))
                  : _createCommentVNode("", true),
                _createElementVNode("button", {
                  class: "btn btn-block",
                  disabled: _ctx.busy,
                  onClick: _ctx.doLogin
                }, "登录", 8, ["disabled", "onClick"]),
                _createElementVNode("a", {
                  href: "/",
                  style: {"text-align":"center","font-size":"13px"}
                }, "← 返回前台")
              ])
            ])
          ]))
        : (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
            _createElementVNode("div", { class: "topbar" }, [
              _createElementVNode("div", { class: "topbar-inner wide" }, [
                _createElementVNode("div", { class: "brand" }, [
                  _createElementVNode("span", { class: "brand-dot" }, "物"),
                  _createTextVNode("管理后台")
                ]),
                _createElementVNode("div", { class: "spacer" }),
                _createElementVNode("a", {
                  class: "btn btn-ghost btn-sm",
                  href: "/"
                }, "前台"),
                _createElementVNode("button", {
                  class: "btn btn-ghost btn-sm",
                  onClick: _ctx.doLogout
                }, "退出", 8, ["onClick"])
              ])
            ]),
            _createElementVNode("div", { class: "wrap wrap-wide" }, [
              _createElementVNode("div", { class: "tabs" }, [
                _createElementVNode("button", {
                  class: _normalizeClass(["tab", {active: _ctx.tab==='overview'}]),
                  onClick: $event => (_ctx.tab='overview')
                }, "概览", 10, ["onClick"]),
                _createElementVNode("button", {
                  class: _normalizeClass(["tab", {active: _ctx.tab==='materials'}]),
                  onClick: $event => (_ctx.tab='materials')
                }, "物资管理", 10, ["onClick"]),
                _createElementVNode("button", {
                  class: _normalizeClass(["tab", {active: _ctx.tab==='txns'}]),
                  onClick: $event => (_ctx.tab='txns')
                }, "流水记录", 10, ["onClick"]),
                _createElementVNode("button", {
                  class: _normalizeClass(["tab", {active: _ctx.tab==='borrows'}]),
                  onClick: $event => (_ctx.tab='borrows')
                }, "借还管理", 10, ["onClick"]),
                _createElementVNode("button", {
                  class: _normalizeClass(["tab", {active: _ctx.tab==='settings'}]),
                  onClick: $event => (_ctx.tab='settings')
                }, "设置", 10, ["onClick"])
              ]),
              (_ctx.tab === 'overview')
                ? (_openBlock(), _createElementBlock("div", { key: 0 }, [
                    (_ctx.overview)
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 0,
                          class: "stat-grid"
                        }, [
                          _createElementVNode("div", { class: "stat" }, [
                            _createElementVNode("div", { class: "stat-label" }, "物资种类"),
                            _createElementVNode("div", { class: "stat-value" }, _toDisplayString(_ctx.overview.materialCount), 1)
                          ]),
                          _createElementVNode("div", { class: "stat" }, [
                            _createElementVNode("div", { class: "stat-label" }, "在库总数量"),
                            _createElementVNode("div", { class: "stat-value" }, _toDisplayString(_ctx.overview.totalStock), 1)
                          ]),
                          _createElementVNode("div", { class: "stat" }, [
                            _createElementVNode("div", { class: "stat-label" }, "今日入库"),
                            _createElementVNode("div", { class: "stat-value" }, [
                              _createTextVNode(_toDisplayString(_ctx.overview.todayIn), 1),
                              _createElementVNode("small", null, "次")
                            ])
                          ]),
                          _createElementVNode("div", { class: "stat" }, [
                            _createElementVNode("div", { class: "stat-label" }, "今日出库"),
                            _createElementVNode("div", { class: "stat-value" }, [
                              _createTextVNode(_toDisplayString(_ctx.overview.todayOut), 1),
                              _createElementVNode("small", null, "次")
                            ])
                          ]),
                          _createElementVNode("div", { class: "stat" }, [
                            _createElementVNode("div", { class: "stat-label" }, "借出未还"),
                            _createElementVNode("div", { class: "stat-value" }, _toDisplayString(_ctx.overview.openBorrows), 1)
                          ])
                        ]))
                      : _createCommentVNode("", true),
                    (_ctx.overview && _ctx.overview.lowStock.length)
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 1,
                          class: "card"
                        }, [
                          _createElementVNode("div", { class: "card-title" }, "⚠️ 低库存预警"),
                          _createElementVNode("div", { class: "table-wrap" }, [
                            _createElementVNode("table", { class: "data" }, [
                              _createElementVNode("thead", null, [
                                _createElementVNode("tr", null, [
                                  _createElementVNode("th", null, "物资"),
                                  _createElementVNode("th", null, "分类"),
                                  _createElementVNode("th", { class: "num" }, "在库"),
                                  _createElementVNode("th", { class: "num" }, "预警值")
                                ])
                              ]),
                              _createElementVNode("tbody", null, [
                                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.overview.lowStock, (m) => {
                                  return (_openBlock(), _createElementBlock("tr", {
                                    key: m.id
                                  }, [
                                    _createElementVNode("td", null, [
                                      _createTextVNode(_toDisplayString(m.name) + " ", 1),
                                      (m.spec)
                                        ? (_openBlock(), _createElementBlock("span", {
                                            key: 0,
                                            class: "muted"
                                          }, _toDisplayString(m.spec), 1))
                                        : _createCommentVNode("", true)
                                    ]),
                                    _createElementVNode("td", null, _toDisplayString(m.categoryName), 1),
                                    _createElementVNode("td", {
                                      class: "num",
                                      style: {"color":"#d97706","font-weight":"700"}
                                    }, _toDisplayString(m.stock) + _toDisplayString(m.unit), 1),
                                    _createElementVNode("td", { class: "num" }, _toDisplayString(m.safetyStock) + _toDisplayString(m.unit), 1)
                                  ]))
                                }), 128))
                              ])
                            ])
                          ])
                        ]))
                      : _createCommentVNode("", true),
                    _createElementVNode("div", { class: "card" }, [
                      _createElementVNode("div", { class: "card-title" }, "最近流水"),
                      _createElementVNode("div", { class: "table-wrap" }, [
                        _createElementVNode("table", { class: "data" }, [
                          _createElementVNode("thead", null, [
                            _createElementVNode("tr", null, [
                              _createElementVNode("th", null, "时间"),
                              _createElementVNode("th", null, "类型"),
                              _createElementVNode("th", null, "物资"),
                              _createElementVNode("th", { class: "num" }, "数量"),
                              _createElementVNode("th", { class: "num" }, "变动后"),
                              _createElementVNode("th", null, "经手人"),
                              _createElementVNode("th", null, "状态")
                            ])
                          ]),
                          _createElementVNode("tbody", null, [
                            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList((_ctx.overview ? _ctx.overview.recent : []), (t) => {
                              return (_openBlock(), _createElementBlock("tr", {
                                key: t.id,
                                class: _normalizeClass({revoked: t.revoked})
                              }, [
                                _createElementVNode("td", { class: "mono" }, _toDisplayString(_ctx.fmtTime(t.createdAt)), 1),
                                _createElementVNode("td", null, [
                                  _createElementVNode("span", {
                                    class: _normalizeClass(_ctx.TYPE_CLASS[t.type])
                                  }, _toDisplayString(_ctx.TYPE_LABELS[t.type]), 3)
                                ]),
                                _createElementVNode("td", null, _toDisplayString(t.materialName), 1),
                                _createElementVNode("td", { class: "num" }, _toDisplayString(t.qty) + _toDisplayString(t.materialUnit), 1),
                                _createElementVNode("td", { class: "num" }, _toDisplayString(t.afterStock), 1),
                                _createElementVNode("td", null, _toDisplayString(t.operator), 1),
                                _createElementVNode("td", null, _toDisplayString(t.revoked ? '已撤销' : '有效'), 1)
                              ], 2))
                            }), 128))
                          ])
                        ])
                      ])
                    ])
                  ]))
                : _createCommentVNode("", true),
              (_ctx.tab === 'materials')
                ? (_openBlock(), _createElementBlock("div", { key: 1 }, [
                    _createElementVNode("div", { class: "card" }, [
                      _createElementVNode("div", {
                        class: "inline",
                        style: {"justify-content":"space-between"}
                      }, [
                        _createElementVNode("div", {
                          class: "card-title",
                          style: {"margin":"0"}
                        }, "物资档案"),
                        _createElementVNode("div", { class: "inline" }, [
                          _withDirectives(_createElementVNode("input", {
                            class: "input",
                            style: {"width":"200px"},
                            "onUpdate:modelValue": $event => ((_ctx.materialQuery) = $event),
                            placeholder: "搜索物资",
                            onKeyup: _withKeys(_ctx.loadAll, ["enter"])
                          }, null, 40, ["onUpdate:modelValue", "onKeyup"]), [
                            [_vModelText, _ctx.materialQuery]
                          ]),
                          _createElementVNode("button", {
                            class: "btn btn-ghost btn-sm",
                            onClick: _ctx.loadAll
                          }, "搜索", 8, ["onClick"]),
                          _createElementVNode("button", {
                            class: "btn btn-ghost btn-sm",
                            disabled: _ctx.mergeSelection.length < 2,
                            onClick: _ctx.doMerge
                          }, "合并所选(" + _toDisplayString(_ctx.mergeSelection.length) + ")", 9, ["disabled", "onClick"]),
                          _createElementVNode("button", {
                            class: "btn btn-sm",
                            onClick: _ctx.openCreate
                          }, "＋ 新增物资", 8, ["onClick"])
                        ])
                      ]),
                      _createElementVNode("div", { class: "table-wrap mt-12" }, [
                        _createElementVNode("table", { class: "data" }, [
                          _createElementVNode("thead", null, [
                            _createElementVNode("tr", null, [
                              _createElementVNode("th"),
                              _createElementVNode("th", null, "物资"),
                              _createElementVNode("th", null, "分类"),
                              _createElementVNode("th", { class: "num" }, "在库"),
                              _createElementVNode("th", { class: "num" }, "借出"),
                              _createElementVNode("th", null, "单位"),
                              _createElementVNode("th", null, "类型"),
                              _createElementVNode("th", null, "状态"),
                              _createElementVNode("th", null, "操作")
                            ])
                          ]),
                          _createElementVNode("tbody", null, [
                            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.materials, (m) => {
                              return (_openBlock(), _createElementBlock("tr", {
                                key: m.id
                              }, [
                                _createElementVNode("td", null, [
                                  _createElementVNode("input", {
                                    type: "checkbox",
                                    checked: _ctx.mergeSelection.includes(m.id),
                                    onChange: $event => (_ctx.toggleMerge(m.id))
                                  }, null, 40, ["checked", "onChange"])
                                ]),
                                _createElementVNode("td", null, [
                                  _createElementVNode("div", { style: {"font-weight":"650"} }, _toDisplayString(m.name), 1),
                                  _createElementVNode("div", { class: "muted text-sm" }, [
                                    _createTextVNode(_toDisplayString(m.spec || '—'), 1),
                                    (m.location)
                                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                                          _createTextVNode(" · " + _toDisplayString(m.location), 1)
                                        ], 64))
                                      : _createCommentVNode("", true)
                                  ])
                                ]),
                                _createElementVNode("td", null, _toDisplayString(m.categoryName), 1),
                                _createElementVNode("td", {
                                  class: "num",
                                  style: {"font-weight":"700"}
                                }, _toDisplayString(m.stock), 1),
                                _createElementVNode("td", { class: "num" }, _toDisplayString(m.borrowedOut || 0), 1),
                                _createElementVNode("td", null, _toDisplayString(m.unit), 1),
                                _createElementVNode("td", null, [
                                  _createElementVNode("span", {
                                    class: _normalizeClass(["tag", m.needsReturn ? '' : 'tag-muted'])
                                  }, _toDisplayString(m.needsReturn ? '可归还' : '消耗品'), 3)
                                ]),
                                _createElementVNode("td", null, [
                                  _createElementVNode("span", {
                                    class: _normalizeClass(["tag", m.active ? '' : 'tag-muted'])
                                  }, _toDisplayString(m.active ? '启用' : '停用'), 3)
                                ]),
                                _createElementVNode("td", { class: "nowrap" }, [
                                  _createElementVNode("button", {
                                    class: "btn btn-ghost btn-sm",
                                    onClick: $event => (_ctx.openEdit(m))
                                  }, "编辑", 8, ["onClick"]),
                                  _createElementVNode("button", {
                                    class: "btn btn-ghost btn-sm",
                                    onClick: $event => (_ctx.openAdjust(m))
                                  }, "校准", 8, ["onClick"]),
                                  _createElementVNode("button", {
                                    class: "btn btn-ghost btn-sm",
                                    onClick: $event => (_ctx.toggleActive(m))
                                  }, _toDisplayString(m.active ? '停用' : '启用'), 9, ["onClick"])
                                ])
                              ]))
                            }), 128))
                          ])
                        ])
                      ]),
                      (!_ctx.materials.length)
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 0,
                            class: "empty",
                            style: {"box-shadow":"none"}
                          }, "还没有物资"))
                        : _createCommentVNode("", true)
                    ])
                  ]))
                : _createCommentVNode("", true),
              (_ctx.tab === 'txns')
                ? (_openBlock(), _createElementBlock("div", { key: 2 }, [
                    _createElementVNode("div", { class: "card" }, [
                      _createElementVNode("div", { class: "card-title" }, "出入库流水（共 " + _toDisplayString(_ctx.txns.total) + " 条）", 1),
                      _createElementVNode("div", {
                        class: "inline",
                        style: {"margin-bottom":"12px"}
                      }, [
                        _withDirectives(_createElementVNode("select", {
                          class: "select",
                          style: {"width":"120px"},
                          "onUpdate:modelValue": $event => ((_ctx.txnFilter.type) = $event),
                          onChange: _ctx.loadAll
                        }, [
                          _createElementVNode("option", { value: "" }, "全部类型"),
                          _createElementVNode("option", { value: "in" }, "入库"),
                          _createElementVNode("option", { value: "out" }, "取出"),
                          _createElementVNode("option", { value: "borrow" }, "借出"),
                          _createElementVNode("option", { value: "return" }, "归还"),
                          _createElementVNode("option", { value: "adjust" }, "校准")
                        ], 40, ["onUpdate:modelValue", "onChange"]), [
                          [_vModelSelect, _ctx.txnFilter.type]
                        ]),
                        _withDirectives(_createElementVNode("input", {
                          class: "input",
                          style: {"width":"160px"},
                          "onUpdate:modelValue": $event => ((_ctx.txnFilter.operator) = $event),
                          placeholder: "经手人",
                          onKeyup: _withKeys(_ctx.loadAll, ["enter"])
                        }, null, 40, ["onUpdate:modelValue", "onKeyup"]), [
                          [_vModelText, _ctx.txnFilter.operator]
                        ]),
                        _withDirectives(_createElementVNode("select", {
                          class: "select",
                          style: {"width":"220px"},
                          "onUpdate:modelValue": $event => ((_ctx.txnFilter.materialId) = $event),
                          onChange: _ctx.loadAll
                        }, [
                          _createElementVNode("option", { value: "" }, "全部物资"),
                          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.materials, (m) => {
                            return (_openBlock(), _createElementBlock("option", {
                              key: m.id,
                              value: m.id
                            }, _toDisplayString(m.name), 9, ["value"]))
                          }), 128))
                        ], 40, ["onUpdate:modelValue", "onChange"]), [
                          [_vModelSelect, _ctx.txnFilter.materialId]
                        ]),
                        _createElementVNode("button", {
                          class: "btn btn-ghost btn-sm",
                          onClick: _ctx.loadAll
                        }, "筛选", 8, ["onClick"]),
                        _createElementVNode("button", {
                          class: "btn btn-ghost btn-sm",
                          onClick: _ctx.exportTxns
                        }, "导出 Excel", 8, ["onClick"])
                      ]),
                      _createElementVNode("div", { class: "table-wrap" }, [
                        _createElementVNode("table", { class: "data" }, [
                          _createElementVNode("thead", null, [
                            _createElementVNode("tr", null, [
                              _createElementVNode("th", null, "#"),
                              _createElementVNode("th", null, "时间"),
                              _createElementVNode("th", null, "类型"),
                              _createElementVNode("th", null, "物资"),
                              _createElementVNode("th", { class: "num" }, "数量"),
                              _createElementVNode("th", { class: "num" }, "变动前"),
                              _createElementVNode("th", { class: "num" }, "变动后"),
                              _createElementVNode("th", null, "经手人"),
                              _createElementVNode("th", null, "备注"),
                              _createElementVNode("th", null, "状态"),
                              _createElementVNode("th")
                            ])
                          ]),
                          _createElementVNode("tbody", null, [
                            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.txns.items, (t) => {
                              return (_openBlock(), _createElementBlock("tr", {
                                key: t.id,
                                class: _normalizeClass({revoked: t.revoked})
                              }, [
                                _createElementVNode("td", { class: "mono" }, _toDisplayString(t.id), 1),
                                _createElementVNode("td", { class: "mono nowrap" }, _toDisplayString(_ctx.fmtTime(t.createdAt)), 1),
                                _createElementVNode("td", null, [
                                  _createElementVNode("span", {
                                    class: _normalizeClass(_ctx.TYPE_CLASS[t.type])
                                  }, _toDisplayString(_ctx.TYPE_LABELS[t.type]), 3)
                                ]),
                                _createElementVNode("td", null, [
                                  _createTextVNode(_toDisplayString(t.materialName), 1),
                                  (t.materialSpec)
                                    ? (_openBlock(), _createElementBlock("span", {
                                        key: 0,
                                        class: "muted"
                                      }, _toDisplayString(t.materialSpec), 1))
                                    : _createCommentVNode("", true)
                                ]),
                                _createElementVNode("td", { class: "num" }, _toDisplayString(t.qty) + _toDisplayString(t.materialUnit), 1),
                                _createElementVNode("td", { class: "num" }, _toDisplayString(t.beforeStock), 1),
                                _createElementVNode("td", { class: "num" }, _toDisplayString(t.afterStock), 1),
                                _createElementVNode("td", null, _toDisplayString(t.operator), 1),
                                _createElementVNode("td", { class: "muted text-sm" }, _toDisplayString(t.note || '—'), 1),
                                _createElementVNode("td", null, [
                                  (t.revoked)
                                    ? (_openBlock(), _createElementBlock("span", {
                                        key: 0,
                                        class: "tag tag-danger"
                                      }, "已撤销"))
                                    : (_openBlock(), _createElementBlock("span", {
                                        key: 1,
                                        class: "tag"
                                      }, "有效"))
                                ]),
                                _createElementVNode("td", null, [
                                  (!t.revoked)
                                    ? (_openBlock(), _createElementBlock("button", {
                                        key: 0,
                                        class: "btn btn-danger btn-sm",
                                        onClick: $event => (_ctx.openRevoke(t))
                                      }, "撤销", 8, ["onClick"]))
                                    : _createCommentVNode("", true)
                                ])
                              ], 2))
                            }), 128))
                          ])
                        ])
                      ]),
                      (!_ctx.txns.items.length)
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 0,
                            class: "empty",
                            style: {"box-shadow":"none"}
                          }, "暂无流水"))
                        : _createCommentVNode("", true)
                    ])
                  ]))
                : _createCommentVNode("", true),
              (_ctx.tab === 'borrows')
                ? (_openBlock(), _createElementBlock("div", { key: 3 }, [
                    _createElementVNode("div", { class: "card" }, [
                      _createElementVNode("div", { class: "card-title" }, "未归还清单（" + _toDisplayString(_ctx.borrows.length) + " 条）", 1),
                      _createElementVNode("div", { class: "table-wrap" }, [
                        _createElementVNode("table", { class: "data" }, [
                          _createElementVNode("thead", null, [
                            _createElementVNode("tr", null, [
                              _createElementVNode("th", null, "借用人"),
                              _createElementVNode("th", null, "物资"),
                              _createElementVNode("th", { class: "num" }, "借出"),
                              _createElementVNode("th", { class: "num" }, "已还"),
                              _createElementVNode("th", { class: "num" }, "未还"),
                              _createElementVNode("th", null, "借出时间"),
                              _createElementVNode("th", null, "应还"),
                              _createElementVNode("th", null, "状态"),
                              _createElementVNode("th")
                            ])
                          ]),
                          _createElementVNode("tbody", null, [
                            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.borrows, (b) => {
                              return (_openBlock(), _createElementBlock("tr", {
                                key: b.id
                              }, [
                                _createElementVNode("td", null, [
                                  _createTextVNode(_toDisplayString(b.borrower), 1),
                                  _createElementVNode("div", { class: "muted text-sm" }, _toDisplayString(b.borrowerPhone || '—'), 1)
                                ]),
                                _createElementVNode("td", null, _toDisplayString(b.materialName), 1),
                                _createElementVNode("td", { class: "num" }, _toDisplayString(b.qty) + _toDisplayString(b.materialUnit), 1),
                                _createElementVNode("td", { class: "num" }, _toDisplayString(b.returnedQty), 1),
                                _createElementVNode("td", {
                                  class: "num",
                                  style: {"font-weight":"700"}
                                }, _toDisplayString(b.remainingQty), 1),
                                _createElementVNode("td", { class: "mono" }, _toDisplayString(_ctx.fmtTime(b.createdAt)), 1),
                                _createElementVNode("td", { class: "mono" }, _toDisplayString(b.dueAt ? _ctx.fmtDate(b.dueAt) : '—'), 1),
                                _createElementVNode("td", null, [
                                  (_ctx.isOverdue(b))
                                    ? (_openBlock(), _createElementBlock("span", {
                                        key: 0,
                                        class: "tag tag-danger"
                                      }, "逾期"))
                                    : (b.status === 'lost')
                                      ? (_openBlock(), _createElementBlock("span", {
                                          key: 1,
                                          class: "tag tag-danger"
                                        }, "丢失"))
                                      : (b.status === 'partial')
                                        ? (_openBlock(), _createElementBlock("span", {
                                            key: 2,
                                            class: "tag tag-warn"
                                          }, "部分归还"))
                                        : (_openBlock(), _createElementBlock("span", {
                                            key: 3,
                                            class: "tag"
                                          }, "未还"))
                                ]),
                                _createElementVNode("td", { class: "nowrap" }, [
                                  (b.status !== 'lost')
                                    ? (_openBlock(), _createElementBlock("button", {
                                        key: 0,
                                        class: "btn btn-danger btn-sm",
                                        onClick: $event => (_ctx.markLost(b))
                                      }, "标记丢失", 8, ["onClick"]))
                                    : _createCommentVNode("", true)
                                ])
                              ]))
                            }), 128))
                          ])
                        ])
                      ]),
                      (!_ctx.borrows.length)
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 0,
                            class: "empty",
                            style: {"box-shadow":"none"}
                          }, "没有未归还的器材"))
                        : _createCommentVNode("", true)
                    ])
                  ]))
                : _createCommentVNode("", true),
              (_ctx.tab === 'settings' && _ctx.settings)
                ? (_openBlock(), _createElementBlock("div", { key: 4 }, [
                    _createElementVNode("div", { class: "card" }, [
                      _createElementVNode("div", { class: "card-title" }, "前台开放范围"),
                      _createElementVNode("div", { class: "setting-row" }, [
                        _createElementVNode("div", null, [
                          _createElementVNode("div", { class: "switch-text" }, "经手人姓名必填"),
                          _createElementVNode("div", { class: "setting-desc" }, "关闭后前台可以不填姓名直接操作（留痕会变弱）")
                        ]),
                        _createElementVNode("label", { class: "switch" }, [
                          _withDirectives(_createElementVNode("input", {
                            type: "checkbox",
                            "onUpdate:modelValue": $event => ((_ctx.settings.requireOperatorName) = $event)
                          }, null, 8, ["onUpdate:modelValue"]), [
                            [_vModelCheckbox, _ctx.settings.requireOperatorName]
                          ]),
                          _createElementVNode("span", { class: "track" })
                        ])
                      ]),
                      _createElementVNode("div", { class: "setting-row" }, [
                        _createElementVNode("div", null, [
                          _createElementVNode("div", { class: "switch-text" }, "允许匿名入库"),
                          _createElementVNode("div", { class: "setting-desc" }, "关闭后只有管理员能入库")
                        ]),
                        _createElementVNode("label", { class: "switch" }, [
                          _withDirectives(_createElementVNode("input", {
                            type: "checkbox",
                            "onUpdate:modelValue": $event => ((_ctx.settings.allowAnonymousStockIn) = $event)
                          }, null, 8, ["onUpdate:modelValue"]), [
                            [_vModelCheckbox, _ctx.settings.allowAnonymousStockIn]
                          ]),
                          _createElementVNode("span", { class: "track" })
                        ])
                      ]),
                      _createElementVNode("div", { class: "setting-row" }, [
                        _createElementVNode("div", null, [
                          _createElementVNode("div", { class: "switch-text" }, "允许匿名新建物资"),
                          _createElementVNode("div", { class: "setting-desc" }, "关闭后前台只能对已有物资入库，可杜绝重复建档")
                        ]),
                        _createElementVNode("label", { class: "switch" }, [
                          _withDirectives(_createElementVNode("input", {
                            type: "checkbox",
                            "onUpdate:modelValue": $event => ((_ctx.settings.allowAnonymousCreate) = $event)
                          }, null, 8, ["onUpdate:modelValue"]), [
                            [_vModelCheckbox, _ctx.settings.allowAnonymousCreate]
                          ]),
                          _createElementVNode("span", { class: "track" })
                        ])
                      ]),
                      _createElementVNode("div", { class: "setting-row" }, [
                        _createElementVNode("div", null, [
                          _createElementVNode("div", { class: "switch-text" }, "低库存预警"),
                          _createElementVNode("div", { class: "setting-desc" }, "在库 ≤ 预警值时在列表与概览高亮")
                        ]),
                        _createElementVNode("label", { class: "switch" }, [
                          _withDirectives(_createElementVNode("input", {
                            type: "checkbox",
                            "onUpdate:modelValue": $event => ((_ctx.settings.lowStockAlert) = $event)
                          }, null, 8, ["onUpdate:modelValue"]), [
                            [_vModelCheckbox, _ctx.settings.lowStockAlert]
                          ]),
                          _createElementVNode("span", { class: "track" })
                        ])
                      ]),
                      _createElementVNode("div", { class: "setting-row" }, [
                        _createElementVNode("div", null, [
                          _createElementVNode("div", { class: "switch-text" }, "单人单日操作上限"),
                          _createElementVNode("div", { class: "setting-desc" }, "按经手人姓名统计，0 表示不限制")
                        ]),
                        _withDirectives(_createElementVNode("input", {
                          class: "input",
                          style: {"width":"110px"},
                          type: "number",
                          min: "0",
                          "onUpdate:modelValue": $event => ((_ctx.settings.dailyOpLimit) = $event)
                        }, null, 8, ["onUpdate:modelValue"]), [
                          [
                            _vModelText,
                            _ctx.settings.dailyOpLimit,
                            void 0,
                            { number: true }
                          ]
                        ])
                      ]),
                      _createElementVNode("div", { class: "setting-row" }, [
                        _createElementVNode("div", null, [
                          _createElementVNode("div", { class: "switch-text" }, "访问口令"),
                          _createElementVNode("div", { class: "setting-desc" }, "开启后前台需先输入口令（默认关闭）")
                        ]),
                        _createElementVNode("label", { class: "switch" }, [
                          _withDirectives(_createElementVNode("input", {
                            type: "checkbox",
                            "onUpdate:modelValue": $event => ((_ctx.settings.gateEnabled) = $event)
                          }, null, 8, ["onUpdate:modelValue"]), [
                            [_vModelCheckbox, _ctx.settings.gateEnabled]
                          ]),
                          _createElementVNode("span", { class: "track" })
                        ])
                      ]),
                      _createElementVNode("div", { class: "setting-row" }, [
                        _createElementVNode("div", null, [
                          _createElementVNode("div", { class: "switch-text" }, "口令内容"),
                          _createElementVNode("div", { class: "setting-desc" }, "已设置时显示为已保存，重新填写会覆盖")
                        ]),
                        _withDirectives(_createElementVNode("input", {
                          class: "input",
                          style: {"width":"200px"},
                          "onUpdate:modelValue": $event => ((_ctx.settings.gateCode) = $event),
                          placeholder: "留空表示不修改"
                        }, null, 8, ["onUpdate:modelValue"]), [
                          [_vModelText, _ctx.settings.gateCode]
                        ])
                      ]),
                      _createElementVNode("div", { class: "setting-row" }, [
                        _createElementVNode("div", null, [
                          _createElementVNode("div", { class: "switch-text" }, "站点标题"),
                          _createElementVNode("div", { class: "setting-desc" }, "显示在前台顶部")
                        ]),
                        _withDirectives(_createElementVNode("input", {
                          class: "input",
                          style: {"width":"200px"},
                          "onUpdate:modelValue": $event => ((_ctx.settings.siteTitle) = $event)
                        }, null, 8, ["onUpdate:modelValue"]), [
                          [_vModelText, _ctx.settings.siteTitle]
                        ])
                      ]),
                      _createElementVNode("div", { class: "setting-row" }, [
                        _createElementVNode("div", null, [
                          _createElementVNode("div", { class: "switch-text" }, "页脚诗句"),
                          _createElementVNode("div", { class: "setting-desc" }, "显示在前台页脚，留空则不显示")
                        ]),
                        _withDirectives(_createElementVNode("input", {
                          class: "input",
                          style: {"width":"260px"},
                          "onUpdate:modelValue": $event => ((_ctx.settings.siteFooterQuote) = $event)
                        }, null, 8, ["onUpdate:modelValue"]), [
                          [_vModelText, _ctx.settings.siteFooterQuote]
                        ])
                      ]),
                      _createElementVNode("div", { class: "setting-row" }, [
                        _createElementVNode("div", null, [
                          _createElementVNode("div", { class: "switch-text" }, "ICP 备案号"),
                          _createElementVNode("div", { class: "setting-desc" }, "显示在前台页脚，留空则不显示")
                        ]),
                        _withDirectives(_createElementVNode("input", {
                          class: "input",
                          style: {"width":"260px"},
                          "onUpdate:modelValue": $event => ((_ctx.settings.siteIcp) = $event)
                        }, null, 8, ["onUpdate:modelValue"]), [
                          [_vModelText, _ctx.settings.siteIcp]
                        ])
                      ]),
                      _createElementVNode("div", { class: "mt-16 inline" }, [
                        _createElementVNode("button", {
                          class: "btn",
                          disabled: _ctx.busy,
                          onClick: _ctx.saveSettings
                        }, "保存设置", 8, ["disabled", "onClick"]),
                        _createElementVNode("button", {
                          class: "btn btn-ghost btn-sm",
                          onClick: _ctx.generateQr
                        }, "生成门户二维码", 8, ["onClick"])
                      ])
                    ]),
                    _createElementVNode("div", { class: "card" }, [
                      _createElementVNode("div", { class: "card-title" }, "修改管理员密码"),
                      _createElementVNode("div", { class: "row-2" }, [
                        _createElementVNode("div", { class: "field" }, [
                          _createElementVNode("label", null, "当前密码"),
                          _withDirectives(_createElementVNode("input", {
                            class: "input",
                            type: "password",
                            "onUpdate:modelValue": $event => ((_ctx.passwordForm.currentPassword) = $event)
                          }, null, 8, ["onUpdate:modelValue"]), [
                            [_vModelText, _ctx.passwordForm.currentPassword]
                          ])
                        ]),
                        _createElementVNode("div", { class: "field" }, [
                          _createElementVNode("label", null, "新密码（至少 8 位）"),
                          _withDirectives(_createElementVNode("input", {
                            class: "input",
                            type: "password",
                            "onUpdate:modelValue": $event => ((_ctx.passwordForm.newPassword) = $event)
                          }, null, 8, ["onUpdate:modelValue"]), [
                            [_vModelText, _ctx.passwordForm.newPassword]
                          ])
                        ])
                      ]),
                      _createElementVNode("button", {
                        class: "btn btn-ghost mt-12",
                        onClick: _ctx.changePassword
                      }, "修改密码", 8, ["onClick"])
                    ]),
                    _createElementVNode("div", { class: "card" }, [
                      _createElementVNode("div", { class: "card-title" }, "最近管理操作"),
                      _createElementVNode("div", { class: "table-wrap" }, [
                        _createElementVNode("table", { class: "data" }, [
                          _createElementVNode("thead", null, [
                            _createElementVNode("tr", null, [
                              _createElementVNode("th", null, "时间"),
                              _createElementVNode("th", null, "操作人"),
                              _createElementVNode("th", null, "动作"),
                              _createElementVNode("th", null, "说明")
                            ])
                          ]),
                          _createElementVNode("tbody", null, [
                            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.audits, (a) => {
                              return (_openBlock(), _createElementBlock("tr", {
                                key: a.id
                              }, [
                                _createElementVNode("td", { class: "mono nowrap" }, _toDisplayString(_ctx.fmtTime(a.createdAt)), 1),
                                _createElementVNode("td", null, _toDisplayString(a.actor), 1),
                                _createElementVNode("td", { class: "mono" }, _toDisplayString(a.action), 1),
                                _createElementVNode("td", { class: "muted" }, _toDisplayString(a.summary), 1)
                              ]))
                            }), 128))
                          ])
                        ])
                      ])
                    ])
                  ]))
                : _createCommentVNode("", true)
            ]),
            (_ctx.materialDialog.open)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "mask",
                  onClick: _withModifiers($event => (_ctx.materialDialog.open = false), ["self"])
                }, [
                  _createElementVNode("div", {
                    class: "sheet",
                    style: {"position":"relative"}
                  }, [
                    _createElementVNode("button", {
                      class: "close-x",
                      onClick: $event => (_ctx.materialDialog.open = false)
                    }, "✕", 8, ["onClick"]),
                    _createElementVNode("div", { class: "sheet-title" }, _toDisplayString(_ctx.materialDialog.mode === 'create' ? '新增物资' : '编辑物资'), 1),
                    _createElementVNode("div", { class: "sheet-body" }, [
                      _createElementVNode("div", { class: "row-2" }, [
                        _createElementVNode("div", { class: "field" }, [
                          _createElementVNode("label", null, "名称 *"),
                          _withDirectives(_createElementVNode("input", {
                            class: "input",
                            "onUpdate:modelValue": $event => ((_ctx.materialForm.name) = $event)
                          }, null, 8, ["onUpdate:modelValue"]), [
                            [_vModelText, _ctx.materialForm.name]
                          ])
                        ]),
                        _createElementVNode("div", { class: "field" }, [
                          _createElementVNode("label", null, "规格"),
                          _withDirectives(_createElementVNode("input", {
                            class: "input",
                            "onUpdate:modelValue": $event => ((_ctx.materialForm.spec) = $event)
                          }, null, 8, ["onUpdate:modelValue"]), [
                            [_vModelText, _ctx.materialForm.spec]
                          ])
                        ])
                      ]),
                      _createElementVNode("div", { class: "row-2" }, [
                        _createElementVNode("div", { class: "field" }, [
                          _createElementVNode("label", null, "分类"),
                          _withDirectives(_createElementVNode("select", {
                            class: "select",
                            "onUpdate:modelValue": $event => ((_ctx.materialForm.categoryId) = $event)
                          }, [
                            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.categories, (c) => {
                              return (_openBlock(), _createElementBlock("option", {
                                key: c.id,
                                value: c.id
                              }, _toDisplayString(c.name), 9, ["value"]))
                            }), 128))
                          ], 8, ["onUpdate:modelValue"]), [
                            [_vModelSelect, _ctx.materialForm.categoryId]
                          ])
                        ]),
                        _createElementVNode("div", { class: "field" }, [
                          _createElementVNode("label", null, "单位"),
                          _withDirectives(_createElementVNode("input", {
                            class: "input",
                            "onUpdate:modelValue": $event => ((_ctx.materialForm.unit) = $event)
                          }, null, 8, ["onUpdate:modelValue"]), [
                            [_vModelText, _ctx.materialForm.unit]
                          ])
                        ])
                      ]),
                      _createElementVNode("div", { class: "row-2" }, [
                        _createElementVNode("div", { class: "field" }, [
                          _createElementVNode("label", null, "存放位置"),
                          _withDirectives(_createElementVNode("input", {
                            class: "input",
                            "onUpdate:modelValue": $event => ((_ctx.materialForm.location) = $event)
                          }, null, 8, ["onUpdate:modelValue"]), [
                            [_vModelText, _ctx.materialForm.location]
                          ])
                        ]),
                        _createElementVNode("div", { class: "field" }, [
                          _createElementVNode("label", null, "预警值"),
                          _withDirectives(_createElementVNode("input", {
                            class: "input",
                            type: "number",
                            min: "0",
                            "onUpdate:modelValue": $event => ((_ctx.materialForm.safetyStock) = $event)
                          }, null, 8, ["onUpdate:modelValue"]), [
                            [
                              _vModelText,
                              _ctx.materialForm.safetyStock,
                              void 0,
                              { number: true }
                            ]
                          ])
                        ])
                      ]),
                      _createElementVNode("label", { class: "switch" }, [
                        _withDirectives(_createElementVNode("input", {
                          type: "checkbox",
                          "onUpdate:modelValue": $event => ((_ctx.materialForm.needsReturn) = $event)
                        }, null, 8, ["onUpdate:modelValue"]), [
                          [_vModelCheckbox, _ctx.materialForm.needsReturn]
                        ]),
                        _createElementVNode("span", { class: "track" }),
                        _createElementVNode("span", { class: "switch-text" }, "需要归还（器材类）")
                      ]),
                      _createElementVNode("div", { class: "field" }, [
                        _createElementVNode("label", null, "备注"),
                        _withDirectives(_createElementVNode("textarea", {
                          class: "textarea",
                          "onUpdate:modelValue": $event => ((_ctx.materialForm.notes) = $event)
                        }, null, 8, ["onUpdate:modelValue"]), [
                          [_vModelText, _ctx.materialForm.notes]
                        ])
                      ]),
                      _createElementVNode("div", { class: "field" }, [
                        _createElementVNode("label", null, "图片（JPEG / PNG / WebP，最大 20 MB）"),
                        _createElementVNode("input", {
                          type: "file",
                          accept: "image/jpeg,image/png,image/webp",
                          onChange: _ctx.onFileChange
                        }, null, 40, ["onChange"])
                      ])
                    ]),
                    _createElementVNode("div", { class: "sheet-foot" }, [
                      _createElementVNode("button", {
                        class: "btn btn-ghost",
                        onClick: $event => (_ctx.materialDialog.open = false)
                      }, "取消", 8, ["onClick"]),
                      _createElementVNode("button", {
                        class: "btn",
                        disabled: _ctx.busy,
                        onClick: _ctx.saveMaterial
                      }, "保存", 8, ["disabled", "onClick"])
                    ])
                  ])
                ], 8, ["onClick"]))
              : _createCommentVNode("", true),
            (_ctx.adjustDialog.open)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 1,
                  class: "mask",
                  onClick: _withModifiers($event => (_ctx.adjustDialog.open = false), ["self"])
                }, [
                  _createElementVNode("div", {
                    class: "sheet",
                    style: {"position":"relative"}
                  }, [
                    _createElementVNode("button", {
                      class: "close-x",
                      onClick: $event => (_ctx.adjustDialog.open = false)
                    }, "✕", 8, ["onClick"]),
                    _createElementVNode("div", { class: "sheet-title" }, "校准库存：" + _toDisplayString(_ctx.adjustDialog.material?.name), 1),
                    _createElementVNode("div", { class: "sheet-sub" }, "当前在库 " + _toDisplayString(_ctx.adjustDialog.material?.stock) + _toDisplayString(_ctx.adjustDialog.material?.unit), 1),
                    _createElementVNode("div", { class: "sheet-body" }, [
                      _createElementVNode("div", { class: "field" }, [
                        _createElementVNode("label", null, "校准后的数量"),
                        _withDirectives(_createElementVNode("input", {
                          class: "input",
                          type: "number",
                          min: "0",
                          "onUpdate:modelValue": $event => ((_ctx.adjustDialog.stock) = $event)
                        }, null, 8, ["onUpdate:modelValue"]), [
                          [
                            _vModelText,
                            _ctx.adjustDialog.stock,
                            void 0,
                            { number: true }
                          ]
                        ])
                      ]),
                      _createElementVNode("div", { class: "field" }, [
                        _createElementVNode("label", null, "校准原因"),
                        _withDirectives(_createElementVNode("input", {
                          class: "input",
                          "onUpdate:modelValue": $event => ((_ctx.adjustDialog.reason) = $event),
                          placeholder: "如：盘点差异"
                        }, null, 8, ["onUpdate:modelValue"]), [
                          [_vModelText, _ctx.adjustDialog.reason]
                        ])
                      ])
                    ]),
                    _createElementVNode("div", { class: "sheet-foot" }, [
                      _createElementVNode("button", {
                        class: "btn btn-ghost",
                        onClick: $event => (_ctx.adjustDialog.open = false)
                      }, "取消", 8, ["onClick"]),
                      _createElementVNode("button", {
                        class: "btn",
                        disabled: _ctx.busy,
                        onClick: _ctx.saveAdjust
                      }, "确认校准", 8, ["disabled", "onClick"])
                    ])
                  ])
                ], 8, ["onClick"]))
              : _createCommentVNode("", true),
            (_ctx.revokeDialog.open)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 2,
                  class: "mask",
                  onClick: _withModifiers($event => (_ctx.revokeDialog.open = false), ["self"])
                }, [
                  _createElementVNode("div", {
                    class: "sheet",
                    style: {"position":"relative"}
                  }, [
                    _createElementVNode("button", {
                      class: "close-x",
                      onClick: $event => (_ctx.revokeDialog.open = false)
                    }, "✕", 8, ["onClick"]),
                    _createElementVNode("div", { class: "sheet-title" }, "撤销流水 #" + _toDisplayString(_ctx.revokeDialog.txn?.id), 1),
                    _createElementVNode("div", { class: "sheet-sub" }, _toDisplayString(_ctx.revokeDialog.txn?.materialName) + " · " + _toDisplayString(_ctx.TYPE_LABELS[_ctx.revokeDialog.txn?.type]) + " " + _toDisplayString(_ctx.revokeDialog.txn?.qty) + _toDisplayString(_ctx.revokeDialog.txn?.materialUnit), 1),
                    _createElementVNode("div", { class: "sheet-body" }, [
                      _createElementVNode("div", { class: "banner banner-warn" }, " 撤销会把这笔流水的数量反向回滚库存，记录保留并标记「已撤销」。若该批物资已被使用，系统会拒绝撤销。 "),
                      _createElementVNode("div", { class: "field" }, [
                        _createElementVNode("label", null, "撤销原因"),
                        _withDirectives(_createElementVNode("input", {
                          class: "input",
                          "onUpdate:modelValue": $event => ((_ctx.revokeDialog.reason) = $event),
                          placeholder: "如：输错数量"
                        }, null, 8, ["onUpdate:modelValue"]), [
                          [_vModelText, _ctx.revokeDialog.reason]
                        ])
                      ])
                    ]),
                    _createElementVNode("div", { class: "sheet-foot" }, [
                      _createElementVNode("button", {
                        class: "btn btn-ghost",
                        onClick: $event => (_ctx.revokeDialog.open = false)
                      }, "取消", 8, ["onClick"]),
                      _createElementVNode("button", {
                        class: "btn",
                        disabled: _ctx.busy,
                        onClick: _ctx.doRevoke
                      }, "确认撤销", 8, ["disabled", "onClick"])
                    ])
                  ])
                ], 8, ["onClick"]))
              : _createCommentVNode("", true)
          ], 64)),
    _createVNode(_component_ToastStack, { toasts: _ctx.toasts }, null, 8, ["toasts"])
  ]))
}
