const db = require('../config/database');
const pool = db.promise();

const ProcurementItem = {
    async findByDraft(draftId, conn = pool) {
        const [rows] = await conn.query(
            'SELECT * FROM procurement_items WHERE draft_id = ? ORDER BY id ASC',
            [draftId]
        );
        return rows;
    },

    // Item draf + info aset yang digantikan (detail pengesahan & detail kalab)
    async findByDraftWithReplacement(draftId, conn = pool) {
        const [rows] = await conn.query(`
            SELECT pi.*, a.item_name AS replaced_asset_name, a.label_code AS replaced_asset_label
            FROM procurement_items pi
            LEFT JOIN assets a ON pi.target_replacement_asset_id = a.id
            WHERE pi.draft_id = ?
            ORDER BY pi.id ASC
        `, [draftId]);
        return rows;
    },

    async updateStatus(itemId, draftId, status, finalReason = null, conn = pool) {
        const [result] = await conn.query(
            'UPDATE procurement_items SET status = ?, final_reason = ? WHERE id = ? AND draft_id = ?',
            [status, finalReason, itemId, draftId]
        );
        return result;
    },

    async countPending(draftId, conn = pool) {
        const [rows] = await conn.query(
            'SELECT COUNT(*) AS pending_count FROM procurement_items WHERE draft_id = ? AND status = "Pending"',
            [draftId]
        );
        return rows[0].pending_count;
    },

    // Bulk insert item draf; values berupa array of array
    async bulkInsert(values, conn = pool) {
        const [result] = await conn.query(`
            INSERT INTO procurement_items
            (draft_id, item_type, item_name, price, quantity, purchase_link, status, target_replacement_asset_id, reason)
            VALUES ?
        `, [values]);
        return result;
    },

    async deleteByDraft(draftId, conn = pool) {
        const [result] = await conn.query('DELETE FROM procurement_items WHERE draft_id = ?', [draftId]);
        return result;
    },

    // Item yang sudah disetujui & draf terkunci, beserta jumlah yang sudah diterima (halaman penerimaan)
    async findReceivableItems(filters = {}, conn = pool) {
        let sql = `
            SELECT
                pi.id AS item_id,
                pi.item_name,
                pi.item_type,
                pi.price,
                pi.quantity AS target_quantity,
                pi.purchase_link,
                pi.target_replacement_asset_id,
                pd.year,
                COALESCE(SUM(ir.quantity_received), 0) AS quantity_received
            FROM procurement_items pi
            JOIN procurement_drafts pd ON pi.draft_id = pd.id
            LEFT JOIN item_receipts ir ON pi.id = ir.procurement_item_id
            WHERE pi.status = 'Disetujui' AND pd.status = 'Locked'
        `;
        const params = [];

        if (filters.type) {
            sql += ' AND pi.item_type = ?';
            params.push(filters.type);
        }

        sql += ' GROUP BY pi.id, pd.year';

        // Filter by reception status using HAVING clause
        if (filters.status === 'belum') {
            sql += ' HAVING quantity_received = 0';
        } else if (filters.status === 'sebagian') {
            sql += ' HAVING quantity_received > 0 AND quantity_received < pi.quantity';
        } else if (filters.status === 'selesai') {
            sql += ' HAVING quantity_received >= pi.quantity';
        }

        switch (filters.sort) {
            case 'abjad':
                sql += ' ORDER BY pi.item_name ASC';
                break;
            case 'recent':
                sql += ' ORDER BY pi.id DESC';
                break;
            case 'no':
                sql += ' ORDER BY pi.id ASC';
                break;
            case 'target_asc':
                sql += ' ORDER BY target_quantity ASC';
                break;
            case 'target_desc':
                sql += ' ORDER BY target_quantity DESC';
                break;
            case 'diterima_asc':
                sql += ' ORDER BY quantity_received ASC';
                break;
            case 'diterima_desc':
                sql += ' ORDER BY quantity_received DESC';
                break;
            case 'terima_asc':
                sql += ' ORDER BY (pi.quantity - quantity_received) ASC';
                break;
            case 'terima_desc':
                sql += ' ORDER BY (pi.quantity - quantity_received) DESC';
                break;
            default:
                sql += ' ORDER BY pd.year DESC, pi.item_name ASC';
                break;
        }

        const [rows] = await conn.query(sql, params);
        return rows;
    },

    // Detail item untuk form penerimaan (harus Disetujui & draf Locked)
    async findReceiptTarget(id, conn = pool) {
        const [rows] = await conn.query(`
            SELECT
                pi.id AS item_id,
                pi.item_name,
                pi.item_type,
                pi.quantity AS target_quantity,
                pd.year
            FROM procurement_items pi
            JOIN procurement_drafts pd ON pi.draft_id = pd.id
            WHERE pi.id = ? AND pi.status = 'Disetujui' AND pd.status = 'Locked'
        `, [id]);
        return rows[0] || null;
    },

    // Kunci item di dalam transaksi penerimaan
    async lockForReceipt(id, conn = pool) {
        const [rows] = await conn.query(`
            SELECT quantity, item_type, item_name
            FROM procurement_items
            WHERE id = ? AND status = 'Disetujui'
            FOR UPDATE
        `, [id]);
        return rows[0] || null;
    }
};

module.exports = ProcurementItem;