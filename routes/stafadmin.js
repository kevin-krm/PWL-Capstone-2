const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middlewares/authMiddleware');
const stafAdminController = require('../controllers/stafAdminController');

// Kunci akses HANYA untuk Staf Administrasi
router.use(checkAuth('Staf Administrasi'));

// CRUD Inventaris (Assets)
router.get('/assets', stafAdminController.listAssets);
router.get('/assets/create', stafAdminController.showCreateAsset);
router.get('/assets/edit/:id', stafAdminController.showEditAsset);
router.post('/assets/add', stafAdminController.createAsset);
router.post('/assets/edit/:id', stafAdminController.updateAsset);
router.post('/assets/delete/:id', stafAdminController.deleteAsset);

// Penerimaan & Labeling
router.get('/penerimaan', stafAdminController.listPenerimaan);
router.get('/procurement/:id/receipt', stafAdminController.showReceiptForm);
router.post('/procurement/:id/receipt', stafAdminController.createReceipt);
router.get('/receipt/:id/register-asset', stafAdminController.showRegisterAsset);
router.post('/receipt/:id/register-asset', stafAdminController.registerAsset);

module.exports = router;