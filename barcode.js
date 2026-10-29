/* ============ طباعة الباركود ============ */
function openBarcodePrintModal() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  if (state.products.length === 0) return showNotification(tr('notify_no_products'), 'warning');

  const modal = document.getElementById('barcodePrintModal');
  if (!modal) return;
  const list = document.getElementById('barcodeProductList');
  let html = '';
  state.products.forEach(p => {
    html += '<label style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid #e9eef2;cursor:pointer">' +
      '<input type="checkbox" class="barcode-product-cb" value="' + p.id + '" checked>' +
      '<span><b>' + escapeHTML(p.name) + '</b> — ' + escapeHTML(p.barcode || 'بدون باركود') + '</span></label>';
  });
  list.innerHTML = html;
  modal.style.display = 'flex';
}

function closeBarcodePrintModal() {
  const modal = document.getElementById('barcodePrintModal');
  if (modal) modal.style.display = 'none';
}

function barcodeSelectAll(checked) {
  document.querySelectorAll('.barcode-product-cb').forEach(cb => { cb.checked = checked; });
}

async function printBarcodeLabels() {
  const copies = parseInt(document.getElementById('barcodeCopies').value) || 1;
  const size = document.getElementById('barcodeSize').value || 'medium';
  const type = document.getElementById('barcodeType').value || 'qr';

  const selectedIds = Array.from(document.querySelectorAll('.barcode-product-cb:checked')).map(cb => cb.value);
  if (!selectedIds.length) return showNotification(tr('notify_select_one_product'), 'warning');

  const selectedProducts = state.products.filter(p => selectedIds.includes(p.id));
  const totalLabels = selectedProducts.length * copies;
  if (totalLabels > 300) {
    if (!confirm('عدد الملصقات كبير (' + totalLabels + ' ملصق). هل تريد المتابعة؟')) return;
  }

  closeBarcodePrintModal();

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return showNotification('يرجى السماح بالنوافذ المنبثقة للطباعة', 'warning');

  let labelsHtml = '';

  for (const prod of selectedProducts) {
    const rawBarcode = prod.barcode ? String(prod.barcode).trim() : prod.id;
    let code128Svg = '';
    let qrDataUrl = '';

    if (type === 'code128' || type === 'both') {
      const container = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      container.appendChild(svg);
      try {
        if (typeof JsBarcode !== 'undefined') {
          JsBarcode(svg, rawBarcode, { format: 'CODE128', width: 2, height: 40, displayValue: true, fontSize: 12 });
          code128Svg = svg.outerHTML;
        } else {
          code128Svg = '<span>' + escapeHTML(rawBarcode) + '</span>';
        }
      } catch (e) {
        code128Svg = '<span>' + escapeHTML(rawBarcode) + '</span>';
      }
    }

    if (type === 'qr' || type === 'both') {
      // [إصلاح] حماية QRCode قبل الاستخدام
      try {
        if (typeof QRCode !== 'undefined' && QRCode.toDataURL) {
          qrDataUrl = await QRCode.toDataURL(rawBarcode, { width: 100, margin: 1 });
        } else {
          qrDataUrl = '';
        }
      } catch (e) {
        qrDataUrl = '';
      }
    }

    for (let i = 0; i < copies; i++) {
      labelsHtml += '<div class="barcode-label">';
      labelsHtml += '<div class="label-name">' + escapeHTML(prod.name) + '</div>';
      // [إصلاح] Number() على السعر
      labelsHtml += '<div class="label-price">' + (Number(prod.price) || 0) + ' ' + escapeHTML(state.storeSettings.currency || 'ج.م') + '</div>';

      if (type === 'code128') {
        labelsHtml += '<div class="barcode-render">' + code128Svg + '</div>';
      } else if (type === 'qr') {
        if (qrDataUrl) labelsHtml += '<img src="' + qrDataUrl + '" alt="QR">';
      } else if (type === 'both') {
        labelsHtml += '<div class="both-render">';
        if (qrDataUrl) labelsHtml += '<img src="' + qrDataUrl + '" alt="QR">';
        labelsHtml += '<div class="barcode-render">' + code128Svg + '</div>';
        labelsHtml += '</div>';
      }
      labelsHtml += '</div>';
    }
  }

  const cssUrl = new URL('style.css', location.href).href;

  printWindow.document.write(
    '<!DOCTYPE html><html lang="' + (currentLang === 'ar' ? 'ar' : 'en') + '" dir="' + (currentLang === 'ar' ? 'rtl' : 'ltr') + '">' +
    '<head><meta charset="UTF-8"><title>' + (currentLang === 'en' ? 'Barcode Labels' : 'ملصقات الباركود') + '</title>' +
    '<link rel="stylesheet" href="' + cssUrl + '">' +
    '<style>body{margin:0;padding:10px;background:#fff}@media print{body{padding:0}@page{margin:8mm}}</style></head>' +
    '<body><div class="barcode-sheet size-' + size + '">' + labelsHtml + '</div>' +
    '<script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script>' +
    '</body></html>'
  );
  printWindow.document.close();
}