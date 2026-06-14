const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middlewares/authMiddleware');
const adminController = require('../controllers/adminController');
const dashboardController = require('../controllers/dashboardController');

// Hanya 'Administrator' yang bisa akses
router.use(checkAuth('Administrator'));

// Dashboard Executive (grafik & statistik)
router.get('/dashboard', dashboardController.showDashboard);

// CRUD Pengguna
router.get('/users', adminController.listUsers);
router.get('/users/create', adminController.showCreateUser);
router.get('/users/edit/:id', adminController.showEditUser);
router.post('/users/add', adminController.createUser);
router.post('/users/edit/:id', adminController.updateUser);
router.post('/users/delete/:id', adminController.deleteUser);

// CRUD Ruangan
router.get('/rooms', adminController.listRooms);
router.get('/rooms/create', adminController.showCreateRoom);
router.get('/rooms/edit/:id', adminController.showEditRoom);
router.post('/rooms/add', adminController.createRoom);
router.post('/rooms/edit/:id', adminController.updateRoom);
router.post('/rooms/delete/:id', adminController.deleteRoom);

// Riwayat Audit Penuh
router.get('/activity-logs', adminController.listLogs);

module.exports = router;