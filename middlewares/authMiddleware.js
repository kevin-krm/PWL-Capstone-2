const checkAuth = (role) => {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        if (req.session.user.role !== role) {
            return res.send('Akses Ditolak. Anda bukan ' + role);
        }
        next();
    };
};

module.exports = { checkAuth };