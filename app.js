const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

// Konfigurasi View Engine (Pug)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public'))); // Folder static untuk AdminLTE
app.use(session({
    secret: 'capstone_secret_key_123',
    resave: false,
    saveUninitialized: true
}));

// Import Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

// Gunakan Routes
app.use('/', authRoutes);
app.use('/admin', adminRoutes);

// Jalankan Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});