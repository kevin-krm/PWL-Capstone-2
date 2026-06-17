# PWL-Capstone-2

## Capstone Lab Inventory System

Sistem inventaris laboratorium berbasis web yang dibangun menggunakan kombinasi `Node.js (Full stack, Pug) + MySQL.`

## Tujuan Proyek

- Melakukan digitalisasi aset laboratorium (inventaris) dan barang habis pakai (BHP).
- Menyediakan sistem pengajuan pengadaan aset dan BHP.
- Melakukan pelacakan dari siklus barang (pengadaan, pemeliharaan, penggantian/ penghapusan).

## Fitur per Role

1. Administrator
- Mengelola data pengguna.
- Mengelola data ruangan.

2. Kepala Laboratorium
- Membuat draf pengadaan barang (tahunan). Draf ini membuat data inventaris dan BHP yang akan dibeli. Data-data yang dicantumkan seperti nama barang, harga, jumlah barang, dan link pembelian. Terdapat opsi untuk menambahkan barang inventaris yang akan digantikan dengan pembelian ini.
- Melihat draf pengadaan barang yang pernah diajukan. Jika draf sudah berstatus locked, maka data tidak dapat diganti.

3. Ketua Program Studi
- Melakukan review draf pengadaan barang dari kepala laboratorium.
- Kaprodi dapat memilih barang mana yang disetujui atau ditolak pengadaannya.
- Finalisasi draf pengadaan barang. Setelah melakukan finalisasi maka draf sudah tidak dapat diubah.

4. Staf Administrasi
- Melihat draf pengadaan barang yang telah disetujui oleh ketua program studi.
- Melakukan update inventaris misal dengan memberikan penomoran label dan foto QR/ Barcode
- Melakukan input tanggal penerimaan barang (Barang yang dibeli bisa datang tidak secara bersamaan).

5. Staf Laboratorium
- Mengelola stok BHP.
- Melakukan log maintenance dan update kondisi barang inventaris. Jika selama proses maintenance ada BHP yang digunakan, maka stok dalam sistem juga harus berkurang.

#### Ketentuan aplikasi dan basis data
Aplikasi yang dibuat menggunakan kombinasi berikut
- Node.js (Full stack, Pug) + MySQL

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

### 3. Bila diperlukan, Install Dependency berikut

```bash
# Install library utama stack spesifik untuk aplikasi Node.js
npm install express pug mysql2 express-session body-parser

# Library lainnya
npm install nodemon
npm install qrcode
npm install bcryptjs
```

### 4. Setup Database

Create/Import file `capstone_lab_inventory.sql` ke MySQL Workbench dan phpMyAdmin

### 5. Konfigurasi Environment (`.env`)
Pastikan Anda memiliki file `.env` di root direktori project. Sesuaikan isi file `.env` tersebut dengan kredensial database lokal Anda (host, user, password, nama database).
```
PORT=3000

DB_HOST=localhost
DB_USER=username
DB_PASSWORD=password
DB_NAME=database_name
DB

SESSION_SECRET=capstone_secret_key_123
```

### 6. Menjalankan Server
Setelah semua langkah di atas selesai, Anda dapat menjalankan server dengan perintah:

```bash
# Menggunakan Node biasa
node app.js 

# ATAU menggunakan Nodemon agar server otomatis restart jika ada perubahan file
npx nodemon app.js
```

Aplikasi dapat diakses melalui browser di `http://localhost:3000`.

> Note: Untuk development server ini, semua role memiliki password default: `hashpassword123`. Dan semua password telah di hash menggunakan bcryptjs