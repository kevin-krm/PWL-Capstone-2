const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkAuth } = require('../middlewares/authMiddleware');
const bcrypt = require('bcryptjs');

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

// CREATE: Proses tambah pengguna (Dengan Validasi Email & Password Hashing)
router.post('/users/add', (req, res) => {
    const { name, email, password, role, is_active } = req.body;

    // 1. Cek apakah email sudah terdaftar
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            return res.send(`
                <script>
                    alert('Gagal: Email "${email}" sudah terdaftar di sistem! Gunakan email lain.');
                    window.history.back();
                </script>
            `);
        }

        // 2. HASH PASSWORD SEBELUM DISIMPAN
        const hashedPassword = bcrypt.hashSync(password, 10);

        // 3. Jika email aman, jalankan insert dengan hashedPassword
        db.query('INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, role, is_active], (err) => {
                if (err) throw err;
                res.redirect('/admin/users');
            });
    });
});

// UPDATE: Proses edit pengguna (Dengan Validasi Email & Pengecekan Password)
router.post('/users/edit/:id', (req, res) => {
    const { name, email, password, role, is_active } = req.body;
    const userId = req.params.id;

    // 1. Cek apakah email baru sudah dipakai oleh orang LAIN
    db.query('SELECT * FROM users WHERE email = ? AND id != ?', [email, userId], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            return res.send(`
                <script>
                    alert('Gagal: Email "${email}" sudah digunakan oleh pengguna lain!');
                    window.history.back();
                </script>
            `);
        }

        // 2. Logika Update berdasarkan isi kolom password
        if (password) {
            // Jika kolom password diisi teks baru, lakukan hashing
            const hashedPassword = bcrypt.hashSync(password, 10);
            db.query('UPDATE users SET name=?, email=?, password=?, role=?, is_active=? WHERE id=?',
                [name, email, hashedPassword, role, is_active, userId], (err) => {
                    if (err) throw err;
                    res.redirect('/admin/users');
                });
        } else {
            // Jika password dikosongkan, JANGAN sentuh kolom password di database
            db.query('UPDATE users SET name=?, email=?, role=?, is_active=? WHERE id=?',
                [name, email, role, is_active, userId], (err) => {
                    if (err) throw err;
                    res.redirect('/admin/users');
                });
        }
    });
});

// DELETE: Proses hapus pengguna
router.post('/users/delete/:id', (req, res) => {
    db.query('DELETE FROM users WHERE id=?', [req.params.id], (err) => {
        if (err) {
            if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
                return res.send(`
                    <script>
                        alert('Gagal menghapus: Pengguna ini tidak bisa dihapus karena masih memiliki riwayat aktivitas (seperti pengadaan/maintenance) di dalam sistem!');
                        window.history.back();
                    </script>
                `);
            }
            throw err;
        }
        res.redirect('/admin/users');
    });
});

// PROSES CRUD RUANGAN
router.get('/rooms', (req, res) => {
    db.query('SELECT * FROM rooms', (err, results) => {
        if (err) throw err;
        res.render('rooms/index', { user: req.session.user, rooms: results });
    });
});

router.get('/rooms/create', (req, res) => {
    res.render('rooms/create', { user: req.session.user });
});

router.get('/rooms/edit/:id', (req, res) => {
    db.query('SELECT * FROM rooms WHERE id = ?', [req.params.id], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            res.render('rooms/edit', { user: req.session.user, roomEdit: results[0] });
        } else {
            res.redirect('/admin/rooms');
        }
    });
});

router.post('/rooms/add', (req, res) => {
    const { room_name, description } = req.body;
    db.query('INSERT INTO rooms (room_name, description) VALUES (?, ?)',
        [room_name, description], (err) => {
            if (err) throw err;
            res.redirect('/admin/rooms');
        });
});

router.post('/rooms/edit/:id', (req, res) => {
    const { room_name, description } = req.body;
    db.query('UPDATE rooms SET room_name=?, description=? WHERE id=?',
        [room_name, description, req.params.id], (err) => {
            if (err) throw err;
            res.redirect('/admin/rooms');
        });
});

router.post('/rooms/delete/:id', (req, res) => {
    const roomId = req.params.id;
    db.query('SELECT * FROM assets WHERE room_id = ?', [roomId], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            return res.send(`
                <script>
                    alert('Gagal menghapus: Ruangan ini tidak bisa dihapus karena masih berisi ${results.length} aset laboratorium!');
                    window.history.back();
                </script>
            `);
        }
        db.query('DELETE FROM rooms WHERE id=?', [roomId], (err) => {
            if (err) throw err;
            res.redirect('/admin/rooms');
        });
    });
});

module.exports = router;