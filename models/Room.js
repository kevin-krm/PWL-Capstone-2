const db = require('../config/database');
const pool = db.promise();

const Room = {
    async findAll(sort = null, conn = pool) {
        let sql = 'SELECT * FROM rooms';

        switch (sort) {
            case 'abjad':
                sql += ' ORDER BY room_name ASC';
                break;
            case 'recent':
                sql += ' ORDER BY created_at DESC';
                break;
            case 'no':
                sql += ' ORDER BY id ASC';
                break;
            default:
                break;
        }

        const [rows] = await conn.query(sql);
        return rows;
    },

    async findAllOrdered(conn = pool) {
        const [rows] = await conn.query('SELECT * FROM rooms ORDER BY room_name ASC');
        return rows;
    },

    async findById(id, conn = pool) {
        const [rows] = await conn.query('SELECT * FROM rooms WHERE id = ?', [id]);
        return rows[0] || null;
    },

    // Ruang penyimpanan/gudang (tujuan otomatis aset lama yang digantikan)
    async findStorageRoom(conn = pool) {
        const [rows] = await conn.query(
            "SELECT * FROM rooms WHERE room_type = 'storage' ORDER BY id ASC LIMIT 1"
        );
        return rows[0] || null;
    },

    async create({ room_name, description }, conn = pool) {
        const [result] = await conn.query(
            'INSERT INTO rooms (room_name, description) VALUES (?, ?)',
            [room_name, description]
        );
        return result;
    },

    async update(id, { room_name, description }, conn = pool) {
        const [result] = await conn.query(
            'UPDATE rooms SET room_name=?, description=? WHERE id=?',
            [room_name, description, id]
        );
        return result;
    },

    async remove(id, conn = pool) {
        const [result] = await conn.query('DELETE FROM rooms WHERE id=?', [id]);
        return result;
    }
};

module.exports = Room;