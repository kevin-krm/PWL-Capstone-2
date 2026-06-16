const ProcurementDraft = require('../models/ProcurementDraft');
const ProcurementItem = require('../models/ProcurementItem');
const Asset = require('../models/Asset');
const Consumable = require('../models/Consumable');
const ActivityLog = require('../models/ActivityLog');

// READ: Daftar inventaris (read-only)
exports.listAssets = async (req, res) => {
    try {
        const sort = req.query.sort || null;
        const condition = req.query.condition || null;
        const assets = await Asset.findAllWithRoom({ sort, condition });
        res.render('maintenance/assets', { user: req.session.user, assets, selectedSort: sort, selectedCondition: condition });
    } catch (err) {
        res.send(err);
    }
};

// READ: Daftar BHP (read-only)
exports.listConsumables = async (req, res) => {
    try {
        const sort = req.query.sort || null;
        const consumables = await Consumable.findAll(sort);
        res.render('consumables/index', { user: req.session.user, consumables, selectedSort: sort });
    } catch (err) {
        res.send(err);
    }
};

// List Procurement Review
exports.listReview = async (req, res) => {
    try {
        const selectedYear = req.query.year || null;
        const selectedStatus = req.query.status || null;
        const selectedAction = req.query.action || null;
        const selectedSort = req.query.sort || null;

        const drafts = await ProcurementDraft.findAllWithKalab({ year: selectedYear, status: selectedStatus, action: selectedAction, sort: selectedSort });
        const years = await ProcurementDraft.findDistinctYears();

        res.render('procurement_review/index', {
            user: req.session.user,
            drafts,
            years,
            selectedYear,
            selectedStatus,
            selectedAction,
            selectedSort
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

        const items = await ProcurementItem.findByDraftWithReplacement(draftId);

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

        // Guard: hanya draf berstatus 'Reviewed' yang boleh difinalisasi.
        // Mencegah finalisasi ulang draf yang sudah 'Locked' (yang bisa mengubah
        // keputusan setelah barang diterima/diregistrasi) maupun draf 'Draft'
        // yang belum diajukan Kalab. Dicek SEBELUM ada mutasi item apa pun.
        const draft = await ProcurementDraft.findByIdWithKalab(draftId);
        if (!draft) {
            return res.send('Draft tidak ditemukan');
        }
        if (draft.status !== 'Reviewed') {
            return res.send(`<script>alert('Gagal: Draft ini tidak dapat difinalisasi. Hanya draft berstatus "Reviewed" (sudah diajukan Kalab & belum dikunci) yang bisa difinalisasi.'); window.location.href='/kaprodi/procurement-review';</script>`);
        }

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
        
        // Log Activity
        ActivityLog.logAction(
            req.session.user.id, 
            'Lock Draft Pengadaan', 
            `Melakukan finalisasi (Lock) pada draft pengadaan ID #${draftId}`
        );

        res.redirect('/kaprodi/procurement-review');

    } catch (err) {
        res.send(err);
    }
};