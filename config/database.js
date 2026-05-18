const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'capstone_lab_inventory'
});

db.connect((err) => {
    if (err) {
        console.error('Error koneksi database:', err);
        return;
    }
    console.log('Terhubung ke database MySQL capstone_lab_inventory.');
});

module.exports = db;