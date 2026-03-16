firebase.initializeApp(firebaseConfig1885);
const rtdb1885 = firebase.database();
const auth1885 = firebase.auth();

const fallbackLogo = "https://up6.cc/2026/03/17733402856661.png";
const fallbackImg = "https://via.placeholder.com/500x700?text=No+Image";

const PATHS = {
  store: FIREBASE_PATHS_1885.settingsStore,
  banners: FIREBASE_PATHS_1885.settingsBanners,
  categories: FIREBASE_PATHS_1885.categories,
  products: FIREBASE_PATHS_1885.products,
  pageSections: "settings1885/pageSections1885",
  menuItems: "settings1885/sidebarMenu1885",
  paymentMethods: FIREBASE_PATHS_1885.settingsPaymentMethods,
  socialLinks: "settings1885/socialLinks1885"
};

const LOCAL_KEYS = {
  cart: "tofan_cart_1885",
  wishlist: "tofan_wishlist_1885",
  checkoutSelection: "tofan_checkout_selection_1885",
  lang: "tofan_lang_1885"
};

let lang = localStorage.getItem(LOCAL_KEYS.lang) || sessionStorage.getItem(LOCAL_KEYS.lang) || "ar";
let cart = JSON.parse(localStorage.getItem(LOCAL_KEYS.cart) || "[]");
let wishlist = JSON.parse(localStorage.getItem(LOCAL_KEYS.wishlist) || "[]");
let categories = [];
let products = [];
let pageSections = [];
let menuItems = [];
let paymentMethods = [];
let socialLinks = [];
let storeSettings = {
  storeName: "متجر طوفان",
  storeNameEn: "Tofan Store",
  storeLogoUrl: fallbackLogo,
  bannerTopUrl: ""
};
let currentUser = null;
let catSwiper = null;
let dynamicSwipers = [];
let productObserver = null;
let mediaObserver = null;
let reviewsSwiper = null;
let sidebarHydrated = false;
let panelsLoaded = false;
let panelsLoadingPromise = null;

const i18n = {
  ar: {
    "cat-title":"أقسام المتجر",
    "home":"الرئيسية",
    "cart":"السلة",
    "wish":"الأمنيات",
    "account-orders":"الحساب",
    "cart-header":"سلة المشتريات",
    "wish-header":"قائمة الأمنيات",
    "selected-total":"الإجمالي المحدد",
    "buy-selected":"شراء المنتجات المحددة",
    "select-all":"تحديد الكل",
    "buy":"إضافة للسلة",
    "show-all":"عرض الكل",
    "empty-cart":"السلة فارغة حالياً",
    "empty-wish":"القائمة فارغة حالياً",
    "empty-products":"لا توجد منتجات مضافة حالياً",
    "empty-category":"لا توجد منتجات في هذا القسم",
    "search-placeholder":"ابحث داخل الموقع...",
    "search-empty":"لا توجد نتائج",
    "search-title":"نتائج البحث",
    "account-login-text":"سجل دخولك للوصول إلى الحساب والطلبات",
    "login":"تسجيل الدخول",
    "welcome":"مرحباً",
    "open-account":"فتح الحساب والطلبات",
    "account-orders-title":"الحساب والطلبات",
    "added-cart":"تمت إضافة المنتج إلى السلة",
    "added-wish":"تمت إضافة المنتج إلى الأمنيات",
    "removed-wish":"تمت إزالة المنتج من الأمنيات",
    "removed-cart":"تم حذف المنتج من السلة",
    "choose-item":"حدد منتج واحد على الأقل",
    "follow-us":"تابعنا على",
    "payment-methods":"طرق الدفع المتاحة",
    "footer-sub":"تواصل معنا واختر وسيلة الدفع المناسبة لك",
    "rights":"© جميع الحقوق محفوظة",
    "reviews-title":"آراء العملاء"
  },
  en: {
    "cat-title":"Shop Categories",
    "home":"Home",
    "cart":"Cart",
    "wish":"Wishlist",
    "account-orders":"Account",
    "cart-header":"Shopping Cart",
    "wish-header":"Wishlist",
    "selected-total":"Selected Total",
    "buy-selected":"Buy Selected Products",
    "select-all":"Select All",
    "buy":"Add to Cart",
    "show-all":"View All",
    "empty-cart":"Your cart is empty",
    "empty-wish":"Wishlist is empty",
    "empty-products":"No products available right now",
    "empty-category":"No products in this category",
    "search-placeholder":"Search the site...",
    "search-empty":"No results found",
    "search-title":"Search Results",
    "account-login-text":"Sign in to access your account and orders",
    "login":"Login",
    "welcome":"Welcome",
    "open-account":"Open account & orders",
    "account-orders-title":"Account & Orders",
    "added-cart":"Product added to cart",
    "added-wish":"Product added to wishlist",
    "removed-wish":"Product removed from wishlist",
    "removed-cart":"Product removed from cart",
    "choose-item":"Select at least one product",
    "follow-us":"Follow us",
    "payment-methods":"Available payment methods",
    "footer-sub":"Connect with us and choose the payment method that suits you",
    "rights":"© All rights reserved",
    "reviews-title":"Customer Reviews"
  }
};

const customerReviews = {
  ar: [
    { name: "رهف", text: "المقاس طلع مزبوط والقماش مريح كثير. مناسب للبس اليومي." },
    { name: "سارة", text: "الطلب وصل بسرعة والتغليف كان مرتب. عنجد تجربة حلوة." },
    { name: "محمد", text: "الطباعة ممتازة جداً والجودة أعلى مما توقعت. القماش مريح والتصميم مميز." },
    { name: "ليان", text: "التصميم جميل جداً والقماش ناعم ومريح. أعجبني كثير شكل الطباعة." }
  ],
  en: [
    { name: "Rahaf", text: "The size was perfect and the fabric is very comfortable. Suitable for everyday wear." },
    { name: "Sarah", text: "The order arrived quickly and the packaging was neat. A truly great experience." },
    { name: "Daniel", text: "Great quality and very comfortable hoodie. The print looks amazing." },
    { name: "Emma", text: "Beautiful design and great fabric. The fit is perfect and I really like it." }
  ]
};

function t(key){ return i18n[lang]?.[key] || key; }
function byId(id){ return document.getElementById(id); }

function saveLanguagePreference(){
  localStorage.setItem(LOCAL_KEYS.lang, lang);
  sessionStorage.setItem(LOCAL_KEYS.lang, lang);
}

function setLoadingBar(on){
  const el = byId("topLoading");
  if(!el) return;
  if(on){
    el.style.width = "65%";
  }else{
    el.style.width = "100%";
    setTimeout(() => el.style.width = "0%", 260);
  }
}

function showToast(msg){
  const old = document.querySelector(".toast");
  if(old) old.remove();
  const tEl = document.createElement("div");
  tEl.className = "toast";
  tEl.textContent = msg;
  document.body.appendChild(tEl);
  setTimeout(() => {
    tEl.style.opacity = "0";
    tEl.style.transform = "translate(-50%,16px)";
    setTimeout(() => tEl.remove(), 180);
  }, 1800);
}

function money(v){ return `${Number(v || 0).toFixed(2)} ₪`; }

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function normalizeCategories(raw){
  return Object.entries(raw || {}).map(([id, v]) => ({
    id,
    nameAr: v.nameAr || v.name || "",
    nameEn: v.nameEn || "",
    image: v.image || "",
    icon: v.icon || "box",
    order: Number(v.order || 0),
    enabled: v.enabled !== false
  })).sort((a,b) => a.order - b.order);
}

function normalizeProducts(raw){
  return Object.entries(raw || {}).map(([id, v]) => ({
    id,
    categoryId: v.categoryId || v.category || "",
    nameAr: v.nameAr || v.name || "",
    nameEn: v.nameEn || "",
    descAr: v.descAr || v.desc || "",
    descEn: v.descEn || "",
    price: Number(v.price || 0),
    oldPrice: Number(v.oldPrice || 0),
    image1: v.image1 || v.image || v.front || "",
    image2: v.image2 || "",
    images: Array.isArray(v.images) ? v.images : [],
    colorOptions: Array.isArray(v.colorOptions) ? v.colorOptions : [],
    order: Number(v.order || 0),
    enabled: v.enabled !== false,
    createdAt: Number(v.createdAt || 0)
  })).filter(p => p.enabled).sort((a,b) => (a.order - b.order) || (b.createdAt - a.createdAt));
}

function normalizeSections(raw){
  return Object.entries(raw || {}).map(([id, v]) => ({
    id,
    type: v.type || "banner",
    titleAr: v.titleAr || v.title || "",
    titleEn: v.titleEn || "",
    image: v.image || "",
    images: Array.isArray(v.images) ? v.images : [],
    link: v.link || "#",
    placement: v.placement || "after_categories",
    order: Number(v.order || 0),
    enabled: v.enabled !== false
  })).filter(s => s.enabled).sort((a,b) => a.order - b.order);
}

function normalizeMenuItems(raw){
  return Object.entries(raw || {}).map(([id, v]) => ({
    id,
    titleAr: v.titleAr || v.title || "",
    titleEn: v.titleEn || "",
    type: v.type || "link",
    value: v.value || "",
    popupHtml: v.popupHtml || "",
    order: Number(v.order || 0),
    enabled: v.enabled !== false
  })).filter(i => i.enabled).sort((a,b) => a.order - b.order);
}

function normalizePaymentMethods(raw){
  return Object.entries(raw || {}).map(([id, v]) => ({
    id,
    name: v.name || "",
    image: v.image || "",
    enabled: v.enabled !== false,
    order: Number(v.order || 0)
  })).filter(x => x.enabled && x.image).sort((a,b) => a.order - b.order);
}

function normalizeSocialLinks(raw){
  return Object.entries(raw || {}).map(([id, v]) => ({
    id,
    platform: String(v.platform || "").toLowerCase().trim(),
    url: v.url || v.link || "",
    enabled: v.enabled !== false,
    order: Number(v.order || 0)
  })).filter(x => x.enabled && x.platform && x.url).sort((a,b) => a.order - b.order);
}

function preloadCriticalAssets(){
  const firstCatImages = categories.filter(c => c.enabled !== false && c.image).slice(0, 3).map(c => c.image);
  const critical = [
    storeSettings.storeLogoUrl || fallbackLogo,
    storeSettings.bannerTopBannerUrl || storeSettings.bannerTopUrl || "",
    ...firstCatImages
  ].filter(Boolean);

  critical.forEach(url => {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  });
}

async function ensurePanelsLoaded(){
  if(panelsLoaded) return;
  if(panelsLoadingPromise) return panelsLoadingPromise;

  panelsLoadingPromise = fetch("panels.html")
    .then(res => res.text())
    .then(html => {
      const wrap = document.createElement("div");
      wrap.id = "lazy-panels-root";
      wrap.innerHTML = html;
      document.body.appendChild(wrap);
      injectPanelsStyles();
      panelsLoaded = true;
      hydrateSidebar();
      updateStoreUI();
      updateBadges();
      applyLanguageTextsToExistingNodes();
      renderCart();
      renderWishlist();
    })
    .catch(err => {
      console.error("Failed loading panels.html", err);
    });

  return panelsLoadingPromise;
}

function injectPanelsStyles(){
  if(byId("panels-inline-style")) return;
  const style = document.createElement("style");
  style.id = "panels-inline-style";
  style.textContent = `
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;z-index:2100;backdrop-filter:blur(3px)}
    .sidebar{position:fixed;top:0;right:0;width:290px;height:100%;background:#fff;z-index:2200;transform:translate3d(100%,0,0);transition:transform .18s cubic-bezier(.2,.8,.2,1);box-shadow:-10px 0 30px rgba(0,0,0,.12);overflow-y:auto;overflow-x:hidden;will-change:transform;backface-visibility:hidden;direction:inherit;visibility:visible;opacity:1;contain:layout paint style}
    html[dir="ltr"] .sidebar{right:auto;left:0;transform:translate3d(-100%,0,0);box-shadow:10px 0 30px rgba(0,0,0,.12);text-align:left}
    .sidebar.open{transform:translate3d(0,0,0)!important}
    .bottom-pane{position:fixed;bottom:0;left:0;width:100%;height:80%;background:#fff;z-index:2150;border-radius:24px 24px 0 0;box-shadow:0 -10px 30px rgba(0,0,0,.12);transform:translate3d(0,105%,0);transition:transform .18s cubic-bezier(.2,.8,.2,1);will-change:transform;backface-visibility:hidden}
    .bottom-pane.active{transform:translate3d(0,0,0)}
    .sheet-layout{height:100%;display:flex;flex-direction:column}
    .sheet-scroll{flex:1;min-height:0;overflow-y:auto}
    .popup-sheet{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) scale(.96);width:min(92vw,680px);max-height:80vh;overflow:auto;background:#fff;border-radius:24px;box-shadow:0 20px 60px rgba(0,0,0,.18);z-index:2300;opacity:0;pointer-events:none;transition:.16s ease;will-change:transform,opacity}
    .popup-sheet.active{opacity:1;pointer-events:auto;transform:translate(-50%,-50%) scale(1)}
    .sidebar-logo-shell{position:relative;width:40px;height:40px;border-radius:12px;overflow:hidden;flex:0 0 40px;background:#fff;display:flex;align-items:center;justify-content:center}
    .sidebar-logo-shell img{width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity .22s ease}
    .sidebar-logo-shell img.logo-loaded{opacity:1}
    .dashed-sep{border-top:1px dashed #d1d5db}
    .auth-chip{background:#f8fafc;border:1px solid #e5e7eb;border-radius:999px;padding:10px 14px;font-size:12px;font-weight:800;display:flex;align-items:center;gap:8px;cursor:pointer;transition:.18s ease;width:100%;justify-content:space-between;color:#334155}
    html[dir="ltr"] .auth-chip{text-align:left}
    .cart-item-check{width:18px;height:18px;accent-color:var(--primary)}
    .cart-checkout-bar{position:sticky;bottom:0;left:0;width:100%;padding:12px 0 calc(10px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid #eef2f6;margin-top:10px;z-index:3}
    .primary-btn,.secondary-btn{width:100%;border-radius:16px;padding:13px 16px;font-weight:900;cursor:pointer;border:none}
    .primary-btn{background:var(--primary);color:#fff;box-shadow:0 10px 22px rgba(20,69,77,.18)}
    .secondary-btn{background:#f8fafc;color:#334155;border:1px solid #e5e7eb}
  `;
  document.head.appendChild(style);
}

function closeSearchBar(){
  const dropdown = byId("searchDropdown");
  const input = byId("searchInput");
  const results = byId("searchResultsBox");
  if(dropdown) dropdown.classList.remove("open");
  if(input) input.value = "";
  if(results){
    results.style.display = "none";
    results.innerHTML = "";
  }
}

function toggleSearchBar(event){
  if(event) event.stopPropagation();
  const box = byId("searchDropdown");
  const input = byId("searchInput");
  if(!box) return;
  const isOpen = box.classList.contains("open");
  if(isOpen){
    closeSearchBar();
  }else{
    closeAll(false);
    box.classList.add("open");
    setTimeout(() => input?.focus(), 80);
  }
}

document.addEventListener("click", function(e){
  const header = byId("siteHeader");
  const search = byId("searchDropdown");
  if(header && search && !header.contains(e.target) && !search.contains(e.target)){
    closeSearchBar();
  }
});

function hydrateSidebar(){
  if(!panelsLoaded) return;
  renderUserBox();
  renderSidebarDynamicMenu();
  renderSidebarCategories();
  sidebarHydrated = true;
}

async function openSidebar(){
  await ensurePanelsLoaded();
  closeAll(false);
  const sidebar = byId("sidebar-menu");
  const overlay = byId("overlay");
  if(!sidebar || !overlay) return;
  sidebar.classList.remove("open");
  void sidebar.offsetWidth;
  sidebar.classList.add("open");
  overlay.style.display = "block";
}

async function openBottomPane(id){
  await ensurePanelsLoaded();
  closeAll(false);
  const pane = byId(`${id}-pane`);
  const overlay = byId("overlay");
  if(!pane || !overlay) return;
  pane.classList.add("active");
  overlay.style.display = "block";
  if(id === "wish") renderWishlist();
  if(id === "cart") renderCart();
}

function closeMenuPopup(){
  byId("menuPopup")?.classList.remove("active");
}

function openMenuPopup(title, html){
  const titleEl = byId("menuPopupTitle");
  const bodyEl = byId("menuPopupBody");
  const popup = byId("menuPopup");
  if(titleEl) titleEl.textContent = title || "نافذة";
  if(bodyEl) bodyEl.innerHTML = html || "";
  popup?.classList.add("active");
}

function closeAll(closeSearchToo = true){
  byId("sidebar-menu")?.classList.remove("open");
  document.querySelectorAll(".bottom-pane").forEach(p => p.classList.remove("active"));
  byId("menuPopup")?.classList.remove("active");
  const overlay = byId("overlay");
  if(overlay) overlay.style.display = "none";
  const extra = byId("category-all-pane");
  if(extra) extra.classList.remove("active");
  if(closeSearchToo) closeSearchBar();
}

function setImgWithLoader(imgId, loaderId, url, fallback = fallbackLogo){
  const img = byId(imgId);
  const loader = byId(loaderId);
  if(!img || !loader) return;

  img.classList.remove("logo-loaded");
  loader.classList.remove("hidden");

  img.onload = () => {
    loader.classList.add("hidden");
    img.classList.add("logo-loaded");
  };

  img.onerror = () => {
    if (img.src !== fallback) {
      img.src = fallback;
    } else {
      loader.classList.add("hidden");
      img.classList.add("logo-loaded");
    }
  };

  img.src = url || fallback;
}

function updateStoreUI(){
  const logo = storeSettings.storeLogoUrl || fallbackLogo;
  const banner = storeSettings.bannerTopBannerUrl || storeSettings.bannerTopUrl || "";
  const name = lang === "ar"
    ? (storeSettings.storeName || "متجر طوفان")
    : (storeSettings.storeNameEn || storeSettings.storeName || "Tofan Store");

  setImgWithLoader("headerLogo", "headerLogoLoader", logo, fallbackLogo);
  setImgWithLoader("sidebarLogo", "sidebarLogoLoader", logo, fallbackLogo);

  const favicon = byId("siteFavicon");
  if(favicon) favicon.href = logo || fallbackLogo;

  const sidebarStoreName = byId("sidebarStoreName");
  if(sidebarStoreName) sidebarStoreName.textContent = name;
  if(byId("footerStoreTitle")) byId("footerStoreTitle").textContent = name;
  if(byId("footerStoreSub")) byId("footerStoreSub").textContent = t("footer-sub");
  if(byId("socialFooterTitle")) byId("socialFooterTitle").textContent = t("follow-us");
  if(byId("paymentFooterTitle")) byId("paymentFooterTitle").textContent = t("payment-methods");
  if(byId("footerCopyText")) byId("footerCopyText").textContent = `${t("rights")} - ${name}`;
  if(byId("reviewsTitle")) byId("reviewsTitle").textContent = t("reviews-title");
  document.title = `${lang === "ar" ? "متجر طوفان" : "Tofan Store"} | ${name}`;

  const appleTouch = document.querySelector('link[rel="apple-touch-icon"]');
  if(appleTouch) appleTouch.href = logo || fallbackLogo;

  const heroSection = byId("heroSection");
  const topBanner = byId("topBanner");
  const topBannerLoader = byId("topBannerLoader");

  if(banner && heroSection && topBanner && topBannerLoader){
    heroSection.classList.remove("hero-hidden");
    topBannerLoader.classList.remove("hidden");
    topBanner.onload = hideBannerLoader;
    topBanner.onerror = hideBannerLoader;
    topBanner.src = banner;
  }else if(heroSection && topBanner){
    heroSection.classList.add("hero-hidden");
    topBanner.removeAttribute("src");
  }
}

function getCategoryName(cat){ return lang === "ar" ? (cat.nameAr || "") : (cat.nameEn || cat.nameAr || ""); }
function getProductName(p){ return lang === "ar" ? (p.nameAr || "") : (p.nameEn || p.nameAr || ""); }
function getSectionTitle(sec){ return lang === "ar" ? (sec.titleAr || "") : (sec.titleEn || sec.titleAr || ""); }
function getMenuTitle(item){ return lang === "ar" ? (item.titleAr || "") : (item.titleEn || item.titleAr || ""); }

function getDiscountPercent(price, oldPrice){
  const p = Number(price || 0);
  const o = Number(oldPrice || 0);
  if(!(o > p && p > 0)) return 0;
  return Math.round(((o - p) / o) * 100);
}

function getCategoryIconSvg(icon){
  const icons = {
    home: `<svg class="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>`,
    box: `<svg class="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>`
  };
  return icons[icon] || icons.box;
}

function getSocialIconSvg(platform){
  const p = String(platform || "").toLowerCase();
  const icons = {
    telegram: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M9.04 15.47 8.7 20.2c.49 0 .7-.21.95-.46l2.28-2.18 4.73 3.47c.87.48 1.49.23 1.72-.8l3.12-14.64h.01c.27-1.26-.46-1.75-1.31-1.43L1.84 10.87c-1.23.48-1.21 1.17-.21 1.48l4.88 1.52L17.84 6.8c.53-.35 1.02-.16.62.19"/></svg>`,
    instagram: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Z"/></svg>`,
    website: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"/></svg>`
  };
  return icons[p] || icons.website;
}

function renderUserBox(){
  const box = byId("sidebarUserBox");
  if(!box) return;

  if(currentUser){
    const name = currentUser.displayName || currentUser.email || "User";
    box.innerHTML = `
      <div class="bg-[#14454d]/5 border border-[#14454d]/10 rounded-3xl p-4">
        <div class="text-xs text-gray-400 font-bold mb-1">${t("welcome")}</div>
        <div class="font-black text-[#14454d] text-base mb-3">${escapeHtml(name)}</div>
        <button onclick="window.location.href='order.html'" class="w-full bg-[#14454d] text-white py-3 rounded-2xl font-black">${t("open-account")}</button>
      </div>
    `;
    if(byId("sidebarProfileText")) byId("sidebarProfileText").textContent = t("account-orders-title");
  }else{
    box.innerHTML = `
      <div class="bg-gray-50 border border-gray-100 rounded-3xl p-4">
        <div class="text-sm text-gray-500 font-bold mb-3">${t("account-login-text")}</div>
        <button onclick="sessionStorage.setItem('login_redirect_1885','order.html'); window.location.href='login.html'" class="w-full bg-[#14454d] text-white py-3 rounded-2xl font-black">${t("login")}</button>
      </div>
    `;
    if(byId("sidebarProfileText")) byId("sidebarProfileText").textContent = t("account-orders-title");
  }
}

function handleMenuItemClick(id){
  const item = menuItems.find(x => x.id === id);
  if(!item) return;

  closeAll();

  if(item.type === "link"){
    if(/^https?:\/\//i.test(item.value)){
      window.open(item.value, "_blank");
    }else{
      window.location.href = item.value || "#";
    }
    return;
  }

  if(item.type === "internal_page"){
    window.location.href = item.value || "index.html";
    return;
  }

  if(item.type === "category"){
    setTimeout(() => scrollToCategorySection(item.value), 120);
    return;
  }

  if(item.type === "popup_html"){
    const overlay = byId("overlay");
    if(overlay) overlay.style.display = "block";
    openMenuPopup(getMenuTitle(item), item.popupHtml || "");
  }
}

function renderSidebarDynamicMenu(){
  const wrap = byId("sidebarDynamicMenuWrap");
  if(!wrap) return;
  if(!menuItems.length){
    wrap.innerHTML = "";
    return;
  }

  wrap.innerHTML = `
    <div class="space-y-3">
      ${menuItems.map(item => `
        <button class="auth-chip" onclick="handleMenuItemClick('${item.id}')">
          <span class="truncate">${escapeHtml(getMenuTitle(item))}</span>
          <span class="text-gray-400 text-xs font-bold">فتح</span>
        </button>
      `).join("")}
    </div>
  `;
}

function getStarIcons(){
  return `
    <svg viewBox="0 0 24 24"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
    <svg viewBox="0 0 24 24"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
    <svg viewBox="0 0 24 24"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
    <svg viewBox="0 0 24 24"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
    <svg viewBox="0 0 24 24"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
  `;
}

function renderCustomerReviews(){
  const wrapper = byId("reviewsWrapper");
  if(!wrapper) return;
  const data = customerReviews[lang] || customerReviews.ar;

  wrapper.innerHTML = data.map(item => `
    <div class="swiper-slide">
      <div class="review-card">
        <div>
          <div class="review-stars">${getStarIcons()}</div>
          <div class="review-text">${escapeHtml(item.text)}</div>
        </div>
        <div class="review-name">${escapeHtml(item.name)}</div>
      </div>
    </div>
  `).join("");

  initReviewsSwiper();
}

function initReviewsSwiper(){
  if(reviewsSwiper){
    try{ reviewsSwiper.destroy(true, true); }catch(e){}
  }
  if(!byId("reviewsSwiper")) return;

  reviewsSwiper = new Swiper("#reviewsSwiper", {
    loop: true,
    speed: 450,
    spaceBetween: 16,
    autoplay: { delay: 2200, disableOnInteraction: false },
    pagination: { el: "#reviewsPagination", clickable: true },
    breakpoints: { 0: { slidesPerView: 1 }, 900: { slidesPerView: 4 } }
  });
}

function renderFooterSection(){
  const footer = byId("storeFooterSection");
  const socialWrap = byId("socialFooterWrap");
  const paymentWrap = byId("paymentFooterWrap");
  const socialGrid = byId("socialLinksGrid");
  const paymentGrid = byId("footerPaymentMethodsGrid");
  if(!footer || !socialWrap || !paymentWrap || !socialGrid || !paymentGrid) return;

  const hasSocial = socialLinks.length > 0;
  const hasPayments = paymentMethods.length > 0;

  socialWrap.style.display = hasSocial ? "" : "none";
  paymentWrap.style.display = hasPayments ? "" : "none";

  socialGrid.innerHTML = hasSocial ? socialLinks.map(item => `
    <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="${escapeHtml(item.platform)}" title="${escapeHtml(item.platform)}">
      ${getSocialIconSvg(item.platform)}
    </a>
  `).join("") : "";

  paymentGrid.innerHTML = hasPayments ? paymentMethods.map(method => `
    <div class="payment-icon-card">
      <img src="${escapeHtml(method.image)}" alt="${escapeHtml(method.name || 'payment method')}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
    </div>
  `).join("") : "";

  footer.classList.toggle("hidden", !(hasSocial || hasPayments));
}

function applyLanguageTextsToExistingNodes(){
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });
  if(byId("searchInput")) byId("searchInput").placeholder = t("search-placeholder");
  if(byId("lang-btn")) byId("lang-btn").innerText = lang === "ar" ? "E" : "ع";
}

function applyLanguageTexts(){
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.body.style.direction = lang === "ar" ? "rtl" : "ltr";
  if(byId("sidebar-menu")) byId("sidebar-menu").style.direction = lang === "ar" ? "rtl" : "ltr";

  applyLanguageTextsToExistingNodes();
  updateStoreUI();

  if(sidebarHydrated){
    renderUserBox();
    renderSidebarDynamicMenu();
    renderSidebarCategories();
  }

  renderCategoriesSlider();
  renderProductsSections();
  renderCart();
  renderWishlist();
  renderDynamicSections();
  renderCustomerReviews();
  renderFooterSection();
  saveLanguagePreference();
  toggleScrollTopButton();
}

function performSearch(query){
  const box = byId("searchResultsBox");
  const q = String(query || "").trim().toLowerCase();
  if(!box) return;

  if(!q){
    box.style.display = "none";
    box.innerHTML = "";
    return;
  }

  const filtered = products.filter(p => {
    const cat = categories.find(c => String(c.id) === String(p.categoryId));
    const text = [p.nameAr, p.nameEn, cat?.nameAr || "", cat?.nameEn || ""].join(" ").toLowerCase();
    return text.includes(q);
  }).slice(0, 8);

  if(!filtered.length){
    box.style.display = "block";
    box.innerHTML = `<div class="text-sm font-bold text-gray-400 p-2">${t("search-empty")}</div>`;
    return;
  }

  box.style.display = "block";
  box.innerHTML = `
    <div class="text-xs font-black text-[#14454d] px-2 py-1">${t("search-title")}</div>
    <div class="space-y-2">
      ${filtered.map(p => `
        <button onclick="scrollToProductCard('${p.id}')" class="w-full text-right flex items-center gap-3 p-2 rounded-2xl hover:bg-gray-50">
          <img src="${escapeHtml((p.image1 || fallbackImg))}" class="w-12 h-14 object-cover rounded-xl border" loading="lazy" decoding="async" referrerpolicy="no-referrer">
          <div class="flex-1 min-w-0">
            <div class="text-xs font-black text-gray-800 truncate">${escapeHtml(getProductName(p))}</div>
            <div class="text-[11px] text-[#14454d] font-black mt-1">${money(p.price)}</div>
          </div>
        </button>
      `).join("")}
    </div>
  `;
}

function scrollToProductCard(productId){
  const el = byId(`product-card-${productId}`);
  if(el){
    closeSearchBar();
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  }
}

function renderCategoriesSlider(){
  const wrapper = byId("categories-swiper-wrapper");
  if(!wrapper) return;
  const enabledCats = categories.filter(c => c.enabled !== false);

  if(!enabledCats.length){
    wrapper.innerHTML = `<div class="swiper-slide"><div class="empty-box">${t("empty-products")}</div></div>`;
    refreshSwiper();
    if(sidebarHydrated) renderSidebarCategories();
    return;
  }

  const groups = [];
  for(let i = 0; i < enabledCats.length; i += 3){
    groups.push(enabledCats.slice(i, i + 3));
  }

  wrapper.innerHTML = groups.map((group, gIndex) => `
    <div class="swiper-slide">
      <div class="grid grid-cols-3 gap-3">
        ${group.map((cat, indexInGroup) => {
          const absoluteIndex = (gIndex * 3) + indexInGroup;
          const isPriority = absoluteIndex < 6;
          return `
            <button class="cat-card flex flex-col items-center gap-2" onclick="scrollToCategorySection('${escapeHtml(cat.id)}')">
              <div class="cat-icon-wrapper">
                ${
                  cat.image
                    ? `
                      <span class="cat-image-fade"></span>
                      <img
                        ${isPriority ? `src="${escapeHtml(cat.image)}"` : `data-src="${escapeHtml(cat.image)}" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" class="lazy-media"`}
                        loading="${isPriority ? 'eager' : 'lazy'}"
                        ${isPriority ? 'fetchpriority="high"' : ''}
                        decoding="async"
                        referrerpolicy="no-referrer"
                        onload="${isPriority ? 'handleMediaLoad(this)' : `if(this.dataset.realLoaded==='1') handleMediaLoad(this)`}"
                        onerror="handleMediaError(this, '${escapeHtml(fallbackImg)}')"
                      >
                    `
                    : getCategoryIconSvg(cat.icon || "box")
                }
              </div>
              <span class="text-xs font-bold text-gray-600 line-clamp-1">${escapeHtml(getCategoryName(cat))}</span>
            </button>
          `;
        }).join("")}
      </div>
    </div>
  `).join("");

  refreshSwiper();
  observeLazyMedia();
  if(sidebarHydrated) renderSidebarCategories();
}

function refreshSwiper(){
  if(catSwiper) {
    try{ catSwiper.destroy(true, true); }catch(e){}
  }
  if(!document.querySelector(".catSwiper")) return;
  catSwiper = new Swiper(".catSwiper", {
    loop: true,
    pagination: { el: ".swiper-pagination", clickable: true },
    autoplay: { delay: 2000, disableOnInteraction: false },
    speed: 500,
    preloadImages: false,
    watchSlidesProgress: true,
    observer: true,
    observeParents: true
  });
}

function renderSidebarCategories(){
  const box = byId("sidebarCategories");
  if(!box) return;
  const enabledCats = categories.filter(c => c.enabled !== false);

  if(!enabledCats.length){
    box.innerHTML = `<div class="text-gray-400 text-sm">${t("empty-products")}</div>`;
    return;
  }

  box.innerHTML = enabledCats.map(cat => `
    <button onclick="closeAll(); setTimeout(() => scrollToCategorySection('${escapeHtml(cat.id)}'), 120)" class="text-right hover:text-[#14454d] transition-colors">
      ${escapeHtml(getCategoryName(cat))}
    </button>
  `).join("");
}

function getProductDisplayImages(p){
  return {
    image1: p.image1 || fallbackImg,
    image2: p.image2 || p.image1 || fallbackImg
  };
}

function openProductPay(productId){
  const p = products.find(x => x.id === productId);
  if(!p) return;

  sessionStorage.setItem(LOCAL_KEYS.checkoutSelection, JSON.stringify({
    source: "buy_now",
    items: [{
      id: p.id,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      price: p.price,
      image1: p.image1,
      image2: p.image2,
      qty: 1
    }]
  }));

  window.location.href = "pay.html";
}

function renderProductCard(p){
  const inWish = wishlist.includes(p.id);
  const displayImages = getProductDisplayImages(p);
  const discount = getDiscountPercent(p.price, p.oldPrice);

  return `
    <div id="product-card-${p.id}" class="product-card reveal-card" onclick="openProductPay('${p.id}')">
      <div class="img-container">
        <div class="product-image-loader"></div>

        ${discount > 0 ? `<div class="discount-badge">${discount}% -</div>` : ""}

        <img
          data-src="${escapeHtml(displayImages.image1)}"
          src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
          class="front-img lazy-media"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          onload="if(this.dataset.realLoaded==='1') handleMediaLoad(this)"
          onerror="handleMediaError(this, '${escapeHtml(fallbackImg)}')"
        >

        <img
          data-src="${escapeHtml(displayImages.image2 || displayImages.image1)}"
          src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
          class="back-img lazy-media"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          onload="if(this.dataset.realLoaded==='1') handleMediaLoad(this)"
          onerror="handleMediaError(this, '${escapeHtml(displayImages.image1 || fallbackImg)}')"
        >

        <button class="wish-btn" onclick="event.stopPropagation(); toggleWish('${p.id}')">
          <svg class="w-5 h-5 ${inWish ? 'text-red-500' : 'text-gray-300'}" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
      </div>

      <div class="p-3">
        <h4 class="text-[14px] font-black text-gray-800 leading-6 line-clamp-2 min-h-[48px] mb-1">${escapeHtml(getProductName(p))}</h4>

        <div class="price-row">
          ${p.oldPrice > p.price ? `<span class="old-price">${money(p.oldPrice)}</span>` : ``}
          <span class="new-price">${money(p.price)}</span>
        </div>

        <button onclick="event.stopPropagation(); addToCart('${p.id}')" class="hollow-cart-btn">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function renderSectionBlock(section, index){
  const title = getSectionTitle(section);
  const images = section.images.length ? section.images : (section.image ? [section.image] : []);
  if(!images.length) return "";

  if(section.type === "slider"){
    const swId = `extra-swiper-${index}`;
    return `
      <section class="mb-6" style="content-visibility:auto;contain-intrinsic-size:420px;">
        ${title ? `<h3 class="font-black text-[#14454d] text-lg mb-3 px-4">${escapeHtml(title)}</h3>` : ``}
        <div class="rounded-banner section-slider">
          <div class="swiper ${swId}">
            <div class="swiper-wrapper">
              ${images.map((img) => `
                <div class="swiper-slide">
                  <a href="${escapeHtml(section.link || '#')}">
                    <div class="extra-banner-wrap">
                      <div class="soft-image-fade"></div>
                      <img
                        data-src="${escapeHtml(img)}"
                        src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
                        class="lazy-media"
                        loading="lazy"
                        decoding="async"
                        referrerpolicy="no-referrer"
                        onload="if(this.dataset.realLoaded==='1') handleMediaLoad(this)"
                        onerror="handleMediaError(this, '${escapeHtml(fallbackImg)}')"
                      >
                    </div>
                  </a>
                </div>
              `).join("")}
            </div>
            ${images.length > 1 ? `<div class="swiper-button-prev"></div><div class="swiper-button-next"></div><div class="swiper-pagination"></div>` : ``}
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="mb-6" style="content-visibility:auto;contain-intrinsic-size:420px;">
      ${title ? `<h3 class="font-black text-[#14454d] text-lg mb-3 px-4">${escapeHtml(title)}</h3>` : ``}
      <a href="${escapeHtml(section.link || '#')}" class="block rounded-banner">
        <div class="extra-banner-wrap">
          <div class="soft-image-fade"></div>
          <img
            data-src="${escapeHtml(images[0])}"
            src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
            class="lazy-media"
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
            onload="if(this.dataset.realLoaded==='1') handleMediaLoad(this)"
            onerror="handleMediaError(this, '${escapeHtml(fallbackImg)}')"
          >
        </div>
      </a>
    </section>
  `;
}

function renderDynamicSections(){
  const top = byId("topDynamicSections");
  const after = byId("afterCategoriesSections");
  const bottom = byId("bottomDynamicSections");
  if(!top || !after || !bottom) return;

  top.innerHTML = pageSections.filter(s => s.placement === "top").map((s, i) => renderSectionBlock(s, `top-${i}`)).join("");
  after.innerHTML = pageSections.filter(s => s.placement === "after_categories").map((s, i) => renderSectionBlock(s, `mid-${i}`)).join("");
  bottom.innerHTML = pageSections.filter(s => s.placement === "bottom").map((s, i) => renderSectionBlock(s, `bottom-${i}`)).join("");

  initDynamicSwipers();
  observeLazyMedia();
}

function initDynamicSwipers(){
  dynamicSwipers.forEach(sw => { try{ sw.destroy(true, true); }catch(e){} });
  dynamicSwipers = [];

  document.querySelectorAll(".section-slider .swiper").forEach(swEl => {
    dynamicSwipers.push(new Swiper(swEl, {
      loop: true,
      speed: 500,
      autoplay: { delay: 2500, disableOnInteraction: false },
      pagination: { el: swEl.querySelector(".swiper-pagination"), clickable: true },
      navigation: { nextEl: swEl.querySelector(".swiper-button-next"), prevEl: swEl.querySelector(".swiper-button-prev") },
      observer: true,
      observeParents: true,
      preloadImages: false
    }));
  });
}

function renderProductsSections(){
  const holder = byId("products-sections");
  if(!holder) return;
  const enabledCats = categories.filter(c => c.enabled !== false);

  if(!enabledCats.length){
    holder.innerHTML = `<div class="empty-box">${t("empty-products")}</div>`;
    return;
  }

  const betweenSections = pageSections.filter(s => s.placement === "between_categories");
  const parts = [];

  enabledCats.forEach((cat, idx) => {
    const catProducts = products.filter(p => String(p.categoryId || "") === String(cat.id || ""));
    if(!catProducts.length) return;

    const firstFive = catProducts.slice(0, 5);
    parts.push(`
      <section class="mb-8" id="category-section-${escapeHtml(cat.id)}" style="content-visibility:auto;contain-intrinsic-size:900px;">
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center gap-3">
            ${cat.image
              ? `<div class="w-10 h-10 rounded-2xl overflow-hidden border bg-white relative"><span class="cat-image-fade"></span><img src="${escapeHtml(cat.image)}" class="w-full h-full object-cover" loading="lazy" decoding="async" referrerpolicy="no-referrer" onload="handleMediaLoad(this)" onerror="handleMediaError(this, '${escapeHtml(fallbackImg)}')"></div>`
              : `<div class="w-10 h-10 rounded-2xl border bg-white flex items-center justify-center text-[#14454d]">${getCategoryIconSvg(cat.icon || "box")}</div>`
            }
            <h3 class="font-black text-[#14454d] text-lg">${escapeHtml(getCategoryName(cat))}</h3>
          </div>
          ${catProducts.length > 5 ? `<button class="text-[#14454d] text-xs font-black bg-[#14454d]/10 px-3 py-1 rounded-full" onclick="showAllCategoryProducts('${escapeHtml(cat.id)}')">${t("show-all")}</button>` : ``}
        </div>

        <div class="desktop-products-grid">
          ${firstFive.map((p) => renderProductCard(p)).join("")}
        </div>
      </section>
    `);

    if(betweenSections[idx]) parts.push(renderSectionBlock(betweenSections[idx], `between-${idx}`));
  });

  holder.innerHTML = parts.join("") || `<div class="empty-box">${t("empty-products")}</div>`;
  initDynamicSwipers();
  setupRevealAnimation();
  observeLazyMedia();
}

async function showAllCategoryProducts(catId){
  await ensurePanelsLoaded();
  const cat = categories.find(c => String(c.id) === String(catId));
  const items = products.filter(p => String(p.categoryId || "") === String(catId || ""));

  if(!items.length){
    showToast(t("empty-category"));
    return;
  }

  let pane = byId("category-all-pane");
  if(!pane){
    pane = document.createElement("div");
    pane.id = "category-all-pane";
    pane.className = "bottom-pane p-6";
    document.body.appendChild(pane);
  }

  pane.innerHTML = `
    <div class="sheet-layout">
      <div class="flex justify-between items-center mb-5 border-b pb-4">
        <h3 class="font-black text-lg text-[#14454d]">${escapeHtml(getCategoryName(cat || {}))}</h3>
        <button onclick="closeAll()" class="text-3xl text-gray-300">&times;</button>
      </div>
      <div class="sheet-scroll hidden-scrollbar">
        <div class="desktop-products-grid">
          ${items.map((p) => renderProductCard(p)).join("")}
        </div>
      </div>
    </div>
  `;

  closeAll(false);
  pane.classList.add("active");
  byId("overlay").style.display = "block";
  setupRevealAnimation();
  observeLazyMedia();
}

function setupRevealAnimation(){
  if (productObserver) productObserver.disconnect();

  productObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        productObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

  document.querySelectorAll(".reveal-card").forEach(card => productObserver.observe(card));
}

function observeLazyMedia(){
  if(mediaObserver) mediaObserver.disconnect();

  mediaObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        loadLazyMediaNow(entry.target);
        mediaObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: "300px 0px 300px 0px", threshold: 0.01 });

  document.querySelectorAll("img.lazy-media").forEach(img => {
    if(img.dataset.src && !img.dataset.realLoaded) mediaObserver.observe(img);
  });
}

function loadLazyMediaNow(img){
  if(!img || img.dataset.realLoaded === "1") return;
  const realSrc = img.dataset.src;
  if(!realSrc) return;
  img.dataset.realLoaded = "1";
  img.src = realSrc;
}

function scrollToCategorySection(catId){
  const sec = byId(`category-section-${catId}`);
  if(sec) sec.scrollIntoView({behavior:"smooth", block:"start"});
}

function handleMediaLoad(img){
  img.classList.add("media-loaded");
  const container = img.closest(".img-container");
  if(container){
    const loader = container.querySelector(".product-image-loader");
    if(loader) loader.classList.add("hidden");
  }
  const fade = img.parentElement?.querySelector(".soft-image-fade, .cat-image-fade");
  if(fade) fade.classList.add("hidden");
  const ownFade = img.closest(".cat-icon-wrapper")?.querySelector(".cat-image-fade");
  if(ownFade) ownFade.classList.add("hidden");
}

function handleMediaError(img, fallback){
  if(img.dataset.fallbackDone === "1"){
    handleMediaLoad(img);
    return;
  }
  img.dataset.fallbackDone = "1";
  img.dataset.realLoaded = "1";
  img.src = fallback || fallbackImg;
}

function hideBannerLoader(){
  byId("topBannerLoader")?.classList.add("hidden");
  byId("topBanner")?.classList.add("media-loaded");
}

function saveCart(){ localStorage.setItem(LOCAL_KEYS.cart, JSON.stringify(cart)); }
function saveWishlist(){ localStorage.setItem(LOCAL_KEYS.wishlist, JSON.stringify(wishlist)); }

function addToCart(productId){
  const p = products.find(x => x.id === productId);
  if(!p) return;

  const existing = cart.find(i => i.id === p.id);
  if(existing){
    existing.qty += 1;
  }else{
    cart.push({
      id: p.id,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      price: p.price,
      image1: p.image1,
      image2: p.image2,
      selected: true,
      qty: 1
    });
  }

  saveCart();
  updateBadges();
  renderCart();
  showToast(t("added-cart"));
}

function toggleWish(productId){
  const idx = wishlist.indexOf(productId);
  if(idx > -1){
    wishlist.splice(idx, 1);
    showToast(t("removed-wish"));
  }else{
    wishlist.push(productId);
    showToast(t("added-wish"));
  }
  saveWishlist();
  updateBadges();
  renderProductsSections();
  renderWishlist();
}

function updateBadges(){
  const cartCount = cart.reduce((a, b) => a + Number(b.qty || 1), 0);
  const wishCount = wishlist.length;

  if(byId("cart-badge-header")) byId("cart-badge-header").textContent = cartCount;
  if(byId("cart-badge-bottom")) byId("cart-badge-bottom").textContent = cartCount;
  if(byId("wish-badge")) byId("wish-badge").textContent = wishCount;
  if(byId("sidebarCartCount")) byId("sidebarCartCount").textContent = cartCount;
  if(byId("sidebarWishCount")) byId("sidebarWishCount").textContent = wishCount;
}

function renderCart(){
  const container = byId("cart-content");
  if(!container) return;

  if(!cart.length){
    container.innerHTML = `<div class="empty-box mt-4">${t("empty-cart")}</div>`;
    updateCartTotal();
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="flex gap-3 border border-gray-100 rounded-2xl p-3">
      <div class="pt-1">
        <input class="cart-item-check" type="checkbox" ${item.selected ? 'checked' : ''} onchange="toggleCartSelect('${item.id}')">
      </div>

      <img src="${escapeHtml(item.image1 || fallbackImg)}" class="w-16 h-20 object-cover rounded-xl border" loading="lazy" decoding="async" referrerpolicy="no-referrer">

      <div class="flex-1">
        <h4 class="text-xs font-black text-gray-800 mb-1 line-clamp-2">${escapeHtml(lang === "ar" ? (item.nameAr || item.nameEn || "") : (item.nameEn || item.nameAr || ""))}</h4>
        <p class="text-sm font-black text-[#14454d] mb-3">${money(item.price)}</p>

        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <button class="w-8 h-8 rounded-full bg-gray-100 font-black" onclick="changeQty('${item.id}', -1)">-</button>
            <span class="font-black text-sm min-w-[20px] text-center">${item.qty}</span>
            <button class="w-8 h-8 rounded-full bg-gray-100 font-black" onclick="changeQty('${item.id}', 1)">+</button>
          </div>

          <button class="text-red-500 text-xs font-black" onclick="removeFromCart('${item.id}')">×</button>
        </div>
      </div>
    </div>
  `).join("");

  updateCartTotal();
}

function renderWishlist(){
  const container = byId("wish-content");
  if(!container) return;
  const items = products.filter(p => wishlist.includes(p.id));

  if(!items.length){
    container.innerHTML = `<div class="empty-box mt-4">${t("empty-wish")}</div>`;
    return;
  }

  container.innerHTML = `<div class="desktop-products-grid">${items.map((p) => renderProductCard(p)).join("")}</div>`;
  setupRevealAnimation();
  observeLazyMedia();
}

function toggleCartSelect(id){
  const item = cart.find(i => i.id === id);
  if(!item) return;
  item.selected = !item.selected;
  saveCart();
  updateCartTotal();
}

function selectAllCartItems(){
  const allSelected = cart.every(i => i.selected);
  cart.forEach(i => i.selected = !allSelected);
  saveCart();
  renderCart();
}

function updateCartTotal(){
  const total = cart.filter(i => i.selected).reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 1)), 0);
  if(byId("cart-total")) byId("cart-total").textContent = money(total);
}

function changeQty(id, delta){
  const item = cart.find(i => i.id === id);
  if(!item) return;
  item.qty = Number(item.qty || 1) + delta;
  if(item.qty <= 0) cart = cart.filter(i => i.id !== id);
  saveCart();
  updateBadges();
  renderCart();
}

function removeFromCart(id){
  cart = cart.filter(i => i.id !== id);
  saveCart();
  updateBadges();
  renderCart();
  showToast(t("removed-cart"));
}

function checkoutSelectedCart(){
  const selectedItems = cart.filter(i => i.selected);
  if(!selectedItems.length){
    showToast(t("choose-item"));
    return;
  }

  sessionStorage.setItem(LOCAL_KEYS.checkoutSelection, JSON.stringify({
    source: "cart",
    items: selectedItems
  }));

  window.location.href = "pay.html";
}

function goOrderPage(){
  if(currentUser){
    window.location.href = "order.html";
  }else{
    sessionStorage.setItem("login_redirect_1885", "order.html");
    window.location.href = "login.html";
  }
}

function toggleLang(){
  lang = lang === "ar" ? "en" : "ar";
  applyLanguageTexts();
}

function scrollToTopPage(){
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleScrollTopButton(){
  const btn = byId("scrollTopBtn");
  if(!btn) return;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
  btn.classList.toggle("show", scrollTop > 220);
}

async function loadStoreData(){
  const [storeSnap, bannersSnap, categoriesSnap, productsSnap, sectionsSnap, menuSnap, methodsSnap, socialSnap] = await Promise.all([
    rtdb1885.ref(PATHS.store).get(),
    rtdb1885.ref(PATHS.banners).get(),
    rtdb1885.ref(PATHS.categories).get(),
    rtdb1885.ref(PATHS.products).get(),
    rtdb1885.ref(PATHS.pageSections).get(),
    rtdb1885.ref(PATHS.menuItems).get(),
    rtdb1885.ref(PATHS.paymentMethods).get(),
    rtdb1885.ref(PATHS.socialLinks).get()
  ]);

  const store = storeSnap.val() || {};
  const banners = bannersSnap.val() || {};

  storeSettings = {
    storeName: store.storeName || store.storeNameAr || "متجر طوفان",
    storeNameEn: store.storeNameEn || store.storeName || "Tofan Store",
    storeLogoUrl: store.storeLogoUrl || fallbackLogo,
    bannerTopUrl: banners.topBannerUrl || store.topBannerUrl || ""
  };

  categories = normalizeCategories(categoriesSnap.val() || {});
  products = normalizeProducts(productsSnap.val() || {});
  pageSections = normalizeSections(sectionsSnap.val() || {});
  menuItems = normalizeMenuItems(menuSnap.val() || {});
  paymentMethods = normalizePaymentMethods(methodsSnap.val() || {});
  socialLinks = normalizeSocialLinks(socialSnap.val() || {});
}

function attachAuthListener(){
  auth1885.onAuthStateChanged(user => {
    currentUser = user || null;
    if(sidebarHydrated) renderUserBox();
  });
}

async function initPage(){
  try{
    setLoadingBar(true);
    attachAuthListener();
    await loadStoreData();
    preloadCriticalAssets();
    updateBadges();
    applyLanguageTexts();
    toggleScrollTopButton();
  }catch(err){
    console.error(err);
    if(byId("products-sections")){
      byId("products-sections").innerHTML = `<div class="empty-box">${t("empty-products")}</div>`;
    }
  }finally{
    setLoadingBar(false);
  }
}

window.addEventListener("scroll", toggleScrollTopButton, { passive: true });
window.addEventListener("load", initPage, { once: true });