const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkAuth } = require('../middlewares/authMiddleware');

// Akses hanya untuk Kepala Laboratorium
router.use(checkAuth('Kepala Laboratorium'));

// Menampilkan daftar draft pengadaan
router.get('/procurement-drafts', (req, res) => {
    const kalabId = req.session.user.id;
    const query = `
        SELECT * 
        FROM procurement_drafts 
        WHERE kalab_id = ? 
        ORDER BY created_at DESC
    `;

    db.query(query, [kalabId], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }

        res.render('procurement_drafts/index', {
            user: req.session.user,
            drafts: results
        });
    });
});

// Halaman create
router.get('/procurement-drafts/create', (req, res) => {
    const query = 'SELECT * FROM assets WHERE is_active = 1';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }

        res.render('procurement_drafts/create', {
            user: req.session.user,
            currentYear: new Date().getFullYear(),
            assets: results
        });
    });
});

// Menyimpan draft pengadaan dan barang-barangnya
router.post('/procurement-drafts/create', (req, res) => {
    const kalabId = req.session.user.id;
    const year = new Date().getFullYear();

    db.query(
        'INSERT INTO procurement_drafts (kalab_id, year, status) VALUES (?, ?, ?)',
        [kalabId, year, 'Draft'],
        (err, draftResult) => {
            if (err) {
                return res.status(500).send(err);
            }

            const draftId = draftResult.insertId;

            const itemTypes = req.body.item_type || [];
            const itemNames = req.body.item_name || [];
            const prices = req.body.price || [];
            const quantities = req.body.quantity || [];
            const purchaseLinks = req.body.purchase_link || [];
            const targetReplacementAssetIds = req.body.target_replacement_asset_id || [];

            const types = Array.isArray(itemTypes) ? itemTypes : [itemTypes];
            const names = Array.isArray(itemNames) ? itemNames : [itemNames];
            const priceArr = Array.isArray(prices) ? prices : [prices];
            const qtyArr = Array.isArray(quantities) ? quantities : [quantities];
            const linkArr = Array.isArray(purchaseLinks) ? purchaseLinks : [purchaseLinks];
            const assetArr = Array.isArray(targetReplacementAssetIds) ? targetReplacementAssetIds : [targetReplacementAssetIds];

            const values = [];
            for (let i = 0; i < names.length; i++) {
                if (names[i] && names[i].trim() !== '') {
                    const itemType = types[i];
                    const itemName = names[i];
                    const price = parseFloat(priceArr[i]) || 0;
                    const quantity = parseInt(qtyArr[i]) || 1;
                    const purchaseLink = linkArr[i] || null;
                    const targetAssetId = assetArr[i] && assetArr[i] !== '' ? parseInt(assetArr[i]) : null;

                    values.push([draftId, itemType, itemName, price, quantity, purchaseLink, 'Pending', targetAssetId]);
                }
            }

            if (values.length === 0) {
                return res.redirect('/kalab/procurement-drafts');
            }

            const insertQuery = `
                INSERT INTO procurement_items 
                (draft_id, item_type, item_name, price, quantity, purchase_link, status, target_replacement_asset_id) 
                VALUES ?
            `;
            db.query(insertQuery, [values], (err) => {
                if (err) {
                    return res.status(500).send(err);
                }
                res.redirect('/kalab/procurement-drafts');
            });
        }
    );
});

// Halaman edit
router.get('/procurement-drafts/edit/:id', (req, res) => {
    const draftId = req.params.id;
    const kalabId = req.session.user.id;

    const draftQuery = `
        SELECT d.*, u.name AS kalab_name
        FROM procurement_drafts d
        JOIN users u ON d.kalab_id = u.id
        WHERE d.id = ? AND d.kalab_id = ?
    `;

    db.query(draftQuery, [draftId, kalabId], (err, draftResults) => {
        if (err) {
            return res.status(500).send(err);
        }
        if (draftResults.length === 0) {
            return res.send('Draft tidak ditemukan atau Anda tidak memiliki akses.');
        }

        const draft = draftResults[0];
        if (draft.status === 'Locked') {
            return res.send("<script>alert('Gagal: Draf pengadaan ini sudah terkunci (Locked) dan tidak dapat diubah!'); window.location.href='/kalab/procurement-drafts';</script>");
        }

        const itemsQuery = 'SELECT * FROM procurement_items WHERE draft_id = ? ORDER BY id ASC';
        const assetsQuery = 'SELECT * FROM assets WHERE is_active = 1';

        db.query(itemsQuery, [draftId], (err, itemResults) => {
            if (err) {
                return res.status(500).send(err);
            }

            db.query(assetsQuery, (err, assetResults) => {
                if (err) {
                    return res.status(500).send(err);
                }

                res.render('procurement_drafts/edit', {
                    user: req.session.user,
                    draft: draft,
                    items: itemResults,
                    assets: assetResults
                });
            });
        });
    });
});

// Memperbarui barang-barang dalam draf
router.post('/procurement-drafts/edit/:id', (req, res) => {
    const draftId = req.params.id;
    const kalabId = req.session.user.id;

    db.query(
        'SELECT status FROM procurement_drafts WHERE id = ? AND kalab_id = ?',
        [draftId, kalabId],
        (err, draftResults) => {
            if (err) {
                return res.status(500).send(err);
            }
            if (draftResults.length === 0) {
                return res.send('Draft tidak ditemukan atau Anda tidak memiliki akses.');
            }

            if (draftResults[0].status === 'Locked') {
                return res.status(403).send('Draf pengadaan ini sudah terkunci dan tidak dapat diubah.');
            }

            // Hapus semua barang lama
            db.query('DELETE FROM procurement_items WHERE draft_id = ?', [draftId], (err) => {
                if (err) {
                    return res.status(500).send(err);
                }

                const itemTypes = req.body.item_type || [];
                const itemNames = req.body.item_name || [];
                const prices = req.body.price || [];
                const quantities = req.body.quantity || [];
                const purchaseLinks = req.body.purchase_link || [];
                const targetReplacementAssetIds = req.body.target_replacement_asset_id || [];

                const types = Array.isArray(itemTypes) ? itemTypes : [itemTypes];
                const names = Array.isArray(itemNames) ? itemNames : [itemNames];
                const priceArr = Array.isArray(prices) ? prices : [prices];
                const qtyArr = Array.isArray(quantities) ? quantities : [quantities];
                const linkArr = Array.isArray(purchaseLinks) ? purchaseLinks : [purchaseLinks];
                const assetArr = Array.isArray(targetReplacementAssetIds) ? targetReplacementAssetIds : [targetReplacementAssetIds];

                const values = [];
                for (let i = 0; i < names.length; i++) {
                    if (names[i] && names[i].trim() !== '') {
                        const itemType = types[i];
                        const itemName = names[i];
                        const price = parseFloat(priceArr[i]) || 0;
                        const quantity = parseInt(qtyArr[i]) || 1;
                        const purchaseLink = linkArr[i] || null;
                        const targetAssetId = assetArr[i] && assetArr[i] !== '' ? parseInt(assetArr[i]) : null;

                        values.push([draftId, itemType, itemName, price, quantity, purchaseLink, 'Pending', targetAssetId]);
                    }
                }

                if (values.length === 0) {
                    return res.redirect('/kalab/procurement-drafts');
                }

                const insertQuery = `
                    INSERT INTO procurement_items 
                    (draft_id, item_type, item_name, price, quantity, purchase_link, status, target_replacement_asset_id) 
                    VALUES ?
                `;
                db.query(insertQuery, [values], (err) => {
                    if (err) {
                        return res.status(500).send(err);
                    }
                    res.redirect('/kalab/procurement-drafts');
                });
            });
        }
    );
});

// Menghapus draf pengadaan (otomatis cascade menghapus barang)
router.post('/procurement-drafts/delete/:id', (req, res) => {
    const draftId = req.params.id;
    const kalabId = req.session.user.id;

    db.query(
        'SELECT status FROM procurement_drafts WHERE id = ? AND kalab_id = ?',
        [draftId, kalabId],
        (err, draftResults) => {
            if (err) {
                return res.status(500).send(err);
            }
            if (draftResults.length === 0) {
                return res.send('Draft tidak ditemukan atau Anda tidak memiliki akses.');
            }

            if (draftResults[0].status === 'Locked') {
                return res.status(403).send('Draf pengadaan ini sudah terkunci dan tidak dapat dihapus.');
            }

            db.query('DELETE FROM procurement_drafts WHERE id = ?', [draftId], (err) => {
                if (err) {
                    return res.status(500).send(err);
                }
                res.redirect('/kalab/procurement-drafts');
            });
        }
    );
});

// Menampilkan halaman detail draft pengadaan
router.get('/procurement-drafts/:id', (req, res) => {
    const draftId = req.params.id;
    const kalabId = req.session.user.id;

    const draftQuery = `
        SELECT d.*, u.name AS kalab_name
        FROM procurement_drafts d
        JOIN users u ON d.kalab_id = u.id
        WHERE d.id = ? AND d.kalab_id = ?
    `;

    db.query(draftQuery, [draftId, kalabId], (err, draftResults) => {
        if (err) {
            return res.status(500).send(err);
        }
        if (draftResults.length === 0) {
            return res.send('Draft tidak ditemukan atau Anda tidak memiliki akses.');
        }

        const draft = draftResults[0];

        const itemsQuery = `
            SELECT pi.*, a.item_name AS replaced_asset_name, a.label_code AS replaced_asset_label
            FROM procurement_items pi
            LEFT JOIN assets a ON pi.target_replacement_asset_id = a.id
            WHERE pi.draft_id = ?
            ORDER BY pi.id ASC
        `;

        db.query(itemsQuery, [draftId], (err, itemResults) => {
            if (err) {
                return res.status(500).send(err);
            }

            res.render('procurement_drafts/detail', {
                user: req.session.user,
                draft: draft,
                items: itemResults
            });
        });
    });
});

module.exports = router;
