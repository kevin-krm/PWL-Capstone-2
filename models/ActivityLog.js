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

    static findAll() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT al.*, u.name as user_name, u.role as user_role 
                FROM activity_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ORDER BY al.created_at DESC
            `;
            db.query(query, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    }
}

module.exports = ActivityLog;
