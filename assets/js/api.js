const API = {
  async getProducts() {
    if (CONFIG.API_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL") {
      console.warn("Using mock data for products.");
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            success: true,
            data: [
              { product_id: "P001", product_name: "Tutut Kuah", unit: "bks", description: "Gurih & Berbumbu", price: 10000, variants: "Rasa: Pedas, Original", available: true, sort_order: 1 },
              { product_id: "P002", product_name: "Risol", unit: "pcs", description: "Renyah & Beragam Isian", price: 5000, variants: "Rasa: Ayam Pedas, Crabstik, Mayo, Sayur, Matcha, Coklat, Seblak Jadul; Penyajian: Goreng, Frozen", available: true, sort_order: 2 },
              { product_id: "P003", product_name: "Donat Kampung", unit: "pcs", description: "Empuk & Manis Pas", price: 2000, variants: "Topping: Coklat, Blubery, Stoberi, Polos", available: true, sort_order: 3 },
              { product_id: "P004", product_name: "Kue Cuhcur", unit: "pcs", description: "Manis Gula Merah Original", price: 2000, variants: "", available: true, sort_order: 4 },
              { product_id: "P005", product_name: "Kue Bolen", unit: "pcs", description: "Lembut & Lumer", price: 3000, variants: "", available: true, sort_order: 5 },
              { product_id: "P006", product_name: "Sate Aci Bumbu Kacang", unit: "4 tsk", description: "Kenyal & Bumbu Kacang Mantap", price: 5000, variants: "", available: false, sort_order: 6 },
            ]
          });
        }, 800); // Simulate network delay
      });
    }

    try {
      const cached = localStorage.getItem('openpo_cache_products');
      if (cached) {
        setTimeout(() => API.refreshProductsInBackground(), 0);
        return JSON.parse(cached);
      }
      return await API.refreshProductsInBackground();
    } catch (error) {
      console.error("Error fetching products:", error);
      return { success: false, message: "Koneksi bermasalah." };
    }
  },

  async refreshProductsInBackground() {
    try {
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "getProducts" })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('openpo_cache_products', JSON.stringify(data));
        // If the UI is already rendered, we dispatch an event to update silently
        document.dispatchEvent(new CustomEvent('productsRefreshed', { detail: data }));
      }
      return data;
    } catch (e) {
      console.error("Background fetch failed", e);
      return { success: false, message: "Koneksi bermasalah" };
    }
  },

  async createOrder(orderData) {
    if (CONFIG.API_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL") {
      console.warn("Using mock data for createOrder.");
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            success: true,
            order_id: `PO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-MOCK`,
            total: orderData.items.reduce((sum, item) => sum + (item.price * item.qty), 0) + (orderData.service_fee || 0)
          });
        }, 1500); 
      });
    }

    try {
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "createOrder",
          ...orderData
        })
      });
      return await response.json();
    } catch (error) {
      console.error("Error creating order:", error);
      return { success: false, message: "Koneksi bermasalah." };
    }
  },

  async getInvoice(orderId) {
    if (CONFIG.API_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL") {
      console.warn("Using mock data for invoice.");
      return {
        success: true,
        data: {
          order_id: orderId,
          timestamp: new Date().toISOString(),
          customer_name: "Customer (Mock)",
          agency: "Instansi Mock",
          whatsapp: "08123456789",
          subtotal: 15000,
          service_fee: 1000,
          total: 16000,
          status: "Pending",
          items: [
            { item_name: "Tutut Kuah", options: "Rasa: Pedas", quantity: 1, price: 10000, subtotal: 10000 },
            { item_name: "Risol", options: "Rasa: Ayam Pedas, Penyajian: Goreng", quantity: 1, price: 5000, subtotal: 5000 }
          ]
        }
      };
    }

    try {
      // USE POST TO BYPASS GOOGLE MULTI-ACCOUNT 404 BUG!
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "getInvoice", order_id: orderId })
      });
      return await response.json();
    } catch (error) {
      console.error("Error fetching invoice via POST:", error);
      return { success: false, message: "Koneksi bermasalah." };
    }
  },

  async updateOrderStatus(orderId, status, pin) {
    if (CONFIG.API_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL") {
      return { success: true, message: "Mock: Status diubah menjadi " + status };
    }

    try {
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ 
          action: "updateOrderStatus", 
          order_id: orderId, 
          status: status, 
          pin: pin 
        })
      });
      return await response.json();
    } catch (error) {
      console.error("Error updating order status:", error);
      return { success: false, message: "Koneksi bermasalah." };
    }
  },

  async verifyPin(orderId, pin, targetStatus) {
    if (CONFIG.API_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL") {
      return { success: true, message: "Mock: PIN Diverifikasi!", new_status: targetStatus };
    }

    try {
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ 
          action: "verifyPin", 
          order_id: orderId, 
          pin: pin,
          target_status: targetStatus
        })
      });
      return await response.json();
    } catch (error) {
      console.error("Error verifying pin:", error);
      return { success: false, message: "Koneksi bermasalah." };
    }
  }
};
