const db = require('../config/database');
const pool = db.promise();

const Consumable = {
    async findAll(conn = pool) {
        const [rows] = await conn.query('SELECT * FROM consumables');
        return rows;
    },

    async findById(id, conn = pool) {
        const [rows] = await conn.query('SELECT * FROM consumables WHERE id = ?', [id]);
        return rows[0] || null;
    },

    async findInStockOrdered(conn = pool) {
        const [rows] = await conn.query('SELECT * FROM consumables WHERE stock > 0 ORDER BY item_name ASC');
        return rows;
    },

    async findIdByName(name, conn = pool) {
        const [rows] = await conn.query('SELECT id FROM consumables WHERE item_name = ?', [name]);
        return rows[0] || null;
    },

    // Kunci baris untuk validasi stok di dalam transaksi maintenance
    async lockById(id, conn = pool) {
        const [rows] = await conn.query('SELECT stock, item_name FROM consumables WHERE id = ? FOR UPDATE', [id]);
        return rows[0] || null;
    },

    async create({ item_name, stock, unit }, conn = pool) {
        const [result] = await conn.query(
            'INSERT INTO consumables (item_name, stock, unit) VALUES (?, ?, ?)',
            [item_name, stock, unit]
        );
        return result;
    },

    async update(id, { item_name, stock, unit }, conn = pool) {
        const [result] = await conn.query(
            'UPDATE consumables SET item_name=?, stock=?, unit=? WHERE id=?',
            [item_name, stock, unit, id]
        );
        return result;
    },

    async remove(id, conn = pool) {
        const [result] = await conn.query('DELETE FROM consumables WHERE id=?', [id]);
        return result;
    },

    async addStock(id, quantity, conn = pool) {
        const [result] = await conn.query('UPDATE consumables SET stock = stock + ? WHERE id = ?', [quantity, id]);
        return result;
    },

    async reduceStock(id, quantity, conn = pool) {
        const [result] = await conn.query('UPDATE consumables SET stock = stock - ? WHERE id = ?', [quantity, id]);
        return result;
    }
};

module.exports = Consumable;