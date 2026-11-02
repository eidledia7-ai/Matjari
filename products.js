/* ============ الباركود ============ */
function setupBarcodeListener() {
  const barcodeInput = document.getElementById('saleBarcode');
  if (!barcodeInput) return;

  // [إصلاح] منع تكرار الـ listeners (لو setupBarcodeListener اتنادت أكتر من مرة)
  if (barcodeInput.__barcodeListenerAttached) return;
  barcodeInput.__barcodeListenerAttached = true;

  barcodeInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(barcodeTimer);
      processBarcodeNow(barcodeInput.value);
      barcodeInput.value = '';
    }
  });

  barcodeInput.addEventListener('input', function() {
    clearTimeout(barcodeTimer);
    const val = barcodeInput.value.trim();
    if (val.length >= 4) {
      barcodeTimer = setTimeout(function() {
        if (document.activeElement === barcodeInput) {
          processBarcodeNow(val);
          barcodeInput.value = '';
        }
      }, 500);
    }
  });
}

function processBarcodeNow(code) {
  const cleanCode = normalizeBarcode(code);
  if (!cleanCode) return;

  // [إصلاح] debounce بـ timestamp بدل "flag + reset"
  const now = Date.now();
  if (lastProcessedBarcode === cleanCode && (now - (window.__lastBarcodeTime || 0)) < 500) {
    return;
  }
  lastProcessedBarcode = cleanCode;
  window.__lastBarcodeTime = now;

  const product = state.products.find(function(p) {
    return normalizeBarcode(p.barcode) === cleanCode;
  });

  if (!product) {
    playBeep(false);
    // ✅ v7.10.2 — ترجمة
    showNotification(tr('barcode_manual_error'), 'error');
    return;
  }

  const stockNum = Number(product.stock) || 0;
  if (stockNum <= 0) {
    playBeep(false);
    showNotification(tr('notify_product_out'), 'error');
    return;
  }

  // ✅ v7.10 — إضافة موحدة عبر addToCartById
  if (typeof addToCartById === 'function') {
    addToCartById(product.id, 1);
  } else {
    // Fallback
    const existing = state.cart.find(function(item) { return item.id === product.id; });
    if (existing) {
      if ((Number(existing.qty) || 0) + 1 > stockNum) {
        playBeep(false);
        // ✅ v7.10.2 — ترجمة
        showNotification(tr('barcode_qty_exceeds'), 'error');
        return;
      }
      existing.qty = (Number(existing.qty) || 0) + 1;
    } else {
      state.cart.push({ id: product.id, name: product.name, price: product.price, cost: product.cost, qty: 1 });
    }
    playBeep(true);
    renderCart();
  }
  
  // ✅ v7.10.2 — ترجمة
  showNotification(tr('barcode_added_prefix') + product.name, 'success');
  
  // ✅ v7.10 — تحديث الشبكة بعد الباركود
  if (typeof renderProductGrid === 'function') {
    try { renderProductGrid(); } catch (e) {}
  }
}

async function openBarcodeScanner() {
  const modal = document.getElementById('barcodeModal');
  if (!('BarcodeDetector' in window)) {
    const saleBc = document.getElementById('saleBarcode');
    if (saleBc) saleBc.focus();
    showNotification(tr('barcode_no_support'), 'warning');
    return;
  }

  if (!modal) return;
  modal.style.display = 'flex';

  try {
    const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'itf'];
    let supported = formats;
    try {
      const supportedList = await BarcodeDetector.getSupportedFormats();
      supported = formats.filter(function(f) { return supportedList.indexOf(f) !== -1; });
    } catch (e) { supported = formats; }

    const usableFormats = formats.filter(function(f) { return supported.indexOf(f) !== -1; });
    // ✅ v7.10.2 — ترجمة
    if (!usableFormats.length) throw new Error(tr('barcode_no_formats'));

    barcodeDetector = new BarcodeDetector({ formats: usableFormats });
    barcodeStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });

    const video = document.getElementById('barcodeVideo');
    // ✅ v7.10.2 — ترجمة
    if (!video) throw new Error(tr('error_video_element_missing'));
    video.srcObject = barcodeStream;
    await video.play();

    const scan = async function() {
      if (!barcodeStream) return;
      try {
        const codes = await barcodeDetector.detect(video);
        if (codes.length && codes[0].rawValue) {
          const code = codes[0].rawValue;
          closeBarcodeScanner();
          processBarcodeNow(code);
          return;
        }
      } catch (e) {}
      barcodeScanFrame = requestAnimationFrame(scan);
    };
    scan();
  } catch (e) {
    // ✅ v7.10.2 — ترجمة
    showNotification(tr('barcode_camera_error') + (e.message || ''), 'error');
    closeBarcodeScanner();
  }
}

function closeBarcodeScanner() {
  if (barcodeScanFrame) cancelAnimationFrame(barcodeScanFrame);
  barcodeScanFrame = null;
  if (barcodeStream) {
    barcodeStream.getTracks().forEach(function(t) { t.stop(); });
    barcodeStream = null;
  }
  const video = document.getElementById('barcodeVideo');
  if (video) video.srcObject = null;
  const modal = document.getElementById('barcodeModal');
  if (modal) modal.style.display = 'none';
}