const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Room = require('../models/Room');
const Asset = require('../models/Asset');

// CRUD PENGGUNA

// READ
exports.listUsers = async (req, res) => {
    const sort = req.query.sort || null;
    const role = req.query.role || null;
    const status = req.query.status || null;

    const users = await User.findAll({ sort, role, status });
    res.render('users/index', {
        user: req.session.user,
        users,
        selectedSort: sort,
        selectedRole: role,
        selectedStatus: status
    });
};

// Form Tambah Pengguna
exports.showCreateUser = (req, res) => {
    res.render('users/create', { user: req.session.user });
};

// Form Edit Pengguna
exports.showEditUser = async (req, res) => {
    const userEdit = await User.findById(req.params.id);
    if (userEdit) {
        res.render('users/edit', { user: req.session.user, userEdit });
    } else {
        res.redirect('/admin/users');
    }
};

// CREATE: Proses tambah pengguna (Dengan Validasi Email & Password Hashing)
exports.createUser = async (req, res) => {
    const { name, email, password, role, is_active } = req.body;

    // 1. Cek apakah email sudah terdaftar
    if (await User.emailExists(email)) {
        return res.send(`
            <script>
                alert('Gagal: Email "${email}" sudah terdaftar di sistem! Gunakan email lain.');
                window.history.back();
            </script>
        `);
    }

    // 2. HASH PASSWORD SEBELUM DISIMPAN
    const hashedPassword = bcrypt.hashSync(password, 10);

    // 3. Jika email aman, jalankan insert dengan hashedPassword
    await User.create({ name, email, password: hashedPassword, role, is_active });
    res.redirect('/admin/users');
};

// UPDATE: Proses edit pengguna (Dengan Validasi Email & Pengecekan Password)
exports.updateUser = async (req, res) => {
    const { name, email, password, role, is_active } = req.body;
    const userId = req.params.id;

    // 1. Cek apakah email baru sudah dipakai oleh orang LAIN
    if (await User.emailExistsForOther(email, userId)) {
        return res.send(`
            <script>
                alert('Gagal: Email "${email}" sudah digunakan oleh pengguna lain!');
                window.history.back();
            </script>
        `);
    }

    // 2. Logika Update berdasarkan isi kolom password
    if (password) {
        // Jika kolom password diisi teks baru, lakukan hashing
        const hashedPassword = bcrypt.hashSync(password, 10);
        await User.updateWithPassword(userId, { name, email, password: hashedPassword, role, is_active });
    } else {
        // Jika password dikosongkan, JANGAN sentuh kolom password di database
        await User.updateWithoutPassword(userId, { name, email, role, is_active });
    }
    res.redirect('/admin/users');
};

// DELETE: Proses hapus pengguna
exports.deleteUser = async (req, res) => {
    try {
        await User.remove(req.params.id);
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
            return res.send(`
                <script>
                    alert('Gagal menghapus: Pengguna ini tidak bisa dihapus karena masih memiliki riwayat aktivitas (seperti pengadaan/maintenance) di dalam sistem!');
                    window.history.back();
                </script>
            `);
        }
        throw err;
    }
    res.redirect('/admin/users');
};

// ===== CRUD RUANGAN =====

exports.listRooms = async (req, res) => {
    const sort = req.query.sort || null;
    const rooms = await Room.findAll(sort);
    res.render('rooms/index', { user: req.session.user, rooms, selectedSort: sort });
};

exports.showCreateRoom = (req, res) => {
    res.render('rooms/create', { user: req.session.user });
};

exports.showEditRoom = async (req, res) => {
    const roomEdit = await Room.findById(req.params.id);
    if (roomEdit) {
        res.render('rooms/edit', { user: req.session.user, roomEdit });
    } else {
        res.redirect('/admin/rooms');
    }
};

exports.createRoom = async (req, res) => {
    const { room_name, description } = req.body;
    await Room.create({ room_name, description });
    res.redirect('/admin/rooms');
};

exports.updateRoom = async (req, res) => {
    const { room_name, description } = req.body;
    await Room.update(req.params.id, { room_name, description });
    res.redirect('/admin/rooms');
};

exports.deleteRoom = async (req, res) => {
    const roomId = req.params.id;
    const assets = await Asset.findByRoom(roomId);
    if (assets.length > 0) {
        return res.send(`
            <script>
                alert('Gagal menghapus: Ruangan ini tidak bisa dihapus karena masih berisi ${assets.length} aset laboratorium!');
                window.history.back();
            </script>
        `);
    }
    await Room.remove(roomId);
    res.redirect('/admin/rooms');
<<<<<<< Updated upstream
=======
};

// ===== RIWAYAT AUDIT PENUH =====

exports.listLogs = async (req, res) => {
    try {
        const sort = req.query.sort || null;
        const role = req.query.role || null;
        const action = req.query.action || null;
        const search = req.query.search || null;

        const logs = await ActivityLog.findAll({ sort, role, action, search });
        res.render('admin/activity_logs/index', { 
            user: req.session.user, 
            logs,
            selectedSort: sort,
            selectedRole: role,
            selectedAction: action,
            searchQuery: search
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server saat mengambil log.');
    }
>>>>>>> Stashed changes
};