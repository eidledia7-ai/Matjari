/* ============ الباركود ============ */
function setupBarcodeListener() {
  const barcodeInput = document.getElementById('saleBarcode');
  if (!barcodeInput) return;

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
  if (cleanCode === lastProcessedBarcode) return;
  lastProcessedBarcode = cleanCode;
  setTimeout(function() { lastProcessedBarcode = ''; }, 800);

  const product = state.products.find(function(p) {
    return normalizeBarcode(p.barcode) === cleanCode;
  });

  if (!product) {
    playBeep(false);
    showNotification('الباركود غير مطابق لأي منتج', 'error');
    return;
  }

  if (Number(product.stock) <= 0) {
    playBeep(false);
    showNotification(tr('notify_product_out'), 'error');
    return;
  }

  const existing = state.cart.find(function(item) { return item.id === product.id; });
  if (existing) {
    if (existing.qty + 1 > product.stock) {
      playBeep(false);
      showNotification('الكمية تتجاوز المخزون!', 'error');
      return;
    }
    existing.qty += 1;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      cost: product.cost,
      qty: 1
    });
  }

  playBeep(true);
  renderCart();
  showNotification('تمت إضافة: ' + product.name, 'success');
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
    if (!usableFormats.length) throw new Error('لا توجد صيغ مدعومة');

    barcodeDetector = new BarcodeDetector({ formats: usableFormats });
    barcodeStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });

    const video = document.getElementById('barcodeVideo');
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
    showNotification('تعذر تشغيل الكاميرا: ' + (e.message || ''), 'error');
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

