const Dashboard = require('../models/Dashboard');

// Dashboard Executive (Grafik & Statistik) - dipakai bersama oleh Administrator & Kaprodi
exports.showDashboard = async (req, res) => {
    try {
        const [condition, spendingRaw, bhpUsageRaw, summary] = await Promise.all([
            Dashboard.assetConditionBreakdown(),
            Dashboard.procurementSpendingByYear(),
            Dashboard.bhpUsageByMonth(),
            Dashboard.summaryCounts()
        ]);

        // SUM/DECIMAL dikembalikan mysql2 sebagai string -> konversi ke Number untuk Chart.js
        const spending = spendingRaw.map(r => ({ year: r.year, total: Number(r.total) }));
        const bhpUsage = bhpUsageRaw.map(r => ({ ym: r.ym, total: Number(r.total) }));

        res.render('dashboard/index', {
            user: req.session.user,
            condition,
            spending,
            bhpUsage,
            summary
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server.');
    }
};
