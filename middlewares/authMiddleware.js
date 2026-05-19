const checkAuth = (role) => {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        if (Array.isArray(role)) {
            if (!role.includes(req.session.user.role)) {
                return res.redirect('/login');
            }
        } else {
            if (req.session.user.role !== role) {
                return res.redirect('/login');
            }
        }
        next();
    };
};

module.exports = { checkAuth };