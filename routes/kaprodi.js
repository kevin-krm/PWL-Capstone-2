const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middlewares/authMiddleware');
const kaprodiController = require('../controllers/kaprodiController');

// Pengecekan Role
router.use(checkAuth('Ketua Program Studi'));

// Review Draf Pengadaan
router.get('/procurement-review', kaprodiController.listReview);
router.get('/procurement-review/edit/:id', kaprodiController.showReview);
router.post('/procurement-review/edit/:id/finalize', kaprodiController.finalizeReview);

// Pengesahan Draf Pengadaan
router.get('/procurement-approval', kaprodiController.listApproval);
router.get('/procurement-approval/detail/:id', kaprodiController.showApproval);
router.post('/procurement-approval/detail/:id/approve', kaprodiController.approveDraft);

module.exports = router;