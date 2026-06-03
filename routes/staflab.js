const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkAuth } = require('../middlewares/authMiddleware');

// Kunci akses HANYA untuk Staf Laboratorium
router.use(checkAuth('Staf Laboratorium'));

// PROSES CRUD BHP (CONSUMABLES)

// READ: Menampilkan daftar BHP
router.get('/consumables', (req, res) => {
    db.query('SELECT * FROM consumables', (err, consumables) => {
        if (err) throw err;
        res.render('consumables/index', { user: req.session.user, consumables });
    });
});

// CREATE FORM: Halaman tambah BHP
router.get('/consumables/create', (req, res) => {
    res.render('consumables/create', { user: req.session.user });
});

// EDIT FORM: Halaman edit BHP
router.get('/consumables/edit/:id', (req, res) => {
    db.query('SELECT * FROM consumables WHERE id = ?', [req.params.id], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            res.render('consumables/edit', { user: req.session.user, consumableEdit: results[0] });
        } else {
            res.redirect('/staflab/consumables');
        }
    });
});

// POST CREATE
router.post('/consumables/add', (req, res) => {
    const { item_name, stock, unit } = req.body;
    db.query('INSERT INTO consumables (item_name, stock, unit) VALUES (?, ?, ?)',
        [item_name, stock, unit], (err) => {
            if (err) throw err;
            res.redirect('/staflab/consumables');
        });
});

// POST EDIT
router.post('/consumables/edit/:id', (req, res) => {
    const { item_name, stock, unit } = req.body;
    db.query('UPDATE consumables SET item_name=?, stock=?, unit=? WHERE id=?',
        [item_name, stock, unit, req.params.id], (err) => {
            if (err) throw err;
            res.redirect('/staflab/consumables');
        });
});

// POST DELETE
router.post('/consumables/delete/:id', (req, res) => {
    db.query('DELETE FROM consumables WHERE id=?', [req.params.id], (err) => {
        if (err) throw err;
        res.redirect('/staflab/consumables');
    });
});

/* 
 * FITUR: DATA INVENTARIS (READ-ONLY Staf Lab)
 */
// READ: Menampilkan daftar aset staf lab
router.get('/assets', (req, res) => {
    const query = `
        SELECT a.*, r.room_name 
        FROM assets a 
        LEFT JOIN rooms r ON a.room_id = r.id
        WHERE a.is_active = TRUE
        ORDER BY r.room_name ASC, a.item_name ASC
    `;
    db.query(query, (err, assets) => {
        if (err) throw err;
        res.render('maintenance/assets', { user: req.session.user, assets });
    });
});

/* 
 * FITUR: MAINTENANCE & UPDATE KONDISI BARANG
 */
// GET: Form maintenance untuk satu aset
router.get('/assets/maintenance/:id', async (req, res) => {
    try {
        const assetId = req.params.id;

        // Ambil data aset
        const [assets] = await db.promise().query(
            `SELECT a.*, r.room_name 
             FROM assets a 
             LEFT JOIN rooms r ON a.room_id = r.id 
             WHERE a.id = ?`, [assetId]
        );

        if (assets.length === 0) {
            return res.send("<script>alert('Aset tidak ditemukan.'); window.history.back();</script>");
        }

        // Ambil daftar BHP yang stoknya > 0
        const [consumables] = await db.promise().query(
            'SELECT * FROM consumables WHERE stock > 0 ORDER BY item_name ASC'
        );

        res.render('maintenance/form', {
            user: req.session.user,
            asset: assets[0],
            consumables
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server.');
    }
});

// POST: Proses maintenance — update kondisi, catat log, kurangi stok BHP
router.post('/assets/maintenance/:id', async (req, res) => {
    const conn = db.promise();
    try {
        const assetId = req.params.id;
        const stafLabId = req.session.user.id;
        const { condition_status, maintenance_date, description } = req.body;

        // Normalisasi input BHP (bisa array atau single value)
        let bhpIds = req.body['bhp_id[]'] || req.body.bhp_id || [];
        let bhpQtys = req.body['bhp_qty[]'] || req.body.bhp_qty || [];

        if (!Array.isArray(bhpIds)) bhpIds = [bhpIds];
        if (!Array.isArray(bhpQtys)) bhpQtys = [bhpQtys];

        // Filter BHP yang valid (id dan qty terisi)
        const bhpUsages = [];
        for (let i = 0; i < bhpIds.length; i++) {
            const id = parseInt(bhpIds[i], 10);
            const qty = parseInt(bhpQtys[i], 10);
            if (id && qty && qty > 0) {
                bhpUsages.push({ consumable_id: id, quantity_used: qty });
            }
        }

        // Validasi input dasar
        if (!condition_status || !maintenance_date) {
            return res.send("<script>alert('Kondisi dan tanggal maintenance wajib diisi.'); window.history.back();</script>");
        }

        await conn.beginTransaction();

        // 1. Validasi stok BHP cukup sebelum memproses
        for (const usage of bhpUsages) {
            const [rows] = await conn.query(
                'SELECT stock, item_name FROM consumables WHERE id = ? FOR UPDATE',
                [usage.consumable_id]
            );
            if (rows.length === 0) {
                await conn.rollback();
                return res.send("<script>alert('BHP tidak ditemukan.'); window.history.back();</script>");
            }
            if (rows[0].stock < usage.quantity_used) {
                await conn.rollback();
                return res.send(`<script>alert('Stok ${rows[0].item_name} tidak mencukupi! Tersedia: ${rows[0].stock}, diminta: ${usage.quantity_used}'); window.history.back();</script>`);
            }
        }

        // 2. Insert maintenance log
        const [logResult] = await conn.query(
            'INSERT INTO maintenance_logs (asset_id, staf_lab_id, maintenance_date, description) VALUES (?, ?, ?, ?)',
            [assetId, stafLabId, maintenance_date, description || null]
        );
        const maintenanceLogId = logResult.insertId;

        // 3. Update kondisi aset
        await conn.query(
            'UPDATE assets SET condition_status = ? WHERE id = ?',
            [condition_status, assetId]
        );

        // 4. Insert BHP usage & kurangi stok
        for (const usage of bhpUsages) {
            await conn.query(
                'INSERT INTO maintenance_bhp_usage (maintenance_log_id, consumable_id, quantity_used) VALUES (?, ?, ?)',
                [maintenanceLogId, usage.consumable_id, usage.quantity_used]
            );
            await conn.query(
                'UPDATE consumables SET stock = stock - ? WHERE id = ?',
                [usage.quantity_used, usage.consumable_id]
            );
        }

        await conn.commit();
        return res.send("<script>alert('Maintenance berhasil dicatat!'); window.location.href='/staflab/maintenance-logs';</script>");
    } catch (err) {
        await conn.rollback();
        console.error(err);
        return res.send("<script>alert('Terjadi kesalahan sistem saat menyimpan maintenance.'); window.history.back();</script>");
    }
});

/* 
 *FITUR: LOG MAINTENANCE
 */
// READ: Menampilkan semua log maintenance
router.get('/maintenance-logs', async (req, res) => {
    try {
        const queryLogs = `
            SELECT 
                ml.id,
                ml.maintenance_date,
                ml.description,
                ml.created_at,
                a.item_name AS asset_name,
                a.label_code,
                a.condition_status,
                r.room_name,
                u.name AS staf_name
            FROM maintenance_logs ml
            JOIN assets a ON ml.asset_id = a.id
            LEFT JOIN rooms r ON a.room_id = r.id
            JOIN users u ON ml.staf_lab_id = u.id
            ORDER BY ml.maintenance_date DESC, ml.created_at DESC
        `;

        const queryUsages = `
            SELECT 
                mbu.maintenance_log_id,
                mbu.quantity_used,
                c.item_name AS consumable_name,
                c.unit
            FROM maintenance_bhp_usage mbu
            JOIN consumables c ON mbu.consumable_id = c.id
        `;

        const [logs] = await db.promise().query(queryLogs);
        const [usages] = await db.promise().query(queryUsages);

        // Group BHP usages by maintenance_log_id
        const usagesByLog = {};
        usages.forEach(u => {
            if (!usagesByLog[u.maintenance_log_id]) {
                usagesByLog[u.maintenance_log_id] = [];
            }
            usagesByLog[u.maintenance_log_id].push(u);
        });

        res.render('maintenance/logs', {
            user: req.session.user,
            logs,
            usagesByLog
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server.');
    }
});

// READ: Detail satu log maintenance
router.get('/maintenance-logs/:id', async (req, res) => {
    try {
        const logId = req.params.id;

        const queryLog = `
            SELECT 
                ml.id,
                ml.maintenance_date,
                ml.description,
                ml.created_at,
                a.id AS asset_id,
                a.item_name AS asset_name,
                a.label_code,
                a.condition_status,
                r.room_name,
                u.name AS staf_name
            FROM maintenance_logs ml
            JOIN assets a ON ml.asset_id = a.id
            LEFT JOIN rooms r ON a.room_id = r.id
            JOIN users u ON ml.staf_lab_id = u.id
            WHERE ml.id = ?
        `;

        const queryUsages = `
            SELECT 
                mbu.quantity_used,
                c.item_name AS consumable_name,
                c.unit
            FROM maintenance_bhp_usage mbu
            JOIN consumables c ON mbu.consumable_id = c.id
            WHERE mbu.maintenance_log_id = ?
        `;

        const [logs] = await db.promise().query(queryLog, [logId]);
        if (logs.length === 0) {
            return res.send("<script>alert('Log maintenance tidak ditemukan.'); window.location.href='/staflab/maintenance-logs';</script>");
        }

        const [usages] = await db.promise().query(queryUsages, [logId]);

        res.render('maintenance/detail', {
            user: req.session.user,
            log: logs[0],
            usages
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server.');
    }
});

module.exports = router;