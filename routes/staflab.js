const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkAuth } = require('../middlewares/authMiddleware');

// Kunci akses HANYA untuk Staf Laboratorium
router.use(checkAuth('Staf Laboratorium'));

// PROSES CRUD BHP (CONSUMABLES)

router.get('/consumables', (req, res) => {
    db.query('SELECT * FROM consumables', (err, consumables) => {
        if (err) throw err;
        res.render('admin/consumables', { user: req.session.user, consumables });
    });
});

router.post('/consumables/add', (req, res) => {
    const { item_name, stock, unit } = req.body;
    db.query('INSERT INTO consumables (item_name, stock, unit) VALUES (?, ?, ?)',
        [item_name, stock, unit], (err) => {
            if (err) throw err;
            res.redirect('/staflab/consumables');
        });
});

router.post('/consumables/edit/:id', (req, res) => {
    const { item_name, stock, unit } = req.body;
    db.query('UPDATE consumables SET item_name=?, stock=?, unit=? WHERE id=?',
        [item_name, stock, unit, req.params.id], (err) => {
            if (err) throw err;
            res.redirect('/staflab/consumables');
        });
});

router.post('/consumables/delete/:id', (req, res) => {
    db.query('DELETE FROM consumables WHERE id=?', [req.params.id], (err) => {
        if (err) throw err;
        res.redirect('/staflab/consumables');
    });
});

module.exports = router;