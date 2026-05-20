const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkAuth } = require('../middlewares/authMiddleware');

// Hanya 'Administrator' yang bisa akses
router.use(checkAuth('Administrator'));

// 1. Rute Dashboard
router.get('/dashboard', (req, res) => {
    res.render('admin/dashboard', { user: req.session.user });
});

// 2. Rute Kelola Pengguna (READ)
router.get('/users', (req, res) => {
    db.query('SELECT * FROM users', (err, results) => {
        if (err) throw err;
        res.render('admin/users', { user: req.session.user, users: results });
    });
});

// 3. Rute Kelola Ruangan
router.get('/rooms', (req, res) => {
    db.query('SELECT * FROM rooms', (err, results) => {
        if (err) throw err;
        res.render('admin/rooms', { user: req.session.user, rooms: results });
    });
});


// PROSES CRUD PENGGUNA

// CREATE: Proses tambah pengguna
router.post('/users/add', (req, res) => {
    const { name, email, password, role } = req.body;
    db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, password, role], (err) => {
            if (err) throw err;
            res.redirect('/admin/users'); // Kembali ke halaman pengguna setelah berhasil
        });
});

// UPDATE: Proses edit pengguna
router.post('/users/edit/:id', (req, res) => {
    const { name, email, password, role } = req.body;
    db.query('UPDATE users SET name=?, email=?, password=?, role=? WHERE id=?',
        [name, email, password, role, req.params.id], (err) => {
            if (err) throw err;
            res.redirect('/admin/users');
        });
});

// DELETE: Proses hapus pengguna
router.post('/users/delete/:id', (req, res) => {
    db.query('DELETE FROM users WHERE id=?', [req.params.id], (err) => {
        if (err) throw err;
        res.redirect('/admin/users');
    });
});

// PROSES CRUD RUANGAN

// CREATE: Proses tambah ruangan
router.post('/rooms/add', (req, res) => {
    const { room_name, description } = req.body;
    db.query('INSERT INTO rooms (room_name, description) VALUES (?, ?)',
        [room_name, description], (err) => {
            if (err) throw err;
            res.redirect('/admin/rooms');
        });
});

// UPDATE: Proses edit ruangan
router.post('/rooms/edit/:id', (req, res) => {
    const { room_name, description } = req.body;
    db.query('UPDATE rooms SET room_name=?, description=? WHERE id=?',
        [room_name, description, req.params.id], (err) => {
            if (err) throw err;
            res.redirect('/admin/rooms');
        });
});

// DELETE: Proses hapus ruangan
router.post('/rooms/delete/:id', (req, res) => {
    db.query('DELETE FROM rooms WHERE id=?', [req.params.id], (err) => {
        if (err) throw err;
        res.redirect('/admin/rooms');
    });
});

// PROSES CRUD INVENTARIS (ASSETS)

router.get('/assets', (req, res) => {
    const query = `
        SELECT a.*, r.room_name 
        FROM assets a 
        LEFT JOIN rooms r ON a.room_id = r.id
    `;
    db.query(query, (err, assets) => {
        if (err) throw err;
        db.query('SELECT * FROM rooms', (err, rooms) => {
            if (err) throw err;
            res.render('admin/assets', { user: req.session.user, assets, rooms });
        });
    });
});

router.post('/assets/add', (req, res) => {
    const { room_id, item_name, label_code, condition_status } = req.body;
    db.query('INSERT INTO assets (room_id, item_name, label_code, condition_status) VALUES (?, ?, ?, ?)',
        [room_id, item_name, label_code, condition_status], (err) => {
            if (err) throw err;
            res.redirect('/admin/assets');
        });
});

router.post('/assets/edit/:id', (req, res) => {
    const { room_id, item_name, label_code, condition_status, is_active } = req.body;
    db.query('UPDATE assets SET room_id=?, item_name=?, label_code=?, condition_status=?, is_active=? WHERE id=?',
        [room_id, item_name, label_code, condition_status, is_active, req.params.id], (err) => {
            if (err) throw err;
            res.redirect('/admin/assets');
        });
});

router.post('/assets/delete/:id', (req, res) => {
    db.query('DELETE FROM assets WHERE id=?', [req.params.id], (err) => {
        if (err) throw err;
        res.redirect('/admin/assets');
    });
});


// PROSES CRUD BHP (CONSUMABLES)

router.get('/consumables', (req, res) => {
    db.query('SELECT * FROM consumables', (err, consumables) => {
        if (err) throw err;
        res.render('admin/consumables', { user: req.session.user, consumables });
    });
});

router.post('/consumables/add', (req, res) => {
    const { item_name, stock, unit } = req.body;
    db.query('INSERT INTO consumables (item_name, stock, unit) VALUES (?, ?, ?)',
        [item_name, stock, unit], (err) => {
            if (err) throw err;
            res.redirect('/admin/consumables');
        });
});

router.post('/consumables/edit/:id', (req, res) => {
    const { item_name, stock, unit } = req.body;
    db.query('UPDATE consumables SET item_name=?, stock=?, unit=? WHERE id=?',
        [item_name, stock, unit, req.params.id], (err) => {
            if (err) throw err;
            res.redirect('/admin/consumables');
        });
});

router.post('/consumables/delete/:id', (req, res) => {
    db.query('DELETE FROM consumables WHERE id=?', [req.params.id], (err) => {
        if (err) throw err;
        res.redirect('/admin/consumables');
    });
});

module.exports = router;