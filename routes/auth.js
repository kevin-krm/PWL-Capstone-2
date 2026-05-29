const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');

router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;

    // 1. CARI PENGGUNA BERDASARKAN EMAIL SAJA
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            const user = results[0];

            // 2. BANDINGKAN PASSWORD KETIKAN DENGAN HASH DI DATABASE
            const isMatch = bcrypt.compareSync(password, user.password);

            if (isMatch) {
                // Pengecekan Status Aktif
                if (!user.is_active || user.is_active === 0) {
                    return res.send(`
                        <script>
                            alert('Login Gagal: Akun Anda telah dinonaktifkan. Silakan hubungi Administrator.');
                            window.location.href = '/login';
                        </script>
                    `);
                }

                // Jika akun aktif dan sandi cocok, buat sesi dan redirect
                req.session.user = user;
                const userRole = user.role;

                if (userRole === 'Administrator') res.redirect('/admin/dashboard');
                else if (userRole === 'Staf Administrasi') res.redirect('/stafadmin/assets');
                else if (userRole === 'Staf Laboratorium') res.redirect('/staflab/consumables');
                else if (userRole === 'Ketua Program Studi') res.redirect('/kaprodi/procurement-review');
                else if (userRole === 'Kepala Laboratorium') res.redirect('/kalab/procurement-drafts');
                else res.send('Dashboard untuk role ini belum tersedia.');

            } else {
                // Jika password (isMatch) salah
                res.send(`
                    <script>
                        alert('Login Gagal: Email atau Password salah!');
                        window.location.href = '/login';
                    </script>
                `);
            }
        } else {
            // Jika email tidak ditemukan sama sekali di database
            res.send(`
                <script>
                    alert('Login Gagal: Email atau Password salah!');
                    window.location.href = '/login';
                </script>
            `);
        }
    });
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;