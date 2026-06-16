const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middlewares/authMiddleware');
const stafAdminController = require('../controllers/stafAdminController');
const dashboardController = require('../controllers/dashboardController');

// Kunci akses HANYA untuk Staf Administrasi
router.use(checkAuth('Staf Administrasi'));

// Dashboard Executive (grafik & statistik)
router.get('/dashboard', dashboardController.showDashboard);

// BHP (read-only)
router.get('/consumables', stafAdminController.listConsumables);

// CRUD Inventaris (Assets)
router.get('/assets', stafAdminController.listAssets);
router.get('/assets/edit/:id', stafAdminController.showEditAsset);
router.post('/assets/edit/:id', stafAdminController.updateAsset);

// Penerimaan & Labeling
router.get('/penerimaan', stafAdminController.listPenerimaan);
router.get('/procurement/:id/receipt', stafAdminController.showReceiptForm);
router.post('/procurement/:id/receipt', stafAdminController.createReceipt);
router.get('/receipt/:id/register-asset', stafAdminController.showRegisterAsset);
router.post('/receipt/:id/register-asset', stafAdminController.registerAsset);

module.exports = router;