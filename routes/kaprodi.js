const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middlewares/authMiddleware');
const kaprodiController = require('../controllers/kaprodiController');
const dashboardController = require('../controllers/dashboardController');

// Pengecekan Role
router.use(checkAuth('Ketua Program Studi'));

// Dashboard Executive (grafik & statistik)
router.get('/dashboard', dashboardController.showDashboard);

// Inventaris & BHP (read-only)
router.get('/assets', kaprodiController.listAssets);
router.get('/consumables', kaprodiController.listConsumables);

// Review Draf Pengadaan
router.get('/procurement-review', kaprodiController.listReview);
router.get('/procurement-review/edit/:id', kaprodiController.showReview);
router.post('/procurement-review/edit/:id/finalize', kaprodiController.finalizeReview);


module.exports = router;