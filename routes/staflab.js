const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middlewares/authMiddleware');
const stafLabController = require('../controllers/stafLabController');
const dashboardController = require('../controllers/dashboardController');

// Kunci akses HANYA untuk Staf Laboratorium
router.use(checkAuth('Staf Laboratorium'));

// Dashboard Executive (grafik & statistik)
router.get('/dashboard', dashboardController.showDashboard);

// CRUD BHP (Consumables)
router.get('/consumables', stafLabController.listConsumables);
router.get('/bhp-usage-log', stafLabController.listBhpUsageLog);
router.get('/consumables/edit/:id', stafLabController.showEditConsumable);
router.post('/consumables/edit/:id', stafLabController.updateConsumable);
router.post('/consumables/delete/:id', stafLabController.deleteConsumable);

// Data Inventaris (read-only)
router.get('/assets', stafLabController.listAssets);
router.post('/assets/delete/:id', stafLabController.deleteAsset);

// Maintenance & update kondisi barang
router.get('/assets/maintenance/:id', stafLabController.showMaintenanceForm);
router.post('/assets/maintenance/:id', stafLabController.createMaintenance);

// Log Maintenance
router.get('/maintenance-logs', stafLabController.listLogs);
router.get('/maintenance-logs/:id', stafLabController.showLogDetail);

module.exports = router;