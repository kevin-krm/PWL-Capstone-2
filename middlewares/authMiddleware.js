const checkAuth = (role) => {
    return (req, res, next) => {
        // 1. Jika pengguna belum login sama sekali, arahkan ke halaman login
        if (!req.session.user) {
            return res.redirect('/login');
        }

        // 2. Cek apakah role pengguna sesuai dengan yang diizinkan
        const userRole = req.session.user.role;
        let hasAccess = false;

        if (Array.isArray(role)) {
            if (role.includes(userRole)) {
                hasAccess = true;
            }
        } else {
            if (userRole === role) {
                hasAccess = true;
            }
        }

        // 3. Jika role TIDAK sesuai, arahkan ke halaman 403 (tanpa me-logout user)
        if (!hasAccess) {
            return res.redirect('/403');
        }

        // 4. Jika lolos semua pengecekan, lanjutkan ke rute berikutnya
        next();
    };
};

module.exports = { checkAuth };