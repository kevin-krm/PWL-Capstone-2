const db = require('../config/database');
const pool = db.promise();

const Asset = {
    async findAllWithRoom(conn = pool) {
        const [rows] = await conn.query(`
            SELECT a.*, r.room_name
            FROM assets a
            LEFT JOIN rooms r ON a.room_id = r.id
        `);
        return rows;
    },

    async findActiveWithRoomOrdered(conn = pool) {
        const [rows] = await conn.query(`
            SELECT a.*, r.room_name
            FROM assets a
            LEFT JOIN rooms r ON a.room_id = r.id
            WHERE a.is_active = TRUE
            ORDER BY r.room_name ASC, a.item_name ASC
        `);
        return rows;
    },

    async findById(id, conn = pool) {
        const [rows] = await conn.query('SELECT * FROM assets WHERE id = ?', [id]);
        return rows[0] || null;
    },

    async findByIdWithRoom(id, conn = pool) {
        const [rows] = await conn.query(`
            SELECT a.*, r.room_name
            FROM assets a
            LEFT JOIN rooms r ON a.room_id = r.id
            WHERE a.id = ?
        `, [id]);
        return rows[0] || null;
    },

    async findActive(conn = pool) {
        const [rows] = await conn.query('SELECT * FROM assets WHERE is_active = 1');
        return rows;
    },

    async findByRoom(roomId, conn = pool) {
        const [rows] = await conn.query('SELECT * FROM assets WHERE room_id = ?', [roomId]);
        return rows;
    },

    // Info aset lama yang akan digantikan (untuk form registrasi aset pengganti)
    async findReplacementInfo(id, conn = pool) {
        const [rows] = await conn.query(`
            SELECT a.id, a.item_name, a.label_code, a.room_id, r.room_name
            FROM assets a
            LEFT JOIN rooms r ON a.room_id = r.id
            WHERE a.id = ?
        `, [id]);
        return rows[0] || null;
    },

    // Data dasar aset lama di dalam transaksi registrasi pengganti
    async findBasicById(id, conn = pool) {
        const [rows] = await conn.query('SELECT id, room_id, label_code FROM assets WHERE id = ?', [id]);
        return rows[0] || null;
    },

    async getMaxId(conn = pool) {
        const [rows] = await conn.query('SELECT MAX(id) AS max_id FROM assets');
        return rows[0].max_id || 0;
    },

    async create({ room_id, item_name, label_code, qr_code_url, condition_status }, conn = pool) {
        const [result] = await conn.query(
            'INSERT INTO assets (room_id, item_name, label_code, qr_code_url, condition_status) VALUES (?, ?, ?, ?, ?)',
            [room_id, item_name, label_code, qr_code_url, condition_status]
        );
        return result;
    },

    async update(id, { room_id, item_name, label_code, qr_code_url, condition_status, is_active }, conn = pool) {
        const [result] = await conn.query(
            'UPDATE assets SET room_id=?, item_name=?, label_code=?, qr_code_url=?, condition_status=?, is_active=? WHERE id=?',
            [room_id, item_name, label_code, qr_code_url, condition_status, is_active, id]
        );
        return result;
    },

    async remove(id, conn = pool) {
        const [result] = await conn.query('DELETE FROM assets WHERE id=?', [id]);
        return result;
    },

    // Pindahkan & ganti label aset lama (registrasi aset pengganti)
    async relocateOld(id, { room_id, label_code, qr_code_url, condition_status }, conn = pool) {
        const [result] = await conn.query(
            'UPDATE assets SET room_id = ?, label_code = ?, qr_code_url = ?, condition_status = ? WHERE id = ?',
            [room_id, label_code, qr_code_url, condition_status, id]
        );
        return result;
    },

    // Insert aset baru hasil registrasi (kondisi Baik, aktif)
    async insertNew({ room_id, item_name, label_code, qr_code_url }, conn = pool) {
        const [result] = await conn.query(`
            INSERT INTO assets (room_id, item_name, label_code, qr_code_url, condition_status, is_active)
            VALUES (?, ?, ?, ?, 'Baik', TRUE)
        `, [room_id, item_name, label_code, qr_code_url]);
        return result;
    },

    async updateCondition(id, condition_status, conn = pool) {
        const [result] = await conn.query(
            'UPDATE assets SET condition_status = ? WHERE id = ?',
            [condition_status, id]
        );
        return result;
    }
};

module.exports = Asset;