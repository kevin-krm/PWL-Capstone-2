const bcrypt = require('bcryptjs');
const User = require('../models/User');

// GET /login
exports.showLogin = (req, res) => {
    res.render('login');
};

// POST /login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    // 1. CARI PENGGUNA BERDASARKAN EMAIL SAJA
    const user = await User.findByEmail(email);

    if (user) {
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
};

// GET /logout
exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/login');
};