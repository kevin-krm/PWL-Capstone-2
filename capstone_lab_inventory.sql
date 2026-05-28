DROP DATABASE IF EXISTS capstone_lab_inventory;
-- Membuat Database
CREATE DATABASE IF NOT EXISTS capstone_lab_inventory;
USE capstone_lab_inventory;

-- 1. Tabel Users (Mengelola role pengguna)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('Administrator', 'Kepala Laboratorium', 'Ketua Program Studi', 'Staf Administrasi', 'Staf Laboratorium') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Rooms (Data ruangan Lab di GWT 8)
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_name VARCHAR(50) NOT NULL,
    description TEXT,
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
    stock INT DEFAULT 0,
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
    target_replacement_asset_id INT NULL, -- Jika ini menggantikan barang lama
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

-- ==========================================
-- INSERT DUMMY DATA
-- ==========================================

-- Insert Users (Administrator, Kalab, Kaprodi, Admin, Lab Staff)
INSERT INTO users (name, email, password, role) VALUES
('Richard Vincentius', 'richard@lab.ac.id', 'hashpassword123', 'Administrator'),
('Kevin Kornelius', 'kevin@lab.ac.id', 'hashpassword123', 'Kepala Laboratorium'),
('Buro Sembil', 'kaprodi@lab.ac.id', 'hashpassword123', 'Ketua Program Studi'),
('Ferdi', 'ferdi@lab.ac.id', 'hashpassword123', 'Staf Administrasi'),
('Jayden Marvel Ethanael', 'jayden@lab.ac.id', 'hashpassword123', 'Staf Laboratorium');

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

-- Insert Assets (Relasi room_id disesuaikan: 12 = Database Lab, 2 = Programming Lab 1)
INSERT INTO assets (room_id, item_name, label_code, condition_status) VALUES
(12, 'PC Desktop R4-01', 'INV-R4-PC-001', 'Baik'),
(12, 'Monitor LG 24 Inch', 'INV-R4-MN-001', 'Rusak'),
(2, 'Smart TV Display', 'INV-R1-TV-001', 'Baik');

-- Insert Consumables (BHP)
INSERT INTO consumables (item_name, stock, unit) VALUES
('SSD Samsung 500GB', 5, 'Pcs'),
('Thermal Paste', 10, 'Tube'),
('Keyboard Logitech', 3, 'Pcs');

-- Insert Procurement Draft (Draf Pengadaan Tahunan oleh Kalab)
INSERT INTO procurement_drafts (kalab_id, year, status) VALUES
(2, 2026, 'Locked'); -- Draft sudah final/locked oleh Kaprodi

-- Insert Procurement Items (Detail barang yang diajukan dalam draf)
INSERT INTO procurement_items (draft_id, item_type, item_name, price, quantity, purchase_link, status, target_replacement_asset_id) VALUES
(1, 'Inventaris', 'PC Desktop Lenovo', 15000000, 10, 'https://store.lenovo.com/pc', 'Disetujui', NULL),
(1, 'Inventaris', 'Monitor LG 24 Inch', 2500000, 10, 'https://lg.com/monitor', 'Disetujui', 2), -- Menggantikan Monitor yang rusak
(1, 'BHP', 'SSD Samsung 500GB', 800000, 20, 'https://samsung.com/ssd', 'Ditolak', NULL); -- Contoh barang yang ditolak Kaprodi

-- Insert Item Receipts (Staf Admin mencatat penerimaan barang yang datang tidak bersamaan)
INSERT INTO item_receipts (procurement_item_id, staf_admin_id, quantity_received, received_date) VALUES
(1, 4, 5, '2026-06-15'),
(1, 4, 5, '2026-08-10');

-- Insert Maintenance Log (Staf Lab mencatat perbaikan)
INSERT INTO maintenance_logs (asset_id, staf_lab_id, maintenance_date, description) VALUES
(1, 5, '2026-04-20', 'Penggantian SSD karena bad sector dan aplikasi lambat');

-- Insert Maintenance BHP Usage (Otomatis mengurangi stok BHP)
INSERT INTO maintenance_bhp_usage (maintenance_log_id, consumable_id, quantity_used) VALUES
(1, 1, 1); -- Menggunakan 1 buah SSD dari stok