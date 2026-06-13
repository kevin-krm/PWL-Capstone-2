const db = require('../config/database');
const pool = db.promise();

const Dashboard = {
    // Pie chart: jumlah aset per kondisi (Baik / Rusak / Maintenance / Dihapus)
    async assetConditionBreakdown(conn = pool) {
        const [rows] = await conn.query(`
            SELECT condition_status, COUNT(*) AS total
            FROM assets
            GROUP BY condition_status
        `);
        return rows;
    },

    // Bar chart: total dana pengadaan yang DISETUJUI per tahun
    async procurementSpendingByYear(conn = pool) {
        const [rows] = await conn.query(`
            SELECT pd.year AS year, SUM(pi.price * pi.quantity) AS total
            FROM procurement_items pi
            JOIN procurement_drafts pd ON pi.draft_id = pd.id
            WHERE pi.status = 'Disetujui'
            GROUP BY pd.year
            ORDER BY pd.year ASC
        `);
        return rows;
    },

    // Line chart: total kuantitas BHP terpakai per bulan (dari maintenance)
    async bhpUsageByMonth(conn = pool) {
        const [rows] = await conn.query(`
            SELECT DATE_FORMAT(ml.maintenance_date, '%Y-%m') AS ym,
                   SUM(mbu.quantity_used) AS total
            FROM maintenance_bhp_usage mbu
            JOIN maintenance_logs ml ON mbu.maintenance_log_id = ml.id
            GROUP BY ym
            ORDER BY ym ASC
        `);
        return rows;
    },

    // Info-box ringkas untuk header dashboard
    async summaryCounts(conn = pool) {
        const [[assets]] = await conn.query('SELECT COUNT(*) AS total FROM assets');
        const [[broken]] = await conn.query("SELECT COUNT(*) AS total FROM assets WHERE condition_status = 'Rusak'");
        const [[bhpTypes]] = await conn.query('SELECT COUNT(*) AS total FROM consumables');
        const [[bhpStock]] = await conn.query('SELECT COALESCE(SUM(stock), 0) AS total FROM consumables');
        return {
            totalAssets: assets.total,
            brokenAssets: broken.total,
            bhpTypes: bhpTypes.total,
            bhpStock: Number(bhpStock.total)
        };
    }
};

module.exports = Dashboard;
