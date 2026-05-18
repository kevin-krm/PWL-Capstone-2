const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkAuth } = require('../middlewares/authMiddleware');

// Hanya 'Administrator' yang bisa akses
router.use(checkAuth('Administrator'));

router.get('/dashboard', (req, res) => {
    res.render('admin/dashboard', { user: req.session.user });
});

router.get('/users', (req, res) => {
    db.query('SELECT * FROM users', (err, results) => {
        if (err) throw err;
        res.render('admin/users', { user: req.session.user, users: results });
    });
});

module.exports = router;