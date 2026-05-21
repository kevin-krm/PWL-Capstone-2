const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkAuth } = require('../middlewares/authMiddleware');

// Kunci akses HANYA untuk Staf Laboratorium
router.use(checkAuth('Staf Laboratorium'));

// PROSES CRUD BHP (CONSUMABLES)

// READ: Menampilkan daftar BHP
router.get('/consumables', (req, res) => {
    db.query('SELECT * FROM consumables', (err, consumables) => {
        if (err) throw err;
        res.render('consumables/index', { user: req.session.user, consumables });
    });
});

// CREATE FORM: Halaman tambah BHP
router.get('/consumables/create', (req, res) => {
    res.render('consumables/create', { user: req.session.user });
});

// EDIT FORM: Halaman edit BHP
router.get('/consumables/edit/:id', (req, res) => {
    db.query('SELECT * FROM consumables WHERE id = ?', [req.params.id], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            res.render('consumables/edit', { user: req.session.user, consumableEdit: results[0] });
        } else {
            res.redirect('/staflab/consumables');
        }
    });
});

// POST CREATE
router.post('/consumables/add', (req, res) => {
    const { item_name, stock, unit } = req.body;
    db.query('INSERT INTO consumables (item_name, stock, unit) VALUES (?, ?, ?)',
        [item_name, stock, unit], (err) => {
            if (err) throw err;
            res.redirect('/staflab/consumables');
        });
});

// POST EDIT
router.post('/consumables/edit/:id', (req, res) => {
    const { item_name, stock, unit } = req.body;
    db.query('UPDATE consumables SET item_name=?, stock=?, unit=? WHERE id=?',
        [item_name, stock, unit, req.params.id], (err) => {
            if (err) throw err;
            res.redirect('/staflab/consumables');
        });
});

// POST DELETE
router.post('/consumables/delete/:id', (req, res) => {
    db.query('DELETE FROM consumables WHERE id=?', [req.params.id], (err) => {
        if (err) throw err;
        res.redirect('/staflab/consumables');
    });
});

module.exports = router;