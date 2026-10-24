# 物资管理系统（P0 已交付）

免登录的物资台账：拿到网址就能查看、入库、取走消耗品、借用并归还器材；只有管理员登录后台。
本目录是在 `cyb3r`（设备借还系统）基础上重写业务内核的独立项目，原系统不受影响。

- 本机地址：**http://127.0.0.1:3100/**（前台，免登录）、**http://127.0.0.1:3100/admin**（后台）
- 原设备系统仍在 **http://127.0.0.1:3000/**，两者并存、互不干扰

## 快速开始

最省事的做法：**双击 `启动.bat`**（会打开一个黑窗口并保持服务运行，关掉窗口即停止），停止用 **`停止.bat`**。

命令行方式：

```powershell
# 启动（读取 .admin-password.local.txt 里的管理员密码）
powershell -ExecutionPolicy Bypass -File .\start-local.ps1

# 停止
Get-NetTCPConnection -LocalPort 3100 -State Listen | Stop-Process -Force
```

首次部署或想清空数据：

```powershell
Get-NetTCPConnection -LocalPort 3100 -State Listen | Stop-Process -Force
Remove-Item -Recurse -Force .\data, .\uploads
Get-ChildItem .\public\qrcodes -File | Remove-Item -Force
powershell -ExecutionPolicy Bypass -File .\start-local.ps1   # 会自动建库、建表、建管理员
```

灌入 4 种演示物资（幂等，重复执行只补货不重复建档）：

```powershell
node scripts/seed.mjs
```

## 验证

```powershell
node --test                        # 19 项单元/接口测试（含并发防超取、同名拦截）
node scripts/smoke.mjs             # 34 项端到端冒烟（自动起临时实例，跑完销毁，不碰正式数据）
node scripts/browser-check.mjs     # 真实浏览器（Edge/Chrome 无头）渲染检查 + 截图 ← 最权威
node scripts/check-templates.mjs   # 模板静态编译校验
node scripts/render-check.mjs      # happy-dom 挂载检查（快，但不校验 CSP）
node scripts/measure-layout.mjs 'http://127.0.0.1:3100/' 390 844   # 量横向溢出
node scripts/screenshot.mjs 'http://127.0.0.1:3100/' 390 900 docs/shot.png  # 正确模拟移动端截图
node scripts/compare-colors.mjs 'http://127.0.0.1:3100' <参考图.png>          # 配色与参考图逐项比对
```

> 注意：直接用 `msedge --window-size=390,844 --screenshot` 得到的图是**裁剪伪影**，视口与图片宽度不一致，
> 会误判成"移动端溢出"。要判断布局是否真的溢出，用 `measure-layout.mjs` 看 `scrollWidth` 是否大于 `innerWidth`。

冒烟默认用独立的临时实例（3199 端口 + 临时数据目录）。要对已运行的实例验证：

```powershell
node scripts/smoke.mjs --base=http://127.0.0.1:3100   # 注意：会写入该实例的数据
```

最近一次结果：测试 19/19、冒烟 34/34、模板 3/3、浏览器渲染 9/9 全部通过。

## 白屏问题（踩过两次，务必看）

页面空白意味着 JS 在浏览器里挂了，Vue 没挂载。实际遇到两个原因，都已修复：

**1. Vue 编译期标志未被替换**
`vue.esm-bundler.js` 需要构建时替换 `__VUE_OPTIONS_API__` 等标志，未替换会抛 `ReferenceError`。
修复：`vite.config.js` 中 `define` 了三个标志。

**2. CSP 拦截 Vue 的运行时模板编译**
运行时模板编译用 `new Function()` 生成渲染函数，被 `script-src 'self'` 拦掉：
`Uncaught EvalError: ... because 'unsafe-eval' is not an allowed source of script`。
修复（不是放宽 CSP）：
- 模板统一放在 `frontend/src/templates.mjs`；
- 构建时 `scripts/generate-templates.mjs` 用 `@vue/compiler-dom` 预编译成 `render-*.gen.js`；
- Vue 别名改为 `vue/dist/vue.runtime.esm-bundler.js`（纯运行时，不含编译器）；
- 产物从 220 KB 降到 107 KB，`new Function` 出现次数为 0。

⚠️ **不要把组件改回 `template: \`...\`` 写法**，也不要换回 `vue.esm-bundler.js`，否则白屏会复发。
改文案/结构请改 `templates.mjs`，然后重新构建（`render-*.gen.js` 会自动重新生成）。
`scripts/browser-check.mjs` 就是为了拦住这类问题：happy-dom 不执行 CSP，会漏掉第 2 类问题。

## 目录结构

```
wuzi/
├── server.js               服务端：公开接口 + 管理接口 + 静态托管
├── db/
│   ├── schema.sql          表结构（物资、流水、借用单、管理员、设置、审计）
│   └── store.js            SQL 仓储层：事务化库存扣减、撤销回滚、借还、分类迁移
├── frontend/
│   ├── index.html          页面骨架与全部样式（深青主题）
│   └── src/
│       ├── main.js         前台应用 + 后台应用（Vue 3）
│       └── templates/      页面模板（toast / public / admin），构建时预编译
├── public/assets/          校徽等静态资源
├── scripts/
│   ├── generate-templates.mjs  模板 → render 函数（构建时自动执行）
│   ├── smoke.mjs           端到端冒烟（默认起临时实例）
│   ├── browser-check.mjs   真实浏览器渲染检查（防白屏）
│   ├── render-check.mjs    happy-dom 挂载检查（快，但不校验 CSP）
│   ├── screenshot.mjs      CDP 截图（正确模拟移动端视口）
│   ├── compare-colors.mjs  配色与参考图逐项比对（含悬停态）
│   ├── measure-layout.mjs  CDP 布局测量（排查横向溢出）
│   ├── seed.mjs            演示数据
│   └── check-templates.mjs 模板静态校验
├── test/                   node:test 测试
├── docs/                   验收截图
├── data/                   运行时数据库（自动生成，勿提交）
├── uploads/                物资图片（自动生成）
└── public/qrcodes/         门户二维码（自动生成）
```

## 分类体系（重要设计决定）

分类**只表达「这是什么 / 用在哪」**，不再重复表达「是否归还」——后者是物资档案上的 `needs_return` 开关。
早期版本把「耗材 / 器材」塞进分类，和 `needs_return` 是同一件事说两遍，还会和「办公用品」语义重叠
（一支笔既是办公用品也是耗材），容易出现「器材被标成消耗品」的自相矛盾数据。

当前内置分类：

| 分类 | 放什么 | 典型归还属性 |
|---|---|---|
| 办公用品 | 打印纸、笔、文件夹、胶带 | 消耗品 |
| 活动耗材 | 手套、擦拭纸、试剂、滤芯 | 消耗品 |
| 仪器器材 | 万用表、扳手、螺丝刀、电源 | 可归还 |
| 摄影器材 | 相机、镜头、稳定器、麦克风 | 可归还 |
| 其他 | 归不进去的 | 各自定 |

- 旧的 `耗材 / 器材` 会在启动时自动迁移到 `活动耗材 / 仪器器材`，已挂的物资一并改挂，**只执行一次**
  （`settings.categoriesVersion` 记录版本，不会覆盖管理员之后的自定义分类）。
- 想要更少分类（例如只要「器材 / 耗材 / 其他」）直接在后台上改分类名或删掉多余分类即可，不需要改代码。
- 前台按分类筛选，后台可增删改分类；「其他」不允许删除。

## 视觉规范

配色**全部从参考截图取像素值**得到，可用 `scripts/compare-colors.mjs` 复验。

| 元素 | 规格 |
|---|---|
| 页面背景 | 淡黄奶油色 `#f6f1eb`（顶部 `#f8f4ed` → 底部 `#f3eee3` 极轻微过渡） |
| 顶部横幅 | 圆角 16px，`linear-gradient(100deg, #054a5b 0%, #03647c 47%, #027d9c 100%)`，左侧校徽 + 标题 + 学院副标题 |
| 主色 | `#00667f`（选中胶囊、主按钮、竖条），深一档 `#045064`（hover/按下） |
| 分类胶囊-常态 | 透明底 + `1px solid #b3c9c7` 描边 + 深青文字 |
| 分类胶囊-鼠标悬停 | 底色 `#e4f3f6` + 描边与文字转 `#00667f`（内阴影加粗 1px，不产生位移） |
| 分类胶囊-选中 | 实心 `#00667f` 底 + 白字；再次悬停转 `#045064` |
| 卡片 | `#fdfbf5` 底、圆角 14px、`1px solid #eae3d4` 描边、暖色极轻投影 |
| 标签栏 | 暖浅底 `#efe9dc` 轨道 + 选中项 `#fffdf8` 浮起 |
| 区块标题 | 左侧 4px 竖条 + 粗体标题 + 灰色说明 + 右侧计数 |
| 空状态 | **不套卡片**，直接落在淡黄底上：居中宋体大标题 + 灰色说明（对齐参考图） |
| 「没找到？」区块 | 虚线框（`1.5px dashed #b9cfd8`），左侧小标签 + 宋体标题 + 说明，右侧白底描边按钮「填写物资名称」 |
| 页脚 | 三行居中：`暨南大学网络空间安全学院 · 物资管理系统` / 宋体诗句 / `ICP 备案号 · 本站已运行 X 天 X 小时 X 分 X 秒`（每秒刷新） |
| 标题字体 | 「物资台账」「在库物资」「暂时没有…」「入库其他物资」使用**宋体**：`"SimSun", "宋体", "Songti SC", "STSong", serif`，字重 700、字距 1px |

### 配色实测对照（`node scripts/compare-colors.mjs <baseUrl> <参考图>`）

| 项目 | 参考图 | 实现值 | 色差 |
|---|---|---|---|
| 横幅左端 | `#074a5a` | `#044c5e` | 5.4 |
| 横幅中段 | `#046379` | `#03657d` | 4.6 |
| 横幅右端 | `#037995` | `#0a7e9b` | 10.5 |
| 页面背景 | `#f6f1eb` | `#f4efe5` | 6.6 |
| 胶囊-选中 | `#02647d` | `#036780` | 4.4 |
| 胶囊-悬停 | `#e4f3f6` | `#e4f3f6` | 0.0 |

> 该脚本会启动无头浏览器，用 CDP 把鼠标移到第二个胶囊上截一张图，因此**悬停态是真实渲染出来的**，不是照着 CSS 推算的。

截图见 [`docs/`](docs)：`screenshot-front-desktop.png`、`screenshot-front-mobile.png`、`screenshot-admin.png`。

## 核心设计（与旧系统最关键的差异）

1. **库存是数量，不是状态**。旧系统一台设备只有 `available/borrowed`；这里每种物资有 `stock` 整数，支持任意数量进出。
2. **不再「读全量 JSON → 改 → 写全量」**。`db/store.js` 用 `BEGIN IMMEDIATE` 事务 + `UPDATE ... WHERE stock = ?` 条件更新，并发扣减不会超取（测试里 20 个请求抢 5 件库存，恰好 5 个成功）。
3. **流水只增不改**。纠错用「撤销」：反向回滚库存、`revoked=1` 留痕、拒绝重复撤销；撤销后若库存会变负数则拒绝（说明物资已被用掉）。
4. **两类物资**。`needs_return=0` 是消耗品（取出即减），`=1` 是器材（借出可还）。借用单记录 `qty/returned_qty`，支持部分归还，还清后状态 `closed`。
5. **免登录靠留痕而不是验证**。前台只要求「经手人姓名」，配合流水、撤销、单日上限（默认 20 次/人/天）、限流。
6. **同名物资会被拦截**。前台「新建并入库」时若已存在同名在用物资，直接拒绝并回传已有物资 id，从源头减少重复建档；历史重复项由管理员「合并」清理。
7. **可对账**：任意时刻 `Σ(有效流水的 after−before) = 当前库存`，合并重复物资时也会补两条 `adjust` 流水保证等式成立（有测试守着）。

## 与策划案的差异（都已实现，不分期）

策划案里 `P0` 只做消耗品闭环、`P1` 才做借还。实际实现时借还的表结构已经就位，代码量不大，所以**一次做完了**：

| 策划案 | 状态 |
|---|---|
| P0 物资档案、免登录入库/取出、部分取用、实时库存、流水、管理员撤销、后台物资管理 | ✅ 已完成 |
| P0 合并重复物资、校准库存、低库存标记、Excel 导出 | ✅ 已完成 |
| P0 同名物资建档拦截（防重复录入） | ✅ 已完成（策划案风险清单第 3 条的落地措施） |
| P1 器材借出 / 部分归还 / 未还清单 / 标记丢失 | ✅ 已完成 |
| P1 门户二维码、单日上限、限流、口令开关（默认关） | ✅ 已完成 |
| P1 统计报表（按人/按月 Top 榜） | ⬜ 概览已有基础统计，细分报表待做 |
| P2 包装换算（1 盒 = 10 支）、多件批量提交、多仓库、逾期邮件提醒、扫码归还 | ⬜ 未做 |

## 设置项（后台「设置」页）

| 设置 | 默认 | 说明 |
|---|---|---|
| 经手人姓名必填 | 开 | 关闭后前台可不填姓名 |
| 允许匿名入库 | 开 | 关闭后仅管理员能入库 |
| 允许匿名新建物资 | 开 | 关闭后可杜绝前台重复建档 |
| 低库存预警 | 开 | 在库 ≤ 预警值时高亮 |
| 单人单日操作上限 | 20 | 按姓名统计，0 表示不限 |
| 访问口令 | 关 | 开启后前台需先输口令（功能已实现） |
| 站点标题 | 物资台账 | 显示在前台顶部横幅 |
| 页脚诗句 | 今宵酒醒何处？杨柳岸，晓风残月。 | 显示在前台页脚，留空则不显示 |
| ICP 备案号 | 豫ICP备2026040615号-1 | 显示在前台页脚，留空则不显示 |

> 页脚「本站已运行」的起始时间在首次初始化时写入 `settings.siteStartedAt`，不会因为重启而重置。

## 生产部署提示

- 必须设置 `ADMIN_PASSWORD`（未设置时用 `admin123`），`NODE_ENV=production` 时缺少该变量会拒绝启动。
- 反向代理需透传 `Host`，否则二维码里生成的地址会错；固定域名时设置 `APP_BASE_URL`。
- HTTP 部署已关闭 helmet 的 `upgrade-insecure-requests`，避免浏览器把脚本升级到 HTTPS 导致白屏。
- `data/`、`uploads/`、`public/qrcodes/` 是持久化目录，更新代码时不要覆盖。
- 本机无 npm，用随附 pnpm 或直接 `node node_modules/vite/bin/vite.js build` 构建前端。
