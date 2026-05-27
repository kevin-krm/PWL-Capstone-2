const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkAuth } = require('../middlewares/authMiddleware');

// Kunci akses HANYA untuk Staf Administrasi
router.use(checkAuth('Staf Administrasi'));

// PROSES CRUD INVENTARIS (ASSETS)

// READ: Menampilkan daftar aset
router.get('/assets', (req, res) => {
    const query = `
        SELECT a.*, r.room_name 
        FROM assets a 
        LEFT JOIN rooms r ON a.room_id = r.id
    `;
    db.query(query, (err, assets) => {
        if (err) throw err;
        res.render('assets/index', { user: req.session.user, assets });
    });
});

// CREATE FORM: Halaman tambah aset
router.get('/assets/create', (req, res) => {
    db.query('SELECT * FROM rooms', (err, rooms) => {
        if (err) throw err;
        res.render('assets/create', { user: req.session.user, rooms });
    });
});

// EDIT FORM: Halaman edit aset
router.get('/assets/edit/:id', (req, res) => {
    db.query('SELECT * FROM assets WHERE id = ?', [req.params.id], (err, assets) => {
        if (err) throw err;
        if (assets.length > 0) {
            db.query('SELECT * FROM rooms', (err, rooms) => {
                if (err) throw err;
                res.render('assets/edit', { user: req.session.user, assetEdit: assets[0], rooms });
            });
        } else {
            res.redirect('/stafadmin/assets');
        }
    });
});

// POST CREATE
router.post('/assets/add', (req, res) => {
    const { room_id, item_name, label_code, condition_status } = req.body;
    db.query('INSERT INTO assets (room_id, item_name, label_code, condition_status) VALUES (?, ?, ?, ?)',
        [room_id, item_name, label_code, condition_status], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.send("<script>alert('Gagal: Kode Label / Barcode tersebut sudah digunakan!'); window.history.back();</script>");
                }
                throw err;
            }
            res.redirect('/stafadmin/assets');
        });
});

// POST EDIT
router.post('/assets/edit/:id', (req, res) => {
    const { room_id, item_name, label_code, condition_status, is_active } = req.body;
    db.query('UPDATE assets SET room_id=?, item_name=?, label_code=?, condition_status=?, is_active=? WHERE id=?',
        [room_id, item_name, label_code, condition_status, is_active, req.params.id], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.send("<script>alert('Gagal: Kode Label bentrok dengan barang lain!'); window.history.back();</script>");
                }
                throw err;
            }
            res.redirect('/stafadmin/assets');
        });
});

// POST DELETE
router.post('/assets/delete/:id', (req, res) => {
    db.query('DELETE FROM assets WHERE id=?', [req.params.id], (err) => {
        if (err) throw err;
        res.redirect('/stafadmin/assets');
    });
});

const QRCode = require('qrcode');

// READ: Menampilkan daftar barang pengadaan yang disetujui & draf Locked (Penerimaan & Labeling)
router.get('/penerimaan', async (req, res) => {
    try {
        const queryItems = `
            SELECT 
                pi.id AS item_id,
                pi.item_name,
                pi.item_type,
                pi.price,
                pi.quantity AS target_quantity,
                pi.purchase_link,
                pi.target_replacement_asset_id,
                pd.year,
                COALESCE(SUM(ir.quantity_received), 0) AS quantity_received
            FROM procurement_items pi
            JOIN procurement_drafts pd ON pi.draft_id = pd.id
            LEFT JOIN item_receipts ir ON pi.id = ir.procurement_item_id
            WHERE pi.status = 'Disetujui' AND pd.status = 'Locked'
            GROUP BY pi.id, pd.year
            ORDER BY pd.year DESC, pi.item_name ASC
        `;
        const queryReceipts = `
            SELECT 
                ir.id AS receipt_id,
                ir.procurement_item_id,
                ir.quantity_received,
                ir.received_date,
                u.name AS receiver_name
            FROM item_receipts ir
            LEFT JOIN users u ON ir.staf_admin_id = u.id
            ORDER BY ir.received_date DESC
        `;

        const [items] = await db.promise().query(queryItems);
        const [receipts] = await db.promise().query(queryReceipts);

        // Group receipts by procurement_item_id
        const receiptsByItem = {};
        receipts.forEach(r => {
            if (!receiptsByItem[r.procurement_item_id]) {
                receiptsByItem[r.procurement_item_id] = [];
            }
            receiptsByItem[r.procurement_item_id].push(r);
        });

        res.render('penerimaan/index', { 
            user: req.session.user, 
            items, 
            receiptsByItem 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server.');
    }
});

// Fitur 1: GET Form Penerimaan Barang Parsial
router.get('/procurement/:id/receipt', async (req, res) => {
    try {
        const itemId = req.params.id;
        
        // Fetch procurement item details
        const queryItem = `
            SELECT 
                pi.id AS item_id,
                pi.item_name,
                pi.item_type,
                pi.quantity AS target_quantity,
                pd.year
            FROM procurement_items pi
            JOIN procurement_drafts pd ON pi.draft_id = pd.id
            WHERE pi.id = ? AND pi.status = 'Disetujui' AND pd.status = 'Locked'
        `;
        const [items] = await db.promise().query(queryItem, [itemId]);
        if (items.length === 0) {
            return res.send("<script>alert('Barang tidak ditemukan atau belum disetujui/locked.'); window.location.href='/stafadmin/penerimaan';</script>");
        }
        
        const item = items[0];

        // Fetch sum of quantity already received
        const queryReceived = `
            SELECT COALESCE(SUM(quantity_received), 0) AS total_received 
            FROM item_receipts 
            WHERE procurement_item_id = ?
        `;
        const [receivedResult] = await db.promise().query(queryReceived, [itemId]);
        const totalReceived = parseInt(receivedResult[0].total_received, 10);
        
        const remainingQuantity = item.target_quantity - totalReceived;

        res.render('stafadmin/receipt', { 
            user: req.session.user, 
            item, 
            totalReceived, 
            remainingQuantity 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server.');
    }
});

// Fitur 1: POST Form Penerimaan Barang Parsial
router.post('/procurement/:id/receipt', async (req, res) => {
    const conn = db.promise();
    try {
        const itemId = req.params.id;
        const quantityReceived = parseInt(req.body.quantity_received, 10);
        const receivedDate = req.body.received_date;
        const stafAdminId = req.session.user.id;

        if (!quantityReceived || quantityReceived <= 0 || !receivedDate) {
            return res.send("<script>alert('Gagal: Input kuantitas atau tanggal tidak valid.'); window.history.back();</script>");
        }

        // Start database transaction
        await conn.beginTransaction();

        // Lock item and get quantity details
        const queryItem = `
            SELECT quantity 
            FROM procurement_items 
            WHERE id = ? AND status = 'Disetujui' 
            FOR UPDATE
        `;
        const [items] = await conn.query(queryItem, [itemId]);
        if (items.length === 0) {
            await conn.rollback();
            return res.send("<script>alert('Gagal: Barang tidak ditemukan.'); window.location.href='/stafadmin/penerimaan';</script>");
        }
        const targetQuantity = items[0].quantity;

        // Lock and get current receipts sum
        const queryReceived = `
            SELECT COALESCE(SUM(quantity_received), 0) AS total_received 
            FROM item_receipts 
            WHERE procurement_item_id = ?
        `;
        const [receivedResult] = await conn.query(queryReceived, [itemId]);
        const totalReceived = parseInt(receivedResult[0].total_received, 10);

        if (totalReceived + quantityReceived > targetQuantity) {
            await conn.rollback();
            return res.send(`<script>alert('Gagal: Jumlah yang diterima (${quantityReceived}) melebihi sisa yang harus diterima (${targetQuantity - totalReceived}).'); window.history.back();</script>`);
        }

        // Insert new receipt
        const insertQuery = `
            INSERT INTO item_receipts (procurement_item_id, staf_admin_id, quantity_received, received_date)
            VALUES (?, ?, ?, ?)
        `;
        await conn.query(insertQuery, [itemId, stafAdminId, quantityReceived, receivedDate]);

        await conn.commit();
        return res.send("<script>alert('Berhasil menginput penerimaan barang!'); window.location.href='/stafadmin/penerimaan';</script>");
    } catch (err) {
        await conn.rollback();
        console.error(err);
        return res.send("<script>alert('Terjadi kesalahan sistem saat menyimpan penerimaan.'); window.history.back();</script>");
    }
});

// Fitur 2: GET Form Registrasi Aset & Generate Label/Barcode
router.get('/receipt/:id/register-asset', async (req, res) => {
    try {
        const receiptId = req.params.id;

        // Fetch receipt and corresponding item details
        const queryReceipt = `
            SELECT 
                ir.id AS receipt_id,
                ir.quantity_received,
                pi.id AS item_id,
                pi.item_name,
                pi.item_type,
                pd.year
            FROM item_receipts ir
            JOIN procurement_items pi ON ir.procurement_item_id = pi.id
            JOIN procurement_drafts pd ON pi.draft_id = pd.id
            WHERE ir.id = ?
        `;
        const [receipts] = await db.promise().query(queryReceipt, [receiptId]);
        if (receipts.length === 0) {
            return res.send("<script>alert('Penerimaan barang tidak ditemukan.'); window.location.href='/stafadmin/penerimaan';</script>");
        }

        const receipt = receipts[0];

        // Restrict only to Inventaris
        if (receipt.item_type !== 'Inventaris') {
            return res.send("<script>alert('Gagal: Registrasi aset hanya diperbolehkan untuk barang bertipe Inventaris.'); window.location.href='/stafadmin/penerimaan';</script>");
        }

        // Fetch rooms dropdown data
        const [rooms] = await db.promise().query('SELECT * FROM rooms ORDER BY room_name ASC');

        // Fetch next auto increment number based on max(id) from assets
        const [maxResult] = await db.promise().query('SELECT MAX(id) AS max_id FROM assets');
        const nextId = (maxResult[0].max_id || 0) + 1;
        const paddedIncrement = String(nextId).padStart(3, '0');

        res.render('stafadmin/register_asset', {
            user: req.session.user,
            receipt,
            rooms,
            paddedIncrement
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server.');
    }
});

// Fitur 2: POST Form Registrasi Aset & Generate Label/Barcode
router.post('/receipt/:id/register-asset', async (req, res) => {
    try {
        const receiptId = req.params.id;
        const { room_id, label_code } = req.body;

        if (!room_id || !label_code || label_code.trim() === '') {
            return res.send("<script>alert('Gagal: Ruangan dan Kode Label harus diisi.'); window.history.back();</script>");
        }

        // Fetch receipt to get item_name
        const queryReceipt = `
            SELECT pi.item_name, pi.item_type
            FROM item_receipts ir
            JOIN procurement_items pi ON ir.procurement_item_id = pi.id
            WHERE ir.id = ?
        `;
        const [receipts] = await db.promise().query(queryReceipt, [receiptId]);
        if (receipts.length === 0) {
            return res.send("<script>alert('Gagal: Penerimaan barang tidak ditemukan.'); window.location.href='/stafadmin/penerimaan';</script>");
        }

        const receipt = receipts[0];
        if (receipt.item_type !== 'Inventaris') {
            return res.send("<script>alert('Gagal: Hanya barang bertipe Inventaris yang bisa diregistrasikan.'); window.location.href='/stafadmin/penerimaan';</script>");
        }

        // Generate QR Code Base64
        const qrCodeUrl = await QRCode.toDataURL(label_code);

        // Insert into assets table
        const insertAssetQuery = `
            INSERT INTO assets (room_id, item_name, label_code, qr_code_url, condition_status, is_active)
            VALUES (?, ?, ?, ?, 'Baik', TRUE)
        `;
        
        await db.promise().query(insertAssetQuery, [room_id, receipt.item_name, label_code, qrCodeUrl]);

        return res.send("<script>alert('Berhasil mendaftarkan aset baru!'); window.location.href='/stafadmin/assets';</script>");
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.send("<script>alert('Gagal: Kode Label / Barcode tersebut sudah digunakan!'); window.history.back();</script>");
        }
        console.error(err);
        return res.send("<script>alert('Terjadi kesalahan sistem saat mendaftarkan aset.'); window.history.back();</script>");
    }
});

module.exports = router;