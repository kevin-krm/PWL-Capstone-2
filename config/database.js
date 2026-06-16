const mysql = require('mysql2');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'capstone_lab_inventory',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, conn) => {
    if (err) {
        console.error('Error koneksi database:', err);
        return;
    }
    console.log('Terhubung ke database MySQL capstone_lab_inventory.');
    conn.release();
});

module.exports = db;
