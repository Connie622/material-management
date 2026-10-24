// public.mjs：前台（免登录）模板。构建时由 scripts/generate-templates.mjs 预编译为 render 函数。
// 不要改回组件里的 template 选项（运行时会退回 new Function，被 CSP 拦掉导致白屏）。
export const publicTemplate = `
<div>
  <!-- 口令页 -->
  <div v-if="isGateBlocked" class="center-page">
    <div class="login-card">
      <img class="login-emblem" src="/assets/jnu-emblem.png" alt="暨南大学" />
      <div class="login-title">需要访问口令</div>
      <div class="login-sub">请向管理员索取口令后进入物资台账</div>
      <div class="field">
        <input class="input" v-model="gateCode" placeholder="请输入口令" @keyup.enter="submitGate" />
        <div v-if="gateError" class="hint hint-error">{{ gateError }}</div>
      </div>
      <button class="btn btn-block mt-16" @click="submitGate">进入</button>
    </div>
  </div>

  <template v-else>
    <!-- 顶部横幅 -->
    <header class="banner">
      <div class="banner-inner">
        <div class="banner-logo">
          <img src="/assets/jnu-emblem.png" alt="暨南大学网络空间安全学院" />
        </div>
        <div class="banner-text">
          <h1 class="banner-title">{{ config && config.siteTitle ? config.siteTitle : '物资台账' }}</h1>
          <p class="banner-sub">暨南大学网络空间安全学院</p>
        </div>
        <div class="spacer"></div>
        <button class="btn-glass" @click="openDialog('in')">
          <span class="btn-glass-plus">＋</span> 入库
        </button>
      </div>
    </header>

    <main class="page">
      <!-- 标签栏 -->
      <div class="panel seg-track">
        <button class="seg" :class="{ active: tab === 'materials' }" @click="tab = 'materials'; loadData()">物资清单</button>
        <button class="seg" :class="{ active: tab === 'borrows' }" @click="tab = 'borrows'; loadData()">
          未归还<span v-if="openBorrowCount" class="seg-badge">{{ openBorrowCount }}</span>
        </button>
      </div>

      <!-- 搜索 -->
      <div class="panel search-field">
        <span class="search-icon">🔍</span>
        <input v-model="q"
               :placeholder="tab === 'materials' ? '搜索物资名称 / 规格 / 存放位置…' : '搜索借用人 / 电话 / 物资…'"
               @keyup.enter="loadData" />
        <button v-if="q" class="search-clear" @click="q = ''; loadData()">清空</button>
      </div>

      <!-- 分类 -->
      <div v-if="tab === 'materials'" class="chips">
        <button class="chip" :class="{ active: activeCategory === '' }" @click="activeCategory = ''; loadData()">全部</button>
        <button v-for="c in categories" :key="c.id" class="chip" :class="{ active: activeCategory === c.id }"
                @click="activeCategory = c.id; loadData()">{{ c.name }}</button>
      </div>

      <!-- 区块标题 -->
      <div class="section-head">
        <div class="section-title-group">
          <span class="section-bar"></span>
          <div>
            <h2 class="section-title">{{ tab === 'materials' ? '在库物资' : '未归还清单' }}</h2>
            <p class="section-sub">
              {{ tab === 'materials' ? '显示当前在库的物资与剩余数量，消耗品可直接取出，器材需借出并归还' : '借出后的器材在此归还，支持部分归还' }}
            </p>
          </div>
        </div>
        <span class="section-count">{{ tab === 'materials' ? materials.length + ' 种' : borrows.length + ' 条' }}</span>
      </div>

      <!-- 内容区 -->
      <div v-if="loading" class="panel loading-block">
        <div class="spin"></div>加载中…
      </div>

      <template v-else-if="tab === 'materials'">
        <div v-if="!materials.length" class="empty-plain">
          <div class="empty-plain-title">暂时没有在库物资</div>
          <p class="empty-plain-sub">物资入库后会显示在这里，可直接取出或借出。</p>
        </div>
        <div v-else class="panel">
        <ul class="rows">
          <li v-for="m in materials" :key="m.id" class="row" :class="{ 'row-idle': m.stock === 0 }">
            <div class="row-thumb">
              <img v-if="m.imageThumb" :src="m.imageThumb" :alt="m.name" />
              <span v-else>{{ m.name.slice(0, 1) }}</span>
            </div>
            <div class="row-main">
              <div class="row-title">
                <span class="row-name">{{ m.name }}</span>
                <span v-if="m.spec" class="tag tag-muted">{{ m.spec }}</span>
                <span v-if="m.needsReturn" class="tag tag-brand">可归还</span>
                <span v-if="m.lowStock" class="tag tag-warn">库存偏低</span>
                <span v-if="m.stock === 0" class="tag tag-muted">已无库存</span>
              </div>
              <div class="row-meta">
                {{ m.categoryName }}<template v-if="m.location"> · {{ m.location }}</template><template v-if="m.needsReturn && m.borrowedOut > 0"> · 借出 {{ m.borrowedOut }}{{ m.unit }}</template>
              </div>
            </div>
            <div class="row-stock">
              <span class="stock-num" :class="m.stock === 0 ? 'stock-zero' : (m.lowStock ? 'stock-low' : 'stock-ok')">{{ m.stock }}</span>
              <span class="stock-unit">{{ m.unit }}</span>
            </div>
            <div class="row-actions">
              <button v-if="!m.needsReturn" class="btn btn-sm" :disabled="m.stock === 0" @click="openDialog('out', { material: m })">取出</button>
              <button v-else class="btn btn-sm" :disabled="m.stock === 0" @click="openDialog('borrow', { material: m })">借出</button>
            </div>
          </li>
        </ul>
        </div>

        <div class="other-block">
          <div>
            <div class="other-block-label">没找到要取的物资？</div>
            <h3 class="other-block-title">入库其他物资</h3>
            <p class="other-block-desc">列表里还没有的物资，可以直接填写名称与数量登记入库。</p>
          </div>
          <button class="other-block-btn" @click="openNewMaterial">填写物资名称</button>
        </div>
      </template>

      <template v-else>
        <div v-if="!borrows.length" class="empty-plain">
          <div class="empty-plain-title">暂时没有未归还的器材</div>
          <p class="empty-plain-sub">器材借出后会出现在这里，可在此归还。</p>
        </div>
        <div v-else class="panel">
        <ul class="rows">
          <li v-for="b in borrows" :key="b.id" class="row">
            <div class="row-thumb row-thumb-plain">{{ b.borrower.slice(0, 1) }}</div>
            <div class="row-main">
              <div class="row-title">
                <span class="row-name">{{ b.borrower }}</span>
                <span class="tag tag-muted">{{ b.materialName }}</span>
                <span v-if="isOverdue(b)" class="tag tag-danger">已逾期</span>
                <span v-if="b.status === 'lost'" class="tag tag-danger">已标记丢失</span>
                <span v-else-if="b.status === 'partial'" class="tag tag-warn">部分归还</span>
              </div>
              <div class="row-meta">
                {{ fmtTime(b.createdAt) }} 借出 · 借 {{ b.qty }}{{ b.materialUnit }} · 已还 {{ b.returnedQty }}<template v-if="b.borrowerPhone"> · {{ b.borrowerPhone }}</template><template v-if="b.dueAt"> · 应还 {{ fmtDate(b.dueAt) }}</template>
              </div>
            </div>
            <div class="row-stock">
              <span class="stock-num stock-low">{{ b.remainingQty }}</span>
              <span class="stock-unit">未还</span>
            </div>
            <div class="row-actions">
              <button class="btn btn-sm" :disabled="b.status === 'lost'"
                      @click="openDialog('return', { borrow: b, material: materialForReturn(b) })">归还</button>
            </div>
          </li>
        </ul>
        </div>
      </template>

      <footer class="site-footer">
        <span class="site-footer-line">暨南大学网络空间安全学院 · 物资管理系统</span>
        <span v-if="footerQuote" class="site-footer-line site-footer-quote">{{ footerQuote }}</span>
        <span class="site-footer-line site-footer-meta">
          <span v-if="icp">{{ icp }}</span>
          <span v-if="icp && uptimeText" class="site-footer-sep">·</span>
          <span v-if="uptimeText">本站已运行 {{ uptimeText }}</span>
        </span>
      </footer>
    </main>

    <!-- 操作弹窗 -->
    <div v-if="dialog.open" class="mask" @click.self="closeDialog">
      <div class="sheet">
        <button class="close-x" @click="closeDialog">✕</button>
        <div class="sheet-title">
          <template v-if="dialog.kind === 'in'">入库登记</template>
          <template v-else-if="dialog.kind === 'out'">取出：{{ dialog.material ? dialog.material.name : '' }}</template>
          <template v-else-if="dialog.kind === 'borrow'">借出：{{ dialog.material ? dialog.material.name : '' }}</template>
          <template v-else>归还：{{ dialog.borrow ? dialog.borrow.materialName : '' }}</template>
        </div>
        <div class="sheet-sub" v-if="dialog.kind === 'in' && dialog.material">当前库存 {{ dialog.material.stock }}{{ dialog.material.unit }}</div>
        <div class="sheet-sub" v-else-if="dialog.kind === 'out' || dialog.kind === 'borrow'">当前在库 {{ dialog.material ? dialog.material.stock : 0 }}{{ dialog.material ? dialog.material.unit : '' }}</div>
        <div class="sheet-sub" v-else-if="dialog.kind === 'return'">该单未还 {{ dialog.borrow ? dialog.borrow.remainingQty : 0 }}{{ dialog.borrow ? dialog.borrow.materialUnit : '' }}</div>

        <div class="sheet-body">
          <template v-if="dialog.kind === 'in'">
            <div class="inline">
              <button class="chip" :class="{ active: !form.createMode }" @click="form.createMode = false">已有物资</button>
              <button class="chip" :class="{ active: form.createMode }" @click="form.createMode = true">新建物资</button>
            </div>

            <div v-if="!form.createMode" class="field">
              <label>选择物资</label>
              <select class="select" :value="dialog.material ? dialog.material.id : ''" @change="onSelectMaterial">
                <option value="">请选择…</option>
                <option v-for="m in materials" :key="m.id" :value="m.id">{{ m.name }}<template v-if="m.spec">（{{ m.spec }}）</template> · 现有 {{ m.stock }}{{ m.unit }}</option>
              </select>
            </div>

            <template v-else>
              <div class="row-2">
                <div class="field">
                  <label>物资名称 *</label>
                  <input class="input" v-model="form.draft.name" placeholder="如：打印纸 A4" />
                </div>
                <div class="field">
                  <label>规格型号</label>
                  <input class="input" v-model="form.draft.spec" placeholder="如：70g / 500 张" />
                </div>
              </div>
              <div class="row-2">
                <div class="field">
                  <label>分类</label>
                  <select class="select" v-model="form.draft.categoryId">
                    <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                </div>
                <div class="field">
                  <label>计量单位</label>
                  <input class="input" v-model="form.draft.unit" placeholder="个 / 包 / 支" />
                </div>
              </div>
              <div class="row-2">
                <div class="field">
                  <label>存放位置</label>
                  <input class="input" v-model="form.draft.location" placeholder="如：A 柜 2 层" />
                </div>
                <div class="field">
                  <label>低库存预警值</label>
                  <input class="input" type="number" min="0" v-model.number="form.draft.safetyStock" />
                </div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="form.draft.needsReturn" />
                <span class="track"></span>
                <span class="switch-text">此物资需要归还（器材类）</span>
              </label>
            </template>
          </template>

          <div class="field">
            <label>数量（{{ unitOf || '单位' }}）</label>
            <div class="stepper">
              <button type="button" @click="step(-1)">−</button>
              <input type="number" min="1" :max="maxQty" v-model.number="form.qty" />
              <button type="button" @click="step(1)">＋</button>
            </div>
            <div class="quick">
              <button type="button" @click="setQty(1)">1</button>
              <button type="button" @click="setQty(2)">2</button>
              <button type="button" @click="setQty(5)">5</button>
              <button type="button" @click="setQty(10)">10</button>
            </div>
          </div>

          <div class="preview" :class="{ bad: qtyInvalid }">
            <template v-if="dialog.kind === 'in'">入库后库存：{{ afterStock }}{{ unitOf }}</template>
            <template v-else-if="dialog.kind === 'return'">归还后在库：{{ afterStock }}{{ unitOf }}，该单剩余：{{ Math.max(0, (dialog.borrow ? dialog.borrow.remainingQty : 0) - (Number(form.qty) || 0)) }}{{ unitOf }}</template>
            <template v-else>{{ qtyInvalid ? '数量超出范围' : '操作后剩余：' + afterStock + unitOf }}</template>
          </div>

          <div class="field">
            <label>经手人姓名 {{ operatorRequired ? '*' : '（选填）' }}</label>
            <input class="input" v-model="form.operator" placeholder="请填写你的姓名，用于留痕" />
          </div>

          <div v-if="dialog.kind === 'borrow'" class="field">
            <label>预计归还日期（选填）</label>
            <input class="input" type="date" v-model="form.dueAt" />
          </div>

          <div class="field">
            <label>备注（选填）</label>
            <textarea class="textarea" v-model="form.note" placeholder="用途、来源等"></textarea>
          </div>
        </div>

        <div class="sheet-foot">
          <button class="btn btn-ghost" @click="closeDialog">取消</button>
          <button class="btn" :disabled="busy || qtyInvalid" @click="submit">
            {{ busy ? '提交中…' : (dialog.kind === 'in' ? '确认入库' : dialog.kind === 'out' ? '确认取出' : dialog.kind === 'borrow' ? '确认借出' : '确认归还') }}
          </button>
        </div>
      </div>
    </div>
  </template>

  <ToastStack :toasts="toasts" />
</div>
`;
