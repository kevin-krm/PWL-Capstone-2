# PWL-Capstone-2

## Capstone Lab Inventory System

Sistem inventaris laboratorium berbasis web yang dibangun menggunakan kombinasi Node.js (Full stack, Pug) + MySQL.

## Fitur Utama
- Melakukan digitalisasi aset laboratorium (inventaris) dan barang habis pakai (BHP).
- Menyediakan sistem pengajuan pengadaan aset dan BHP.
- Melakukan pelacakan dari siklus barang (pengadaan, pemeliharaan, penggantian/ penghapusan).

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
Jalankan perintah-perintah berikut di terminal/command prompt pada direktori project Anda untuk menginstal semua library yang dibutuhkan:

**Install Library Utama:**
```bash
npm install express pug mysql2 express-session body-parser
```

**Install Nodemon (untuk kemudahan development):**
```bash
npm install nodemon
```

### 3. Setup Database

Create/Import file `capstone_lab_inventory.sql` ke MySQL Workbench dan phpMyAdmin

**Install Library Tambahan (QR Code & Hashing Password):**
```bash
npm install qrcode bcryptjs
```

### 3. Konfigurasi Environment (`.env`)
Pastikan Anda memiliki file `.env` di root direktori project. Sesuaikan isi file `.env` tersebut dengan kredensial database lokal Anda (host, user, password, nama database).

### 4. Menjalankan Server
Setelah semua langkah di atas selesai, Anda dapat menjalankan server dengan perintah:

```bash
# Menggunakan Node biasa
node app.js 

# ATAU menggunakan Nodemon agar server otomatis restart jika ada perubahan file
npx nodemon app.js
```

Aplikasi dapat diakses melalui browser di `http://localhost:3000`.