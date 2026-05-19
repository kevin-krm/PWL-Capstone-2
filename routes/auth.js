const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.query(
        'SELECT * FROM users WHERE email = ? AND password = ?',
        [email, password],
        (err, results) => {

            if (err) {
                return res.send(err);
            }

            // cek login berhasil
            if (results.length > 0) {
                req.session.user = results[0];

                if (results[0].role === 'Administrator') {
                    return res.redirect('/admin/dashboard');
                } else if (results[0].role === 'Ketua Program Studi') {
                    return res.redirect('/kaprodi/dashboard');
                } else {
                    return res.send('Role tidak cocok');
                }

            } else {
                return res.send('Email atau Password salah!');
            }
        }
    );
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;