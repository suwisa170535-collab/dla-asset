import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { db, initDatabase } from './db.js';
import { calculateDepreciation } from './depreciation.js';
import { resetToDemoData } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'database.sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Ensure uploads directory exists and serve statically
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Ensure backups directory exists for automated daily backups
const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Automatic Daily Backup Function (สำรองฐานข้อมูลอัตโนมัติประจำวัน)
function runAutoBackup() {
  try {
    if (!fs.existsSync(dbPath)) return;
    try {
      db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch (_) {}
    const today = new Date().toISOString().split('T')[0];
    const backupFile = path.join(backupsDir, `auto_backup_${today}.sqlite`);
    if (!fs.existsSync(backupFile)) {
      fs.copyFileSync(dbPath, backupFile);
      console.log(`🛡️ [Auto-Backup] สำรองฐานข้อมูลอัตโนมัติประจำวันสำเร็จ: ${path.basename(backupFile)}`);
    }

    // Clean up backups older than 30 days to save disk space
    const files = fs.readdirSync(backupsDir);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const f of files) {
      if (f.startsWith('auto_backup_') && f.endsWith('.sqlite')) {
        const filePath = path.join(backupsDir, f);
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs < thirtyDaysAgo) {
          fs.unlinkSync(filePath);
        }
      }
    }
  } catch (err) {
    console.error('Error running auto-backup:', err.message);
  }
}

// Run auto-backup on server launch and check every 6 hours
runAutoBackup();
setInterval(runAutoBackup, 6 * 60 * 60 * 1000);

// File/Image Upload endpoint
app.post('/api/upload', (req, res) => {
  try {
    const { filename, base64Data } = req.body;
    if (!filename || !base64Data) {
      return res.status(400).json({ error: 'filename and base64Data are required' });
    }
    const ext = path.extname(filename) || '.png';
    const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(uploadsDir, safeName);

    // Strip data url prefix if present
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));

    res.json({
      url: `/uploads/${safeName}`,
      filename: filename,
      size: fs.statSync(filePath).size
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Initialize DB schema
initDatabase();

// Auto-seed demo data if fresh database on cloud
try {
  const assetCount = db.prepare('SELECT count(*) as count FROM assets').get()?.count || 0;
  if (assetCount === 0) {
    console.log('🌱 [Auto-Seed] ฐานข้อมูลว่าง กำลังโหลดข้อมูลตัวอย่าง Demo 18 หมวดหมู่อัตโนมัติ...');
    resetToDemoData();
  }
} catch (e) {
  console.warn('Auto-seed check:', e.message);
}

// Helper to log audit trail
function logAudit(action, module, entityId, actorName, actorRole, details) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (action, module, entity_id, actor_name, actor_role, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      action,
      module,
      entityId || null,
      actorName || 'ระบบอัตโนมัติ',
      actorRole || 'ระบบ',
      typeof details === 'object' ? JSON.stringify(details) : (details || '')
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// -------------------------------------------------------------
// AUTHENTICATION & LOGIN (ระบบยืนยันตัวตนและล็อกอินด้วยรหัสผ่าน)
// -------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username).trim());
    if (!user || user.password !== String(password).trim()) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบใหม่อีกครั้ง' });
    }

    const { password: _, ...userWithoutPass } = user;
    const token = `token_${user.id}_${Date.now()}`;

    logAudit('LOGIN', 'AUTH', user.id, user.name, user.title, `เข้าสู่ระบบสำเร็จ (สิทธิ์: ${user.role_type})`);

    res.json({
      success: true,
      token,
      user: {
        id: user.username,
        dbId: user.id,
        roleType: user.role_type,
        title: user.title,
        name: user.name,
        dept: user.dept,
        departmentId: user.department_id
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ดึงรายชื่อบัญชีผู้ใช้งาน (สำหรับ Quick Login / สลับสิทธิ์)
app.get('/api/auth/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, name, role_type, title, dept, department_id FROM users ORDER BY id ASC').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// เปลี่ยนรหัสผ่าน (Change Password)
app.post('/api/auth/change-password', (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;
    if (!username || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || user.password !== oldPassword) {
      return res.status(400).json({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' });
    }

    db.prepare('UPDATE users SET password = ?, updated_at = datetime("now", "localtime") WHERE id = ?')
      .run(newPassword, user.id);

    logAudit('CHANGE_PASSWORD', 'AUTH', user.id, user.name, user.title, 'เปลี่ยนรหัสผ่านสำเร็จ');

    res.json({ success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ดึงข้อมูลผู้ใช้ทั้งหมดเพื่อจัดการในหน้า Settings
app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.username, u.name, u.role_type, u.title, u.dept, u.department_id, u.created_at, u.updated_at,
             d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.id ASC
    `).all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// เพิ่มผู้ใช้งานใหม่ (Create User)
app.post('/api/users', (req, res) => {
  try {
    const { username, password, name, role_type, title, dept, department_id, actorName, actorRole } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'กรุณากรอก Username, รหัสผ่าน และชื่อ-นามสกุล' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    if (existing) {
      return res.status(400).json({ error: `ชื่อผู้ใช้งาน (Username) "${cleanUsername}" มีในระบบแล้ว` });
    }

    const stmt = db.prepare(`
      INSERT INTO users (username, password, name, role_type, title, dept, department_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      cleanUsername,
      String(password).trim(),
      name.trim(),
      role_type || 'department_staff',
      title || 'เจ้าหน้าที่',
      dept || 'สำนักปลัดเทศบาล',
      department_id || null
    );

    logAudit('CREATE_USER', 'USERS', result.lastInsertRowid, actorName, actorRole, `สร้างบัญชีผู้ใช้ใหม่: ${cleanUsername} (${name})`);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// แก้ไขข้อมูลผู้ใช้หรือเปลี่ยนรหัสผ่าน (Update User / Set Password)
app.put('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, role_type, title, dept, department_id, newPassword, actorName, actorRole } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'ไม่พบบัญชีผู้ใช้งานนี้' });
    }

    if (newPassword && String(newPassword).trim()) {
      db.prepare(`
        UPDATE users 
        SET name = ?, role_type = ?, title = ?, dept = ?, department_id = ?, password = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(
        name || user.name,
        role_type || user.role_type,
        title || user.title,
        dept || user.dept,
        department_id !== undefined ? department_id : user.department_id,
        String(newPassword).trim(),
        id
      );
      logAudit('UPDATE_USER', 'USERS', id, actorName, actorRole, `แก้ไขข้อมูลและรีเซ็ตรหัสผ่านของผู้ใช้: ${user.username}`);
    } else {
      db.prepare(`
        UPDATE users 
        SET name = ?, role_type = ?, title = ?, dept = ?, department_id = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(
        name || user.name,
        role_type || user.role_type,
        title || user.title,
        dept || user.dept,
        department_id !== undefined ? department_id : user.department_id,
        id
      );
      logAudit('UPDATE_USER', 'USERS', id, actorName, actorRole, `แก้ไขข้อมูลผู้ใช้: ${user.username}`);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ลบผู้ใช้งาน (Delete User)
app.delete('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { actorName, actorRole } = req.body || {};

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'ไม่พบบัญชีผู้ใช้งานนี้' });
    }

    if (user.username === 'admin') {
      return res.status(400).json({ error: 'ไม่อนุญาตให้ลบบัญชีผู้ดูแลระบบหลัก (admin)' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    logAudit('DELETE_USER', 'USERS', id, actorName, actorRole, `ลบบัญชีผู้ใช้: ${user.username} (${user.name})`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// SETTINGS & METADATA
// -------------------------------------------------------------
app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const { settings, actorName, actorRole } = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(settings)) {
      stmt.run(k, String(v));
    }
    logAudit('UPDATE', 'SETTINGS', null, actorName, actorRole, 'แก้ไขข้อมูลการตั้งค่าองค์กรและปีงบประมาณ');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// DEPARTMENTS
// -------------------------------------------------------------
app.get('/api/departments', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM departments ORDER BY code ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/departments', (req, res) => {
  try {
    const { code, name, head_name, head_position, actorName, actorRole } = req.body;
    const stmt = db.prepare('INSERT INTO departments (code, name, head_name, head_position) VALUES (?, ?, ?, ?)');
    const result = stmt.run(code, name, head_name, head_position);
    logAudit('CREATE', 'DEPARTMENT', result.lastInsertRowid, actorName, actorRole, `เพิ่มสำนัก/กอง: ${name} (${code})`);
    res.json({ id: result.lastInsertRowid, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/departments/:id', (req, res) => {
  try {
    const { code, name, head_name, head_position, actorName, actorRole } = req.body;
    const stmt = db.prepare(`
      UPDATE departments 
      SET code = ?, name = ?, head_name = ?, head_position = ? 
      WHERE id = ?
    `);
    stmt.run(code, name, head_name, head_position, req.params.id);
    logAudit('UPDATE', 'DEPARTMENT', req.params.id, actorName, actorRole, `แก้ไขข้อมูลสำนัก/กอง: ${name} (${code})`);
    res.json({ success: true, message: 'บันทึกการแก้ไขสำนัก/กองเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/departments/:id', (req, res) => {
  try {
    const deptId = req.params.id;
    const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(deptId);
    if (!dept) {
      return res.status(404).json({ error: 'ไม่พบสำนัก/กองนี้' });
    }

    const inUseAssets = db.prepare('SELECT count(*) as count FROM assets WHERE department_id = ?').get(deptId)?.count || 0;
    if (inUseAssets > 0) {
      return res.status(400).json({ 
        error: `ไม่สามารถลบสำนัก/กอง "${dept.name}" ได้ เนื่องจากมีครุภัณฑ์สังกัดอยู่ ${inUseAssets} รายการ กรุณาทำการโอนย้ายครุภัณฑ์ไปยังกองอื่นก่อนทำการลบ` 
      });
    }

    db.prepare('DELETE FROM departments WHERE id = ?').run(deptId);
    logAudit('DELETE', 'DEPARTMENT', deptId, req.body?.actorName, req.body?.actorRole, `ลบสำนัก/กอง: ${dept.name} (${dept.code})`);
    res.json({ success: true, message: 'ลบสำนัก/กองเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// SUB-DEPARTMENTS (หน่วยงานย่อย / ฝ่าย / ศพด. / รพ.สต. / โรงเรียน)
// -------------------------------------------------------------
app.get('/api/sub-departments', (req, res) => {
  try {
    const { department_id } = req.query;
    let sql = `
      SELECT sd.*, 
             d.name as department_name, d.code as department_code,
             (SELECT count(*) FROM assets WHERE sub_department_id = sd.id) as asset_count
      FROM sub_departments sd
      LEFT JOIN departments d ON sd.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    if (department_id) {
      sql += ` AND sd.department_id = ?`;
      params.push(Number(department_id));
    }
    sql += ` ORDER BY d.code ASC, sd.code ASC`;
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sub-departments', (req, res) => {
  try {
    const { department_id, code, name, head_name, head_position, notes, actorName, actorRole } = req.body;
    if (!department_id || !code || !name) {
      return res.status(400).json({ error: 'กรุณากรอกสำนัก/กอง รหัส และชื่อหน่วยงานย่อย' });
    }
    const stmt = db.prepare('INSERT INTO sub_departments (department_id, code, name, head_name, head_position, notes) VALUES (?, ?, ?, ?, ?, ?)');
    const result = stmt.run(Number(department_id), code, name, head_name || null, head_position || null, notes || null);
    logAudit('CREATE', 'SUB_DEPARTMENT', result.lastInsertRowid, actorName, actorRole, `เพิ่มหน่วยงานย่อย: ${name} (${code})`);
    res.json({ id: result.lastInsertRowid, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/sub-departments/:id', (req, res) => {
  try {
    const { department_id, code, name, head_name, head_position, notes, actorName, actorRole } = req.body;
    const stmt = db.prepare(`
      UPDATE sub_departments 
      SET department_id = ?, code = ?, name = ?, head_name = ?, head_position = ?, notes = ?
      WHERE id = ?
    `);
    stmt.run(Number(department_id), code, name, head_name || null, head_position || null, notes || null, req.params.id);
    logAudit('UPDATE', 'SUB_DEPARTMENT', req.params.id, actorName, actorRole, `แก้ไขหน่วยงานย่อย: ${name} (${code})`);
    res.json({ success: true, message: 'บันทึกการแก้ไขหน่วยงานย่อยเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sub-departments/:id', (req, res) => {
  try {
    const subDeptId = req.params.id;
    const subDept = db.prepare('SELECT * FROM sub_departments WHERE id = ?').get(subDeptId);
    if (!subDept) {
      return res.status(404).json({ error: 'ไม่พบหน่วยงานย่อยนี้' });
    }

    const inUseAssets = db.prepare('SELECT count(*) as count FROM assets WHERE sub_department_id = ?').get(subDeptId)?.count || 0;
    if (inUseAssets > 0) {
      return res.status(400).json({ 
        error: `ไม่สามารถลบหน่วยงานย่อย "${subDept.name}" ได้ เนื่องจากมีครุภัณฑ์สังกัดอยู่ ${inUseAssets} รายการ กรุณาย้ายครุภัณฑ์ก่อนทำการลบ` 
      });
    }

    db.prepare('DELETE FROM sub_departments WHERE id = ?').run(subDeptId);
    logAudit('DELETE', 'SUB_DEPARTMENT', subDeptId, req.body?.actorName, req.body?.actorRole, `ลบหน่วยงานย่อย: ${subDept.name} (${subDept.code})`);
    res.json({ success: true, message: 'ลบหน่วยงานย่อยเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CATEGORIES (หมวดหมู่ครุภัณฑ์ตามระเบียบกรมบัญชีกลางและกระทรวงมหาดไทย)
// -------------------------------------------------------------
app.get('/api/categories', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT c.*, COUNT(a.id) as asset_count
      FROM categories c
      LEFT JOIN assets a ON a.category_id = c.id
      GROUP BY c.id
      ORDER BY CAST(c.code AS INTEGER) ASC, c.code ASC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// เพิ่มหมวดหมู่ครุภัณฑ์ใหม่
app.post('/api/categories', (req, res) => {
  try {
    const { code, name, prefix, useful_life_years, depreciation_rate_pct, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อหมวดหมู่ครุภัณฑ์' });
    }
    if (!prefix || !prefix.trim()) {
      return res.status(400).json({ error: 'กรุณาระบุคำนำหน้ารหัส (Prefix เช่น ค.18, ค.20)' });
    }

    // Auto-generate code if empty
    let finalCode = code ? String(code).trim() : '';
    if (!finalCode) {
      const allCodes = db.prepare("SELECT code FROM categories WHERE code != '99'").all();
      let maxNum = 0;
      for (const r of allCodes) {
        const n = parseInt(r.code, 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
      finalCode = String(maxNum + 1).padStart(2, '0');
    }

    // Check code duplication
    const dup = db.prepare('SELECT id FROM categories WHERE code = ?').get(finalCode);
    if (dup) {
      return res.status(400).json({ error: `รหัสหมวดหมู่ ${finalCode} มีอยู่ในระบบแล้ว` });
    }

    const life = Math.max(1, Number(useful_life_years) || 5);
    const rate = Number(depreciation_rate_pct) || Number((100 / life).toFixed(2));

    const result = db.prepare(`
      INSERT INTO categories (code, name, prefix, useful_life_years, depreciation_rate_pct, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(finalCode, name.trim(), prefix.trim(), life, rate, description?.trim() || '');

    const newCat = db.prepare(`
      SELECT c.*, 0 as asset_count 
      FROM categories c 
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newCat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// แก้ไขหมวดหมู่ครุภัณฑ์
app.put('/api/categories/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, prefix, useful_life_years, depreciation_rate_pct, description } = req.body;

    const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'ไม่พบหมวดหมู่ที่ต้องการแก้ไข' });
    }

    const life = Math.max(1, Number(useful_life_years) || 5);
    const rate = Number(depreciation_rate_pct) || Number((100 / life).toFixed(2));

    db.prepare(`
      UPDATE categories
      SET code = COALESCE(?, code),
          name = COALESCE(?, name),
          prefix = COALESCE(?, prefix),
          useful_life_years = ?,
          depreciation_rate_pct = ?,
          description = ?
      WHERE id = ?
    `).run(
      code ? String(code).trim() : null,
      name ? String(name).trim() : null,
      prefix ? String(prefix).trim() : null,
      life,
      rate,
      description?.trim() ?? '',
      id
    );

    const updated = db.prepare(`
      SELECT c.*, COUNT(a.id) as asset_count
      FROM categories c
      LEFT JOIN assets a ON a.category_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
    `).get(id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ลบหมวดหมู่ครุภัณฑ์
app.delete('/api/categories/:id', (req, res) => {
  try {
    const { id } = req.params;
    const assetCount = db.prepare('SELECT COUNT(*) as count FROM assets WHERE category_id = ?').get(id)?.count || 0;
    if (assetCount > 0) {
      return res.status(400).json({ 
        error: `ไม่สามารถลบหมวดหมู่นี้ได้เนื่องจากมีครุภัณฑ์ในระบบใช้งานอยู่ ${assetCount} รายการ (กรุณาย้ายหรือลบครุภัณฑ์ในหมวดนี้ก่อน)` 
      });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ success: true, message: 'ลบหมวดหมู่เรียบร้อยแล้ว' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// ASSETS (ครุภัณฑ์)
// -------------------------------------------------------------
app.get('/api/assets', (req, res) => {
  try {
    const { search, department_id, sub_department_id, category_id, fiscal_year, status } = req.query;

    let query = `
      SELECT a.*, 
             c.name as category_name, c.prefix as category_prefix,
             d.name as department_name, d.code as department_code,
             sd.name as sub_department_name, sd.code as sub_department_code
      FROM assets a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN sub_departments sd ON a.sub_department_id = sd.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (a.asset_code LIKE ? OR a.name LIKE ? OR a.brand LIKE ? OR a.model LIKE ? OR a.serial_number LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }
    if (department_id) {
      query += ` AND a.department_id = ?`;
      params.push(Number(department_id));
    }
    if (sub_department_id) {
      query += ` AND a.sub_department_id = ?`;
      params.push(Number(sub_department_id));
    }
    if (category_id) {
      query += ` AND a.category_id = ?`;
      params.push(Number(category_id));
    }
    if (fiscal_year) {
      query += ` AND a.fiscal_year = ?`;
      params.push(Number(fiscal_year));
    }
    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY a.id DESC`;

    const rows = db.prepare(query).all(...params);

    // Calculate current depreciation for each asset
    const results = rows.map(asset => {
      const dep = calculateDepreciation(
        asset.cost_price,
        asset.salvage_value,
        asset.useful_life_years,
        asset.acquired_date
      );
      return {
        ...asset,
        depreciation: {
          currentAnnual: dep.currentAnnualDepreciation,
          accumulated: dep.accumulatedDepreciation,
          bookValue: dep.bookValue,
          isFullyDepreciated: dep.isFullyDepreciated,
          annualRate: dep.annualRate
        }
      };
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch Import Assets from Excel
app.post('/api/assets/import-batch', (req, res) => {
  try {
    const { items, actorName, actorRole } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const categories = db.prepare('SELECT id, name, prefix, useful_life_years FROM categories').all();
    const departments = db.prepare('SELECT id, name, code FROM departments').all();
    const subDepartments = db.prepare('SELECT id, department_id, name, code FROM sub_departments').all();
    const defaultFY = db.prepare("SELECT value FROM settings WHERE key = 'fiscal_year'").get()?.value || '2569';

    const insertStmt = db.prepare(`
      INSERT INTO assets (
        asset_code, name, category_id, brand, model, serial_number,
        department_id, sub_department_id, custodian_name, location_room, acquired_date,
        fiscal_year, budget_source, vendor, cost_price, useful_life_years,
        salvage_value, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let importedCount = 0;

    for (const item of items) {
      if (!item.name) continue; // Skip empty rows

      // Match category
      let matchedCat = categories.find(c =>
        c.name === item.category ||
        c.prefix === item.category ||
        (item.category && c.name.includes(item.category))
      );
      if (!matchedCat) matchedCat = categories[0]; // Default to office equipment

      // Match department
      let matchedDept = departments.find(d =>
        d.name === item.department ||
        (item.department && d.name.includes(item.department))
      );
      if (!matchedDept) matchedDept = departments[0];

      // Match sub-department
      let matchedSubDept = null;
      if (item.sub_department) {
        matchedSubDept = subDepartments.find(sd =>
          (sd.department_id === matchedDept.id || !sd.department_id) &&
          (sd.name === item.sub_department || sd.code === item.sub_department || sd.name.includes(item.sub_department))
        );
      }

      // Format acquired date
      let acqDate = item.acquired_date;
      if (!acqDate) {
        acqDate = new Date().toISOString().split('T')[0];
      } else {
        // Handle Thai Buddhist year if provided (e.g. 2567-01-15 -> 2024-01-15)
        const parts = String(acqDate).split(/[-/]/);
        if (parts.length === 3) {
          let yr = parseInt(parts[0], 10);
          if (yr > 2400) yr -= 543;
          let mo = String(parts[1]).padStart(2, '0');
          let da = String(parts[2]).padStart(2, '0');
          acqDate = `${yr}-${mo}-${da}`;
        }
      }

      const fy = Number(item.fiscal_year) || Number(defaultFY);
      const cost = Number(item.cost_price) || 0;
      const life = Number(item.useful_life_years) || matchedCat.useful_life_years || 5;

      // Asset Code
      let code = item.asset_code;
      if (!code || code.trim() === '') {
        // Generate automatic code
        const pattern = `${matchedCat.prefix}/${fy}/%`;
        const rows = db.prepare('SELECT asset_code FROM assets WHERE asset_code LIKE ?').all(pattern);
        let maxSeq = 0;
        for (const r of rows) {
          const p = r.asset_code.split('/');
          if (p.length >= 3) {
            const s = parseInt(p[2], 10);
            if (!isNaN(s) && s > maxSeq) maxSeq = s;
          }
        }
        code = `${matchedCat.prefix}/${fy}/${String(maxSeq + 1).padStart(3, '0')}`;
      }

      // Check if code already exists to avoid conflict
      const existing = db.prepare('SELECT id FROM assets WHERE asset_code = ?').get(code);
      if (existing) {
        code = `${code}-${Math.floor(Math.random() * 1000)}`;
      }

      insertStmt.run(
        code,
        item.name,
        matchedCat.id,
        item.brand || '',
        item.model || '',
        item.serial_number || '',
        matchedDept.id,
        matchedSubDept ? matchedSubDept.id : null,
        item.custodian_name || '',
        item.location_room || '',
        acqDate,
        fy,
        item.budget_source || 'เงินงบประมาณเทศบาล',
        item.vendor || '',
        cost,
        life,
        1.0,
        item.status || 'active',
        item.notes || 'นำเข้าจากไฟล์ Excel'
      );

      importedCount++;
    }

    logAudit('CREATE', 'ASSETS', null, actorName, actorRole, `นำเข้าข้อมูลครุภัณฑ์จากไฟล์ Excel จำนวน ${importedCount} รายการ`);

    res.json({ success: true, count: importedCount });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate next asset code
app.get('/api/assets/next-code', (req, res) => {
  try {
    const { category_id, fiscal_year } = req.query;
    if (!category_id || !fiscal_year) {
      return res.status(400).json({ error: 'category_id and fiscal_year are required' });
    }

    const cat = db.prepare('SELECT prefix FROM categories WHERE id = ?').get(category_id);
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    const prefix = cat.prefix;
    const year = String(fiscal_year);

    // Find latest seq matching prefix and year
    const likePattern = `${prefix}/${year}/%`;
    const rows = db.prepare('SELECT asset_code FROM assets WHERE asset_code LIKE ?').all(likePattern);

    let maxSeq = 0;
    for (const r of rows) {
      const parts = r.asset_code.split('/');
      if (parts.length >= 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }

    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    const nextCode = `${prefix}/${year}/${nextSeq}`;

    res.json({ nextCode, prefix, year, seq: maxSeq + 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Detailed multi-year depreciation schedule
app.get('/api/assets/:id/depreciation', (req, res) => {
  try {
    const asset = db.prepare(`
      SELECT a.*, c.name as category_name, d.name as department_name
      FROM assets a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const depData = calculateDepreciation(
      asset.cost_price,
      asset.salvage_value,
      asset.useful_life_years,
      asset.acquired_date
    );

    res.json({
      asset,
      depreciation: depData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// QR Code generation
app.get('/api/assets/:id/qr', async (req, res) => {
  try {
    const asset = db.prepare(`
      SELECT a.*, c.name as category_name, d.name as department_name
      FROM assets a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    // Payload formatted for standard verification
    const payload = JSON.stringify({
      id: asset.id,
      code: asset.asset_code,
      name: asset.name,
      dept: asset.department_name,
      acq: asset.acquired_date
    });

    const qrDataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256
    });

    res.json({
      asset,
      qrDataUrl,
      payload
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Asset
app.post('/api/assets', (req, res) => {
  try {
    const {
      asset_code, name, category_id, brand, model, serial_number,
      department_id, sub_department_id, custodian_name, location_room, acquired_date,
      fiscal_year, budget_source, vendor, cost_price, useful_life_years,
      salvage_value, status, notes,
      warranty_expiry_date, vendor_phone, contract_number, procurement_method,
      deed_number, land_area, gps_location, asset_type,
      photo_url, document_url, document_name,
      actorName, actorRole
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO assets (
        asset_code, name, category_id, brand, model, serial_number,
        department_id, sub_department_id, custodian_name, location_room, acquired_date,
        fiscal_year, budget_source, vendor, cost_price, useful_life_years,
        salvage_value, status, notes,
        warranty_expiry_date, vendor_phone, contract_number, procurement_method,
        deed_number, land_area, gps_location, asset_type,
        photo_url, document_url, document_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      asset_code, name, category_id, brand || '', model || '', serial_number || '',
      department_id ? Number(department_id) : 1,
      sub_department_id ? Number(sub_department_id) : null,
      custodian_name || '', location_room || '', acquired_date,
      Number(fiscal_year), budget_source || 'เงินงบประมาณเทศบาล', vendor || '',
      Number(cost_price), Number(useful_life_years),
      salvage_value !== undefined ? Number(salvage_value) : 1.0,
      status || 'active', notes || '',
      warranty_expiry_date || null, vendor_phone || null, contract_number || null, procurement_method || 'เฉพาะเจาะจง',
      deed_number || null, land_area || null, gps_location || null, asset_type || 'equipment',
      photo_url || null, document_url || null, document_name || null
    );

    logAudit('CREATE', 'ASSETS', result.lastInsertRowid, actorName, actorRole, `ลงทะเบียนครุภัณฑ์ใหม่: ${name} (${asset_code}) ราคา ${cost_price} บาท`);

    res.json({ id: result.lastInsertRowid, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Asset
app.put('/api/assets/:id', (req, res) => {
  try {
    const {
      name, category_id, brand, model, serial_number,
      department_id, sub_department_id, custodian_name, location_room, acquired_date,
      fiscal_year, budget_source, vendor, cost_price, useful_life_years,
      salvage_value, status, notes,
      warranty_expiry_date, vendor_phone, contract_number, procurement_method,
      deed_number, land_area, gps_location, asset_type,
      photo_url, document_url, document_name,
      actorName, actorRole
    } = req.body;

    const stmt = db.prepare(`
      UPDATE assets SET
        name = ?, category_id = ?, brand = ?, model = ?, serial_number = ?,
        department_id = ?, sub_department_id = ?, custodian_name = ?, location_room = ?, acquired_date = ?,
        fiscal_year = ?, budget_source = ?, vendor = ?, cost_price = ?, useful_life_years = ?,
        salvage_value = ?, status = ?, notes = ?,
        warranty_expiry_date = ?, vendor_phone = ?, contract_number = ?, procurement_method = ?,
        deed_number = ?, land_area = ?, gps_location = ?, asset_type = ?,
        photo_url = COALESCE(?, photo_url),
        document_url = COALESCE(?, document_url),
        document_name = COALESCE(?, document_name),
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `);

    stmt.run(
      name, category_id, brand, model, serial_number,
      department_id ? Number(department_id) : 1,
      sub_department_id ? Number(sub_department_id) : null,
      custodian_name, location_room, acquired_date,
      Number(fiscal_year), budget_source, vendor, Number(cost_price), Number(useful_life_years),
      Number(salvage_value), status, notes,
      warranty_expiry_date || null, vendor_phone || null, contract_number || null, procurement_method || 'เฉพาะเจาะจง',
      deed_number || null, land_area || null, gps_location || null, asset_type || 'equipment',
      photo_url !== undefined ? photo_url : null,
      document_url !== undefined ? document_url : null,
      document_name !== undefined ? document_name : null,
      req.params.id
    );

    logAudit('UPDATE', 'ASSETS', req.params.id, actorName, actorRole, `แก้ไขข้อมูลครุภัณฑ์ ID: ${req.params.id} (${name}) สถานะ: ${status}`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List Assets by Warranty Status
app.get('/api/assets/warranties', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const rows = db.prepare(`
      SELECT a.*, c.name as category_name, d.name as department_name
      FROM assets a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE a.status != 'disposed' AND a.warranty_expiry_date IS NOT NULL AND a.warranty_expiry_date != ''
      ORDER BY a.warranty_expiry_date ASC
    `).all();

    const results = rows.map(a => {
      const exp = new Date(a.warranty_expiry_date);
      const now = new Date(today);
      const diffTime = exp - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status = 'active';
      if (diffDays < 0) {
        status = 'expired';
      } else if (diffDays <= 60) {
        status = 'expiring_soon';
      }

      return {
        ...a,
        days_remaining: diffDays,
        warranty_status: status
      };
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Asset
app.delete('/api/assets/:id', (req, res) => {
  try {
    const { actorName, actorRole } = req.body || {};
    const existing = db.prepare('SELECT asset_code, name FROM assets WHERE id = ?').get(req.params.id);

    db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.id);

    logAudit('DELETE', 'ASSETS', req.params.id, actorName, actorRole, `ลบรายการครุภัณฑ์: ${existing ? existing.name + ' (' + existing.asset_code + ')' : req.params.id}`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// INVENTORY & STOCK MANAGEMENT (FIFO & REORDER POINT)
// -------------------------------------------------------------
app.get('/api/inventory', (req, res) => {
  try {
    const { search, category, low_stock_only } = req.query;

    let query = 'SELECT * FROM inventory_items WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR item_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (low_stock_only === 'true') {
      query += ' AND current_stock <= min_stock';
    }

    query += ' ORDER BY id DESC';

    const items = db.prepare(query).all(...params);

    // Attach low stock flag & lots
    const getLots = db.prepare('SELECT * FROM inventory_lots WHERE item_id = ? AND quantity_remaining > 0 ORDER BY received_date ASC');

    const results = items.map(item => {
      const lots = getLots.all(item.id);
      return {
        ...item,
        is_low_stock: item.current_stock <= item.min_stock,
        lots
      };
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add New Inventory Item Master
app.post('/api/inventory', (req, res) => {
  try {
    const { item_code, name, category, unit, min_stock, current_stock, unit_price, storage_location, actorName, actorRole } = req.body;

    const stmt = db.prepare(`
      INSERT INTO inventory_items (item_code, name, category, unit, min_stock, current_stock, unit_price, storage_location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(item_code, name, category, unit, Number(min_stock) || 10, Number(current_stock) || 0, Number(unit_price) || 0, storage_location || '');

    // If initial stock > 0, create initial FIFO lot
    if (Number(current_stock) > 0) {
      const today = new Date().toISOString().split('T')[0];
      db.prepare(`
        INSERT INTO inventory_lots (item_id, lot_number, received_date, quantity_received, quantity_remaining, unit_cost, supplier, po_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(result.lastInsertRowid, 'LOT-INIT', today, Number(current_stock), Number(current_stock), Number(unit_price) || 0, 'ยอดยกมาเริ่มต้น', '-');
    }

    logAudit('CREATE', 'INVENTORY', result.lastInsertRowid, actorName, actorRole, `เพิ่มวัสดุใหม่: ${name} (${item_code})`);

    res.json({ id: result.lastInsertRowid, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Receive Stock (Add FIFO Lot)
app.post('/api/inventory/:id/receive', (req, res) => {
  try {
    const itemId = req.params.id;
    const { lot_number, received_date, quantity, unit_cost, supplier, po_number, actorName, actorRole } = req.body;

    const qty = Number(quantity);
    const cost = Number(unit_cost);

    if (qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }

    // Insert FIFO Lot
    const lotStmt = db.prepare(`
      INSERT INTO inventory_lots (item_id, lot_number, received_date, quantity_received, quantity_remaining, unit_cost, supplier, po_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    lotStmt.run(itemId, lot_number, received_date, qty, qty, cost, supplier || '', po_number || '');

    // Update item total stock and latest unit price
    db.prepare(`
      UPDATE inventory_items
      SET current_stock = current_stock + ?,
          unit_price = ?
      WHERE id = ?
    `).run(qty, cost, itemId);

    const item = db.prepare('SELECT name, item_code FROM inventory_items WHERE id = ?').get(itemId);

    logAudit('RECEIVE_STOCK', 'INVENTORY', itemId, actorName, actorRole, `รับวัสดุเข้าคลัง: ${item?.name} ล็อต ${lot_number} จำนวน ${qty} ราคา @${cost} บาท`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// บัญชีวัสดุ แบบ พด.2 (Stock Card) ตามระเบียบกระทรวงการคลังฯ พ.ศ. 2560 ข้อ 205
app.get('/api/inventory/items/:id/stock-card', (req, res) => {
  try {
    const { id } = req.params;
    const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id);
    if (!item) {
      return res.status(404).json({ error: 'ไม่พบรายการวัสดุ' });
    }

    // 1. รับเข้า (Lots)
    const receipts = db.prepare(`
      SELECT 
        'in' as type,
        received_date as trans_date,
        COALESCE(po_number, lot_number) as doc_no,
        COALESCE(supplier, 'ผู้ขาย/ผู้รับจ้าง') as party,
        unit_cost as unit_price,
        quantity_received as in_qty,
        (quantity_received * unit_cost) as in_amount,
        0 as out_qty,
        0 as out_amount,
        'รับเข้าคลังตามใบสั่งซื้อ/สัญญา' as remark,
        created_at
      FROM inventory_lots
      WHERE item_id = ?
    `).all(id);

    // 2. จ่ายออก (Dispensed Requisitions)
    const issues = db.prepare(`
      SELECT 
        'out' as type,
        r.dispensed_date as trans_date,
        r.req_number as doc_no,
        (d.name || ' (' || r.requester_name || ')') as party,
        ri.unit_cost_at_dispense as unit_price,
        0 as in_qty,
        0 as in_amount,
        ri.dispensed_qty as out_qty,
        (ri.dispensed_qty * COALESCE(ri.unit_cost_at_dispense, 0)) as out_amount,
        r.purpose as remark,
        r.created_at
      FROM requisition_items ri
      JOIN requisitions r ON ri.requisition_id = r.id
      LEFT JOIN departments d ON r.department_id = d.id
      WHERE ri.item_id = ? AND r.status = 'dispensed'
    `).all(id);

    // Combine & Sort chronologically
    const allTrans = [...receipts, ...issues].sort((a, b) => {
      const dateA = a.trans_date || '';
      const dateB = b.trans_date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return a.type === 'in' ? -1 : 1;
    });

    // Compute Running Balance
    let balanceQty = 0;
    let balanceAmount = 0;

    const runningTransactions = allTrans.map((t, idx) => {
      if (t.type === 'in') {
        balanceQty += t.in_qty;
        balanceAmount += t.in_amount;
      } else {
        balanceQty = Math.max(0, balanceQty - t.out_qty);
        balanceAmount = Math.max(0, balanceAmount - t.out_amount);
      }
      return {
        seq: idx + 1,
        ...t,
        balance_qty: balanceQty,
        balance_amount: balanceAmount
      };
    });

    res.json({
      item,
      transactions: runningTransactions,
      current_stock: balanceQty,
      total_value: balanceAmount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// REQUISITIONS (ใบเบิกพัสดุออนไลน์ & WORKFLOW ไร้กระดาษ)
// -------------------------------------------------------------
app.get('/api/requests', (req, res) => {
  try {
    const { status, department_id, sub_department_id } = req.query;

    let query = `
      SELECT r.*, d.name as department_name, d.code as department_code,
             sd.name as sub_department_name, sd.code as sub_department_code
      FROM requisitions r
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN sub_departments sd ON r.sub_department_id = sd.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
    }
    if (department_id) {
      query += ` AND r.department_id = ?`;
      params.push(Number(department_id));
    }
    if (sub_department_id) {
      query += ` AND r.sub_department_id = ?`;
      params.push(Number(sub_department_id));
    }

    query += ` ORDER BY r.id DESC`;

    const rows = db.prepare(query).all(...params);

    const getItems = db.prepare(`
      SELECT ri.*, ii.item_code, ii.name as item_name, ii.unit, ii.current_stock
      FROM requisition_items ri
      LEFT JOIN inventory_items ii ON ri.item_id = ii.id
      WHERE ri.requisition_id = ?
    `);

    const results = rows.map(r => ({
      ...r,
      items: getItems.all(r.id)
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Requisition
app.post('/api/requests', (req, res) => {
  try {
    const { department_id, sub_department_id, requester_name, requester_position, requested_date, purpose, notes, items, actorName, actorRole } = req.body;

    // Generate req_number เช่น บบ.04/2569
    const yearSetting = db.prepare("SELECT value FROM settings WHERE key = 'fiscal_year'").get();
    const currentFY = yearSetting ? yearSetting.value : '2569';

    const countRow = db.prepare("SELECT count(*) as count FROM requisitions WHERE req_number LIKE ?").get(`%/${currentFY}%`);
    const nextSeq = String((countRow ? countRow.count : 0) + 1).padStart(2, '0');
    const req_number = `บบ.${nextSeq}/${currentFY}`;

    const stmt = db.prepare(`
      INSERT INTO requisitions (req_number, department_id, sub_department_id, requester_name, requester_position, requested_date, purpose, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?)
    `);

    const result = stmt.run(req_number, department_id, sub_department_id ? Number(sub_department_id) : null, requester_name, requester_position, requested_date, purpose, notes || '');
    const reqId = result.lastInsertRowid;

    const itemStmt = db.prepare(`
      INSERT INTO requisition_items (requisition_id, item_id, requested_qty, approved_qty)
      VALUES (?, ?, ?, ?)
    `);

    for (const item of items) {
      itemStmt.run(reqId, item.item_id, item.requested_qty, item.requested_qty);
    }

    logAudit('CREATE', 'REQUISITION', reqId, actorName || requester_name, actorRole || 'ผู้ขอเบิก', `สร้างใบเบิกพัสดุ ${req_number}: ${purpose}`);

    res.json({ id: reqId, req_number, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve Requisition (by Head of Dept)
app.put('/api/requests/:id/approve', (req, res) => {
  try {
    const reqId = req.params.id;
    const { approver_name, approval_comment, approved_items, actorName, actorRole } = req.body;
    const today = new Date().toISOString().split('T')[0];

    db.prepare(`
      UPDATE requisitions
      SET status = 'approved',
          approver_name = ?,
          approved_date = ?,
          approval_comment = ?
      WHERE id = ?
    `).run(approver_name, today, approval_comment || 'อนุมัติตามขอ', reqId);

    if (approved_items && Array.isArray(approved_items)) {
      const updateItemStmt = db.prepare('UPDATE requisition_items SET approved_qty = ? WHERE id = ?');
      for (const item of approved_items) {
        updateItemStmt.run(item.approved_qty, item.id);
      }
    }

    const reqData = db.prepare('SELECT req_number FROM requisitions WHERE id = ?').get(reqId);
    logAudit('APPROVE', 'REQUISITION', reqId, actorName || approver_name, actorRole || 'หัวหน้าฝ่าย/กอง', `อนุมัติใบเบิกพัสดุ ${reqData?.req_number}`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject Requisition
app.put('/api/requests/:id/reject', (req, res) => {
  try {
    const reqId = req.params.id;
    const { approver_name, reason, actorName, actorRole } = req.body;

    db.prepare(`
      UPDATE requisitions
      SET status = 'rejected',
          approver_name = ?,
          approval_comment = ?
      WHERE id = ?
    `).run(approver_name, reason || 'ไม่อนุมัติ', reqId);

    const reqData = db.prepare('SELECT req_number FROM requisitions WHERE id = ?').get(reqId);
    logAudit('REJECT', 'REQUISITION', reqId, actorName || approver_name, actorRole || 'หัวหน้าฝ่าย/กอง', `ปฏิเสธใบเบิกพัสดุ ${reqData?.req_number}: ${reason}`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dispense Requisition (FIFO Stock Deduction by Supply Officer)
app.put('/api/requests/:id/dispense', (req, res) => {
  try {
    const reqId = req.params.id;
    const { dispenser_name, dispensed_items, actorName, actorRole } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Read requisition items
    const reqItems = db.prepare('SELECT * FROM requisition_items WHERE requisition_id = ?').all(reqId);

    // FIFO deduction loop
    for (const ri of reqItems) {
      // Find override qty if provided, else use approved_qty or requested_qty
      const matched = dispensed_items?.find(di => di.id === ri.id);
      const qtyToDispense = matched ? Number(matched.dispensed_qty) : (ri.approved_qty || ri.requested_qty);

      let remainingToDeduct = qtyToDispense;
      let totalCost = 0;

      // Fetch active lots ordered by received_date ASC (FIFO)
      const lots = db.prepare(`
        SELECT * FROM inventory_lots
        WHERE item_id = ? AND quantity_remaining > 0
        ORDER BY received_date ASC, id ASC
      `).all(ri.item_id);

      for (const lot of lots) {
        if (remainingToDeduct <= 0) break;
        const deduct = Math.min(lot.quantity_remaining, remainingToDeduct);
        db.prepare('UPDATE inventory_lots SET quantity_remaining = quantity_remaining - ? WHERE id = ?').run(deduct, lot.id);
        totalCost += deduct * lot.unit_cost;
        remainingToDeduct -= deduct;
      }

      const avgUnitCost = qtyToDispense > 0 ? +(totalCost / qtyToDispense).toFixed(2) : 0;

      // Update requisition item
      db.prepare(`
        UPDATE requisition_items
        SET dispensed_qty = ?, unit_cost_at_dispense = ?
        WHERE id = ?
      `).run(qtyToDispense, avgUnitCost, ri.id);

      // Decrement main inventory item current stock
      db.prepare('UPDATE inventory_items SET current_stock = MAX(0, current_stock - ?) WHERE id = ?').run(qtyToDispense, ri.item_id);
    }

    // Update requisition header
    db.prepare(`
      UPDATE requisitions
      SET status = 'dispensed',
          dispenser_name = ?,
          dispensed_date = ?
      WHERE id = ?
    `).run(dispenser_name, today, reqId);

    const reqData = db.prepare('SELECT req_number FROM requisitions WHERE id = ?').get(reqId);
    logAudit('DISPENSE', 'REQUISITION', reqId, actorName || dispenser_name, actorRole || 'เจ้าหน้าที่พัสดุกลาง', `จ่ายพัสดุและตัดสต็อก FIFO ใบเบิก ${reqData?.req_number}`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MAINTENANCE & REPAIR (แจ้งซ่อม & ประวัติการซ่อม)
// -------------------------------------------------------------
app.get('/api/maintenance', (req, res) => {
  try {
    const { status, asset_id } = req.query;

    let query = `
      SELECT m.*, a.asset_code, a.name as asset_name, a.brand, a.model, a.cost_price, a.status as asset_status,
             d.name as department_name,
             (SELECT COALESCE(SUM(repair_cost), 0) FROM maintenance_records WHERE asset_id = m.asset_id AND status = 'completed') as total_repair_cost
      FROM maintenance_records m
      LEFT JOIN assets a ON m.asset_id = a.id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND m.status = ?`;
      params.push(status);
    }
    if (asset_id) {
      query += ` AND m.asset_id = ?`;
      params.push(Number(asset_id));
    }

    query += ` ORDER BY m.id DESC`;

    const rows = db.prepare(query).all(...params);
    const enriched = rows.map(r => {
      const cost = Number(r.cost_price) || 0;
      const rep = Number(r.total_repair_cost) || 0;
      const ratio = cost > 0 ? Number(((rep / cost) * 100).toFixed(1)) : 0;
      return {
        ...r,
        repair_ratio_pct: ratio,
        is_unviable: ratio >= 50.0 // เกณฑ์ สตง./ระเบียบพัสดุฯ เกิน 50% ถือว่าไม่คุ้มค่าที่จะซ่อม
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ประเมินความคุ้มค่าการซ่อมเทียบราคาทุนจัดซื้อ (Repair vs Replacement Benchmark)
app.get('/api/maintenance/benchmarks/:asset_id', (req, res) => {
  try {
    const { asset_id } = req.params;
    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(asset_id);
    if (!asset) return res.status(404).json({ error: 'ไม่พบครุภัณฑ์' });

    const totalRepair = db.prepare(`
      SELECT COALESCE(SUM(repair_cost), 0) as total_repair_cost, COUNT(*) as repair_count
      FROM maintenance_records
      WHERE asset_id = ? AND status = 'completed'
    `).get(asset_id);

    const costPrice = Number(asset.cost_price) || 0;
    const repairCost = Number(totalRepair.total_repair_cost) || 0;
    const ratioPct = costPrice > 0 ? Number(((repairCost / costPrice) * 100).toFixed(1)) : 0;
    const isUnviable = ratioPct >= 50.0;

    res.json({
      asset_id: asset.id,
      asset_code: asset.asset_code,
      asset_name: asset.name,
      cost_price: costPrice,
      total_repair_cost: repairCost,
      repair_count: totalRepair.repair_count,
      repair_ratio_pct: ratioPct,
      is_unviable: isUnviable,
      threshold_pct: 50.0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ส่งเรื่องขอจำหน่ายพัสดุจากใบแจ้งซ่อม (ตามระเบียบข้อ 215 เนื่องจากซ่อมไม่คุ้มค่า)
app.post('/api/maintenance/:id/convert-to-disposal', (req, res) => {
  try {
    const { id } = req.params;
    const { actorName, actorRole } = req.body;
    const m = db.prepare('SELECT m.*, a.asset_code, a.name as asset_name, a.cost_price FROM maintenance_records m JOIN assets a ON m.asset_id = a.id WHERE m.id = ?').get(id);
    if (!m) return res.status(404).json({ error: 'ไม่พบใบแจ้งซ่อม' });

    // Update maintenance record status to unrepairable
    db.prepare("UPDATE maintenance_records SET status = 'unrepairable' WHERE id = ?").run(id);

    // Update asset status to pending_disposal
    db.prepare("UPDATE assets SET status = 'pending_disposal' WHERE id = ?").run(m.asset_id);

    logAudit('CONVERT_MAINTENANCE_TO_DISPOSAL', 'DISPOSAL', m.asset_id, actorName || 'เจ้าหน้าที่พัสดุ', actorRole || 'officer', `เสนอจำหน่ายพัสดุจากใบแจ้งซ่อม ${m.ticket_number} (ค่าซ่อมสะสมไม่คุ้มค่าตามระเบียบข้อ 215)`);

    res.json({
      success: true,
      message: `ส่งเรื่องขอจำหน่ายพัสดุ ${m.asset_code} เรียบร้อยแล้ว (สถานะเปลี่ยนเป็น: รอจำหน่ายพัสดุ)`,
      asset_id: m.asset_id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Maintenance Ticket
app.post('/api/maintenance', (req, res) => {
  try {
    const { asset_id, report_date, reporter_name, symptom, repair_vendor, spare_parts, repair_cost, actorName, actorRole } = req.body;

    const countRow = db.prepare("SELECT count(*) as count FROM maintenance_records").get();
    const nextSeq = String((countRow ? countRow.count : 0) + 1).padStart(2, '0');
    const ticket_number = `ซร.${nextSeq}/2569`;

    const stmt = db.prepare(`
      INSERT INTO maintenance_records (ticket_number, asset_id, report_date, reporter_name, symptom, status, repair_vendor, spare_parts, repair_cost)
      VALUES (?, ?, ?, ?, ?, 'reported', ?, ?, ?)
    `);

    const result = stmt.run(ticket_number, asset_id, report_date, reporter_name, symptom, repair_vendor || '', spare_parts || '', Number(repair_cost) || 0);

    // Update asset status to 'damaged'
    db.prepare("UPDATE assets SET status = 'damaged' WHERE id = ?").run(asset_id);

    const asset = db.prepare('SELECT name, asset_code FROM assets WHERE id = ?').get(asset_id);
    logAudit('CREATE', 'MAINTENANCE', result.lastInsertRowid, actorName || reporter_name, actorRole || 'ผู้แจ้งซ่อม', `แจ้งซ่อมครุภัณฑ์ ${asset?.name} (${ticket_number})`);

    res.json({ id: result.lastInsertRowid, ticket_number, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Maintenance Ticket Status
app.put('/api/maintenance/:id', (req, res) => {
  try {
    const { status, repair_vendor, spare_parts, repair_cost, completion_date, notes, actorName, actorRole } = req.body;

    db.prepare(`
      UPDATE maintenance_records
      SET status = ?, repair_vendor = ?, spare_parts = ?, repair_cost = ?, completion_date = ?, notes = ?
      WHERE id = ?
    `).run(status, repair_vendor, spare_parts, Number(repair_cost) || 0, completion_date, notes, req.params.id);

    // Get asset_id
    const m = db.prepare('SELECT asset_id, ticket_number FROM maintenance_records WHERE id = ?').get(req.params.id);
    if (m) {
      if (status === 'completed') {
        db.prepare("UPDATE assets SET status = 'active' WHERE id = ?").run(m.asset_id);
      } else if (status === 'unrepairable') {
        db.prepare("UPDATE assets SET status = 'pending_disposal' WHERE id = ?").run(m.asset_id);
      }
    }

    logAudit('UPDATE', 'MAINTENANCE', req.params.id, actorName, actorRole, `อัปเดตใบแจ้งซ่อม ${m?.ticket_number} สถานะ: ${status}`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// ANNUAL ASSET VERIFICATION (การตรวจสอบพัสดุประจำปี)
// -------------------------------------------------------------
app.get('/api/annual-audits', (req, res) => {
  try {
    const audits = db.prepare('SELECT * FROM annual_audits ORDER BY fiscal_year DESC').all();
    res.json(audits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/annual-audits/:id', (req, res) => {
  try {
    const audit = db.prepare('SELECT * FROM annual_audits WHERE id = ?').get(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit not found' });

    // Fetch items with status in this audit
    const items = db.prepare(`
      SELECT a.id as asset_id, a.asset_code, a.name, a.brand, a.model, a.location_room, a.custodian_name,
             a.department_id, a.sub_department_id,
             c.name as category_name, d.name as department_name, d.code as department_code,
             sd.name as sub_department_name, sd.code as sub_department_code,
             aad.physical_status, aad.verified_by, aad.verified_at, aad.remarks
      FROM assets a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN sub_departments sd ON a.sub_department_id = sd.id
      LEFT JOIN annual_audit_details aad ON aad.asset_id = a.id AND aad.audit_id = ?
      WHERE a.status != 'disposed'
      ORDER BY d.code ASC, sd.code ASC, a.asset_code ASC
    `).all(req.params.id);

    res.json({
      audit,
      items
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Annual Audit Round
app.post('/api/annual-audits', (req, res) => {
  try {
    const { fiscal_year, audit_date, committee_chairman, committee_members, notes, actorName, actorRole } = req.body;

    const countRow = db.prepare("SELECT count(*) as count FROM annual_audits WHERE fiscal_year = ?").get(fiscal_year);
    const nextSeq = String((countRow ? countRow.count : 0) + 1).padStart(2, '0');
    const audit_code = `ตส.${fiscal_year}/${nextSeq}`;

    const stmt = db.prepare(`
      INSERT INTO annual_audits (audit_code, fiscal_year, audit_date, committee_chairman, committee_members, status, notes)
      VALUES (?, ?, ?, ?, ?, 'in_progress', ?)
    `);

    const result = stmt.run(
      audit_code, Number(fiscal_year), audit_date, committee_chairman,
      typeof committee_members === 'object' ? JSON.stringify(committee_members) : committee_members,
      notes || ''
    );

    logAudit('CREATE', 'AUDIT', result.lastInsertRowid, actorName, actorRole, `เปิดรอบตรวจสอบพัสดุประจำปี ${fiscal_year} (${audit_code})`);

    res.json({ id: result.lastInsertRowid, audit_code, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record Verification for single asset (used by QR scanner / checklist)
app.post('/api/annual-audits/:id/verify', (req, res) => {
  try {
    const auditId = req.params.id;
    const { asset_id, physical_status, verified_by, remarks, actorName, actorRole } = req.body;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    db.prepare(`
      INSERT INTO annual_audit_details (audit_id, asset_id, physical_status, verified_by, verified_at, remarks)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(audit_id, asset_id) DO UPDATE SET
        physical_status = excluded.physical_status,
        verified_by = excluded.verified_by,
        verified_at = excluded.verified_at,
        remarks = excluded.remarks
    `).run(auditId, asset_id, physical_status || 'normal', verified_by || 'กรรมการตรวจสอบ', now, remarks || '');

    // Sync asset status if marked damaged
    if (physical_status === 'damaged') {
      db.prepare("UPDATE assets SET status = 'damaged' WHERE id = ?").run(asset_id);
    }

    const asset = db.prepare('SELECT asset_code, name FROM assets WHERE id = ?').get(asset_id);
    logAudit('AUDIT_CHECK', 'AUDIT', asset_id, actorName || verified_by, actorRole || 'กรรมการตรวจสอบ', `ตรวจเช็กครุภัณฑ์ ${asset?.asset_code}: สภาพ ${physical_status}`);

    res.json({ success: true, verified_at: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete Annual Audit
app.put('/api/annual-audits/:id/complete', (req, res) => {
  try {
    db.prepare("UPDATE annual_audits SET status = 'completed' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// ASSET DISPOSAL (ระบบแทงจำหน่ายครุภัณฑ์)
// -------------------------------------------------------------
app.get('/api/disposals', (req, res) => {
  try {
    const query = `
      SELECT disp.*, a.asset_code, a.name as asset_name, a.cost_price, a.acquired_date,
             a.brand, a.model, a.serial_number,
             c.name as category_name, d.name as department_name
      FROM disposals disp
      LEFT JOIN assets a ON disp.asset_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN departments d ON a.department_id = d.id
      ORDER BY disp.id DESC
    `;
    const rows = db.prepare(query).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/disposals', (req, res) => {
  try {
    const {
      asset_id, disposal_method, disposal_date, approved_order_no,
      approved_by, sale_proceeds, transfer_to, notes, actorName, actorRole
    } = req.body;

    const countRow = db.prepare("SELECT count(*) as count FROM disposals").get();
    const nextSeq = String((countRow ? countRow.count : 0) + 1).padStart(2, '0');
    const disposal_number = `จน.${nextSeq}/2569`;

    const stmt = db.prepare(`
      INSERT INTO disposals (
        disposal_number, asset_id, disposal_method, disposal_date,
        approved_order_no, approved_by, sale_proceeds, transfer_to, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      disposal_number, asset_id, disposal_method, disposal_date,
      approved_order_no, approved_by, Number(sale_proceeds) || 0,
      transfer_to || '', notes || ''
    );

    // Update asset status to 'disposed'
    db.prepare("UPDATE assets SET status = 'disposed' WHERE id = ?").run(asset_id);

    const asset = db.prepare('SELECT asset_code, name FROM assets WHERE id = ?').get(asset_id);
    logAudit('DISPOSE', 'DISPOSAL', asset_id, actorName || approved_by, actorRole || 'เจ้าหน้าที่พัสดุกลาง', `แทงจำหน่ายครุภัณฑ์ ${asset?.name} (${asset?.asset_code}) วิธี: ${disposal_method}`);

    res.json({ id: result.lastInsertRowid, disposal_number, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// ASSET BORROWS & RETURNS (ระบบยืม-คืน ครุภัณฑ์)
// -------------------------------------------------------------
app.get('/api/borrows', (req, res) => {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT b.*, 
             a.asset_code, a.name as asset_name, a.brand, a.model, a.serial_number,
             d.name as department_name
      FROM asset_borrows b
      LEFT JOIN assets a ON b.asset_id = a.id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      if (status === 'overdue') {
        const today = new Date().toISOString().split('T')[0];
        query += ` AND b.status = 'borrowed' AND b.expected_return_date < ?`;
        params.push(today);
      } else {
        query += ` AND b.status = ?`;
        params.push(status);
      }
    }

    if (search) {
      query += ` AND (b.borrow_code LIKE ? OR b.borrower_name LIKE ? OR a.asset_code LIKE ? OR a.name LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ` ORDER BY b.id DESC`;

    const rows = db.prepare(query).all(...params);
    const today = new Date().toISOString().split('T')[0];

    // Compute dynamic overdue flag
    const results = rows.map(r => ({
      ...r,
      is_overdue: r.status === 'borrowed' && r.expected_return_date < today
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/borrows', (req, res) => {
  try {
    const {
      asset_id, borrower_name, borrower_position, borrower_department,
      borrower_phone, purpose, borrow_date, expected_return_date,
      notes, actorName, actorRole
    } = req.body;

    const countRow = db.prepare("SELECT count(*) as count FROM asset_borrows").get();
    const nextSeq = String((countRow ? countRow.count : 0) + 1).padStart(2, '0');
    const borrow_code = `ยค.${nextSeq}/2569`;

    const stmt = db.prepare(`
      INSERT INTO asset_borrows (
        borrow_code, asset_id, borrower_name, borrower_position,
        borrower_department, borrower_phone, purpose, borrow_date,
        expected_return_date, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'borrowed', ?)
    `);

    const result = stmt.run(
      borrow_code, Number(asset_id), borrower_name, borrower_position || '',
      borrower_department || '', borrower_phone || '', purpose, borrow_date,
      expected_return_date, notes || ''
    );

    // Update asset status to 'borrowed'
    db.prepare("UPDATE assets SET status = 'borrowed' WHERE id = ?").run(Number(asset_id));

    const asset = db.prepare('SELECT name, asset_code FROM assets WHERE id = ?').get(asset_id);
    logAudit('CREATE', 'BORROW', result.lastInsertRowid, actorName || borrower_name, actorRole || 'ผู้ขอยืม', `บันทึกการยืมครุภัณฑ์: ${asset?.name} (${asset?.asset_code}) โดย ${borrower_name} รหัสใบยืม ${borrow_code}`);

    res.json({ id: result.lastInsertRowid, borrow_code, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/borrows/:id/return', (req, res) => {
  try {
    const { actual_return_date, return_condition, notes, actorName, actorRole } = req.body;
    const borrowId = req.params.id;

    const borrow = db.prepare('SELECT asset_id, borrow_code, borrower_name FROM asset_borrows WHERE id = ?').get(borrowId);
    if (!borrow) return res.status(404).json({ error: 'Borrow record not found' });

    db.prepare(`
      UPDATE asset_borrows
      SET status = 'returned',
          actual_return_date = ?,
          return_condition = ?,
          notes = CASE WHEN ? != '' THEN ? ELSE notes END
      WHERE id = ?
    `).run(actual_return_date, return_condition || 'normal', notes || '', notes || '', borrowId);

    // Update asset status based on condition
    let newAssetStatus = 'active';
    if (return_condition === 'damaged') newAssetStatus = 'damaged';
    if (return_condition === 'lost') newAssetStatus = 'lost';

    db.prepare('UPDATE assets SET status = ? WHERE id = ?').run(newAssetStatus, borrow.asset_id);

    const asset = db.prepare('SELECT name, asset_code FROM assets WHERE id = ?').get(borrow.asset_id);
    logAudit('UPDATE', 'BORROW', borrowId, actorName, actorRole, `บันทึกการรับคืนครุภัณฑ์: ${asset?.name} (${asset?.asset_code}) สภาพ: ${return_condition}`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// ASSET TRANSFERS (ระบบโอนย้ายครุภัณฑ์ระหว่างสำนัก/กอง)
// -------------------------------------------------------------
app.get('/api/transfers', (req, res) => {
  try {
    const query = `
      SELECT t.*,
             a.asset_code, a.name as asset_name, a.brand, a.model, a.cost_price,
             d1.name as from_department_name,
             d2.name as to_department_name
      FROM asset_transfers t
      LEFT JOIN assets a ON t.asset_id = a.id
      LEFT JOIN departments d1 ON t.from_department_id = d1.id
      LEFT JOIN departments d2 ON t.to_department_id = d2.id
      ORDER BY t.id DESC
    `;
    const rows = db.prepare(query).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transfers', (req, res) => {
  try {
    const {
      asset_id, to_department_id, to_sub_department_id, transfer_date, reason,
      deliverer_name, receiver_name, new_location_room, new_custodian_name,
      approver_name, notes, actorName, actorRole
    } = req.body;

    const asset = db.prepare('SELECT department_id, sub_department_id, name, asset_code FROM assets WHERE id = ?').get(asset_id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const from_department_id = asset.department_id;

    const countRow = db.prepare("SELECT count(*) as count FROM asset_transfers").get();
    const nextSeq = String((countRow ? countRow.count : 0) + 1).padStart(2, '0');
    const transfer_number = `อย.${nextSeq}/2569`;

    const stmt = db.prepare(`
      INSERT INTO asset_transfers (
        transfer_number, asset_id, from_department_id, to_department_id,
        transfer_date, reason, deliverer_name, receiver_name,
        new_location_room, new_custodian_name, approver_name, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      transfer_number, Number(asset_id), from_department_id, Number(to_department_id),
      transfer_date, reason, deliverer_name, receiver_name,
      new_location_room || '', new_custodian_name || '', approver_name || '', notes || ''
    );

    // Immediately update asset's department, sub_department, custodian, and room
    db.prepare(`
      UPDATE assets
      SET department_id = ?,
          sub_department_id = ?,
          custodian_name = ?,
          location_room = ?,
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(
      Number(to_department_id),
      to_sub_department_id !== undefined ? (to_sub_department_id ? Number(to_sub_department_id) : null) : asset.sub_department_id,
      new_custodian_name || '',
      new_location_room || '',
      Number(asset_id)
    );

    const fromDept = db.prepare('SELECT name FROM departments WHERE id = ?').get(from_department_id);
    const toDept = db.prepare('SELECT name FROM departments WHERE id = ?').get(to_department_id);

    logAudit('UPDATE', 'TRANSFER', result.lastInsertRowid, actorName || deliverer_name, actorRole || 'เจ้าหน้าที่ผู้ส่งมอบ', `โอนย้ายครุภัณฑ์ ${asset.name} (${asset.asset_code}) จาก ${fromDept?.name} ไปยัง ${toDept?.name}`);

    res.json({ id: result.lastInsertRowid, transfer_number, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// BATCH QR CODE GENERATION (พิมพ์สติกเกอร์ยกชุด แผ่น A4)
// -------------------------------------------------------------
app.post('/api/assets/batch-qr', async (req, res) => {
  try {
    const { asset_ids } = req.body;
    if (!asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) {
      return res.status(400).json({ error: 'No asset_ids provided' });
    }

    const placeholders = asset_ids.map(() => '?').join(',');
    const query = `
      SELECT a.*, c.name as category_name, d.name as department_name, sd.name as sub_department_name
      FROM assets a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN sub_departments sd ON a.sub_department_id = sd.id
      WHERE a.id IN (${placeholders})
      ORDER BY a.asset_code ASC
    `;

    const assets = db.prepare(query).all(...asset_ids);

    const results = [];
    for (const asset of assets) {
      const payload = JSON.stringify({
        id: asset.id,
        code: asset.asset_code,
        name: asset.name,
        dept: asset.department_name,
        acq: asset.acquired_date
      });

      const qrDataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 180
      });

      results.push({
        asset,
        qrDataUrl
      });
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// AUDIT LOGS (SECURITY & AUDIT TRAIL)
// -------------------------------------------------------------
app.get('/api/audit-logs', (req, res) => {
  try {
    const { module, limit } = req.query;
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (module) {
      query += ' AND module = ?';
      params.push(module);
    }

    query += ' ORDER BY id DESC LIMIT ?';
    params.push(Number(limit) || 100);

    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// SUMMARY & E-LAAS EXPORT
// -------------------------------------------------------------
app.get('/api/reports/summary', (req, res) => {
  try {
    const totalAssets = db.prepare("SELECT count(*) as count, sum(cost_price) as total_cost FROM assets WHERE status != 'disposed'").get();
    const assetsByStatus = db.prepare("SELECT status, count(*) as count FROM assets GROUP BY status").all();
    const totalItems = db.prepare("SELECT count(*) as count, sum(current_stock * unit_price) as total_value FROM inventory_items").get();
    const lowStockCount = db.prepare("SELECT count(*) as count FROM inventory_items WHERE current_stock <= min_stock").get();
    const pendingReqs = db.prepare("SELECT count(*) as count FROM requisitions WHERE status = 'pending_approval'").get();
    const ongoingRepairs = db.prepare("SELECT count(*) as count FROM maintenance_records WHERE status IN ('reported', 'inspecting', 'in_progress')").get();
    const activeBorrows = db.prepare("SELECT count(*) as count FROM asset_borrows WHERE status = 'borrowed'").get();
    const transfersCount = db.prepare("SELECT count(*) as count FROM asset_transfers").get();

    // Warranty alerts: expiring in next 60 days and already expired
    const today = new Date().toISOString().split('T')[0];
    const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const expiringWarranty = db.prepare(`
      SELECT count(*) as count FROM assets 
      WHERE status != 'disposed' 
        AND warranty_expiry_date IS NOT NULL 
        AND warranty_expiry_date != ''
        AND warranty_expiry_date >= ? 
        AND warranty_expiry_date <= ?
    `).get(today, in60Days);

    const expiredWarranty = db.prepare(`
      SELECT count(*) as count FROM assets 
      WHERE status != 'disposed' 
        AND warranty_expiry_date IS NOT NULL 
        AND warranty_expiry_date != ''
        AND warranty_expiry_date < ?
    `).get(today);

    // Calculate total net book value
    const allActiveAssets = db.prepare("SELECT cost_price, salvage_value, useful_life_years, acquired_date FROM assets WHERE status != 'disposed'").all();
    let totalBookValue = 0;
    let totalAccumulatedDepreciation = 0;

    for (const a of allActiveAssets) {
      const dep = calculateDepreciation(a.cost_price, a.salvage_value, a.useful_life_years, a.acquired_date);
      totalBookValue += dep.bookValue;
      totalAccumulatedDepreciation += dep.accumulatedDepreciation;
    }

    res.json({
      totalAssetsCount: totalAssets?.count || 0,
      totalAssetsCost: totalAssets?.total_cost || 0,
      totalBookValue: +totalBookValue.toFixed(2),
      totalAccumulatedDepreciation: +totalAccumulatedDepreciation.toFixed(2),
      assetsByStatus,
      totalInventoryItems: totalItems?.count || 0,
      totalInventoryValue: +(totalItems?.total_value || 0).toFixed(2),
      lowStockCount: lowStockCount?.count || 0,
      pendingRequisitionsCount: pendingReqs?.count || 0,
      ongoingRepairsCount: ongoingRepairs?.count || 0,
      activeBorrowsCount: activeBorrows?.count || 0,
      transfersCount: transfersCount?.count || 0,
      expiringWarrantyCount: expiringWarranty?.count || 0,
      expiredWarrantyCount: expiredWarranty?.count || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Monthly Procurement Report (แบบ สขร.1)
app.get('/api/reports/skr1', (req, res) => {
  try {
    const { year, month } = req.query; // year (e.g. 2569) and month (1-12)
    let datePattern = '';
    if (year && month) {
      let calYear = Number(year);
      if (calYear > 2400) calYear -= 543;
      const monthStr = String(month).padStart(2, '0');
      datePattern = `${calYear}-${monthStr}%`;
    }

    let assetQuery = `
      SELECT a.*, c.name as category_name, d.name as department_name
      FROM assets a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN departments d ON a.department_id = d.id
    `;
    const params = [];
    if (datePattern) {
      assetQuery += ' WHERE a.acquired_date LIKE ? ';
      params.push(datePattern);
    }
    assetQuery += ' ORDER BY a.acquired_date ASC';

    const assets = db.prepare(assetQuery).all(...params);

    let invQuery = `
      SELECT l.*, i.name as item_name, i.item_code, i.category as item_category, (l.quantity_received * l.unit_cost) as total_cost
      FROM inventory_lots l
      JOIN inventory_items i ON l.item_id = i.id
    `;
    const invParams = [];
    if (datePattern) {
      invQuery += ' WHERE l.received_date LIKE ? ';
      invParams.push(datePattern);
    }
    invQuery += ' ORDER BY l.received_date ASC';

    const lots = db.prepare(invQuery).all(...invParams);

    let seq = 1;
    const items = [];

    for (const a of assets) {
      items.push({
        seq: seq++,
        project_name: `จัดซื้อ${a.name} (${a.category_name})`,
        budget_amount: a.cost_price,
        reference_price: a.cost_price,
        procurement_method: a.procurement_method || 'เฉพาะเจาะจง',
        bidders: `${a.vendor || 'ผู้เสนอราคาตามเกณฑ์'} (เสนอราคา ${a.cost_price.toLocaleString()} บาท)`,
        winner: a.vendor || '-',
        agreed_price: a.cost_price,
        reason: 'เป็นผู้มีคุณสมบัติถูกต้องตามเงื่อนไขและเสนอราคาเหมาะสม',
        contract_info: a.contract_number ? `${a.contract_number} ลว. ${a.acquired_date}` : `ใบสั่งซื้อ ลว. ${a.acquired_date}`,
        acquired_date: a.acquired_date,
        department_name: a.department_name
      });
    }

    for (const l of lots) {
      items.push({
        seq: seq++,
        project_name: `จัดซื้อ${l.item_name} จำนวน ${l.quantity_received} หน่วย`,
        budget_amount: l.total_cost,
        reference_price: l.total_cost,
        procurement_method: 'เฉพาะเจาะจง',
        bidders: `${l.supplier || 'ผู้ขายวัสดุ'} (เสนอราคา ${l.total_cost.toLocaleString()} บาท)`,
        winner: l.supplier || '-',
        agreed_price: l.total_cost,
        reason: 'เป็นผู้มีคุณสมบัติถูกต้องและเสนอราคาตามเกณฑ์ท้องถิ่น',
        contract_info: l.po_number && l.po_number !== '-' ? `${l.po_number} ลว. ${l.received_date}` : `ใบสั่งซื้อ ลว. ${l.received_date}`,
        acquired_date: l.received_date,
        department_name: 'กองคลัง (งานพัสดุกลาง)'
      });
    }

    res.json({
      year: year || '2569',
      month: month || '1',
      totalItems: items.length,
      totalBudget: items.reduce((sum, i) => sum + i.budget_amount, 0),
      items
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// FIXED ASSET RECONCILIATION (งบกระทบยอดสินทรัพย์และค่าเสื่อมราคาประจำปี)
// -------------------------------------------------------------
app.get('/api/reports/fixed-asset-reconciliation', (req, res) => {
  try {
    const defaultFY = db.prepare("SELECT value FROM settings WHERE key = 'fiscal_year'").get()?.value || '2569';
    const targetFY = parseInt(req.query.fiscal_year || defaultFY, 10);

    const categories = db.prepare('SELECT * FROM categories ORDER BY CAST(code AS INTEGER) ASC, code ASC').all();
    const assets = db.prepare(`
      SELECT a.*, c.code as cat_code, c.name as cat_name, c.useful_life_years as cat_useful_life, c.depreciation_rate_pct as cat_dep_rate
      FROM assets a
      LEFT JOIN categories c ON a.category_id = c.id
    `).all();

    const disposals = db.prepare(`
      SELECT d.*, a.category_id, a.fiscal_year as asset_fy, a.cost_price as orig_cost
      FROM asset_disposals d
      JOIN assets a ON d.asset_id = a.id
    `).all();

    const reportRows = categories.map(cat => {
      const catAssets = assets.filter(a => a.category_id === cat.id);

      let beginningCost = 0;
      let additionsCost = 0;
      let disposalsCost = 0;
      let transfersOutCost = 0;

      let beginningAccumDep = 0;
      let yearDepreciation = 0;
      let disposalAccumDep = 0;

      for (const a of catAssets) {
        const fy = parseInt(a.fiscal_year, 10) || targetFY;
        const cost = Number(a.cost_price) || 0;
        const salvage = Number(a.salvage_value) || 1;
        const life = Number(a.useful_life_years) || cat.useful_life_years || 5;
        const rate = (100 / life) / 100;
        const depreciable = Math.max(0, cost - salvage);
        const annualDep = depreciable * rate;

        if (fy < targetFY) {
          beginningCost += cost;
          const elapsedYearsBefore = Math.max(0, targetFY - fy - 1);
          const priorDep = Math.min(depreciable, annualDep * (elapsedYearsBefore + 0.5));
          beginningAccumDep += priorDep;

          if (a.status !== 'disposed') {
            const remainingDep = Math.max(0, depreciable - priorDep);
            const thisYearDep = Math.min(annualDep, remainingDep);
            yearDepreciation += thisYearDep;
          }
        } else if (fy === targetFY) {
          additionsCost += cost;
          const firstYearDep = Math.min(depreciable, annualDep * 0.5);
          yearDepreciation += firstYearDep;
        }
      }

      // Disposals in targetFY
      const catDisposals = disposals.filter(d => {
        const dYear = d.disposal_date ? parseInt(d.disposal_date.split('-')[0], 10) + 543 : targetFY;
        return d.category_id === cat.id && dYear === targetFY;
      });
      for (const d of catDisposals) {
        disposalsCost += Number(d.cost_price) || 0;
        disposalAccumDep += Number(d.accumulated_depreciation) || 0;
      }

      const endingCost = Math.max(0, beginningCost + additionsCost - disposalsCost - transfersOutCost);
      const endingAccumDep = Math.max(0, beginningAccumDep + yearDepreciation - disposalAccumDep);
      const endingNetBookValue = Math.max(0, endingCost - endingAccumDep);

      return {
        category_id: cat.id,
        code: cat.code,
        prefix: cat.prefix,
        name: cat.name,
        useful_life_years: cat.useful_life_years,
        depreciation_rate_pct: cat.depreciation_rate_pct,
        beginning_cost: beginningCost,
        additions_cost: additionsCost,
        disposals_cost: disposalsCost,
        transfers_out_cost: transfersOutCost,
        ending_cost: endingCost,
        beginning_accum_dep: beginningAccumDep,
        year_depreciation: yearDepreciation,
        disposal_accum_dep: disposalAccumDep,
        ending_accum_dep: endingAccumDep,
        ending_net_book_value: endingNetBookValue
      };
    });

    const totals = reportRows.reduce((acc, r) => ({
      beginning_cost: acc.beginning_cost + r.beginning_cost,
      additions_cost: acc.additions_cost + r.additions_cost,
      disposals_cost: acc.disposals_cost + r.disposals_cost,
      transfers_out_cost: acc.transfers_out_cost + r.transfers_out_cost,
      ending_cost: acc.ending_cost + r.ending_cost,
      beginning_accum_dep: acc.beginning_accum_dep + r.beginning_accum_dep,
      year_depreciation: acc.year_depreciation + r.year_depreciation,
      disposal_accum_dep: acc.disposal_accum_dep + r.disposal_accum_dep,
      ending_accum_dep: acc.ending_accum_dep + r.ending_accum_dep,
      ending_net_book_value: acc.ending_net_book_value + r.ending_net_book_value
    }), {
      beginning_cost: 0, additions_cost: 0, disposals_cost: 0, transfers_out_cost: 0, ending_cost: 0,
      beginning_accum_dep: 0, year_depreciation: 0, disposal_accum_dep: 0, ending_accum_dep: 0, ending_net_book_value: 0
    });

    res.json({
      fiscal_year: targetFY,
      categories: reportRows,
      totals
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// FISCAL COMPLIANCE & EXPIRE ALERTS (ศูนย์แจ้งเตือนตามระเบียบราชการ)
// -------------------------------------------------------------
app.get('/api/compliance/alerts', (req, res) => {
  try {
    const defaultFY = db.prepare("SELECT value FROM settings WHERE key = 'fiscal_year'").get()?.value || '2569';
    const currentFY = parseInt(defaultFY, 10);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const alerts = [];

    // 1. Annual Audit (ระเบียบข้อ 213, 214)
    const auditThisYear = db.prepare('SELECT * FROM annual_audits WHERE fiscal_year = ?').get(currentFY);
    const currentMonth = today.getMonth() + 1; // 1-12

    if (!auditThisYear) {
      if (currentMonth >= 8 || currentMonth <= 10) {
        alerts.push({
          id: 'annual_audit_needed',
          type: 'warning',
          category: 'annual_audit',
          title: `กำหนดแต่งตั้งกรรมการตรวจสอบพัสดุประจำปี พ.ศ. ${currentFY}`,
          description: `ตามระเบียบพัสดุฯ พ.ศ. 2560 ข้อ 213 ต้องแต่งตั้งคณะกรรมการตรวจสอบพัสดุประจำปีก่อนสิ้นปีงบประมาณ เพื่อตรวจนับพัสดุในวันทำการแรกของปี`,
          action_label: 'เปิดหน้าตรวจสอบพัสดุประจำปี',
          action_tab: 'annual-audit',
          urgency: 'high'
        });
      }
    } else if (auditThisYear.status === 'in_progress') {
      alerts.push({
        id: 'annual_audit_in_progress',
        type: 'info',
        category: 'annual_audit',
        title: `การตรวจนับพัสดุประจำปี พ.ศ. ${currentFY} อยู่ระหว่างดำเนินการ`,
        description: `ตามระเบียบข้อ 214 คณะกรรมการต้องส่งรายงานผลตรวจนับต่อนายกเทศมนตรีภายใน 30 วันทำการหลังเปิดปีงบประมาณ`,
        action_label: 'ดูผลการตรวจนับ',
        action_tab: 'annual-audit',
        urgency: 'medium'
      });
    }

    // 2. Vehicle Tax & Insurance Expiring (ครุภัณฑ์ยานพาหนะ ค.02)
    const vehicles = db.prepare(`
      SELECT a.id, a.asset_code, a.name, a.brand, a.model, a.tax_expiry_date, a.insurance_expiry_date
      FROM assets a
      JOIN categories c ON a.category_id = c.id
      WHERE (c.code = '02' OR c.prefix = 'ค.02') AND a.status = 'active'
    `).all();

    for (const v of vehicles) {
      if (v.tax_expiry_date) {
        const daysToTax = Math.ceil((new Date(v.tax_expiry_date) - today) / (1000 * 60 * 60 * 24));
        if (daysToTax <= 60) {
          alerts.push({
            id: `vehicle_tax_${v.id}`,
            type: daysToTax <= 0 ? 'danger' : 'warning',
            category: 'vehicle_tax',
            title: daysToTax <= 0 ? `ภาษีรถยนต์ขาดอายุ: ${v.asset_code}` : `ภาษีประจำปีใกล้หมดอายุใน ${daysToTax} วัน: ${v.asset_code}`,
            description: `${v.name} (${v.brand || ''} ${v.model || ''}) กำหนดต่อภาษีวันที่ ${v.tax_expiry_date}`,
            action_label: 'ดูข้อมูลรถยนต์',
            action_tab: 'assets',
            urgency: daysToTax <= 0 ? 'critical' : 'high'
          });
        }
      }
    }

    // 3. Fully Depreciated Assets (ครบอายุการใช้งาน / ซาก 1 บาทในปีนี้)
    const fullyDepThisYear = db.prepare(`
      SELECT count(*) as count, sum(cost_price) as total_cost
      FROM assets
      WHERE status = 'active'
        AND (fiscal_year + useful_life_years) <= ?
    `).get(currentFY);

    if (fullyDepThisYear?.count > 0) {
      alerts.push({
        id: 'fully_depreciated_assets',
        type: 'info',
        category: 'depreciation',
        title: `มีครุภัณฑ์ครบอายุการใช้งาน (มูลค่าซาก 1 บาท) จำนวน ${fullyDepThisYear.count} รายการ`,
        description: `มูลค่าจัดซื้อเดิมรวม ${Number(fullyDepThisYear.total_cost || 0).toLocaleString()} บาท แนะนำให้สำรวจสภาพว่ายังใช้งานต่อได้หรือเตรียมแทงจำหน่ายตามระเบียบฯ ข้อ 215`,
        action_label: 'ดูรายการครุภัณฑ์',
        action_tab: 'assets',
        urgency: 'low'
      });
    }

    // 4. Uneconomical Repairs (ค่าซ่อมสะสมเกิน 50%)
    const unviableRepairs = db.prepare(`
      SELECT a.id, a.asset_code, a.name, a.cost_price, SUM(m.repair_cost) as total_repair
      FROM maintenance_records m
      JOIN assets a ON m.asset_id = a.id
      WHERE m.status = 'completed' AND a.status = 'active' AND a.cost_price > 0
      GROUP BY a.id
      HAVING (SUM(m.repair_cost) * 1.0 / a.cost_price) >= 0.5
    `).all();

    for (const u of unviableRepairs) {
      const pct = ((u.total_repair / u.cost_price) * 100).toFixed(1);
      alerts.push({
        id: `repair_unviable_${u.id}`,
        type: 'warning',
        category: 'maintenance',
        title: `ค่าซ่อมสะสมเกินเกณฑ์คุ้มค่า (${pct}%): ${u.asset_code}`,
        description: `${u.name} ค่าซ่อมสะสม ${Number(u.total_repair).toLocaleString()} บาท เกิน 50% ของราคาทุนเดิม (${Number(u.cost_price).toLocaleString()} บาท) แนะนำเสนอจำหน่ายตามระเบียบข้อ 215`,
        action_label: 'เปิดหน้าแจ้งซ่อม/จำหน่าย',
        action_tab: 'maintenance',
        urgency: 'medium'
      });
    }

    // 5. Overdue Borrows
    const overdueBorrows = db.prepare(`
      SELECT count(*) as count 
      FROM asset_borrows 
      WHERE status = 'borrowed' AND expected_return_date < ?
    `).get(todayStr)?.count || 0;

    if (overdueBorrows > 0) {
      alerts.push({
        id: 'overdue_borrows',
        type: 'danger',
        category: 'borrow',
        title: `มีครุภัณฑ์ที่ยืมเกินกำหนดส่งคืน ${overdueBorrows} รายการ`,
        description: `ตามระเบียบข้อ 208 ผู้ยืมต้องนำพัสดุมาส่งคืนภายในกำหนดเวลา เจ้าหน้าที่ควรติดตามทวงถามส่งคืน`,
        action_label: 'ดูรายการยืม-คืน',
        action_tab: 'borrow-return',
        urgency: 'high'
      });
    }

    // 6. Low stock materials
    const lowStockCount = db.prepare('SELECT count(*) as count FROM inventory_items WHERE current_stock <= min_stock').get()?.count || 0;
    if (lowStockCount > 0) {
      alerts.push({
        id: 'low_stock_materials',
        type: 'warning',
        category: 'inventory',
        title: `มีวัสดุคงคลังต่ำกว่าจุดสั่งซื้อสำรอง (Reorder Point) ${lowStockCount} รายการ`,
        description: `วัสดุสำนักงานในคลังลดลงต่ำกว่าเกณฑ์ขั้นต่ำ ควรเตรียมขออนุมัติจัดซื้อเพิ่ม`,
        action_label: 'ดูคลังวัสดุ',
        action_tab: 'inventory',
        urgency: 'medium'
      });
    }

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// INSPECTION RECORDS (ใบตรวจรับพัสดุ ตามระเบียบข้อ 175 - 180)
// -------------------------------------------------------------
app.get('/api/inspections', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT ins.*, d.name as department_name, c.name as category_name, c.prefix as category_prefix
      FROM inspection_records ins
      LEFT JOIN departments d ON ins.department_id = d.id
      LEFT JOIN categories c ON ins.category_id = c.id
      ORDER BY ins.id DESC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inspections', (req, res) => {
  try {
    const {
      doc_number,
      inspection_date,
      purchase_order_no,
      contract_date,
      vendor_name,
      vendor_phone,
      department_id,
      item_name,
      category_id,
      brand,
      model,
      serial_number,
      quantity,
      cost_price,
      budget_source,
      inspection_result,
      chairman_name,
      member1_name,
      member2_name,
      notes,
      actorName,
      actorRole
    } = req.body;

    const defaultFY = db.prepare("SELECT value FROM settings WHERE key = 'fiscal_year'").get()?.value || '2569';

    let finalDocNo = doc_number?.trim();
    if (!finalDocNo) {
      const count = db.prepare('SELECT count(*) as count FROM inspection_records').get()?.count || 0;
      finalDocNo = `ตร.${String(count + 1).padStart(2, '0')}/${defaultFY}`;
    }

    const stmt = db.prepare(`
      INSERT INTO inspection_records (
        doc_number, inspection_date, purchase_order_no, contract_date,
        vendor_name, vendor_phone, department_id, item_name, category_id,
        brand, model, serial_number, quantity, cost_price, budget_source,
        inspection_result, chairman_name, member1_name, member2_name, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      finalDocNo,
      inspection_date || new Date().toISOString().split('T')[0],
      purchase_order_no || 'ใบสั่งซื้อ',
      contract_date || null,
      vendor_name || '',
      vendor_phone || '',
      department_id || 1,
      item_name || 'รายการพัสดุ',
      category_id || 1,
      brand || '',
      model || '',
      serial_number || '',
      Number(quantity) || 1,
      Number(cost_price) || 0,
      budget_source || 'เงินงบประมาณเทศบาล',
      inspection_result || 'passed',
      chairman_name || 'ประธานกรรมการตรวจรับ',
      member1_name || 'กรรมการตรวจรับ',
      member2_name || 'กรรมการตรวจรับ',
      notes || 'ตรวจรับถูกต้อง ครบถ้วนตามสัญญา'
    );

    logAudit('CREATE_INSPECTION', 'INSPECTION', result.lastInsertRowid, actorName || 'เจ้าหน้าที่พัสดุ', actorRole || 'officer', `สร้างใบตรวจรับพัสดุ: ${finalDocNo} (${item_name})`);

    const created = db.prepare(`
      SELECT ins.*, d.name as department_name, c.name as category_name, c.prefix as category_prefix
      FROM inspection_records ins
      LEFT JOIN departments d ON ins.department_id = d.id
      LEFT JOIN categories c ON ins.category_id = c.id
      WHERE ins.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ตรวจรับผ่าน -> นำเข้าขึ้นทะเบียนเป็นครุภัณฑ์ สท.1 ทันที
app.post('/api/inspections/:id/convert-to-asset', (req, res) => {
  try {
    const { id } = req.params;
    const { actorName, actorRole } = req.body;
    const ins = db.prepare('SELECT * FROM inspection_records WHERE id = ?').get(id);
    if (!ins) return res.status(404).json({ error: 'ไม่พบใบตรวจรับพัสดุ' });
    if (ins.created_asset_id) {
      return res.status(400).json({ error: 'ใบตรวจรับนี้ได้ทำการขึ้นทะเบียนครุภัณฑ์ไปแล้ว' });
    }

    const defaultFY = db.prepare("SELECT value FROM settings WHERE key = 'fiscal_year'").get()?.value || '2569';
    const cat = db.prepare('SELECT prefix, useful_life_years FROM categories WHERE id = ?').get(ins.category_id);
    const prefix = cat?.prefix || 'ค.01';
    const usefulLife = cat?.useful_life_years || 5;

    // Generate next asset code
    const likePattern = `${prefix}/${defaultFY}/%`;
    const rows = db.prepare('SELECT asset_code FROM assets WHERE asset_code LIKE ?').all(likePattern);
    let maxSeq = 0;
    for (const r of rows) {
      const parts = r.asset_code.split('/');
      if (parts.length >= 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    }
    const nextCode = `${prefix}/${defaultFY}/${String(maxSeq + 1).padStart(3, '0')}`;

    const insertAsset = db.prepare(`
      INSERT INTO assets (
        asset_code, name, category_id, brand, model, serial_number,
        department_id, custodian_name, location_room, acquired_date,
        fiscal_year, budget_source, vendor, vendor_phone, contract_number,
        cost_price, useful_life_years, salvage_value, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `);

    const result = insertAsset.run(
      nextCode,
      ins.item_name,
      ins.category_id,
      ins.brand,
      ins.model,
      ins.serial_number,
      ins.department_id,
      'หัวหน้าสำนัก/กอง',
      'สำนักงาน',
      ins.inspection_date,
      parseInt(defaultFY, 10),
      ins.budget_source,
      ins.vendor_name,
      ins.vendor_phone,
      ins.purchase_order_no,
      ins.cost_price,
      usefulLife,
      1.0,
      `ขึ้นทะเบียนอัตโนมัติจากใบตรวจรับพัสดุ ${ins.doc_number}`
    );

    const assetId = result.lastInsertRowid;
    db.prepare('UPDATE inspection_records SET created_asset_id = ? WHERE id = ?').run(assetId, id);

    logAudit('CONVERT_INSPECTION_TO_ASSET', 'ASSET', assetId, actorName || 'เจ้าหน้าที่พัสดุ', actorRole || 'officer', `ขึ้นทะเบียนครุภัณฑ์รหัสใหม่ ${nextCode} จากใบตรวจรับ ${ins.doc_number}`);

    const newAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
    res.json({
      success: true,
      message: `ขึ้นทะเบียนครุภัณฑ์รหัส ${nextCode} เรียบร้อยแล้ว`,
      asset: newAsset
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/backup/download', (req, res) => {
  try {
    try {
      db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch (_) {}
    const today = new Date().toISOString().split('T')[0];
    const filename = `backup_localgov_assets_${today}.sqlite`;
    logAudit('BACKUP', 'DATABASE', null, req.query.actorName || 'ผู้ดูแลระบบ', req.query.actorRole || 'admin', 'ดาวน์โหลดไฟล์สำรองฐานข้อมูลระบบ SQLite');
    res.download(dbPath, filename);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/backup/status', (req, res) => {
  try {
    const stats = fs.statSync(dbPath);
    const assetCount = db.prepare('SELECT count(*) as count FROM assets').get()?.count || 0;
    const invCount = db.prepare('SELECT count(*) as count FROM inventory_items').get()?.count || 0;
    const borrowCount = db.prepare('SELECT count(*) as count FROM asset_borrows').get()?.count || 0;
    const transferCount = db.prepare('SELECT count(*) as count FROM asset_transfers').get()?.count || 0;
    const auditCount = db.prepare('SELECT count(*) as count FROM audit_logs').get()?.count || 0;

    res.json({
      sizeBytes: stats.size,
      sizeKB: +(stats.size / 1024).toFixed(2),
      sizeMB: +(stats.size / (1024 * 1024)).toFixed(2),
      lastModified: stats.mtime,
      counts: {
        assets: assetCount,
        inventory: invCount,
        borrows: borrowCount,
        transfers: transferCount,
        audits: auditCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// รายการไฟล์สำรองอัตโนมัติทั้งหมด (List Auto-Backups)
app.get('/api/backup/list', (req, res) => {
  try {
    if (!fs.existsSync(backupsDir)) return res.json([]);
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.endsWith('.sqlite'))
      .map(f => {
        const filePath = path.join(backupsDir, f);
        const stats = fs.statSync(filePath);
        return {
          filename: f,
          sizeBytes: stats.size,
          sizeKB: +(stats.size / 1024).toFixed(2),
          sizeMB: +(stats.size / (1024 * 1024)).toFixed(2),
          createdAt: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ดาวน์โหลดไฟล์สำรองอัตโนมัติที่เลือก (Download specific backup file)
app.get('/api/backup/download/:filename', (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(backupsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'ไม่พบไฟล์สำรองข้อมูลที่ระบุ' });
    }
    logAudit('BACKUP', 'DATABASE', null, req.query.actorName || 'ผู้ดูแลระบบ', req.query.actorRole || 'admin', `ดาวน์โหลดไฟล์สำรองอัตโนมัติ: ${filename}`);
    res.download(filePath, filename);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backup/restore', (req, res) => {
  try {
    const { fileBase64, fileName, actorName, actorRole } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    const buffer = Buffer.from(fileBase64, 'base64');
    if (buffer.length < 100) {
      return res.status(400).json({ error: 'Invalid SQLite file' });
    }

    // Make safety backup copy before overwriting
    const safetyBackup = `${dbPath}.bak_${Date.now()}`;
    fs.copyFileSync(dbPath, safetyBackup);

    // Overwrite database file
    fs.writeFileSync(dbPath, buffer);

    logAudit('RESTORE', 'DATABASE', null, actorName, actorRole, `กู้คืนฐานข้อมูลจากไฟล์สำรอง: ${fileName || 'backup.sqlite'}`);

    res.json({ success: true, message: 'กู้คืนฐานข้อมูลสำเร็จ กรุณารีเฟรชหน้าจอ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clean Slate: Reset asset and transaction data for onboarding new municipality
app.post('/api/backup/clean-slate', (req, res) => {
  try {
    const { actorName, actorRole } = req.body;

    // Safety backup copy
    const safetyBackup = `${dbPath}.before_clean_${Date.now()}`;
    fs.copyFileSync(dbPath, safetyBackup);

    db.exec(`
      DELETE FROM annual_audit_items;
      DELETE FROM annual_audits;
      DELETE FROM disposal_records;
      DELETE FROM maintenance_records;
      DELETE FROM asset_borrows;
      DELETE FROM asset_transfers;
      DELETE FROM assets;
      DELETE FROM requisition_items;
      DELETE FROM requisition_orders;
      DELETE FROM stock_transactions;
      DELETE FROM inventory_items;
      DELETE FROM audit_logs;
    `);

    logAudit('CLEAN_SLATE', 'DATABASE', null, actorName, actorRole, 'ล้างข้อมูลตัวอย่างเพื่อเริ่มระบบใหม่สำหรับเทศบาลแห่งใหม่');

    res.json({ success: true, message: 'ล้างข้อมูลตัวอย่างเรียบร้อยแล้ว ระบบพร้อมสำหรับการเริ่มต้นป้อนข้อมูลของเทศบาลใหม่' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Load / Reset to Full Demo Presentation Data
app.post('/api/backup/load-demo', (req, res) => {
  try {
    const { actorName, actorRole } = req.body;

    // Safety backup copy
    const safetyBackup = `${dbPath}.before_demo_${Date.now()}`;
    fs.copyFileSync(dbPath, safetyBackup);

    resetToDemoData();

    logAudit('RESET_DEMO', 'DATABASE', null, actorName, actorRole, 'โหลดชุดข้อมูลตัวอย่างเต็มรูปแบบสำหรับการนำเสนอ Demo');

    res.json({ success: true, message: 'โหลดชุดข้อมูลตัวอย่าง Demo เรียบร้อยแล้ว ระบบมีข้อมูลครบทุกมิติพร้อมนำเสนอ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// e-LAAS Standard Data Export
app.get('/api/export-elaas', (req, res) => {
  try {
    const assets = db.prepare(`
      SELECT a.*, c.name as category_name, c.code as category_code,
             d.name as department_name, d.code as department_code
      FROM assets a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN departments d ON a.department_id = d.id
      ORDER BY a.asset_code ASC
    `).all();

    // Map to e-LAAS schema standard fields
    const elaasData = assets.map(a => {
      const dep = calculateDepreciation(a.cost_price, a.salvage_value, a.useful_life_years, a.acquired_date);
      return {
        'รหัสสินทรัพย์_eLAAS': a.asset_code,
        'ชื่อสินทรัพย์': a.name,
        'หมวดสินทรัพย์': a.category_name,
        'รหัสหมวด': a.category_code,
        'สำนัก/กอง': a.department_name,
        'รหัสหน่วยงาน': a.department_code,
        'ยี่ห้อ/รุ่น': `${a.brand || '-'} / ${a.model || '-'}`,
        'หมายเลขซีเรียล': a.serial_number || '-',
        'วันที่ตรวจรับ': a.acquired_date,
        'ปีงบประมาณ': a.fiscal_year,
        'แหล่งเงิน': a.budget_source,
        'ราคาทุน': a.cost_price,
        'อายุการใช้งาน_ปี': a.useful_life_years,
        'อัตราค่าเสื่อม_ร้อยละ': dep.annualRate,
        'ค่าเสื่อมราคาสะสม': dep.accumulatedDepreciation,
        'มูลค่าสุทธิทางบัญชี': dep.bookValue,
        'สถานะการใช้งาน': a.status === 'active' ? 'ใช้งานปกติ' :
                          a.status === 'damaged' ? 'ชำรุดรอซ่อม' :
                          a.status === 'pending_disposal' ? 'รอจำหน่าย' :
                          a.status === 'disposed' ? 'จำหน่ายแล้ว' : a.status,
        'ผู้ครอบครอง': a.custodian_name || '-',
        'สถานที่ตั้ง': a.location_room || '-'
      };
    });

    res.json(elaasData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static build in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  const hostName = os.hostname().toLowerCase();
  console.log('==========================================================');
  console.log(`🏛️  ระบบบริหารจัดการครุภัณฑ์และพัสดุคลังย่อย องค์กรปกครองส่วนท้องถิ่น`);
  console.log(`✅  เซิร์ฟเวอร์หลัก (เครื่องแม่) เริ่มทำงานเรียบร้อยแล้ว:`);
  console.log(`    💻 สำหรับเครื่องนี้ (เครื่องแม่):`);
  console.log(`       👉 http://localhost:${PORT}`);
  console.log('');
  console.log(`    🏢 สำหรับเครื่องลูกในสำนักงาน (เข้าผ่านชื่อคอมพิวเตอร์ ไม่ต้องจำ IP):`);
  console.log(`       👉 http://${hostName}:${PORT}`);
  console.log(`       👉 http://${hostName}.local:${PORT}`);
  console.log('');
  console.log(`    🌐 หรือเข้าผ่านเลข IP ของเครื่องแม่:`);
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`       👉 http://${iface.address}:${PORT}`);
        }
      }
    }
  } catch (e) {}
  console.log('==========================================================');
});
