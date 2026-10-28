let orderData = null;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('order');
  
  if (!orderId) {
    showError("Order ID tidak ditemukan.");
    return;
  }
  
  // 1. INSTANT LOCAL RENDER (0ms load time!)
  try {
    const cached = localStorage.getItem('openpo_order_' + orderId);
    if (cached) {
      orderData = JSON.parse(cached);
      renderInvoice();
      document.getElementById('loading-state').classList.add('hidden');
    }
  } catch (e) {
    console.warn("Error reading cached order:", e);
  }
  
  // 2. FETCH LATEST STATUS FROM API
  const res = await API.getInvoice(orderId);
  
  document.getElementById('loading-state').classList.add('hidden');
  
  if (res.success) {
    orderData = res.data;
    renderInvoice();
    try {
      localStorage.setItem('openpo_order_' + orderId, JSON.stringify(res.data));
    } catch(e) {}
  } else if (!orderData) {
    // Only show error if no cached data was rendered
    showError(res.message || "Gagal memuat invoice.");
  }
});

function showError(msg) {
  const errEl = document.getElementById('error-msg');
  errEl.textContent = msg;
  document.getElementById('error-state').classList.remove('hidden');
}

function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
}

function renderInvoice() {
  document.getElementById('invoice-wrapper').classList.remove('hidden');
  document.getElementById('invoice-wrapper').classList.add('flex');
  
  document.getElementById('receipt-id').textContent = orderData.order_id;

  const dateObj = new Date(orderData.timestamp);
  const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  document.getElementById('receipt-date').textContent = dateObj.toLocaleDateString('id-ID', options);
  
  document.getElementById('receipt-cust-name').textContent = orderData.customer_name || '-';
  document.getElementById('receipt-cust-agency').textContent = orderData.agency || '-';
  document.getElementById('receipt-cust-phone').textContent = orderData.whatsapp || '-';
  const statusEl = document.getElementById('receipt-status');
  const statusStr = (orderData.status || 'Pending').toUpperCase();
  
  // Remove existing stamp if re-rendering
  const existingStamp = document.getElementById('status-stamp');
  if (existingStamp) existingStamp.remove();

  const verifyCard = document.getElementById('verify-card');

  if (statusStr.includes('LUNAS') || statusStr.includes('PAID')) {
    statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-emerald-600 font-black"><i class="fa-solid fa-circle-check"></i> LUNAS</span>`;
    createStamp('LUNAS', 'border-emerald-500 text-emerald-500');
    if (verifyCard) verifyCard.classList.add('hidden');
  } else if (statusStr.includes('SELESAI') || statusStr.includes('CLOSE')) {
    statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-emerald-600 font-black"><i class="fa-solid fa-box-open"></i> SELESAI</span>`;
    createStamp('SELESAI', 'border-emerald-500 text-emerald-500');
    if (verifyCard) verifyCard.classList.add('hidden');
  } else if (statusStr.includes('PROSES')) {
    statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-blue-600 font-black"><i class="fa-solid fa-fire-burner"></i> DIPROSES</span>`;
    createStamp('DIPROSES', 'border-blue-500 text-blue-500');
    if (verifyCard) {
      verifyCard.classList.remove('hidden');
    }
  } else if (statusStr.includes('BATAL') || statusStr.includes('CANCEL')) {
    statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-red-600 font-black"><i class="fa-solid fa-circle-xmark"></i> BATAL</span>`;
    createStamp('BATAL', 'border-red-500 text-red-500');
    if (verifyCard) verifyCard.classList.add('hidden');
  } else {
    statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-amber-600 font-black"><i class="fa-solid fa-clock"></i> MENUNGGU VERIFIKASI</span>`;
    if (verifyCard) verifyCard.classList.remove('hidden');
  }
  
  const itemsEl = document.getElementById('receipt-items-body');
  itemsEl.innerHTML = '';
  
  orderData.items.forEach(item => {
    const el = document.createElement('tr');
    el.innerHTML = `
      <td class="py-2.5 pr-2">
        <span class="font-bold">${item.item_name}</span><br>
        ${item.options ? `<span class="text-[10px] text-gray-500">${item.options}</span>` : ''}
      </td>
      <td class="py-2.5 px-2 text-center font-bold">${item.quantity}</td>
      <td class="py-2.5 pl-2 text-right font-extrabold">${formatRupiah(item.subtotal)}</td>
    `;
    itemsEl.appendChild(el);
  });
  
  document.getElementById('receipt-subtotal').textContent = formatRupiah(orderData.subtotal);
  document.getElementById('receipt-fee').textContent = formatRupiah(orderData.service_fee || 0);
  document.getElementById('receipt-grand-total').textContent = formatRupiah(orderData.total);
}

function createStamp(text, colorClasses) {
  const stamp = document.createElement('div');
  stamp.id = 'status-stamp';
  stamp.className = `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 border-4 ${colorClasses} font-black text-4xl md:text-5xl px-6 py-2 opacity-20 pointer-events-none rounded-2xl tracking-widest z-0 select-none uppercase`;
  stamp.innerText = text;
  document.getElementById('printable-receipt').appendChild(stamp);
}

async function downloadReceiptImage() {
  const btn = document.getElementById('btn-download');
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-lg"></i> Menyimpan...';
  btn.disabled = true;
  
  try {
    const element = document.getElementById('printable-receipt');
    const canvas = await html2canvas(element, {
      scale: 3, // High Res
      backgroundColor: "#FFFFFF",
      useCORS: true
    });
    
    const image = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.href = image;
    link.download = `Struk_${orderData.order_id}.png`;
    link.click();
  } catch (err) {
    console.error("Error generating image:", err);
    alert("Gagal menyimpan invoice.");
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
}

function sendToWhatsApp() {
  let itemsText = orderData.items.map(i => `- ${i.quantity}x ${i.item_name} ${i.options ? `(${i.options})` : ''}`).join('%0A');
  
  let text = `*PESANAN PO - DAPUR SIMUN*%0A` +
             `Order ID: *${orderData.order_id}*%0A` +
             `Nama: ${orderData.customer_name}%0A` +
             `Instansi: ${orderData.agency || '-'}%0A%0A` +
             `*Pesanan:*%0A${itemsText}%0A%0A` +
             `*Total Bayar: ${formatRupiah(orderData.total)}*%0A%0A` +
             `Status Saat Ini: ${orderData.status}%0A` +
             `Mohon konfirmasinya. Terima kasih!`;
             
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

async function submitPinVerification() {
  const pinInput = document.getElementById('input-pin');
  const pin = pinInput ? pinInput.value.trim() : '';
  if (!pin) {
    alert("Silakan masukkan PIN dari Admin.");
    if (pinInput) pinInput.focus();
    return;
  }

  const btn = document.getElementById('btn-verify');
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Cek...';
  btn.disabled = true;

  try {
    // We omit targetStatus, so backend handles the auto-progression (Pending -> Diproses -> Selesai)
    const res = await API.verifyPin(orderData.order_id, pin, '');
    if (res.success) {
      alert("🎉 " + res.message);
      window.location.reload();
    } else {
      alert("❌ " + res.message);
    }
  } catch (err) {
    console.error("Error verifying pin:", err);
    alert("Terjadi masalah saat verifikasi PIN.");
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
}
