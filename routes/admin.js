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

// 2. Rute Kelola Pengguna
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

module.exports = router;