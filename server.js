const app = require('./app');

// Tentukan Port
const PORT = 3000;

// Jalankan Server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});