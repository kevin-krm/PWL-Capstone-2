const db = require('../config/database');
const pool = db.promise();

// Menyiapkan flag notifikasi (titik biru sidebar) per role.
// Dijalankan setelah session, sebelum routes. Hasil ditaruh di res.locals.notif
// sehingga bisa dibaca langsung oleh sidebar.pug pada setiap render.
async function loadNotifications(req, res, next) {
    res.locals.notif = {};
    const user = req.session.user;
    if (!user) return next();

    try {
        switch (user.role) {
            case 'Ketua Program Studi': {
                // Ada draft yang belum difinalisasi (perlu di-review)
                const [[r]] = await pool.query(
                    "SELECT COUNT(*) AS n FROM procurement_drafts WHERE status <> 'Locked'"
                );
                res.locals.notif.procurementReview = r.n > 0;
                break;
            }
            case 'Kepala Laboratorium': {
                break;
            }
            case 'Staf Laboratorium': {
                // Ada aset yang Rusak / Maintenance (perlu ditangani)
                const [[r]] = await pool.query(
                    "SELECT COUNT(*) AS n FROM assets WHERE condition_status IN ('Rusak','Maintenance') AND is_active = TRUE"
                );
                res.locals.notif.maintenance = r.n > 0;
                break;
            }
            case 'Staf Administrasi': {
                // (a) ada barang disetujui+locked yang belum diterima penuh
                const [[a]] = await pool.query(`
                    SELECT COUNT(*) AS n FROM (
                        SELECT pi.id
                        FROM procurement_items pi
                        JOIN procurement_drafts pd ON pi.draft_id = pd.id
                        LEFT JOIN item_receipts ir ON pi.id = ir.procurement_item_id
                        WHERE pi.status = 'Disetujui' AND pd.status = 'Locked'
                        GROUP BY pi.id, pi.quantity
                        HAVING COALESCE(SUM(ir.quantity_received), 0) < pi.quantity
                    ) t
                `);
                // (b) ada penerimaan Inventaris yang belum diregistrasi/dilabeli
                const [[b]] = await pool.query(`
                    SELECT COUNT(*) AS n
                    FROM item_receipts ir
                    JOIN procurement_items pi ON ir.procurement_item_id = pi.id
                    JOIN procurement_drafts pd ON pi.draft_id = pd.id
                    WHERE ir.is_registered = FALSE
                      AND pi.item_type = 'Inventaris'
                      AND pi.status = 'Disetujui' AND pd.status = 'Locked'
                `);
                res.locals.notif.penerimaan = (a.n > 0) || (b.n > 0);
                break;
            }
        }
    } catch (err) {
        // Jangan blok request bila query notifikasi gagal
        console.error('notificationMiddleware error:', err.message);
    }
    next();
}

module.exports = { loadNotifications };
