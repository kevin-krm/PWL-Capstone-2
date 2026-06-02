const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkAuth } = require('../middlewares/authMiddleware');

// Pengecekan Role
router.use(checkAuth('Ketua Program Studi'));

// List Procurement Review
router.get('/procurement-review', (req, res) => {
    const query = `
        SELECT
            procurement_drafts.*,
            users.name AS kalab_name
        FROM procurement_drafts
        LEFT JOIN users
            ON procurement_drafts.kalab_id = users.id
        ORDER BY procurement_drafts.created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            return res.send(err);
        }

        res.render('procurement_review/index', {
            user: req.session.user,
            drafts: results
        });
    });
});

// Detail & Edit Persetujuan (Review Draft)
router.get('/procurement-review/edit/:id', (req, res) => {
    const draftId = req.params.id;

    const draftQuery = `
        SELECT
            procurement_drafts.*,
            users.name AS kalab_name
        FROM procurement_drafts
        LEFT JOIN users
            ON procurement_drafts.kalab_id = users.id
        WHERE procurement_drafts.id = ?
    `;

    const itemQuery = `
        SELECT *
        FROM procurement_items
        WHERE draft_id = ?
        ORDER BY id ASC
    `;

    db.query(draftQuery, [draftId], (err, draftResult) => {
        if (err) {
            return res.send(err);
        }

        if (draftResult.length === 0) {
            return res.send('Draft tidak ditemukan');
        }

        db.query(itemQuery, [draftId], (err, itemResult) => {
            if (err) {
                return res.send(err);
            }

            res.render('procurement_review/edit', {
                user: req.session.user,
                draft: draftResult[0],
                items: itemResult
            });
        });
    });
});

// Finalisasi Persetujuan
router.post('/procurement-review/edit/:id/finalize', async (req, res) => {
    try {
        const draftId = req.params.id;
        const itemIds = req.body.item_ids || [];
        const statuses = req.body.statuses || [];

        const allowedStatuses = [
            'Pending',
            'Disetujui',
            'Ditolak'
        ];

        for (let i = 0; i < itemIds.length; i++) {
            const itemId = itemIds[i];
            const status = statuses[i];

            if (!allowedStatuses.includes(status)) {
                continue;
            }

            // update item
            await new Promise((resolve, reject) => {
                db.query(
                    `
                    UPDATE procurement_items
                    SET status = ?
                    WHERE id = ?
                      AND draft_id = ?
                    `,
                    [status, itemId, draftId],
                    (err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    }
                );
            });
        }

        // lock draft (change status to 'Reviewed')
        await new Promise((resolve, reject) => {
            db.query(
                `
                UPDATE procurement_drafts
                SET status = 'Reviewed'
                WHERE id = ?
                `,
                [draftId],
                (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                }
            );
        });
        res.redirect('/kaprodi/procurement-review');

    } catch (err) {
        res.send(err);
    }
});

// List Procurement Approval (Pengesahan)
router.get('/procurement-approval', (req, res) => {
    const query = `
        SELECT
            procurement_drafts.*,
            users.name AS kalab_name
        FROM procurement_drafts
        LEFT JOIN users
            ON procurement_drafts.kalab_id = users.id
        ORDER BY procurement_drafts.created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            return res.send(err);
        }

        res.render('procurement_approval/index', {
            user: req.session.user,
            drafts: results
        });
    });
});

// Detail Pengesahan Draf
router.get('/procurement-approval/detail/:id', (req, res) => {
    const draftId = req.params.id;

    const draftQuery = `
        SELECT
            procurement_drafts.*,
            users.name AS kalab_name
        FROM procurement_drafts
        LEFT JOIN users
            ON procurement_drafts.kalab_id = users.id
        WHERE procurement_drafts.id = ?
    `;

    const itemQuery = `
        SELECT pi.*, a.item_name AS replaced_asset_name, a.label_code AS replaced_asset_label
        FROM procurement_items pi
        LEFT JOIN assets a ON pi.target_replacement_asset_id = a.id
        WHERE pi.draft_id = ?
        ORDER BY pi.id ASC
    `;

    db.query(draftQuery, [draftId], (err, draftResult) => {
        if (err) {
            return res.send(err);
        }

        if (draftResult.length === 0) {
            return res.send('Draft tidak ditemukan');
        }

        db.query(itemQuery, [draftId], (err, itemResult) => {
            if (err) {
                return res.send(err);
            }

            res.render('procurement_approval/detail', {
                user: req.session.user,
                draft: draftResult[0],
                items: itemResult
            });
        });
    });
});

// Aksi Pengesahan Draf (Approve/Ratify)
router.post('/procurement-approval/detail/:id/approve', (req, res) => {
    const draftId = req.params.id;

    // Cek jika status asset pending, maka tidak bisa disahkan
    db.query('SELECT COUNT(*) AS pending_count FROM procurement_items WHERE draft_id = ? AND status = "Pending"', [draftId], (err, results) => {
        if (err) {
            return res.send(err);
        }

        if (results[0].pending_count > 0) {
            return res.send(`<script>alert('Gagal: Masih ada item pengadaan dengan status Pending. Semua item harus Disetujui atau Ditolak terlebih dahulu sebelum disahkan!'); window.location.href='/kaprodi/procurement-approval/detail/${draftId}';</script>`);
        }

        // Jika disahkan maka status = locked
        db.query(
            `
            UPDATE procurement_drafts
            SET status = 'Locked'
            WHERE id = ?
            `,
            [draftId],
            (err) => {
                if (err) {
                    return res.send(err);
                }
                res.redirect('/kaprodi/procurement-approval');
            }
        );
    });
});

module.exports = router;