const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            req.session.user = results[0];
            const userRole = results[0].role;

            // REDIRECT BERDASARKAN ROLE
            if (userRole === 'Administrator') {
                res.redirect('/admin/dashboard');

            } else if (userRole === 'Staf Administrasi') {
                res.redirect('/stafadmin/assets');

            } else if (userRole === 'Staf Laboratorium') {
                res.redirect('/staflab/consumables');

            } else if (userRole === 'Ketua Program Studi') {
                res.redirect('/kaprodi/procurement-review');

            } else if (userRole === 'Kepala Laboratorium') {
                res.redirect('/kalab/procurement-drafts');

            } else {
                res.send('Dashboard untuk role ini belum tersedia.');
            }
        } else {
            res.send('Email atau Password salah!');
        }
    });
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;