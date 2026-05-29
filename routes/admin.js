const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkAuth } = require('../middlewares/authMiddleware');

// Hanya 'Administrator' yang bisa akses
router.use(checkAuth('Administrator'));

// 1. Rute Dashboard
router.get('/dashboard', (req, res) => {
    res.render('starter', { user: req.session.user });
});

// PROSES CRUD PENGGUNA

// 2. Rute Kelola Pengguna (READ)
router.get('/users', (req, res) => {
    db.query('SELECT * FROM users', (err, results) => {
        if (err) throw err;
        res.render('users/index', { user: req.session.user, users: results });
    });
});

// Form Tambah Pengguna
router.get('/users/create', (req, res) => {
    res.render('users/create', { user: req.session.user });
});

// Form Edit Pengguna
router.get('/users/edit/:id', (req, res) => {
    db.query('SELECT * FROM users WHERE id = ?', [req.params.id], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            res.render('users/edit', { user: req.session.user, userEdit: results[0] });
        } else {
            res.redirect('/admin/users');
        }
    });
});

// CREATE: Proses tambah pengguna
router.post('/users/add', (req, res) => {
    const { name, email, password, role, is_active } = req.body;
    db.query('INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)',
        [name, email, password, role, is_active], (err) => {
            if (err) throw err;
            res.redirect('/admin/users');
        });
});

// UPDATE: Proses edit pengguna
router.post('/users/edit/:id', (req, res) => {
    const { name, email, password, role, is_active } = req.body;
    db.query('UPDATE users SET name=?, email=?, password=?, role=?, is_active=? WHERE id=?',
        [name, email, password, role, is_active, req.params.id], (err) => {
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

// Rute Kelola Ruangan
router.get('/rooms', (req, res) => {
    db.query('SELECT * FROM rooms', (err, results) => {
        if (err) throw err;
        // PENTING: Menggunakan 'rooms/index'
        res.render('rooms/index', { user: req.session.user, rooms: results });
    });
});

// Form Tambah Ruangan
router.get('/rooms/create', (req, res) => {
    res.render('rooms/create', { user: req.session.user });
});

// Form Edit Ruangan
router.get('/rooms/edit/:id', (req, res) => {
    db.query('SELECT * FROM rooms WHERE id = ?', [req.params.id], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            // Mengirim data ruangan lama dengan variabel 'roomEdit'
            res.render('rooms/edit', { user: req.session.user, roomEdit: results[0] });
        } else {
            res.redirect('/admin/rooms');
        }
    });
});

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

module.exports = router;