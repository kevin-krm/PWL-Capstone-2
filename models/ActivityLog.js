const db = require('../config/database');

class ActivityLog {
    static logAction(userId, action, description) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO activity_logs (user_id, action, description)
                VALUES (?, ?, ?)
            `;
            db.query(query, [userId, action, description], (err, results) => {
                if (err) {
                    console.error('Error logging activity:', err);
                    return resolve(false); // resolve false instead of reject to not break flow
                }
                resolve(true);
            });
        });
    }

    static findAll(filters = {}) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT al.*, u.name as user_name, u.role as user_role 
                FROM activity_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE 1=1
            `;
            const params = [];

            if (filters.role) {
                query += ` AND u.role = ?`;
                params.push(filters.role);
            }

            if (filters.action) {
                query += ` AND al.action = ?`;
                params.push(filters.action);
            }

            if (filters.search) {
                query += ` AND (u.name LIKE ? OR al.description LIKE ? OR al.action LIKE ?)`;
                const searchParam = `%${filters.search}%`;
                params.push(searchParam, searchParam, searchParam);
            }

            if (filters.sort === 'asc') {
                query += ` ORDER BY al.created_at ASC`;
            } else {
                // default is desc
                query += ` ORDER BY al.created_at DESC`;
            }

            db.query(query, params, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    }
}

module.exports = ActivityLog;
