const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const { autoGenerateMissingQRCodes } = require('./utils/qrHelper');

const app = express();

// Konfigurasi View Engine (Pug)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Folder static untuk AdminLTE
app.use(session({
    secret: 'capstone_secret_key_123',
    resave: false,
    saveUninitialized: true
}));

// Notifikasi sidebar (titik biru) -> res.locals.notif, dibaca sidebar.pug
const { loadNotifications } = require('./middlewares/notificationMiddleware');
app.use(loadNotifications);

// Import Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const kaprodiRoutes = require('./routes/kaprodi');
const stafadminRoutes = require('./routes/stafadmin');
const staflabRoutes = require('./routes/staflab');
const kalabRoutes = require('./routes/kalab');

// Gunakan Routes
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/kaprodi', kaprodiRoutes);
app.use('/stafadmin', stafadminRoutes);
app.use('/staflab', staflabRoutes);
app.use('/kalab', kalabRoutes);

// Redirect otomatis dari rute root (/) ke halaman /login
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Jalankan Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    autoGenerateMissingQRCodes();
    console.log(`Server berjalan di http://localhost:${PORT}`);
});