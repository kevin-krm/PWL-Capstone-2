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
            if (results[0].role === 'Administrator') res.redirect('/admin/dashboard');
            // Rambahkan redirect untuk Kalab, Kaprodi, dll di sini jika sudah ada
            else res.send('Login berhasil, tapi rute dashboard belum dibuat untuk role ini.');
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