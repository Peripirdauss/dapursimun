const Cart = {
  items: [],
  
  init() {
    const saved = localStorage.getItem('openpo_cart');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved); 
        this.items = Array.isArray(parsed) ? parsed : [];
      } catch (e) { this.items = []; }
    } else {
      this.items = [];
    }
  },
  
  save() {
    localStorage.setItem('openpo_cart', JSON.stringify(this.items));
    document.dispatchEvent(new Event('cartUpdated'));
  },
  
  add(product_id, name, price, unit, options = {}) {
    if (!Array.isArray(this.items)) this.items = [];
    
    const optStr = JSON.stringify(options);
    const existing = this.items.find(i => i.product_id === product_id && JSON.stringify(i.options) === optStr);
    
    if (existing) {
      existing.qty += 1;
    } else {
      this.items.push({ product_id, name, price, unit, options, qty: 1 });
    }
    
    this.save();
    showToast(`${name} berhasil ditambahkan!`);
  },
  
  updateQuantity(index, change) {
    if (this.items[index]) {
      this.items[index].qty += change;
      if (this.items[index].qty <= 0) {
        this.items.splice(index, 1);
      }
      this.save();
    }
  },
  
  clear() {
    this.items = [];
    this.save();
    showToast('Keranjang telah dikosongkan', true);
  },

  getSubtotal() {
    if (!Array.isArray(this.items)) return 0;
    return this.items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 1)), 0);
  },

  getTotalQty() {
    if (!Array.isArray(this.items)) return 0;
    return this.items.reduce((sum, item) => sum + Number(item.qty || 1), 0);
  }
};

Cart.init();
