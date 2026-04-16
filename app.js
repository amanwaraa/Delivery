import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  off
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCnLAY7zQyBy7gUuL9wszt9aEhiJgvRmxI",
  authDomain: "shop-d52dc.firebaseapp.com",
  databaseURL: "https://shop-d52dc-default-rtdb.firebaseio.com",
  projectId: "shop-d52dc",
  storageBucket: "shop-d52dc.appspot.com",
  messagingSenderId: "97580537866",
  appId: "1:97580537866:web:abc46e5a2f527b6300a7f3",
  measurementId: "G-956RQMBP42"
};

const app = initializeApp(firebaseConfig);
getAnalytics(app);
const db = getDatabase(app);

const PREFIX = "DFDFG";
const LOCAL_SESSION_KEY = `${PREFIX}_USER_SESSION`;
const LOCAL_APP_MODE_KEY = `${PREFIX}_APP_MODE`;
const LOCAL_UI_CONFIG_KEY = `${PREFIX}_UI_CONFIG`;
const BACKUP_VERSION = 1;

let currentStoreId = localStorage.getItem("activeStoreId") || "default";
let cart = [];
let scanner = null;
let scanTarget = "pos";
let cameraDevices = [];
let currentCameraIndex = 0;
let currentInvoiceId = null;
let editingInvoiceId = null;
let licenseWatcher = null;

let productPageSize = 10;
let invoicePageSize = 10;
let productsCurrentLimit = 10;
let invoicesCurrentLimit = 10;

let storesListenerRef = null;
let productsListenerRef = null;
let invoicesListenerRef = null;
let purchasesListenerRef = null;
let licenseListenerRef = null;

let scannerTrack = null;
let scannerTorchOn = false;
let torchSupported = false;

function currentLicenseKey() {
  const session = getLocalSession();
  return session?.key || null;
}

function sanitizeKey(key) {
  return String(key).replace(/[.#$/[\]]/g, "_");
}

function baseClientPath() {
  const key = currentLicenseKey();
  if (!key) return null;
  return `${PREFIX}_clients/${sanitizeKey(key)}`;
}

function pathLicenses() { return `${PREFIX}_licenses`; }
function pathClientStores() { return `${baseClientPath()}/stores`; }
function pathClientProducts() { return `${baseClientPath()}/products`; }
function pathClientInvoices() { return `${baseClientPath()}/invoices`; }
function pathClientPurchases() { return `${baseClientPath()}/purchases`; }
function pathClientCounters() { return `${baseClientPath()}/counters`; }
function pathClientSettings() { return `${baseClientPath()}/settings`; }
function pathClientBackups() { return `${baseClientPath()}/backups`; }
function pathClientUiConfig() { return `${baseClientPath()}/uiConfig`; }

document.addEventListener("DOMContentLoaded", async () => {
  lucide.createIcons();
  bindBaseEvents();
  await initApp();
});

function bindBaseEvents() {
  document.getElementById("loginBtn")?.addEventListener("click", handleLicenseLogin);
  document.getElementById("goToLoginBtn")?.addEventListener("click", goToLoginFromExpired);
  document.getElementById("openNewProductBtn")?.addEventListener("click", openNewProduct);
  document.getElementById("createInvoiceBtn")?.addEventListener("click", checkout);
  document.getElementById("saveProductBtn")?.addEventListener("click", saveProduct);
  document.getElementById("openPurchaseModalBtn")?.addEventListener("click", openPurchaseModal);
  document.getElementById("savePurchaseBtn")?.addEventListener("click", savePurchase);
  document.getElementById("createStoreBtn")?.addEventListener("click", createNewStore);
  document.getElementById("saveSettingsBtn")?.addEventListener("click", saveSettings);
  document.getElementById("logoutBtn")?.addEventListener("click", logoutUser);
  document.getElementById("backFromInvoiceBtn")?.addEventListener("click", backFromInvoicePage);
  document.getElementById("printInvoiceBtn")?.addEventListener("click", printInvoicePage);
  document.getElementById("exportInvoiceImageBtn")?.addEventListener("click", () => exportInvoicePage("image"));
  document.getElementById("exportInvoicePdfBtn")?.addEventListener("click", () => exportInvoicePage("pdf"));
  document.getElementById("downloadBackupBtn")?.addEventListener("click", downloadBackupFile);
  document.getElementById("saveCloudBackupBtn")?.addEventListener("click", saveCloudBackup);
  document.getElementById("restoreBackupInput")?.addEventListener("change", restoreBackupFromFile);
  document.getElementById("appModeSelect")?.addEventListener("change", () => applyAppModePreview());
  document.getElementById("inventorySearch")?.addEventListener("input", resetProductsAndRender);
  document.getElementById("invSearchQuery")?.addEventListener("input", resetInvoicesAndRender);
  document.getElementById("invoiceStatusFilter")?.addEventListener("change", resetInvoicesAndRender);
  document.getElementById("reportFilter")?.addEventListener("change", renderReports);
  document.getElementById("posSearch")?.addEventListener("input", searchPosProducts);
  document.getElementById("posDiscount")?.addEventListener("input", calculateTotal);
  document.getElementById("setStoreLogo")?.addEventListener("input", e => previewStoreLogo(e.target.value));
  document.getElementById("barcodeImageInputPos")?.addEventListener("change", e => scanBarcodeFromImage(e, "pos"));
  document.getElementById("licenseKeyInput")?.addEventListener("keydown", e => {
    if (e.key === "Enter") handleLicenseLogin();
  });

  document.addEventListener("click", e => {
    const searchWrap = document.getElementById("posSearchResults");
    const searchInput = document.getElementById("posSearch");
    if (searchWrap && !searchWrap.contains(e.target) && e.target !== searchInput) {
      searchWrap.classList.add("hidden");
    }
  });
}

async function initApp() {
  await bootSessionState();
}

async function showLoader(text = "جاري المعالجة...", duration = 500) {
  const loader = document.getElementById("loader");
  const circle = document.getElementById("progressCircle");
  const textEl = document.getElementById("loaderText");

  loader.classList.remove("hidden");
  textEl.innerText = text;

  let progress = 0;
  return new Promise(resolve => {
    const interval = setInterval(() => {
      progress += 20;
      circle.style.setProperty("--progress", progress);
      circle.setAttribute("data-progress", progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          loader.classList.add("hidden");
          resolve();
        }, 100);
      }
    }, duration / 5);
  });
}

function showLogin(message = "") {
  document.getElementById("mainApp").classList.add("hidden");
  document.getElementById("invoicePage").classList.add("hidden");
  document.getElementById("licenseExpiredPage").classList.add("hidden");
  document.getElementById("loginPage").classList.remove("hidden");

  const err = document.getElementById("loginError");
  if (message) {
    err.innerText = message;
    err.classList.remove("hidden");
  } else {
    err.classList.add("hidden");
    err.innerText = "";
  }
}

function showExpired(message = "انتهى وقت المفتاح أو عدد الاستخدامات المتاحة.") {
  document.getElementById("mainApp").classList.add("hidden");
  document.getElementById("invoicePage").classList.add("hidden");
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("licenseExpiredPage").classList.remove("hidden");
  document.getElementById("expiredMessage").innerText = message;
  lucide.createIcons();
}

function showApp() {
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("licenseExpiredPage").classList.add("hidden");
  document.getElementById("mainApp").classList.remove("hidden");
}

function getLocalSession() {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalSession(data) {
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(data));
}

function clearLocalSession() {
  localStorage.removeItem(LOCAL_SESSION_KEY);
}

function getAppMode() {
  return localStorage.getItem(LOCAL_APP_MODE_KEY) || "normal";
}

function setAppMode(mode) {
  localStorage.setItem(LOCAL_APP_MODE_KEY, mode === "pro" ? "pro" : "normal");
}

function getDefaultUiConfig() {
  return {
    tab_pos: true,
    tab_products: true,
    tab_invoices: true,
    tab_purchases: true,
    tab_reports: true,
    tab_stores: true,
    tab_settings: true,
    feature_purchases: true,
    feature_reports: true
  };
}

function getUiConfig() {
  try {
    const raw = localStorage.getItem(LOCAL_UI_CONFIG_KEY);
    return raw ? { ...getDefaultUiConfig(), ...JSON.parse(raw) } : getDefaultUiConfig();
  } catch {
    return getDefaultUiConfig();
  }
}

function setUiConfig(cfg) {
  localStorage.setItem(LOCAL_UI_CONFIG_KEY, JSON.stringify({ ...getDefaultUiConfig(), ...cfg }));
}

function getDurationMs(type, value) {
  if (type === "unlimited") return null;
  const n = Number(value || 0);
  if (type === "minute") return n * 60 * 1000;
  if (type === "hour") return n * 60 * 60 * 1000;
  if (type === "day") return n * 24 * 60 * 60 * 1000;
  if (type === "month") return n * 30 * 24 * 60 * 60 * 1000;
  if (type === "year") return n * 365 * 24 * 60 * 60 * 1000;
  return null;
}

function formatDateTime(dateString) {
  if (!dateString) return "غير محدد";
  try {
    return new Date(dateString).toLocaleString("ar-EG");
  } catch {
    return dateString;
  }
}

function formatRemaining(ms) {
  if (ms === null) return "غير محدود";
  if (ms <= 0) return "منتهي";

  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);

  if (days > 0) return `${days} يوم ${hours} ساعة`;
  if (hours > 0) return `${hours} ساعة ${minutes} دقيقة`;
  return `${minutes} دقيقة`;
}

function durationTypeLabel(type) {
  const map = {
    minute: "دقائق",
    hour: "ساعات",
    day: "أيام",
    month: "شهور",
    year: "سنوات",
    unlimited: "غير محدود"
  };
  return map[type] || type || "-";
}

function normalizeLogo(url) {
  return (url || "").trim();
}

function setImageOrHide(imgEl, url) {
  const clean = normalizeLogo(url);
  if (clean) {
    imgEl.src = clean;
    imgEl.classList.remove("hidden");
  } else {
    imgEl.removeAttribute("src");
    imgEl.classList.add("hidden");
  }
}

window.previewStoreLogo = function(value) {
  setImageOrHide(document.getElementById("settingsLogoPreview"), value);
};

function statusLabel(status) {
  if (status === "paid") return "تم الدفع";
  if (status === "review") return "قيد المراجعة";
  return "لم يدفع";
}

function statusClass(status) {
  if (status === "paid") return "status-paid";
  if (status === "review") return "status-review";
  return "status-unpaid";
}

function applyModeBadges() {
  const mode = getAppMode();
  const isPro = mode === "pro";

  const sideModeText = document.getElementById("sideModeText");
  const versionBadge = document.getElementById("versionBadge");
  const invoiceModeBadge = document.getElementById("invoiceModeBadge");
  const settingsVersionBadge = document.getElementById("settingsVersionBadge");

  sideModeText.innerText = isPro ? "البرو" : "العادية";

  versionBadge.className = `feature-badge ${isPro ? "badge-pro" : "badge-normal"}`;
  versionBadge.innerHTML = `<i data-lucide="${isPro ? "crown" : "layers-3"}"></i>${isPro ? "نسخة برو" : "نسخة عادية"}`;

  invoiceModeBadge.className = `feature-badge ${isPro ? "badge-pro" : "badge-normal"}`;
  invoiceModeBadge.innerHTML = `<i data-lucide="${isPro ? "sparkles" : "shield-check"}"></i>${isPro ? "برو" : "عادي"}`;

  settingsVersionBadge.className = `feature-badge ${isPro ? "badge-pro" : "badge-normal"}`;
  settingsVersionBadge.innerHTML = `<i data-lucide="${isPro ? "crown" : "shield-check"}"></i>${isPro ? "النسخة البرو" : "النسخة العادية"}`;

  document.getElementById("appModeSelect").value = mode;
  lucide.createIcons();
}

function applyUiVisibility() {
  const mode = getAppMode();
  const cfg = getUiConfig();
  const allowCustom = mode === "pro";

  const map = [
    ["pos", cfg.tab_pos],
    ["products", cfg.tab_products],
    ["invoices", cfg.tab_invoices],
    ["purchases", cfg.tab_purchases && cfg.feature_purchases],
    ["reports", cfg.tab_reports && cfg.feature_reports],
    ["stores", cfg.tab_stores],
    ["settings", cfg.tab_settings]
  ];

  map.forEach(([tab, visible]) => {
    const btn = document.querySelector(`[data-tab="${tab}"]`);
    const section = document.getElementById(`tab-${tab}`);
    const finalVisible = allowCustom ? visible : true;
    if (btn) btn.classList.toggle("hidden", !finalVisible);
    if (section && !finalVisible) section.classList.add("hidden");
  });

  document.querySelectorAll(".feature-toggle").forEach(toggle => {
    const key = toggle.dataset.feature;
    toggle.checked = cfg[key] !== false;
    toggle.disabled = !allowCustom;
  });

  applyModeBadges();
}

function updateLicenseUIFromSession() {
  const session = getLocalSession();
  if (!session) return;

  const remaining = session.expiresAt ? (new Date(session.expiresAt).getTime() - Date.now()) : null;
  document.getElementById("sideLicenseKey").innerText = session.key || "-";
  document.getElementById("sideLicenseRemaining").innerText = formatRemaining(remaining);

  document.getElementById("setCurrentKey").innerText = session.key || "-";
  document.getElementById("setCurrentLicenseType").innerText = durationTypeLabel(session.durationType);
  document.getElementById("setCurrentLicenseStart").innerText = formatDateTime(session.startedAt);
  document.getElementById("setCurrentLicenseEnd").innerText = session.expiresAt ? formatDateTime(session.expiresAt) : "غير محدود";
  document.getElementById("setCurrentLicenseRemaining").innerText = formatRemaining(remaining);
}

function startLicenseWatcher() {
  if (licenseWatcher) clearInterval(licenseWatcher);
  licenseWatcher = setInterval(() => {
    const session = getLocalSession();
    if (!session) {
      clearInterval(licenseWatcher);
      return;
    }
    updateLicenseUIFromSession();
    if (session.expiresAt && Date.now() >= new Date(session.expiresAt).getTime()) {
      clearLocalSession();
      localStorage.removeItem("activeStoreId");
      showExpired("انتهى وقت المفتاح.");
    }
  }, 1000);
}

async function bootSessionState() {
  const session = getLocalSession();
  if (!session) {
    showLogin();
    return;
  }

  if (session.expiresAt && Date.now() >= new Date(session.expiresAt).getTime()) {
    clearLocalSession();
    showExpired("انتهى وقت المفتاح.");
    return;
  }

  await ensureClientDefaults();
  await loadCurrentStore();
  attachRealtimeListeners();
  showApp();
  applyUiVisibility();
  switchTab("pos");
  updateLicenseUIFromSession();
  startLicenseWatcher();
}

async function ensureClientDefaults() {
  if (!baseClientPath()) return;

  const storeSnap = await get(ref(db, `${pathClientStores()}/default`));
  if (!storeSnap.exists()) {
    await set(ref(db, `${pathClientStores()}/default`), {
      id: "default",
      name: "المحل الرئيسي",
      logo: "",
      createdAt: new Date().toISOString()
    });
  }

  const counterSnap = await get(ref(db, `${pathClientCounters()}/invoiceAutoNumber`));
  if (!counterSnap.exists()) {
    await set(ref(db, `${pathClientCounters()}/invoiceAutoNumber`), 0);
  }

  const settingsSnap = await get(ref(db, pathClientSettings()));
  if (!settingsSnap.exists()) {
    await set(ref(db, pathClientSettings()), {
      createdAt: new Date().toISOString(),
      appMode: getAppMode()
    });
  } else {
    const settings = settingsSnap.val() || {};
    if (settings.appMode) setAppMode(settings.appMode);
    if (settings.uiConfig) setUiConfig(settings.uiConfig);
  }

  const uiSnap = await get(ref(db, pathClientUiConfig()));
  if (uiSnap.exists()) {
    setUiConfig(uiSnap.val() || getDefaultUiConfig());
  } else {
    await set(ref(db, pathClientUiConfig()), getUiConfig());
  }

  const purchasesSnap = await get(ref(db, pathClientPurchases()));
  if (!purchasesSnap.exists()) {
    await set(ref(db, pathClientPurchases()), {});
  }

  const active = localStorage.getItem("activeStoreId");
  const activeSnap = await get(ref(db, `${pathClientStores()}/${active || "default"}`));
  if (!active || !activeSnap.exists()) {
    currentStoreId = "default";
    localStorage.setItem("activeStoreId", "default");
  } else {
    currentStoreId = active;
  }
}

async function getAllStores() {
  const snap = await get(ref(db, pathClientStores()));
  return snap.exists() ? Object.values(snap.val()) : [];
}

async function getAllProducts() {
  const snap = await get(ref(db, pathClientProducts()));
  return snap.exists() ? Object.values(snap.val()) : [];
}

async function getAllInvoices() {
  const snap = await get(ref(db, pathClientInvoices()));
  return snap.exists() ? Object.values(snap.val()) : [];
}

async function getAllPurchases() {
  const snap = await get(ref(db, pathClientPurchases()));
  return snap.exists() ? Object.values(snap.val()) : [];
}

async function loadCurrentStore() {
  const snap = await get(ref(db, `${pathClientStores()}/${currentStoreId}`));
  const store = snap.exists() ? snap.val() : null;
  if (store) {
    document.getElementById("sideStoreName").innerText = store.name || "اسم المحل";
    setImageOrHide(document.getElementById("sideLogo"), store.logo);
    document.getElementById("invPageStoreName").innerText = store.name || "المحل";
    setImageOrHide(document.getElementById("invPageLogo"), store.logo);
  }
}

async function refreshSessionFromLicense() {
  const session = getLocalSession();
  if (!session?.key) return;

  const snap = await get(ref(db, `${pathLicenses()}/${sanitizeKey(session.key)}`));
  if (!snap.exists()) {
    clearLocalSession();
    showExpired("تم حذف المفتاح");
    return;
  }

  const lic = snap.val();
  const now = Date.now();

  if ((lic.status || "active") === "inactive") {
    clearLocalSession();
    showExpired("تم إيقاف هذا المفتاح");
    return;
  }

  const startedAt = lic.startedAt || session.startedAt || null;
  const expiresAt = lic.expiresAt || null;

  if (startedAt && new Date(startedAt).getTime() > now) {
    setLocalSession({
      ...session,
      durationType: lic.durationType || session.durationType,
      durationValue: lic.durationValue || session.durationValue,
      startedAt,
      expiresAt
    });
    updateLicenseUIFromSession();
    return;
  }

  if (expiresAt && now >= new Date(expiresAt).getTime()) {
    clearLocalSession();
    showExpired("انتهى وقت المفتاح");
    return;
  }

  setLocalSession({
    ...session,
    durationType: lic.durationType || session.durationType,
    durationValue: lic.durationValue || session.durationValue,
    startedAt,
    expiresAt
  });
  updateLicenseUIFromSession();
}

function attachRealtimeListeners() {
  detachRealtimeListeners();

  storesListenerRef = ref(db, pathClientStores());
  productsListenerRef = ref(db, pathClientProducts());
  invoicesListenerRef = ref(db, pathClientInvoices());
  purchasesListenerRef = ref(db, pathClientPurchases());

  const session = getLocalSession();
  if (session?.key) {
    licenseListenerRef = ref(db, `${pathLicenses()}/${sanitizeKey(session.key)}`);
    onValue(licenseListenerRef, async () => {
      await refreshSessionFromLicense();
    });
  }

  onValue(storesListenerRef, async () => {
    const activeSnap = await get(ref(db, `${pathClientStores()}/${currentStoreId}`));
    if (!activeSnap.exists()) {
      currentStoreId = "default";
      localStorage.setItem("activeStoreId", "default");
    }
    await loadCurrentStore();
    if (!document.getElementById("tab-stores").classList.contains("hidden")) renderStoresList();
  });

  onValue(productsListenerRef, async () => {
    if (!document.getElementById("tab-products").classList.contains("hidden")) renderProducts();
    const q = document.getElementById("posSearch").value.trim();
    if (q) searchPosProducts();
  });

  onValue(invoicesListenerRef, async () => {
    if (!document.getElementById("tab-invoices").classList.contains("hidden")) renderInvoices();
    if (!document.getElementById("tab-reports").classList.contains("hidden")) renderReports();
  });

  onValue(purchasesListenerRef, async () => {
    if (!document.getElementById("tab-purchases").classList.contains("hidden")) renderPurchases();
    if (!document.getElementById("tab-reports").classList.contains("hidden")) renderReports();
  });
}

function detachRealtimeListeners() {
  if (storesListenerRef) off(storesListenerRef);
  if (productsListenerRef) off(productsListenerRef);
  if (invoicesListenerRef) off(invoicesListenerRef);
  if (purchasesListenerRef) off(purchasesListenerRef);
  if (licenseListenerRef) off(licenseListenerRef);
}

window.handleLicenseLogin = async function() {
  const key = document.getElementById("licenseKeyInput").value.trim();
  const err = document.getElementById("loginError");
  err.classList.add("hidden");

  if (!key) {
    err.innerText = "يرجى إدخال المفتاح";
    err.classList.remove("hidden");
    return;
  }

  await showLoader("جاري التحقق من المفتاح...");

  const snap = await get(ref(db, `${pathLicenses()}/${sanitizeKey(key)}`));
  if (!snap.exists()) {
    showLogin("المفتاح غير موجود");
    return;
  }

  const lic = snap.val();
  if ((lic.status || "active") === "inactive") {
    showLogin("هذا المفتاح غير مفعل");
    return;
  }

  const maxLogins = lic.maxLogins === "unlimited" ? null : Number(lic.maxLogins ?? 1);
  const usedLogins = Number(lic.usedLogins || 0);

  if (maxLogins !== null && usedLogins >= maxLogins) {
    showExpired("انتهت عدد الأجهزة المتاحة لمفتاحك");
    return;
  }

  const now = new Date();
  const durationType = lic.durationType || "unlimited";
  const durationValue = Number(lic.durationValue || 0);
  const durationMs = getDurationMs(durationType, durationValue);

  let startedAt = lic.startedAt || now.toISOString();
  let expiresAt = lic.expiresAt || null;

  if (!lic.startedAt) {
    startedAt = now.toISOString();
    expiresAt = durationMs === null ? null : new Date(now.getTime() + durationMs).toISOString();
  } else if (expiresAt && Date.now() >= new Date(expiresAt).getTime()) {
    showExpired("انتهى وقت هذا المفتاح");
    return;
  }

  await update(ref(db, `${pathLicenses()}/${sanitizeKey(key)}`), {
    startedAt,
    expiresAt,
    usedLogins: usedLogins + 1,
    lastLoginAt: new Date().toISOString()
  });

  setLocalSession({
    key,
    durationType,
    durationValue,
    startedAt,
    expiresAt,
    loginAt: new Date().toISOString()
  });

  currentStoreId = "default";
  localStorage.setItem("activeStoreId", "default");

  await ensureClientDefaults();
  await loadCurrentStore();
  attachRealtimeListeners();

  document.getElementById("licenseKeyInput").value = "";
  showApp();
  applyUiVisibility();
  switchTab("pos");
  updateLicenseUIFromSession();
  startLicenseWatcher();
};

window.goToLoginFromExpired = function() {
  showLogin();
};

function activateNav(tabId) {
  document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById(`tab-${tabId}`)?.classList.remove("hidden");
  document.querySelector(`[data-tab="${tabId}"]`)?.classList.add("active");
}

window.switchTab = async function(tabId) {
  const btn = document.querySelector(`[data-tab="${tabId}"]`);
  if (btn?.classList.contains("hidden")) return;

  activateNav(tabId);

  if (tabId === "products") await resetProductsAndRender();
  if (tabId === "invoices") await resetInvoicesAndRender();
  if (tabId === "purchases") await renderPurchases();
  if (tabId === "reports") await renderReports();
  if (tabId === "stores") await renderStoresList();
  if (tabId === "settings") await loadSettingsPage();

  lucide.createIcons();
};

window.createNewStore = async function() {
  const name = document.getElementById("newStoreName").value.trim();
  if (!name) return;

  await showLoader("جاري إنشاء المحل...");

  const id = "store_" + Date.now();
  await set(ref(db, `${pathClientStores()}/${id}`), {
    id,
    name,
    logo: "",
    createdAt: new Date().toISOString()
  });

  document.getElementById("newStoreName").value = "";
  toggleModal("storeModal", false);
};

async function renderStoresList() {
  const grid = document.getElementById("storesGrid");
  grid.innerHTML = "";

  await showLoader("جاري تحميل المحلات...");
  const stores = await getAllStores();
  stores.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  stores.forEach(store => {
    const active = store.id === currentStoreId;
    const logoHtml = normalizeLogo(store.logo)
      ? `<img src="${escapeHtmlAttr(store.logo)}" class="w-16 h-16 rounded-xl object-cover">`
      : `<div class="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400"><i data-lucide="image-off"></i></div>`;

    grid.innerHTML += `
      <div class="card p-6 border-2 ${active ? "border-blue-500" : "border-transparent"}">
        <div class="flex items-center gap-4">
          ${logoHtml}
          <div class="flex-grow">
            <h4 class="font-bold text-lg">${escapeHtml(store.name)}</h4>
            <p class="text-xs text-gray-400">تاريخ الإنشاء: ${new Date(store.createdAt).toLocaleDateString()}</p>
          </div>
          ${active
            ? '<span class="text-sm bg-blue-100 text-blue-700 px-3 py-2 rounded-lg font-bold">الحالي</span>'
            : `<button onclick="switchStore('${store.id}')" class="text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-lg">دخول</button>`
          }
        </div>
      </div>
    `;
  });

  lucide.createIcons();
}

window.switchStore = async function(id) {
  currentStoreId = id;
  localStorage.setItem("activeStoreId", id);
  await showLoader("جاري تبديل المحل...");
  await loadCurrentStore();
  cart = [];
  renderCart();
  editingInvoiceId = null;
  updateCreateInvoiceButton();
  switchTab("pos");
};

function safeVariants(variants) {
  return Array.isArray(variants)
    ? variants.map(v => ({
        name: String(v.name || "").trim(),
        qty: Number(v.qty || 0)
      })).filter(v => v.name)
    : [];
}

function variantsTotal(variants) {
  return safeVariants(variants).reduce((s, v) => s + Number(v.qty || 0), 0);
}

function getVariantsFromForm() {
  const rows = [...document.querySelectorAll(".variant-row")];
  return rows.map(row => ({
    name: row.querySelector(".variant-name").value.trim(),
    qty: Number(row.querySelector(".variant-qty").value || 0)
  })).filter(v => v.name);
}

function renderVariantsForm(variants = []) {
  const box = document.getElementById("variantsBox");
  box.innerHTML = "";
  safeVariants(variants).forEach(v => addVariantRow(v.name, v.qty));
}

window.addVariantRow = function(name = "", qty = "") {
  const box = document.getElementById("variantsBox");
  const row = document.createElement("div");
  row.className = "variant-row grid grid-cols-[1fr_120px_50px] gap-3 items-center";
  row.innerHTML = `
    <input type="text" class="variant-name w-full p-3 bg-gray-50 border rounded-xl" placeholder="اسم الصنف / المقاس" value="${escapeHtmlAttr(name)}">
    <input type="number" class="variant-qty w-full p-3 bg-gray-50 border rounded-xl text-center" placeholder="الكمية" value="${qty}">
    <button type="button" class="bg-red-50 text-red-600 rounded-xl h-full font-bold">✕</button>
  `;
  row.querySelector("button").onclick = () => {
    row.remove();
    syncStockWithVariants(true);
  };
  row.querySelector(".variant-qty").addEventListener("input", () => syncStockWithVariants(true));
  box.appendChild(row);
};

window.syncStockWithVariants = function() {
  const variants = getVariantsFromForm();
  const total = variantsTotal(variants);
  const stockInput = document.getElementById("prodStock");
  const currentStock = Number(stockInput.value || 0);
  if (total > currentStock) stockInput.value = total;
};

function fillProductForm(p = null) {
  document.getElementById("editProductId").value = p?.id || "";
  document.getElementById("prodName").value = p?.name || "";
  document.getElementById("prodCode").value = p?.code || "";
  document.getElementById("prodStock").value = p?.stock ?? "";
  document.getElementById("prodCost").value = p?.cost ?? "";
  document.getElementById("prodPrice").value = p?.price ?? "";
  renderVariantsForm(p?.variants || []);
}

function resetProductForm() {
  document.getElementById("editProductId").value = "";
  document.getElementById("modalTitle").innerText = "إضافة منتج جديد";
  document.getElementById("prodName").value = "";
  document.getElementById("prodCode").value = "";
  document.getElementById("prodStock").value = "";
  document.getElementById("prodCost").value = "";
  document.getElementById("prodPrice").value = "";
  renderVariantsForm([]);
}

window.openNewProduct = function() {
  resetProductForm();
  toggleModal("productModal", true);
};

window.saveProduct = async function() {
  const existingId = document.getElementById("editProductId").value.trim();
  const id = existingId || ("p_" + Date.now());
  const variants = getVariantsFromForm();
  const stockInput = Number(document.getElementById("prodStock").value || 0);
  const stock = Math.max(stockInput, variantsTotal(variants));

  const oldSnap = existingId ? await get(ref(db, `${pathClientProducts()}/${existingId}`)) : null;
  const oldCreatedAt = oldSnap && oldSnap.exists() ? oldSnap.val().createdAt : null;

  const product = {
    id,
    storeId: currentStoreId,
    name: document.getElementById("prodName").value.trim(),
    code: document.getElementById("prodCode").value.trim(),
    stock,
    cost: parseFloat(document.getElementById("prodCost").value) || 0,
    price: parseFloat(document.getElementById("prodPrice").value) || 0,
    variants,
    createdAt: oldCreatedAt || new Date().toISOString()
  };

  if (!product.name || !product.code) {
    alert("يرجى إدخال اسم المنتج والكود");
    return;
  }

  await showLoader(existingId ? "جاري تعديل المنتج..." : "جاري إضافة المنتج...");
  await set(ref(db, `${pathClientProducts()}/${id}`), product);
  resetProductForm();
  toggleModal("productModal", false);
};

async function renderProducts() {
  const table = document.getElementById("productsTable");
  const loading = document.getElementById("productsLoading");
  const moreWrap = document.getElementById("productsLoadMoreWrap");
  const search = document.getElementById("inventorySearch").value.toLowerCase();

  table.innerHTML = "";
  loading.classList.remove("hidden");

  const products = await getAllProducts();
  const filtered = products
    .filter(p =>
      p.storeId === currentStoreId &&
      (((p.name || "").toLowerCase().includes(search)) || ((p.code || "").toLowerCase().includes(search)))
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const visible = filtered.slice(0, productsCurrentLimit);

  visible.forEach(p => {
    const variantsTxt = safeVariants(p.variants).length
      ? safeVariants(p.variants).map(v => `${v.name}: ${v.qty}`).join(" | ")
      : "-";

    table.innerHTML += `
      <tr class="border-b hover:bg-gray-50 transition">
        <td class="p-4 font-mono text-sm">${escapeHtml(p.code)}</td>
        <td class="p-4 font-bold text-gray-700">${escapeHtml(p.name)}</td>
        <td class="p-4 text-gray-400">${Number(p.cost).toFixed(2)}</td>
        <td class="p-4 text-blue-700 font-bold">${Number(p.price).toFixed(2)}</td>
        <td class="p-4">
          <span class="px-3 py-1 rounded-lg text-xs font-bold ${Number(p.stock) <= 5 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}">
            ${Number(p.stock)}
          </span>
        </td>
        <td class="p-4 text-xs text-gray-500">${escapeHtml(variantsTxt)}</td>
        <td class="p-4 flex gap-2 flex-wrap">
          <button onclick="showProductBarcode('${escapeJs(p.code)}','${escapeJs(p.name)}')" class="text-purple-500 bg-purple-50 px-3 py-1 rounded-lg text-xs font-bold">باركود</button>
          <button onclick="editProduct('${p.id}')" class="text-blue-500 bg-blue-50 px-3 py-1 rounded-lg text-xs font-bold">تعديل</button>
          <button onclick="deleteProduct('${p.id}')" class="text-red-400 bg-red-50 px-3 py-1 rounded-lg text-xs font-bold">حذف</button>
        </td>
      </tr>
    `;
  });

  loading.classList.add("hidden");
  moreWrap.classList.toggle("hidden", visible.length >= filtered.length);
  lucide.createIcons();
}

window.showProductBarcode = function(code, title) {
  document.getElementById("barcodeTitle").innerText = title || "باركود المنتج";
  document.getElementById("barcodeText").innerText = code || "";
  const svg = document.getElementById("productBarcodeSvg");
  svg.innerHTML = "";

  try {
    JsBarcode(svg, String(code), {
      format: "CODE128",
      lineColor: "#1d4ed8",
      width: 2,
      height: 80,
      displayValue: true,
      font: "Cairo",
      margin: 10
    });
  } catch {
    alert("تعذر توليد الباركود لهذا الكود");
    return;
  }

  toggleModal("barcodeModal", true);
};

window.resetProductsAndRender = async function() {
  productsCurrentLimit = productPageSize;
  await renderProducts();
};

window.loadMoreProducts = async function() {
  productsCurrentLimit += productPageSize;
  await renderProducts();
};

document.getElementById("loadMoreProductsBtn")?.addEventListener("click", loadMoreProducts);

window.editProduct = async function(id) {
  await showLoader("جاري تحميل بيانات المنتج...");
  const snap = await get(ref(db, `${pathClientProducts()}/${id}`));
  if (!snap.exists()) return;
  const p = snap.val();
  document.getElementById("modalTitle").innerText = "تعديل المنتج";
  fillProductForm(p);
  toggleModal("productModal", true);
};

window.deleteProduct = async function(id) {
  if (!confirm("حذف المنتج؟")) return;
  await showLoader("جاري حذف المنتج...");
  await remove(ref(db, `${pathClientProducts()}/${id}`));
};

window.searchPosProducts = async function() {
  const query = document.getElementById("posSearch").value.toLowerCase().trim();
  const results = document.getElementById("posSearchResults");

  if (query.length < 1) {
    results.classList.add("hidden");
    return;
  }

  const products = await getAllProducts();
  const filtered = products.filter(p =>
    p.storeId === currentStoreId &&
    (((p.name || "").toLowerCase().includes(query)) || ((p.code || "").toLowerCase().includes(query)))
  );

  results.innerHTML = "";

  if (filtered.length === 0) {
    results.innerHTML = `<div class="p-4 text-center text-gray-400">لا توجد نتائج</div>`;
  } else {
    filtered.slice(0, 20).forEach(p => {
      const row = document.createElement("div");
      row.className = "flex justify-between items-center p-4 hover:bg-blue-50 cursor-pointer rounded-xl gap-3";
      row.innerHTML = `
        <div class="flex-grow">
          <p class="font-bold">${escapeHtml(p.name)}</p>
          <p class="text-xs text-gray-400">${escapeHtml(p.code)}</p>
          <p class="text-xs ${Number(p.stock) <= 5 ? "text-red-500" : "text-green-600"}">المتوفر: ${Number(p.stock)}</p>
        </div>
        <div class="text-left whitespace-nowrap">
          <b class="text-blue-700">${Number(p.price).toFixed(2)}</b>
        </div>
      `;
      row.onclick = () => {
        addToCart(p);
        results.classList.add("hidden");
        document.getElementById("posSearch").value = "";
      };
      results.appendChild(row);
    });
  }

  results.classList.remove("hidden");
};

function makeCartLineKey(productId, variantName = "") {
  return `${productId}__${variantName || ""}`;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function addToCart(product) {
  const safeProduct = clone(product);
  const defaultVariant = safeVariants(safeProduct.variants)[0]?.name || "";
  const key = makeCartLineKey(safeProduct.id, defaultVariant);
  const existing = cart.find(i => i.lineKey === key);

  if (existing) {
    const available = getAvailableQtyForLine(existing, safeProduct);
    if (existing.qty + 1 > available) {
      alert("نفذ المخزون!");
      return;
    }
    existing.qty += 1;
  } else {
    const available = getAvailableQtyForProduct(defaultVariant, safeProduct);
    if (available < 1) {
      alert("المنتج غير متوفر!");
      return;
    }
    cart.push({
      lineKey: key,
      id: safeProduct.id,
      name: safeProduct.name,
      code: safeProduct.code,
      price: Number(safeProduct.price || 0),
      cost: Number(safeProduct.cost || 0),
      stock: Number(safeProduct.stock || 0),
      variants: safeVariants(safeProduct.variants),
      selectedVariant: defaultVariant,
      qty: 1
    });
  }

  renderCart();
}

function getAvailableQtyForProduct(variantName, productLike) {
  const variants = safeVariants(productLike.variants);
  if (variantName && variants.length) {
    const found = variants.find(v => v.name === variantName);
    return Number(found?.qty || 0);
  }
  return Number(productLike.stock || 0);
}

function getAvailableQtyForLine(line, productLike) {
  return getAvailableQtyForProduct(line.selectedVariant, productLike);
}

function updateCartLineKey(line) {
  line.lineKey = makeCartLineKey(line.id, line.selectedVariant);
}

function renderVariantSelect(line) {
  const variants = safeVariants(line.variants);
  if (!variants.length) return `<span class="text-gray-400">-</span>`;

  return `
    <select onchange="changeCartVariant('${line.lineKey}', this.value)" class="bg-gray-50 border rounded-lg p-2 text-sm">
      ${variants.map(v => `<option value="${escapeHtmlAttr(v.name)}" ${v.name === line.selectedVariant ? "selected" : ""}>${escapeHtml(v.name)} (${v.qty})</option>`).join("")}
    </select>
  `;
}

function renderCart() {
  const tbody = document.getElementById("cartTable");
  const empty = document.getElementById("cartEmptyMsg");
  tbody.innerHTML = "";

  if (cart.length === 0) {
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    cart.forEach(item => {
      tbody.innerHTML += `
        <tr class="border-b">
          <td class="p-4 font-bold whitespace-nowrap">${escapeHtml(item.name)}</td>
          <td class="p-4 whitespace-nowrap">${renderVariantSelect(item)}</td>
          <td class="p-4 whitespace-nowrap">${Number(item.price).toFixed(2)}</td>
          <td class="p-4 whitespace-nowrap">
            <div class="flex items-center gap-2">
              <button onclick="changeQty('${item.lineKey}', -1)" class="w-8 h-8 bg-gray-100 rounded-lg">-</button>
              <span class="w-8 text-center font-bold">${item.qty}</span>
              <button onclick="changeQty('${item.lineKey}', 1)" class="w-8 h-8 bg-gray-100 rounded-lg">+</button>
            </div>
          </td>
          <td class="p-4 font-bold text-blue-700 whitespace-nowrap">${(Number(item.price) * item.qty).toFixed(2)}</td>
          <td class="p-4 whitespace-nowrap"><button onclick="removeFromCart('${item.lineKey}')" class="text-red-400"><i data-lucide="trash-2" size="16"></i></button></td>
        </tr>
      `;
    });
  }

  lucide.createIcons();
  calculateTotal();
}

window.changeCartVariant = async function(lineKey, variantName) {
  const line = cart.find(i => i.lineKey === lineKey);
  if (!line) return;

  const products = await getAllProducts();
  const fresh = products.find(p => p.id === line.id);
  if (!fresh) return;

  const available = getAvailableQtyForProduct(variantName, fresh);
  if (available < line.qty) {
    alert("الكمية الحالية أكبر من المتوفر لهذا الصنف");
    return;
  }

  line.variants = safeVariants(fresh.variants);
  line.selectedVariant = variantName;
  line.stock = Number(fresh.stock || 0);
  updateCartLineKey(line);

  const duplicates = new Map();
  cart = cart.reduce((arr, item) => {
    const key = item.lineKey;
    if (duplicates.has(key)) {
      duplicates.get(key).qty += item.qty;
    } else {
      duplicates.set(key, item);
      arr.push(item);
    }
    return arr;
  }, []);

  renderCart();
};

window.changeQty = async function(lineKey, delta) {
  const line = cart.find(i => i.lineKey === lineKey);
  if (!line) return;

  const products = await getAllProducts();
  const fresh = products.find(p => p.id === line.id);
  if (!fresh) return;

  line.variants = safeVariants(fresh.variants);
  line.stock = Number(fresh.stock || 0);

  const available = getAvailableQtyForLine(line, fresh);
  if (line.qty + delta > available) {
    alert("الكمية غير كافية!");
    return;
  }

  line.qty += delta;
  if (line.qty <= 0) removeFromCart(lineKey);
  else renderCart();
};

window.removeFromCart = function(lineKey) {
  cart = cart.filter(i => i.lineKey !== lineKey);
  renderCart();
};

window.calculateTotal = function() {
  const sub = cart.reduce((s, i) => s + (Number(i.price) * i.qty), 0);
  const disc = parseFloat(document.getElementById("posDiscount").value) || 0;
  document.getElementById("subtotal").innerText = sub.toFixed(2);
  document.getElementById("finalTotal").innerText = Math.max(0, sub - disc).toFixed(2);
};

function updateCreateInvoiceButton() {
  const btn = document.getElementById("createInvoiceBtn");
  btn.innerText = editingInvoiceId ? "حفظ تعديل الفاتورة" : "إنشاء فاتورة";
}

async function getNextInvoiceNumber() {
  const counterRef = ref(db, `${pathClientCounters()}/invoiceAutoNumber`);
  const snap = await get(counterRef);
  const current = snap.exists() ? Number(snap.val()) : 0;
  const next = current + 1;
  await set(counterRef, next);
  return next;
}

async function applyStockChange(items, direction) {
  const products = await getAllProducts();

  for (const item of items) {
    const p = products.find(x => x.id === item.id);
    if (!p) continue;

    const pRef = ref(db, `${pathClientProducts()}/${item.id}`);
    const currentStock = Number(p.stock || 0);
    const variants = safeVariants(p.variants);

    const updatedVariants = variants.map(v => {
      if (item.selectedVariant && v.name === item.selectedVariant) {
        return {
          ...v,
          qty: Number(v.qty || 0) + (direction * Number(item.qty || 0))
        };
      }
      return v;
    });

    const newStock = currentStock + (direction * Number(item.qty || 0));
    await update(pRef, {
      stock: Math.max(0, newStock),
      variants: updatedVariants
    });
  }
}

async function validateCartAgainstStock() {
  const products = await getAllProducts();

  for (const item of cart) {
    const product = products.find(p => p.id === item.id);
    if (!product) {
      alert(`المنتج غير موجود: ${item.name}`);
      return false;
    }

    const available = getAvailableQtyForProduct(item.selectedVariant, product);
    if (available < item.qty) {
      alert(`المخزون غير كافٍ للمنتج: ${item.name}${item.selectedVariant ? " - " + item.selectedVariant : ""}`);
      return false;
    }
  }

  return true;
}

function buildInvoicePayload(id) {
  return {
    id: String(id),
    storeId: currentStoreId,
    date: new Date().toISOString(),
    customer: document.getElementById("customerName").value || "عميل نقدي",
    phone: document.getElementById("customerPhone").value || "",
    payment: document.getElementById("paymentMethod").value,
    status: document.getElementById("invoiceStatus").value,
    mode: getAppMode(),
    items: cart.map(i => clone(i)),
    subtotal: parseFloat(document.getElementById("subtotal").innerText),
    discount: parseFloat(document.getElementById("posDiscount").value) || 0,
    total: parseFloat(document.getElementById("finalTotal").innerText),
    totalCost: cart.reduce((s, i) => s + (Number(i.cost) * i.qty), 0)
  };
}

function clearInvoiceEditor() {
  cart = [];
  editingInvoiceId = null;
  renderCart();
  document.getElementById("customerName").value = "";
  document.getElementById("customerPhone").value = "";
  document.getElementById("paymentMethod").value = "cash";
  document.getElementById("invoiceStatus").value = "paid";
  document.getElementById("posDiscount").value = 0;
  calculateTotal();
  updateCreateInvoiceButton();
}

window.checkout = async function() {
  if (cart.length === 0) return;
  if (!(await validateCartAgainstStock())) return;

  if (editingInvoiceId) {
    await showLoader("جاري حفظ تعديل الفاتورة...");

    const oldSnap = await get(ref(db, `${pathClientInvoices()}/${editingInvoiceId}`));
    if (!oldSnap.exists()) {
      alert("الفاتورة الأصلية غير موجودة");
      return;
    }

    const oldInvoice = oldSnap.val();

    await applyStockChange(oldInvoice.items || [], +1);
    if (!(await validateCartAgainstStock())) {
      await applyStockChange(oldInvoice.items || [], -1);
      return;
    }

    await applyStockChange(cart, -1);

    const newInvoice = buildInvoicePayload(editingInvoiceId);
    await set(ref(db, `${pathClientInvoices()}/${editingInvoiceId}`), newInvoice);

    currentInvoiceId = editingInvoiceId;
    editingInvoiceId = null;
    updateCreateInvoiceButton();
    clearInvoiceEditor();
    await viewInvoice(newInvoice.id);
    return;
  }

  await showLoader("جاري إنشاء الفاتورة...");
  const invoiceNumber = await getNextInvoiceNumber();
  const invoice = buildInvoicePayload(invoiceNumber);

  await applyStockChange(cart, -1);
  await set(ref(db, `${pathClientInvoices()}/${invoice.id}`), invoice);

  currentInvoiceId = invoice.id;
  clearInvoiceEditor();
  await viewInvoice(invoice.id);
};

window.editInvoice = async function(id) {
  await showLoader("جاري تحميل الفاتورة للتعديل...");
  const snap = await get(ref(db, `${pathClientInvoices()}/${id}`));
  if (!snap.exists()) {
    alert("الفاتورة غير موجودة");
    return;
  }

  const inv = snap.val();
  editingInvoiceId = id;
  cart = (inv.items || []).map(i => clone(i));

  document.getElementById("customerName").value = inv.customer || "";
  document.getElementById("customerPhone").value = inv.phone || "";
  document.getElementById("paymentMethod").value = inv.payment || "cash";
  document.getElementById("invoiceStatus").value = inv.status || "paid";
  document.getElementById("posDiscount").value = Number(inv.discount || 0);

  renderCart();
  calculateTotal();
  updateCreateInvoiceButton();
  switchTab("pos");
};

window.deleteInvoice = async function(id) {
  if (!confirm("حذف الفاتورة؟ سيتم إرجاع الكميات للمخزون.")) return;

  await showLoader("جاري حذف الفاتورة...");
  const snap = await get(ref(db, `${pathClientInvoices()}/${id}`));
  if (!snap.exists()) return;

  const inv = snap.val();
  await applyStockChange(inv.items || [], +1);
  await remove(ref(db, `${pathClientInvoices()}/${id}`));

  if (editingInvoiceId === id) {
    clearInvoiceEditor();
  }
};

window.viewInvoice = async function(id) {
  await showLoader("جاري تحميل الفاتورة...");

  const snap = await get(ref(db, `${pathClientInvoices()}/${id}`));
  if (!snap.exists()) {
    alert("الفاتورة غير موجودة");
    return;
  }

  const inv = snap.val();
  currentInvoiceId = id;

  const storeSnap = await get(ref(db, `${pathClientStores()}/${inv.storeId}`));
  const store = storeSnap.exists() ? storeSnap.val() : { name: "المحل", logo: "" };

  document.getElementById("mainApp").classList.add("hidden");
  document.getElementById("invoicePage").classList.remove("hidden");

  document.getElementById("invPageStoreName").innerText = store.name || "المحل";
  setImageOrHide(document.getElementById("invPageLogo"), store.logo);
  document.getElementById("invPageId").innerText = `#${id}`;
  document.getElementById("invPageDate").innerText = new Date(inv.date).toLocaleString("ar-EG");
  document.getElementById("invPageCustomer").innerText = inv.customer || "-";
  document.getElementById("invPagePhone").innerText = inv.phone || "-";
  document.getElementById("invPagePayment").innerText = inv.payment === "cash" ? "نقداً" : "إلكتروني";
  document.getElementById("invPageStatus").innerText = statusLabel(inv.status || "paid");
  document.getElementById("invPageVersion").innerText = inv.mode === "pro" ? "برو" : "عادية";

  const itemArea = document.getElementById("invPageItems");
  itemArea.innerHTML = "";

  (inv.items || []).forEach((i, index) => {
    itemArea.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(i.name)}</td>
        <td>${escapeHtml(i.selectedVariant || "-")}</td>
        <td>${i.qty}</td>
        <td>${Number(i.price).toFixed(2)}</td>
        <td>${(Number(i.price) * i.qty).toFixed(2)}</td>
      </tr>
    `;
  });

  document.getElementById("invPageSub").innerText = Number(inv.subtotal).toFixed(2);
  document.getElementById("invPageDiscount").innerText = Number(inv.discount).toFixed(2);
  document.getElementById("invPageTotal").innerText = Number(inv.total).toFixed(2);

  lucide.createIcons();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.backFromInvoicePage = function() {
  document.getElementById("invoicePage").classList.add("hidden");
  document.getElementById("mainApp").classList.remove("hidden");
  switchTab("invoices");
};

window.printInvoicePage = function() {
  window.print();
};

async function prepareInvoiceForExport() {
  const area = document.getElementById("invoicePrintArea");
  const oldWidth = area.style.width;
  const oldMaxWidth = area.style.maxWidth;

  area.style.width = "8.5in";
  area.style.maxWidth = "8.5in";
  await new Promise(r => setTimeout(r, 60));

  return () => {
    area.style.width = oldWidth;
    area.style.maxWidth = oldMaxWidth;
  };
}

window.exportInvoicePage = async function(type) {
  const area = document.getElementById("invoicePrintArea");
  const restore = await prepareInvoiceForExport();

  try {
    const canvas = await html2canvas(area, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      scrollX: 0,
      scrollY: 0
    });

    if (type === "image") {
      const link = document.createElement("a");
      link.download = `فاتورة_${currentInvoiceId || Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } else if (type === "pdf") {
      const imgData = canvas.toDataURL("image/png");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "landscape", unit: "in", format: [8.5, 7] });
      pdf.addImage(imgData, "PNG", 0, 0, 8.5, 7);
      pdf.save(`فاتورة_${currentInvoiceId || Date.now()}.pdf`);
    }
  } finally {
    restore();
  }
};

async function renderInvoices() {
  const query = document.getElementById("invSearchQuery").value.toLowerCase();
  const statusFilter = document.getElementById("invoiceStatusFilter").value;
  const table = document.getElementById("invoicesTable");
  const loading = document.getElementById("invoicesLoading");
  const moreWrap = document.getElementById("invoicesLoadMoreWrap");

  table.innerHTML = "";
  loading.classList.remove("hidden");

  const invoices = await getAllInvoices();
  const filtered = invoices
    .filter(inv =>
      inv.storeId === currentStoreId &&
      (String(inv.id).includes(query) || (inv.customer || "").toLowerCase().includes(query)) &&
      (statusFilter === "all" || (inv.status || "paid") === statusFilter)
    )
    .sort((a, b) => Number(b.id) - Number(a.id));

  const visible = filtered.slice(0, invoicesCurrentLimit);

  visible.forEach(inv => {
    table.innerHTML += `
      <tr class="border-b hover:bg-gray-50">
        <td class="p-4 font-bold">#${inv.id}</td>
        <td class="p-4 text-xs text-gray-400">${new Date(inv.date).toLocaleString("ar-EG")}</td>
        <td class="p-4">${escapeHtml(inv.customer)}</td>
        <td class="p-4">
          <span class="status-pill ${statusClass(inv.status || "paid")}">${statusLabel(inv.status || "paid")}</span>
        </td>
        <td class="p-4 font-bold text-blue-700">${Number(inv.total).toFixed(2)}</td>
        <td class="p-4 text-xs">${inv.payment === "cash" ? "نقداً" : "إلكتروني"}</td>
        <td class="p-4">
          <div class="flex gap-2 flex-wrap">
            <button onclick="viewInvoice('${inv.id}')" class="text-blue-500 bg-blue-50 px-3 py-1 rounded-lg text-xs font-bold">عرض</button>
            <button onclick="editInvoice('${inv.id}')" class="text-amber-600 bg-amber-50 px-3 py-1 rounded-lg text-xs font-bold">تعديل</button>
            <button onclick="deleteInvoice('${inv.id}')" class="text-red-600 bg-red-50 px-3 py-1 rounded-lg text-xs font-bold">حذف</button>
          </div>
        </td>
      </tr>
    `;
  });

  loading.classList.add("hidden");
  moreWrap.classList.toggle("hidden", visible.length >= filtered.length);
}

window.resetInvoicesAndRender = async function() {
  invoicesCurrentLimit = invoicePageSize;
  await renderInvoices();
};

window.loadMoreInvoices = async function() {
  invoicesCurrentLimit += invoicePageSize;
  await renderInvoices();
};

document.getElementById("loadMoreInvoicesBtn")?.addEventListener("click", loadMoreInvoices);

window.openPurchaseModal = function() {
  document.getElementById("purchaseModalTitle").innerText = "إضافة فاتورة شراء";
  document.getElementById("editPurchaseId").value = "";
  document.getElementById("purchaseSupplier").value = "";
  document.getElementById("purchaseAmount").value = "";
  document.getElementById("purchaseNotes").value = "";
  toggleModal("purchaseModal", true);
};

window.savePurchase = async function() {
  const id = document.getElementById("editPurchaseId").value || ("pur_" + Date.now());
  const purchase = {
    id,
    storeId: currentStoreId,
    supplier: document.getElementById("purchaseSupplier").value.trim(),
    amount: parseFloat(document.getElementById("purchaseAmount").value) || 0,
    notes: document.getElementById("purchaseNotes").value.trim(),
    createdAt: new Date().toISOString()
  };

  if (!purchase.supplier || purchase.amount <= 0) {
    alert("أدخل اسم المورد والمبلغ");
    return;
  }

  await showLoader("جاري حفظ فاتورة الشراء...");
  await set(ref(db, `${pathClientPurchases()}/${id}`), purchase);
  toggleModal("purchaseModal", false);
};

window.editPurchase = async function(id) {
  const snap = await get(ref(db, `${pathClientPurchases()}/${id}`));
  if (!snap.exists()) return;
  const p = snap.val();

  document.getElementById("purchaseModalTitle").innerText = "تعديل فاتورة شراء";
  document.getElementById("editPurchaseId").value = p.id || "";
  document.getElementById("purchaseSupplier").value = p.supplier || "";
  document.getElementById("purchaseAmount").value = p.amount || "";
  document.getElementById("purchaseNotes").value = p.notes || "";
  toggleModal("purchaseModal", true);
};

window.deletePurchase = async function(id) {
  if (!confirm("حذف فاتورة الشراء؟")) return;
  await showLoader("جاري حذف فاتورة الشراء...");
  await remove(ref(db, `${pathClientPurchases()}/${id}`));
};

async function renderPurchases() {
  const table = document.getElementById("purchasesTable");
  const loading = document.getElementById("purchasesLoading");
  table.innerHTML = "";
  loading.classList.remove("hidden");

  const purchases = await getAllPurchases();
  purchases
    .filter(p => p.storeId === currentStoreId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach(p => {
      table.innerHTML += `
        <tr class="border-b hover:bg-gray-50">
          <td class="p-4 font-bold">${escapeHtml(p.supplier)}</td>
          <td class="p-4 text-red-600 font-bold">${Number(p.amount).toFixed(2)}</td>
          <td class="p-4 text-sm text-gray-500">${escapeHtml(p.notes || "-")}</td>
          <td class="p-4 text-xs text-gray-400">${new Date(p.createdAt).toLocaleString("ar-EG")}</td>
          <td class="p-4">
            <div class="flex gap-2 flex-wrap">
              <button onclick="editPurchase('${p.id}')" class="text-blue-500 bg-blue-50 px-3 py-1 rounded-lg text-xs font-bold">تعديل</button>
              <button onclick="deletePurchase('${p.id}')" class="text-red-600 bg-red-50 px-3 py-1 rounded-lg text-xs font-bold">حذف</button>
            </div>
          </td>
        </tr>
      `;
    });

  loading.classList.add("hidden");
}

window.openScanner = async function(target) {
  scanTarget = target;
  scannerTorchOn = false;
  torchSupported = false;

  document.getElementById("scannerModal").classList.remove("hidden");
  document.getElementById("scannerTitle").innerText =
    target === "invoice" ? "مسح فاتورة" :
    target === "product-code" ? "مسح كود المنتج" :
    "مسح الباركود";

  try {
    if (!scanner) {
      scanner = new Html5Qrcode("reader");
    }

    const devices = await Html5Qrcode.getCameras();
    cameraDevices = devices || [];
    currentCameraIndex = 0;

    if (!cameraDevices.length) {
      alert("لم يتم العثور على كاميرا");
      closeScanner();
      return;
    }

    await startScannerWithCurrentCamera();
  } catch (err) {
    console.error(err);
    alert("تعذر الحصول على صلاحية الكاميرا.");
    closeScanner();
  }
};

async function startScannerWithCurrentCamera() {
  if (!scanner || !cameraDevices.length) return;
  const cameraId = cameraDevices[currentCameraIndex].id;

  try {
    await scanner.start(
      { deviceId: { exact: cameraId } },
      {
        fps: 10,
        qrbox: { width: 250, height: 150 }
      },
      async (decodedText) => {
        await handleScanResult(decodedText);
        await closeScanner();
      },
      () => {}
    );

    setTimeout(async () => {
      try {
        const track = scanner?.getRunningTrack?.();
        scannerTrack = track || null;
        const capabilities = track?.getCapabilities?.();
        const hasTorch = !!capabilities?.torch;
        torchSupported = hasTorch;
        document.getElementById("scannerTorchBtn").classList.toggle("hidden", !hasTorch);
        document.getElementById("scannerTorchQuickBtn").classList.toggle("hidden", !hasTorch);
      } catch {
        torchSupported = false;
        document.getElementById("scannerTorchBtn").classList.add("hidden");
        document.getElementById("scannerTorchQuickBtn").classList.add("hidden");
      }
    }, 500);
  } catch (err) {
    console.error(err);
    alert("تعذر بدء المسح بالكاميرا المحددة");
    await closeScanner();
  }
}

window.toggleScannerTorch = async function() {
  if (!scannerTrack || !torchSupported) return;

  try {
    scannerTorchOn = !scannerTorchOn;
    await scannerTrack.applyConstraints({
      advanced: [{ torch: scannerTorchOn }]
    });

    const label = scannerTorchOn ? "إيقاف الفلاش" : "تشغيل / إيقاف الفلاش";
    document.getElementById("scannerTorchBtn").innerText = label;
  } catch (err) {
    console.error(err);
    alert("الفلاش غير مدعوم على هذا الجهاز أو المتصفح");
  }
};

window.switchCameraDevice = async function() {
  if (!cameraDevices.length || !scanner) return;

  try {
    await scanner.stop();
  } catch {}

  currentCameraIndex = (currentCameraIndex + 1) % cameraDevices.length;
  scannerTrack = null;
  torchSupported = false;
  scannerTorchOn = false;
  await startScannerWithCurrentCamera();
};

async function handleScanResult(text) {
  const scanned = String(text || "").trim();

  if (scanTarget === "pos") {
    const products = await getAllProducts();
    const found = products.find(p =>
      p.storeId === currentStoreId &&
      String(p.code || "").trim().toLowerCase() === scanned.toLowerCase()
    );

    if (found) addToCart(found);
    else alert("لم يتم العثور على منتج بهذا الكود");
    return;
  }

  if (scanTarget === "product-code") {
    document.getElementById("prodCode").value = scanned;
    return;
  }

  const idMatch = scanned.match(/INV-(\d+)/i) || scanned.match(/^(\d+)$/);
  if (idMatch) await viewInvoice(idMatch[1]);
  else alert("تعذر قراءة رقم الفاتورة من الكود");
}

window.closeScanner = async function() {
  try {
    if (scannerTrack && torchSupported && scannerTorchOn) {
      await scannerTrack.applyConstraints({ advanced: [{ torch: false }] });
    }
  } catch {}

  try {
    if (scanner && scanner.isScanning) {
      await scanner.stop();
    }
  } catch {}

  scannerTrack = null;
  scannerTorchOn = false;
  torchSupported = false;
  document.getElementById("scannerTorchBtn").classList.add("hidden");
  document.getElementById("scannerTorchQuickBtn").classList.add("hidden");
  document.getElementById("scannerTorchBtn").innerText = "تشغيل / إيقاف الفلاش";
  document.getElementById("scannerModal").classList.add("hidden");
};

window.scanBarcodeFromImage = async function(event, target) {
  const file = event.target.files?.[0];
  if (!file) return;

  scanTarget = target;

  try {
    await showLoader("جاري قراءة الصورة...", 500);

    const tempId = "temp-reader-" + Date.now();
    const tempDiv = document.createElement("div");
    tempDiv.id = tempId;
    tempDiv.style.display = "none";
    document.body.appendChild(tempDiv);

    const imageScanner = new Html5Qrcode(tempId);
    const result = await imageScanner.scanFile(file, true);
    document.body.removeChild(tempDiv);

    await handleScanResult(result);
  } catch (err) {
    console.error(err);
    alert("تعذر قراءة الباركود من الصورة.");
  } finally {
    event.target.value = "";
  }
};

async function renderReports() {
  await showLoader("جاري تحميل التقارير...");
  const filter = document.getElementById("reportFilter").value;
  let sales = 0, costs = 0, count = 0, purchases = 0;
  const now = new Date();

  const invoices = await getAllInvoices();
  invoices.forEach(inv => {
    if (inv.storeId !== currentStoreId) return;

    const d = new Date(inv.date);
    let ok = false;

    if (filter === "all") ok = true;
    else if (filter === "today" && d.toDateString() === now.toDateString()) ok = true;
    else if (filter === "month" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) ok = true;
    else if (filter === "week" && (now - d) < 7 * 24 * 60 * 60 * 1000) ok = true;

    if (ok) {
      sales += Number(inv.total || 0);
      costs += Number(inv.totalCost || 0);
      count++;
    }
  });

  const allPurchases = await getAllPurchases();
  allPurchases.forEach(p => {
    if (p.storeId !== currentStoreId) return;
    const d = new Date(p.createdAt);
    let ok = false;

    if (filter === "all") ok = true;
    else if (filter === "today" && d.toDateString() === now.toDateString()) ok = true;
    else if (filter === "month" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) ok = true;
    else if (filter === "week" && (now - d) < 7 * 24 * 60 * 60 * 1000) ok = true;

    if (ok) purchases += Number(p.amount || 0);
  });

  document.getElementById("repWholesaleSales").innerText = costs.toFixed(2);
  document.getElementById("repTotalSales").innerText = sales.toFixed(2);
  document.getElementById("repTotalProfit").innerText = (sales - costs).toFixed(2);
  document.getElementById("repPurchases").innerText = purchases.toFixed(2);
  document.getElementById("repCount").innerText = count;
}

function applyAppModePreview() {
  const mode = document.getElementById("appModeSelect").value;
  setAppMode(mode);
  applyUiVisibility();
}

async function loadSettingsPage() {
  await showLoader("جاري تحميل الإعدادات...");
  const snap = await get(ref(db, `${pathClientStores()}/${currentStoreId}`));
  if (!snap.exists()) return;
  const s = snap.val();

  document.getElementById("setStoreName").value = s.name || "";
  document.getElementById("setStoreLogo").value = s.logo || "";
  setImageOrHide(document.getElementById("settingsLogoPreview"), s.logo);
  document.getElementById("appModeSelect").value = getAppMode();

  const cfg = getUiConfig();
  document.querySelectorAll(".feature-toggle").forEach(toggle => {
    toggle.checked = cfg[toggle.dataset.feature] !== false;
  });

  updateLicenseUIFromSession();
  applyUiVisibility();
}

window.saveSettings = async function() {
  await showLoader("جاري الحفظ...");

  const mode = document.getElementById("appModeSelect").value === "pro" ? "pro" : "normal";
  setAppMode(mode);

  const cfg = {};
  document.querySelectorAll(".feature-toggle").forEach(toggle => {
    cfg[toggle.dataset.feature] = !!toggle.checked;
  });
  setUiConfig(cfg);

  const storeRef = ref(db, `${pathClientStores()}/${currentStoreId}`);
  const storeSnap = await get(storeRef);
  if (storeSnap.exists()) {
    const s = storeSnap.val();
    await update(storeRef, {
      ...s,
      name: document.getElementById("setStoreName").value,
      logo: document.getElementById("setStoreLogo").value.trim()
    });
  }

  await update(ref(db, pathClientSettings()), {
    appMode: getAppMode(),
    uiConfig: getUiConfig(),
    updatedAt: new Date().toISOString()
  });

  await set(ref(db, pathClientUiConfig()), getUiConfig());

  await loadCurrentStore();
  applyUiVisibility();
  updateLicenseUIFromSession();
  alert("تم الحفظ بنجاح");
};

window.logoutUser = async function() {
  const session = getLocalSession();

  if (session?.key) {
    const licRef = ref(db, `${pathLicenses()}/${sanitizeKey(session.key)}`);
    const snap = await get(licRef);
    if (snap.exists()) {
      const lic = snap.val();
      const used = Math.max(0, Number(lic.usedLogins || 0) - 1);
      await update(licRef, {
        usedLogins: used,
        lastLogoutAt: new Date().toISOString()
      });
    }
  }

  detachRealtimeListeners();
  clearLocalSession();
  localStorage.removeItem("activeStoreId");
  if (licenseWatcher) clearInterval(licenseWatcher);
  showLogin("تم تسجيل الخروج بنجاح");
};

window.toggleModal = function(id, show) {
  document.getElementById(id).classList.toggle("hidden", !show);

  if (id === "productModal") {
    if (!show) {
      resetProductForm();
    } else {
      const editId = document.getElementById("editProductId").value;
      if (!editId) resetProductForm();
    }
  }

  if (id === "purchaseModal" && !show) {
    document.getElementById("editPurchaseId").value = "";
    document.getElementById("purchaseSupplier").value = "";
    document.getElementById("purchaseAmount").value = "";
    document.getElementById("purchaseNotes").value = "";
    document.getElementById("purchaseModalTitle").innerText = "إضافة فاتورة شراء";
  }
};

async function buildBackupPayload() {
  const [stores, products, invoices, purchases] = await Promise.all([
    getAllStores(),
    getAllProducts(),
    getAllInvoices(),
    getAllPurchases()
  ]);

  const storeSettingsSnap = await get(ref(db, pathClientSettings()));
  const uiSnap = await get(ref(db, pathClientUiConfig()));

  return {
    backupVersion: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    key: currentLicenseKey(),
    appMode: getAppMode(),
    uiConfig: uiSnap.exists() ? uiSnap.val() : getUiConfig(),
    settings: storeSettingsSnap.exists() ? storeSettingsSnap.val() : {},
    stores,
    products,
    invoices,
    purchases
  };
}

window.downloadBackupFile = async function() {
  if (!currentLicenseKey()) return;
  await showLoader("جاري تجهيز النسخة الاحتياطية...");

  const payload = await buildBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `backup_${sanitizeKey(currentLicenseKey())}_${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
};

window.saveCloudBackup = async function() {
  if (!currentLicenseKey()) return;
  await showLoader("جاري حفظ النسخة الاحتياطية...");

  const payload = await buildBackupPayload();
  const backupId = "backup_" + Date.now();

  await set(ref(db, `${pathClientBackups()}/${backupId}`), payload);
  alert("تم حفظ النسخة الاحتياطية بنجاح");
};

window.restoreBackupFromFile = async function(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    await showLoader("جاري استعادة النسخة الاحتياطية...");
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data || !data.backupVersion) {
      throw new Error("ملف غير صالح");
    }

    if (data.key && data.key !== currentLicenseKey()) {
      const ok = confirm("هذه النسخة مرتبطة بمفتاح مختلف. هل تريد المتابعة؟");
      if (!ok) return;
    }

    await restoreBackupPayload(data);
    alert("تمت استعادة النسخة بنجاح");
    await bootSessionState();
  } catch (err) {
    console.error(err);
    alert("تعذر استعادة النسخة الاحتياطية");
  } finally {
    event.target.value = "";
  }
};

async function restoreBackupPayload(data) {
  const basePath = baseClientPath();
  if (!basePath) return;

  await set(ref(db, pathClientStores()), {});
  await set(ref(db, pathClientProducts()), {});
  await set(ref(db, pathClientInvoices()), {});
  await set(ref(db, pathClientPurchases()), {});

  for (const store of (data.stores || [])) {
    await set(ref(db, `${pathClientStores()}/${store.id}`), store);
  }

  for (const p of (data.products || [])) {
    await set(ref(db, `${pathClientProducts()}/${p.id}`), p);
  }

  for (const inv of (data.invoices || [])) {
    await set(ref(db, `${pathClientInvoices()}/${inv.id}`), inv);
  }

  for (const pur of (data.purchases || [])) {
    await set(ref(db, `${pathClientPurchases()}/${pur.id}`), pur);
  }

  if (data.settings) {
    await update(ref(db, pathClientSettings()), data.settings);
  }

  if (data.uiConfig) {
    await set(ref(db, pathClientUiConfig()), data.uiConfig);
    setUiConfig(data.uiConfig);
  }

  if (data.appMode) {
    setAppMode(data.appMode);
    await update(ref(db, pathClientSettings()), { appMode: data.appMode });
  }

  const maxInvoiceId = Math.max(0, ...(data.invoices || []).map(i => Number(i.id) || 0));
  await set(ref(db, `${pathClientCounters()}/invoiceAutoNumber`), maxInvoiceId);
}

function escapeHtmlAttr(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeJs(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

window.handleLicenseLogin = handleLicenseLogin;
window.goToLoginFromExpired = goToLoginFromExpired;
window.switchTab = switchTab;
window.createNewStore = createNewStore;
window.switchStore = switchStore;
window.openNewProduct = openNewProduct;
window.saveProduct = saveProduct;
window.showProductBarcode = showProductBarcode;
window.resetProductsAndRender = resetProductsAndRender;
window.loadMoreProducts = loadMoreProducts;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.searchPosProducts = searchPosProducts;
window.changeCartVariant = changeCartVariant;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.calculateTotal = calculateTotal;
window.checkout = checkout;
window.editInvoice = editInvoice;
window.deleteInvoice = deleteInvoice;
window.viewInvoice = viewInvoice;
window.backFromInvoicePage = backFromInvoicePage;
window.printInvoicePage = printInvoicePage;
window.exportInvoicePage = exportInvoicePage;
window.resetInvoicesAndRender = resetInvoicesAndRender;
window.loadMoreInvoices = loadMoreInvoices;
window.openPurchaseModal = openPurchaseModal;
window.savePurchase = savePurchase;
window.editPurchase = editPurchase;
window.deletePurchase = deletePurchase;
window.openScanner = openScanner;
window.toggleScannerTorch = toggleScannerTorch;
window.switchCameraDevice = switchCameraDevice;
window.closeScanner = closeScanner;
window.scanBarcodeFromImage = scanBarcodeFromImage;
window.saveSettings = saveSettings;
window.logoutUser = logoutUser;
window.toggleModal = toggleModal;
window.addVariantRow = addVariantRow;
window.syncStockWithVariants = syncStockWithVariants;
window.previewStoreLogo = previewStoreLogo;
window.downloadBackupFile = downloadBackupFile;
window.saveCloudBackup = saveCloudBackup;
window.restoreBackupFromFile = restoreBackupFromFile;

applyUiVisibility();
lucide.createIcons();
