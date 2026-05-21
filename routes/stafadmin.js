const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkAuth } = require('../middlewares/authMiddleware');

// Kunci akses HANYA untuk Staf Administrasi
router.use(checkAuth('Staf Administrasi'));

// PROSES CRUD INVENTARIS (ASSETS)

router.get('/assets', (req, res) => {
    const query = `
        SELECT a.*, r.room_name 
        FROM assets a 
        LEFT JOIN rooms r ON a.room_id = r.id
    `;
    db.query(query, (err, assets) => {
        if (err) throw err;
        db.query('SELECT * FROM rooms', (err, rooms) => {
            if (err) throw err;
            res.render('admin/assets', { user: req.session.user, assets, rooms });
        });
    });
});

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

router.post('/assets/delete/:id', (req, res) => {
    db.query('DELETE FROM assets WHERE id=?', [req.params.id], (err) => {
        if (err) throw err;
        res.redirect('/stafadmin/assets');
    });
});

module.exports = router;