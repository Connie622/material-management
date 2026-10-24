// admin.mjs：由构建脚本预编译为 render 函数，不要改回组件里的 template 选项。
export const adminTemplate = `
  <div>
    <div v-if="checking" class="loading"><div class="spin"></div>检查登录状态…</div>

    <!-- 登录 -->
    <div v-else-if="!authed" class="login-wrap">
      <div class="login-card">
        <img class="login-emblem" src="/assets/jnu-emblem.png" alt="暨南大学" />
        <div class="login-title">物资管理后台</div>
        <div class="login-sub">仅管理员需要登录</div>
        <div class="stack">
          <div class="field">
            <label>用户名</label>
            <input class="input" v-model="login.username" autocomplete="username" />
          </div>
          <div class="field">
            <label>密码</label>
            <input class="input" type="password" v-model="login.password" autocomplete="current-password" @keyup.enter="doLogin" />
          </div>
          <div v-if="loginError" class="hint" style="color:#dc2626">{{ loginError }}</div>
          <button class="btn btn-block" :disabled="busy" @click="doLogin">登录</button>
          <a href="/" style="text-align:center;font-size:13px">← 返回前台</a>
        </div>
      </div>
    </div>

    <!-- 后台 -->
    <template v-else>
      <div class="topbar">
        <div class="topbar-inner wide">
          <div class="brand"><span class="brand-dot">物</span>管理后台</div>
          <div class="spacer"></div>
          <a class="btn btn-ghost btn-sm" href="/">前台</a>
          <button class="btn btn-ghost btn-sm" @click="doLogout">退出</button>
        </div>
      </div>

      <div class="wrap wrap-wide">
        <div class="tabs">
          <button class="tab" :class="{active: tab==='overview'}" @click="tab='overview'">概览</button>
          <button class="tab" :class="{active: tab==='materials'}" @click="tab='materials'">物资管理</button>
          <button class="tab" :class="{active: tab==='txns'}" @click="tab='txns'">流水记录</button>
          <button class="tab" :class="{active: tab==='borrows'}" @click="tab='borrows'">借还管理</button>
          <button class="tab" :class="{active: tab==='settings'}" @click="tab='settings'">设置</button>
        </div>

        <!-- 概览 -->
        <div v-if="tab === 'overview'">
          <div class="stat-grid" v-if="overview">
            <div class="stat"><div class="stat-label">物资种类</div><div class="stat-value">{{ overview.materialCount }}</div></div>
            <div class="stat"><div class="stat-label">在库总数量</div><div class="stat-value">{{ overview.totalStock }}</div></div>
            <div class="stat"><div class="stat-label">今日入库</div><div class="stat-value">{{ overview.todayIn }}<small>次</small></div></div>
            <div class="stat"><div class="stat-label">今日出库</div><div class="stat-value">{{ overview.todayOut }}<small>次</small></div></div>
            <div class="stat"><div class="stat-label">借出未还</div><div class="stat-value">{{ overview.openBorrows }}</div></div>
          </div>

          <div class="card" v-if="overview && overview.lowStock.length">
            <div class="card-title">⚠️ 低库存预警</div>
            <div class="table-wrap">
              <table class="data">
                <thead><tr><th>物资</th><th>分类</th><th class="num">在库</th><th class="num">预警值</th></tr></thead>
                <tbody>
                  <tr v-for="m in overview.lowStock" :key="m.id">
                    <td>{{ m.name }} <span v-if="m.spec" class="muted">{{ m.spec }}</span></td>
                    <td>{{ m.categoryName }}</td>
                    <td class="num" style="color:#d97706;font-weight:700">{{ m.stock }}{{ m.unit }}</td>
                    <td class="num">{{ m.safetyStock }}{{ m.unit }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card-title">最近流水</div>
            <div class="table-wrap">
              <table class="data">
                <thead><tr><th>时间</th><th>类型</th><th>物资</th><th class="num">数量</th><th class="num">变动后</th><th>经手人</th><th>状态</th></tr></thead>
                <tbody>
                  <tr v-for="t in (overview ? overview.recent : [])" :key="t.id" :class="{revoked: t.revoked}">
                    <td class="mono">{{ fmtTime(t.createdAt) }}</td>
                    <td><span :class="TYPE_CLASS[t.type]">{{ TYPE_LABELS[t.type] }}</span></td>
                    <td>{{ t.materialName }}</td>
                    <td class="num">{{ t.qty }}{{ t.materialUnit }}</td>
                    <td class="num">{{ t.afterStock }}</td>
                    <td>{{ t.operator }}</td>
                    <td>{{ t.revoked ? '已撤销' : '有效' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 物资管理 -->
        <div v-if="tab === 'materials'">
          <div class="card">
            <div class="inline" style="justify-content:space-between">
              <div class="card-title" style="margin:0">物资档案</div>
              <div class="inline">
                <input class="input" style="width:200px" v-model="materialQuery" placeholder="搜索物资" @keyup.enter="loadAll" />
                <button class="btn btn-ghost btn-sm" @click="loadAll">搜索</button>
                <button class="btn btn-ghost btn-sm" :disabled="mergeSelection.length < 2" @click="doMerge">合并所选({{ mergeSelection.length }})</button>
                <button class="btn btn-sm" @click="openCreate">＋ 新增物资</button>
              </div>
            </div>
            <div class="table-wrap mt-12">
              <table class="data">
                <thead>
                  <tr><th></th><th>物资</th><th>分类</th><th class="num">在库</th><th class="num">借出</th><th>单位</th><th>类型</th><th>状态</th><th>操作</th></tr>
                </thead>
                <tbody>
                  <tr v-for="m in materials" :key="m.id">
                    <td><input type="checkbox" :checked="mergeSelection.includes(m.id)" @change="toggleMerge(m.id)" /></td>
                    <td>
                      <div style="font-weight:650">{{ m.name }}</div>
                      <div class="muted text-sm">{{ m.spec || '—' }}<template v-if="m.location"> · {{ m.location }}</template></div>
                    </td>
                    <td>{{ m.categoryName }}</td>
                    <td class="num" style="font-weight:700">{{ m.stock }}</td>
                    <td class="num">{{ m.borrowedOut || 0 }}</td>
                    <td>{{ m.unit }}</td>
                    <td><span class="tag" :class="m.needsReturn ? '' : 'tag-muted'">{{ m.needsReturn ? '可归还' : '消耗品' }}</span></td>
                    <td><span class="tag" :class="m.active ? '' : 'tag-muted'">{{ m.active ? '启用' : '停用' }}</span></td>
                    <td class="nowrap">
                      <button class="btn btn-ghost btn-sm" @click="openEdit(m)">编辑</button>
                      <button class="btn btn-ghost btn-sm" @click="openAdjust(m)">校准</button>
                      <button class="btn btn-ghost btn-sm" @click="toggleActive(m)">{{ m.active ? '停用' : '启用' }}</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="!materials.length" class="empty" style="box-shadow:none">还没有物资</div>
          </div>
        </div>

        <!-- 流水 -->
        <div v-if="tab === 'txns'">
          <div class="card">
            <div class="card-title">出入库流水（共 {{ txns.total }} 条）</div>
            <div class="inline" style="margin-bottom:12px">
              <select class="select" style="width:120px" v-model="txnFilter.type" @change="loadAll">
                <option value="">全部类型</option>
                <option value="in">入库</option>
                <option value="out">取出</option>
                <option value="borrow">借出</option>
                <option value="return">归还</option>
                <option value="adjust">校准</option>
              </select>
              <input class="input" style="width:160px" v-model="txnFilter.operator" placeholder="经手人" @keyup.enter="loadAll" />
              <select class="select" style="width:220px" v-model="txnFilter.materialId" @change="loadAll">
                <option value="">全部物资</option>
                <option v-for="m in materials" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
              <button class="btn btn-ghost btn-sm" @click="loadAll">筛选</button>
              <button class="btn btn-ghost btn-sm" @click="exportTxns">导出 Excel</button>
            </div>
            <div class="table-wrap">
              <table class="data">
                <thead>
                  <tr><th>#</th><th>时间</th><th>类型</th><th>物资</th><th class="num">数量</th><th class="num">变动前</th><th class="num">变动后</th><th>经手人</th><th>备注</th><th>状态</th><th></th></tr>
                </thead>
                <tbody>
                  <tr v-for="t in txns.items" :key="t.id" :class="{revoked: t.revoked}">
                    <td class="mono">{{ t.id }}</td>
                    <td class="mono nowrap">{{ fmtTime(t.createdAt) }}</td>
                    <td><span :class="TYPE_CLASS[t.type]">{{ TYPE_LABELS[t.type] }}</span></td>
                    <td>{{ t.materialName }}<span v-if="t.materialSpec" class="muted"> {{ t.materialSpec }}</span></td>
                    <td class="num">{{ t.qty }}{{ t.materialUnit }}</td>
                    <td class="num">{{ t.beforeStock }}</td>
                    <td class="num">{{ t.afterStock }}</td>
                    <td>{{ t.operator }}</td>
                    <td class="muted text-sm">{{ t.note || '—' }}</td>
                    <td>
                      <span v-if="t.revoked" class="tag tag-danger">已撤销</span>
                      <span v-else class="tag">有效</span>
                    </td>
                    <td>
                      <button v-if="!t.revoked" class="btn btn-danger btn-sm" @click="openRevoke(t)">撤销</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="!txns.items.length" class="empty" style="box-shadow:none">暂无流水</div>
          </div>
        </div>

        <!-- 借还管理 -->
        <div v-if="tab === 'borrows'">
          <div class="card">
            <div class="card-title">未归还清单（{{ borrows.length }} 条）</div>
            <div class="table-wrap">
              <table class="data">
                <thead>
                  <tr><th>借用人</th><th>物资</th><th class="num">借出</th><th class="num">已还</th><th class="num">未还</th><th>借出时间</th><th>应还</th><th>状态</th><th></th></tr>
                </thead>
                <tbody>
                  <tr v-for="b in borrows" :key="b.id">
                    <td>{{ b.borrower }}<div class="muted text-sm">{{ b.borrowerPhone || '—' }}</div></td>
                    <td>{{ b.materialName }}</td>
                    <td class="num">{{ b.qty }}{{ b.materialUnit }}</td>
                    <td class="num">{{ b.returnedQty }}</td>
                    <td class="num" style="font-weight:700">{{ b.remainingQty }}</td>
                    <td class="mono">{{ fmtTime(b.createdAt) }}</td>
                    <td class="mono">{{ b.dueAt ? fmtDate(b.dueAt) : '—' }}</td>
                    <td>
                      <span v-if="isOverdue(b)" class="tag tag-danger">逾期</span>
                      <span v-else-if="b.status === 'lost'" class="tag tag-danger">丢失</span>
                      <span v-else-if="b.status === 'partial'" class="tag tag-warn">部分归还</span>
                      <span v-else class="tag">未还</span>
                    </td>
                    <td class="nowrap">
                      <button v-if="b.status !== 'lost'" class="btn btn-danger btn-sm" @click="markLost(b)">标记丢失</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="!borrows.length" class="empty" style="box-shadow:none">没有未归还的器材</div>
          </div>
        </div>

        <!-- 设置 -->
        <div v-if="tab === 'settings' && settings">
          <div class="card">
            <div class="card-title">前台开放范围</div>
            <div class="setting-row">
              <div>
                <div class="switch-text">经手人姓名必填</div>
                <div class="setting-desc">关闭后前台可以不填姓名直接操作（留痕会变弱）</div>
              </div>
              <label class="switch"><input type="checkbox" v-model="settings.requireOperatorName" /><span class="track"></span></label>
            </div>
            <div class="setting-row">
              <div>
                <div class="switch-text">允许匿名入库</div>
                <div class="setting-desc">关闭后只有管理员能入库</div>
              </div>
              <label class="switch"><input type="checkbox" v-model="settings.allowAnonymousStockIn" /><span class="track"></span></label>
            </div>
            <div class="setting-row">
              <div>
                <div class="switch-text">允许匿名新建物资</div>
                <div class="setting-desc">关闭后前台只能对已有物资入库，可杜绝重复建档</div>
              </div>
              <label class="switch"><input type="checkbox" v-model="settings.allowAnonymousCreate" /><span class="track"></span></label>
            </div>
            <div class="setting-row">
              <div>
                <div class="switch-text">低库存预警</div>
                <div class="setting-desc">在库 ≤ 预警值时在列表与概览高亮</div>
              </div>
              <label class="switch"><input type="checkbox" v-model="settings.lowStockAlert" /><span class="track"></span></label>
            </div>
            <div class="setting-row">
              <div>
                <div class="switch-text">单人单日操作上限</div>
                <div class="setting-desc">按经手人姓名统计，0 表示不限制</div>
              </div>
              <input class="input" style="width:110px" type="number" min="0" v-model.number="settings.dailyOpLimit" />
            </div>
            <div class="setting-row">
              <div>
                <div class="switch-text">访问口令</div>
                <div class="setting-desc">开启后前台需先输入口令（默认关闭）</div>
              </div>
              <label class="switch"><input type="checkbox" v-model="settings.gateEnabled" /><span class="track"></span></label>
            </div>
            <div class="setting-row">
              <div>
                <div class="switch-text">口令内容</div>
                <div class="setting-desc">已设置时显示为已保存，重新填写会覆盖</div>
              </div>
              <input class="input" style="width:200px" v-model="settings.gateCode" placeholder="留空表示不修改" />
            </div>
            <div class="setting-row">
              <div>
                <div class="switch-text">站点标题</div>
                <div class="setting-desc">显示在前台顶部</div>
              </div>
              <input class="input" style="width:200px" v-model="settings.siteTitle" />
            </div>
            <div class="setting-row">
              <div>
                <div class="switch-text">页脚诗句</div>
                <div class="setting-desc">显示在前台页脚，留空则不显示</div>
              </div>
              <input class="input" style="width:260px" v-model="settings.siteFooterQuote" />
            </div>
            <div class="setting-row">
              <div>
                <div class="switch-text">ICP 备案号</div>
                <div class="setting-desc">显示在前台页脚，留空则不显示</div>
              </div>
              <input class="input" style="width:260px" v-model="settings.siteIcp" />
            </div>
            <div class="mt-16 inline">
              <button class="btn" :disabled="busy" @click="saveSettings">保存设置</button>
              <button class="btn btn-ghost btn-sm" @click="generateQr">生成门户二维码</button>
            </div>
          </div>

          <div class="card">
            <div class="card-title">修改管理员密码</div>
            <div class="row-2">
              <div class="field"><label>当前密码</label><input class="input" type="password" v-model="passwordForm.currentPassword" /></div>
              <div class="field"><label>新密码（至少 8 位）</label><input class="input" type="password" v-model="passwordForm.newPassword" /></div>
            </div>
            <button class="btn btn-ghost mt-12" @click="changePassword">修改密码</button>
          </div>

          <div class="card">
            <div class="card-title">最近管理操作</div>
            <div class="table-wrap">
              <table class="data">
                <thead><tr><th>时间</th><th>操作人</th><th>动作</th><th>说明</th></tr></thead>
                <tbody>
                  <tr v-for="a in audits" :key="a.id">
                    <td class="mono nowrap">{{ fmtTime(a.createdAt) }}</td>
                    <td>{{ a.actor }}</td>
                    <td class="mono">{{ a.action }}</td>
                    <td class="muted">{{ a.summary }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- 物资弹窗 -->
      <div v-if="materialDialog.open" class="mask" @click.self="materialDialog.open = false">
        <div class="sheet" style="position:relative">
          <button class="close-x" @click="materialDialog.open = false">✕</button>
          <div class="sheet-title">{{ materialDialog.mode === 'create' ? '新增物资' : '编辑物资' }}</div>
          <div class="sheet-body">
            <div class="row-2">
              <div class="field"><label>名称 *</label><input class="input" v-model="materialForm.name" /></div>
              <div class="field"><label>规格</label><input class="input" v-model="materialForm.spec" /></div>
            </div>
            <div class="row-2">
              <div class="field">
                <label>分类</label>
                <select class="select" v-model="materialForm.categoryId">
                  <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div class="field"><label>单位</label><input class="input" v-model="materialForm.unit" /></div>
            </div>
            <div class="row-2">
              <div class="field"><label>存放位置</label><input class="input" v-model="materialForm.location" /></div>
              <div class="field"><label>预警值</label><input class="input" type="number" min="0" v-model.number="materialForm.safetyStock" /></div>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="materialForm.needsReturn" />
              <span class="track"></span>
              <span class="switch-text">需要归还（器材类）</span>
            </label>
            <div class="field"><label>备注</label><textarea class="textarea" v-model="materialForm.notes"></textarea></div>
            <div class="field">
              <label>图片（JPEG / PNG / WebP，最大 20 MB）</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" @change="onFileChange" />
            </div>
          </div>
          <div class="sheet-foot">
            <button class="btn btn-ghost" @click="materialDialog.open = false">取消</button>
            <button class="btn" :disabled="busy" @click="saveMaterial">保存</button>
          </div>
        </div>
      </div>

      <!-- 校准弹窗 -->
      <div v-if="adjustDialog.open" class="mask" @click.self="adjustDialog.open = false">
        <div class="sheet" style="position:relative">
          <button class="close-x" @click="adjustDialog.open = false">✕</button>
          <div class="sheet-title">校准库存：{{ adjustDialog.material?.name }}</div>
          <div class="sheet-sub">当前在库 {{ adjustDialog.material?.stock }}{{ adjustDialog.material?.unit }}</div>
          <div class="sheet-body">
            <div class="field">
              <label>校准后的数量</label>
              <input class="input" type="number" min="0" v-model.number="adjustDialog.stock" />
            </div>
            <div class="field">
              <label>校准原因</label>
              <input class="input" v-model="adjustDialog.reason" placeholder="如：盘点差异" />
            </div>
          </div>
          <div class="sheet-foot">
            <button class="btn btn-ghost" @click="adjustDialog.open = false">取消</button>
            <button class="btn" :disabled="busy" @click="saveAdjust">确认校准</button>
          </div>
        </div>
      </div>

      <!-- 撤销弹窗 -->
      <div v-if="revokeDialog.open" class="mask" @click.self="revokeDialog.open = false">
        <div class="sheet" style="position:relative">
          <button class="close-x" @click="revokeDialog.open = false">✕</button>
          <div class="sheet-title">撤销流水 #{{ revokeDialog.txn?.id }}</div>
          <div class="sheet-sub">
            {{ revokeDialog.txn?.materialName }} · {{ TYPE_LABELS[revokeDialog.txn?.type] }}
            {{ revokeDialog.txn?.qty }}{{ revokeDialog.txn?.materialUnit }}
          </div>
          <div class="sheet-body">
            <div class="banner banner-warn">
              撤销会把这笔流水的数量反向回滚库存，记录保留并标记「已撤销」。若该批物资已被使用，系统会拒绝撤销。
            </div>
            <div class="field">
              <label>撤销原因</label>
              <input class="input" v-model="revokeDialog.reason" placeholder="如：输错数量" />
            </div>
          </div>
          <div class="sheet-foot">
            <button class="btn btn-ghost" @click="revokeDialog.open = false">取消</button>
            <button class="btn" :disabled="busy" @click="doRevoke">确认撤销</button>
          </div>
        </div>
      </div>
    </template>

    <ToastStack :toasts="toasts" />
  </div>
  `;
