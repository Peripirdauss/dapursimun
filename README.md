# Open PO Ordering System

Sistem pemesanan Open PO ringan berbasis HTML, CSS, Vanilla JS, dan Google Sheets.

## Fitur
- 📱 Mobile-first & Sangat Ringan
- 🛒 Cart System
- 📝 Auto Kalkulasi
- 🧾 Auto Invoice Generator
- 🖼️ Export Invoice ke PNG
- 🗄️ Google Sheets sebagai Database & Backend
- 📊 **Rekap Harian PO (Daily Report Matrix)**: Matriks pesanan per lokasi/instansi & varian menu, checklist produksi dapur, serta export Excel/Print.

## Cara Menggunakan Rekap Harian (Daily Report)
Rekap harian dapat dicek melalui **2 Cara**:

### Cara 1: Melalui Halaman Web (`report.html`)
1. Buka halaman `report.html` di browser (atau klik tombol **"Rekap Harian PO"** di pojok kanan atas `index.html`).
2. Pilih tanggal pesanan yang ingin dicek menggunakan **Date Picker** (atau klik tombol *Hari Ini* / *Kemarin*).
3. Anda akan melihat:
   - **Kartu Statistik**: Total pemesan, total porsi produksi, dan estimasi omset.
   - **Matriks Rekap Pesanan**: Tabel per pemesan yang dikelompokkan berdasarkan Lokasi/Instansi, kolom varian menu, catatan (misal *FROZEN*), total per pemesan, serta baris *TOTAL*, *HARGA SATUAN*, dan *TOTAL RUPIAH*.
   - **Checklist Produksi Dapur**: Ringkasan jumlah tiap makanan yang harus dimasak tim dapur.
4. Fitur tombol:
   - 🖨️ **Cetak Format Dapur**: Mencetak format landscape siap pakai untuk dapur/kurir.
   - 📥 **Export Excel**: Mengunduh file `.csv` yang dapat langsung dibuka di Microsoft Excel.
   - 📊 **Buat di Google Sheets**: Otomatis membuat tab sheet baru di Google Spreadsheet Anda (misal `REKAP_2026-10-28`).

### Cara 2: Langsung di Google Spreadsheet
1. Buka Google Spreadsheet database pesanan Anda.
2. Di menu bar atas, klik menu **🍱 DAPUR SIMUN**.
3. Pilih salah satu:
   - **📊 Buat Rekap Harian (Hari Ini)**
   - **📅 Buat Rekap Harian (Pilih Tanggal)...** (masukkan tanggal `YYYY-MM-DD`).
4. Script akan otomatis menyusun tab sheet baru dengan format tabel, border, warna, rumus `=SUM()`, harga satuan, dan total rupiah persis seperti template matriks PO.

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
