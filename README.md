# PWL-Capstone-2

## Capstone Lab Inventory System

Sistem inventaris laboratorium berbasis web yang dibangun menggunakan kombinasi Node.js (Full stack, Pug) + MySQL.

## Tujuan Proyek

- Melakukan digitalisasi aset laboratorium (inventaris) dan barang habis pakai (BHP).
- Menyediakan sistem pengajuan pengadaan aset dan BHP.
- Melakukan pelacakan dari siklus barang (pengadaan, pemeliharaan, penggantian/ penghapusan).

## Fitur per Role

### 1. Administrator
* **Kelola Pengguna**: Operasi CRUD penuh untuk akun pengguna (`users`) termasuk penentuan peran (*role-based access control*).
* **Kelola Ruangan**: Operasi CRUD untuk data ruangan laboratorium (mendukung manajemen denah seperti 13 laboratorium aktif di gedung).

### 2. Kepala Laboratorium (Kalab)
* **Rancangan Tahunan**: Pembuatan draf pengadaan tahunan (`procurement_drafts`) yang berisi daftar barang belanja bersarang (`procurement_items`) beserta target harga, kuantitas, dan tautan referensi pembelian.
* **Opsi Penggantian Aset Lama**: Kemampuan menghubungkan item belanja baru dengan aset lama yang statusnya 'Rusak' sebagai target *replacement*.
* **Histori Pengajuan**: Melihat kembali rekam jejak draf yang pernah diajukan sebelumnya. Jika status draf di database telah dikunci (`Locked`), fitur modifikasi otomatis dinonaktifkan via middleware.

### 3. Ketua Program Studi (Kaprodi)
* **Review Pengadaan**: Meninjau draf yang diajukan oleh Kepala Laboratorium secara granular. Kaprodi berhak menyetujui (`Disetujui`) atau menolak (`Ditolak`) item secara satuan.
* **Finalisasi & Penguncian**: Mengunci draf yang telah disetujui. Setelah tombol "Finalisasi" ditekan, status berubah menjadi `Locked`, mengaktifkan visibilitas draf bagi Staf Administrasi.

### 4. Staf Administrasi (Penerimaan & Labeling)
* **Monitoring Hasil Review**: Melihat draf pengadaan tahunan yang sudah disetujui Kaprodi dan berstatus locked.
* **Pencatatan Kedatangan Parsial**: Menginput data penerimaan barang fisik ke tabel `item_receipts`. Sistem memiliki validasi ketat sehingga akumulasi kuantitas parsial yang datang tidak dapat melebihi total kuantitas yang disetujui.
* **Registrasi Aset & Auto-Generate Label**: Mendaftarkan barang inventaris resmi baru ke tabel `assets`, menyertakan input penomoran label manual atau menggunakan tombol otomatis (*Auto-Generate* dengan format: `INV-[ROOM]-[YEAR]-[INCREMENT]`).
* **Dynamic QR Code URL Rendering**: Sistem secara otomatis mengonversi string kode unik menjadi gambar QR Code berbasis **Base64 Data URL** melalui library `qrcode` yang disimpan ke database, lalu langsung merendernya secara visual pada antarmuka data inventaris.

### 5. Staf Laboratorium (Maintenance & Stok)
* **Manajemen Bahan (BHP)**: Mengelola penambahan dan monitoring sisa stok komoditas consumable (`consumables`).
* **Pencatatan Pemeliharaan Aset**: Membuat log perbaikan laboratorium (`maintenance_logs`) berdasarkan aset spesifik yang dipilih.
* **Logika Otomatisasi Pemotongan Stok (Auto-Deduct)**: Jika selama pemeliharaan aset terdapat penggunaan BHP (seperti pemasangan SSD baru atau pengolesan Thermal Paste), sistem secara terprogram merekam penggunaan tersebut ke `maintenance_bhp_usage` dan langsung memotong kuantitas stok di tabel `consumables` melalui mekanisme database aman.

## Panduan Setup Server

Ikuti langkah-langkah di bawah ini untuk mempersiapkan dan menjalankan aplikasi Capstone Lab Inventory di mesin lokal Anda.

### Prasyarat
- [Node.js](https://nodejs.org/) terinstal
- MySQL Workbench atau bisa menggunakan XAMPP phpmyadmin

### 1. Inisialisasi Project (Opsional)
Jika Anda baru memulai dari awal dan belum memiliki `package.json`, jalankan perintah berikut:
```bash
npm init -y
```

### 2. Instalasi Library dan Dependencies
Karena daftar library (seperti Express, MySQL2, Nodemon, dll) sudah terdaftar di `package.json` dan `package-lock.json`, Anda hanya perlu menjalankan perintah berikut di terminal/command prompt pada direktori project Anda untuk menginstal semua dependency secara otomatis:

```bash
npm install
```

### 3. install stack spesifik untuk aplikasi Node.js

```bash
# Install library utama
npm install express pug mysql2 express-session body-parser
```

### 4. Install Dependency lainnya

```bash
npm install nodemon
npm install qrcode
npm install bcryptjs
```

### 5. Setup Database

Create/Import file `capstone_lab_inventory.sql` ke MySQL Workbench dan phpMyAdmin

### 6. Konfigurasi Environment (`.env`)
Pastikan Anda memiliki file `.env` di root direktori project. Sesuaikan isi file `.env` tersebut dengan kredensial database lokal Anda (host, user, password, nama database).
```
PORT=3000

DB_HOST=localhost
DB_USER=username
DB_PASSWORD=password
DB_NAME=database_name
DB

SESSION_SECRET=key_for_sessions
```

### 7. Menjalankan Server
Setelah semua langkah di atas selesai, Anda dapat menjalankan server dengan perintah:

```bash
# Menggunakan Node biasa
node app.js 

# ATAU menggunakan Nodemon agar server otomatis restart jika ada perubahan file
npx nodemon app.js
```

Aplikasi dapat diakses melalui browser di `http://localhost:3000`.