const ProcurementDraft = require('../models/ProcurementDraft');
const ProcurementItem = require('../models/ProcurementItem');
const Asset = require('../models/Asset');
const Consumable = require('../models/Consumable');

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

// READ: Daftar inventaris (read-only)
exports.listAssets = async (req, res) => {
    const sort = req.query.sort || null;
    const condition = req.query.condition || null;
    const assets = await Asset.findActiveWithRoomOrdered({ sort, condition });
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
            assets
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

        const draftResult = await ProcurementDraft.create({ kalab_id: kalabId, year, status: 'Draft' });
        const draftId = draftResult.insertId;

        const values = buildItemValues(req.body, draftId);

        if (values.length === 0) {
            return res.redirect('/kalab/procurement-drafts');
        }

        await ProcurementItem.bulkInsert(values);
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

        if (draft.status === 'Locked') {
            return res.send("<script>alert('Gagal: Draf pengadaan ini sudah terkunci (Locked) dan tidak dapat diubah!'); window.location.href='/kalab/procurement-drafts';</script>");
        }

        const items = await ProcurementItem.findByDraft(draftId);
        const assets = await Asset.findActive();

        res.render('procurement_drafts/edit', {
            user: req.session.user,
            draft,
            items,
            assets
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

        if (draft.status === 'Locked') {
            return res.status(403).send('Draf pengadaan ini sudah terkunci dan tidak dapat diubah.');
        }

        // Hapus semua barang lama
        await ProcurementItem.deleteByDraft(draftId);

        const values = buildItemValues(req.body, draftId);

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

        if (draft.status === 'Locked') {
            return res.status(403).send('Draf pengadaan ini sudah terkunci dan tidak dapat dihapus.');
        }

        await ProcurementDraft.remove(draftId);
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