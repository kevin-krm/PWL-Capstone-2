const ProcurementDraft = require('../models/ProcurementDraft');
const ProcurementItem = require('../models/ProcurementItem');
const Asset = require('../models/Asset');
const Consumable = require('../models/Consumable');
const ActivityLog = require('../models/ActivityLog');
const LIMITS = require('../config/limits');

// Membangun array nilai item draf dari body form (dipakai create & edit)
function buildItemValues(body, draftId) {
    const itemTypes = body.item_type || [];
    const itemNames = body.item_name || [];
    const prices = body.price || [];
    const quantities = body.quantity || [];
    const purchaseLinks = body.purchase_link || [];
    const targetReplacementAssetIds = body.target_replacement_asset_id || [];
    const reasons = body.reason || [];

    const types = Array.isArray(itemTypes) ? itemTypes : [itemTypes];
    const names = Array.isArray(itemNames) ? itemNames : [itemNames];
    const priceArr = Array.isArray(prices) ? prices : [prices];
    const qtyArr = Array.isArray(quantities) ? quantities : [quantities];
    const linkArr = Array.isArray(purchaseLinks) ? purchaseLinks : [purchaseLinks];
    const assetArr = Array.isArray(targetReplacementAssetIds) ? targetReplacementAssetIds : [targetReplacementAssetIds];
    const reasonArr = Array.isArray(reasons) ? reasons : [reasons];

    const values = [];
    for (let i = 0; i < names.length; i++) {
        if (names[i] && names[i].trim() !== '') {
            const itemType = types[i];
            const itemName = names[i];
            const price = parseFloat(priceArr[i]) || 0;
            const quantity = parseInt(qtyArr[i]) || 1;
            const purchaseLink = linkArr[i] || null;
            const targetAssetId = assetArr[i] && assetArr[i] !== '' ? parseInt(assetArr[i]) : null;
            const reason = reasonArr[i] || 'Alasan tidak diberikan';

            values.push([draftId, itemType, itemName, price, quantity, purchaseLink, 'Pending', targetAssetId, reason]);
        }
    }
    return values;
}

// Validasi batas kuantitas pengadaan (anti-freeze halaman Penerimaan & Labeling).
// Membaca struktur baris dari buildItemValues: row[1]=item_type, row[4]=quantity.
// Pesan sengaja hanya memuat jenis + angka (tanpa item_name bebas) agar aman dari injeksi.
function validateItemLimits(values) {
    let total = 0;
    for (const row of values) {
        const itemType = row[1];
        const qty = row[4];
        const label = itemType === 'BHP' ? 'BHP' : 'Inventaris';

        if (!Number.isInteger(qty) || qty < 1) {
            return { ok: false, message: `Gagal: Jumlah barang ${label} tidak valid (minimal 1 unit per barang).` };
        }
        const cap = itemType === 'BHP' ? LIMITS.MAX_QTY_BHP : LIMITS.MAX_QTY_INVENTARIS;
        if (qty > cap) {
            return { ok: false, message: `Gagal: Jumlah barang ${label} (${qty}) melebihi batas ${cap} unit per barang.` };
        }
        total += qty;
    }
    if (total > LIMITS.MAX_TOTAL_UNITS) {
        return { ok: false, message: `Gagal: Total kuantitas seluruh barang (${total}) melebihi batas ${LIMITS.MAX_TOTAL_UNITS} unit per draf.` };
    }
    return { ok: true };
}

// READ: Daftar inventaris (read-only)
exports.listAssets = async (req, res) => {
    const sort = req.query.sort || null;
    const condition = req.query.condition || null;
    const assets = await Asset.findAllWithRoom({ sort, condition });
    res.render('maintenance/assets', { user: req.session.user, assets, selectedSort: sort, selectedCondition: condition });
};

// READ: Daftar BHP (read-only)
exports.listConsumables = async (req, res) => {
    const sort = req.query.sort || null;
    const consumables = await Consumable.findAll(sort);
    res.render('consumables/index', { user: req.session.user, consumables, selectedSort: sort });
};

// Menampilkan daftar draft pengadaan
exports.listDrafts = async (req, res) => {
    try {
        const kalabId = req.session.user.id;
        const selectedYear = req.query.year || null;
        const selectedStatus = req.query.status || null;
        const selectedSort = req.query.sort || null;

        const drafts = await ProcurementDraft.findByKalab(kalabId, { year: selectedYear, status: selectedStatus, sort: selectedSort });
        const years = await ProcurementDraft.findDistinctYears();

        res.render('procurement_drafts/index', {
            user: req.session.user,
            drafts,
            years,
            selectedYear,
            selectedStatus,
            selectedSort
        });
    } catch (err) {
        res.status(500).send(err);
    }
};

// Halaman create
exports.showCreateDraft = async (req, res) => {
    try {
        const assets = await Asset.findActive();
        res.render('procurement_drafts/create', {
            user: req.session.user,
            currentYear: new Date().getFullYear(),
            assets,
            limits: LIMITS
        });
    } catch (err) {
        res.status(500).send(err);
    }
};

// Menyimpan draft pengadaan dan barang-barangnya
exports.createDraft = async (req, res) => {
    try {
        const kalabId = req.session.user.id;
        const year = new Date().getFullYear();

        // Validasi dahulu: jangan buat baris draf bila tidak ada barang valid,
        // agar tidak ada draf kosong yang nyangkut di sistem. draft_id (kolom ke-0)
        // diisi setelah draf benar-benar dibuat.
        const values = buildItemValues(req.body, null);
        if (values.length === 0) {
            return res.send("<script>alert('Gagal: Tidak bisa membuat draf tanpa barang. Tambahkan minimal satu barang.'); window.history.back();</script>");
        }

        // Batasi kuantitas agar halaman Penerimaan & Labeling tidak freeze.
        const limitCheck = validateItemLimits(values);
        if (!limitCheck.ok) {
            return res.send(`<script>alert(${JSON.stringify(limitCheck.message)}); window.history.back();</script>`);
        }

        const draftResult = await ProcurementDraft.create({ kalab_id: kalabId, year, status: 'Draft' });
        const draftId = draftResult.insertId;
        values.forEach(row => { row[0] = draftId; });

        await ProcurementItem.bulkInsert(values);
        
        // Log Activity
        ActivityLog.logAction(
            kalabId, 
            'Membuat Draft Pengadaan', 
            `Membuat draft pengadaan baru untuk tahun ${year} dengan ${values.length} item`
        );

        res.redirect('/kalab/procurement-drafts');
    } catch (err) {
        res.status(500).send(err);
    }
};

// Halaman edit
exports.showEditDraft = async (req, res) => {
    try {
        const draftId = req.params.id;
        const kalabId = req.session.user.id;

        const draft = await ProcurementDraft.findOwnedWithKalab(draftId, kalabId);
        if (!draft) {
            return res.send('Draft tidak ditemukan atau Anda tidak memiliki akses.');
        }

        if (draft.status !== 'Draft') {
            return res.send("<script>alert('Gagal: Draf ini sudah diajukan/terkunci dan tidak dapat diubah lagi!'); window.location.href='/kalab/procurement-drafts';</script>");
        }

        const items = await ProcurementItem.findByDraft(draftId);
        const assets = await Asset.findActive();

        res.render('procurement_drafts/edit', {
            user: req.session.user,
            draft,
            items,
            assets,
            limits: LIMITS
        });
    } catch (err) {
        res.status(500).send(err);
    }
};

// Memperbarui barang-barang dalam draf
exports.updateDraft = async (req, res) => {
    try {
        const draftId = req.params.id;
        const kalabId = req.session.user.id;

        const draft = await ProcurementDraft.findStatusOwned(draftId, kalabId);
        if (!draft) {
            return res.send('Draft tidak ditemukan atau Anda tidak memiliki akses.');
        }

        if (draft.status !== 'Draft') {
            return res.status(403).send('Draf pengadaan ini sudah diajukan/terkunci dan tidak dapat diubah.');
        }

        const values = buildItemValues(req.body, draftId);

        // Batasi kuantitas SEBELUM menghapus item lama (operasi destruktif),
        // agar item lama tetap utuh bila input melebihi batas.
        const limitCheck = validateItemLimits(values);
        if (!limitCheck.ok) {
            return res.send(`<script>alert(${JSON.stringify(limitCheck.message)}); window.history.back();</script>`);
        }

        // Hapus semua barang lama
        await ProcurementItem.deleteByDraft(draftId);

        if (values.length === 0) {
            return res.redirect('/kalab/procurement-drafts');
        }

        await ProcurementItem.bulkInsert(values);
        res.redirect('/kalab/procurement-drafts');
    } catch (err) {
        res.status(500).send(err);
    }
};

// Menghapus draf pengadaan (otomatis cascade menghapus barang)
exports.deleteDraft = async (req, res) => {
    try {
        const draftId = req.params.id;
        const kalabId = req.session.user.id;

        const draft = await ProcurementDraft.findStatusOwned(draftId, kalabId);
        if (!draft) {
            return res.send('Draft tidak ditemukan atau Anda tidak memiliki akses.');
        }

        if (draft.status !== 'Draft') {
            return res.status(403).send('Draf pengadaan ini sudah diajukan/terkunci dan tidak dapat dihapus.');
        }

        await ProcurementDraft.remove(draftId);
        res.redirect('/kalab/procurement-drafts');
    } catch (err) {
        res.status(500).send(err);
    }
};

// Mengajukan draf ke Kaprodi untuk direview (Draft -> Reviewed).
// Setelah diajukan, draf tidak dapat diubah/dihapus lagi oleh Kalab.
exports.submitDraft = async (req, res) => {
    try {
        const draftId = req.params.id;
        const kalabId = req.session.user.id;

        const draft = await ProcurementDraft.findStatusOwned(draftId, kalabId);
        if (!draft) {
            return res.send('Draft tidak ditemukan atau Anda tidak memiliki akses.');
        }
        if (draft.status !== 'Draft') {
            return res.send("<script>alert('Gagal: Hanya draf berstatus Draft yang dapat diajukan.'); window.location.href='/kalab/procurement-drafts';</script>");
        }

        // Cegah pengajuan draf kosong.
        const items = await ProcurementItem.findByDraft(draftId);
        if (items.length === 0) {
            return res.send("<script>alert('Gagal: Tidak bisa mengajukan draf kosong. Tambahkan minimal satu barang terlebih dahulu.'); window.location.href='/kalab/procurement-drafts';</script>");
        }

        await ProcurementDraft.setReviewed(draftId);

        ActivityLog.logAction(
            kalabId,
            'Ajukan Draft Pengadaan',
            `Mengajukan draft pengadaan ID #${draftId} ke Ketua Program Studi untuk direview`
        );

        res.redirect('/kalab/procurement-drafts');
    } catch (err) {
        res.status(500).send(err);
    }
};

// Menampilkan halaman detail draft pengadaan
exports.showDraftDetail = async (req, res) => {
    try {
        const draftId = req.params.id;
        const kalabId = req.session.user.id;

        const draft = await ProcurementDraft.findOwnedWithKalab(draftId, kalabId);
        if (!draft) {
            return res.send('Draft tidak ditemukan atau Anda tidak memiliki akses.');
        }

        const items = await ProcurementItem.findByDraftWithReplacement(draftId);

        res.render('procurement_drafts/detail', {
            user: req.session.user,
            draft,
            items
        });
    } catch (err) {
        res.status(500).send(err);
    }
};