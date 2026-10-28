const SHEET_NAME_PRODUCTS = 'PRODUCTS';
const SHEET_NAME_ORDERS = 'ORDERS';
const SHEET_NAME_ORDER_ITEMS = 'ORDER_ITEMS';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🍱 DAPUR SIMUN')
    .addItem('📊 Buat Rekap Harian (Hari Ini)', 'menuGenerateDailyReportToday')
    .addItem('📅 Buat Rekap Harian (Pilih Tanggal)...', 'menuGenerateDailyReportCustom')
    .addToUi();
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const postData = JSON.parse(e.postData.contents);
    
    if (postData.action === 'createOrder') {
      return handleCreateOrder(postData);
    } else if (postData.action === 'getProducts') {
      return handleGetProducts();
    } else if (postData.action === 'getInvoice') {
      return handleGetInvoice(postData.order_id);
    } else if (postData.action === 'updateOrderStatus') {
      return handleUpdateOrderStatus(postData.order_id, postData.status, postData.pin);
    } else if (postData.action === 'getOrders') {
      return handleGetOrders(postData.pin);
    } else if (postData.action === 'verifyPin') {
      return handleVerifyPin(postData.order_id, postData.pin, postData.target_status);
    } else if (postData.action === 'getDailyReport') {
      return handleGetDailyReport(postData.date, postData.pin);
    } else if (postData.action === 'generateDailyReportSheet') {
      return handleGenerateDailyReportSheet(postData.date, postData.pin);
    }
    
    return createJsonResponse({ success: false, message: 'Invalid action' });
  } catch (error) {
    return createJsonResponse({ success: false, message: 'Invalid request data', error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : '';
  const callback = e && e.parameter ? e.parameter.callback : '';
  
  let output;
  if (action === 'getProducts') {
    output = handleGetProducts();
  } else if (action === 'getInvoice') {
    output = handleGetInvoice(e.parameter.order_id);
  } else if (action === 'getDailyReport') {
    output = handleGetDailyReport(e.parameter.date, e.parameter.pin);
  } else {
    output = createJsonResponse({ success: true, message: 'API is running' });
  }
  
  if (callback && output) {
    return ContentService.createTextOutput(callback + '(' + output.getContent() + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  return output;
}

function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let productsSheet = ss.getSheetByName(SHEET_NAME_PRODUCTS);
  if (!productsSheet) {
    productsSheet = ss.insertSheet(SHEET_NAME_PRODUCTS);
    productsSheet.appendRow(['product_id', 'product_name', 'unit', 'description', 'price', 'variants', 'available', 'sort_order']);
    productsSheet.getRange('A1:H1').setFontWeight('bold').setBackground('#f3f4f6');
    
    // Add sample products
    productsSheet.appendRow(['P001', 'Tutut Kuah', 'bks', 'Gurih & Berbumbu', 10000, 'Rasa: Pedas, Original', true, 1]);
    productsSheet.appendRow(['P002', 'Risol', 'pcs', 'Renyah & Beragam Isian', 5000, 'Rasa: Ayam Pedas, Crabstik, Mayo, Sayur, Matcha, Coklat, Seblak Jadul; Penyajian: Goreng, Frozen', true, 2]);
    productsSheet.appendRow(['P003', 'Donat Kampung', 'pcs', 'Empuk & Manis Pas', 2000, 'Topping: Coklat, Blubery, Stoberi, Polos', true, 3]);
    productsSheet.appendRow(['P004', 'Kue Cuhcur', 'pcs', 'Manis Gula Merah Original', 2000, '', true, 4]);
    productsSheet.appendRow(['P005', 'Kue Bolen', 'pcs', 'Lembut & Lumer', 3000, '', true, 5]);
    productsSheet.appendRow(['P006', 'Sate Aci Bumbu Kacang', '4 tsk', 'Kenyal & Bumbu Kacang Mantap', 5000, '', true, 6]);
  }
  
  let ordersSheet = ss.getSheetByName(SHEET_NAME_ORDERS);
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet(SHEET_NAME_ORDERS);
    ordersSheet.appendRow(['order_id', 'timestamp', 'customer_name', 'agency', 'whatsapp', 'total_qty', 'subtotal', 'service_fee', 'grand_total', 'status', 'pin']);
    ordersSheet.getRange('A1:K1').setFontWeight('bold').setBackground('#f3f4f6');
  } else {
    // Check if 'pin' header exists, if not add it
    const lastCol = ordersSheet.getLastColumn() || 1;
    const oHeaders = ordersSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    if (oHeaders.indexOf('pin') === -1) {
      ordersSheet.getRange(1, lastCol + 1).setValue('pin').setFontWeight('bold').setBackground('#f3f4f6');
    }
  }
  
  let orderItemsSheet = ss.getSheetByName(SHEET_NAME_ORDER_ITEMS);
  if (!orderItemsSheet) {
    orderItemsSheet = ss.insertSheet(SHEET_NAME_ORDER_ITEMS);
    orderItemsSheet.appendRow(['order_id', 'product_id', 'item_name', 'options', 'price', 'quantity', 'subtotal']);
    orderItemsSheet.getRange('A1:G1').setFontWeight('bold').setBackground('#f3f4f6');
  }
  
  return { productsSheet, ordersSheet, orderItemsSheet };
}

function handleGetProducts() {
  try {
    const { productsSheet } = initSheets();
    const data = productsSheet.getDataRange().getValues();
    if (data.length <= 1) return createJsonResponse({ success: true, data: [] });

    const headers = data[0];
    const products = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const product = {
        product_id: String(row[headers.indexOf('product_id')] || ''),
        product_name: String(row[headers.indexOf('product_name')] || ''),
        unit: String(row[headers.indexOf('unit')] || ''),
        description: String(row[headers.indexOf('description')] || ''),
        price: Number(row[headers.indexOf('price')] || 0),
        variants: String(row[headers.indexOf('variants')] || ''),
        available: parseProductAvailable(row[headers.indexOf('available')]),
        sort_order: Number(row[headers.indexOf('sort_order')] || 0)
      };
      products.push(product);
    }
    
    products.sort((a, b) => a.sort_order - b.sort_order);
    return createJsonResponse({ success: true, data: products });
  } catch (error) {
    return createJsonResponse({ success: false, message: error.message });
  }
}

function parseProductAvailable(val) {
  if (val === undefined || val === null || val === '') return true; // Default ready jika kosong
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val > 0;
  
  const str = String(val).trim().toLowerCase();
  if (['true', '1', 'ya', 'yes', 'ada', 'ready', 'tersedia', 'ok', 'v'].includes(str)) return true;
  if (['false', '0', 'tidak', 'no', 'habis', 'kosong', 'sold', 'x'].includes(str)) return false;
  
  const num = Number(str);
  if (!isNaN(num)) return num > 0;
  
  return true;
}

function handleCreateOrder(data) {
  try {
    const { ordersSheet, orderItemsSheet } = initSheets();
    
    const today = new Date();
    const dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyyMMdd");
    const prefix = 'PO-' + dateStr + '-';
    
    const ordersData = ordersSheet.getDataRange().getValues();
    let maxCounter = 0;
    
    if (ordersData.length > 1) {
      const idIndex = ordersData[0].indexOf('order_id');
      for (let i = ordersData.length - 1; i > 0; i--) {
        const oId = String(ordersData[i][idIndex]);
        if (oId && oId.startsWith(prefix)) {
          const parts = oId.split('-');
          if (parts.length === 3) {
            const counter = parseInt(parts[2], 10);
            if (counter > maxCounter) {
              maxCounter = counter;
            }
          }
        }
      }
    }
    
    const nextCounter = maxCounter + 1;
    const orderId = prefix + ('000' + nextCounter).slice(-3);
    
    const cust = data.customer || {};
    const items = data.items || [];
    let totalQty = 0;
    let subtotalAll = 0;
    
    items.forEach(item => {
      totalQty += item.qty;
      subtotalAll += item.price * item.qty;
    });
    
    const serviceFee = Number(data.service_fee) || 0;
    const grandTotal = subtotalAll + serviceFee;
    
    ordersSheet.appendRow([
      orderId,
      today,
      cust.name || '',
      cust.agency || '',
      cust.whatsapp || '',
      totalQty,
      subtotalAll,
      serviceFee,
      grandTotal,
      'Pending',
      ''
    ]);
    
    items.forEach(item => {
      const optStr = item.options ? Object.entries(item.options).map(([k,v]) => `${k}: ${v}`).join(', ') : '';
      orderItemsSheet.appendRow([
        orderId,
        item.product_id || '',
        item.name,
        optStr,
        item.price,
        item.qty,
        item.price * item.qty
      ]);
    });
    
    SpreadsheetApp.flush(); // Mencegah invoice not found karena data belum selesai ditulis oleh server
    
    // OTOMATIS SINKRONISASI KE TAB SHEET HARIAN (Misal: PO 2026-10-28)
    try {
      const todayDateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");
      generateDailyReportSheet(todayDateStr);
    } catch (sheetErr) {
      console.warn("Auto sync daily report sheet skipped:", sheetErr);
    }

    return createJsonResponse({ 
      success: true, 
      order_id: orderId, 
      total: grandTotal 
    });
    
  } catch (error) {
    return createJsonResponse({ success: false, message: error.message });
  }
}

function handleGetInvoice(orderId) {
  if (!orderId) {
    return createJsonResponse({ success: false, message: 'Order ID is required' });
  }
  
  try {
    const { ordersSheet, orderItemsSheet } = initSheets();
    
    const ordersData = ordersSheet.getDataRange().getValues();
    const oHeaders = ordersData[0];
    let orderData = null;
    
    for (let i = 1; i < ordersData.length; i++) {
      if (String(ordersData[i][oHeaders.indexOf('order_id')]) === orderId) {
        orderData = {
          order_id: ordersData[i][oHeaders.indexOf('order_id')],
          timestamp: ordersData[i][oHeaders.indexOf('timestamp')],
          customer_name: ordersData[i][oHeaders.indexOf('customer_name')],
          agency: ordersData[i][oHeaders.indexOf('agency')],
          whatsapp: ordersData[i][oHeaders.indexOf('whatsapp')],
          subtotal: Number(ordersData[i][oHeaders.indexOf('subtotal')]),
          service_fee: Number(ordersData[i][oHeaders.indexOf('service_fee')]),
          total: Number(ordersData[i][oHeaders.indexOf('grand_total')]),
          status: ordersData[i][oHeaders.indexOf('status')]
        };
        break;
      }
    }
    
    if (!orderData) {
      return createJsonResponse({ success: false, message: 'Invoice not found' });
    }
    
    const itemsData = orderItemsSheet.getDataRange().getValues();
    const iHeaders = itemsData[0];
    const items = [];
    
    for (let i = 1; i < itemsData.length; i++) {
      if (String(itemsData[i][iHeaders.indexOf('order_id')]) === orderId) {
        items.push({
          item_name: itemsData[i][iHeaders.indexOf('item_name')],
          options: itemsData[i][iHeaders.indexOf('options')],
          price: Number(itemsData[i][iHeaders.indexOf('price')]),
          quantity: Number(itemsData[i][iHeaders.indexOf('quantity')]),
          subtotal: Number(itemsData[i][iHeaders.indexOf('subtotal')])
        });
      }
    }
    
    orderData.items = items;
    
    return createJsonResponse({ success: true, data: orderData });
  } catch (error) {
    return createJsonResponse({ success: false, message: error.message });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleUpdateOrderStatus(orderId, newStatus, pin) {
  // Hardcoded simple PIN for security (Bisa diganti)
  const ADMIN_PIN = '123456';
  
  if (pin !== ADMIN_PIN) {
    return createJsonResponse({ success: false, message: 'PIN Admin Salah!' });
  }
  
  if (!orderId || !newStatus) {
    return createJsonResponse({ success: false, message: 'Data tidak lengkap' });
  }

  try {
    const { ordersSheet } = initSheets();
    const ordersData = ordersSheet.getDataRange().getValues();
    const headers = ordersData[0];
    const statusColIndex = headers.indexOf('status') + 1; // +1 karena 1-based indexing
    
    let found = false;
    for (let i = 1; i < ordersData.length; i++) {
      if (String(ordersData[i][headers.indexOf('order_id')]) === orderId) {
        ordersSheet.getRange(i + 1, statusColIndex).setValue(newStatus);
        found = true;
        break;
      }
    }
    
    if (found) {
      return createJsonResponse({ success: true, message: 'Status berhasil diperbarui' });
    } else {
      return createJsonResponse({ success: false, message: 'Order tidak ditemukan' });
    }
  } catch (e) {
    return createJsonResponse({ success: false, message: e.message });
  }
}

function handleGetOrders(pin) {
  const ADMIN_PIN = '123456';
  if (pin !== ADMIN_PIN) {
    return createJsonResponse({ success: false, message: 'PIN Admin Salah!' });
  }

  try {
    const { ordersSheet } = initSheets();
    const ordersData = ordersSheet.getDataRange().getValues();
    if (ordersData.length <= 1) {
      return createJsonResponse({ success: true, data: [] });
    }

    const headers = ordersData[0];
    const orders = [];
    
    for (let i = ordersData.length - 1; i >= 1; i--) {
      const row = ordersData[i];
      orders.push({
        order_id: row[headers.indexOf('order_id')],
        timestamp: row[headers.indexOf('timestamp')],
        customer_name: row[headers.indexOf('customer_name')],
        agency: row[headers.indexOf('agency')],
        whatsapp: row[headers.indexOf('whatsapp')],
        total_qty: Number(row[headers.indexOf('total_qty')]),
        subtotal: Number(row[headers.indexOf('subtotal')]),
        service_fee: Number(row[headers.indexOf('service_fee')]),
        grand_total: Number(row[headers.indexOf('grand_total')]),
        status: row[headers.indexOf('status')] || 'Pending'
      });
    }
    
    return createJsonResponse({ success: true, data: orders });
  } catch (e) {
    return createJsonResponse({ success: false, message: e.message });
  }
}

function handleVerifyPin(orderId, inputPin, targetStatus) {
  if (!orderId) {
    return createJsonResponse({ success: false, message: 'Order ID tidak ditemukan' });
  }
  if (!inputPin) {
    return createJsonResponse({ success: false, message: 'Harap masukkan PIN dari Admin' });
  }

  try {
    const { ordersSheet } = initSheets();
    const ordersData = ordersSheet.getDataRange().getValues();
    const headers = ordersData[0];
    const orderIdCol = headers.indexOf('order_id');
    const statusCol = headers.indexOf('status') + 1; // 1-based index
    const pinCol = headers.indexOf('pin');

    if (pinCol === -1) {
      return createJsonResponse({ success: false, message: 'Kolom PIN belum tersedia di Spreadsheet' });
    }

    let rowIndex = -1;
    let storedPin = '';
    let currentStatus = '';

    for (let i = 1; i < ordersData.length; i++) {
      if (String(ordersData[i][orderIdCol]) === String(orderId)) {
        rowIndex = i + 1;
        storedPin = String(ordersData[i][pinCol] || '').trim();
        currentStatus = String(ordersData[i][statusCol - 1] || 'Pending');
        break;
      }
    }

    if (rowIndex === -1) {
      return createJsonResponse({ success: false, message: 'Pesanan tidak ditemukan' });
    }

    if (!storedPin) {
      return createJsonResponse({ 
        success: false, 
        message: 'Admin belum menyetel PIN untuk pesanan ini di Spreadsheet. Silakan hubungi Admin terlebih dahulu.' 
      });
    }

    if (String(inputPin).trim() !== storedPin) {
      return createJsonResponse({ 
        success: false, 
        message: 'PIN yang dimasukkan salah! Pastikan PIN sesuai dengan yang diberikan oleh Admin.' 
      });
    }

    // PIN cocok! Update status
    const newStatus = targetStatus || (currentStatus === 'Pending' ? 'Diproses' : 'Selesai');
    ordersSheet.getRange(rowIndex, statusCol).setValue(newStatus);
    SpreadsheetApp.flush();

    return createJsonResponse({ 
      success: true, 
      message: 'PIN Terverifikasi! Status pesanan kini: ' + newStatus,
      new_status: newStatus
    });

  } catch (e) {
    return createJsonResponse({ success: false, message: e.message });
  }
}

// ==========================================
// DAILY REPORT (REKAP HARIAN) ENGINE
// ==========================================

function menuGenerateDailyReportToday() {
  const today = new Date();
  const dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");
  generateDailyReportSheet(dateStr);
}

function menuGenerateDailyReportCustom() {
  const ui = SpreadsheetApp.getUi();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const response = ui.prompt(
    '📅 Buat Rekap Harian', 
    'Masukkan tanggal PO yang ingin direkap (Format: YYYY-MM-DD):\nContoh: ' + today, 
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() === ui.Button.OK) {
    const inputDate = response.getResponseText().trim();
    if (!inputDate) {
      ui.alert('Tanggal tidak boleh kosong!');
      return;
    }
    generateDailyReportSheet(inputDate);
  }
}

function handleGetDailyReport(targetDateStr, pin) {
  try {
    const reportData = buildDailyReportData(targetDateStr);
    return createJsonResponse({ success: true, ...reportData });
  } catch (e) {
    return createJsonResponse({ success: false, message: e.message });
  }
}

function handleGenerateDailyReportSheet(targetDateStr, pin) {
  try {
    const sheetName = generateDailyReportSheet(targetDateStr);
    return createJsonResponse({ 
      success: true, 
      message: 'Sheet rekap berhasil dibuat: ' + sheetName,
      sheet_name: sheetName
    });
  } catch (e) {
    return createJsonResponse({ success: false, message: e.message });
  }
}

function normalizeDateString(dateVal) {
  if (!dateVal) {
    return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  if (dateVal instanceof Date) {
    return Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  const str = String(dateVal).trim();
  // If YYYYMMDD
  if (/^\d{8}$/.test(str)) {
    return str.substring(0, 4) + '-' + str.substring(4, 6) + '-' + str.substring(6, 8);
  }
  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  // Try parsing date string
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
  } catch(e) {}
  return str;
}

function buildDailyReportData(targetDateInput) {
  const { productsSheet, ordersSheet, orderItemsSheet } = initSheets();
  const dateFormatted = normalizeDateString(targetDateInput);
  const dateClean = dateFormatted.replace(/-/g, ''); // YYYYMMDD
  const poPrefix = 'PO-' + dateClean + '-';

  // 1. Ambil list produk & susun struktur kolom standar
  const prodData = productsSheet.getDataRange().getValues();
  const prodHeaders = prodData[0] || [];
  const columns = [];
  const colKeyMap = {};

  for (let i = 1; i < prodData.length; i++) {
    const row = prodData[i];
    const pName = String(row[prodHeaders.indexOf('product_name')] || '').trim();
    if (!pName) continue;
    const unit = String(row[prodHeaders.indexOf('unit')] || 'pcs').toUpperCase().trim();
    const price = Number(row[prodHeaders.indexOf('price')] || 0);
    const variants = String(row[prodHeaders.indexOf('variants')] || '').trim();

    if (!variants) {
      const colKey = pName.toLowerCase() + '|||';
      let shortName = pName.replace(/kue\s+/i, '').replace(/bumbu\s+kacang/i, '').trim().toUpperCase();
      const colHeader = shortName + ' ' + unit;
      const colObj = { key: colKey, header: colHeader, product_name: pName, variant: '', price: price, unit: unit };
      columns.push(colObj);
      colKeyMap[colKey] = colObj;
    } else {
      // Ambil grup varian pertama (biasanya Rasa atau Topping)
      const groups = variants.split(';').map(g => g.trim()).filter(g => g);
      if (groups.length > 0 && groups[0].indexOf(':') !== -1) {
        const parts = groups[0].split(':');
        const gName = parts[0].trim();
        const options = parts[1].split(',').map(o => o.trim()).filter(o => o);

        for (let j = 0; j < options.length; j++) {
          const opt = options[j];
          const colKey = pName.toLowerCase() + '|||' + opt.toLowerCase();
          
          let shortPName = pName.replace(/kampung/i, '').trim().toUpperCase();
          // Penamaan header mirip spreadsheet acuan:
          // Contoh: "TUTUT KUAH PEDAS BKS", "ORIGINAL BKS", "DONAT COKLAT PCS", "RISOL MAYO PCS"
          let colHeader = '';
          if (pName.toLowerCase().includes('tutut') && opt.toLowerCase().includes('original')) {
            colHeader = 'ORIGINAL ' + unit;
          } else {
            colHeader = shortPName + ' ' + opt.toUpperCase() + ' ' + unit;
          }

          const colObj = { key: colKey, header: colHeader, product_name: pName, variant: opt, price: price, unit: unit };
          columns.push(colObj);
          colKeyMap[colKey] = colObj;
        }
      }
    }
  }

  // 2. Ambil semua pesanan pada tanggal target
  const ordersData = ordersSheet.getDataRange().getValues();
  const oHeaders = ordersData[0] || [];
  const targetOrders = [];
  const orderIdMap = {};

  for (let i = 1; i < ordersData.length; i++) {
    const row = ordersData[i];
    const orderId = String(row[oHeaders.indexOf('order_id')] || '');
    const ts = row[oHeaders.indexOf('timestamp')];
    const orderDate = normalizeDateString(ts);

    if (orderId.startsWith(poPrefix) || orderDate === dateFormatted) {
      const orderObj = {
        order_id: orderId,
        timestamp: ts,
        customer_name: String(row[oHeaders.indexOf('customer_name')] || '').trim(),
        agency: String(row[oHeaders.indexOf('agency')] || 'UMUM').trim().toUpperCase(),
        whatsapp: String(row[oHeaders.indexOf('whatsapp')] || ''),
        total_qty: Number(row[oHeaders.indexOf('total_qty')] || 0),
        subtotal: Number(row[oHeaders.indexOf('subtotal')] || 0),
        service_fee: Number(row[oHeaders.indexOf('service_fee')] || 0),
        grand_total: Number(row[oHeaders.indexOf('grand_total')] || 0),
        status: String(row[oHeaders.indexOf('status')] || 'Pending'),
        items: {},
        notes: []
      };
      targetOrders.push(orderObj);
      orderIdMap[orderId] = orderObj;
    }
  }

  // 3. Ambil rincian pesanan dari sheet ORDER_ITEMS
  if (targetOrders.length > 0) {
    const itemsData = orderItemsSheet.getDataRange().getValues();
    const iHeaders = itemsData[0] || [];

    for (let i = 1; i < itemsData.length; i++) {
      const row = itemsData[i];
      const oId = String(row[iHeaders.indexOf('order_id')] || '');
      if (orderIdMap[oId]) {
        const pName = String(row[iHeaders.indexOf('item_name')] || '').trim();
        const optionsStr = String(row[iHeaders.indexOf('options')] || '').trim();
        const qty = Number(row[iHeaders.indexOf('quantity')] || 0);
        const price = Number(row[iHeaders.indexOf('price')] || 0);

        // Ekstrak varian utama dan keterangan tambahan (seperti FROZEN)
        let primaryVariant = '';
        if (optionsStr) {
          const optPairs = optionsStr.split(',').map(s => s.trim());
          for (let p = 0; p < optPairs.length; p++) {
            const pair = optPairs[p].split(':');
            if (pair.length === 2) {
              const k = pair[0].trim().toLowerCase();
              const v = pair[1].trim();
              if (k.includes('rasa') || k.includes('topping')) {
                primaryVariant = v;
              } else if (k.includes('penyajian') && v.toLowerCase().includes('frozen')) {
                if (!orderIdMap[oId].notes.includes('FROZEN')) {
                  orderIdMap[oId].notes.push('FROZEN');
                }
              }
            }
          }
        }

        // Cari matching kolom
        const directKey = pName.toLowerCase() + '|||' + primaryVariant.toLowerCase();
        let targetColKey = directKey;

        if (!colKeyMap[targetColKey]) {
          // Cari kolom paling cocok
          let found = false;
          for (let c = 0; c < columns.length; c++) {
            if (columns[c].product_name.toLowerCase() === pName.toLowerCase()) {
              if (!primaryVariant || columns[c].variant.toLowerCase() === primaryVariant.toLowerCase()) {
                targetColKey = columns[c].key;
                found = true;
                break;
              }
            }
          }
          if (!found) {
            // Buat kolom dinamis baru jika produk tidak ada di katalog standar
            const newHeader = (pName + ' ' + primaryVariant).trim().toUpperCase() + ' PCS';
            const newCol = { key: targetColKey, header: newHeader, product_name: pName, variant: primaryVariant, price: price, unit: 'PCS' };
            columns.push(newCol);
            colKeyMap[targetColKey] = newCol;
          }
        }

        orderIdMap[oId].items[targetColKey] = (orderIdMap[oId].items[targetColKey] || 0) + qty;
      }
    }
  }

  // 4. Urutkan Pesanan Berdasarkan LOKASI (Agency) lalu Nama Pemesan
  targetOrders.sort((a, b) => {
    if (a.agency === b.agency) {
      return a.customer_name.localeCompare(b.customer_name);
    }
    return a.agency.localeCompare(b.agency);
  });

  // 5. Susun Baris Data Pelanggan (Rows)
  const rows = [];
  let currentNo = 1;

  for (let i = 0; i < targetOrders.length; i++) {
    const o = targetOrders[i];
    const prevAgency = i > 0 ? targetOrders[i - 1].agency : null;
    const isFirstInAgency = o.agency !== prevAgency;

    let rowQtySum = 0;
    const itemQuantities = {};

    for (let c = 0; c < columns.length; c++) {
      const q = o.items[columns[c].key] || 0;
      itemQuantities[columns[c].key] = q;
      rowQtySum += q;
    }

    rows.push({
      no: currentNo++,
      order_id: o.order_id,
      agency: o.agency,
      show_agency: isFirstInAgency ? o.agency : '',
      customer_name: o.customer_name.toUpperCase(),
      whatsapp: o.whatsapp,
      items: itemQuantities,
      notes: o.notes.join(', '),
      total_qty: rowQtySum,
      grand_total: o.grand_total,
      status: o.status
    });
  }

  // 6. Hitung Total Kolom (Footer)
  const colTotals = {};
  const colTotalRupiah = {};
  let allItemsQty = 0;
  let allItemsRupiah = 0;

  for (let c = 0; c < columns.length; c++) {
    const k = columns[c].key;
    let sumQty = 0;
    for (let r = 0; r < rows.length; r++) {
      sumQty += (rows[r].items[k] || 0);
    }
    colTotals[k] = sumQty;
    const subRupiah = sumQty * columns[c].price;
    colTotalRupiah[k] = subRupiah;
    allItemsQty += sumQty;
    allItemsRupiah += subRupiah;
  }

  return {
    date: dateFormatted,
    total_customers: rows.length,
    total_qty: allItemsQty,
    total_rupiah: allItemsRupiah,
    columns: columns,
    rows: rows,
    totals: colTotals,
    total_rupiah_per_col: colTotalRupiah
  };
}

function generateDailyReportSheet(targetDateInput) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reportData = buildDailyReportData(targetDateInput);
  
  // Format nama tab: PO YYYY-MM-DD (Contoh: PO 2026-10-28)
  const sheetName = 'PO ' + reportData.date;

  let sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(sheetName);
  }

  // Beri warna tab agar mencolok & rapi
  try {
    sheet.setTabColor('#ea580c');
  } catch(e) {}

  // Row 1: Header Kolom (Persis seperti contoh spreadsheet)
  // [DATA PELANGGAN NO, LOKASI, NAMA, ...Varian Produk, KET, JUMLAH SELURUHNYA]
  const headerRow = ['DATA PELANGGAN NO', 'LOKASI', 'NAMA'];
  for (let c = 0; c < reportData.columns.length; c++) {
    headerRow.push(reportData.columns[c].header);
  }
  headerRow.push('KET ');
  headerRow.push('JUMLAH SELURUHNYA ');

  const totalCols = headerRow.length;
  const startRow = 1; // Mulai dari baris 1 persis seperti acuan!

  sheet.getRange(startRow, 1, 1, totalCols).setValues([headerRow])
    .setFontWeight('bold')
    .setBackground('#ea580c')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  // Data Pelanggan
  const dataRows = [];
  for (let r = 0; r < reportData.rows.length; r++) {
    const rowObj = reportData.rows[r];
    const rowValues = [
      rowObj.no,
      rowObj.show_agency,
      rowObj.customer_name
    ];

    for (let c = 0; c < reportData.columns.length; c++) {
      const q = rowObj.items[reportData.columns[c].key];
      rowValues.push(q > 0 ? q : '');
    }

    rowValues.push(rowObj.notes);
    rowValues.push(rowObj.total_qty);
    dataRows.push(rowValues);
  }

  // Jika belum ada pesanan, sediakan 1 baris kosong siap isi
  const rowCountToWrite = dataRows.length > 0 ? dataRows.length : 1;
  const rowsPayload = dataRows.length > 0 ? dataRows : [new Array(totalCols).fill('')];

  sheet.getRange(startRow + 1, 1, rowCountToWrite, totalCols).setValues(rowsPayload)
    .setVerticalAlignment('middle');

  // Alignment: No & Angka di Center, Lokasi & Nama di Left
  sheet.getRange(startRow + 1, 1, rowCountToWrite, 1).setHorizontalAlignment('center');
  sheet.getRange(startRow + 1, 2, rowCountToWrite, 1).setFontWeight('bold').setHorizontalAlignment('left');
  sheet.getRange(startRow + 1, 3, rowCountToWrite, 1).setHorizontalAlignment('left');
  sheet.getRange(startRow + 1, 4, rowCountToWrite, totalCols - 3).setHorizontalAlignment('center');

  const lastDataRow = startRow + rowCountToWrite;
  const totalRowNum = lastDataRow + 1;
  const hargaRowNum = totalRowNum + 1;
  const rupiahRowNum = hargaRowNum + 1;

  // Baris TOTAL (Jumlah Item): =SUM(Col2:ColN)
  const totalRowValues = ['TOTAL', '', ''];
  for (let c = 0; c < reportData.columns.length; c++) {
    const colLetter = getColumnLetter(4 + c);
    totalRowValues.push(`=SUM(${colLetter}2:${colLetter}${lastDataRow})`);
  }
  totalRowValues.push(' ');
  const totalQtyColLetter = getColumnLetter(totalCols);
  totalRowValues.push(`=SUM(${totalQtyColLetter}2:${totalQtyColLetter}${lastDataRow})`);

  sheet.getRange(totalRowNum, 1, 1, totalCols).setValues([totalRowValues])
    .setFontWeight('bold')
    .setBackground('#ffedd5')
    .setHorizontalAlignment('center');

  // Baris HARGA SATUAN
  const hargaRowValues = ['', '', ''];
  for (let c = 0; c < reportData.columns.length; c++) {
    hargaRowValues.push(reportData.columns[c].price);
  }
  hargaRowValues.push('');
  hargaRowValues.push('');

  sheet.getRange(hargaRowNum, 1, 1, totalCols).setValues([hargaRowValues])
    .setFontColor('#4b5563')
    .setHorizontalAlignment('center')
    .setNumberFormat('#,##0');

  // Baris TOTAL RUPIAH (totalnya)
  const rupiahRowValues = ['', 'totalnya', ''];
  for (let c = 0; c < reportData.columns.length; c++) {
    const colLetter = getColumnLetter(4 + c);
    rupiahRowValues.push(`=${colLetter}${totalRowNum}*${colLetter}${hargaRowNum}`);
  }
  rupiahRowValues.push('');
  // Grand Total Rupiah
  const firstProdCol = getColumnLetter(4);
  const lastProdCol = getColumnLetter(3 + reportData.columns.length);
  rupiahRowValues.push(`=SUM(${firstProdCol}${rupiahRowNum}:${lastProdCol}${rupiahRowNum})`);

  sheet.getRange(rupiahRowNum, 1, 1, totalCols).setValues([rupiahRowValues])
    .setFontWeight('bold')
    .setBackground('#fef3c7')
    .setFontColor('#9a3412')
    .setHorizontalAlignment('center')
    .setNumberFormat('"Rp" #,##0');

  // Beri Border Seluruh Tabel
  const fullTableRange = sheet.getRange(startRow, 1, (rupiahRowNum - startRow + 1), totalCols);
  fullTableRange.setBorder(true, true, true, true, true, true, '#d1d5db', SpreadsheetApp.BorderStyle.SOLID);

  // Auto-resize kolom, freeze baris 1 & kolom 1-3
  sheet.autoResizeColumns(1, totalCols);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(3);

  SpreadsheetApp.flush();
  return sheetName;
}

function getColumnLetter(colIndex) {
  let temp;
  let letter = '';
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = (colIndex - temp - 1) / 26;
  }
  return letter;
}
