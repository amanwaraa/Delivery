/* admin2.js */
/* الجزء الثاني من لوحة الأدمن */

(function () {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  function asArray(v) {
    return Array.isArray(v) ? v : [];
  }

  function uniqueStrings(arr) {
    return [...new Set(asArray(arr).map(x => String(x || "").trim()).filter(Boolean))];
  }

  function normalizeHexColor(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (raw.startsWith("#")) return raw;
    return `#${raw}`;
  }

  function safeMoney(v) {
    return typeof money === "function" ? money(v) : `${Number(v || 0).toFixed(2)} ₪`;
  }

  function safeEscape(v) {
    return typeof escapeHtml === "function" ? escapeHtml(v) : String(v ?? "");
  }

  function safeStr(v) {
    return typeof str === "function" ? str(v) : String(v ?? "").trim();
  }

  function safeToast(msg) {
    if (typeof toast === "function") toast(msg);
  }

  function safeOverlay(on) {
    if (typeof setOverlayLoading === "function") setOverlayLoading(on);
  }

  function safeDate(ts) {
    if (typeof formatDate === "function") return formatDate(ts);
    try {
      return new Date(ts).toLocaleString("ar-EG");
    } catch {
      return "-";
    }
  }

  function safeStatusInfo(status) {
    if (typeof statusInfo === "function") return statusInfo(status);
    const s = String(status || "pending").toLowerCase();
    if (s === "approved") return { text: "تمت الموافقة", cls: "status-approved" };
    if (s === "delivered") return { text: "تم التسليم", cls: "status-delivered" };
    if (s === "rejected") return { text: "مرفوض", cls: "status-rejected" };
    return { text: "قيد الانتظار", cls: "status-pending" };
  }

  function safeAutoKey(label, fallback = "field") {
    if (typeof makeAutoKeyFromLabel === "function") {
      return makeAutoKeyFromLabel(label, fallback);
    }
    const source = safeStr(label) || fallback;
    return (
      source
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^\u0600-\u06FFa-z0-9_]/g, "")
        .replace(/_+/g, "_") +
      "_" +
      Math.random().toString(36).slice(2, 6)
    );
  }

  function getCategoryNameById(categoryId) {
    const found = (window.categoriesCache || []).find(c => c.id === categoryId);
    return found ? (found.nameAr || found.nameEn || found.id) : "-";
  }

  function collectCheckedDefaultSizes() {
    return [...document.querySelectorAll(".product-size-check:checked")]
      .map(el => String(el.value || "").trim())
      .filter(Boolean);
  }

  window.clearProductColorBuilder = function clearProductColorBuilder() {
    const wrap = byId("productColorImagesBuilder");
    if (wrap) wrap.innerHTML = "";
  };

  window.addProductColorImageBuilder = function addProductColorImageBuilder(data = {}) {
    const wrap = byId("productColorImagesBuilder");
    if (!wrap) return;

    const el = document.createElement("div");
    el.className = "builder-item product-color-image-item";
    el.innerHTML = `
      <div class="small-title">لون المنتج / صورة اختيارية</div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="label">اسم اللون</label>
          <input class="field product-color-name" value="${safeEscape(data.name || "")}" placeholder="مثال: بيج">
        </div>

        <div>
          <label class="label">اختر لون معروف</label>
          <select class="field product-color-select" onchange="updateColorCodeFromSelect(this)">
            ${typeof colorOptionsHtml === "function" ? colorOptionsHtml(data.name || "") : `
              <option value="">اختر لون معروف</option>
              ${(window.KNOWN_COLORS || []).map(c => `<option value="${safeEscape(c.name)}" ${data.name === c.name ? "selected" : ""}>${safeEscape(c.name)}</option>`).join("")}
            `}
          </select>
        </div>

        <div>
          <label class="label">كود اللون</label>
          <input class="field product-color-code" value="${safeEscape(data.code || "")}" placeholder="#f5f5dc">
        </div>

        <div>
          <label class="label">رابط الصورة الاختيارية</label>
          <input class="field product-color-image-url" value="${safeEscape(data.image || "")}" placeholder="https://example.com/color-image.jpg">
          <div class="hint">ممكن تتركه فارغ، وسيتم حفظ اللون بدون صورة.</div>
        </div>
      </div>

      <div class="mt-3">
        <button type="button" class="btn btn-danger" onclick="this.closest('.product-color-image-item').remove()">حذف</button>
      </div>
    `;
    wrap.appendChild(el);
  };

  window.updateColorCodeFromSelect = function updateColorCodeFromSelect(selectEl) {
    const wrapper = selectEl.closest(".product-color-image-item");
    if (!wrapper) return;

    const codeInput = wrapper.querySelector(".product-color-code");
    const nameInput = wrapper.querySelector(".product-color-name");
    const chosen = (window.KNOWN_COLORS || []).find(c => c.name === selectEl.value);

    if (chosen) {
      if (codeInput) codeInput.value = chosen.code;
      if (nameInput && !safeStr(nameInput.value)) nameInput.value = chosen.name;
    }
  };

  window.collectProductColorOptions = function collectProductColorOptions() {
    const items = [...document.querySelectorAll(".product-color-image-item")].map(item => {
      const image = safeStr(item.querySelector(".product-color-image-url")?.value);
      const nameFromInput = safeStr(item.querySelector(".product-color-name")?.value);
      const nameFromSelect = safeStr(item.querySelector(".product-color-select")?.value);
      const code = normalizeHexColor(item.querySelector(".product-color-code")?.value);

      return {
        image,
        name: nameFromInput || nameFromSelect,
        code
      };
    });

    const filtered = items.filter(x => x.name || x.code || x.image);

    const grouped = {};
    filtered.forEach(item => {
      const key = `${item.name || "color"}__${item.code || ""}`;
      if (!grouped[key]) {
        grouped[key] = {
          name: item.name || "لون",
          code: item.code || "#cccccc",
          images: []
        };
      }
      if (item.image) {
        grouped[key].images.push(item.image);
      }
    });

    const result = Object.values(grouped).map(item => ({
      name: item.name,
      code: item.code,
      images: uniqueStrings(item.images)
    }));

    const hidden = byId("productColorOptions");
    if (hidden) hidden.value = JSON.stringify(result, null, 2);

    return result;
  };

  window.renderProductCustomSizes = function renderProductCustomSizes() {
    const wrap = byId("productCustomSizesWrap");
    if (!wrap) return;

    window.customProductSizes = asArray(window.customProductSizes);
    wrap.innerHTML = window.customProductSizes.map((size, index) => `
      <div class="size-pill">
        <span>${safeEscape(size)}</span>
        <button type="button" class="text-red-500 font-black" onclick="removeCustomProductSize(${index})">×</button>
      </div>
    `).join("");
  };

  window.addCustomProductSize = function addCustomProductSize() {
    const input = byId("productCustomSizeInput");
    if (!input) return;

    const value = safeStr(input.value);
    if (!value) return;

    window.customProductSizes = asArray(window.customProductSizes);

    const existingDefault = collectCheckedDefaultSizes();
    const all = [...existingDefault, ...window.customProductSizes];
    if (all.includes(value)) {
      input.value = "";
      return;
    }

    window.customProductSizes.push(value);
    input.value = "";
    renderProductCustomSizes();
    collectProductSizes();
  };

  window.removeCustomProductSize = function removeCustomProductSize(index) {
    window.customProductSizes = asArray(window.customProductSizes);
    window.customProductSizes.splice(index, 1);
    renderProductCustomSizes();
    collectProductSizes();
  };

  window.collectProductSizes = function collectProductSizes() {
    const checkedDefaults = collectCheckedDefaultSizes();
    window.customProductSizes = asArray(window.customProductSizes);
    const sizes = [...checkedDefaults, ...window.customProductSizes].filter(Boolean);

    const hidden = byId("productSizes");
    if (hidden) hidden.value = JSON.stringify(sizes, null, 2);

    return sizes;
  };

  window.resetProductSizesBuilder = function resetProductSizesBuilder() {
    window.customProductSizes = [];
    const customInput = byId("productCustomSizeInput");
    if (customInput) customInput.value = "";

    document.querySelectorAll(".product-size-check").forEach(el => {
      el.checked = false;
    });

    renderProductCustomSizes();
    collectProductSizes();
  };

  window.fillProductSizesBuilder = function fillProductSizesBuilder(sizes = []) {
    resetProductSizesBuilder();
    const safeSizes = asArray(sizes);

    safeSizes.forEach(size => {
      const cb = [...document.querySelectorAll(".product-size-check")].find(el => el.value === size);
      if (cb) {
        cb.checked = true;
      } else if (size) {
        window.customProductSizes.push(size);
      }
    });

    renderProductCustomSizes();
    collectProductSizes();
  };

  window.resetProductForm = function resetProductForm() {
    const idsToClear = [
      "productEditId",
      "productNameAr",
      "productNameEn",
      "productDescAr",
      "productDescEn",
      "productPrice",
      "productOldPrice",
      "productImage1",
      "productImage2",
      "productExtraImages",
      "productShippingFee",
      "productOrder"
    ];

    idsToClear.forEach(id => {
      const el = byId(id);
      if (el) el.value = "";
    });

    if (byId("productFreeShipping")) byId("productFreeShipping").value = "false";
    if (byId("productEnableCod")) byId("productEnableCod").value = "true";
    if (byId("productEnableShipping")) byId("productEnableShipping").value = "true";
    if (byId("productEnabled")) byId("productEnabled").value = "true";

    clearProductColorBuilder();
    addProductColorImageBuilder({ name: "بيج", code: "#f5f5dc", image: "" });

    if (byId("productColorOptions")) byId("productColorOptions").value = "[]";

    resetProductSizesBuilder();

    if ((window.categoriesCache || [])[0] && byId("productCategoryId")) {
      byId("productCategoryId").value = window.categoriesCache[0].id;
    }
  };

  window.saveProduct = async function saveProduct() {
    const id = safeStr(byId("productEditId")?.value);
    const colorOptions = collectProductColorOptions();
    const sizes = collectProductSizes();

    const payload = {
      categoryId: safeStr(byId("productCategoryId")?.value),
      category: safeStr(byId("productCategoryId")?.value),
      name: safeStr(byId("productNameAr")?.value),
      nameAr: safeStr(byId("productNameAr")?.value),
      nameEn: safeStr(byId("productNameEn")?.value),
      desc: safeStr(byId("productDescAr")?.value),
      descAr: safeStr(byId("productDescAr")?.value),
      descEn: safeStr(byId("productDescEn")?.value),
      price: Number(byId("productPrice")?.value || 0),
      oldPrice: Number(byId("productOldPrice")?.value || 0),
      image1: safeStr(byId("productImage1")?.value),
      image2: safeStr(byId("productImage2")?.value),
      images: safeStr(byId("productExtraImages")?.value)
        .split("\n")
        .map(s => s.trim())
        .filter(Boolean),
      colorOptions,
      sizes,
      shippingFee: Number(byId("productShippingFee")?.value || 0),
      freeShipping: byId("productFreeShipping")?.value === "true",
      enableCod: byId("productEnableCod")?.value === "true",
      enableShipping: byId("productEnableShipping")?.value === "true",
      order: Number(byId("productOrder")?.value || 0),
      enabled: byId("productEnabled")?.value === "true",
      updatedAt: Date.now()
    };

    if (!payload.categoryId) {
      safeToast("اختر القسم");
      return;
    }
    if (!payload.nameAr) {
      safeToast("أدخل اسم المنتج بالعربي");
      return;
    }
    if (!payload.image1) {
      safeToast("أدخل الصورة الأولى");
      return;
    }

    safeOverlay(true);
    try {
      if (id) {
        await window.rtdb.ref(`${window.PATHS.products}/${id}`).update(payload);
      } else {
        payload.createdAt = Date.now();
        await window.rtdb.ref(window.PATHS.products).push(payload);
      }

      resetProductForm();
      await window.loadAllData();
      safeToast("تم حفظ المنتج");
    } catch (e) {
      console.error(e);
      safeToast("فشل حفظ المنتج");
    } finally {
      safeOverlay(false);
    }
  };

  window.editProduct = function editProduct(id) {
    const p = (window.productsCache || []).find(x => x.id === id);
    if (!p) return;

    if (byId("productEditId")) byId("productEditId").value = p.id;
    if (byId("productCategoryId")) byId("productCategoryId").value = p.categoryId || "";
    if (byId("productNameAr")) byId("productNameAr").value = p.nameAr || "";
    if (byId("productNameEn")) byId("productNameEn").value = p.nameEn || "";
    if (byId("productDescAr")) byId("productDescAr").value = p.descAr || "";
    if (byId("productDescEn")) byId("productDescEn").value = p.descEn || "";
    if (byId("productPrice")) byId("productPrice").value = p.price || 0;
    if (byId("productOldPrice")) byId("productOldPrice").value = p.oldPrice || 0;
    if (byId("productImage1")) byId("productImage1").value = p.image1 || "";
    if (byId("productImage2")) byId("productImage2").value = p.image2 || "";
    if (byId("productExtraImages")) byId("productExtraImages").value = asArray(p.images).join("\n");
    if (byId("productShippingFee")) byId("productShippingFee").value = p.shippingFee || 0;
    if (byId("productFreeShipping")) byId("productFreeShipping").value = p.freeShipping ? "true" : "false";
    if (byId("productEnableCod")) byId("productEnableCod").value = p.enableCod ? "true" : "false";
    if (byId("productEnableShipping")) byId("productEnableShipping").value = p.enableShipping ? "true" : "false";
    if (byId("productOrder")) byId("productOrder").value = p.order || 0;
    if (byId("productEnabled")) byId("productEnabled").value = p.enabled ? "true" : "false";

    clearProductColorBuilder();

    const colors = asArray(p.colorOptions);
    if (colors.length) {
      colors.forEach(color => {
        const images = asArray(color.images);
        if (images.length) {
          images.forEach(img => {
            addProductColorImageBuilder({
              name: color.name,
              code: color.code,
              image: img
            });
          });
        } else {
          addProductColorImageBuilder({
            name: color.name,
            code: color.code,
            image: ""
          });
        }
      });
    } else {
      addProductColorImageBuilder();
    }

    fillProductSizesBuilder(asArray(p.sizes));
    if (byId("productColorOptions")) {
      byId("productColorOptions").value = JSON.stringify(colors, null, 2);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.deleteProduct = async function deleteProduct(id) {
    if (!confirm("حذف هذا المنتج؟")) return;

    safeOverlay(true);
    try {
      await window.rtdb.ref(`${window.PATHS.products}/${id}`).remove();
      await window.loadAllData();
      safeToast("تم حذف المنتج");
    } catch (e) {
      console.error(e);
      safeToast("فشل حذف المنتج");
    } finally {
      safeOverlay(false);
    }
  };

  window.renderProductsList = function renderProductsList() {
    const box = byId("productsList");
    if (!box) return;

    const filterCat = byId("productsFilterCategory")?.value || "all";
    let items = [...(window.productsCache || [])];

    if (filterCat !== "all") {
      items = items.filter(p => p.categoryId === filterCat);
    }

    if (!items.length) {
      box.innerHTML = `<div class="empty">لا توجد منتجات</div>`;
      return;
    }

    box.innerHTML = items.map(p => {
      const colors = asArray(p.colorOptions);
      const sizes = asArray(p.sizes);

      const colorsHtml = colors.length
        ? colors.slice(0, 8).map(c => `
            <div class="flex items-center gap-2">
              <span class="color-dot" style="background:${safeEscape(c.code || "#ccc")}" title="${safeEscape(c.name || "")}"></span>
              <span class="text-xs font-black text-gray-600">${safeEscape(c.name || "لون")}</span>
              <span class="text-[10px] text-gray-400 font-black">${asArray(c.images).length ? `(${asArray(c.images).length} صورة)` : `(بدون صورة)`}</span>
            </div>
          `).join("")
        : `<span class="text-xs text-gray-400 font-bold">لا توجد ألوان</span>`;

      const sizesHtml = sizes.length
        ? sizes.map(size => `<span class="size-pill">${safeEscape(size)}</span>`).join(" ")
        : `<span class="text-xs text-gray-400 font-bold">لا توجد مقاسات</span>`;

      return `
        <div class="mini-card flex items-start gap-3">
          <img src="${safeEscape(p.image1 || "https://via.placeholder.com/80x100?text=Image")}" class="w-16 h-20 rounded-2xl object-cover border">

          <div class="flex-1 min-w-0">
            <div class="font-black text-sm text-gray-900">${safeEscape(p.nameAr)} / ${safeEscape(p.nameEn || "-")}</div>
            <div class="text-xs text-gray-400 font-bold mt-1">${safeEscape(getCategoryNameById(p.categoryId))} | ${safeMoney(p.price)}</div>
            <div class="text-xs text-gray-400 font-bold mt-1">
              ${p.freeShipping ? "شحن مجاني" : `شحن: ${safeMoney(p.shippingFee)}`} |
              ${p.enableShipping ? "توصيل مفعل" : "توصيل معطل"} |
              ${p.enableCod ? "COD مفعل" : "COD معطل"}
            </div>

            <div class="mt-2 flex flex-wrap items-center gap-3">${colorsHtml}</div>
            <div class="mt-2 flex items-center gap-2 flex-wrap">${sizesHtml}</div>
          </div>

          <div class="flex gap-2">
            <button class="btn btn-secondary" onclick="editProduct('${p.id}')">تعديل</button>
            <button class="btn btn-danger" onclick="deleteProduct('${p.id}')">حذف</button>
          </div>
        </div>
      `;
    }).join("");
  };

  window.clearPaymentBuilders = function clearPaymentBuilders() {
    const ids = ["paymentCopyFieldsBuilder", "paymentExtraImagesBuilder", "paymentPayerFieldsBuilder"];
    ids.forEach(id => {
      const el = byId(id);
      if (el) el.innerHTML = "";
    });
  };

  window.renderPaymentPreview = function renderPaymentPreview() {
    const built = collectPaymentBuilderValues(false);
    const box = byId("paymentPreviewBox");
    if (!box) return;

    if (!built.copyFields.length) {
      box.innerHTML = `<div class="empty">لا توجد معاينة بعد</div>`;
      return;
    }

    box.innerHTML = built.copyFields.map(item => `
      <div class="preview-pay-box">
        <div class="preview-pay-title">${safeEscape(item.labelAr || "حقل")} / ${safeEscape(item.labelEn || "-")}</div>
        <div class="text-sm font-black pt-2 break-all">${safeEscape(item.value || "-")}</div>
      </div>
    `).join("");
  };

  window.addPaymentCopyFieldBuilder = function addPaymentCopyFieldBuilder(data = {}) {
    const wrap = byId("paymentCopyFieldsBuilder");
    if (!wrap) return;

    const el = document.createElement("div");
    el.className = "builder-item payment-copy-item";
    el.innerHTML = `
      <div class="small-title">حقل معلومات الدفع</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="label">اسم الحقل بالعربي</label>
          <input class="field payment-copy-label-ar" value="${safeEscape(data.labelAr || data.label || "")}" placeholder="مثال: رقم المحفظة" oninput="renderPaymentPreview()">
        </div>
        <div>
          <label class="label">اسم الحقل بالإنجليزي</label>
          <input class="field payment-copy-label-en" value="${safeEscape(data.labelEn || "")}" placeholder="Example: Wallet Number" oninput="renderPaymentPreview()">
        </div>
        <div class="md:col-span-2">
          <label class="label">نص الحقل</label>
          <input class="field payment-copy-value" value="${safeEscape(data.value || "")}" placeholder="مثال: 123456789" oninput="renderPaymentPreview()">
        </div>
      </div>
      <div class="mt-3">
        <button type="button" class="btn btn-danger" onclick="this.closest('.payment-copy-item').remove(); renderPaymentPreview();">حذف</button>
      </div>
    `;
    wrap.appendChild(el);
    renderPaymentPreview();
  };

  window.addPaymentExtraImageBuilder = function addPaymentExtraImageBuilder(data = {}) {
    const wrap = byId("paymentExtraImagesBuilder");
    if (!wrap) return;

    const el = document.createElement("div");
    el.className = "builder-item payment-extra-image-item";
    el.innerHTML = `
      <div class="small-title">صورة إضافية</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="label">عنوان الصورة بالعربي</label>
          <input class="field payment-extra-image-label-ar" value="${safeEscape(data.labelAr || data.label || "")}" placeholder="مثال: QR Code">
        </div>
        <div>
          <label class="label">عنوان الصورة بالإنجليزي</label>
          <input class="field payment-extra-image-label-en" value="${safeEscape(data.labelEn || "")}" placeholder="Example: QR Code">
        </div>
        <div class="md:col-span-2">
          <label class="label">رابط الصورة</label>
          <input class="field payment-extra-image-url" value="${safeEscape(data.url || "")}" placeholder="https://example.com/pay-image.jpg">
        </div>
      </div>
      <div class="mt-3">
        <button type="button" class="btn btn-danger" onclick="this.closest('.payment-extra-image-item').remove()">حذف</button>
      </div>
    `;
    wrap.appendChild(el);
  };

  window.addPaymentPayerFieldBuilder = function addPaymentPayerFieldBuilder(data = {}) {
    const wrap = byId("paymentPayerFieldsBuilder");
    if (!wrap) return;

    const el = document.createElement("div");
    el.className = "builder-item payment-payer-item";
    el.innerHTML = `
      <div class="small-title">حقل يملؤه الزبون</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="label">اسم الحقل بالعربي</label>
          <input class="field payment-payer-label-ar" value="${safeEscape(data.labelAr || data.label || "")}" placeholder="مثال: اسم المرسل">
        </div>
        <div>
          <label class="label">اسم الحقل بالإنجليزي</label>
          <input class="field payment-payer-label-en" value="${safeEscape(data.labelEn || "")}" placeholder="Example: Sender Name">
        </div>
        <div>
          <label class="label">تلميح عربي</label>
          <input class="field payment-payer-placeholder-ar" value="${safeEscape(data.placeholderAr || data.placeholder || "")}" placeholder="اكتب اسم المرسل">
        </div>
        <div>
          <label class="label">تلميح إنجليزي</label>
          <input class="field payment-payer-placeholder-en" value="${safeEscape(data.placeholderEn || "")}" placeholder="Enter sender name">
        </div>
        <div>
          <label class="label">مطلوب؟</label>
          <select class="field payment-payer-required">
            <option value="true" ${data.required !== false ? "selected" : ""}>نعم</option>
            <option value="false" ${data.required === false ? "selected" : ""}>لا</option>
          </select>
        </div>
      </div>
      <div class="mt-3">
        <button type="button" class="btn btn-danger" onclick="this.closest('.payment-payer-item').remove()">حذف</button>
      </div>
    `;
    wrap.appendChild(el);
  };

  window.collectPaymentBuilderValues = function collectPaymentBuilderValues(writeHidden = true) {
    const copyFields = [...document.querySelectorAll(".payment-copy-item")].map(item => ({
      label: safeStr(item.querySelector(".payment-copy-label-ar")?.value),
      labelAr: safeStr(item.querySelector(".payment-copy-label-ar")?.value),
      labelEn: safeStr(item.querySelector(".payment-copy-label-en")?.value),
      value: safeStr(item.querySelector(".payment-copy-value")?.value)
    })).filter(x => x.labelAr || x.value);

    const extraImages = [...document.querySelectorAll(".payment-extra-image-item")].map(item => ({
      label: safeStr(item.querySelector(".payment-extra-image-label-ar")?.value),
      labelAr: safeStr(item.querySelector(".payment-extra-image-label-ar")?.value),
      labelEn: safeStr(item.querySelector(".payment-extra-image-label-en")?.value),
      url: safeStr(item.querySelector(".payment-extra-image-url")?.value)
    })).filter(x => x.labelAr || x.url);

    const payerFields = [...document.querySelectorAll(".payment-payer-item")].map(item => {
      const labelAr = safeStr(item.querySelector(".payment-payer-label-ar")?.value);
      return {
        key: safeAutoKey(labelAr, "payer"),
        label: labelAr,
        labelAr,
        labelEn: safeStr(item.querySelector(".payment-payer-label-en")?.value),
        placeholder: safeStr(item.querySelector(".payment-payer-placeholder-ar")?.value),
        placeholderAr: safeStr(item.querySelector(".payment-payer-placeholder-ar")?.value),
        placeholderEn: safeStr(item.querySelector(".payment-payer-placeholder-en")?.value),
        required: item.querySelector(".payment-payer-required")?.value !== "false"
      };
    }).filter(x => x.labelAr);

    if (writeHidden) {
      if (byId("paymentCopyFields")) byId("paymentCopyFields").value = JSON.stringify(copyFields, null, 2);
      if (byId("paymentExtraImages")) byId("paymentExtraImages").value = JSON.stringify(extraImages, null, 2);
      if (byId("paymentPayerFields")) byId("paymentPayerFields").value = JSON.stringify(payerFields, null, 2);
    }

    return { copyFields, extraImages, payerFields };
  };

  window.resetPaymentForm = function resetPaymentForm() {
    if (byId("paymentEditId")) byId("paymentEditId").value = "";
    if (byId("paymentNameAr")) byId("paymentNameAr").value = "";
    if (byId("paymentNameEn")) byId("paymentNameEn").value = "";
    if (byId("paymentImage")) byId("paymentImage").value = "";
    if (byId("paymentEnabled")) byId("paymentEnabled").value = "true";
    if (byId("paymentIsCod")) byId("paymentIsCod").value = "false";

    clearPaymentBuilders();

    addPaymentCopyFieldBuilder({
      labelAr: "رقم المحفظة",
      labelEn: "Wallet Number",
      value: "123456789"
    });

    addPaymentPayerFieldBuilder({
      labelAr: "اسم المرسل",
      labelEn: "Sender Name",
      placeholderAr: "اكتب اسم المرسل",
      placeholderEn: "Enter sender name",
      required: true
    });

    renderPaymentPreview();
  };

  window.savePaymentMethod = async function savePaymentMethod() {
    const id = safeStr(byId("paymentEditId")?.value);
    const built = collectPaymentBuilderValues(true);

    const payload = {
      name: safeStr(byId("paymentNameAr")?.value),
      nameAr: safeStr(byId("paymentNameAr")?.value),
      nameEn: safeStr(byId("paymentNameEn")?.value),
      image: safeStr(byId("paymentImage")?.value),
      enabled: byId("paymentEnabled")?.value === "true",
      isCod: byId("paymentIsCod")?.value === "true",
      copyFields: built.copyFields,
      extraImages: built.extraImages,
      payerFields: built.payerFields,
      updatedAt: Date.now()
    };

    if (!payload.nameAr) {
      safeToast("أدخل اسم طريقة الدفع");
      return;
    }

    safeOverlay(true);
    try {
      if (id) {
        await window.rtdb.ref(`${window.PATHS.paymentMethods}/${id}`).update(payload);
      } else {
        payload.createdAt = Date.now();
        await window.rtdb.ref(window.PATHS.paymentMethods).push(payload);
      }

      resetPaymentForm();
      await window.loadAllData();
      safeToast("تم حفظ طريقة الدفع");
    } catch (e) {
      console.error(e);
      safeToast("فشل حفظ طريقة الدفع");
    } finally {
      safeOverlay(false);
    }
  };

  window.editPaymentMethod = function editPaymentMethod(id) {
    const p = (window.paymentsCache || []).find(x => x.id === id);
    if (!p) return;

    if (byId("paymentEditId")) byId("paymentEditId").value = p.id;
    if (byId("paymentNameAr")) byId("paymentNameAr").value = p.nameAr || p.name || "";
    if (byId("paymentNameEn")) byId("paymentNameEn").value = p.nameEn || "";
    if (byId("paymentImage")) byId("paymentImage").value = p.image || "";
    if (byId("paymentEnabled")) byId("paymentEnabled").value = p.enabled ? "true" : "false";
    if (byId("paymentIsCod")) byId("paymentIsCod").value = p.isCod ? "true" : "false";

    clearPaymentBuilders();
    asArray(p.copyFields).forEach(addPaymentCopyFieldBuilder);
    asArray(p.extraImages).forEach(addPaymentExtraImageBuilder);
    asArray(p.payerFields).forEach(addPaymentPayerFieldBuilder);

    if (!asArray(p.copyFields).length) addPaymentCopyFieldBuilder();
    if (!asArray(p.payerFields).length) addPaymentPayerFieldBuilder();

    renderPaymentPreview();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.deletePaymentMethod = async function deletePaymentMethod(id) {
    if (!confirm("حذف طريقة الدفع؟")) return;

    safeOverlay(true);
    try {
      await window.rtdb.ref(`${window.PATHS.paymentMethods}/${id}`).remove();
      await window.loadAllData();
      safeToast("تم حذف طريقة الدفع");
    } catch (e) {
      console.error(e);
      safeToast("فشل حذف طريقة الدفع");
    } finally {
      safeOverlay(false);
    }
  };

  window.renderPaymentsList = function renderPaymentsList() {
    const box = byId("paymentsList");
    if (!box) return;

    const items = window.paymentsCache || [];
    if (!items.length) {
      box.innerHTML = `<div class="empty">لا توجد طرق دفع</div>`;
      return;
    }

    box.innerHTML = items.map(p => `
      <div class="mini-card flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <img src="${safeEscape(p.image || "https://via.placeholder.com/60?text=Pay")}" class="w-12 h-12 rounded-full border object-cover">
          <div>
            <div class="font-black text-sm">${safeEscape(p.nameAr || p.name)} / ${safeEscape(p.nameEn || "-")}</div>
            <div class="text-xs text-gray-400 font-bold mt-1">
              ${p.enabled ? "مفعل" : "معطل"} |
              ${p.isCod ? "دفع عند الاستلام" : "دفع عادي"} |
              حقول النسخ: ${asArray(p.copyFields).length} |
              حقول الزبون: ${asArray(p.payerFields).length}
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-secondary" onclick="editPaymentMethod('${p.id}')">تعديل</button>
          <button class="btn btn-danger" onclick="deletePaymentMethod('${p.id}')">حذف</button>
        </div>
      </div>
    `).join("");
  };

  window.openPaymentPreviewModal = function openPaymentPreviewModal() {
    const built = collectPaymentBuilderValues(false);
    const paymentImage = safeStr(byId("paymentImage")?.value) || "https://via.placeholder.com/80";
    const paymentNameAr = safeStr(byId("paymentNameAr")?.value) || "طريقة دفع";
    const paymentNameEn = safeStr(byId("paymentNameEn")?.value) || paymentNameAr || "Payment Method";

    const html = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="card p-5">
          <div class="flex items-center gap-3 mb-4">
            <img src="${safeEscape(paymentImage)}" class="w-14 h-14 rounded-full object-cover border">
            <div>
              <div class="font-black text-lg">${safeEscape(paymentNameAr)}</div>
              <div class="text-sm text-gray-400 font-bold">Arabic preview</div>
            </div>
          </div>
          <div class="space-y-3">
            ${
              built.copyFields.length
                ? built.copyFields.map(item => `
                    <div class="preview-pay-box">
                      <div class="preview-pay-title">${safeEscape(item.labelAr || "حقل")}</div>
                      <div class="text-sm font-black pt-2 break-all">${safeEscape(item.value || "-")}</div>
                    </div>
                  `).join("")
                : `<div class="empty">لا توجد حقول معلومات دفع</div>`
            }
          </div>
        </div>

        <div class="card p-5">
          <div class="flex items-center gap-3 mb-4">
            <img src="${safeEscape(paymentImage)}" class="w-14 h-14 rounded-full object-cover border">
            <div>
              <div class="font-black text-lg">${safeEscape(paymentNameEn)}</div>
              <div class="text-sm text-gray-400 font-bold">English preview</div>
            </div>
          </div>
          <div class="space-y-3">
            ${
              built.copyFields.length
                ? built.copyFields.map(item => `
                    <div class="preview-pay-box">
                      <div class="preview-pay-title">${safeEscape(item.labelEn || item.labelAr || "Field")}</div>
                      <div class="text-sm font-black pt-2 break-all">${safeEscape(item.value || "-")}</div>
                    </div>
                  `).join("")
                : `<div class="empty">No payment info fields</div>`
            }
          </div>
        </div>
      </div>
    `;

    if (typeof openPreviewModal === "function") {
      openPreviewModal("معاينة طريقة الدفع", html);
    }
  };

  window.setOrdersFilter = function setOrdersFilter(filter) {
    window.currentOrdersFilter = filter;

    ["All", "Pending", "Approved", "Delivered", "Rejected"].forEach(k => {
      const el = byId(`ordersFilter${k}`);
      if (el) el.className = "tab-btn inactive";
    });

    if (filter === "all" && byId("ordersFilterAll")) byId("ordersFilterAll").className = "tab-btn active";
    if (filter === "pending" && byId("ordersFilterPending")) byId("ordersFilterPending").className = "tab-btn active";
    if (filter === "approved" && byId("ordersFilterApproved")) byId("ordersFilterApproved").className = "tab-btn active";
    if (filter === "delivered" && byId("ordersFilterDelivered")) byId("ordersFilterDelivered").className = "tab-btn active";
    if (filter === "rejected" && byId("ordersFilterRejected")) byId("ordersFilterRejected").className = "tab-btn active";

    renderOrdersList();
  };

  window.updateOrderStatus = async function updateOrderStatus(orderId, status) {
    safeOverlay(true);
    try {
      await window.rtdb.ref(`${window.PATHS.orders}/${orderId}`).update({
        status,
        updatedAt: Date.now()
      });
      await window.loadAllData();
      safeToast("تم تحديث حالة الطلب");
    } catch (e) {
      console.error(e);
      safeToast("فشل تحديث حالة الطلب");
    } finally {
      safeOverlay(false);
    }
  };

  window.deleteOrder = async function deleteOrder(orderId) {
    if (!confirm("هل تريد حذف هذا الطلب نهائيًا؟")) return;

    safeOverlay(true);
    try {
      await window.rtdb.ref(`${window.PATHS.orders}/${orderId}`).remove();
      await window.loadAllData();
      safeToast("تم حذف الطلب");
    } catch (e) {
      console.error(e);
      safeToast("فشل حذف الطلب");
    } finally {
      safeOverlay(false);
    }
  };

  window.toggleOrderDetails = function toggleOrderDetails(orderId) {
    const el = byId(`order-details-${orderId}`);
    if (!el) return;
    el.classList.toggle("open");
  };

  window.renderOrderFieldBox = function renderOrderFieldBox(title, value) {
    if (value === undefined || value === null || String(value).trim() === "") return "";
    return `
      <div class="order-box">
        <div class="order-box-title">${safeEscape(title)}</div>
        <div class="order-box-value">${safeEscape(value)}</div>
      </div>
    `;
  };

  window.renderOrderObjectFields = function renderOrderObjectFields(obj, labels = {}) {
    const entries = Object.entries(obj || {}).filter(([_, v]) => String(v ?? "").trim() !== "");
    if (!entries.length) return `<div class="empty !py-4">لا توجد بيانات</div>`;

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${entries.map(([key, value]) => renderOrderFieldBox(labels[key] || key, value)).join("")}
      </div>
    `;
  };

  window.renderUnitSelections = function renderUnitSelections(unitSelections = []) {
    if (!Array.isArray(unitSelections) || !unitSelections.length) {
      return `<div class="text-xs text-gray-400 font-bold">لا توجد تخصيصات لكل قطعة</div>`;
    }

    return unitSelections.map(unit => `
      <div class="order-box">
        <div class="order-box-title">القطعة ${safeEscape(unit.pieceNo || "")}</div>
        <div class="order-box-value">
          ${safeEscape(unit.colorName || "الافتراضي")}
          ${unit.size ? " | " + safeEscape(unit.size) : ""}
        </div>
      </div>
    `).join("");
  };

  window.renderProductsInsideOrder = function renderProductsInsideOrder(products) {
    const list = asArray(products);
    if (!list.length) {
      return `<div class="mini-card text-sm text-gray-500 font-bold">لا توجد تفاصيل منتجات</div>`;
    }

    return list.map(product => {
      const unitSelections = asArray(product.unitSelections);
      const directColor = product.selectedColorName || product.selectedColor || "";
      const directSize = product.selectedSize || "";

      return `
        <div class="mini-card">
          <div class="flex items-center gap-3 mb-3">
            <img src="${safeEscape(product.image1 || product.image || unitSelections[0]?.image || "https://via.placeholder.com/100x120?text=Item")}" class="w-16 h-20 rounded-2xl border object-cover">
            <div class="flex-1 min-w-0">
              <div class="font-black text-sm">${safeEscape(product.nameAr || product.nameEn || product.name || "منتج")}</div>
              <div class="text-xs text-gray-400 font-bold mt-1">العدد: ${Number(product.qty || product.quantity || 1)}</div>
              <div class="text-sm text-[#14454d] font-black mt-1">${safeMoney(Number(product.price || 0) * Number(product.qty || product.quantity || 1))}</div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            ${renderOrderFieldBox("اللون الرئيسي", directColor || "-")}
            ${renderOrderFieldBox("المقاس الرئيسي", directSize || "-")}
          </div>

          <div class="mb-3">
            <div class="font-black text-sm text-[#14454d] mb-3">تخصيص كل قطعة</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${renderUnitSelections(unitSelections)}
            </div>
          </div>
        </div>
      `;
    }).join("");
  };

  window.renderOrdersList = function renderOrdersList() {
    const box = byId("ordersList");
    if (!box) return;

    let items = [...(window.ordersCache || [])];
    if ((window.currentOrdersFilter || "all") !== "all") {
      items = items.filter(o => String(o.status || "pending").toLowerCase() === window.currentOrdersFilter);
    }

    if (!items.length) {
      box.innerHTML = `<div class="empty">لا توجد طلبات</div>`;
      return;
    }

    box.innerHTML = items.map(order => {
      const st = safeStatusInfo(order.status);
      const products = Array.isArray(order.items) ? order.items : (Array.isArray(order.products) ? order.products : []);
      const trackingCode = order.trackingCode || order.orderCode || order.guestTrackingCode || "-";
      const customerName = order.customerName || order.name || "-";
      const customerEmail = order.customerEmail || order.email || "-";
      const customerPhone = order.phone || order.customerPhone || order.guestPhone || "-";
      const paymentMethod = order.paymentMethodName || order.paymentMethodSnapshot?.name || "-";
      const accountType = order.customerUserId ? "مسجل دخول" : "بدون تسجيل دخول";
      const shippingZoneName = order.shippingZone?.name || order.shippingZone?.nameAr || order.shippingZoneName || "-";
      const shippingDisplay = order.shippingZone?.displayPrice || order.pricing?.displayShipping || order.displayShipping || safeMoney(order.pricing?.shippingTotal || 0);
      const subtotalDisplay = order.pricing?.displaySubtotal || order.displaySubtotal || order.pricing?.displayProductsTotal || safeMoney(order.pricing?.subtotal || 0);
      const totalDisplay = order.pricing?.displayTotal || order.displayAmount || order.pricing?.displayGrandTotal || safeMoney(order.pricing?.total || order.amountIls || 0);
      const checkoutFields = order.checkoutFields || {};
      const checkoutLabels = order.checkoutFieldLabels || {};
      const payerFields = order.paymentSubmission?.payerFields || {};
      const payerLabels = order.paymentSubmission?.payerFieldLabels || {};

      return `
        <div class="order-summary-row" onclick="toggleOrderDetails('${order.id}')">
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div class="font-black text-base text-[#14454d]">${safeEscape(customerName)}</div>
              <div class="text-xs text-gray-400 font-bold mt-1">#${safeEscape(String(order.id || "").slice(-6).toUpperCase())} | ${safeDate(order.createdAt)}</div>
              <div class="text-xs text-gray-500 font-bold mt-1">طريقة الدفع: ${safeEscape(paymentMethod)}</div>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="status-badge ${st.cls}">${st.text}</span>
              <span class="text-xs text-gray-400 font-black">اضغط للتفاصيل</span>
            </div>
          </div>

          <div id="order-details-${order.id}" class="order-details" onclick="event.stopPropagation()">
            <div class="card p-5 mt-4">
              <div class="grid-auto mb-4">
                ${renderOrderFieldBox("الاسم", customerName)}
                ${renderOrderFieldBox("البريد", customerEmail)}
                ${renderOrderFieldBox("رقم الجوال", customerPhone)}
                ${renderOrderFieldBox("نوع الحساب", accountType)}
                ${renderOrderFieldBox("كود التتبع", trackingCode)}
                ${renderOrderFieldBox("طريقة الدفع", paymentMethod)}
                ${renderOrderFieldBox("منطقة التوصيل", shippingZoneName)}
                ${renderOrderFieldBox("سعر التوصيل", shippingDisplay)}
                ${renderOrderFieldBox("المبلغ الفرعي", subtotalDisplay)}
                ${renderOrderFieldBox("الإجمالي", totalDisplay)}
              </div>

              <div class="mb-4">
                <div class="font-black text-sm text-[#14454d] mb-3">المنتجات داخل الطلب</div>
                <div class="space-y-3">
                  ${renderProductsInsideOrder(products)}
                </div>
              </div>

              <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                <div class="mini-card">
                  <div class="font-black text-sm text-[#14454d] mb-3">الحقول العامة</div>
                  ${renderOrderObjectFields(checkoutFields, checkoutLabels)}
                </div>

                <div class="mini-card">
                  <div class="font-black text-sm text-[#14454d] mb-3">حقول طريقة الدفع</div>
                  ${renderOrderObjectFields(payerFields, payerLabels)}
                </div>
              </div>

              <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                <div class="mini-card">
                  <div class="font-black text-sm text-[#14454d] mb-3">pricing</div>
                  <pre class="text-xs text-gray-700 whitespace-pre-wrap font-bold">${safeEscape(JSON.stringify(order.pricing || {}, null, 2))}</pre>
                </div>
                <div class="mini-card">
                  <div class="font-black text-sm text-[#14454d] mb-3">shippingZone</div>
                  <pre class="text-xs text-gray-700 whitespace-pre-wrap font-bold">${safeEscape(JSON.stringify(order.shippingZone || {}, null, 2))}</pre>
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <button class="btn btn-warning" onclick="updateOrderStatus('${order.id}','pending')">قيد الانتظار</button>
                <button class="btn btn-info" onclick="updateOrderStatus('${order.id}','approved')">تمت الموافقة</button>
                <button class="btn btn-success" onclick="updateOrderStatus('${order.id}','delivered')">تم التسليم</button>
                <button class="btn btn-danger" onclick="updateOrderStatus('${order.id}','rejected')">رفض</button>
                <button class="btn btn-danger" onclick="deleteOrder('${order.id}')">حذف الطلب</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  };

  window.downloadBackup = async function downloadBackup() {
    safeOverlay(true);
    try {
      const refs = Object.entries(window.PATHS || {});
      const result = {};

      for (const [key, path] of refs) {
        const snap = await window.rtdb.ref(path).get();
        result[key] = snap.val();
      }

      result.__backupMeta = {
        createdAt: Date.now(),
        createdAtText: new Date().toLocaleString(),
        source: "Tofan Store Admin Backup"
      };

      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tofan-store-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      safeToast("تم تحميل النسخة الاحتياطية");
    } catch (e) {
      console.error(e);
      safeToast("فشل تحميل النسخة الاحتياطية");
    } finally {
      safeOverlay(false);
    }
  };

  window.restoreBackup = async function restoreBackup() {
    const file = byId("restoreBackupFile")?.files?.[0];
    if (!file) {
      safeToast("اختر ملف النسخة الاحتياطية أولاً");
      return;
    }

    if (!confirm("سيتم استبدال كل بيانات المتجر الحالية. هل أنت متأكد؟")) return;

    safeOverlay(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const writes = [];
      for (const [key, path] of Object.entries(window.PATHS || {})) {
        if (key in data) {
          writes.push(window.rtdb.ref(path).set(data[key] ?? null));
        }
      }

      await Promise.all(writes);
      await window.loadAllData();
      safeToast("تمت استعادة النسخة الاحتياطية");
    } catch (e) {
      console.error(e);
      safeToast("فشل استعادة النسخة الاحتياطية");
    } finally {
      safeOverlay(false);
    }
  };

  window.admin2BootPart = function admin2BootPart() {
    if (byId("paymentCopyFieldsBuilder") && !document.querySelector(".payment-copy-item")) {
      resetPaymentForm();
    }

    if (byId("productColorImagesBuilder") && !document.querySelector(".product-color-image-item")) {
      resetProductForm();
    }

    if (byId("productCustomSizesWrap") && !(window.customProductSizes || []).length) {
      resetProductSizesBuilder();
    }
  };

  window.addEventListener("load", function () {
    admin2BootPart();
  });
})();