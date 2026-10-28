const SERVICE_FEE = 1000;
let productsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  document.addEventListener('cartUpdated', renderCart);
  document.addEventListener('productsRefreshed', (e) => {
    if (e.detail && e.detail.success && JSON.stringify(e.detail.data) !== JSON.stringify(productsData)) {
      productsData = e.detail.data;
      renderProducts();
    }
  });
  renderCart();
  await loadProducts();
});

function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').innerText = message;
  document.getElementById('toast-icon').className = isError ? "fa-solid fa-circle-exclamation text-red-400 text-lg" : "fa-solid fa-circle-check text-emerald-400 text-lg";
  toast.classList.remove('-translate-y-24', 'opacity-0');
  setTimeout(() => toast.classList.add('-translate-y-24', 'opacity-0'), 3000);
}

function scrollToCart() {
  const el = document.getElementById('cart-card');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function renderSkeleton() {
  return `
    <div class="space-y-4">
      ${[1, 2, 3].map(() => `
        <div class="border border-orange-100/60 rounded-2xl p-4 sm:p-5 bg-white/70 shadow-sm animate-pulse">
          <div class="flex justify-between items-start mb-3">
            <div class="space-y-2 flex-1">
              <div class="h-5 bg-orange-100/70 rounded-md w-2/5"></div>
              <div class="h-3 bg-gray-200/80 rounded-md w-3/5"></div>
            </div>
            <div class="h-6 bg-orange-100/80 rounded-md w-24"></div>
          </div>
          <div class="mt-4 pt-3 border-t border-dashed border-gray-100 space-y-3">
            <div class="h-9 bg-gray-100 rounded-xl w-full"></div>
            <div class="h-10 bg-orange-200/60 rounded-xl w-full"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function loadProducts() {
  const container = document.getElementById('products-container');
  // Render clean skeleton placeholder immediately
  container.innerHTML = renderSkeleton();

  const res = await API.getProducts();
  if (res.success && res.data && res.data.length > 0) {
    productsData = res.data;
    renderProducts();
  } else {
    // If empty or initial fetch fails, use fallback products gracefully
    productsData = [
      { product_id: "P001", product_name: "Tutut Kuah", unit: "bks", description: "Gurih & Berbumbu", price: 10000, variants: "Rasa: Pedas, Original", available: true, sort_order: 1 },
      { product_id: "P002", product_name: "Risol", unit: "pcs", description: "Renyah & Beragam Isian", price: 5000, variants: "Rasa: Ayam Pedas, Crabstik, Mayo, Sayur, Matcha, Coklat, Seblak Jadul; Penyajian: Goreng, Frozen", available: true, sort_order: 2 },
      { product_id: "P003", product_name: "Donat Kampung", unit: "pcs", description: "Empuk & Manis Pas", price: 2000, variants: "Topping: Coklat, Blubery, Stoberi, Polos", available: true, sort_order: 3 },
      { product_id: "P004", product_name: "Kue Cuhcur", unit: "pcs", description: "Manis Gula Merah Original", price: 2000, variants: "", available: true, sort_order: 4 },
      { product_id: "P005", product_name: "Kue Bolen", unit: "pcs", description: "Lembut & Lumer", price: 3000, variants: "", available: true, sort_order: 5 },
      { product_id: "P006", product_name: "Sate Aci Bumbu Kacang", unit: "4 tsk", description: "Kenyal & Bumbu Kacang Mantap", price: 5000, variants: "", available: true, sort_order: 6 },
    ];
    renderProducts();
  }
}

function renderProducts() {
  const container = document.getElementById('products-container');
  container.innerHTML = '';

  if (productsData.length === 0) {
    container.innerHTML = `<div class="p-5 text-center text-gray-500 font-bold bg-gray-50 rounded-xl">Belum ada menu yang ditambahkan.</div>`;
    return;
  }

  productsData.forEach(product => {
    // Parsing Variants
    // variants string format: "Rasa: Pedas, Original; Penyajian: Goreng, Frozen"
    let variantsHtml = '';
    const variantSelectIds = [];
    
    if (product.variants && product.variants.trim() !== "") {
      const variantGroups = product.variants.split(';').map(v => v.trim()).filter(v => v);
      
      const isMulti = variantGroups.length > 1;
      const gridClass = isMulti ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 w-full sm:w-auto flex-1';
      
      variantsHtml += `<div class="mt-3.5 ${isMulti ? 'grid gap-3' : 'flex flex-wrap sm:flex-nowrap items-end justify-between gap-3'} ${gridClass}">`;
      
      variantGroups.forEach((group, idx) => {
        const parts = group.split(':');
        if (parts.length === 2) {
          const groupName = parts[0].trim();
          const options = parts[1].split(',').map(o => o.trim()).filter(o => o);
          const selectId = `variant-${product.product_id}-${idx}`;
          variantSelectIds.push({ id: selectId, name: groupName });
          
          let optionsHtml = options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
          
          variantsHtml += `
            <div class="${!isMulti ? 'w-full' : ''}">
                <label class="text-[10px] font-extrabold text-gray-500 block mb-1 tracking-wider uppercase">${groupName}:</label>
                <select id="${selectId}" class="w-full text-sm bg-white border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none font-semibold text-gray-700 shadow-sm cursor-pointer">
                    ${optionsHtml}
                </select>
            </div>
          `;
        }
      });
      
      if (isMulti) {
        variantsHtml += `</div><div class="mt-4 flex justify-end">`;
      }
    } else {
      variantsHtml += `<div class="mt-3.5 flex items-center justify-end">`;
    }

    const isSoldOut = !product.available;
    const cardClass = isSoldOut ? 'opacity-60 bg-gray-100' : 'bg-amber-50/30 hover:border-orange-200';
    const badgeHtml = isSoldOut ? `
      <div class="absolute top-2 right-2 bg-red-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider z-10 shadow-sm">
        <i class="fa-solid fa-ban mr-1"></i> Sold Out
      </div>
    ` : '';
    
    const btnHtml = `
      <button onclick="addToCartHandler('${product.product_id}')" ${isSoldOut ? 'disabled' : ''}
          class="${product.variants && product.variants.split(';').length > 1 ? 'w-full sm:w-auto' : 'w-full sm:w-auto'} bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed">
          ${isSoldOut ? 'HABIS' : '<i class="fa-solid fa-plus text-xs"></i> Tambah'}
      </button>
    </div>`;

    const productHtml = `
      <div class="p-4 border border-gray-100 rounded-xl transition relative overflow-hidden group ${cardClass}">
          ${badgeHtml}
          <div class="flex justify-between items-start mb-2">
              <div>
                  <h3 class="font-extrabold text-gray-800 text-base">${product.product_name}</h3>
                  <p class="text-xs text-gray-500 mt-0.5">${product.description}</p>
              </div>
              <span class="font-extrabold text-orange-600 text-[15px] whitespace-nowrap">${formatRupiah(product.price)}<span class="text-[10px] text-gray-400 font-semibold uppercase ml-0.5">/${product.unit}</span></span>
          </div>
          ${variantsHtml}
          ${btnHtml}
      </div>
    `;

    container.insertAdjacentHTML('beforeend', productHtml);
    
    // Store metadata for the addToCartHandler
    window[`product_meta_${product.product_id}`] = {
      product: product,
      variantSelectIds: variantSelectIds
    };
  });
}

window.addToCartHandler = function(productId) {
  const meta = window[`product_meta_${productId}`];
  if (!meta) return;
  
  const options = {};
  meta.variantSelectIds.forEach(v => {
    const el = document.getElementById(v.id);
    if (el) options[v.name] = el.value;
  });
  
  Cart.add(meta.product.product_id, meta.product.product_name, meta.product.price, meta.product.unit, options);
}

function renderCart() {
  const items = Cart.items;
  let totalItems = 0;
  let subtotalPrice = 0;

  for (let i = 0; i < items.length; i++) {
    totalItems += items[i].qty;
    subtotalPrice += (items[i].price * items[i].qty);
  }

  const totalPrice = subtotalPrice + (items.length > 0 ? SERVICE_FEE : 0);

  document.getElementById('cart-count-badge').innerText = `${totalItems} Item`;
  document.getElementById('cart-subtotal-price').innerText = formatRupiah(subtotalPrice);
  document.getElementById('cart-total-price').innerText = formatRupiah(totalPrice);

  const emptyMsg = document.getElementById('empty-cart-msg');
  const cartContainer = document.getElementById('cart-items-container');
  const cartFooter = document.getElementById('cart-footer');
  const mobileBar = document.getElementById('mobile-cart-bar');

  if (items.length === 0) {
    emptyMsg.classList.remove('hidden');
    cartContainer.classList.add('hidden');
    cartFooter.classList.add('hidden');
    if (mobileBar) {
      mobileBar.classList.add('translate-y-32', 'opacity-0', 'pointer-events-none');
      mobileBar.classList.remove('translate-y-0', 'opacity-100');
    }
  } else {
    emptyMsg.classList.add('hidden');
    cartContainer.classList.remove('hidden');
    cartFooter.classList.remove('hidden');
    if (mobileBar) {
      document.getElementById('mobile-bar-count').innerText = `${totalItems} Item`;
      document.getElementById('mobile-bar-total').innerText = formatRupiah(totalPrice);
      mobileBar.classList.remove('translate-y-32', 'opacity-0', 'pointer-events-none');
      mobileBar.classList.add('translate-y-0', 'opacity-100');
    }

    let html = '';
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const optVals = [];
      for (let k in item.options) { optVals.push(item.options[k]); }
      const optDisplay = optVals.join(' • ');

      html += `
        <div class="flex items-center justify-between p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-sm shadow-sm transition hover:shadow-md">
          <div class="flex-1 pr-3">
            <h4 class="font-extrabold text-gray-800">${item.name}</h4>
            ${optDisplay ? `<p class="text-[11px] text-amber-700 font-bold mt-0.5">${optDisplay}</p>` : ''}
            <span class="text-gray-500 text-[11px] font-medium">${formatRupiah(item.price)} / ${item.unit}</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <button onclick="Cart.updateQuantity(${i}, -1)" class="w-7 h-7 flex items-center justify-center bg-gray-50 hover:bg-gray-100 font-bold text-gray-600 transition">-</button>
              <span class="w-6 text-center font-bold text-xs">${item.qty}</span>
              <button onclick="Cart.updateQuantity(${i}, 1)" class="w-7 h-7 flex items-center justify-center bg-gray-50 hover:bg-gray-100 font-bold text-gray-600 transition">+</button>
            </div>
            <span class="font-extrabold text-orange-600 text-sm w-16 text-right">${formatRupiah(item.price * item.qty)}</span>
          </div>
        </div>
      `;
    }
    cartContainer.innerHTML = html;
  }
}

async function processOrder() {
  const nameInput = document.getElementById('cust-name');
  const agencyInput = document.getElementById('cust-agency');
  const phoneInput = document.getElementById('cust-phone');
  
  if (!nameInput.checkValidity() || !agencyInput.checkValidity()) {
    showToast('Mohon isi Nama & Instansi (Wajib)!', true);
    nameInput.reportValidity();
    return;
  }

  const name = nameInput.value.trim();
  const agency = agencyInput.value.trim();
  let whatsapp = phoneInput.value.trim();

  if (whatsapp) {
    whatsapp = whatsapp.replace(/\D/g, '');
    if (whatsapp.startsWith('0')) whatsapp = '62' + whatsapp.substring(1);
  }

  const btn = document.getElementById('btn-review');
  const err = document.getElementById('submit-error');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-base"></i> Memproses...';
  err.classList.add('hidden');

  const orderData = {
    customer: { name, agency, whatsapp },
    service_fee: SERVICE_FEE,
    items: Cart.items
  };

  const res = await API.createOrder(orderData);

  if (res.success) {
    // SAVE CACHE FOR INSTANT INVOICE RENDERING
    try {
      const invoicePayload = {
        order_id: res.order_id,
        timestamp: new Date().toISOString(),
        customer_name: name,
        agency: agency,
        whatsapp: whatsapp,
        subtotal: Cart.getSubtotal(),
        service_fee: SERVICE_FEE,
        total: Cart.getSubtotal() + SERVICE_FEE,
        status: 'Pending',
        items: Cart.items.map(item => ({
          item_name: item.name,
          options: item.optionsText || '',
          price: item.price,
          quantity: item.qty,
          subtotal: item.price * item.qty
        }))
      };
      localStorage.setItem('openpo_order_' + res.order_id, JSON.stringify(invoicePayload));
    } catch(e) {}

    Cart.clear();
    showToast("Pesanan berhasil dibuat!");
    setTimeout(() => {
      window.location.href = `invoice.html?order=${res.order_id}`;
    }, 500);
  } else {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane text-base"></i> Proses Pesanan';
    err.textContent = res.message || "Gagal memproses pesanan.";
    err.classList.remove('hidden');
    showToast("Gagal memproses pesanan", true);
  }
}
