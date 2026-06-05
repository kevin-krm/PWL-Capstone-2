const QRCode = require('qrcode');
const db = require('../config/database');
const Asset = require('../models/Asset');
const Room = require('../models/Room');
const Consumable = require('../models/Consumable');
const ProcurementItem = require('../models/ProcurementItem');
const ItemReceipt = require('../models/ItemReceipt');

// READ: Daftar BHP/Consumables (read-only untuk StafAdmin)
exports.listConsumables = async (req, res) => {
    const consumables = await Consumable.findAll();
    res.render('consumables/index', { user: req.session.user, consumables });
};

// CRUD INVENTARIS (ASSETS)

// READ: Menampilkan daftar aset
exports.listAssets = async (req, res) => {
    const assets = await Asset.findAllWithRoom();
    res.render('assets/index', { user: req.session.user, assets });
};

// EDIT FORM: Halaman edit aset
exports.showEditAsset = async (req, res) => {
    const assetEdit = await Asset.findById(req.params.id);
    if (assetEdit) {
        const rooms = await Room.findAll();
        res.render('assets/edit', { user: req.session.user, assetEdit, rooms });
    } else {
        res.redirect('/stafadmin/assets');
    }
};

// POST EDIT
exports.updateAsset = async (req, res) => {
    try {
        const { room_id, item_name, label_code, condition_status, is_active } = req.body;
        let qrCodeUrl = null;
        if (label_code && label_code.trim() !== '') {
            qrCodeUrl = await QRCode.toDataURL(label_code);
        }
        await Asset.update(req.params.id, { room_id, item_name, label_code, qr_code_url: qrCodeUrl, condition_status, is_active });
        res.redirect('/stafadmin/assets');
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.send("<script>alert('Gagal: Kode Label bentrok dengan barang lain!'); window.history.back();</script>");
        }
        throw err;
    }
};

// POST DELETE
exports.deleteAsset = async (req, res) => {
    await Asset.remove(req.params.id);
    res.redirect('/stafadmin/assets');
};

// PENERIMAAN & LABELING
// READ: Daftar barang pengadaan disetujui & draf Locked
exports.listPenerimaan = async (req, res) => {
    try {
        const items = await ProcurementItem.findReceivableItems();
        const receipts = await ItemReceipt.findAllWithReceiver();

        // Group receipts by procurement_item_id
        const receiptsByItem = {};
        receipts.forEach(r => {
            if (!receiptsByItem[r.procurement_item_id]) {
                receiptsByItem[r.procurement_item_id] = [];
            }
            receiptsByItem[r.procurement_item_id].push(r);
        });

        res.render('penerimaan/index', {
            user: req.session.user,
            items,
            receiptsByItem
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server.');
    }
};

// Fitur 1: GET Form Penerimaan Barang Parsial
exports.showReceiptForm = async (req, res) => {
    try {
        const itemId = req.params.id;

        const item = await ProcurementItem.findReceiptTarget(itemId);
        if (!item) {
            return res.send("<script>alert('Barang tidak ditemukan atau belum disetujui/locked.'); window.location.href='/stafadmin/penerimaan';</script>");
        }

        const totalReceived = await ItemReceipt.sumReceived(itemId);
        const remainingQuantity = item.target_quantity - totalReceived;

        res.render('stafadmin/receipt', {
            user: req.session.user,
            item,
            totalReceived,
            remainingQuantity
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server.');
    }
};

// Fitur 1: POST Form Penerimaan Barang Parsial
exports.createReceipt = async (req, res) => {
    const conn = db.promise();
    try {
        const itemId = req.params.id;
        const quantityReceived = parseInt(req.body.quantity_received, 10);
        const receivedDate = req.body.received_date;
        const stafAdminId = req.session.user.id;

        if (!quantityReceived || quantityReceived <= 0 || !receivedDate) {
            return res.send("<script>alert('Gagal: Input kuantitas atau tanggal tidak valid.'); window.history.back();</script>");
        }

        // Start database transaction
        await conn.beginTransaction();

        // Lock item and get quantity + type details
        const item = await ProcurementItem.lockForReceipt(itemId, conn);
        if (!item) {
            await conn.rollback();
            return res.send("<script>alert('Gagal: Barang tidak ditemukan.'); window.location.href='/stafadmin/penerimaan';</script>");
        }
        const targetQuantity = item.quantity;
        const itemType = item.item_type;
        const itemName = item.item_name;

        // Lock and get current receipts sum
        const totalReceived = await ItemReceipt.sumReceived(itemId, conn);

        if (totalReceived + quantityReceived > targetQuantity) {
            await conn.rollback();
            return res.send(`<script>alert('Gagal: Jumlah yang diterima (${quantityReceived}) melebihi sisa yang harus diterima (${targetQuantity - totalReceived}).'); window.history.back();</script>`);
        }

        // Insert new receipt
        await ItemReceipt.create({
            procurement_item_id: itemId,
            staf_admin_id: stafAdminId,
            quantity_received: quantityReceived,
            received_date: receivedDate
        }, conn);

        // Jika BHP, otomatis masukkan/update ke tabel consumables
        if (itemType === 'BHP') {
            const existing = await Consumable.findIdByName(itemName, conn);
            if (existing) {
                await Consumable.addStock(existing.id, quantityReceived, conn);
            } else {
                await Consumable.create({ item_name: itemName, stock: quantityReceived, unit: 'Pcs' }, conn);
            }
        }

        await conn.commit();
        return res.send("<script>alert('Berhasil menginput penerimaan barang!'); window.location.href='/stafadmin/penerimaan';</script>");
    } catch (err) {
        await conn.rollback();
        console.error(err);
        return res.send("<script>alert('Terjadi kesalahan sistem saat menyimpan penerimaan.'); window.history.back();</script>");
    }
};

// Fitur 2: GET Form Registrasi Aset & Generate Label/Barcode
exports.showRegisterAsset = async (req, res) => {
    try {
        const receiptId = req.params.id;

        const receipt = await ItemReceipt.findForRegister(receiptId);
        if (!receipt) {
            return res.send("<script>alert('Penerimaan barang tidak ditemukan.'); window.location.href='/stafadmin/penerimaan';</script>");
        }

        // Restrict only to Inventaris
        if (receipt.item_type !== 'Inventaris') {
            return res.send("<script>alert('Gagal: Registrasi aset hanya diperbolehkan untuk barang bertipe Inventaris.'); window.location.href='/stafadmin/penerimaan';</script>");
        }

        // Block if already registered
        if (receipt.is_registered) {
            return res.send("<script>alert('Penerimaan ini sudah didaftarkan ke inventaris.'); window.location.href='/stafadmin/penerimaan';</script>");
        }

        // Fetch rooms dropdown data
        const rooms = await Room.findAllOrdered();

        // Fetch next auto increment number based on max(id) from assets
        const nextId = (await Asset.getMaxId()) + 1;
        const paddedIncrement = String(nextId).padStart(3, '0');

        // If this is a replacement item, fetch info about the old asset being replaced
        let replacementAsset = null;
        if (receipt.target_replacement_asset_id) {
            replacementAsset = await Asset.findReplacementInfo(receipt.target_replacement_asset_id);
        }

        res.render('stafadmin/register_asset', {
            user: req.session.user,
            receipt,
            rooms,
            paddedIncrement,
            replacementAsset
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server.');
    }
};

// Fitur 2: POST Form Registrasi Aset & Generate Label/Barcode (MULTI-ROW, PER-UNIT ROOM)
exports.registerAsset = async (req, res) => {
    const conn = db.promise();
    try {
        const receiptId = req.params.id;
        const { label_prefix, old_asset_new_room_id, old_asset_new_label } = req.body;

        // room_id can be a single value or an array (per-unit allocation)
        let roomIds = req.body.room_id;
        if (!roomIds) roomIds = [];
        if (!Array.isArray(roomIds)) roomIds = [roomIds];

        if (!label_prefix || label_prefix.trim() === '') {
            return res.send("<script>alert('Gagal: Prefix Label harus diisi.'); window.history.back();</script>");
        }

        // Fetch receipt to get item_name, quantity, and replacement target
        const receipt = await ItemReceipt.findForRegisterTxn(receiptId, conn);
        if (!receipt) {
            return res.send("<script>alert('Gagal: Penerimaan barang tidak ditemukan.'); window.location.href='/stafadmin/penerimaan';</script>");
        }

        if (receipt.item_type !== 'Inventaris') {
            return res.send("<script>alert('Gagal: Hanya barang bertipe Inventaris yang bisa diregistrasikan.'); window.location.href='/stafadmin/penerimaan';</script>");
        }
        if (receipt.is_registered) {
            return res.send("<script>alert('Penerimaan ini sudah didaftarkan ke inventaris.'); window.location.href='/stafadmin/penerimaan';</script>");
        }

        const quantityReceived = receipt.quantity_received;
        const isReplacement = !!receipt.target_replacement_asset_id;

        // Validate room allocation only for non-replacement items
        if (!isReplacement && (roomIds.length === 0 || roomIds.some(r => !r))) {
            return res.send("<script>alert('Gagal: Semua alokasi ruangan harus dipilih.'); window.history.back();</script>");
        }

        await conn.beginTransaction();

        // --- Handle Replacement Asset ---
        if (isReplacement) {
            const oldAssetId = receipt.target_replacement_asset_id;

            // Fetch old asset's current room (this will be the new asset's room)
            const oldAsset = await Asset.findBasicById(oldAssetId, conn);
            if (!oldAsset) {
                await conn.rollback();
                return res.send("<script>alert('Gagal: Aset lama yang digantikan tidak ditemukan.'); window.history.back();</script>");
            }
            const newAssetRoomId = oldAsset.room_id; // new assets go to old asset's room

            // Validate old asset relocation fields
            if (!old_asset_new_room_id || !old_asset_new_label || old_asset_new_label.trim() === '') {
                await conn.rollback();
                return res.send("<script>alert('Gagal: Ruangan baru dan Kode Label baru untuk aset lama harus diisi.'); window.history.back();</script>");
            }

            // Update the old asset: move it to the new room and assign a new label
            const newOldQrUrl = await QRCode.toDataURL(old_asset_new_label.trim());
            await Asset.relocateOld(oldAssetId, {
                room_id: old_asset_new_room_id,
                label_code: old_asset_new_label.trim(),
                qr_code_url: newOldQrUrl,
                condition_status: 'Rusak'
            }, conn);

            // Insert new assets all in the old asset's original room
            let nextId = (await Asset.getMaxId(conn)) + 1;

            for (let i = 0; i < quantityReceived; i++) {
                const paddedNum = String(nextId + i).padStart(3, '0');
                const labelCode = `${label_prefix}-${paddedNum}`;
                const qrCodeUrl = await QRCode.toDataURL(labelCode);
                await Asset.insertNew({
                    room_id: newAssetRoomId,
                    item_name: receipt.item_name,
                    label_code: labelCode,
                    qr_code_url: qrCodeUrl
                }, conn);
            }

        } else {
            // --- Handle Regular Registration with Per-Unit Room Assignment ---
            let nextId = (await Asset.getMaxId(conn)) + 1;

            for (let i = 0; i < quantityReceived; i++) {
                // If fewer room selectors were added than units, use the last specified room for the remainder
                const assignedRoomId = roomIds[i] || roomIds[roomIds.length - 1];
                const paddedNum = String(nextId + i).padStart(3, '0');
                const labelCode = `${label_prefix}-${paddedNum}`;
                const qrCodeUrl = await QRCode.toDataURL(labelCode);
                await Asset.insertNew({
                    room_id: assignedRoomId,
                    item_name: receipt.item_name,
                    label_code: labelCode,
                    qr_code_url: qrCodeUrl
                }, conn);
            }
        }

        // Mark receipt as registered
        await ItemReceipt.markRegistered(receiptId, conn);

        await conn.commit();
        return res.send(`<script>alert('Berhasil mendaftarkan ${quantityReceived} unit aset baru!'); window.location.href='/stafadmin/penerimaan';</script>`);
    } catch (err) {
        await conn.rollback();
        if (err.code === 'ER_DUP_ENTRY') {
            return res.send("<script>alert('Gagal: Salah satu Kode Label sudah digunakan! Coba prefix atau label yang berbeda.'); window.history.back();</script>");
        }
        console.error(err);
        return res.send("<script>alert('Terjadi kesalahan sistem saat mendaftarkan aset.'); window.history.back();</script>");
    }
};