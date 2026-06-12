const db = require('../config/database');
const pool = db.promise();

const MaintenanceLog = {
    async create({ asset_id, staf_lab_id, maintenance_date, description }, conn = pool) {
        const [result] = await conn.query(
            'INSERT INTO maintenance_logs (asset_id, staf_lab_id, maintenance_date, description) VALUES (?, ?, ?, ?)',
            [asset_id, staf_lab_id, maintenance_date, description]
        );
        return result;
    },

    // Semua log maintenance (dengan info aset, ruangan, staf)
    async findAllDetailed(sort = null, conn = pool) {
        let sql = `
            SELECT
                ml.id,
                ml.maintenance_date,
                ml.description,
                ml.created_at,
                a.item_name AS asset_name,
                a.label_code,
                a.condition_status,
                r.room_name,
                u.name AS staf_name
            FROM maintenance_logs ml
            JOIN assets a ON ml.asset_id = a.id
            LEFT JOIN rooms r ON a.room_id = r.id
            JOIN users u ON ml.staf_lab_id = u.id
        `;

        switch (sort) {
            case 'abjad':
                sql += ' ORDER BY a.item_name ASC';
                break;
            case 'recent':
                sql += ' ORDER BY ml.maintenance_date DESC, ml.created_at DESC';
                break;
            case 'no':
                sql += ' ORDER BY ml.id ASC';
                break;
            default:
                sql += ' ORDER BY ml.maintenance_date DESC, ml.created_at DESC';
                break;
        }

        const [rows] = await conn.query(sql);
        return rows;
    },

    async findByIdDetailed(id, conn = pool) {
        const [rows] = await conn.query(`
            SELECT
                ml.id,
                ml.maintenance_date,
                ml.description,
                ml.created_at,
                a.id AS asset_id,
                a.item_name AS asset_name,
                a.label_code,
                a.condition_status,
                r.room_name,
                u.name AS staf_name
            FROM maintenance_logs ml
            JOIN assets a ON ml.asset_id = a.id
            LEFT JOIN rooms r ON a.room_id = r.id
            JOIN users u ON ml.staf_lab_id = u.id
            WHERE ml.id = ?
        `, [id]);
        return rows[0] || null;
    },

    async addBhpUsage({ maintenance_log_id, consumable_id, quantity_used }, conn = pool) {
        const [result] = await conn.query(
            'INSERT INTO maintenance_bhp_usage (maintenance_log_id, consumable_id, quantity_used) VALUES (?, ?, ?)',
            [maintenance_log_id, consumable_id, quantity_used]
        );
        return result;
    },

    // Semua pemakaian BHP (untuk dikelompokkan per log di halaman daftar)
    async findAllBhpUsage(conn = pool) {
        const [rows] = await conn.query(`
            SELECT
                mbu.maintenance_log_id,
                mbu.quantity_used,
                c.item_name AS consumable_name,
                c.unit
            FROM maintenance_bhp_usage mbu
            JOIN consumables c ON mbu.consumable_id = c.id
        `);
        return rows;
    },

    async findBhpUsageByLog(logId, conn = pool) {
        const [rows] = await conn.query(`
            SELECT
                mbu.quantity_used,
                c.item_name AS consumable_name,
                c.unit
            FROM maintenance_bhp_usage mbu
            JOIN consumables c ON mbu.consumable_id = c.id
            WHERE mbu.maintenance_log_id = ?
        `, [logId]);
        return rows;
    },

    // Riwayat pemakaian BHP lengkap dengan info ruangan & aset (halaman log pemakaian BHP)
    async findAllBhpUsageWithRoom(sort = null, conn = pool) {
        let sql = `
            SELECT
                mbu.quantity_used,
                c.item_name AS consumable_name,
                c.unit,
                ml.maintenance_date,
                a.item_name AS asset_name,
                a.label_code,
                r.room_name,
                u.name AS staf_name
            FROM maintenance_bhp_usage mbu
            JOIN consumables c ON mbu.consumable_id = c.id
            JOIN maintenance_logs ml ON mbu.maintenance_log_id = ml.id
            JOIN assets a ON ml.asset_id = a.id
            LEFT JOIN rooms r ON a.room_id = r.id
            JOIN users u ON ml.staf_lab_id = u.id
        `;

        switch (sort) {
            case 'abjad':
                sql += ' ORDER BY c.item_name ASC';
                break;
            case 'recent':
                sql += ' ORDER BY ml.maintenance_date DESC, ml.id DESC';
                break;
            case 'no':
                sql += ' ORDER BY mbu.id ASC';
                break;
            default:
                sql += ' ORDER BY ml.maintenance_date DESC, ml.id DESC';
                break;
        }

        const [rows] = await conn.query(sql);
        return rows;
    }
};

module.exports = MaintenanceLog;