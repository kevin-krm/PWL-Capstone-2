const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Halaman utama (landing) per role — dipakai redirect login, 403, & change-password
const ROLE_HOME = {
    'Administrator': '/admin/dashboard',
    'Staf Administrasi': '/stafadmin/assets',
    'Staf Laboratorium': '/staflab/consumables',
    'Ketua Program Studi': '/kaprodi/procurement-review',
    'Kepala Laboratorium': '/kalab/procurement-drafts'
};
const roleHome = (role) => ROLE_HOME[role] || '/login';

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

// GET /403 - Halaman akses ditolak (role tidak sesuai)
exports.show403 = (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.status(403).render('403', {
        user: req.session.user,
        homeUrl: roleHome(req.session.user.role)
    });
};

// POST /change-password - Ubah password sendiri (verifikasi password lama)
exports.changePassword = async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const { old_password, new_password, confirm_password } = req.body;
    const backUrl = req.get('Referer') || roleHome(req.session.user.role);
    const alertBack = (msg) =>
        res.send(`<script>alert(${JSON.stringify(msg)}); window.location.href=${JSON.stringify(backUrl)};</script>`);

    try {
        if (!old_password || !new_password || !confirm_password) {
            return alertBack('Gagal: Semua kolom password wajib diisi.');
        }
        if (new_password.length < 6) {
            return alertBack('Gagal: Password baru minimal 6 karakter.');
        }
        if (new_password !== confirm_password) {
            return alertBack('Gagal: Konfirmasi password baru tidak cocok.');
        }

        // Ambil hash terbaru dari DB lalu verifikasi password lama
        const user = await User.findById(req.session.user.id);
        if (!user) return res.redirect('/login');

        if (!bcrypt.compareSync(old_password, user.password)) {
            return alertBack('Gagal: Password lama salah.');
        }
        if (bcrypt.compareSync(new_password, user.password)) {
            return alertBack('Gagal: Password baru tidak boleh sama dengan password lama.');
        }

        const newHash = bcrypt.hashSync(new_password, 10);
        await User.updatePassword(user.id, newHash);
        req.session.user.password = newHash; // jaga sesi tetap konsisten

        return alertBack('Berhasil: Password telah diperbarui.');
    } catch (err) {
        console.error('changePassword error:', err);
        return alertBack('Terjadi kesalahan sistem saat mengubah password.');
    }
};