const db = require('../config/database');
const Consumable = require('../models/Consumable');
const Asset = require('../models/Asset');
const MaintenanceLog = require('../models/MaintenanceLog');

// CRUD BHP (CONSUMABLES)

// READ: Menampilkan daftar BHP
exports.listConsumables = async (req, res) => {
    const sort = req.query.sort || null;
    const consumables = await Consumable.findAll(sort);
    res.render('consumables/index', { user: req.session.user, consumables, selectedSort: sort });
};

// CREATE FORM: Halaman tambah BHP
exports.showCreateConsumable = (req, res) => {
    res.render('consumables/create', { user: req.session.user });
};

// EDIT FORM: Halaman edit BHP
exports.showEditConsumable = async (req, res) => {
    const consumableEdit = await Consumable.findById(req.params.id);
    if (consumableEdit) {
        res.render('consumables/edit', { user: req.session.user, consumableEdit });
    } else {
        res.redirect('/staflab/consumables');
    }
};

// POST CREATE
exports.createConsumable = async (req, res) => {
    const { item_name, stock, unit } = req.body;
    await Consumable.create({ item_name, stock, unit });
    res.redirect('/staflab/consumables');
};

// POST EDIT
exports.updateConsumable = async (req, res) => {
    const { item_name, stock, unit } = req.body;
    await Consumable.update(req.params.id, { item_name, stock, unit });
    res.redirect('/staflab/consumables');
};

// POST DELETE
exports.deleteConsumable = async (req, res) => {
    await Consumable.remove(req.params.id);
    res.redirect('/staflab/consumables');
};

// DATA INVENTARIS (READ-ONLY Staf Lab)

// READ: Menampilkan daftar aset staf lab
exports.listAssets = async (req, res) => {
    const sort = req.query.sort || null;
    const condition = req.query.condition || null;
    const assets = await Asset.findActiveWithRoomOrdered({ sort, condition });
    res.render('maintenance/assets', { user: req.session.user, assets, selectedSort: sort, selectedCondition: condition });
};

// MAINTENANCE & UPDATE KONDISI BARANG

// GET: Form maintenance untuk satu aset
exports.showMaintenanceForm = async (req, res) => {
    try {
        const assetId = req.params.id;

        // Ambil data aset
        const asset = await Asset.findByIdWithRoom(assetId);
        if (!asset) {
            return res.send("<script>alert('Aset tidak ditemukan.'); window.history.back();</script>");
        }

        // Ambil daftar BHP yang stoknya > 0
        const consumables = await Consumable.findInStockOrdered();

        res.render('maintenance/form', {
            user: req.session.user,
            asset,
            consumables,
            errorMsg: null,
            oldInput: null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server.');
    }
};

// Helper: render ulang form maintenance dengan pesan error + input sebelumnya,
// sehingga baris BHP yang sudah diisi user tetap dipertahankan (tidak hilang).
async function renderMaintenanceFormError(res, user, assetId, errorMsg, oldInput) {
    const asset = await Asset.findByIdWithRoom(assetId);
    if (!asset) {
        return res.send("<script>alert('Aset tidak ditemukan.'); window.location.href='/staflab/assets';</script>");
    }
    const consumables = await Consumable.findInStockOrdered();
    return res.render('maintenance/form', { user, asset, consumables, errorMsg, oldInput });
}

// POST: Proses maintenance — update kondisi, catat log, kurangi stok BHP
exports.createMaintenance = async (req, res) => {
    const conn = db.promise();
    const assetId = req.params.id;
    let oldInput = {};
    try {
        const stafLabId = req.session.user.id;
        const { condition_status, maintenance_date, description } = req.body;

        // Normalisasi input BHP (bisa array atau single value)
        let bhpIds = req.body['bhp_id[]'] || req.body.bhp_id || [];
        let bhpQtys = req.body['bhp_qty[]'] || req.body.bhp_qty || [];

        if (!Array.isArray(bhpIds)) bhpIds = [bhpIds];
        if (!Array.isArray(bhpQtys)) bhpQtys = [bhpQtys];

        // Rekonstruksi baris BHP persis seperti yang diisi user (untuk re-render saat error)
        const bhpRows = [];
        for (let i = 0; i < bhpIds.length; i++) {
            const id = (bhpIds[i] === undefined || bhpIds[i] === null) ? '' : String(bhpIds[i]);
            const qty = (bhpQtys[i] === undefined || bhpQtys[i] === null) ? '' : String(bhpQtys[i]);
            if (id !== '' || qty !== '') bhpRows.push({ consumable_id: id, quantity_used: qty });
        }
        oldInput = { condition_status, maintenance_date, description, bhpRows };

        // Filter BHP yang valid + AGREGASI baris dengan consumable_id sama
        // (mencegah stok minus bila BHP yang sama dipilih di beberapa baris)
        const usageMap = new Map();
        for (let i = 0; i < bhpIds.length; i++) {
            const id = parseInt(bhpIds[i], 10);
            const qty = parseInt(bhpQtys[i], 10);
            if (id && qty && qty > 0) {
                usageMap.set(id, (usageMap.get(id) || 0) + qty);
            }
        }
        const bhpUsages = [...usageMap].map(([consumable_id, quantity_used]) => ({ consumable_id, quantity_used }));

        // Validasi input dasar
        if (!condition_status || !maintenance_date) {
            return renderMaintenanceFormError(res, req.session.user, assetId, 'Kondisi dan tanggal maintenance wajib diisi.', oldInput);
        }

        await conn.beginTransaction();

        // 1. Validasi stok BHP cukup sebelum memproses
        for (const usage of bhpUsages) {
            const row = await Consumable.lockById(usage.consumable_id, conn);
            if (!row) {
                await conn.rollback();
                return renderMaintenanceFormError(res, req.session.user, assetId, 'BHP yang dipilih tidak ditemukan.', oldInput);
            }
            if (row.stock < usage.quantity_used) {
                await conn.rollback();
                return renderMaintenanceFormError(res, req.session.user, assetId, `Stok ${row.item_name} tidak mencukupi! Tersedia: ${row.stock}, diminta: ${usage.quantity_used}.`, oldInput);
            }
        }

        // 2. Insert maintenance log
        const logResult = await MaintenanceLog.create({
            asset_id: assetId,
            staf_lab_id: stafLabId,
            maintenance_date,
            description: description || null
        }, conn);
        const maintenanceLogId = logResult.insertId;

        // 3. Update kondisi aset
        await Asset.updateCondition(assetId, condition_status, conn);

        // 4. Insert BHP usage & kurangi stok
        for (const usage of bhpUsages) {
            await MaintenanceLog.addBhpUsage({
                maintenance_log_id: maintenanceLogId,
                consumable_id: usage.consumable_id,
                quantity_used: usage.quantity_used
            }, conn);
            await Consumable.reduceStock(usage.consumable_id, usage.quantity_used, conn);
        }

        await conn.commit();
        return res.send("<script>alert('Maintenance berhasil dicatat!'); window.location.href='/staflab/maintenance-logs';</script>");
    } catch (err) {
        await conn.rollback();
        console.error(err);
        try {
            return await renderMaintenanceFormError(res, req.session.user, assetId, 'Terjadi kesalahan sistem saat menyimpan maintenance.', oldInput);
        } catch (e2) {
            return res.send("<script>alert('Terjadi kesalahan sistem.'); window.location.href='/staflab/assets';</script>");
        }
    }
};

// ===== LOG MAINTENANCE =====

// READ: Menampilkan semua log maintenance
exports.listLogs = async (req, res) => {
    try {
        const sort = req.query.sort || null;
        const logs = await MaintenanceLog.findAllDetailed(sort);
        const usages = await MaintenanceLog.findAllBhpUsage();

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
            usagesByLog,
            selectedSort: sort
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server.');
    }
};

// READ: Log riwayat pemakaian BHP (ke ruangan mana BHP dipakai)
exports.listBhpUsageLog = async (req, res) => {
    try {
        const sort = req.query.sort || null;
        const usages = await MaintenanceLog.findAllBhpUsageWithRoom(sort);
        res.render('consumables/usage-log', {
            user: req.session.user,
            usages,
            selectedSort: sort
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server.');
    }
};

// READ: Detail satu log maintenance
exports.showLogDetail = async (req, res) => {
    try {
        const logId = req.params.id;

        const log = await MaintenanceLog.findByIdDetailed(logId);
        if (!log) {
            return res.send("<script>alert('Log maintenance tidak ditemukan.'); window.location.href='/staflab/maintenance-logs';</script>");
        }

        const usages = await MaintenanceLog.findBhpUsageByLog(logId);

        res.render('maintenance/detail', {
            user: req.session.user,
            log,
            usages
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server.');
    }
};
