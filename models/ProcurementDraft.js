const db = require('../config/database');
const pool = db.promise();

const ProcurementDraft = {
    // Daftar semua draf + nama kalab (kaprodi review & approval)
    async findAllWithKalab(conn = pool) {
        const [rows] = await conn.query(`
            SELECT
                procurement_drafts.*,
                users.name AS kalab_name
            FROM procurement_drafts
            LEFT JOIN users
                ON procurement_drafts.kalab_id = users.id
            ORDER BY procurement_drafts.created_at DESC
        `);
        return rows;
    },

    async findByIdWithKalab(id, conn = pool) {
        const [rows] = await conn.query(`
            SELECT
                procurement_drafts.*,
                users.name AS kalab_name
            FROM procurement_drafts
            LEFT JOIN users
                ON procurement_drafts.kalab_id = users.id
            WHERE procurement_drafts.id = ?
        `, [id]);
        return rows[0] || null;
    },

    async setReviewed(id, conn = pool) {
        const [result] = await conn.query(
            "UPDATE procurement_drafts SET status = 'Reviewed' WHERE id = ?",
            [id]
        );
        return result;
    },

    async setLocked(id, conn = pool) {
        const [result] = await conn.query(
            "UPDATE procurement_drafts SET status = 'Locked' WHERE id = ?",
            [id]
        );
        return result;
    },

    // Daftar draf milik seorang kalab
    async findByKalab(kalabId, conn = pool) {
        const [rows] = await conn.query(
            'SELECT * FROM procurement_drafts WHERE kalab_id = ? ORDER BY created_at DESC',
            [kalabId]
        );
        return rows;
    },

    async create({ kalab_id, year, status }, conn = pool) {
        const [result] = await conn.query(
            'INSERT INTO procurement_drafts (kalab_id, year, status) VALUES (?, ?, ?)',
            [kalab_id, year, status]
        );
        return result;
    },

    // Draf milik kalab tertentu + nama kalab (edit & detail)
    async findOwnedWithKalab(id, kalabId, conn = pool) {
        const [rows] = await conn.query(`
            SELECT d.*, u.name AS kalab_name
            FROM procurement_drafts d
            JOIN users u ON d.kalab_id = u.id
            WHERE d.id = ? AND d.kalab_id = ?
        `, [id, kalabId]);
        return rows[0] || null;
    },

    // Status draf milik kalab tertentu (validasi update/delete)
    async findStatusOwned(id, kalabId, conn = pool) {
        const [rows] = await conn.query(
            'SELECT status FROM procurement_drafts WHERE id = ? AND kalab_id = ?',
            [id, kalabId]
        );
        return rows[0] || null;
    },

    async remove(id, conn = pool) {
        const [result] = await conn.query('DELETE FROM procurement_drafts WHERE id = ?', [id]);
        return result;
    }
};

module.exports = ProcurementDraft;
