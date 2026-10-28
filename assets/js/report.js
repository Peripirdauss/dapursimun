let currentReportData = null;

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const paramDate = urlParams.get('date');
  
  const today = getTodayDateStr();
  const dateInput = document.getElementById('report-date-picker');
  dateInput.value = paramDate || today;

  dateInput.addEventListener('change', () => {
    loadReport();
  });

  loadReport();
});

function getTodayDateStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function setRelativeDate(dayOffset) {
  const dateInput = document.getElementById('report-date-picker');
  const base = dateInput.value ? new Date(dateInput.value) : new Date();
  base.setDate(base.getDate() + dayOffset);
  
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, '0');
  const day = String(base.getDate()).padStart(2, '0');
  dateInput.value = `${year}-${month}-${day}`;
  loadReport();
}

function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
}

function formatDateIndo(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const monthName = months[parseInt(m, 10) - 1] || m;
  return `${parseInt(d, 10)} ${monthName} ${y}`;
}

async function loadReport() {
  const dateInput = document.getElementById('report-date-picker');
  const dateVal = dateInput.value || getTodayDateStr();

  document.getElementById('display-selected-date').textContent = formatDateIndo(dateVal);
  document.getElementById('print-date-label').textContent = `Tanggal PO: ${formatDateIndo(dateVal)}`;

  const loadingEl = document.getElementById('loading-state');
  const emptyEl = document.getElementById('empty-state');
  const tableWrapper = document.getElementById('table-wrapper');
  const kitchenCard = document.getElementById('kitchen-summary-card');
  const btnRefresh = document.getElementById('btn-refresh');

  loadingEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');
  tableWrapper.classList.add('hidden');
  kitchenCard.classList.add('hidden');
  if (btnRefresh) btnRefresh.disabled = true;

  try {
    const res = await API.getDailyReport(dateVal);
    loadingEl.classList.add('hidden');
    if (btnRefresh) btnRefresh.disabled = false;

    if (res.success && res.rows && res.rows.length > 0) {
      currentReportData = res;
      renderStatistics(res);
      renderMatrixTable(res);
      renderKitchenChecklist(res);
      tableWrapper.classList.remove('hidden');
      kitchenCard.classList.remove('hidden');
    } else {
      currentReportData = null;
      resetStatistics();
      emptyEl.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Error loading report:', err);
    loadingEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    if (btnRefresh) btnRefresh.disabled = false;
  }
}

function renderStatistics(data) {
  document.getElementById('stat-customers').textContent = `${data.total_customers} Orang`;
  document.getElementById('stat-items').textContent = `${data.total_qty} Item`;
  document.getElementById('stat-omset').textContent = formatRupiah(data.total_rupiah);
}

function resetStatistics() {
  document.getElementById('stat-customers').textContent = '0';
  document.getElementById('stat-items').textContent = '0';
  document.getElementById('stat-omset').textContent = 'Rp 0';
}

function renderMatrixTable(data) {
  const thead = document.getElementById('matrix-thead');
  const tbody = document.getElementById('matrix-tbody');
  const tfoot = document.getElementById('matrix-tfoot');

  const cols = data.columns || [];
  const rows = data.rows || [];
  const totals = data.totals || {};
  const totalRupiahPerCol = data.total_rupiah_per_col || {};

  // 1. Render THEAD
  let theadHtml = `
    <tr class="bg-orange-600 text-white font-extrabold text-[11px] uppercase tracking-wider text-center">
      <th class="py-3 px-2 border border-orange-700 whitespace-nowrap">DATA PELANGGAN NO</th>
      <th class="py-3 px-3 border border-orange-700 whitespace-nowrap text-left">LOKASI</th>
      <th class="py-3 px-3 border border-orange-700 whitespace-nowrap text-left">NAMA</th>
  `;

  cols.forEach(c => {
    theadHtml += `<th class="py-3 px-2.5 border border-orange-700 whitespace-nowrap max-w-[130px] font-bold">${c.header}</th>`;
  });

  theadHtml += `
      <th class="py-3 px-2.5 border border-orange-700 whitespace-nowrap">KET</th>
      <th class="py-3 px-3 border border-orange-700 whitespace-nowrap bg-orange-700">JUMLAH SELURUHNYA</th>
    </tr>
  `;
  thead.innerHTML = theadHtml;

  // 2. Render TBODY (Customer Rows)
  let tbodyHtml = '';
  rows.forEach((r, idx) => {
    const isEven = idx % 2 === 0;
    const bgRow = isEven ? 'bg-white' : 'bg-amber-50/20';

    tbodyHtml += `<tr class="${bgRow} hover:bg-orange-50/50 transition">`;
    tbodyHtml += `<td class="py-2 px-2 text-center border border-gray-200 font-semibold text-gray-500">${r.no}</td>`;
    tbodyHtml += `<td class="py-2 px-3 border border-gray-200 font-extrabold text-orange-950 uppercase whitespace-nowrap">${r.show_agency || ''}</td>`;
    tbodyHtml += `<td class="py-2 px-3 border border-gray-200 font-bold text-gray-800 uppercase whitespace-nowrap">${r.customer_name}</td>`;

    cols.forEach(c => {
      const q = r.items[c.key];
      const displayVal = (q && q > 0) ? `<span class="font-bold text-gray-900">${q}</span>` : '';
      const cellBg = (q && q > 0) ? 'bg-amber-50/40' : '';
      tbodyHtml += `<td class="py-2 px-2 text-center border border-gray-200 ${cellBg}">${displayVal}</td>`;
    });

    const ketDisplay = r.notes ? `<span class="font-bold text-blue-700 text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 uppercase">${r.notes}</span>` : '';
    tbodyHtml += `<td class="py-2 px-2 text-center border border-gray-200 whitespace-nowrap">${ketDisplay}</td>`;
    tbodyHtml += `<td class="py-2 px-3 text-center border border-gray-200 font-black text-orange-600 bg-amber-50/50">${r.total_qty}</td>`;
    tbodyHtml += `</tr>`;
  });
  tbody.innerHTML = tbodyHtml;

  // 3. Render TFOOT (TOTAL, HARGA SATUAN, TOTAL RUPIAH)
  let tfootHtml = '';

  // Baris TOTAL QTY
  tfootHtml += `
    <tr class="bg-amber-100/90 text-gray-900 font-black text-xs text-center border-t-2 border-gray-300">
      <td colspan="3" class="py-2.5 px-3 border border-amber-200 text-right uppercase tracking-wider">TOTAL</td>
  `;
  cols.forEach(c => {
    const sumQ = totals[c.key] || 0;
    tfootHtml += `<td class="py-2.5 px-2 border border-amber-200 font-black">${sumQ > 0 ? sumQ : ''}</td>`;
  });
  tfootHtml += `
      <td class="py-2.5 px-2 border border-amber-200"></td>
      <td class="py-2.5 px-3 border border-amber-200 font-black text-orange-700 bg-amber-200/80 text-sm">${data.total_qty}</td>
    </tr>
  `;

  // Baris HARGA SATUAN
  tfootHtml += `
    <tr class="bg-gray-50 text-gray-600 font-bold text-[11px] text-center">
      <td colspan="3" class="py-2 px-3 border border-gray-200 text-right">HARGA SATUAN</td>
  `;
  cols.forEach(c => {
    tfootHtml += `<td class="py-2 px-2 border border-gray-200">${c.price ? (c.price).toLocaleString('id-ID') : '-'}</td>`;
  });
  tfootHtml += `
      <td class="py-2 px-2 border border-gray-200"></td>
      <td class="py-2 px-3 border border-gray-200"></td>
    </tr>
  `;

  // Baris TOTAL RUPIAH (totalnya)
  tfootHtml += `
    <tr class="bg-amber-100 text-amber-950 font-black text-xs text-center border-b-2 border-amber-300">
      <td class="border border-amber-200"></td>
      <td class="py-3 px-3 border border-amber-200 font-black text-left uppercase">totalnya</td>
      <td class="border border-amber-200"></td>
  `;
  cols.forEach(c => {
    const subRp = totalRupiahPerCol[c.key] || 0;
    tfootHtml += `<td class="py-3 px-2 border border-amber-200 text-[11px] whitespace-nowrap">${subRp > 0 ? formatRupiah(subRp) : ''}</td>`;
  });
  tfootHtml += `
      <td class="py-3 px-2 border border-amber-200"></td>
      <td class="py-3 px-3 border border-amber-200 font-black text-emerald-700 bg-amber-200 text-sm whitespace-nowrap">${formatRupiah(data.total_rupiah)}</td>
    </tr>
  `;

  tfoot.innerHTML = tfootHtml;
}

function renderKitchenChecklist(data) {
  const container = document.getElementById('kitchen-items-grid');
  const cols = data.columns || [];
  const totals = data.totals || {};

  let html = '';
  cols.forEach(c => {
    const qty = totals[c.key] || 0;
    if (qty > 0) {
      html += `
        <div class="bg-white rounded-xl p-3 border border-amber-200 shadow-sm flex flex-col justify-between">
          <span class="text-[11px] font-bold text-gray-700 line-clamp-2 leading-tight">${c.header}</span>
          <div class="mt-2 flex items-baseline justify-between pt-1 border-t border-gray-100">
            <span class="text-xl font-black text-orange-600">${qty}</span>
            <span class="text-[10px] text-gray-400 font-semibold uppercase">${c.unit || 'Item'}</span>
          </div>
        </div>
      `;
    }
  });

  container.innerHTML = html;
}

function exportToCSV() {
  if (!currentReportData || !currentReportData.rows || currentReportData.rows.length === 0) {
    alert('Tidak ada data rekap untuk diexport.');
    return;
  }

  const data = currentReportData;
  const cols = data.columns;
  const rows = data.rows;
  const totals = data.totals;

  // Helper escape CSV cell
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const csvRows = [];

  // Header row
  const headerCols = ['DATA PELANGGAN NO', 'LOKASI', 'NAMA'];
  cols.forEach(c => headerCols.push(c.header));
  headerCols.push('KET', 'JUMLAH SELURUHNYA');
  csvRows.push(headerCols.map(escapeCell).join(','));

  // Data rows
  rows.forEach(r => {
    const rowCols = [r.no, r.show_agency || '', r.customer_name];
    cols.forEach(c => {
      const q = r.items[c.key];
      rowCols.push(q > 0 ? q : '');
    });
    rowCols.push(r.notes || '', r.total_qty);
    csvRows.push(rowCols.map(escapeCell).join(','));
  });

  // Footer: TOTAL
  const totalCols = ['TOTAL', '', ''];
  cols.forEach(c => totalCols.push(totals[c.key] || ''));
  totalCols.push('', data.total_qty);
  csvRows.push(totalCols.map(escapeCell).join(','));

  // Footer: HARGA SATUAN
  const hargaCols = ['', '', ''];
  cols.forEach(c => hargaCols.push(c.price || ''));
  hargaCols.push('', '');
  csvRows.push(hargaCols.map(escapeCell).join(','));

  // Footer: TOTAL RUPIAH
  const rupiahCols = ['', 'totalnya', ''];
  cols.forEach(c => rupiahCols.push(data.total_rupiah_per_col[c.key] || ''));
  rupiahCols.push('', data.total_rupiah);
  csvRows.push(rupiahCols.map(escapeCell).join(','));

  // Generate downloadable Blob with UTF-8 BOM so Excel opens it perfectly
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Rekap_DapurSimun_${data.date}.csv`;
  link.click();
}

async function generateToGoogleSheet() {
  const dateInput = document.getElementById('report-date-picker');
  const dateVal = dateInput.value || getTodayDateStr();

  const btn = document.getElementById('btn-sync-sheet');
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Menyinkron...';
  btn.disabled = true;

  try {
    const res = await API.generateSheetReport(dateVal);
    if (res.success) {
      alert(`🎉 Berhasil!\nSheet baru telah dibuat di Google Spreadsheet:\n"${res.sheet_name || 'REKAP_' + dateVal}"`);
    } else {
      alert(`❌ Gagal membuat sheet: ${res.message || 'Terjadi kesalahan'}`);
    }
  } catch (err) {
    console.error('Error generating sheet:', err);
    alert('Terjadi kendala koneksi ke Google Apps Script.');
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
}

