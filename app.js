const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');

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

// Import Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const kaprodiRoutes = require('./routes/kaprodi');

// Gunakan Routes
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/kaprodi', kaprodiRoutes);

// Redirect otomatis dari rute root (/) ke halaman /login
app.get('/', (req, res) => {
    res.redirect('/login');
});

module.exports = app;