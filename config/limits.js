// Batas kuantitas pengadaan (anti-freeze halaman Penerimaan & Labeling).
// Setiap unit Inventaris menjadi 1 aset berlabel + 1 QR pada langkah registrasi,
// sehingga kuantitas Inventaris dibatasi ketat. BHP hanya menambah angka stok
// (tidak dilabeli per unit) sehingga batasnya lebih longgar.
// Dipakai server (controllers/kalabController.js) sekaligus diteruskan ke view
// agar validasi client & server memakai angka yang sama.
module.exports = {
    MAX_QTY_INVENTARIS: 100, // maksimum per baris barang Inventaris
    MAX_QTY_BHP: 500,        // maksimum per baris barang BHP
    MAX_TOTAL_UNITS: 500     // maksimum total seluruh unit (Xb+Yb+Xp+Yp) per draf
};
