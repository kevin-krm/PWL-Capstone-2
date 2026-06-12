const db = require('../config/database');
const pool = db.promise();

const ProcurementDraft = {
    // Daftar semua draf + nama kalab (kaprodi review & approval)
    async findAllWithKalab(filters = {}, conn = pool) {
        let sql = `
            SELECT
                procurement_drafts.*,
                users.name AS kalab_name
            FROM procurement_drafts
            LEFT JOIN users
                ON procurement_drafts.kalab_id = users.id
        `;
        const params = [];
        const conditions = [];

        if (filters.year) {
            conditions.push('procurement_drafts.year = ?');
            params.push(filters.year);
        }
        if (filters.status) {
            conditions.push('procurement_drafts.status = ?');
            params.push(filters.status);
        }
        if (filters.action === 'reviewable') {
            conditions.push("procurement_drafts.status != 'Locked'");
        } else if (filters.action === 'final') {
            conditions.push("procurement_drafts.status = 'Locked'");
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        switch (filters.sort) {
            case 'abjad':
                sql += ' ORDER BY users.name ASC, procurement_drafts.created_at DESC';
                break;
            case 'recent':
                sql += ' ORDER BY procurement_drafts.created_at DESC';
                break;
            case 'no':
                sql += ' ORDER BY procurement_drafts.id ASC';
                break;
            default:
                sql += ' ORDER BY procurement_drafts.created_at DESC';
                break;
        }

        const [rows] = await conn.query(sql, params);
        return rows;
    },

    async findDistinctYears(conn = pool) {
        const [rows] = await conn.query('SELECT DISTINCT year FROM procurement_drafts ORDER BY year DESC');
        return rows.map(r => r.year);
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

    async setLocked(id, conn = pool) {
        const [result] = await conn.query(
            "UPDATE procurement_drafts SET status = 'Locked' WHERE id = ?",
            [id]
        );
        return result;
    },

    // Daftar draf milik seorang kalab
    async findByKalab(kalabId, filters = {}, conn = pool) {
        let sql = 'SELECT * FROM procurement_drafts WHERE kalab_id = ?';
        const params = [kalabId];

        if (filters.year) {
            sql += ' AND year = ?';
            params.push(filters.year);
        }
        if (filters.status) {
            sql += ' AND status = ?';
            params.push(filters.status);
        }

        switch (filters.sort) {
            case 'abjad':
                sql += ' ORDER BY status ASC, created_at DESC';
                break;
            case 'recent':
                sql += ' ORDER BY created_at DESC';
                break;
            case 'no':
                sql += ' ORDER BY id ASC';
                break;
            default:
                sql += ' ORDER BY created_at DESC';
                break;
        }

        const [rows] = await conn.query(sql, params);
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
