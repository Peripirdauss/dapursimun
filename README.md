# Open PO Ordering System

Sistem pemesanan Open PO ringan berbasis HTML, CSS, Vanilla JS, dan Google Sheets.

## Fitur
- 📱 Mobile-first & Sangat Ringan
- 🛒 Cart System
- 📝 Auto Kalkulasi
- 🧾 Auto Invoice Generator (Privat untuk masing-masing pembeli)
- 🖼️ Export Invoice ke PNG
- 🗄️ Google Sheets sebagai Database & Backend
- 📊 **Rekap Harian PO di Google Sheets (Privat Penjual)**: Otomatis tersusun di Google Spreadsheet per hari, dikelompokkan per lokasi/instansi & varian menu dengan rumus hitung otomatis.

## Rekap Pesanan Harian (Khusus Internal Penjual di Google Sheets)
Rekapan pesanan **tidak ditampilkan di website umum** demi menjaga privasi data pelanggan (nama, nomor kantor, dan rincian pesanan). Rekapan harian sepenuhnya berada di **Google Spreadsheet Anda**:

1. **Otomatis Saat Order Masuk:**
   Setiap kali ada pesanan masuk dari website, Google Apps Script otomatis membuat atau memperbarui tab sheet untuk hari tersebut (contoh: tab `PO 2026-10-28`).
2. **Menu Manual di Spreadsheet:**
   - Di menu bar atas Google Sheets, klik **🍱 DAPUR SIMUN**.
   - Pilih **📊 Buat Rekap Harian (Hari Ini)** atau **📅 Buat Rekap Harian (Pilih Tanggal)...**.
3. **Format Rekap di Spreadsheet:**
   - Dimulai langsung dari Baris 1: `DATA PELANGGAN NO`, `LOKASI`, `NAMA`, [Kolom-kolom Menu], `KET`, `JUMLAH SELURUHNYA`.
   - Dikelompokkan per Lokasi/Instansi pengantaran.
   - Baris bawah: Rumus `=SUM()` jumlah item, Harga Satuan, dan Total Omset (Rupiah).

## Cara Instalasi & Deploy

### STEP 1: Buat Database di Google Sheets
1. Buat spreadsheet baru di Google Sheets.
2. Buat 3 Sheet dengan nama persis: `PRODUCTS`, `ORDERS`, `ORDER_ITEMS`.

### STEP 2: Masukkan Header & Data Produk
**Sheet PRODUCTS (Baris 1 harus persis seperti ini):**
`product_id` | `product_name` | `description` | `price` | `available` | `sort_order`
--- | --- | --- | --- | --- | ---
P001 | Risol Mayo | Risol isi mayo | 10000 | TRUE | 1
P002 | Brownies | Brownies coklat lumer | 25000 | TRUE | 2

**Sheet ORDERS (Baris 1 harus persis seperti ini):**
`order_id` | `timestamp` | `customer_name` | `whatsapp` | `total_qty` | `subtotal` | `total` | `notes` | `status`

**Sheet ORDER_ITEMS (Baris 1 harus persis seperti ini):**
`order_id` | `product_id` | `product_name` | `price` | `quantity` | `subtotal`

### STEP 3: Setup Google Apps Script (Backend)
1. Di Spreadsheet, buka menu **Extensions** > **Apps Script**.
2. Hapus semua kode bawaan, lalu paste kode dari file `google-apps-script/Code.gs`.
3. Klik tombol Save (Simpan).
4. Klik tombol **Deploy** di kanan atas > **New deployment**.
5. Pilih type **Web App**.
6. Setel:
   - Description: (Isi bebas, misal: API v1)
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Klik Deploy. (Beri izin otorisasi jika diminta, klik Advance > Go to Project).
8. **Copy URL Web App** yang muncul.

### STEP 4: Setup Frontend
1. Buka file `assets/js/config.js`.
2. Ganti nilai `API_URL` dengan URL Web App yang sudah dicopy tadi.
   ```javascript
   const CONFIG = {
     API_URL: "https://script.google.com/macros/s/xyz.../exec"
   };
   ```

### STEP 5: Deploy ke Vercel (Rekomendasi) atau Netlify

#### Pilihan A: Deploy ke Vercel via GitHub (Paling Mudah & Otomatis)
1. Upload folder project ini ke repository **GitHub** Anda.
2. Buka dashboard [Vercel](https://vercel.com) lalu login.
3. Klik tombol **"Add New..."** > **"Project"**.
4. Pilih repository GitHub Anda, lalu klik **"Import"**.
5. Pada bagian **Framework Preset**, biarkan **"Other"** (karena ini pure web statis).
6. Klik **"Deploy"**.
7. Dalam beberapa detik, website Anda sudah aktif dengan domain gratis (contoh: `dapur-simun.vercel.app`)!

#### Pilihan B: Deploy ke Vercel via Vercel CLI (Langsung dari Komputer)
1. Buka terminal di folder project ini:
   ```bash
   npx vercel
   ```
2. Ikuti instruksi di terminal (login, tekan enter untuk memilih pengaturan default).
3. Untuk deploy ke production:
   ```bash
   npx vercel --prod
   ```

#### Pilihan C: Deploy ke Netlify (Drag & Drop)
1. Buka Netlify (https://app.netlify.com).
2. Tambahkan site baru (Add new site > Deploy manually).
3. Drag & drop seluruh folder proyek ini ke area upload Netlify.
4. Selesai! Website siap digunakan.

## Cara Mengelola Data
- **Menambah Produk:** Tambahkan baris baru di sheet PRODUCTS. Pastikan `available` diisi `TRUE`.
- **Menghapus Sementara/Habis:** Ubah `available` menjadi `FALSE` di sheet PRODUCTS.
- **Mengubah Harga:** Ubah kolom `price`. Order baru akan otomatis menggunakan harga baru (dihitung di server/spreadsheet, aman dari manipulasi frontend).
- **Melihat Pesanan:** Buka sheet ORDERS dan ORDER_ITEMS.

## Troubleshooting
- Jika pesanan gagal terkirim, pastikan permission Google Apps Script diset ke "Anyone".
- Pastikan nama Sheet persis `PRODUCTS`, `ORDERS`, dan `ORDER_ITEMS`.
