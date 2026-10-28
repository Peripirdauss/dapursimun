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
  },

  async getDailyReport(date, pin = '') {
    if (CONFIG.API_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL") {
      return {
        success: true,
        date: date || new Date().toISOString().slice(0, 10),
        total_customers: 6,
        total_qty: 36,
        total_rupiah: 220000,
        columns: [
          { key: "tutut kuah|||pedas", header: "TUTUT KUAH PEDAS BKS", price: 8000, unit: "BKS" },
          { key: "tutut kuah|||original", header: "ORIGINAL BKS", price: 8000, unit: "BKS" },
          { key: "kue cuhcur|||", header: "CUHCUR BKS", price: 5000, unit: "BKS" },
          { key: "sate aci bumbu kacang|||", header: "SATE ACI BKS", price: 5000, unit: "BKS" },
          { key: "donat kampung|||coklat", header: "DONAT COKLAT PCS", price: 2000, unit: "PCS" },
          { key: "donat kampung|||stoberi", header: "STROBERI PCS", price: 2000, unit: "PCS" },
          { key: "donat kampung|||blubery", header: "BLUBERI PCS", price: 2000, unit: "PCS" },
          { key: "donat kampung|||polos", header: "POLOS PCS", price: 2000, unit: "PCS" },
          { key: "risol|||mayo", header: "RISOL MAYO PCS", price: 5000, unit: "PCS" },
          { key: "risol|||crabstik", header: "CRAB PCS", price: 5000, unit: "PCS" },
          { key: "risol|||sayur", header: "SAYUR PCS", price: 5000, unit: "PCS" },
          { key: "risol|||ayam pedas", header: "AYAM PCS", price: 5000, unit: "PCS" },
          { key: "risol|||matcha", header: "MATCHA PCS", price: 5000, unit: "PCS" }
        ],
        rows: [
          { no: 1, agency: "AREA BDG", show_agency: "AREA BDG", customer_name: "RANGGA MAHESA", notes: "", total_qty: 1, grand_total: 8000, items: { "kue cuhcur|||": 1 } },
          { no: 2, agency: "AREA BDG", show_agency: "", customer_name: "NAUFAL AZIZ", notes: "", total_qty: 2, grand_total: 10000, items: { "sate aci bumbu kacang|||": 2 } },
          { no: 3, agency: "AREA BDG", show_agency: "", customer_name: "TEH ITA", notes: "FROZEN", total_qty: 12, grand_total: 62000, items: { "tutut kuah|||original": 2, "kue cuhcur|||": 2, "risol|||mayo": 3, "risol|||crabstik": 2, "risol|||sayur": 2, "risol|||matcha": 1 } },
          { no: 4, agency: "RS MELINDA", show_agency: "RS MELINDA", customer_name: "dr. ANIN", notes: "", total_qty: 5, grand_total: 31000, items: { "tutut kuah|||pedas": 1, "tutut kuah|||original": 1, "risol|||mayo": 1, "risol|||crabstik": 1, "risol|||ayam pedas": 1 } },
          { no: 5, agency: "SMAN 14", show_agency: "SMAN 14", customer_name: "PAK RIDWAN", notes: "", total_qty: 4, grand_total: 20000, items: { "tutut kuah|||pedas": 1, "kue cuhcur|||": 2, "donat kampung|||coklat": 1 } },
          { no: 6, agency: "SMAN 14", show_agency: "", customer_name: "BU DIAN", notes: "FROZEN", total_qty: 4, grand_total: 20000, items: { "risol|||sayur": 2, "risol|||ayam pedas": 2 } }
        ],
        totals: {
          "tutut kuah|||pedas": 2,
          "tutut kuah|||original": 3,
          "kue cuhcur|||": 5,
          "sate aci bumbu kacang|||": 2,
          "donat kampung|||coklat": 1,
          "donat kampung|||stoberi": 0,
          "donat kampung|||blubery": 0,
          "donat kampung|||polos": 0,
          "risol|||mayo": 4,
          "risol|||crabstik": 3,
          "risol|||sayur": 4,
          "risol|||ayam pedas": 3,
          "risol|||matcha": 1
        },
        total_rupiah_per_col: {
          "tutut kuah|||pedas": 16000,
          "tutut kuah|||original": 24000,
          "kue cuhcur|||": 25000,
          "sate aci bumbu kacang|||": 10000,
          "donat kampung|||coklat": 2000,
          "donat kampung|||stoberi": 0,
          "donat kampung|||blubery": 0,
          "donat kampung|||polos": 0,
          "risol|||mayo": 20000,
          "risol|||crabstik": 15000,
          "risol|||sayur": 20000,
          "risol|||ayam pedas": 15000,
          "risol|||matcha": 5000
        }
      };
    }

    try {
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ 
          action: "getDailyReport", 
          date: date,
          pin: pin
        })
      });
      return await response.json();
    } catch (error) {
      console.error("Error fetching daily report:", error);
      return { success: false, message: "Koneksi bermasalah saat mengambil rekap." };
    }
  },

  async generateSheetReport(date, pin = '') {
    if (CONFIG.API_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL") {
      return { success: true, message: "Mock: Tab sheet berhasil digenerate!" };
    }

    try {
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ 
          action: "generateDailyReportSheet", 
          date: date,
          pin: pin
        })
      });
      return await response.json();
    } catch (error) {
      console.error("Error generating sheet report:", error);
      return { success: false, message: "Koneksi bermasalah saat membuat sheet." };
    }
  }
};
