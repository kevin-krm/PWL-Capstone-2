const db = require('../config/database');
const pool = db.promise();

const User = {
    async findByEmail(email, conn = pool) {
        const [rows] = await conn.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0] || null;
    },

    async findById(id, conn = pool) {
        const [rows] = await conn.query('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0] || null;
    },

    async findAll(conn = pool) {
        const [rows] = await conn.query('SELECT * FROM users');
        return rows;
    },

    async emailExists(email, conn = pool) {
        const [rows] = await conn.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows.length > 0;
    },

    async emailExistsForOther(email, id, conn = pool) {
        const [rows] = await conn.query('SELECT * FROM users WHERE email = ? AND id != ?', [email, id]);
        return rows.length > 0;
    },

    async create({ name, email, password, role, is_active }, conn = pool) {
        const [result] = await conn.query(
            'INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)',
            [name, email, password, role, is_active]
        );
        return result;
    },

    async updateWithPassword(id, { name, email, password, role, is_active }, conn = pool) {
        const [result] = await conn.query(
            'UPDATE users SET name=?, email=?, password=?, role=?, is_active=? WHERE id=?',
            [name, email, password, role, is_active, id]
        );
        return result;
    },

    async updateWithoutPassword(id, { name, email, role, is_active }, conn = pool) {
        const [result] = await conn.query(
            'UPDATE users SET name=?, email=?, role=?, is_active=? WHERE id=?',
            [name, email, role, is_active, id]
        );
        return result;
    },

    async remove(id, conn = pool) {
        const [result] = await conn.query('DELETE FROM users WHERE id=?', [id]);
        return result;
    }
};

module.exports = User;