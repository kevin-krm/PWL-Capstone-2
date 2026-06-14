DROP DATABASE IF EXISTS capstone_lab_inventory;
-- Membuat Database
CREATE DATABASE IF NOT EXISTS capstone_lab_inventory;
USE capstone_lab_inventory;

-- Disable foreign key checks to safely drop tables
SET FOREIGN_KEY_CHECKS = 0;

-- Drop all existing tables
DROP TABLE IF EXISTS maintenance_bhp_usage;
DROP TABLE IF EXISTS maintenance_logs;
DROP TABLE IF EXISTS item_receipts;
DROP TABLE IF EXISTS procurement_items;
DROP TABLE IF EXISTS procurement_drafts;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS consumables;
DROP TABLE IF EXISTS assets;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS users;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Tabel Users (Mengelola role pengguna)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('Administrator', 'Kepala Laboratorium', 'Ketua Program Studi', 'Staf Administrasi', 'Staf Laboratorium') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Rooms (Data ruangan Lab di GWT 8)
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_name VARCHAR(50) NOT NULL,
    description TEXT,
    room_type ENUM('lab','storage') NOT NULL DEFAULT 'lab',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Assets (Inventaris seperti PC, Monitor, TV yang memiliki barcode/label)
CREATE TABLE assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT,
    item_name VARCHAR(100) NOT NULL,
    label_code VARCHAR(50) UNIQUE, -- Nomor label / Barcode
    qr_code_url TEXT,
    condition_status ENUM('Baik', 'Rusak', 'Maintenance', 'Dihapus') DEFAULT 'Baik',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- 4. Tabel Consumables (BHP seperti RAM, SSD, Thermal Paste, Keyboard cadangan)
CREATE TABLE consumables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    stock INT DEFAULT 0 CHECK (stock >= 0), -- Lantai non-negatif (ditegakkan MariaDB 10.2+)
    unit VARCHAR(20), -- Pcs, Roll, Botol, dll.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Procurement Drafts (Draf Pengadaan Tahunan)
CREATE TABLE procurement_drafts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kalab_id INT,
    year YEAR NOT NULL,
    status ENUM('Draft', 'Reviewed', 'Locked') DEFAULT 'Draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kalab_id) REFERENCES users(id)
);

-- 6. Tabel Procurement Items (Detail barang dari draf pengadaan)
CREATE TABLE procurement_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    draft_id INT,
    item_type ENUM('Inventaris', 'BHP') NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    quantity INT NOT NULL,
    purchase_link VARCHAR(255),
    status ENUM('Pending', 'Disetujui', 'Ditolak') DEFAULT 'Pending',
    target_replacement_asset_id INT NULL,
    reason VARCHAR(255) NOT NULL,
    final_reason VARCHAR(255) NULL,
    FOREIGN KEY (draft_id) REFERENCES procurement_drafts(id) ON DELETE CASCADE,
    FOREIGN KEY (target_replacement_asset_id) REFERENCES assets(id) ON DELETE SET NULL
);

-- 7. Tabel Item Receipts (Penerimaan barang - mendukung kedatangan parsial/tidak bersamaan)
CREATE TABLE item_receipts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    procurement_item_id INT,
    staf_admin_id INT,
    quantity_received INT NOT NULL,
    received_date DATE NOT NULL,
    is_registered BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (procurement_item_id) REFERENCES procurement_items(id) ON DELETE CASCADE,
    FOREIGN KEY (staf_admin_id) REFERENCES users(id)
);

-- 8. Tabel Maintenance Logs (Pencatatan perbaikan oleh Staf Lab)
CREATE TABLE maintenance_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT,
    staf_lab_id INT,
    maintenance_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (staf_lab_id) REFERENCES users(id)
);

-- 9. Tabel Maintenance BHP Usage (Pengurangan stok BHP otomatis saat maintenance)
CREATE TABLE maintenance_bhp_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    maintenance_log_id INT,
    consumable_id INT,
    quantity_used INT NOT NULL,
    FOREIGN KEY (maintenance_log_id) REFERENCES maintenance_logs(id) ON DELETE CASCADE,
    FOREIGN KEY (consumable_id) REFERENCES consumables(id) ON DELETE CASCADE
);

-- 10. Tabel Activity Logs (Riwayat Audit Penuh)
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ==========================================
-- INSERT DUMMY DATA
-- ==========================================

-- Insert Users (Password sudah di-hash: hashpassword123)
INSERT INTO users (name, email, password, role, is_active) VALUES
('Richard Vincentius', 'richard@lab.ac.id', '$2b$10$e1FWi.dkGfvvo1nj/mX1u.ylR4zH.UpRs1MRVc76gkafhebzFTLii', 'Administrator', TRUE),
('Kevin Kornelius', 'kevin@lab.ac.id', '$2b$10$e1FWi.dkGfvvo1nj/mX1u.ylR4zH.UpRs1MRVc76gkafhebzFTLii', 'Kepala Laboratorium', TRUE),
('Buro Sembil', 'kaprodi@lab.ac.id', '$2b$10$e1FWi.dkGfvvo1nj/mX1u.ylR4zH.UpRs1MRVc76gkafhebzFTLii', 'Ketua Program Studi', TRUE),
('Ferdi', 'ferdi@lab.ac.id', '$2b$10$e1FWi.dkGfvvo1nj/mX1u.ylR4zH.UpRs1MRVc76gkafhebzFTLii', 'Staf Administrasi', TRUE),
('Jayden Marvel Ethanael', 'jayden@lab.ac.id', '$2b$10$e1FWi.dkGfvvo1nj/mX1u.ylR4zH.UpRs1MRVc76gkafhebzFTLii', 'Staf Laboratorium', TRUE),
('Staf Resign', 'resign@lab.ac.id', '$2b$10$e1FWi.dkGfvvo1nj/mX1u.ylR4zH.UpRs1MRVc76gkafhebzFTLii', 'Staf Administrasi', FALSE),
('Sintia Dewi', 'sintia@lab.ac.id', '$2b$10$e1FWi.dkGfvvo1nj/mX1u.ylR4zH.UpRs1MRVc76gkafhebzFTLii', 'Staf Laboratorium', TRUE);

-- Insert Rooms (Hanya ruangan Lab/Kelas Praktek)
INSERT INTO rooms (room_name, description) VALUES
('Computer Network Lab', 'Lantai 8 - Ruang H08 A02'),
('Programming Lab 1', 'Lantai 8 - Ruang H08 A03'),
('Programming Lab 2', 'Lantai 8 - Ruang H08 A04'),
('Enterprise Lab 2', 'Lantai 8 - Ruang H08 A06'),
('Enterprise Lab 1', 'Lantai 8 - Ruang H08 A07'),
('Advance Programming Lab 1', 'Lantai 8 - Ruang H08 B02'),
('Advance Programming Lab 2', 'Lantai 8 - Ruang H08 B03'),
('Advance Programming Lab 3', 'Lantai 8 - Ruang H08 B08'),
('Advance Programming Lab 4', 'Lantai 8 - Ruang H08 B09'),
('Internet Lab 1', 'Lantai 8 - Ruang H08 B10'),
('Internet Lab 2', 'Lantai 8 - Ruang H08 B11'),
('Database Lab', 'Lantai 8 - Ruang H08 C03'),
('Multimedia Lab', 'Lantai 8 - Ruang H08 C04');

-- Insert Storage Room (Gudang penyimpanan aset lama/rusak yang digantikan)
INSERT INTO rooms (room_name, description, room_type) VALUES
('Gudang Penyimpanan', 'Lantai 8 - Penyimpanan aset lama/rusak yang telah digantikan', 'storage');

-- Insert Assets (Inventaris) - Label: INV-<RUANG>-<TIPE>-<NNN>
INSERT INTO assets (room_id, item_name, label_code, condition_status, is_active) VALUES
-- Computer Network Lab
(1,  'PC Desktop CNL-01',        'INV-CNL-PC-001',   'Baik',        TRUE),
(1,  'PC Desktop CNL-02',        'INV-CNL-PC-002',   'Baik',        TRUE),
(1,  'Cisco Router 2901',        'INV-CNL-RT-001',   'Baik',        TRUE),
(1,  'Cisco Switch 24-Port',     'INV-CNL-SW-001',   'Maintenance', TRUE),
-- Programming Lab 1
(2,  'PC Desktop PL1-01',        'INV-PL1-PC-001',   'Baik',        TRUE),
(2,  'PC Desktop PL1-02',        'INV-PL1-PC-002',   'Rusak',       TRUE),
(2,  'Monitor LG 24 Inch',       'INV-PL1-MN-001',   'Baik',        TRUE),
(2,  'Smart TV Display 50"',     'INV-PL1-TV-001',   'Baik',        TRUE),
-- Programming Lab 2
(3,  'PC Desktop PL2-01',        'INV-PL2-PC-001',   'Baik',        TRUE),
(3,  'PC Desktop PL2-02',        'INV-PL2-PC-002',   'Baik',        TRUE),
(3,  'Projector Epson EB-X06',   'INV-PL2-PROJ-001', 'Maintenance', TRUE),
-- Enterprise Lab 2
(4,  'PC Desktop EL2-01',        'INV-EL2-PC-001',   'Baik',        TRUE),
(4,  'PC Desktop EL2-02',        'INV-EL2-PC-002',   'Rusak',       TRUE),
(4,  'Printer Laserjet Pro',     'INV-EL2-PR-001',   'Baik',        TRUE),
-- Enterprise Lab 1
(5,  'PC Desktop EL1-01',        'INV-EL1-PC-001',   'Baik',        TRUE),
(5,  'PC Desktop EL1-02',        'INV-EL1-PC-002',   'Baik',        TRUE),
(5,  'Monitor Dell 22 Inch',     'INV-EL1-MN-001',   'Baik',        TRUE),
-- Advance Programming Lab 1
(6,  'PC Desktop APL1-01',       'INV-APL1-PC-001',  'Baik',        TRUE),
(6,  'PC Desktop APL1-02',       'INV-APL1-PC-002',  'Rusak',       TRUE),
(6,  'UPS APC 1000VA',           'INV-APL1-UPS-001', 'Baik',        TRUE),
-- Advance Programming Lab 2
(7,  'PC Desktop APL2-01',       'INV-APL2-PC-001',  'Baik',        TRUE),
(7,  'PC Desktop APL2-02',       'INV-APL2-PC-002',  'Baik',        TRUE),
-- Advance Programming Lab 3
(8,  'PC Desktop APL3-01',       'INV-APL3-PC-001',  'Maintenance', TRUE),
(8,  'Monitor Samsung 24 Inch',  'INV-APL3-MN-001',  'Baik',        TRUE),
-- Advance Programming Lab 4
(9,  'PC Desktop APL4-01',       'INV-APL4-PC-001',  'Baik',        TRUE),
(9,  'PC Desktop APL4-02',       'INV-APL4-PC-002',  'Baik',        TRUE),
-- Internet Lab 1
(10, 'PC Desktop IL1-01',        'INV-IL1-PC-001',   'Baik',        TRUE),
(10, 'Access Point Ubiquiti',    'INV-IL1-AP-001',   'Baik',        TRUE),
(10, 'Cisco Switch 16-Port',     'INV-IL1-SW-001',   'Rusak',       TRUE),
-- Internet Lab 2
(11, 'PC Desktop IL2-01',        'INV-IL2-PC-001',   'Baik',        TRUE),
(11, 'PC Desktop IL2-02',        'INV-IL2-PC-002',   'Baik',        TRUE),
-- Database Lab
(12, 'PC Desktop DB-01',         'INV-DB-PC-001',    'Baik',        TRUE),
(12, 'PC Desktop DB-02',         'INV-DB-PC-002',    'Baik',        TRUE),
(12, 'Monitor LG 24 Inch',       'INV-DB-MN-001',    'Rusak',       TRUE),
(12, 'Server Rack Dell R740',    'INV-DB-SRV-001',   'Baik',        TRUE),
-- Multimedia Lab
(13, 'iMac 24 Inch',             'INV-MM-PC-001',    'Baik',        TRUE),
(13, 'iMac 24 Inch',             'INV-MM-PC-002',    'Baik',        TRUE),
(13, 'Wacom Tablet Intuos',      'INV-MM-TAB-001',   'Baik',        TRUE),
(13, 'DSLR Canon EOS 700D',      'INV-MM-CAM-001',   'Maintenance', TRUE),
-- Aset lama di Gudang (sudah dihapus / nonaktif)
(14, 'PC Desktop Lama Bekas',    'INV-GDG-PC-001',   'Dihapus',     FALSE),
(14, 'Monitor CRT Bekas',        'INV-GDG-MN-001',   'Dihapus',     FALSE);

-- Insert Consumables (BHP) - sebagian stok kecil untuk uji validasi
INSERT INTO consumables (item_name, stock, unit) VALUES
('SSD Samsung 500GB',     5,  'Pcs'),
('RAM DDR4 8GB',          8,  'Pcs'),
('Thermal Paste',         10, 'Tube'),
('Keyboard Logitech',     3,  'Pcs'),
('Mouse Logitech',        6,  'Pcs'),
('Kabel HDMI 2m',         12, 'Pcs'),
('Power Supply 500W',     4,  'Pcs'),
('Kabel LAN Cat6',        2,  'Roll'),
('Toner Printer HP',      5,  'Pcs'),
('Webcam Logitech C920',  2,  'Pcs');

-- Insert Procurement (Draf Pengadaan Tahunan oleh Kalab)
INSERT INTO procurement_drafts (kalab_id, year, status) VALUES
(2, 2024, 'Locked'),
(2, 2025, 'Locked'),
(2, 2026, 'Locked'),
(2, 2026, 'Draft');

-- Insert Procurement Items
INSERT INTO procurement_items (draft_id, item_type, item_name, price, quantity, purchase_link, status, target_replacement_asset_id, reason, final_reason) VALUES
(1, 'Inventaris', 'PC Desktop Lenovo ThinkCentre', 12000000, 10, 'https://lenovo.com/thinkcentre', 'Disetujui', NULL, 'Peremajaan PC laboratorium', 'Disetujui untuk peremajaan'),
(1, 'Inventaris', 'Monitor Dell 22 Inch',          1800000,  10, 'https://dell.com/monitor',      'Disetujui', NULL, 'Pelengkap PC baru',           'Disetujui'),
(1, 'BHP',        'RAM DDR4 8GB',                   600000,   20, 'https://corsair.com/ram',       'Disetujui', NULL, 'Upgrade memori PC',           'Disetujui'),
(2, 'Inventaris', 'PC Desktop HP ProDesk',          13500000, 8,  'https://hp.com/prodesk',        'Disetujui', NULL, 'Tambahan unit lab enterprise','Disetujui untuk ekspansi'),
(2, 'Inventaris', 'Monitor LG 24 Inch',             2500000,  5,  'https://lg.com/monitor',        'Disetujui', 34,   'Mengganti monitor rusak di Database Lab', 'Disetujui, monitor lama rusak'),
(2, 'BHP',        'SSD Samsung 500GB',              750000,   15, 'https://samsung.com/ssd',       'Disetujui', NULL, 'Upgrade storage PC',          'Disetujui'),
(2, 'BHP',        'Toner Printer HP',               450000,   10, 'https://hp.com/toner',          'Ditolak',   NULL, 'Cadangan toner',              'Ditolak, stok toner masih cukup'),
(3, 'Inventaris', 'PC Desktop Lenovo ThinkCentre', 15000000, 10, 'https://lenovo.com/thinkcentre', 'Disetujui', NULL, 'Lab multimedia baru',         'Disetujui'),
(3, 'Inventaris', 'Cisco Switch 24-Port',           8500000,  2,  'https://cisco.com/switch',      'Disetujui', 29,   'Mengganti switch rusak Internet Lab 1', 'Disetujui'),
(3, 'BHP',        'Power Supply 500W',              550000,   6,  'https://corsair.com/psu',       'Disetujui', NULL, 'Cadangan PSU',                'Disetujui'),
(3, 'Inventaris', 'Printer Laserjet Pro',           3200000,  2,  'https://hp.com/laserjet',       'Ditolak',   NULL, 'Printer tambahan',            'Ditolak, anggaran terbatas'),
(4, 'Inventaris', 'PC Desktop HP ProDesk',          13500000, 5,  'https://hp.com/prodesk',        'Pending',   NULL, 'Permintaan tambahan unit',    NULL),
(4, 'BHP',        'RAM DDR4 8GB',                   600000,   10, 'https://corsair.com/ram',       'Pending',   NULL, 'Upgrade RAM lab',             NULL);

-- Insert Item Receipts (Staf Admin id=4). Sebagian parsial & sebagian belum diregistrasi (is_registered FALSE)
INSERT INTO item_receipts (procurement_item_id, staf_admin_id, quantity_received, received_date, is_registered) VALUES
(1, 4, 5,  '2024-03-10', TRUE),
(1, 4, 5,  '2024-04-05', TRUE),
(2, 4, 10, '2024-03-15', TRUE),
(3, 4, 20, '2024-03-20', TRUE),
(4, 4, 5,  '2025-05-12', TRUE),
(5, 4, 5,  '2025-05-20', FALSE),
(6, 4, 15, '2025-06-01', TRUE),
(10,4, 6,  '2026-07-15', TRUE);
-- (item 8 & 9 belum diterima -> memicu notifikasi Penerimaan Staf Admin)

-- Insert Maintenance Logs (Staf Lab)
INSERT INTO maintenance_logs (asset_id, staf_lab_id, maintenance_date, description) VALUES
(6,  5, '2025-02-18', 'Penggantian PSU PC PL1-02 karena mati total'),
(4,  5, '2025-05-22', 'Pembersihan & re-paste Cisco Switch yang overheat'),
(34, 5, '2025-08-09', 'Pengecekan monitor LG bergaris, indikasi panel rusak'),
(13, 7, '2025-11-14', 'Perbaikan PC Enterprise Lab 2 tidak menyala'),
(23, 7, '2026-01-20', 'Maintenance rutin PC Advance Programming Lab 3'),
(19, 5, '2026-03-11', 'Penggantian RAM PC Advance Programming Lab 1'),
(39, 7, '2026-06-05', 'Servis lensa & sensor DSLR Canon'),
(11, 5, '2026-09-17', 'Kalibrasi & pembersihan proyektor Epson');

-- Insert Maintenance BHP Usage (jumlah dijaga <= stok)
INSERT INTO maintenance_bhp_usage (maintenance_log_id, consumable_id, quantity_used) VALUES
(1, 7, 1),  -- log1: Power Supply
(1, 3, 1),  -- log1: Thermal Paste
(2, 3, 1),  -- log2: Thermal Paste
(3, 6, 1),  -- log3: Kabel HDMI
(4, 7, 1),  -- log4: Power Supply
(4, 2, 2),  -- log4: RAM DDR4 8GB
(5, 3, 1),  -- log5: Thermal Paste
(6, 2, 2),  -- log6: RAM DDR4 8GB
(8, 6, 1);  -- log8: Kabel HDMI