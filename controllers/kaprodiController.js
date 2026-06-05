const ProcurementDraft = require('../models/ProcurementDraft');
const ProcurementItem = require('../models/ProcurementItem');

// List Procurement Review
exports.listReview = async (req, res) => {
    try {
        const drafts = await ProcurementDraft.findAllWithKalab();
        res.render('procurement_review/index', {
            user: req.session.user,
            drafts
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
            await ProcurementItem.updateStatus(itemId, draftId, status);
        }

        // lock draft (change status to 'Reviewed')
        await ProcurementDraft.setReviewed(draftId);
        res.redirect('/kaprodi/procurement-review');

    } catch (err) {
        res.send(err);
    }
};

// List Procurement Approval (Pengesahan)
exports.listApproval = async (req, res) => {
    try {
        const drafts = await ProcurementDraft.findAllWithKalab();
        res.render('procurement_approval/index', {
            user: req.session.user,
            drafts
        });
    } catch (err) {
        res.send(err);
    }
};

// Detail Pengesahan Draf
exports.showApproval = async (req, res) => {
    try {
        const draftId = req.params.id;

        const draft = await ProcurementDraft.findByIdWithKalab(draftId);
        if (!draft) {
            return res.send('Draft tidak ditemukan');
        }

        const items = await ProcurementItem.findByDraftWithReplacement(draftId);

        res.render('procurement_approval/detail', {
            user: req.session.user,
            draft,
            items
        });
    } catch (err) {
        res.send(err);
    }
};

// Aksi Pengesahan Draf (Approve/Ratify)
exports.approveDraft = async (req, res) => {
    try {
        const draftId = req.params.id;

        // Cek jika status asset pending, maka tidak bisa disahkan
        const pendingCount = await ProcurementItem.countPending(draftId);

        if (pendingCount > 0) {
            return res.send(`<script>alert('Gagal: Masih ada item pengadaan dengan status Pending. Semua item harus Disetujui atau Ditolak terlebih dahulu sebelum disahkan!'); window.location.href='/kaprodi/procurement-approval/detail/${draftId}';</script>`);
        }

        // Jika disahkan maka status = locked
        await ProcurementDraft.setLocked(draftId);
        res.redirect('/kaprodi/procurement-approval');
    } catch (err) {
        res.send(err);
    }
};