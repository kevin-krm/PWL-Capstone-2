const db = require('../config/database');
const pool = db.promise();

const ItemReceipt = {
    // Semua penerimaan + nama penerima (halaman penerimaan)
    async findAllWithReceiver(conn = pool) {
        const [rows] = await conn.query(`
            SELECT
                ir.id AS receipt_id,
                ir.procurement_item_id,
                ir.quantity_received,
                ir.received_date,
                ir.is_registered,
                u.name AS receiver_name
            FROM item_receipts ir
            LEFT JOIN users u ON ir.staf_admin_id = u.id
            ORDER BY ir.received_date DESC
        `);
        return rows;
    },

    async sumReceived(itemId, conn = pool) {
        const [rows] = await conn.query(`
            SELECT COALESCE(SUM(quantity_received), 0) AS total_received
            FROM item_receipts
            WHERE procurement_item_id = ?
        `, [itemId]);
        return parseInt(rows[0].total_received, 10);
    },

    async create({ procurement_item_id, staf_admin_id, quantity_received, received_date }, conn = pool) {
        const [result] = await conn.query(`
            INSERT INTO item_receipts (procurement_item_id, staf_admin_id, quantity_received, received_date)
            VALUES (?, ?, ?, ?)
        `, [procurement_item_id, staf_admin_id, quantity_received, received_date]);
        return result;
    },

    // Penerimaan + detail item & draf untuk form registrasi aset
    async findForRegister(id, conn = pool) {
        const [rows] = await conn.query(`
            SELECT
                ir.id AS receipt_id,
                ir.quantity_received,
                ir.is_registered,
                pi.id AS item_id,
                pi.item_name,
                pi.item_type,
                pi.target_replacement_asset_id,
                pd.year
            FROM item_receipts ir
            JOIN procurement_items pi ON ir.procurement_item_id = pi.id
            JOIN procurement_drafts pd ON pi.draft_id = pd.id
            WHERE ir.id = ?
        `, [id]);
        return rows[0] || null;
    },

    // Data penerimaan di dalam transaksi registrasi aset
    async findForRegisterTxn(id, conn = pool) {
        const [rows] = await conn.query(`
            SELECT ir.quantity_received, ir.is_registered, pi.item_name, pi.item_type,
                   pi.target_replacement_asset_id
            FROM item_receipts ir
            JOIN procurement_items pi ON ir.procurement_item_id = pi.id
            WHERE ir.id = ?
        `, [id]);
        return rows[0] || null;
    },

    async markRegistered(id, conn = pool) {
        const [result] = await conn.query('UPDATE item_receipts SET is_registered = TRUE WHERE id = ?', [id]);
        return result;
    }
};

module.exports = ItemReceipt;