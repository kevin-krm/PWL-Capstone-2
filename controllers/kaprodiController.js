const ProcurementDraft = require('../models/ProcurementDraft');
const ProcurementItem = require('../models/ProcurementItem');
const Asset = require('../models/Asset');
const Consumable = require('../models/Consumable');

// READ: Daftar inventaris (read-only)
exports.listAssets = async (req, res) => {
    try {
        const assets = await Asset.findActiveWithRoomOrdered();
        res.render('maintenance/assets', { user: req.session.user, assets });
    } catch (err) {
        res.send(err);
    }
};

// READ: Daftar BHP (read-only)
exports.listConsumables = async (req, res) => {
    try {
        const consumables = await Consumable.findAll();
        res.render('consumables/index', { user: req.session.user, consumables });
    } catch (err) {
        res.send(err);
    }
};

// List Procurement Review
exports.listReview = async (req, res) => {
    try {
        const selectedYear = req.query.year || null;

        const drafts = await ProcurementDraft.findAllWithKalab(selectedYear);
        const years = await ProcurementDraft.findDistinctYears();

        res.render('procurement_review/index', {
            user: req.session.user,
            drafts,
            years,
            selectedYear
        });
    } catch (err) {
        res.send(err);
    }
};

// Detail & Edit Persetujuan (Review Draft)
exports.showReview = async (req, res) => {
    try {
        const draftId = req.params.id;

        const draft = await ProcurementDraft.findByIdWithKalab(draftId);
        if (!draft) {
            return res.send('Draft tidak ditemukan');
        }

        const items = await ProcurementItem.findByDraft(draftId);

        res.render('procurement_review/edit', {
            user: req.session.user,
            draft,
            items
        });
    } catch (err) {
        res.send(err);
    }
};

// Finalisasi Persetujuan
exports.finalizeReview = async (req, res) => {
    try {
        const draftId = req.params.id;
        const itemIds = req.body.item_ids || [];
        const statuses = req.body.statuses || [];
        const finalReasons = req.body.final_reasons || [];

        const allowedStatuses = [
            'Pending',
            'Disetujui',
            'Ditolak'
        ];

        for (let i = 0; i < itemIds.length; i++) {
            const itemId = itemIds[i];
            const status = statuses[i];
            const finalReason = finalReasons[i] && finalReasons[i].trim() !== '' ? finalReasons[i] : null;

            if (!allowedStatuses.includes(status)) {
                continue;
            }

            // update item status & final reason
            await ProcurementItem.updateStatus(itemId, draftId, status, finalReason);
        }

        // Cek jika ada item dengan status pending
        const pendingCount = await ProcurementItem.countPending(draftId);

        if (pendingCount > 0) {
            return res.send(`<script>alert('Gagal: Masih ada item pengadaan dengan status Pending. Semua item harus Disetujui atau Ditolak terlebih dahulu sebelum difinalisasi!'); window.location.href='/kaprodi/procurement-review/edit/${draftId}';</script>`);
        }

        // lock draft (change status to 'Locked')
        await ProcurementDraft.setLocked(draftId);
        res.redirect('/kaprodi/procurement-review');

    } catch (err) {
        res.send(err);
    }
};