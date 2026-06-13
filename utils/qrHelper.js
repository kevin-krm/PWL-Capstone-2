const QRCode = require('qrcode');
const db = require('../config/database');

async function autoGenerateMissingQRCodes() {
    const pool = db.promise();
    try {
        // Cari aset yang memiliki label tetapi qr_code_url bernilai NULL atau string kosong
        const [rows] = await pool.query(
            "SELECT id, label_code FROM assets WHERE label_code IS NOT NULL AND label_code <> '' AND (qr_code_url IS NULL OR qr_code_url = '')"
        );

        if (rows.length > 0) {
            console.log(`[QR-Helper] Mendeteksi ${rows.length} aset tanpa QR Code. Memulai proses generate otomatis...`);
            for (const row of rows) {
                const qrCodeUrl = await QRCode.toDataURL(row.label_code);
                await pool.query(
                    "UPDATE assets SET qr_code_url = ? WHERE id = ?",
                    [qrCodeUrl, row.id]
                );
            }
            console.log(`[QR-Helper] Berhasil menghasilkan QR Code untuk ${rows.length} aset.`);
        } else {
            console.log('[QR-Helper] Semua aset terdaftar sudah memiliki QR Code.');
        }
    } catch (err) {
        console.error('[QR-Helper] Gagal melakukan auto-generate QR Code:', err.message);
    }
}

module.exports = { autoGenerateMissingQRCodes };
