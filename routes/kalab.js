const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middlewares/authMiddleware');
const kalabController = require('../controllers/kalabController');
const dashboardController = require('../controllers/dashboardController');

// Akses hanya untuk Kepala Laboratorium
router.use(checkAuth('Kepala Laboratorium'));

// Dashboard Executive (grafik & statistik)
router.get('/dashboard', dashboardController.showDashboard);

// Inventaris & BHP (read-only)
router.get('/assets', kalabController.listAssets);
router.get('/consumables', kalabController.listConsumables);

router.get('/procurement-drafts', kalabController.listDrafts);
router.get('/procurement-drafts/create', kalabController.showCreateDraft);
router.post('/procurement-drafts/create', kalabController.createDraft);
router.get('/procurement-drafts/edit/:id', kalabController.showEditDraft);
router.post('/procurement-drafts/edit/:id', kalabController.updateDraft);
router.post('/procurement-drafts/delete/:id', kalabController.deleteDraft);
router.post('/procurement-drafts/:id/submit', kalabController.submitDraft);

// Rute detail dengan parameter :id harus didefinisikan terakhir
// agar tidak menangkap path statis seperti /create di atasnya
router.get('/procurement-drafts/:id', kalabController.showDraftDetail);

module.exports = router;