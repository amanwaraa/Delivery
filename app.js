import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
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
const db = getDatabase(app);

const PREFIX = "DFDFG";
const LOCAL_SESSION_KEY = `${PREFIX}_USER_SESSION`;
const LOCAL_OFFLINE_DB_NAME = `${PREFIX}_offline_db_v6`;
const LOCAL_OFFLINE_DB_VERSION = 6;
const BACKUP_VERSION = 8;

let currentStoreId = localStorage.getItem("activeStoreId") || "default";
let cart = [];
let scanner = null;
let scanTarget = "pos";
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

let currentCustomerHistoryName = "";
let currentCustomerHistoryPhone = "";
let appHistoryStack = [];

document.addEventListener("DOMContentLoaded", async () => {
  lucide.createIcons();
  bindBaseEvents();
  await initApp();
});

function qs(id) {
  return document.getElementById(id);
}

function currentLicenseKey() {
  const session = getLocalSession();
  return session?.key || null;
}

function sanitizeKey(key) {
  return String(key || "").replace(/[.#$/[\]]/g, "_");
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

function bindBaseEvents() {
  qs("loginBtn")?.addEventListener("click", handleLicenseLogin);
  qs("goToLoginBtn")?.addEventListener("click", goToLoginFromExpired);

  qs("openNewProductBtn")?.addEventListener("click", openNewProduct);
  qs("createInvoiceBtn")?.addEventListener("click", checkout);
  qs("saveProductBtn")?.addEventListener("click", saveProduct);
  qs("openPurchaseModalBtn")?.addEventListener("click", openPurchaseModal);
  qs("savePurchaseBtn")?.addEventListener("click", savePurchase);
  qs("createStoreBtn")?.addEventListener("click", createNewStore);
  qs("saveSettingsBtn")?.addEventListener("click", saveSettings);
  qs("logoutBtn")?.addEventListener("click", logoutUser);

  qs("backFromInvoiceBtn")?.addEventListener("click", backFromInvoicePage);
  qs("printInvoiceBtn")?.addEventListener("click", printInvoicePage);
  qs("exportInvoiceImageBtn")?.addEventListener("click", () => exportInvoicePage("image"));
  qs("exportInvoicePdfBtn")?.addEventListener("click", () => exportInvoicePage("pdf"));
  qs("shareInvoiceBtn")?.addEventListener("click", shareCurrentInvoice);

  qs("downloadBackupBtn")?.addEventListener("click", downloadBackupFile);
  qs("saveCloudBackupBtn")?.addEventListener("click", saveCloudBackup);
  qs("restoreBackupInput")?.addEventListener("change", restoreBackupFromFile);

  qs("downloadOfflinePackageBtn")?.addEventListener("click", downloadOfflinePackage);
  qs("importOfflinePackageInput")?.addEventListener("change", importOfflinePackage);
  qs("uploadOfflineDataBtn")?.addEventListener("click", uploadOfflineDataToCloud);

  qs("inventorySearch")?.addEventListener("input", resetProductsAndRender);
  qs("invSearchQuery")?.addEventListener("input", resetInvoicesAndRender);
  qs("invoiceStatusFilter")?.addEventListener("change", resetInvoicesAndRender);
  qs("reportFilter")?.addEventListener("change", renderReports);
  qs("posSearch")?.addEventListener("input", searchPosProducts);
  qs("posDiscount")?.addEventListener("input", calculateTotal);
  qs("discountType")?.addEventListener("change", calculateTotal);
  qs("setStoreLogo")?.addEventListener("input", e => previewStoreLogo(e.target.value));

  qs("barcodeImageInputPos")?.addEventListener("change", e => scanBarcodeFromImage(e, "pos"));
  qs("barcodeImageInputInvoice")?.addEventListener("change", e => scanBarcodeFromImage(e, "invoice"));

  qs("licenseKeyInput")?.addEventListener("keydown", e => {
    if (e.key === "Enter") handleLicenseLogin();
  });

  qs("customerName")?.addEventListener("input", handleCustomerInput);
  qs("customerPhone")?.addEventListener("input", handleCustomerInput);

  qs("customerHistoryRange")?.addEventListener("change", () => {
    if (currentCustomerHistoryName) {
      openCustomerHistory(currentCustomerHistoryName, currentCustomerHistoryPhone);
    }
  });

  qs("saveStatusBtn")?.addEventListener("click", saveInvoiceStatus);
  qs("customerCreateDebtInvoiceBtn")?.addEventListener("click", createAggregateInvoiceForCustomer);
  qs("customerSendDebtMsgBtn")?.addEventListener("click", sendDebtMessageToCustomer);

  qs("bulkPrintInvoicesBtn")?.addEventListener("click", () => exportBulkInvoices("print"));
  qs("bulkExportInvoicesPdfBtn")?.addEventListener("click", () => exportBulkInvoices("pdf"));
  qs("bulkExportInvoicesImagesBtn")?.addEventListener("click", () => exportBulkInvoices("images"));

  qs("bulkPrintPurchasesBtn")?.addEventListener("click", () => exportBulkPurchases("print"));
  qs("bulkExportPurchasesPdfBtn")?.addEventListener("click", () => exportBulkPurchases("pdf"));
  qs("bulkExportPurchasesImagesBtn")?.addEventListener("click", () => exportBulkPurchases("images"));

  qs("loadMoreProductsBtn")?.addEventListener("click", loadMoreProducts);
  qs("loadMoreInvoicesBtn")?.addEventListener("click", loadMoreInvoices);

  document.addEventListener("click", e => {
    const posResults = qs("posSearchResults");
    const posInput = qs("posSearch");
    if (posResults && !posResults.contains(e.target) && e.target !== posInput) {
      posResults.classList.add("hidden");
    }

    const customerBox = qs("customerSuggestions");
    const customerInput = qs("customerName");
    const phoneInput = qs("customerPhone");

    if (
      customerBox &&
      !customerBox.contains(e.target) &&
      e.target !== customerInput &&
      e.target !== phoneInput
    ) {
      customerBox.classList.add("hidden");
    }
  });

  window.addEventListener("popstate", async () => {
    if (!qs("scannerModal")?.classList.contains("hidden")) {
      await closeScanner(true);
      return;
    }

    if (!qs("invoicePage")?.classList.contains("hidden")) {
      qs("invoicePage")?.classList.add("hidden");
      qs("mainApp")?.classList.remove("hidden");

      const prevTab = appHistoryStack.length
        ? appHistoryStack[appHistoryStack.length - 1]
        : { type: "tab", tabId: "invoices" };

      if (prevTab?.type === "tab") {
        await switchTab(prevTab.tabId, true);
      } else {
        await switchTab("invoices", true);
      }
      return;
    }

    if (appHistoryStack.length > 1) {
      appHistoryStack.pop();
      const prev = appHistoryStack[appHistoryStack.length - 1];
      if (prev?.type === "tab") {
        await switchTab(prev.tabId, true);
      }
    } else {
      history.pushState({ appLoaded: true }, "");
    }
  });
}

async function initApp() {
  await bootSessionState();
}

function showToast(message, type = "info") {
  const wrap = qs("toastWrap");
  if (!wrap) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  wrap.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2600);
}

async function showLoader(text = "جاري المعالجة...", duration = 300) {
  const loader = qs("loader");
  const circle = qs("progressCircle");
  const textEl = qs("loaderText");

  if (!loader || !circle || !textEl) return;

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
        }, 80);
      }
    }, duration / 5);
  });
}

function showLogin(message = "") {
  qs("mainApp")?.classList.add("hidden");
  qs("invoicePage")?.classList.add("hidden");
  qs("licenseExpiredPage")?.classList.add("hidden");
  qs("loginPage")?.classList.remove("hidden");

  const err = qs("loginError");
  if (!err) return;

  if (message) {
    err.innerText = message;
    err.classList.remove("hidden");
  } else {
    err.innerText = "";
    err.classList.add("hidden");
  }
}

function showExpired(message = "انتهى وقت المفتاح أو عدد الاستخدامات المتاحة.") {
  qs("mainApp")?.classList.add("hidden");
  qs("invoicePage")?.classList.add("hidden");
  qs("loginPage")?.classList.add("hidden");
  qs("licenseExpiredPage")?.classList.remove("hidden");
  if (qs("expiredMessage")) qs("expiredMessage").innerText = message;
  lucide.createIcons();
}

function showApp() {
  qs("loginPage")?.classList.add("hidden");
  qs("licenseExpiredPage")?.classList.add("hidden");
  qs("invoicePage")?.classList.add("hidden");
  qs("mainApp")?.classList.remove("hidden");
}

function isOnline() {
  return navigator.onLine;
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
  if (!imgEl) return;
  const clean = normalizeLogo(url);
  if (clean) {
    imgEl.src = clean;
    imgEl.classList.remove("hidden");
  } else {
    imgEl.removeAttribute("src");
    imgEl.classList.add("hidden");
  }
}

function previewStoreLogo(value) {
  setImageOrHide(qs("settingsLogoPreview"), value);
}

function statusLabel(status) {
  return status === "paid" ? "مكتمل" : "غير مكتمل";
}

function statusClass(status) {
  return status === "paid" ? "status-paid" : "status-unpaid";
}

function getLocalSettings() {
  return {
    currencyName: localStorage.getItem(`${PREFIX}_currency_name`) || "شيكل",
    currencySymbol: localStorage.getItem(`${PREFIX}_currency_symbol`) || "₪",
    appMode: localStorage.getItem(`${PREFIX}_app_mode`) || "online"
  };
}

function setLocalSettings(settings) {
  localStorage.setItem(`${PREFIX}_currency_name`, settings.currencyName || "شيكل");
  localStorage.setItem(`${PREFIX}_currency_symbol`, settings.currencySymbol || "₪");
  localStorage.setItem(`${PREFIX}_app_mode`, settings.appMode || "online");
}

async function getClientSettings() {
  const offlineSettings = await idbGet("meta", "settings");
  if (offlineSettings) {
    return {
      currencyName: offlineSettings.currencyName || "شيكل",
      currencySymbol: offlineSettings.currencySymbol || "₪",
      appMode: offlineSettings.appMode || "online"
    };
  }
  return getLocalSettings();
}

function money(value, withName = false, settings = null) {
  const st = settings || getLocalSettings();
  const symbol = st?.currencySymbol || "₪";
  const name = st?.currencyName || "شيكل";
  const amount = Number(value || 0).toFixed(2);
  return withName ? `${amount} ${name} ${symbol}` : `${amount} ${symbol}`;
}

async function updateCurrencyUI() {
  const settings = await getClientSettings();
  setLocalSettings(settings);

  if (qs("sideCurrencyText")) qs("sideCurrencyText").innerText = `${settings.currencySymbol} ${settings.currencyName}`;
  if (qs("posCurrencyBadge")) qs("posCurrencyBadge").innerText = `${settings.currencySymbol} ${settings.currencyName}`;
  if (qs("sideModeText")) qs("sideModeText").innerText = settings.appMode === "offline" ? "أوفلاين" : "أونلاين";
  if (qs("setCurrentSystemMode")) qs("setCurrentSystemMode").innerText = settings.appMode === "offline" ? "أوفلاين" : "أونلاين";

  const session = getLocalSession();
  qs("offlineSyncWrap")?.classList.toggle("hidden", session?.appMode !== "online");
}

function applyPlanBadgeFromSession() {
  const session = getLocalSession();
  if (!session) return;

  const isUnlimited = session.durationType === "unlimited";
  const label = session.appMode === "offline"
    ? (isUnlimited ? "نسخة برو أوفلاين" : "نسخة أوفلاين")
    : (isUnlimited ? "نسخة برو أونلاين" : "نسخة أونلاين");

  if (qs("licensePlanBadge")) qs("licensePlanBadge").innerText = label;
  if (qs("settingsPlanBadge")) qs("settingsPlanBadge").innerText = label;
}

function updateLicenseUIFromSession() {
  const session = getLocalSession();
  if (!session) return;

  const remaining = session.expiresAt ? (new Date(session.expiresAt).getTime() - Date.now()) : null;

  if (qs("sideLicenseKey")) qs("sideLicenseKey").innerText = session.key || "-";
  if (qs("sideLicenseRemaining")) qs("sideLicenseRemaining").innerText = formatRemaining(remaining);

  if (qs("setCurrentKey")) qs("setCurrentKey").innerText = session.key || "-";
  if (qs("setCurrentLicenseType")) qs("setCurrentLicenseType").innerText = durationTypeLabel(session.durationType);
  if (qs("setCurrentLicenseStart")) qs("setCurrentLicenseStart").innerText = formatDateTime(session.startedAt);
  if (qs("setCurrentLicenseEnd")) qs("setCurrentLicenseEnd").innerText = session.expiresAt ? formatDateTime(session.expiresAt) : "غير محدود";
  if (qs("setCurrentLicenseRemaining")) qs("setCurrentLicenseRemaining").innerText = formatRemaining(remaining);

  applyPlanBadgeFromSession();
}

function startLicenseWatcher() {
  if (licenseWatcher) clearInterval(licenseWatcher);

  licenseWatcher = setInterval(async () => {
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
      return;
    }

    if (isOnline()) {
      try {
        await refreshSessionFromLicense();
      } catch {}
    }
  }, 10000);
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

  if (session.firstVerified !== true && !isOnline()) {
    showLogin("أول دخول يحتاج إنترنت");
    return;
  }

  await ensureClientDefaults();
  await loadCurrentStore();
  await updateCurrencyUI();

  if (isOnline() && session.appMode === "online") {
    attachRealtimeListeners();
    await refreshSessionFromLicense();
  } else {
    detachRealtimeListeners();
  }

  showApp();

  if (!history.state || !history.state.appLoaded) {
    history.replaceState({ appLoaded: true }, "");
  }

  appHistoryStack = [{ type: "tab", tabId: "pos" }];
  await switchTab("pos", true);
  updateLicenseUIFromSession();
  startLicenseWatcher();
  calculateTotal();
}

async function ensureClientDefaults() {
  const stores = await idbGetAll("stores");
  if (!stores.length) {
    await idbSet("stores", {
      id: "default",
      name: "المحل الرئيسي",
      logo: "",
      createdAt: new Date().toISOString()
    });
  }

  const settings = await idbGet("meta", "settings");
  if (!settings) {
    await idbSet("meta", {
      id: "settings",
      currencyName: "شيكل",
      currencySymbol: "₪",
      appMode: getLocalSession()?.appMode || "online"
    });
  }

  const counter = await idbGet("meta", "invoiceCounter");
  if (!counter) {
    await idbSet("meta", { id: "invoiceCounter", value: 0 });
  }

  const active = localStorage.getItem("activeStoreId");
  const activeStore = active ? await idbGet("stores", active) : null;
  if (!active || !activeStore) {
    currentStoreId = "default";
    localStorage.setItem("activeStoreId", "default");
  } else {
    currentStoreId = active;
  }
}

async function refreshSessionFromLicense() {
  const session = getLocalSession();
  if (!session?.key || !isOnline()) return;

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

  if (expiresAt && now >= new Date(expiresAt).getTime()) {
    clearLocalSession();
    showExpired("انتهى وقت المفتاح");
    return;
  }

  const appMode = lic.appMode || "online";
  const allowOfflineFallback = lic.allowOfflineFallback === true;

  const newSession = {
    ...session,
    durationType: lic.durationType || session.durationType,
    durationValue: lic.durationValue || session.durationValue,
    startedAt,
    expiresAt,
    appMode,
    allowOfflineFallback,
    rememberSession: lic.rememberSession !== false,
    firstVerified: true
  };

  setLocalSession(newSession);
  updateLicenseUIFromSession();

  const cloudSettingsSnap = await get(ref(db, pathClientSettings()));
  const cloudSettings = cloudSettingsSnap.exists() ? cloudSettingsSnap.val() : {};
  const currentSettings = await getClientSettings();

  const mergedSettings = {
    id: "settings",
    currencyName: cloudSettings?.currencyName || currentSettings.currencyName || "شيكل",
    currencySymbol: cloudSettings?.currencySymbol || currentSettings.currencySymbol || "₪",
    appMode
  };

  await idbSet("meta", mergedSettings);
  setLocalSettings(mergedSettings);

  await syncCloudToOffline();
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

  onValue(storesListenerRef, async snap => {
    if (snap.exists()) {
      const stores = Object.values(snap.val() || {});
      await idbClear("stores");
      for (const s of stores) await idbSet("stores", s);
    }
    await loadCurrentStore();
    if (!qs("tab-stores")?.classList.contains("hidden")) await renderStoresList();
  });

  onValue(productsListenerRef, async snap => {
    if (snap.exists()) {
      const items = Object.values(snap.val() || {});
      await idbClear("products");
      for (const p of items) await idbSet("products", p);
    }
    if (!qs("tab-products")?.classList.contains("hidden")) await renderProducts();
    const q = qs("posSearch")?.value.trim();
    if (q) await searchPosProducts();
  });

  onValue(invoicesListenerRef, async snap => {
    if (snap.exists()) {
      const items = Object.values(snap.val() || {});
      await idbClear("invoices");
      for (const inv of items) await idbSet("invoices", inv);
    }
    if (!qs("tab-invoices")?.classList.contains("hidden")) await renderInvoices();
    if (!qs("tab-reports")?.classList.contains("hidden")) await renderReports();
  });

  onValue(purchasesListenerRef, async snap => {
    if (snap.exists()) {
      const items = Object.values(snap.val() || {});
      await idbClear("purchases");
      for (const pur of items) await idbSet("purchases", pur);
    }
    if (!qs("tab-purchases")?.classList.contains("hidden")) await renderPurchases();
    if (!qs("tab-reports")?.classList.contains("hidden")) await renderReports();
  });
}

function detachRealtimeListeners() {
  if (storesListenerRef) off(storesListenerRef);
  if (productsListenerRef) off(productsListenerRef);
  if (invoicesListenerRef) off(invoicesListenerRef);
  if (purchasesListenerRef) off(purchasesListenerRef);
  if (licenseListenerRef) off(licenseListenerRef);
}

async function handleLicenseLogin() {
  const key = qs("licenseKeyInput")?.value.trim();
  const err = qs("loginError");
  err?.classList.add("hidden");

  if (!key) {
    if (err) {
      err.innerText = "يرجى إدخال المفتاح";
      err.classList.remove("hidden");
    }
    return;
  }

  if (!isOnline()) {
    showLogin("أول دخول يحتاج إنترنت");
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

  const session = {
    key,
    durationType,
    durationValue,
    startedAt,
    expiresAt,
    loginAt: new Date().toISOString(),
    appMode: lic.appMode || "online",
    allowOfflineFallback: lic.allowOfflineFallback === true,
    rememberSession: lic.rememberSession !== false,
    firstVerified: true
  };

  setLocalSession(session);

  currentStoreId = "default";
  localStorage.setItem("activeStoreId", "default");

  await ensureClientDefaults();
  await syncCloudToOffline();
  await loadCurrentStore();
  await updateCurrencyUI();

  if (session.appMode === "online") {
    attachRealtimeListeners();
  }

  if (qs("licenseKeyInput")) qs("licenseKeyInput").value = "";
  showApp();

  if (!history.state || !history.state.appLoaded) {
    history.replaceState({ appLoaded: true }, "");
  }

  appHistoryStack = [{ type: "tab", tabId: "pos" }];
  await switchTab("pos", true);
  updateLicenseUIFromSession();
  startLicenseWatcher();
  showToast("تم تسجيل الدخول بنجاح", "success");
}

function goToLoginFromExpired() {
  showLogin();
}

function pushAppState(state) {
  const last = appHistoryStack[appHistoryStack.length - 1];
  const same = JSON.stringify(last) === JSON.stringify(state);
  if (!same) appHistoryStack.push(state);
}

function activateNav(tabId) {
  document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  qs(`tab-${tabId}`)?.classList.remove("hidden");
  document.querySelector(`[data-tab="${tabId}"]`)?.classList.add("active");
}

async function switchTab(tabId, skipHistory = false) {
  if (!skipHistory) {
    pushAppState({ type: "tab", tabId });
    history.pushState({ appLoaded: true }, "");
  }

  activateNav(tabId);

  if (tabId === "products") await resetProductsAndRender();
  if (tabId === "invoices") await resetInvoicesAndRender();
  if (tabId === "purchases") await renderPurchases();
  if (tabId === "reports") await renderReports();
  if (tabId === "stores") await renderStoresList();
  if (tabId === "settings") await loadSettingsPage();

  lucide.createIcons();
}

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
    name: row.querySelector(".variant-name")?.value.trim() || "",
    qty: Number(row.querySelector(".variant-qty")?.value || 0)
  })).filter(v => v.name);
}

function renderVariantsForm(variants = []) {
  const box = qs("variantsBox");
  if (!box) return;
  box.innerHTML = "";
  safeVariants(variants).forEach(v => addVariantRow(v.name, v.qty));
}

function addVariantRow(name = "", qty = "") {
  const box = qs("variantsBox");
  if (!box) return;

  const row = document.createElement("div");
  row.className = "variant-row grid grid-cols-[1fr_120px_50px] gap-3 items-center";
  row.innerHTML = `
    <input type="text" class="variant-name w-full p-3 bg-gray-50 border rounded-xl" placeholder="اسم الصنف / المقاس" value="${escapeHtmlAttr(name)}">
    <input type="number" class="variant-qty w-full p-3 bg-gray-50 border rounded-xl text-center" placeholder="الكمية" value="${qty}">
    <button type="button" class="bg-red-50 text-red-600 rounded-xl h-full font-bold">✕</button>
  `;

  row.querySelector("button").onclick = () => {
    row.remove();
    syncStockWithVariants();
  };

  row.querySelector(".variant-qty").addEventListener("input", syncStockWithVariants);
  box.appendChild(row);
}

function syncStockWithVariants() {
  const variants = getVariantsFromForm();
  const total = variantsTotal(variants);
  const stockInput = qs("prodStock");
  const currentStock = Number(stockInput?.value || 0);
  if (stockInput && total > currentStock) stockInput.value = total;
}

function fillProductForm(p = null) {
  if (qs("editProductId")) qs("editProductId").value = p?.id || "";
  if (qs("prodName")) qs("prodName").value = p?.name || "";
  if (qs("prodCode")) qs("prodCode").value = p?.code || "";
  if (qs("prodStock")) qs("prodStock").value = p?.stock ?? "";
  if (qs("prodCost")) qs("prodCost").value = p?.cost ?? "";
  if (qs("prodPrice")) qs("prodPrice").value = p?.price ?? "";
  renderVariantsForm(p?.variants || []);
}

function resetProductForm() {
  if (qs("editProductId")) qs("editProductId").value = "";
  if (qs("modalTitle")) qs("modalTitle").innerText = "إضافة منتج جديد";
  if (qs("prodName")) qs("prodName").value = "";
  if (qs("prodCode")) qs("prodCode").value = "";
  if (qs("prodStock")) qs("prodStock").value = "";
  if (qs("prodCost")) qs("prodCost").value = "";
  if (qs("prodPrice")) qs("prodPrice").value = "";
  renderVariantsForm([]);
}

function openNewProduct() {
  resetProductForm();
  toggleModal("productModal", true);
}

async function saveProduct() {
  const existingId = qs("editProductId")?.value.trim() || "";
  const id = existingId || ("p_" + Date.now());
  const variants = getVariantsFromForm();
  const stockInput = Number(qs("prodStock")?.value || 0);
  const stock = Math.max(stockInput, variantsTotal(variants));

  let oldCreatedAt = null;
  if (existingId) {
    const old = await getEntity("products", existingId);
    oldCreatedAt = old?.createdAt || null;
  }

  const product = {
    id,
    storeId: currentStoreId,
    name: qs("prodName")?.value.trim() || "",
    code: qs("prodCode")?.value.trim() || "",
    stock,
    cost: parseFloat(qs("prodCost")?.value || 0) || 0,
    price: parseFloat(qs("prodPrice")?.value || 0) || 0,
    variants,
    createdAt: oldCreatedAt || new Date().toISOString()
  };

  if (!product.name || !product.code) {
    alert("يرجى إدخال اسم المنتج والكود");
    return;
  }

  await showLoader(existingId ? "جاري تعديل المنتج..." : "جاري إضافة المنتج...");
  await saveEntity("products", id, product);

  resetProductForm();
  toggleModal("productModal", false);
  showToast(existingId ? "تم تعديل المنتج" : "تم حفظ المنتج", "success");
  await renderProducts();
}

async function renderProducts() {
  const table = qs("productsTable");
  const loading = qs("productsLoading");
  const moreWrap = qs("productsLoadMoreWrap");
  const search = qs("inventorySearch")?.value.toLowerCase() || "";

  if (!table) return;

  table.innerHTML = "";
  loading?.classList.remove("hidden");

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
        <td class="p-4 text-gray-400">${money(p.cost)}</td>
        <td class="p-4 text-blue-700 font-bold">${money(p.price)}</td>
        <td class="p-4">
          <span class="px-3 py-1 rounded-lg text-xs font-bold ${Number(p.stock) <= 5 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}">
            ${Number(p.stock)}
          </span>
        </td>
        <td class="p-4 text-xs text-gray-500">${escapeHtml(variantsTxt)}</td>
        <td class="p-4 flex gap-2 flex-wrap">
          <button onclick="showProductBarcode('${escapeJs(p.code)}','${escapeJs(p.name)}')" class="text-purple-500 bg-purple-50 px-3 py-1 rounded-lg text-xs font-bold">باركود</button>
          <button onclick="editProduct('${p.id}')" class="text-blue-500 bg-blue-50 px-3 py-1 rounded-lg text-xs font-bold">تعديل</button>
          <button onclick="deleteProduct('${p.id}')" class="text-red-500 bg-red-50 px-3 py-1 rounded-lg text-xs font-bold">حذف</button>
        </td>
      </tr>
    `;
  });

  loading?.classList.add("hidden");
  moreWrap?.classList.toggle("hidden", visible.length >= filtered.length);
  lucide.createIcons();
}

function showProductBarcode(code, title) {
  if (qs("barcodeTitle")) qs("barcodeTitle").innerText = title || "باركود المنتج";
  if (qs("barcodeText")) qs("barcodeText").innerText = code || "";

  const svg = qs("productBarcodeSvg");
  if (!svg) return;
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
}

async function resetProductsAndRender() {
  productsCurrentLimit = productPageSize;
  await renderProducts();
}

async function loadMoreProducts() {
  productsCurrentLimit += productPageSize;
  await renderProducts();
}

async function editProduct(id) {
  await showLoader("جاري تحميل بيانات المنتج...");
  const p = await getEntity("products", id);
  if (!p) return;
  if (qs("modalTitle")) qs("modalTitle").innerText = "تعديل المنتج";
  fillProductForm(p);
  toggleModal("productModal", true);
}

async function deleteProduct(id) {
  if (!confirm("حذف المنتج؟")) return;
  await showLoader("جاري حذف المنتج...");
  await deleteEntity("products", id);
  showToast("تم حذف المنتج", "success");
  await renderProducts();
}

async function searchPosProducts() {
  const query = qs("posSearch")?.value.toLowerCase().trim() || "";
  const results = qs("posSearchResults");
  if (!results) return;

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
          <b class="text-blue-700">${money(p.price)}</b>
        </div>
      `;
      row.onclick = () => {
        addToCart(p);
        results.classList.add("hidden");
        if (qs("posSearch")) qs("posSearch").value = "";
      };
      results.appendChild(row);
    });
  }

  results.classList.remove("hidden");
}

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
  showToast(`تم إضافة ${safeProduct.name}`, "success");
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
  const tbody = qs("cartTable");
  const empty = qs("cartEmptyMsg");
  if (!tbody || !empty) return;

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
          <td class="p-4 whitespace-nowrap">${money(item.price)}</td>
          <td class="p-4 whitespace-nowrap">
            <div class="flex items-center gap-2">
              <button onclick="changeQty('${item.lineKey}', -1)" class="w-8 h-8 bg-gray-100 rounded-lg">-</button>
              <span class="w-8 text-center font-bold">${item.qty}</span>
              <button onclick="changeQty('${item.lineKey}', 1)" class="w-8 h-8 bg-gray-100 rounded-lg">+</button>
            </div>
          </td>
          <td class="p-4 font-bold text-blue-700 whitespace-nowrap">${money(Number(item.price) * item.qty)}</td>
          <td class="p-4 whitespace-nowrap"><button onclick="removeFromCart('${item.lineKey}')" class="text-red-500"><i data-lucide="trash-2" size="16"></i></button></td>
        </tr>
      `;
    });
  }

  lucide.createIcons();
  calculateTotal();
}

async function changeCartVariant(lineKey, variantName) {
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
}

async function changeQty(lineKey, delta) {
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
}

function removeFromCart(lineKey) {
  cart = cart.filter(i => i.lineKey !== lineKey);
  renderCart();
}

function calculateDiscountValue(subtotal) {
  const discountType = qs("discountType")?.value || "fixed";
  const raw = parseFloat(qs("posDiscount")?.value || 0) || 0;

  if (discountType === "percent") {
    const clamped = Math.max(0, Math.min(100, raw));
    return subtotal * (clamped / 100);
  }

  return Math.max(0, raw);
}

function calculateTotal() {
  const sub = cart.reduce((s, i) => s + (Number(i.price) * i.qty), 0);
  const discountValue = calculateDiscountValue(sub);
  const total = Math.max(0, sub - discountValue);

  if (qs("subtotal")) qs("subtotal").innerText = money(sub);
  if (qs("discountPreview")) qs("discountPreview").innerText = money(discountValue);
  if (qs("finalTotal")) qs("finalTotal").innerText = money(total);
}

function updateCreateInvoiceButton() {
  if (qs("createInvoiceBtn")) {
    qs("createInvoiceBtn").innerText = editingInvoiceId ? "حفظ تعديل الفاتورة" : "إنشاء فاتورة";
  }
}

async function getNextInvoiceNumber() {
  const counter = await idbGet("meta", "invoiceCounter");
  const current = Number(counter?.value || 0);
  const next = current + 1;

  await idbSet("meta", { id: "invoiceCounter", value: next });

  const session = getLocalSession();
  if (isOnline() && session?.appMode === "online") {
    try {
      await set(ref(db, `${pathClientCounters()}/invoiceAutoNumber`), next);
    } catch {}
  }

  return next;
}

async function applyStockChange(items, direction) {
  const products = await getAllProducts();

  for (const item of items) {
    const p = products.find(x => x.id === item.id);
    if (!p) continue;

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

    const updated = {
      ...p,
      stock: Math.max(0, currentStock + (direction * Number(item.qty || 0))),
      variants: updatedVariants
    };

    await saveEntity("products", item.id, updated);
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

async function buildInvoicePayload(id) {
  const settings = await getClientSettings();
  const subtotalValue = cart.reduce((s, i) => s + (Number(i.price) * i.qty), 0);
  const discountValue = calculateDiscountValue(subtotalValue);
  const totalValue = Math.max(0, subtotalValue - discountValue);

  return {
    id: String(id),
    storeId: currentStoreId,
    date: new Date().toISOString(),
    customer: qs("customerName")?.value.trim() || "عميل نقدي",
    phone: qs("customerPhone")?.value.trim() || "",
    payment: qs("paymentMethod")?.value || "cash",
    status: qs("invoiceStatus")?.value || "paid",
    notes: qs("invoiceNotes")?.value.trim() || "",
    discountType: qs("discountType")?.value || "fixed",
    discountRaw: parseFloat(qs("posDiscount")?.value || 0) || 0,
    currencyName: settings.currencyName,
    currencySymbol: settings.currencySymbol,
    items: cart.map(i => clone(i)),
    subtotal: subtotalValue,
    discount: discountValue,
    total: totalValue,
    totalCost: cart.reduce((s, i) => s + (Number(i.cost) * i.qty), 0),
    source: "local"
  };
}

function clearInvoiceEditor() {
  cart = [];
  editingInvoiceId = null;
  renderCart();

  if (qs("customerName")) qs("customerName").value = "";
  if (qs("customerPhone")) qs("customerPhone").value = "";
  if (qs("paymentMethod")) qs("paymentMethod").value = "cash";
  if (qs("invoiceStatus")) qs("invoiceStatus").value = "paid";
  if (qs("invoiceNotes")) qs("invoiceNotes").value = "";
  if (qs("discountType")) qs("discountType").value = "fixed";
  if (qs("posDiscount")) qs("posDiscount").value = 0;

  calculateTotal();
  updateCreateInvoiceButton();
  qs("customerSuggestions")?.classList.add("hidden");
}

async function checkout() {
  if (cart.length === 0) return;
  if (!(await validateCartAgainstStock())) return;

  if (editingInvoiceId) {
    await showLoader("جاري حفظ تعديل الفاتورة...");

    const oldInvoice = await getEntity("invoices", editingInvoiceId);
    if (!oldInvoice) {
      alert("الفاتورة الأصلية غير موجودة");
      return;
    }

    await applyStockChange(oldInvoice.items || [], +1);

    if (!(await validateCartAgainstStock())) {
      await applyStockChange(oldInvoice.items || [], -1);
      return;
    }

    await applyStockChange(cart, -1);

    const newInvoice = await buildInvoicePayload(editingInvoiceId);
    await saveEntity("invoices", editingInvoiceId, newInvoice);

    currentInvoiceId = editingInvoiceId;
    editingInvoiceId = null;
    updateCreateInvoiceButton();
    clearInvoiceEditor();
    showToast("تم حفظ تعديل الفاتورة", "success");
    await viewInvoice(newInvoice.id);
    return;
  }

  await showLoader("جاري إنشاء الفاتورة...");
  const invoiceNumber = await getNextInvoiceNumber();
  const invoice = await buildInvoicePayload(invoiceNumber);

  await applyStockChange(cart, -1);
  await saveEntity("invoices", invoice.id, invoice);

  currentInvoiceId = invoice.id;
  clearInvoiceEditor();
  showToast("تم إنشاء الفاتورة", "success");
  await viewInvoice(invoice.id);
}

async function editInvoice(id) {
  await showLoader("جاري تحميل الفاتورة للتعديل...");
  const inv = await getEntity("invoices", id);
  if (!inv) {
    alert("الفاتورة غير موجودة");
    return;
  }

  editingInvoiceId = id;
  cart = (inv.items || []).map(i => clone(i));

  if (qs("customerName")) qs("customerName").value = inv.customer || "";
  if (qs("customerPhone")) qs("customerPhone").value = inv.phone || "";
  if (qs("paymentMethod")) qs("paymentMethod").value = inv.payment || "cash";
  if (qs("invoiceStatus")) qs("invoiceStatus").value = inv.status || "paid";
  if (qs("invoiceNotes")) qs("invoiceNotes").value = inv.notes || "";
  if (qs("discountType")) qs("discountType").value = inv.discountType || "fixed";
  if (qs("posDiscount")) qs("posDiscount").value = Number(inv.discountRaw || 0);

  renderCart();
  calculateTotal();
  updateCreateInvoiceButton();
  await switchTab("pos");
}

async function deleteInvoice(id) {
  if (!confirm("حذف الفاتورة؟ سيتم إرجاع الكميات للمخزون.")) return;

  await showLoader("جاري حذف الفاتورة...");
  const inv = await getEntity("invoices", id);
  if (!inv) return;

  await applyStockChange(inv.items || [], +1);
  await deleteEntity("invoices", id);

  if (editingInvoiceId === id) {
    clearInvoiceEditor();
  }

  showToast("تم حذف الفاتورة", "success");
  await renderInvoices();
}

function renderInvoiceBarcode(id) {
  const code = `INV-${id}`;
  const svg = qs("invoiceBarcodeSvg");
  if (!svg) return;

  svg.innerHTML = "";
  try {
    JsBarcode(svg, code, {
      format: "CODE128",
      lineColor: "#1d4ed8",
      width: 1.4,
      height: 36,
      displayValue: false,
      margin: 0
    });
    if (qs("invoiceBarcodeText")) qs("invoiceBarcodeText").innerText = code;
  } catch {
    if (qs("invoiceBarcodeText")) qs("invoiceBarcodeText").innerText = code;
  }
}

async function viewInvoice(id) {
  await showLoader("جاري تحميل الفاتورة...");

  const inv = await getEntity("invoices", id);
  if (!inv) {
    alert("الفاتورة غير موجودة");
    return;
  }

  currentInvoiceId = id;
  pushAppState({ type: "invoice", invoiceId: id });
  history.pushState({ appLoaded: true }, "");

  let store = await idbGet("stores", inv.storeId);
  if (!store) store = { name: "المحل", logo: "" };

  qs("mainApp")?.classList.add("hidden");
  qs("invoicePage")?.classList.remove("hidden");

  if (qs("invPageStoreName")) qs("invPageStoreName").innerText = store.name || "المحل";
  setImageOrHide(qs("invPageLogo"), store.logo);
  if (qs("invPageId")) qs("invPageId").innerText = `#${id}`;
  if (qs("invPageDate")) qs("invPageDate").innerText = new Date(inv.date).toLocaleString("ar-EG");
  if (qs("invPageCustomer")) qs("invPageCustomer").innerText = inv.customer || "-";
  if (qs("invPagePhone")) qs("invPagePhone").innerText = inv.phone || "-";
  if (qs("invPagePayment")) qs("invPagePayment").innerText = inv.payment === "cash" ? "نقداً" : "إلكتروني";
  if (qs("invPageStatus")) qs("invPageStatus").innerText = statusLabel(inv.status || "paid");

  const itemArea = qs("invPageItems");
  if (itemArea) {
    itemArea.innerHTML = "";
    (inv.items || []).forEach((i, index) => {
      itemArea.innerHTML += `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(i.name)}</td>
          <td>${escapeHtml(i.selectedVariant || "-")}</td>
          <td>${i.qty}</td>
          <td>${Number(i.price).toFixed(2)} ${escapeHtml(inv.currencySymbol || "₪")}</td>
          <td>${(Number(i.price) * i.qty).toFixed(2)} ${escapeHtml(inv.currencySymbol || "₪")}</td>
        </tr>
      `;
    });
  }

  if (qs("invPageSub")) qs("invPageSub").innerText = `${Number(inv.subtotal).toFixed(2)} ${inv.currencySymbol || "₪"}`;
  if (qs("invPageDiscount")) qs("invPageDiscount").innerText = `${Number(inv.discount).toFixed(2)} ${inv.currencySymbol || "₪"}`;
  if (qs("invPageTotal")) qs("invPageTotal").innerText = `${Number(inv.total).toFixed(2)} ${inv.currencySymbol || "₪"}`;

  renderInvoiceBarcode(id);
  lucide.createIcons();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function backFromInvoicePage() {
  qs("invoicePage")?.classList.add("hidden");
  qs("mainApp")?.classList.remove("hidden");
  switchTab("invoices");
}

function printInvoicePage() {
  window.print();
}

async function prepareInvoiceForExport() {
  const area = qs("invoicePrintArea");
  if (!area) return () => {};

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

async function exportInvoicePage(type) {
  const area = qs("invoicePrintArea");
  if (!area) return;

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
}

function normalizePhoneForSend(phone, mode, customPrefix) {
  let clean = String(phone || "").replace(/[^\d]/g, "");
  if (!clean) return "";

  if (mode === "custom") {
    const prefix = String(customPrefix || "").replace(/[^\d]/g, "");
    return prefix + clean.replace(/^0+/, "");
  }

  if (mode === "970" || mode === "972") {
    return mode + clean.replace(/^0+/, "");
  }

  return clean;
}

async function shareCurrentInvoice() {
  if (!currentInvoiceId) return;

  const inv = await getEntity("invoices", currentInvoiceId);
  if (!inv) return;

  const message =
`فاتورة رقم #${inv.id}
العميل: ${inv.customer || "-"}
الإجمالي: ${Number(inv.total).toFixed(2)} ${inv.currencySymbol || "₪"}
الحالة: ${statusLabel(inv.status || "paid")}
التاريخ: ${new Date(inv.date).toLocaleString("ar-EG")}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: `فاتورة #${inv.id}`,
        text: message
      });
      return;
    } catch {}
  }

  if (inv.phone) {
    const url = `https://wa.me/${normalizePhoneForSend(inv.phone, "auto", "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  } else {
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }
}

async function renderInvoices() {
  const query = qs("invSearchQuery")?.value.toLowerCase() || "";
  const statusFilter = qs("invoiceStatusFilter")?.value || "all";
  const table = qs("invoicesTable");
  const loading = qs("invoicesLoading");
  const moreWrap = qs("invoicesLoadMoreWrap");

  if (!table) return;

  table.innerHTML = "";
  loading?.classList.remove("hidden");

  const invoices = await getAllInvoices();
  const filtered = invoices
    .filter(inv =>
      inv.storeId === currentStoreId &&
      (String(inv.id).includes(query) || (inv.customer || "").toLowerCase().includes(query) || (inv.phone || "").toLowerCase().includes(query)) &&
      (statusFilter === "all" || (inv.status || "paid") === statusFilter)
    )
    .sort((a, b) => Number(b.id) - Number(a.id));

  const visible = filtered.slice(0, invoicesCurrentLimit);

  visible.forEach(inv => {
    table.innerHTML += `
      <tr class="border-b hover:bg-gray-50">
        <td class="p-4 font-bold">#${inv.id}</td>
        <td class="p-4 text-xs text-gray-400">${new Date(inv.date).toLocaleString("ar-EG")}</td>
        <td class="p-4">
          <button onclick="openCustomerHistory('${escapeJs(inv.customer || "")}','${escapeJs(inv.phone || "")}')" class="text-blue-700 font-bold hover:underline">
            ${escapeHtml(inv.customer || "-")}
          </button>
          ${inv.phone ? `<div class="text-xs text-gray-400 mt-1">${escapeHtml(inv.phone)}</div>` : ""}
        </td>
        <td class="p-4">
          <button onclick="openStatusModal('${inv.id}','${inv.status || "paid"}')" class="status-pill ${statusClass(inv.status || "paid")}">
            ${statusLabel(inv.status || "paid")}
          </button>
        </td>
        <td class="p-4 font-bold text-blue-700">${Number(inv.total).toFixed(2)} ${escapeHtml(inv.currencySymbol || "₪")}</td>
        <td class="p-4 text-xs">${inv.payment === "cash" ? "نقداً" : "إلكتروني"}</td>
        <td class="p-4">
          ${inv.notes ? `<button onclick="openNoteModal('${escapeJs(inv.notes)}')" class="text-slate-700 bg-slate-100 px-3 py-1 rounded-lg text-xs font-bold">عرض</button>` : `<span class="text-gray-300">-</span>`}
        </td>
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

  loading?.classList.add("hidden");
  moreWrap?.classList.toggle("hidden", visible.length >= filtered.length);
}

async function resetInvoicesAndRender() {
  invoicesCurrentLimit = invoicePageSize;
  await renderInvoices();
}

async function loadMoreInvoices() {
  invoicesCurrentLimit += invoicePageSize;
  await renderInvoices();
}

function openPurchaseModal() {
  if (qs("purchaseModalTitle")) qs("purchaseModalTitle").innerText = "إضافة فاتورة شراء";
  if (qs("editPurchaseId")) qs("editPurchaseId").value = "";
  if (qs("purchaseSupplier")) qs("purchaseSupplier").value = "";
  if (qs("purchaseAmount")) qs("purchaseAmount").value = "";
  if (qs("purchaseNotes")) qs("purchaseNotes").value = "";
  toggleModal("purchaseModal", true);
}

async function savePurchase() {
  const existingId = qs("editPurchaseId")?.value || "";
  const id = existingId || ("pur_" + Date.now());

  let oldCreatedAt = null;
  if (existingId) {
    const old = await getEntity("purchases", id);
    oldCreatedAt = old?.createdAt || null;
  }

  const purchase = {
    id,
    storeId: currentStoreId,
    supplier: qs("purchaseSupplier")?.value.trim() || "",
    amount: parseFloat(qs("purchaseAmount")?.value || 0) || 0,
    notes: qs("purchaseNotes")?.value.trim() || "",
    createdAt: oldCreatedAt || new Date().toISOString()
  };

  if (!purchase.supplier || purchase.amount <= 0) {
    alert("أدخل اسم المورد والمبلغ");
    return;
  }

  await showLoader("جاري حفظ فاتورة الشراء...");
  await saveEntity("purchases", id, purchase);
  toggleModal("purchaseModal", false);
  showToast("تم حفظ فاتورة الشراء", "success");
  await renderPurchases();
}

async function editPurchase(id) {
  const p = await getEntity("purchases", id);
  if (!p) return;

  if (qs("purchaseModalTitle")) qs("purchaseModalTitle").innerText = "تعديل فاتورة شراء";
  if (qs("editPurchaseId")) qs("editPurchaseId").value = p.id || "";
  if (qs("purchaseSupplier")) qs("purchaseSupplier").value = p.supplier || "";
  if (qs("purchaseAmount")) qs("purchaseAmount").value = p.amount || "";
  if (qs("purchaseNotes")) qs("purchaseNotes").value = p.notes || "";
  toggleModal("purchaseModal", true);
}

async function deletePurchase(id) {
  if (!confirm("حذف فاتورة الشراء؟")) return;
  await showLoader("جاري حذف فاتورة الشراء...");
  await deleteEntity("purchases", id);
  showToast("تم حذف فاتورة الشراء", "success");
  await renderPurchases();
}

async function renderPurchases() {
  const table = qs("purchasesTable");
  const loading = qs("purchasesLoading");
  if (!table) return;

  table.innerHTML = "";
  loading?.classList.remove("hidden");

  const purchases = await getAllPurchases();
  purchases
    .filter(p => p.storeId === currentStoreId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach(p => {
      table.innerHTML += `
        <tr class="border-b hover:bg-gray-50">
          <td class="p-4 font-bold">${escapeHtml(p.supplier)}</td>
          <td class="p-4 text-red-600 font-bold">${money(p.amount)}</td>
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

  loading?.classList.add("hidden");
}

async function renderReports() {
  await showLoader("جاري تحميل التقارير...");
  const filter = qs("reportFilter")?.value || "today";
  let sales = 0;
  let costs = 0;
  let count = 0;
  let purchases = 0;
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

  if (qs("repWholesaleSales")) qs("repWholesaleSales").innerText = money(costs);
  if (qs("repTotalSales")) qs("repTotalSales").innerText = money(sales);
  if (qs("repTotalProfit")) qs("repTotalProfit").innerText = money(sales - costs);
  if (qs("repPurchases")) qs("repPurchases").innerText = money(purchases);
  if (qs("repCount")) qs("repCount").innerText = count;
}

async function loadSettingsPage() {
  await showLoader("جاري تحميل الإعدادات...");
  const store = await idbGet("stores", currentStoreId);
  if (!store) return;

  const settings = await getClientSettings();

  if (qs("setStoreName")) qs("setStoreName").value = store.name || "";
  if (qs("setStoreLogo")) qs("setStoreLogo").value = store.logo || "";
  setImageOrHide(qs("settingsLogoPreview"), store.logo);

  if (qs("currencyNameInput")) qs("currencyNameInput").value = settings.currencyName || "شيكل";
  if (qs("currencySymbolInput")) qs("currencySymbolInput").value = settings.currencySymbol || "₪";

  updateLicenseUIFromSession();
  if (qs("setCurrentSystemMode")) qs("setCurrentSystemMode").innerText = settings.appMode === "offline" ? "أوفلاين" : "أونلاين";
  qs("offlineSyncWrap")?.classList.toggle("hidden", getLocalSession()?.appMode !== "online");
}

async function saveSettings() {
  await showLoader("جاري الحفظ...");

  const currencyName = qs("currencyNameInput")?.value.trim() || "شيكل";
  const currencySymbol = qs("currencySymbolInput")?.value.trim() || "₪";
  const session = getLocalSession();

  const store = await getEntity("stores", currentStoreId);
  if (store) {
    await saveEntity("stores", currentStoreId, {
      ...store,
      name: qs("setStoreName")?.value.trim() || "المحل الرئيسي",
      logo: qs("setStoreLogo")?.value.trim() || ""
    });
  }

  const settingsPayload = {
    id: "settings",
    currencyName,
    currencySymbol,
    appMode: session?.appMode || "online",
    updatedAt: new Date().toISOString()
  };

  await idbSet("meta", settingsPayload);
  setLocalSettings(settingsPayload);

  if (isOnline() && session?.appMode === "online") {
    try {
      await update(ref(db, pathClientSettings()), {
        currencyName,
        currencySymbol,
        appMode: session?.appMode || "online",
        updatedAt: new Date().toISOString()
      });
    } catch {}
  }

  await loadCurrentStore();
  await updateCurrencyUI();
  renderCart();
  await resetInvoicesAndRender();
  await renderPurchases();
  await renderReports();
  updateLicenseUIFromSession();

  showToast("تم حفظ الإعدادات بنجاح", "success");
}

async function logoutUser() {
  const session = getLocalSession();

  if (session?.key && isOnline() && session.appMode === "online") {
    try {
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
    } catch {}
  }

  detachRealtimeListeners();
  clearLocalSession();
  localStorage.removeItem("activeStoreId");
  if (licenseWatcher) clearInterval(licenseWatcher);
  showLogin("تم تسجيل الخروج بنجاح");
}

function toggleModal(id, show) {
  qs(id)?.classList.toggle("hidden", !show);

  if (id === "productModal" && !show) {
    resetProductForm();
  }

  if (id === "purchaseModal" && !show) {
    if (qs("editPurchaseId")) qs("editPurchaseId").value = "";
    if (qs("purchaseSupplier")) qs("purchaseSupplier").value = "";
    if (qs("purchaseAmount")) qs("purchaseAmount").value = "";
    if (qs("purchaseNotes")) qs("purchaseNotes").value = "";
    if (qs("purchaseModalTitle")) qs("purchaseModalTitle").innerText = "إضافة فاتورة شراء";
  }
}

async function buildBackupPayload() {
  const [stores, products, invoices, purchases, settings] = await Promise.all([
    getAllStores(),
    getAllProducts(),
    getAllInvoices(),
    getAllPurchases(),
    getClientSettings()
  ]);

  return {
    backupVersion: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    key: currentLicenseKey(),
    settings,
    stores,
    products,
    invoices,
    purchases
  };
}

async function downloadBackupFile() {
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
}

async function saveCloudBackup() {
  if (!currentLicenseKey()) return;
  if (!isOnline() || getLocalSession()?.appMode !== "online") {
    alert("هذه العملية تحتاج نسخة أونلاين وإنترنت");
    return;
  }

  await showLoader("جاري حفظ النسخة الاحتياطية...");

  const payload = await buildBackupPayload();
  const backupId = "backup_" + Date.now();

  await set(ref(db, `${pathClientBackups()}/${backupId}`), payload);
  showToast("تم حفظ النسخة الاحتياطية السحابية", "success");
}

async function restoreBackupFromFile(event) {
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
    showToast("تمت استعادة النسخة بنجاح", "success");
    await bootSessionState();
  } catch (err) {
    console.error(err);
    alert("تعذر استعادة النسخة الاحتياطية");
  } finally {
    event.target.value = "";
  }
}

async function restoreBackupPayload(data) {
  await idbClear("stores");
  await idbClear("products");
  await idbClear("invoices");
  await idbClear("purchases");

  for (const store of (data.stores || [])) await idbSet("stores", store);
  for (const p of (data.products || [])) await idbSet("products", p);
  for (const inv of (data.invoices || [])) await idbSet("invoices", inv);
  for (const pur of (data.purchases || [])) await idbSet("purchases", pur);

  if (data.settings) {
    await idbSet("meta", { id: "settings", ...data.settings });
    setLocalSettings(data.settings);
  }

  const maxInvoiceId = Math.max(0, ...(data.invoices || []).map(i => Number(i.id) || 0));
  await idbSet("meta", { id: "invoiceCounter", value: maxInvoiceId });

  if (isOnline() && getLocalSession()?.appMode === "online") {
    await uploadOfflineDataToCloud();
  }
}

function rankRearCamera(devices) {
  if (!devices?.length) return null;
  const rearKeywords = ["back", "rear", "environment", "خلف", "خلفية"];
  const exactRear = devices.find(d => rearKeywords.some(k => (d.label || "").toLowerCase().includes(k)));
  return exactRear || devices[devices.length - 1];
}

function indicateScannerSuccess() {
  const frame = qs("scannerFrameBox");
  const audio = qs("scanBeep");

  frame?.classList.remove("hidden");
  frame?.classList.add("show");

  try {
    audio.currentTime = 0;
    audio.play();
  } catch {}

  setTimeout(() => {
    frame?.classList.remove("show");
    frame?.classList.add("hidden");
  }, 650);
}

async function openScanner(target) {
  scanTarget = target;
  scannerTorchOn = false;
  torchSupported = false;
  scannerTrack = null;

  qs("scannerModal")?.classList.remove("hidden");

  if (qs("scannerTitle")) {
    qs("scannerTitle").innerText =
      target === "invoice" ? "مسح فاتورة" :
      target === "product-code" ? "مسح كود المنتج" :
      "مسح الباركود";
  }

  pushAppState({ type: "scanner", target });
  history.pushState({ appLoaded: true }, "");

  try {
    if (!scanner) {
      scanner = new Html5Qrcode("reader");
    }

    const devices = await Html5Qrcode.getCameras();
    if (!devices?.length) {
      alert("لم يتم العثور على كاميرا");
      await closeScanner();
      return;
    }

    const chosen = rankRearCamera(devices);
    const rearCameraId = chosen?.id || devices[0].id;

    await startScannerWithRearCamera(rearCameraId);
  } catch (err) {
    console.error(err);
    alert("تعذر الحصول على صلاحية الكاميرا.");
    await closeScanner();
  }
}

async function startScannerWithRearCamera(rearCameraId) {
  if (!scanner || !rearCameraId) return;

  let handled = false;

  try {
    await scanner.start(
      { deviceId: { exact: rearCameraId } },
      {
        fps: 10,
        qrbox: { width: 250, height: 170 }
      },
      async decodedText => {
        if (handled) return;
        handled = true;

        indicateScannerSuccess();
        await handleScanResult(decodedText);

        try {
          await closeScanner();
        } catch (e) {
          console.error(e);
        }
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
        qs("scannerTorchBtn")?.classList.toggle("hidden", !hasTorch);
        qs("scannerTorchQuickBtn")?.classList.toggle("hidden", !hasTorch);
      } catch {
        torchSupported = false;
        qs("scannerTorchBtn")?.classList.add("hidden");
        qs("scannerTorchQuickBtn")?.classList.add("hidden");
      }
    }, 300);
  } catch (err) {
    console.error(err);
    alert("تعذر بدء الكاميرا الخلفية");
    await closeScanner();
  }
}

async function toggleScannerTorch() {
  if (!scannerTrack || !torchSupported) return;

  try {
    scannerTorchOn = !scannerTorchOn;
    await scannerTrack.applyConstraints({
      advanced: [{ torch: scannerTorchOn }]
    });

    if (qs("scannerTorchBtn")) {
      qs("scannerTorchBtn").innerText = scannerTorchOn ? "إيقاف الفلاش" : "تشغيل / إيقاف الفلاش";
    }
  } catch (err) {
    console.error(err);
    alert("الفلاش غير مدعوم على هذا الجهاز أو المتصفح");
  }
}

async function handleScanResult(text) {
  const scanned = String(text || "").trim();

  if (scanTarget === "pos") {
    const products = await getAllProducts();
    const found = products.find(p =>
      p.storeId === currentStoreId &&
      String(p.code || "").trim().toLowerCase() === scanned.toLowerCase()
    );

    if (found) {
      addToCart(found);
    } else {
      alert("لم يتم العثور على منتج بهذا الكود");
    }
    return;
  }

  if (scanTarget === "product-code") {
    if (qs("prodCode")) qs("prodCode").value = scanned;
    showToast("تم التقاط كود المنتج", "success");
    return;
  }

  const idMatch = scanned.match(/INV-(\d+)/i) || scanned.match(/^(\d+)$/);
  if (idMatch) {
    await viewInvoice(idMatch[1]);
  } else {
    alert("تعذر قراءة رقم الفاتورة من الكود");
  }
}

async function closeScanner(fromPopState = false) {
  try {
    if (scannerTrack && torchSupported && scannerTorchOn) {
      await scannerTrack.applyConstraints({ advanced: [{ torch: false }] });
    }
  } catch {}

  try {
    if (scanner) {
      await scanner.stop();
      try { await scanner.clear(); } catch {}
    }
  } catch {}

  scannerTrack = null;
  scannerTorchOn = false;
  torchSupported = false;

  qs("scannerTorchBtn")?.classList.add("hidden");
  qs("scannerTorchQuickBtn")?.classList.add("hidden");
  if (qs("scannerTorchBtn")) qs("scannerTorchBtn").innerText = "تشغيل / إيقاف الفلاش";
  qs("scannerModal")?.classList.add("hidden");
  qs("scannerFrameBox")?.classList.remove("show");
  qs("scannerFrameBox")?.classList.add("hidden");

  if (!fromPopState) {
    // لا شيء إضافي، popstate يعالج الرجوع فقط
  }
}

async function scanBarcodeFromImage(event, target) {
  const file = event.target.files?.[0];
  if (!file) return;

  scanTarget = target;

  try {
    await showLoader("جاري قراءة الصورة...", 400);

    const tempId = "temp-reader-" + Date.now();
    const tempDiv = document.createElement("div");
    tempDiv.id = tempId;
    tempDiv.style.display = "none";
    document.body.appendChild(tempDiv);

    const imageScanner = new Html5Qrcode(tempId);
    const result = await imageScanner.scanFile(file, true);

    try { await imageScanner.clear(); } catch {}
    if (tempDiv.parentNode) tempDiv.parentNode.removeChild(tempDiv);

    indicateScannerSuccess();
    await handleScanResult(result);
  } catch (err) {
    console.error(err);
    alert("تعذر قراءة الباركود من الصورة.");
  } finally {
    event.target.value = "";
  }
}

function openStatusModal(invoiceId, currentStatus) {
  if (qs("statusInvoiceId")) qs("statusInvoiceId").value = invoiceId;
  if (qs("statusSelect")) qs("statusSelect").value = currentStatus || "paid";
  toggleModal("statusModal", true);
}

async function saveInvoiceStatus() {
  const id = qs("statusInvoiceId")?.value;
  const status = qs("statusSelect")?.value || "paid";
  if (!id) return;

  await showLoader("جاري تحديث الحالة...");
  const inv = await getEntity("invoices", id);
  if (!inv) return;

  await saveEntity("invoices", id, {
    ...inv,
    status,
    updatedAt: new Date().toISOString()
  });

  toggleModal("statusModal", false);
  await renderInvoices();

  if (!qs("invoicePage")?.classList.contains("hidden") && String(currentInvoiceId) === String(id)) {
    await viewInvoice(id);
  }

  showToast("تم تحديث الحالة", "success");
}

function openNoteModal(note) {
  if (qs("noteModalContent")) qs("noteModalContent").innerText = note || "-";
  toggleModal("noteModal", true);
}

function inRangeByFilter(dateString, filter) {
  const d = new Date(dateString);
  const now = new Date();

  if (filter === "all") return true;
  if (filter === "day") return d.toDateString() === now.toDateString();
  if (filter === "week") return (now - d) < 7 * 24 * 60 * 60 * 1000;
  if (filter === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (filter === "year") return d.getFullYear() === now.getFullYear();
  return true;
}

async function openCustomerHistory(name, phone = "") {
  currentCustomerHistoryName = name;
  currentCustomerHistoryPhone = phone;
  const range = qs("customerHistoryRange")?.value || "day";
  const invoices = await getAllInvoices();

  const filtered = invoices
    .filter(inv =>
      inv.storeId === currentStoreId &&
      String(inv.customer || "").trim() === String(name || "").trim() &&
      String(inv.phone || "").trim() === String(phone || "").trim() &&
      inRangeByFilter(inv.date, range)
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  let paid = 0;
  let unpaid = 0;
  let total = 0;

  filtered.forEach(inv => {
    const t = Number(inv.total || 0);
    total += t;
    if (inv.status === "paid") paid += t;
    else unpaid += t;
  });

  if (qs("customerHistoryTitle")) qs("customerHistoryTitle").innerText = `${name || "بدون اسم"}${phone ? " - " + phone : ""}`;
  if (qs("custPaidTotal")) qs("custPaidTotal").innerText = money(paid);
  if (qs("custUnpaidTotal")) qs("custUnpaidTotal").innerText = money(unpaid);
  if (qs("custGrandTotal")) qs("custGrandTotal").innerText = money(total);

  const tbody = qs("customerHistoryTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-gray-400">لا يوجد سجل لهذا العميل ضمن الفترة المحددة</td></tr>`;
  } else {
    filtered.forEach(inv => {
      tbody.innerHTML += `
        <tr class="border-t">
          <td class="p-4 font-bold">#${inv.id}</td>
          <td class="p-4 text-sm">${new Date(inv.date).toLocaleString("ar-EG")}</td>
          <td class="p-4"><span class="status-pill ${statusClass(inv.status || "paid")}">${statusLabel(inv.status || "paid")}</span></td>
          <td class="p-4 font-bold">${Number(inv.total).toFixed(2)} ${escapeHtml(inv.currencySymbol || "₪")}</td>
          <td class="p-4">
            ${inv.notes ? `<button onclick="openNoteModal('${escapeJs(inv.notes)}')" class="text-slate-700 bg-slate-100 px-3 py-1 rounded-lg text-xs font-bold">عرض</button>` : `<span class="text-gray-300">-</span>`}
          </td>
        </tr>
      `;
    });
  }

  toggleModal("customerHistoryModal", true);
}

async function createAggregateInvoiceForCustomer() {
  if (!currentCustomerHistoryName) return;

  const statusFilter = qs("customerInvoiceAggregateStatus")?.value || "all";
  const rangeFilter = qs("customerInvoiceAggregateRange")?.value || "all";

  const invoices = await getAllInvoices();
  const customerInvoices = invoices.filter(inv =>
    inv.storeId === currentStoreId &&
    String(inv.customer || "").trim() === String(currentCustomerHistoryName).trim() &&
    String(inv.phone || "").trim() === String(currentCustomerHistoryPhone || "").trim() &&
    (statusFilter === "all" || inv.status === statusFilter) &&
    inRangeByFilter(inv.date, rangeFilter)
  );

  if (!customerInvoices.length) {
    alert("لا يوجد فواتير مطابقة لهذا العميل");
    return;
  }

  const total = customerInvoices.reduce((s, inv) => s + Number(inv.total || 0), 0);
  const settings = await getClientSettings();
  const invoiceId = await getNextInvoiceNumber();

  const aggregateInvoice = {
    id: String(invoiceId),
    storeId: currentStoreId,
    date: new Date().toISOString(),
    customer: currentCustomerHistoryName,
    phone: currentCustomerHistoryPhone || "",
    payment: "cash",
    status: "paid",
    notes: `فاتورة مجمعة للعميل - عدد الفواتير: ${customerInvoices.length}`,
    discountType: "fixed",
    discountRaw: 0,
    currencyName: settings.currencyName,
    currencySymbol: settings.currencySymbol,
    items: [
      {
        lineKey: `agg_${invoiceId}`,
        id: `agg_${invoiceId}`,
        name: `دفعات/فواتير مجمعة للعميل ${currentCustomerHistoryName}`,
        code: `AGG-${invoiceId}`,
        price: Number(total),
        cost: 0,
        stock: 1,
        variants: [],
        selectedVariant: "",
        qty: 1
      }
    ],
    subtotal: Number(total),
    discount: 0,
    total: Number(total),
    totalCost: 0,
    source: "local"
  };

  await saveEntity("invoices", aggregateInvoice.id, aggregateInvoice);

  toggleModal("customerHistoryModal", false);
  showToast("تم إنشاء الفاتورة المجمعة", "success");
  await renderInvoices();
  await viewInvoice(aggregateInvoice.id);
}

async function sendDebtMessageToCustomer() {
  if (!currentCustomerHistoryName) return;

  const invoices = await getAllInvoices();
  const debts = invoices.filter(inv =>
    inv.storeId === currentStoreId &&
    String(inv.customer || "").trim() === String(currentCustomerHistoryName).trim() &&
    String(inv.phone || "").trim() === String(currentCustomerHistoryPhone || "").trim() &&
    inv.status === "unpaid"
  );

  const total = debts.reduce((s, i) => s + Number(i.total || 0), 0);
  const app = qs("messageTargetApp")?.value || "whatsapp";
  const prefixMode = qs("messageCountryPrefixMode")?.value || "auto";
  const customPrefix = qs("messageCustomPrefix")?.value || "";

  const rawPhone = currentCustomerHistoryPhone || "";
  const phone = normalizePhoneForSend(rawPhone, prefixMode, customPrefix);

  if (!phone) {
    alert("رقم العميل غير موجود أو غير صالح");
    return;
  }

  const message =
`مرحباً ${currentCustomerHistoryName}
عدد الفواتير غير المكتملة: ${debts.length}
إجمالي المطلوب: ${money(total)}
يرجى التواصل لإتمام السداد.`;

  if (app === "sms") {
    window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
    return;
  }

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
}

async function getCustomerSuggestions(query) {
  const invoices = await getAllInvoices();
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];

  const map = new Map();

  invoices
    .filter(inv => inv.storeId === currentStoreId)
    .forEach(inv => {
      const name = String(inv.customer || "").trim();
      const phone = String(inv.phone || "").trim();
      const key = `${name}__${phone}`;
      if (!name && !phone) return;

      if ((name.toLowerCase().includes(q)) || (phone.toLowerCase().includes(q))) {
        if (!map.has(key)) {
          map.set(key, {
            name,
            phone,
            lastDate: inv.date
          });
        } else if (new Date(inv.date) > new Date(map.get(key).lastDate)) {
          map.set(key, { name, phone, lastDate: inv.date });
        }
      }
    });

  return [...map.values()]
    .sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate))
    .slice(0, 10);
}

async function handleCustomerInput() {
  const box = qs("customerSuggestions");
  const q = (qs("customerName")?.value || qs("customerPhone")?.value || "").trim();
  if (!box) return;

  if (q.length < 2) {
    box.classList.add("hidden");
    return;
  }

  const suggestions = await getCustomerSuggestions(q);
  box.innerHTML = "";

  if (!suggestions.length) {
    box.classList.add("hidden");
    return;
  }

  suggestions.forEach(item => {
    const div = document.createElement("div");
    div.className = "suggest-item";
    div.innerHTML = `
      <div>
        <div class="font-bold">${escapeHtml(item.name || "بدون اسم")}</div>
        <div class="text-xs text-gray-400">${escapeHtml(item.phone || "-")}</div>
      </div>
      <div class="text-xs text-blue-700">اختيار</div>
    `;
    div.onclick = () => {
      if (qs("customerName")) qs("customerName").value = item.name || "";
      if (qs("customerPhone")) qs("customerPhone").value = item.phone || "";
      box.classList.add("hidden");
    };
    box.appendChild(div);
  });

  box.classList.remove("hidden");
}

function openOfflineDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(LOCAL_OFFLINE_DB_NAME, LOCAL_OFFLINE_DB_VERSION);

    req.onupgradeneeded = () => {
      const dbx = req.result;
      if (!dbx.objectStoreNames.contains("stores")) dbx.createObjectStore("stores", { keyPath: "id" });
      if (!dbx.objectStoreNames.contains("products")) dbx.createObjectStore("products", { keyPath: "id" });
      if (!dbx.objectStoreNames.contains("invoices")) dbx.createObjectStore("invoices", { keyPath: "id" });
      if (!dbx.objectStoreNames.contains("purchases")) dbx.createObjectStore("purchases", { keyPath: "id" });
      if (!dbx.objectStoreNames.contains("meta")) dbx.createObjectStore("meta", { keyPath: "id" });
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(storeName, id) {
  const dbx = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = dbx.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll(storeName) {
  const dbx = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = dbx.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(storeName, value) {
  const dbx = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = dbx.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(storeName, id) {
  const dbx = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = dbx.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbClear(storeName) {
  const dbx = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = dbx.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getEntity(kind, id) {
  return await idbGet(kind, id);
}

async function saveEntity(kind, id, payload) {
  await idbSet(kind, payload);

  const session = getLocalSession();
  if (!(isOnline() && session?.appMode === "online")) return;

  try {
    const pathMap = {
      stores: pathClientStores(),
      products: pathClientProducts(),
      invoices: pathClientInvoices(),
      purchases: pathClientPurchases()
    };

    await set(ref(db, `${pathMap[kind]}/${id}`), payload);
  } catch (err) {
    console.warn("Cloud sync failed, local save kept:", err);
    showToast("تم الحفظ محليًا، وسيتم الرفع عند توفر الإنترنت", "info");
  }
}

async function deleteEntity(kind, id) {
  await idbDelete(kind, id);

  const session = getLocalSession();
  if (!(isOnline() && session?.appMode === "online")) return;

  try {
    const pathMap = {
      stores: pathClientStores(),
      products: pathClientProducts(),
      invoices: pathClientInvoices(),
      purchases: pathClientPurchases()
    };

    await remove(ref(db, `${pathMap[kind]}/${id}`));
  } catch (err) {
    console.warn("Cloud delete failed, local delete kept:", err);
    showToast("تم الحذف محليًا، وسيتم التحديث عند توفر الإنترنت", "info");
  }
}

async function getAllStores() {
  return await idbGetAll("stores");
}

async function getAllProducts() {
  return await idbGetAll("products");
}

async function getAllInvoices() {
  return await idbGetAll("invoices");
}

async function getAllPurchases() {
  return await idbGetAll("purchases");
}

async function syncCloudToOffline() {
  const session = getLocalSession();
  if (!isOnline() || session?.appMode !== "online" || !baseClientPath()) return;

  try {
    const [storesSnap, productsSnap, invoicesSnap, purchasesSnap, settingsSnap, counterSnap] = await Promise.all([
      get(ref(db, pathClientStores())),
      get(ref(db, pathClientProducts())),
      get(ref(db, pathClientInvoices())),
      get(ref(db, pathClientPurchases())),
      get(ref(db, pathClientSettings())),
      get(ref(db, `${pathClientCounters()}/invoiceAutoNumber`))
    ]);

    const stores = storesSnap.exists() ? Object.values(storesSnap.val()) : [];
    const products = productsSnap.exists() ? Object.values(productsSnap.val()) : [];
    const invoices = invoicesSnap.exists() ? Object.values(invoicesSnap.val()) : [];
    const purchases = purchasesSnap.exists() ? Object.values(purchasesSnap.val()) : [];
    const settings = settingsSnap.exists() ? settingsSnap.val() : {};
    const counter = counterSnap.exists() ? Number(counterSnap.val()) : 0;

    if (!storesSnap.exists() && !productsSnap.exists() && !invoicesSnap.exists() && !purchasesSnap.exists()) {
      return;
    }

    await idbClear("stores");
    await idbClear("products");
    await idbClear("invoices");
    await idbClear("purchases");

    for (const s of stores) await idbSet("stores", s);
    for (const p of products) await idbSet("products", p);
    for (const i of invoices) await idbSet("invoices", i);
    for (const p of purchases) await idbSet("purchases", p);

    await idbSet("meta", {
      id: "settings",
      currencyName: settings?.currencyName || "شيكل",
      currencySymbol: settings?.currencySymbol || "₪",
      appMode: session?.appMode || "online"
    });

    await idbSet("meta", { id: "invoiceCounter", value: counter });
  } catch (err) {
    console.warn("syncCloudToOffline skipped:", err);
  }
}

async function loadCurrentStore() {
  const store = await idbGet("stores", currentStoreId);
  if (store) {
    if (qs("sideStoreName")) qs("sideStoreName").innerText = store.name || "اسم المحل";
    setImageOrHide(qs("sideLogo"), store.logo);
    if (qs("invPageStoreName")) qs("invPageStoreName").innerText = store.name || "المحل";
    setImageOrHide(qs("invPageLogo"), store.logo);
  }
}

async function downloadOfflinePackage() {
  if (!isOnline() || getLocalSession()?.appMode !== "online") {
    alert("هذه العملية تحتاج نسخة أونلاين وإنترنت");
    return;
  }

  await showLoader("جاري تجهيز حزمة الأوفلاين...");
  await syncCloudToOffline();

  const payload = {
    packageType: "offline-sync-package",
    createdAt: new Date().toISOString(),
    key: currentLicenseKey(),
    session: getLocalSession(),
    settings: await idbGet("meta", "settings"),
    stores: await idbGetAll("stores"),
    products: await idbGetAll("products"),
    invoices: await idbGetAll("invoices"),
    purchases: await idbGetAll("purchases"),
    invoiceCounter: await idbGet("meta", "invoiceCounter")
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `offline_package_${sanitizeKey(currentLicenseKey())}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importOfflinePackage(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    await showLoader("جاري استيراد حزمة الأوفلاين...");
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data || data.packageType !== "offline-sync-package") {
      throw new Error("ملف غير صالح");
    }

    await idbClear("stores");
    await idbClear("products");
    await idbClear("invoices");
    await idbClear("purchases");

    for (const s of (data.stores || [])) await idbSet("stores", s);
    for (const p of (data.products || [])) await idbSet("products", p);
    for (const i of (data.invoices || [])) await idbSet("invoices", i);
    for (const p of (data.purchases || [])) await idbSet("purchases", p);

    if (data.settings) {
      await idbSet("meta", { id: "settings", ...data.settings });
      setLocalSettings(data.settings);
    }

    if (data.invoiceCounter) {
      await idbSet("meta", data.invoiceCounter);
    }

    showToast("تم استيراد حزمة الأوفلاين", "success");
    await bootSessionState();
  } catch (err) {
    console.error(err);
    alert("تعذر استيراد الحزمة");
  } finally {
    event.target.value = "";
  }
}

async function uploadOfflineDataToCloud() {
  const session = getLocalSession();
  if (!session || session.appMode !== "online") {
    alert("هذه الميزة متاحة فقط لمفاتيح الأونلاين");
    return;
  }

  if (!isOnline()) {
    alert("هذه العملية تحتاج إنترنت");
    return;
  }

  await showLoader("جاري رفع بيانات الأوفلاين إلى السحابة...");

  const stores = await idbGetAll("stores");
  const products = await idbGetAll("products");
  const invoices = await idbGetAll("invoices");
  const purchases = await idbGetAll("purchases");
  const settings = await idbGet("meta", "settings");
  const counter = await idbGet("meta", "invoiceCounter");

  for (const s of stores) await set(ref(db, `${pathClientStores()}/${s.id}`), s);
  for (const p of products) await set(ref(db, `${pathClientProducts()}/${p.id}`), p);
  for (const i of invoices) await set(ref(db, `${pathClientInvoices()}/${i.id}`), i);
  for (const p of purchases) await set(ref(db, `${pathClientPurchases()}/${p.id}`), p);

  if (settings) {
    await update(ref(db, pathClientSettings()), {
      currencyName: settings.currencyName || "شيكل",
      currencySymbol: settings.currencySymbol || "₪",
      appMode: "online"
    });
  }

  if (counter?.value != null) {
    await set(ref(db, `${pathClientCounters()}/invoiceAutoNumber`), Number(counter.value || 0));
  }

  showToast("تم رفع بيانات الأوفلاين إلى السحابة", "success");
}

async function buildBulkInvoicesHtml(range) {
  const invoices = await getAllInvoices();
  const filtered = invoices
    .filter(inv => inv.storeId === currentStoreId && inRangeByFilter(inv.date, range))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!filtered.length) {
    return `<div class="p-10 text-center text-gray-400">لا توجد فواتير في هذه الفترة</div>`;
  }

  const pages = [];
  let chunk = [];
  for (const inv of filtered) {
    chunk.push(inv);
    if (chunk.length === 12) {
      pages.push(chunk);
      chunk = [];
    }
  }
  if (chunk.length) pages.push(chunk);

  return pages.map((page, pageIndex) => `
    <div class="bg-white p-6 ${pageIndex > 0 ? "mt-6" : ""}" style="width:1120px;">
      <div class="text-2xl font-bold text-blue-700 mb-4">تقرير الفواتير - صفحة ${pageIndex + 1}</div>
      <table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px;border:1px solid #e5e7eb;">رقم</th>
            <th style="padding:10px;border:1px solid #e5e7eb;">التاريخ</th>
            <th style="padding:10px;border:1px solid #e5e7eb;">العميل</th>
            <th style="padding:10px;border:1px solid #e5e7eb;">الجوال</th>
            <th style="padding:10px;border:1px solid #e5e7eb;">الحالة</th>
            <th style="padding:10px;border:1px solid #e5e7eb;">المبلغ</th>
            <th style="padding:10px;border:1px solid #e5e7eb;">الدفع</th>
          </tr>
        </thead>
        <tbody>
          ${page.map(inv => `
            <tr>
              <td style="padding:10px;border:1px solid #e5e7eb;">#${escapeHtml(inv.id)}</td>
              <td style="padding:10px;border:1px solid #e5e7eb;">${new Date(inv.date).toLocaleString("ar-EG")}</td>
              <td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(inv.customer || "-")}</td>
              <td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(inv.phone || "-")}</td>
              <td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(statusLabel(inv.status || "paid"))}</td>
              <td style="padding:10px;border:1px solid #e5e7eb;">${Number(inv.total).toFixed(2)} ${escapeHtml(inv.currencySymbol || "₪")}</td>
              <td style="padding:10px;border:1px solid #e5e7eb;">${inv.payment === "cash" ? "نقداً" : "إلكتروني"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `).join("");
}

async function exportBulkInvoices(type) {
  const range = qs("bulkExportRange")?.value || "day";
  const area = qs("bulkInvoicesExportArea");
  if (!area) return;

  await showLoader("جاري تجهيز التصدير...");
  area.innerHTML = await buildBulkInvoicesHtml(range);
  area.classList.remove("hidden");

  const pages = [...area.children];
  if (!pages.length) {
    area.classList.add("hidden");
    return;
  }

  try {
    if (type === "print") {
      const w = window.open("", "_blank");
      w.document.write(`<html dir="rtl"><head><title>طباعة الفواتير</title></head><body>${area.innerHTML}</body></html>`);
      w.document.close();
      w.focus();
      w.print();
      return;
    }

    if (type === "images") {
      let idx = 1;
      for (const page of pages) {
        const canvas = await html2canvas(page, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true
        });

        const link = document.createElement("a");
        link.download = `فواتير_${range}_${idx}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        idx++;
      }
      return;
    }

    if (type === "pdf") {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1120, 794] });

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true
        });

        const imgData = canvas.toDataURL("image/png");
        if (i > 0) pdf.addPage([1120, 794], "landscape");
        pdf.addImage(imgData, "PNG", 0, 0, 1120, 794);
      }

      pdf.save(`فواتير_${range}.pdf`);
    }
  } finally {
    area.classList.add("hidden");
  }
}

async function buildBulkPurchasesHtml(range) {
  const purchases = await getAllPurchases();
  const filtered = purchases
    .filter(p => p.storeId === currentStoreId && inRangeByFilter(p.createdAt, range))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (!filtered.length) {
    return `<div class="p-10 text-center text-gray-400">لا توجد مشتريات في هذه الفترة</div>`;
  }

  const pages = [];
  let chunk = [];
  for (const item of filtered) {
    chunk.push(item);
    if (chunk.length === 14) {
      pages.push(chunk);
      chunk = [];
    }
  }
  if (chunk.length) pages.push(chunk);

  return pages.map((page, pageIndex) => `
    <div class="bg-white p-6 ${pageIndex > 0 ? "mt-6" : ""}" style="width:1120px;">
      <div class="text-2xl font-bold text-blue-700 mb-4">تقرير المشتريات - صفحة ${pageIndex + 1}</div>
      <table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px;border:1px solid #e5e7eb;">المورد</th>
            <th style="padding:10px;border:1px solid #e5e7eb;">المبلغ</th>
            <th style="padding:10px;border:1px solid #e5e7eb;">الملاحظات</th>
            <th style="padding:10px;border:1px solid #e5e7eb;">التاريخ</th>
          </tr>
        </thead>
        <tbody>
          ${page.map(p => `
            <tr>
              <td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(p.supplier || "-")}</td>
              <td style="padding:10px;border:1px solid #e5e7eb;">${money(p.amount)}</td>
              <td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(p.notes || "-")}</td>
              <td style="padding:10px;border:1px solid #e5e7eb;">${new Date(p.createdAt).toLocaleString("ar-EG")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `).join("");
}

async function exportBulkPurchases(type) {
  const range = qs("bulkPurchasesRange")?.value || "day";
  const area = qs("bulkPurchasesExportArea");
  if (!area) return;

  await showLoader("جاري تجهيز التصدير...");
  area.innerHTML = await buildBulkPurchasesHtml(range);
  area.classList.remove("hidden");

  const pages = [...area.children];
  if (!pages.length) {
    area.classList.add("hidden");
    return;
  }

  try {
    if (type === "print") {
      const w = window.open("", "_blank");
      w.document.write(`<html dir="rtl"><head><title>طباعة المشتريات</title></head><body>${area.innerHTML}</body></html>`);
      w.document.close();
      w.focus();
      w.print();
      return;
    }

    if (type === "images") {
      let idx = 1;
      for (const page of pages) {
        const canvas = await html2canvas(page, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true
        });

        const link = document.createElement("a");
        link.download = `مشتريات_${range}_${idx}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        idx++;
      }
      return;
    }

    if (type === "pdf") {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1120, 794] });

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true
        });

        const imgData = canvas.toDataURL("image/png");
        if (i > 0) pdf.addPage([1120, 794], "landscape");
        pdf.addImage(imgData, "PNG", 0, 0, 1120, 794);
      }

      pdf.save(`مشتريات_${range}.pdf`);
    }
  } finally {
    area.classList.add("hidden");
  }
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
window.openStatusModal = openStatusModal;
window.openCustomerHistory = openCustomerHistory;
window.openNoteModal = openNoteModal;

lucide.createIcons();