import { createApp, ref, reactive, computed, onMounted } from 'vue';
import { renderToast } from './render-toast.gen.js';
import { renderPublicApp } from './render-public.gen.js';
import { renderAdminApp } from './render-admin.gen.js';

// ============================== API ==============================
let sessionId = sessionStorage.getItem('mm_session') || '';

function setSession(id) {
  sessionId = id || '';
  if (sessionId) sessionStorage.setItem('mm_session', sessionId);
  else sessionStorage.removeItem('mm_session');
}

async function api(path, { method = 'GET', body, form } = {}) {
  const options = { method, headers: {} };
  if (sessionId) options.headers['x-session-id'] = sessionId;
  if (form) {
    options.body = form; // FormData：交给浏览器设置 boundary
  } else if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const response = await fetch(path, options);
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok || !payload || payload.success === false) {
    const error = new Error((payload && payload.message) || `请求失败（${response.status}）`);
    error.code = payload && payload.code;
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload.data;
}

async function downloadFile(path, filename) {
  const response = await fetch(path, { headers: sessionId ? { 'x-session-id': sessionId } : {} });
  if (!response.ok) throw new Error('导出失败');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ============================== 工具 ==============================
const TYPE_LABELS = { in: '入库', out: '取出', borrow: '借出', return: '归还', adjust: '校准' };
const TYPE_CLASS = { in: 'tag', out: 'tag-warn', borrow: 'tag-warn', return: 'tag', adjust: 'tag-muted' };

function fmtTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = value => String(value).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fmtDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isOverdue(borrow) {
  if (!borrow.dueAt || borrow.status === 'closed' || borrow.status === 'lost') return false;
  const due = new Date(borrow.dueAt);
  return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
}

function useToast() {
  const toasts = ref([]);
  let seq = 0;
  function push(message, kind = 'ok') {
    const id = ++seq;
    toasts.value.push({ id, message, kind });
    setTimeout(() => {
      toasts.value = toasts.value.filter(item => item.id !== id);
    }, 2600);
  }
  return { toasts, push };
}

const ToastStack = {
  props: ['toasts'],
  render: renderToast
};

// ============================== 前台（免登录） ==============================
const PublicApp = {
  components: { ToastStack },
  setup() {
    const { toasts, push } = useToast();

    const config = ref(null);
    const categories = ref([]);
    const materials = ref([]);
    const borrows = ref([]);
    const loading = ref(true);
    const busy = ref(false);
    const tab = ref('materials');
    const q = ref('');
    const activeCategory = ref('');
    const gateCode = ref('');
    const gateError = ref('');
    const remembered = localStorage.getItem('mm_operator') || '';

    const dialog = reactive({ open: false, kind: '', material: null, borrow: null });
    const form = reactive({
      qty: 1,
      operator: remembered,
      note: '',
      dueAt: '',
      createMode: false,
      draft: { name: '', spec: '', categoryId: '', unit: '个', needsReturn: false, location: '', safetyStock: 0 }
    });

    const openBorrowCount = computed(() => borrows.value.length);
    const isGateBlocked = computed(() => config.value && config.value.gateEnabled && !config.value.gatePassed);
    const operatorRequired = computed(() => !config.value || config.value.requireOperatorName !== false);

    async function loadConfig() {
      config.value = await api('/api/public/config');
      if (config.value.siteTitle) document.title = config.value.siteTitle;
    }

    async function loadData() {
      if (isGateBlocked.value) return;
      loading.value = true;
      try {
        const [categoryList, materialList, borrowList] = await Promise.all([
          api('/api/public/categories'),
          api(`/api/public/materials?q=${encodeURIComponent(q.value)}&categoryId=${encodeURIComponent(activeCategory.value)}`),
          api(`/api/public/borrows?q=${encodeURIComponent(tab.value === 'borrows' ? q.value : '')}`)
        ]);
        categories.value = categoryList;
        materials.value = materialList;
        borrows.value = borrowList;
      } catch (error) {
        if (error.code === 'GATE_REQUIRED') {
          config.value = { ...(config.value || {}), gatePassed: false, gateEnabled: true };
        } else {
          push(error.message, 'err');
        }
      } finally {
        loading.value = false;
      }
    }

    async function submitGate() {
      if (!gateCode.value.trim()) {
        gateError.value = '请输入口令';
        return;
      }
      try {
        await api('/api/public/gate', { method: 'POST', body: { code: gateCode.value.trim() } });
        gateError.value = '';
        await loadConfig();
        await loadData();
      } catch (error) {
        gateError.value = error.message;
      }
    }

    function openDialog(kind, payload = {}) {
      dialog.kind = kind;
      dialog.material = payload.material || null;
      dialog.borrow = payload.borrow || null;
      dialog.open = true;
      form.qty = kind === 'return' ? payload.borrow.remainingQty : 1;
      form.note = '';
      form.dueAt = '';
      form.createMode = false;
      form.draft = {
        name: '', spec: '', categoryId: categories.value[0]?.id || '', unit: '个',
        needsReturn: false, location: '', safetyStock: 0
      };
    }

    function closeDialog() {
      dialog.open = false;
      dialog.material = null;
      dialog.borrow = null;
    }

    function onSelectMaterial(event) {
      const id = event && event.target ? event.target.value : '';
      dialog.material = id ? materials.value.find(item => item.id === id) || null : null;
    }

    // 列表里没有的物资：直接打开「新建物资并入库」
    function openNewMaterial() {
      openDialog('in');
      form.createMode = true;
    }

    // 页脚：本站已运行时长（每秒刷新）
    const uptimeText = ref('');
    let uptimeTimer = null;
    function computeUptime() {
      const startedAt = config.value && config.value.siteStartedAt;
      if (!startedAt) {
        uptimeText.value = '';
        return;
      }
      const diff = Date.now() - new Date(startedAt).getTime();
      if (!Number.isFinite(diff) || diff <= 0) {
        uptimeText.value = '';
        return;
      }
      const total = Math.floor(diff / 1000);
      const days = Math.floor(total / 86400);
      const hours = Math.floor((total % 86400) / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const seconds = total % 60;
      uptimeText.value = days > 0
        ? `${days} 天 ${hours} 小时 ${minutes} 分 ${seconds} 秒`
        : `${hours} 小时 ${minutes} 分 ${seconds} 秒`;
    }

    const footerQuote = computed(() => (config.value && config.value.siteFooterQuote) || '');
    const icp = computed(() => (config.value && config.value.siteIcp) || '');

    const maxQty = computed(() => {
      if (dialog.kind === 'return') return dialog.borrow ? dialog.borrow.remainingQty : 1;
      if (dialog.kind === 'in') return 999999;
      return dialog.material ? dialog.material.stock : 0;
    });

    const afterStock = computed(() => {
      const qty = Number(form.qty) || 0;
      if (dialog.kind === 'in') return (dialog.material ? dialog.material.stock : 0) + qty;
      if (dialog.kind === 'return') return (dialog.material ? dialog.material.stock : 0) + qty;
      return (dialog.material ? dialog.material.stock : 0) - qty;
    });

    const qtyInvalid = computed(() => {
      const qty = Number(form.qty);
      return !Number.isInteger(qty) || qty < 1 || qty > maxQty.value;
    });

    const unitOf = computed(() => {
      if (dialog.kind === 'return') return dialog.borrow ? dialog.borrow.materialUnit : '';
      if (dialog.material) return dialog.material.unit;
      return form.draft.unit || '';
    });

    function step(delta) {
      const next = (Number(form.qty) || 0) + delta;
      form.qty = Math.max(1, Math.min(next, maxQty.value || 1));
    }

    function setQty(value) {
      form.qty = Math.min(value, maxQty.value || 1);
    }

    async function submit() {
      if (qtyInvalid.value) {
        push(`数量需为 1-${maxQty.value} 的整数`, 'err');
        return;
      }
      if (operatorRequired.value && !form.operator.trim()) {
        push('请填写经手人姓名', 'err');
        return;
      }
      busy.value = true;
      try {
        const operator = form.operator.trim();
        localStorage.setItem('mm_operator', operator);
        if (dialog.kind === 'in') {
          const payload = {
            qty: Number(form.qty),
            operator,
            note: form.note.trim()
          };
          if (form.createMode) {
            payload.newMaterial = {
              name: form.draft.name.trim(),
              spec: form.draft.spec.trim(),
              categoryId: form.draft.categoryId,
              unit: form.draft.unit.trim() || '个',
              needsReturn: Boolean(form.draft.needsReturn),
              location: form.draft.location.trim(),
              safetyStock: Number(form.draft.safetyStock) || 0
            };
          } else {
            if (!dialog.material) throw new Error('请选择要入库的物资');
            payload.materialId = dialog.material.id;
          }
          const data = await api('/api/public/stock-in', { method: 'POST', body: payload });
          push(`已入库 ${form.qty}${unitOf.value}，当前 ${data.afterStock}${data.material.unit}`);
        } else if (dialog.kind === 'out') {
          const data = await api('/api/public/stock-out', {
            method: 'POST',
            body: { materialId: dialog.material.id, qty: Number(form.qty), operator, note: form.note.trim() }
          });
          push(`已取出 ${form.qty}${data.material.unit}，当前剩 ${data.afterStock}${data.material.unit}`);
        } else if (dialog.kind === 'borrow') {
          const data = await api('/api/public/borrow', {
            method: 'POST',
            body: {
              materialId: dialog.material.id,
              qty: Number(form.qty),
              operator,
              note: form.note.trim(),
              dueAt: form.dueAt || null
            }
          });
          push(`已借出 ${form.qty}${data.material.unit}，当前在库 ${data.material.stock}${data.material.unit}`);
        } else if (dialog.kind === 'return') {
          const data = await api('/api/public/return', {
            method: 'POST',
            body: { borrowId: dialog.borrow.id, qty: Number(form.qty), operator, note: form.note.trim() }
          });
          push(`已归还 ${form.qty}${data.borrow.materialUnit}，该单还剩 ${data.borrow.remainingQty}${data.borrow.materialUnit}`);
        }
        closeDialog();
        await loadData();
      } catch (error) {
        push(error.message, 'err');
      } finally {
        busy.value = false;
      }
    }

    async function returnAll(borrow) {
      openDialog('return', { borrow, material: materials.value.find(item => item.id === borrow.materialId) || null });
    }

    function materialForReturn(borrow) {
      return materials.value.find(item => item.id === borrow.materialId) || null;
    }

    onMounted(async () => {
      try {
        await loadConfig();
        computeUptime();
        if (typeof window !== 'undefined') {
          uptimeTimer = setInterval(computeUptime, 1000);
        }
        await loadData();
      } catch (error) {
        push(error.message, 'err');
        loading.value = false;
      }
    });

    return {
      config, categories, materials, borrows, loading, busy, tab, q, activeCategory,
      gateCode, gateError, dialog, form, openBorrowCount, isGateBlocked, operatorRequired,
      maxQty, afterStock, qtyInvalid, unitOf, toasts, footerQuote, icp, uptimeText,
      loadData, submitGate, openDialog, closeDialog, onSelectMaterial, openNewMaterial,
      step, setQty, submit, returnAll, materialForReturn,
      fmtTime, fmtDate, isOverdue, TYPE_LABELS, TYPE_CLASS
    };
  },
  render: renderPublicApp
};

// ============================== 后台（需登录） ==============================
const AdminApp = {
  components: { ToastStack },
  setup() {
    const { toasts, push } = useToast();
    const authed = ref(false);
    const checking = ref(true);
    const busy = ref(false);
    const tab = ref('overview');
    const login = reactive({ username: 'admin', password: '' });
    const loginError = ref('');

    const overview = ref(null);
    const materials = ref([]);
    const categories = ref([]);
    const txns = ref({ total: 0, items: [] });
    const borrows = ref([]);
    const settings = ref(null);
    const audits = ref([]);
    const materialQuery = ref('');
    const txnFilter = reactive({ type: '', operator: '', materialId: '' });

    const materialDialog = reactive({ open: false, mode: 'create', id: '', file: null });
    const materialForm = reactive({
      name: '', spec: '', categoryId: '', unit: '个', needsReturn: false,
      safetyStock: 0, location: '', notes: '', active: true
    });
    const adjustDialog = reactive({ open: false, material: null, stock: 0, reason: '' });
    const revokeDialog = reactive({ open: false, txn: null, reason: '' });
    const mergeSelection = ref([]);
    const passwordForm = reactive({ currentPassword: '', newPassword: '' });

    async function loadAll() {
      busy.value = true;
      try {
        const [overviewData, materialData, categoryData, txnData, borrowData, settingData, auditData] = await Promise.all([
          api('/api/admin/overview'),
          api(`/api/admin/materials?includeInactive=1&q=${encodeURIComponent(materialQuery.value)}`),
          api('/api/admin/categories'),
          api(`/api/admin/txns?limit=100&type=${encodeURIComponent(txnFilter.type)}&operator=${encodeURIComponent(txnFilter.operator)}&materialId=${encodeURIComponent(txnFilter.materialId)}`),
          api('/api/admin/borrows'),
          api('/api/admin/settings'),
          api('/api/admin/audit?limit=30')
        ]);
        overview.value = overviewData;
        materials.value = materialData;
        categories.value = categoryData;
        txns.value = txnData;
        borrows.value = borrowData;
        settings.value = settingData;
        audits.value = auditData;
      } catch (error) {
        if (error.status === 401) {
          authed.value = false;
          setSession('');
        } else {
          push(error.message, 'err');
        }
      } finally {
        busy.value = false;
      }
    }

    async function doLogin() {
      loginError.value = '';
      try {
        const data = await api('/api/admin/login', { method: 'POST', body: { username: login.username, password: login.password } });
        setSession(data.sessionId);
        authed.value = true;
        login.password = '';
        await loadAll();
      } catch (error) {
        loginError.value = error.message;
      }
    }

    async function doLogout() {
      try {
        await api('/api/admin/logout', { method: 'POST' });
      } catch { /* 忽略 */ }
      setSession('');
      authed.value = false;
    }

    function openCreate() {
      materialDialog.open = true;
      materialDialog.mode = 'create';
      materialDialog.id = '';
      materialDialog.file = null;
      Object.assign(materialForm, {
        name: '', spec: '', categoryId: categories.value[0]?.id || '', unit: '个',
        needsReturn: false, safetyStock: 0, location: '', notes: '', active: true
      });
    }

    function openEdit(material) {
      materialDialog.open = true;
      materialDialog.mode = 'edit';
      materialDialog.id = material.id;
      materialDialog.file = null;
      Object.assign(materialForm, {
        name: material.name, spec: material.spec, categoryId: material.categoryId, unit: material.unit,
        needsReturn: material.needsReturn, safetyStock: material.safetyStock, location: material.location,
        notes: material.notes, active: material.active
      });
    }

    function onFileChange(event) {
      materialDialog.file = event.target.files?.[0] || null;
    }

    async function saveMaterial() {
      if (!materialForm.name.trim()) {
        push('请填写物资名称', 'err');
        return;
      }
      busy.value = true;
      try {
        const form = new FormData();
        for (const [key, value] of Object.entries(materialForm)) form.append(key, String(value));
        if (materialDialog.file) form.append('image', materialDialog.file);
        if (materialDialog.mode === 'create') {
          await api('/api/admin/materials', { method: 'POST', form });
          push('物资已创建');
        } else {
          await api(`/api/admin/materials/${materialDialog.id}`, { method: 'PUT', form });
          push('物资已更新');
        }
        materialDialog.open = false;
        await loadAll();
      } catch (error) {
        push(error.message, 'err');
      } finally {
        busy.value = false;
      }
    }

    async function toggleActive(material) {
      try {
        const form = new FormData();
        form.append('active', String(!material.active));
        await api(`/api/admin/materials/${material.id}`, { method: 'PUT', form });
        push(material.active ? '已停用' : '已启用');
        await loadAll();
      } catch (error) {
        push(error.message, 'err');
      }
    }

    function openAdjust(material) {
      adjustDialog.open = true;
      adjustDialog.material = material;
      adjustDialog.stock = material.stock;
      adjustDialog.reason = '';
    }

    async function saveAdjust() {
      busy.value = true;
      try {
        await api(`/api/admin/materials/${adjustDialog.material.id}/adjust`, {
          method: 'POST',
          body: { stock: Number(adjustDialog.stock), reason: adjustDialog.reason.trim() }
        });
        push('库存已校准');
        adjustDialog.open = false;
        await loadAll();
      } catch (error) {
        push(error.message, 'err');
      } finally {
        busy.value = false;
      }
    }

    function toggleMerge(id) {
      mergeSelection.value = mergeSelection.value.includes(id)
        ? mergeSelection.value.filter(item => item !== id)
        : [...mergeSelection.value, id];
    }

    async function doMerge() {
      if (mergeSelection.value.length < 2) {
        push('请至少勾选两条物资，第一条作为保留项', 'err');
        return;
      }
      const [targetId, ...sourceIds] = mergeSelection.value;
      const target = materials.value.find(item => item.id === targetId);
      if (!confirm(`将 ${sourceIds.length} 条物资合并到「${target?.name}」？源物资会停用，历史流水保留。`)) return;
      busy.value = true;
      try {
        const result = await api('/api/admin/materials/merge', { method: 'POST', body: { targetId, sourceIds } });
        push(`已合并 ${result.merged} 条，移入库存 ${result.movedStock}`);
        mergeSelection.value = [];
        await loadAll();
      } catch (error) {
        push(error.message, 'err');
      } finally {
        busy.value = false;
      }
    }

    function openRevoke(txn) {
      revokeDialog.open = true;
      revokeDialog.txn = txn;
      revokeDialog.reason = '';
    }

    async function doRevoke() {
      busy.value = true;
      try {
        await api(`/api/admin/txns/${revokeDialog.txn.id}/revoke`, {
          method: 'POST', body: { reason: revokeDialog.reason.trim() }
        });
        push('已撤销并回滚库存');
        revokeDialog.open = false;
        await loadAll();
      } catch (error) {
        push(error.message, 'err');
      } finally {
        busy.value = false;
      }
    }

    async function markLost(borrow) {
      const note = prompt('标记丢失的说明（可留空）：') ?? null;
      if (note === null) return;
      try {
        await api(`/api/admin/borrows/${borrow.id}/lost`, { method: 'POST', body: { note } });
        push('已标记丢失');
        await loadAll();
      } catch (error) {
        push(error.message, 'err');
      }
    }

    async function saveSettings() {
      busy.value = true;
      try {
        const payload = {
          siteTitle: settings.value.siteTitle,
          siteFooterQuote: settings.value.siteFooterQuote,
          siteIcp: settings.value.siteIcp,
          requireOperatorName: settings.value.requireOperatorName,
          allowAnonymousStockIn: settings.value.allowAnonymousStockIn,
          allowAnonymousCreate: settings.value.allowAnonymousCreate,
          dailyOpLimit: Number(settings.value.dailyOpLimit),
          gateEnabled: settings.value.gateEnabled,
          lowStockAlert: settings.value.lowStockAlert
        };
        if (settings.value.gateCode && settings.value.gateCode !== '__SET__') payload.gateCode = settings.value.gateCode;
        settings.value = await api('/api/admin/settings', { method: 'PUT', body: payload });
        push('设置已保存');
      } catch (error) {
        push(error.message, 'err');
      } finally {
        busy.value = false;
      }
    }

    async function changePassword() {
      try {
        await api('/api/admin/password', {
          method: 'POST',
          body: { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }
        });
        push('密码已修改');
        passwordForm.currentPassword = '';
        passwordForm.newPassword = '';
      } catch (error) {
        push(error.message, 'err');
      }
    }

    async function exportTxns() {
      try {
        await downloadFile(`/api/admin/export/txns.xlsx?type=${encodeURIComponent(txnFilter.type)}&operator=${encodeURIComponent(txnFilter.operator)}&materialId=${encodeURIComponent(txnFilter.materialId)}`, `流水-${Date.now()}.xlsx`);
      } catch (error) {
        push(error.message, 'err');
      }
    }

    async function generateQr() {
      try {
        const data = await api('/api/admin/qrcode/portal', { method: 'POST', body: {} });
        push('二维码已生成');
        window.open(data.qrcode, '_blank');
      } catch (error) {
        push(error.message, 'err');
      }
    }

    onMounted(async () => {
      try {
        const data = await api('/api/admin/check');
        authed.value = Boolean(data.isAdmin);
        if (authed.value) await loadAll();
      } catch {
        authed.value = false;
      } finally {
        checking.value = false;
      }
    });

    return {
      authed, checking, busy, tab, login, loginError, overview, materials, categories, txns, borrows,
      settings, audits, materialQuery, txnFilter, materialDialog, materialForm, adjustDialog,
      revokeDialog, mergeSelection, passwordForm, toasts,
      loadAll, doLogin, doLogout, openCreate, openEdit, onFileChange, saveMaterial, toggleActive,
      openAdjust, saveAdjust, toggleMerge, doMerge, openRevoke, doRevoke, markLost,
      saveSettings, changePassword, exportTxns, generateQr,
      fmtTime, fmtDate, isOverdue, TYPE_LABELS, TYPE_CLASS
    };
  },
  render: renderAdminApp
};

// ============================== 启动 ==============================
const isAdminRoute = window.location.pathname.startsWith('/admin');
createApp(isAdminRoute ? AdminApp : PublicApp).mount('#app');
