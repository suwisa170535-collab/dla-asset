import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'database.sqlite');

export const db = new DatabaseSync(dbPath);

export function initDatabase() {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      head_name TEXT,
      head_position TEXT
    );

    CREATE TABLE IF NOT EXISTS sub_departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      head_name TEXT,
      head_position TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(department_id, code)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role_type TEXT NOT NULL,
      title TEXT NOT NULL,
      dept TEXT NOT NULL,
      department_id INTEGER,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      prefix TEXT NOT NULL,
      useful_life_years INTEGER DEFAULT 5,
      depreciation_rate_pct REAL DEFAULT 20.0,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      brand TEXT,
      model TEXT,
      serial_number TEXT,
      department_id INTEGER REFERENCES departments(id),
      custodian_name TEXT,
      location_room TEXT,
      acquired_date TEXT NOT NULL,
      fiscal_year INTEGER NOT NULL,
      budget_source TEXT NOT NULL,
      vendor TEXT,
      cost_price REAL NOT NULL,
      useful_life_years INTEGER NOT NULL,
      salvage_value REAL DEFAULT 1.0,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      min_stock INTEGER DEFAULT 10,
      current_stock INTEGER DEFAULT 0,
      unit_price REAL DEFAULT 0,
      storage_location TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS inventory_lots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
      lot_number TEXT NOT NULL,
      received_date TEXT NOT NULL,
      quantity_received INTEGER NOT NULL,
      quantity_remaining INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      supplier TEXT,
      po_number TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS requisitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      req_number TEXT UNIQUE NOT NULL,
      department_id INTEGER REFERENCES departments(id),
      requester_name TEXT NOT NULL,
      requester_position TEXT,
      requested_date TEXT NOT NULL,
      purpose TEXT NOT NULL,
      status TEXT DEFAULT 'pending_approval', -- pending_approval, approved, dispensed, rejected
      approver_name TEXT,
      approved_date TEXT,
      approval_comment TEXT,
      dispenser_name TEXT,
      dispensed_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS requisition_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requisition_id INTEGER REFERENCES requisitions(id) ON DELETE CASCADE,
      item_id INTEGER REFERENCES inventory_items(id),
      requested_qty INTEGER NOT NULL,
      approved_qty INTEGER,
      dispensed_qty INTEGER,
      unit_cost_at_dispense REAL
    );

    CREATE TABLE IF NOT EXISTS maintenance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT UNIQUE NOT NULL,
      asset_id INTEGER REFERENCES assets(id),
      report_date TEXT NOT NULL,
      reporter_name TEXT NOT NULL,
      symptom TEXT NOT NULL,
      status TEXT DEFAULT 'reported', -- reported, inspecting, in_progress, completed, unrepairable
      repair_vendor TEXT,
      spare_parts TEXT,
      repair_cost REAL DEFAULT 0,
      completion_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS annual_audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audit_code TEXT UNIQUE NOT NULL,
      fiscal_year INTEGER NOT NULL,
      audit_date TEXT NOT NULL,
      committee_chairman TEXT NOT NULL,
      committee_members TEXT,
      status TEXT DEFAULT 'in_progress', -- in_progress, completed
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS annual_audit_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audit_id INTEGER REFERENCES annual_audits(id) ON DELETE CASCADE,
      asset_id INTEGER REFERENCES assets(id),
      physical_status TEXT DEFAULT 'normal', -- normal, damaged, worn_out, missing
      verified_by TEXT,
      verified_at TEXT,
      remarks TEXT,
      UNIQUE(audit_id, asset_id)
    );

    CREATE TABLE IF NOT EXISTS disposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      disposal_number TEXT UNIQUE NOT NULL,
      asset_id INTEGER REFERENCES assets(id),
      disposal_method TEXT NOT NULL, -- auction, transfer, donation, destruction
      disposal_date TEXT NOT NULL,
      approved_order_no TEXT NOT NULL,
      approved_by TEXT NOT NULL,
      sale_proceeds REAL DEFAULT 0,
      transfer_to TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS asset_borrows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      borrow_code TEXT UNIQUE NOT NULL,
      asset_id INTEGER REFERENCES assets(id),
      borrower_name TEXT NOT NULL,
      borrower_position TEXT,
      borrower_department TEXT,
      borrower_phone TEXT,
      purpose TEXT NOT NULL,
      borrow_date TEXT NOT NULL,
      expected_return_date TEXT NOT NULL,
      actual_return_date TEXT,
      status TEXT DEFAULT 'borrowed', -- borrowed, returned, overdue
      return_condition TEXT, -- normal, damaged, lost
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS asset_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_number TEXT UNIQUE NOT NULL,
      asset_id INTEGER REFERENCES assets(id),
      from_department_id INTEGER REFERENCES departments(id),
      to_department_id INTEGER REFERENCES departments(id),
      transfer_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      deliverer_name TEXT NOT NULL,
      receiver_name TEXT NOT NULL,
      new_location_room TEXT,
      new_custodian_name TEXT,
      approver_name TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      entity_id INTEGER,
      actor_name TEXT NOT NULL,
      actor_role TEXT,
      details TEXT,
      timestamp TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS inspection_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_number TEXT UNIQUE NOT NULL,
      inspection_date TEXT NOT NULL,
      purchase_order_no TEXT NOT NULL,
      contract_date TEXT,
      vendor_name TEXT NOT NULL,
      vendor_phone TEXT,
      department_id INTEGER REFERENCES departments(id),
      item_name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      brand TEXT,
      model TEXT,
      serial_number TEXT,
      quantity INTEGER DEFAULT 1,
      cost_price REAL NOT NULL,
      budget_source TEXT,
      inspection_result TEXT DEFAULT 'passed', -- passed, passed_with_conditions, rejected
      chairman_name TEXT NOT NULL,
      member1_name TEXT NOT NULL,
      member2_name TEXT NOT NULL,
      notes TEXT,
      created_asset_id INTEGER REFERENCES assets(id),
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Performance Indexes for long-term scalability (ค้นหาเร็ว เสี้ยววินาทีแม้ใช้ไป 10-20 ปี)
    CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);
    CREATE INDEX IF NOT EXISTS idx_assets_department ON assets(department_id);
    CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
    CREATE INDEX IF NOT EXISTS idx_assets_code ON assets(asset_code);
    CREATE INDEX IF NOT EXISTS idx_inventory_items_code ON inventory_items(item_code);
    CREATE INDEX IF NOT EXISTS idx_borrows_asset ON asset_borrows(asset_id);
    CREATE INDEX IF NOT EXISTS idx_borrows_status ON asset_borrows(status);
    CREATE INDEX IF NOT EXISTS idx_transfers_asset ON asset_transfers(asset_id);
    CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON maintenance_records(asset_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sub_departments_dept ON sub_departments(department_id);
  `);

  // Migrate columns for warranty, contract & land/building assets, photos & documents
  const extraCols = [
    { name: 'warranty_expiry_date', type: 'TEXT' },
    { name: 'vendor_phone', type: 'TEXT' },
    { name: 'contract_number', type: 'TEXT' },
    { name: 'procurement_method', type: 'TEXT DEFAULT "เฉพาะเจาะจง"' },
    { name: 'deed_number', type: 'TEXT' },
    { name: 'land_area', type: 'TEXT' },
    { name: 'gps_location', type: 'TEXT' },
    { name: 'asset_type', type: 'TEXT DEFAULT "equipment"' },
    { name: 'photo_url', type: 'TEXT' },
    { name: 'document_url', type: 'TEXT' },
    { name: 'document_name', type: 'TEXT' },
    { name: 'tax_expiry_date', type: 'TEXT' },
    { name: 'insurance_expiry_date', type: 'TEXT' },
    { name: 'sub_department_id', type: 'INTEGER REFERENCES sub_departments(id)' }
  ];

  for (const col of extraCols) {
    try {
      db.exec(`ALTER TABLE assets ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      // Column already exists, safe to ignore
    }
  }

  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_assets_sub_department ON assets(sub_department_id);`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE users ADD COLUMN sub_department_id INTEGER REFERENCES sub_departments(id)`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE requisitions ADD COLUMN sub_department_id INTEGER REFERENCES sub_departments(id)`);
  } catch (e) {}

  // Ensure all standard government asset categories exist (ตามมาตรฐานกรมบัญชีกลางและกระทรวงมหาดไทย)
  try {
    const standardCategories = [
      { code: '01', name: 'ครุภัณฑ์สำนักงาน', prefix: 'ค.01', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'โต๊ะ, ตู้, เก้าอี้, เครื่องปรับอากาศ, เครื่องถ่ายเอกสาร, เครื่องทำลายเอกสาร' },
      { code: '02', name: 'ครุภัณฑ์ยานพาหนะและขนส่ง', prefix: 'ค.02', useful_life_years: 8, depreciation_rate_pct: 12.5, description: 'รถยนต์ส่วนกลาง, รถบรรทุกขยะ, รถดับเพลิง, รถพยาบาลฉุกเฉิน, รถกระเช้าซ่อมไฟฟ้า' },
      { code: '03', name: 'ครุภัณฑ์คอมพิวเตอร์', prefix: 'ค.03', useful_life_years: 3, depreciation_rate_pct: 33.33, description: 'เครื่องคอมพิวเตอร์, โน้ตบุ๊ก, เครื่องพิมพ์, เซิร์ฟเวอร์, สวิตช์เครือข่าย, จอภาพ' },
      { code: '04', name: 'ครุภัณฑ์ไฟฟ้าและวิทยุ', prefix: 'ค.04', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'วิทยุสื่อสาร, เครื่องเสียงตามสาย, โทรทัศน์, โซล่าร์เซลล์, เครื่องขยายเสียง' },
      { code: '05', name: 'ครุภัณฑ์การเกษตร', prefix: 'ค.05', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'เครื่องตัดหญ้าสะพายบ่า, เครื่องพ่นหมอกควัน, เครื่องสูบน้ำเพื่อการเกษตร, รถตัดหญ้านั่งขับ' },
      { code: '06', name: 'ครุภัณฑ์ก่อสร้าง', prefix: 'ค.06', useful_life_years: 8, depreciation_rate_pct: 12.5, description: 'เครื่องตบดิน, เครื่องสกัดคอนกรีต, กล้องระดับสำรวจ, เครื่องผสมคอนกรีต' },
      { code: '07', name: 'ครุภัณฑ์งานบ้านงานครัว', prefix: 'ค.07', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'ตู้เย็น, ไมโครเวฟ, ตู้กดน้ำดื่ม, เตาแก๊ส, เครื่องดูดควัน' },
      { code: '08', name: 'ครุภัณฑ์การแพทย์และวิทยาศาสตร์', prefix: 'ค.08', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'เครื่องวัดความดัน, ถังออกซิเจน, เครื่องตรวจน้ำตาล, เตียงตรวจโรค, เครื่องกระตุกหัวใจ AED' },
      { code: '09', name: 'ครุภัณฑ์โฆษณาและเผยแพร่', prefix: 'ค.09', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'กล้องดิจิทัล, ขาตั้งกล้อง, ป้ายไฟ LED ประชาสัมพันธ์, โปรเจกเตอร์, โดรนถ่ายภาพ' },
      { code: '10', name: 'ที่ดินและสิ่งปลูกสร้าง', prefix: 'สท.3', useful_life_years: 20, depreciation_rate_pct: 5.0, description: 'ที่ดินสาธารณประโยชน์, อาคารสำนักงานเทศบาล, ศูนย์พัฒนาเด็กเล็ก, โรงฆ่าสัตว์, ตลาดสด, โรงจอดรถ' },
      { code: '11', name: 'ครุภัณฑ์การศึกษา', prefix: 'ค.11', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'สื่อการเรียนการสอน, กระดานอัจฉริยะ, หุ่นจำลองการศึกษา, อุปกรณ์ห้องปฏิบัติการ รร.เทศบาล/ศพด.' },
      { code: '12', name: 'ครุภัณฑ์กีฬาและนันทนาการ', prefix: 'ค.12', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'เครื่องออกกำลังกายกลางแจ้ง, แป้นบาสเกตบอล, ลู่วิ่งไฟฟ้า, โต๊ะปิงปอง, อุปกรณ์ฟิตเนส' },
      { code: '13', name: 'ครุภัณฑ์ดนตรีและนาฏศิลป์', prefix: 'ค.13', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'เครื่องดนตรีไทย (ระนาด ฆ้อง ซอ), เครื่องดนตรีสากล (กลองชุด คีย์บอร์ด กีตาร์), ชุดดุริยางค์, ชุดเครื่องแต่งกายนาฏศิลป์' },
      { code: '14', name: 'ครุภัณฑ์สำรวจ', prefix: 'ค.14', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'กล้องสำรวจ Total Station, เครื่องหาพิกัดดาวเทียม GNSS/GPS, กล้องวัดมุม, เทปวัดระยะทางเลเซอร์' },
      { code: '15', name: 'ครุภัณฑ์โรงงาน', prefix: 'ค.15', useful_life_years: 8, depreciation_rate_pct: 12.5, description: 'เครื่องอัดขยะ, เครื่องร่อนขยะ, เครื่องจักรโรงบำบัดน้ำเสีย, เครื่องกำเนิดไฟฟ้าโรงงาน' },
      { code: '16', name: 'ครุภัณฑ์การสื่อสารและโทรคมนาคม', prefix: 'ค.16', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'เสาส่งสัญญาณวิทยุ, ระบบกล้องวงจรปิด CCTV ชุมชน, ตู้สลับสัญญาณ Fiber Optic, ระบบสายอากาศ' },
      { code: '17', name: 'ครุภัณฑ์งานป้องกันบรรเทาสาธารณภัย', prefix: 'ค.17', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'ชุดเครื่องมือตัดถ่างกู้ภัย, เครื่องสูบน้ำดับเพลิงหาบหาม, เรือท้องแบน/แพยางกู้ภัย, เบาะลมช่วยชีวิต' },
      { code: '99', name: 'ครุภัณฑ์อื่น', prefix: 'ค.99', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'พัสดุและครุภัณฑ์อื่นๆ ที่ไม่เข้าข่ายตามหมวดหมู่ข้างต้น' }
    ];

    const insertCat = db.prepare(`
      INSERT INTO categories (code, name, prefix, useful_life_years, depreciation_rate_pct, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const c of standardCategories) {
      const existing = db.prepare("SELECT id FROM categories WHERE code = ? OR name = ?").get(c.code, c.name);
      if (!existing) {
        insertCat.run(c.code, c.name, c.prefix, c.useful_life_years, c.depreciation_rate_pct, c.description);
      }
    }
  } catch (e) {
    console.error('Error auto-seeding categories:', e.message);
  }

  // Ensure default municipal sub-departments / divisions exist (หน่วยงานย่อย / ฝ่าย / ศพด. / โรงเรียน / รพ.สต.)
  try {
    const existingSubDepts = db.prepare('SELECT count(*) as count FROM sub_departments').get()?.count || 0;
    if (existingSubDepts === 0) {
      const standardSubDepts = [
        // สำนักปลัดเทศบาล (code 01)
        { dept_code: '01', code: '01-01', name: 'ฝ่ายอำนวยการ', head_name: 'นายสมเกียรติ ยิ้มแย้ม', head_position: 'หัวหน้าฝ่ายอำนวยการ', notes: 'งานธุรการ สารบรรณ การเจ้าหน้าที่ ประชาสัมพันธ์' },
        { dept_code: '01', code: '01-02', name: 'ฝ่ายแผนงานและงบประมาณ', head_name: 'นางสาวสุภาวดี ชัยชนะ', head_position: 'หัวหน้าฝ่ายแผนงานฯ', notes: 'งานจัดทำแผนพัฒนาท้องถิ่น งานวิเคราะห์นโยบาย' },
        { dept_code: '01', code: '01-03', name: 'งานป้องกันและบรรเทาสาธารณภัย', head_name: 'จ่าเอกสมหมาย สู้ภัย', head_position: 'เจ้าพนักงานป้องกันฯ ชำนาญงาน', notes: 'งานดับเพลิง กู้ชีพ กู้ภัย และระงับอัคคีภัย' },
        { dept_code: '01', code: '01-04', name: 'ฝ่ายนิติการและงานทะเบียน', head_name: 'นายนรินทร์ นิติธรรม', head_position: 'นิติกรชำนาญการ', notes: 'งานกฎหมาย นิติกรรม และงานทะเบียนราษฎร' },

        // กองคลัง (code 02)
        { dept_code: '02', code: '02-01', name: 'ฝ่ายการเงินและบัญชี', head_name: 'นางพิมพ์ใจ เงินงาม', head_position: 'หัวหน้าฝ่ายการเงินฯ', notes: 'งานรับเงิน เบิกจ่ายเงิน และลงบัญชี e-LAAS' },
        { dept_code: '02', code: '02-02', name: 'ฝ่ายพัสดุและทรัพย์สิน', head_name: 'นางสาวนิตยา พัสดุเจริญ', head_position: 'หัวหน้าฝ่ายพัสดุฯ', notes: 'งานจัดซื้อจัดจ้าง ควบคุมทะเบียนทรัพย์สิน สท.1 สท.3' },
        { dept_code: '02', code: '02-03', name: 'ฝ่ายพัฒนารายได้และแผนที่ภาษี', head_name: 'นายชาญชัย มั่งมี', head_position: 'หัวหน้าฝ่ายพัฒนารายได้', notes: 'งานจัดเก็บภาษีที่ดินและสิ่งปลูกสร้าง ภาษีป้าย' },

        // กองช่าง (code 03)
        { dept_code: '03', code: '03-01', name: 'ฝ่ายแบบแผนและก่อสร้าง', head_name: 'นายประสิทธิ์ สถาปัตย์', head_position: 'หัวหน้าฝ่ายแบบแผนฯ', notes: 'งานออกแบบ ควบคุมอาคาร ประมาณราคา' },
        { dept_code: '03', code: '03-02', name: 'ฝ่ายการโยธา', head_name: 'นายเอกชัย ช่างประดิษฐ์', head_position: 'นายช่างโยธาชำนาญงาน', notes: 'งานก่อสร้างถนน สะพาน ท่อระบายน้ำ' },
        { dept_code: '03', code: '03-03', name: 'ฝ่ายสาธารณูปโภคและไฟฟ้า', head_name: 'นายสมบัติ แสงทอง', head_position: 'นายช่างไฟฟ้า', notes: 'งานซ่อมบำรุงไฟฟ้าสาธารณะ เครื่องจักรกล' },

        // กองสาธารณสุขและสิ่งแวดล้อม (code 04)
        { dept_code: '04', code: '04-01', name: 'ฝ่ายบริการสาธารณสุข / รพ.สต.', head_name: 'นางสมพร รักษ์อนามัย', head_position: 'พยาบาลวิชาชีพชำนาญการ', notes: 'ศูนย์บริการสาธารณสุขเทศบาล / รพ.สต. ถ่ายโอน' },
        { dept_code: '04', code: '04-02', name: 'ฝ่ายรักษาความสะอาดและจัดการขยะ', head_name: 'นายมนัส สะอาดดี', head_position: 'หัวหน้าฝ่ายรักษาความสะอาดฯ', notes: 'งานเก็บขนขยะ จัดการสิ่งปฏิกูล รถขยะ' },
        { dept_code: '04', code: '04-03', name: 'ฝ่ายสุขาภิบาลและอนามัยสิ่งแวดล้อม', head_name: 'นางสาววรรณา สิ่งแวดล้อม', head_position: 'นักวิชาการสุขาภิบาล', notes: 'งานตรวจตลาดสด คุ้มครองผู้บริโภค' },

        // กองการศึกษา ศาสนาและวัฒนธรรม (code 05)
        { dept_code: '05', code: '05-01', name: 'ฝ่ายบริหารการศึกษา', head_name: 'นางสาวดวงใจ การศึกษา', head_position: 'นักวิชาการศึกษาปฏิบัติการ', notes: 'งานแผนการศึกษา ทุนการศึกษา กีฬา' },
        { dept_code: '05', code: '05-02', name: 'ศูนย์พัฒนาเด็กเล็ก (ศพด. เทศบาล)', head_name: 'นางมาลี รักเด็ก', head_position: 'ครูผู้ดูแลเด็ก / หัวหน้า ศพด.', notes: 'ศูนย์พัฒนาเด็กเล็กเทศบาลตำบลสุขเกษม' },
        { dept_code: '05', code: '05-03', name: 'โรงเรียนเทศบาล 1 (สุขเกษมวิทยานุสรณ์)', head_name: 'นายวิศิษฏ์ ครูเก่ง', head_position: 'ผู้อำนวยการโรงเรียนเทศบาล', notes: 'โรงเรียนสังกัดเทศบาลตำบลสุขเกษม' },
        { dept_code: '05', code: '05-04', name: 'ฝ่ายส่งเสริมศาสนา ศิลปะ และวัฒนธรรม', head_name: 'นายอนุรักษ์ สืบสาน', head_position: 'เจ้าพนักงานส่งเสริมฯ', notes: 'งานประเพณี วัฒนธรรมท้องถิ่น กิจกรรมชุมชน' },

        // กองสวัสดิการสังคม (code 06)
        { dept_code: '06', code: '06-01', name: 'ฝ่ายพัฒนาชุมชน', head_name: 'นางกานดา สวัสดิ์ดี', head_position: 'นักพัฒนาชุมชนชำนาญการ', notes: 'งานส่งเสริมกลุ่มอาชีพ ประชาคมหมู่บ้าน' },
        { dept_code: '06', code: '06-02', name: 'ฝ่ายสังคมสงเคราะห์', head_name: 'นายปรีชา เมตตาธรรม', head_position: 'นักสังคมสงเคราะห์', notes: 'งานเบี้ยยังชีพผู้สูงอายุ ผู้พิการ และผู้ด้อยโอกาส' }
      ];

      const insertSubDept = db.prepare(`
        INSERT INTO sub_departments (department_id, code, name, head_name, head_position, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const s of standardSubDepts) {
        const dept = db.prepare('SELECT id FROM departments WHERE code = ?').get(s.dept_code);
        if (dept) {
          insertSubDept.run(dept.id, s.code, s.name, s.head_name, s.head_position, s.notes);
        }
      }

      // Associate some demo assets to relevant sub_departments
      try {
        const subDepts = db.prepare('SELECT id, department_id, name FROM sub_departments').all();
        const assets = db.prepare('SELECT id, department_id, name, location_room FROM assets WHERE sub_department_id IS NULL').all();
        const updateAsset = db.prepare('UPDATE assets SET sub_department_id = ? WHERE id = ?');

        for (const a of assets) {
          const matching = subDepts.filter(sd => sd.department_id === a.department_id);
          if (matching.length > 0) {
            // Pick based on keywords or default to first sub_dept
            let pick = matching[0];
            const lowerLoc = (a.location_room || '').toLowerCase();
            const lowerName = (a.name || '').toLowerCase();
            for (const sd of matching) {
              if (lowerLoc.includes('ศพด') || lowerName.includes('ศพด') || lowerLoc.includes('เด็ก')) {
                if (sd.name.includes('ศูนย์พัฒนาเด็กเล็ก')) pick = sd;
              } else if (lowerLoc.includes('โรงเรียน') || lowerName.includes('โรงเรียน') || lowerLoc.includes('รร.')) {
                if (sd.name.includes('โรงเรียน')) pick = sd;
              } else if (lowerLoc.includes('ดับเพลิง') || lowerName.includes('ดับเพลิง') || lowerName.includes('กู้ภัย')) {
                if (sd.name.includes('ป้องกัน')) pick = sd;
              } else if (lowerLoc.includes('พัสดุ') || lowerName.includes('พัสดุ')) {
                if (sd.name.includes('พัสดุ')) pick = sd;
              } else if (lowerLoc.includes('โยธา') || lowerLoc.includes('ช่าง') || lowerName.includes('ถนน')) {
                if (sd.name.includes('โยธา')) pick = sd;
              } else if (lowerLoc.includes('อนามัย') || lowerLoc.includes('รพ.สต') || lowerName.includes('แพทย์')) {
                if (sd.name.includes('สาธารณสุข') || sd.name.includes('รพ.สต')) pick = sd;
              }
            }
            updateAsset.run(pick.id, a.id);
          }
        }
      } catch (err) {
        console.error('Error linking sample assets to sub_departments:', err.message);
      }
    }
  } catch (e) {
    console.error('Error auto-seeding sub_departments:', e.message);
  }

  // Ensure default municipal user accounts exist
  try {
    const defaultUsers = [
      {
        username: 'admin',
        password: '123',
        name: 'นางสาวนิตยา พัสดุเจริญ',
        role_type: 'admin',
        title: 'เจ้าหน้าที่พัสดุกลาง (Admin)',
        dept: 'กองคลัง',
        department_id: 2
      },
      {
        username: 'mayor',
        password: '123',
        name: 'นายสมศักดิ์ วัฒนากูล',
        role_type: 'executive',
        title: 'นายกเทศมนตรี',
        dept: 'ฝ่ายบริหาร',
        department_id: 1
      },
      {
        username: 'clerk',
        password: '123',
        name: 'นายวิชาญ เชิดชูเกียรติ',
        role_type: 'executive',
        title: 'ปลัดเทศบาล (หัวหน้าพัสดุ)',
        dept: 'สำนักปลัดเทศบาล',
        department_id: 1
      },
      {
        username: 'engineer',
        password: '123',
        name: 'นายเอกชัย ช่างประดิษฐ์',
        role_type: 'department_staff',
        title: 'นายช่างโยธาชำนาญงาน',
        dept: 'กองช่าง',
        department_id: 3
      },
      {
        username: 'health',
        password: '123',
        name: 'นางสมพร รักษ์อนามัย',
        role_type: 'department_staff',
        title: 'เจ้าพนักงานสาธารณสุข',
        dept: 'กองสาธารณสุขและสิ่งแวดล้อม',
        department_id: 4
      },
      {
        username: 'education',
        password: '123',
        name: 'นางสาวดวงใจ การศึกษา',
        role_type: 'department_staff',
        title: 'นักวิชาการศึกษาปฏิบัติการ',
        dept: 'กองการศึกษา ศาสนาและวัฒนธรรม',
        department_id: 5
      },
      {
        username: 'welfare',
        password: '123',
        name: 'นางกานดา สวัสดิ์ดี',
        role_type: 'department_staff',
        title: 'นักพัฒนาชุมชน',
        dept: 'กองสวัสดิการสังคม',
        department_id: 6
      },
      {
        username: 'auditor',
        password: '123',
        name: 'นางพิมพา จิตตรง',
        role_type: 'auditor',
        title: 'ประธานกรรมการตรวจนับพัสดุ',
        dept: 'คณะกรรมการตรวจนับพัสดุ',
        department_id: null
      }
    ];

    const insertUser = db.prepare(`
      INSERT INTO users (username, password, name, role_type, title, dept, department_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const u of defaultUsers) {
      const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(u.username);
      if (!existing) {
        insertUser.run(u.username, u.password, u.name, u.role_type, u.title, u.dept, u.department_id);
      }
    }
  } catch (e) {
    console.error('Error auto-seeding default users:', e.message);
  }

  // Ensure specialized engineering assets & materials exist
  try {
    const checkEngAssets = db.prepare("SELECT count(*) as count FROM assets WHERE department_id = 3").get();
    if (checkEngAssets && checkEngAssets.count < 6) {
      const engSubDepts = db.prepare("SELECT id, code, name FROM sub_departments WHERE department_id = 3").all();
      const civilId = engSubDepts.find(s => s.name.includes('โยธา'))?.id || 9;
      const elecId = engSubDepts.find(s => s.name.includes('ไฟฟ้า') || s.name.includes('สาธารณูปโภค'))?.id || 10;
      const planId = engSubDepts.find(s => s.name.includes('แบบแผน'))?.id || 8;

      const newAssets = [
        {
          asset_code: 'ค.02/2567/002',
          name: 'รถยนต์บรรทุกดีเซล 6 ล้อ ติดตั้งเครนไฮดรอลิกและกระเช้าซ่อมไฟฟ้า 12 เมตร',
          category_id: 2,
          brand: 'Isuzu',
          model: 'Forward FRR 190 แรงม้า พร้อมกระเช้าฉนวนไฟฟ้า',
          serial_number: 'FRR90-781422',
          department_id: 3,
          sub_department_id: elecId,
          custodian_name: 'นายเอกชัย ช่างประดิษฐ์',
          location_room: 'โรงจอดรถยนต์ส่วนกลาง กองช่าง',
          acquired_date: '2024-03-15',
          fiscal_year: 2567,
          budget_source: 'งบประมาณเทศบัญญัติ (เงินรายได้)',
          vendor: 'บจก. อีซูซุไฮดรอลิกส์ ทรัค คอร์ปอเรชั่น',
          cost_price: 2450000.0,
          useful_life_years: 10,
          salvage_value: 1.0,
          status: 'active',
          notes: 'ใช้สำหรับซ่อมแซมและบำรุงรักษาโคมไฟถนนสาธารณะและตัดแต่งกิ่งไม้ใกล้สายไฟ',
          warranty_expiry_date: '2026-03-15'
        },
        {
          asset_code: 'ค.06/2567/002',
          name: 'รถตักหน้าขุดหลัง (Backhoe Loader 4WD ชนิดขับเคลื่อน 4 ล้อ)',
          category_id: 6,
          brand: 'JCB',
          model: '3DX Super EcoMax 92 แรงม้า',
          serial_number: 'JCB3DX-883910',
          department_id: 3,
          sub_department_id: civilId,
          custodian_name: 'นายสมคิด ก่อสร้างดี',
          location_room: 'โรงจอดเครื่องจักรกล กองช่าง',
          acquired_date: '2024-05-20',
          fiscal_year: 2567,
          budget_source: 'งบเงินอุดหนุนเฉพาะกิจ',
          vendor: 'บจก. สยามกลการและเครื่องจักรกลหนัก',
          cost_price: 3200000.0,
          useful_life_years: 10,
          salvage_value: 1.0,
          status: 'active',
          notes: 'ใช้สำหรับงานขุดลอกคูคลอง กำจัดผักตบชวา และงานบำรุงรักษาทางสาธารณะ'
        },
        {
          asset_code: 'ค.06/2568/002',
          name: 'เครื่องตัดคอนกรีต/ถนน ชนิดใช้น้ำมันเบนซิน พร้อมใบเพชร 16 นิ้ว',
          category_id: 6,
          brand: 'Husqvarna',
          model: 'FS400 LV เครื่องยนต์ Honda GX390',
          serial_number: 'HQ-FS400-5542',
          department_id: 3,
          sub_department_id: civilId,
          custodian_name: 'นายธนากร ผิวทางเจริญ',
          location_room: 'ห้องเก็บเครื่องมือช่าง ชั้น 1 กองช่าง',
          acquired_date: '2025-01-18',
          fiscal_year: 2568,
          budget_source: 'งบประมาณเทศบัญญัติ',
          vendor: 'หจก. ทูลส์ แอนด์ แมชชินเนอรี่ สุขเกษม',
          cost_price: 48500.0,
          useful_life_years: 5,
          salvage_value: 1.0,
          status: 'active',
          notes: 'ใช้สำหรับตัดแนวคอนกรีตและแอสฟัลต์เพื่อซ่อมแซมผิวจราจร'
        },
        {
          asset_code: 'ค.06/2568/003',
          name: 'เครื่องตบดินแบบสั่นสะเทือน (Plate Compactor 90 กก.)',
          category_id: 6,
          brand: 'Mikasa',
          model: 'MVC-F80H เครื่องยนต์ Honda GX160',
          serial_number: 'MK-MVC80-9921',
          department_id: 3,
          sub_department_id: civilId,
          custodian_name: 'นายธนากร ผิวทางเจริญ',
          location_room: 'ห้องเก็บเครื่องมือช่าง ชั้น 1 กองช่าง',
          acquired_date: '2025-02-10',
          fiscal_year: 2568,
          budget_source: 'งบประมาณเทศบัญญัติ',
          vendor: 'หจก. ทูลส์ แอนด์ แมชชินเนอรี่ สุขเกษม',
          cost_price: 38500.0,
          useful_life_years: 5,
          salvage_value: 1.0,
          status: 'active',
          notes: 'ใช้สำหรับตบอัดดิน หินคลุก และยางมะตอยซ่อมแซมหลุมบ่อ'
        },
        {
          asset_code: 'ค.04/2568/001',
          name: 'เครื่องกำเนิดไฟฟ้าเคลื่อนที่ ชนิดดีเซล แบบเก็บเสียง ขนาด 15 kW',
          category_id: 4,
          brand: 'Denyo',
          model: 'DCA-15ESK Ultra Silent',
          serial_number: 'DY-DCA15-3310',
          department_id: 3,
          sub_department_id: elecId,
          custodian_name: 'นายเอกชัย ช่างประดิษฐ์',
          location_room: 'คลังเก็บอุปกรณ์ฉุกเฉิน กองช่าง',
          acquired_date: '2025-03-05',
          fiscal_year: 2568,
          budget_source: 'งบประมาณเทศบัญญัติ',
          vendor: 'บจก. พาวเวอร์เจนเนอเรเตอร์ ซัพพลาย',
          cost_price: 265000.0,
          useful_life_years: 8,
          salvage_value: 1.0,
          status: 'active',
          notes: 'จ่ายไฟฟ้าสำรองกรณีไฟดับฉุกเฉินและงานภาคสนามนอกสถานที่'
        },
        {
          asset_code: 'ค.04/2567/002',
          name: 'เครื่องตรวจจับแนวท่อและสายไฟใต้ดิน (Underground Utility Locator)',
          category_id: 4,
          brand: 'Radiodetection',
          model: 'RD7200 Precision Cable & Pipe Locator',
          serial_number: 'RD72-990214',
          department_id: 3,
          sub_department_id: planId,
          custodian_name: 'นายเอกชัย ช่างประดิษฐ์',
          location_room: 'ห้องปฏิบัติการออกแบบผังเมือง ชั้น 2',
          acquired_date: '2024-08-12',
          fiscal_year: 2567,
          budget_source: 'งบประมาณเทศบัญญัติ',
          vendor: 'บจก. จีโออินฟอร์มาติกส์ เทคโนโลยี',
          cost_price: 175000.0,
          useful_life_years: 5,
          salvage_value: 1.0,
          status: 'active',
          notes: 'ใช้สแกนหาแนวท่อประปาและสายเคเบิลใต้ดินก่อนดำเนินการขุดเจาะถนน'
        },
        {
          asset_code: 'ค.17/2567/001',
          name: 'เครื่องสูบน้ำดับเพลิงและสูบระบายน้ำฉุกเฉิน ขนาด 8 นิ้ว ลากจูงได้',
          category_id: 17,
          brand: 'Kubota',
          model: 'V2403 Direct Injection ปั๊มหอยโข่ง 8 นิ้ว',
          serial_number: 'KB-PUMP8-1120',
          department_id: 3,
          sub_department_id: elecId,
          custodian_name: 'นายเอกชัย ช่างประดิษฐ์',
          location_room: 'โรงจอดเครื่องจักรกล กองช่าง',
          acquired_date: '2024-06-30',
          fiscal_year: 2567,
          budget_source: 'งบประมาณเทศบัญญัติ',
          vendor: 'บจก. สยามวอเตอร์ปั๊ม แอนด์ เอ็นจิเนียริ่ง',
          cost_price: 420000.0,
          useful_life_years: 8,
          salvage_value: 1.0,
          status: 'active',
          notes: 'ใช้สำหรับสูบระบายน้ำป้องกันน้ำท่วมขังในเขตเทศบาล'
        },
        {
          asset_code: 'ค.06/2567/004',
          name: 'เครื่องพ่นสีตีเส้นจราจรอัตโนมัติ (Line Striper)',
          category_id: 6,
          brand: 'Graco',
          model: 'LineLazer 3400 เครื่องยนต์ Honda GX120',
          serial_number: 'GR-LL34-4412',
          department_id: 3,
          sub_department_id: civilId,
          custodian_name: 'นายสมคิด ก่อสร้างดี',
          location_room: 'ห้องเก็บเครื่องมือช่าง ชั้น 1 กองช่าง',
          acquired_date: '2024-09-08',
          fiscal_year: 2567,
          budget_source: 'งบประมาณเทศบัญญัติ',
          vendor: 'บจก. ทราฟฟิก ซัพพลาย โซลูชั่น',
          cost_price: 165000.0,
          useful_life_years: 5,
          salvage_value: 1.0,
          status: 'active',
          notes: 'ใช้สำหรับตีเส้นจราจร ทางม้าลาย และขอบทางในเขตเทศบาล'
        }
      ];

      const insertAsset = db.prepare(`
        INSERT INTO assets (
          asset_code, name, category_id, brand, model, serial_number,
          department_id, sub_department_id, custodian_name, location_room, acquired_date,
          fiscal_year, budget_source, vendor, cost_price, useful_life_years,
          salvage_value, status, notes, warranty_expiry_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const checkAsset = db.prepare('SELECT id FROM assets WHERE asset_code = ?');
      const insertAuditDetail = db.prepare(`
        INSERT OR IGNORE INTO annual_audit_details (audit_id, asset_id, physical_status, verified_by, verified_at, remarks)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const a of newAssets) {
        const existing = checkAsset.get(a.asset_code);
        let assetId = existing?.id;
        if (!existing) {
          const res = insertAsset.run(
            a.asset_code, a.name, a.category_id, a.brand, a.model, a.serial_number,
            a.department_id, a.sub_department_id, a.custodian_name, a.location_room, a.acquired_date,
            a.fiscal_year, a.budget_source, a.vendor, a.cost_price, a.useful_life_years,
            a.salvage_value, a.status, a.notes, a.warranty_expiry_date || null
          );
          assetId = res.lastInsertRowid;
        }
        if (assetId) {
          insertAuditDetail.run(1, assetId, 'normal', 'นายเอกชัย ช่างประดิษฐ์ (กรรมการ)', '2025-09-25 10:30:00', 'ตรวจนับหน้างานที่โรงจอดเครื่องจักรกล กองช่าง สภาพดีพร้อมใช้งาน');
        }
      }
    }
  } catch (err) {
    console.error('Error auto-seeding specialized engineering assets:', err.message);
  }

  // Ensure specialized assets for other departments (Fire/Rescue, Health, Education, Welfare)
  try {
    const checkOtherAssets = db.prepare("SELECT count(*) as count FROM assets WHERE department_id IN (1, 4, 5, 6)").get();
    if (checkOtherAssets && checkOtherAssets.count < 15) {
      const allNewAssets = [
        {
          asset_code: 'ค.02/2566/002',
          name: 'รถยนต์บรรทุกน้ำดับเพลิง ขนาดความจุ 6,000 ลิตร 6 ล้อ พร้อมปืนฉีดน้ำแรงดันสูง',
          category_id: 2,
          brand: 'Hino',
          model: '500 Victor 240 แรงม้า',
          serial_number: 'HN500-881920',
          department_id: 1,
          sub_department_id: 3,
          custodian_name: 'ส.อ.สมชาย ใจกล้า',
          location_room: 'สถานีดับเพลิงเทศบาล',
          acquired_date: '2023-08-10',
          fiscal_year: 2566,
          budget_source: 'งบประมาณเทศบัญญัติ',
          vendor: 'บจก. เคมีคอล แอนด์ ไฟร์ไฟท์ติ้ง ทรัค',
          cost_price: 3450000.0,
          useful_life_years: 10,
          salvage_value: 1.0,
          status: 'active',
          notes: 'ใช้สำหรับระงับอัคคีภัย ส่งน้ำอุปโภคบริโภคช่วงภัยแล้ง และล้างทำความสะอาดถนน'
        },
        {
          asset_code: 'ค.17/2567/002',
          name: 'ชุดอุปกรณ์ตัดถ่างกู้ภัยไฮดรอลิก ช่วยเหลือผู้ประสบภัยทางถนน (พร้อมหัวตัดและหัวถ่าง)',
          category_id: 17,
          brand: 'Holmatro',
          model: 'Pentheon Series คัตเตอร์-สเปรดเดอร์ ไร้สาย',
          serial_number: 'HM-PENT-7714',
          department_id: 1,
          sub_department_id: 3,
          custodian_name: 'ส.อ.สมชาย ใจกล้า',
          location_room: 'ห้องเก็บอุปกรณ์กู้ภัย สถานีดับเพลิง',
          acquired_date: '2024-04-12',
          fiscal_year: 2567,
          budget_source: 'งบประมาณเทศบัญญัติ',
          vendor: 'บจก. เรสคิว อีควิปเมนท์ ไทยแลนด์',
          cost_price: 680000.0,
          useful_life_years: 8,
          salvage_value: 1.0,
          status: 'active',
          notes: 'ใช้ตัดถ่างซากยานพาหนะช่วยเหลือผู้บาดเจ็บติดภายในกรณีเกิดอุบัติเหตุบนท้องถนน'
        },
        {
          asset_code: 'ค.16/2568/001',
          name: 'เครื่องวิทยุสื่อสารราชการระบบดิจิทัล/อนาล็อก ชนิดมือถือ 5W (ชุด 10 เครื่อง)',
          category_id: 16,
          brand: 'Motorola',
          model: 'Mototrbo XiR P6620i TIA4950',
          serial_number: 'MOT-XIR-5521-SET',
          department_id: 1,
          sub_department_id: 3,
          custodian_name: 'ส.อ.สมชาย ใจกล้า',
          location_room: 'ศูนย์วิทยุสื่อสาร ชั้น 2 สำนักปลัด',
          acquired_date: '2025-01-25',
          fiscal_year: 2568,
          budget_source: 'งบประมาณเทศบัญญัติ',
          vendor: 'บจก. ยูไนเต็ด คอมมิวนิเคชั่น ซิสเต็มส์',
          cost_price: 145000.0,
          useful_life_years: 5,
          salvage_value: 1.0,
          status: 'active',
          notes: 'ใช้สำหรับข่ายสื่อสารประสานงานระงับภัยพิบัติและสั่งการช่วยเหลือประชาชน 24 ชม.'
        },
        {
          asset_code: 'ค.17/2568/001',
          name: 'เครื่องสูบน้ำดับเพลิงชนิดหาบหาม เครื่องยนต์เบนซิน 2 จังหวะ พร้อมสายส่งและหัวฉีด',
          category_id: 17,
          brand: 'Tohatsu',
          model: 'VC82ASE Auto Choke 60 แรงม้า',
          serial_number: 'TH-VC82-9904',
          department_id: 1,
          sub_department_id: 3,
          custodian_name: 'ส.อ.สมชาย ใจกล้า',
          location_room: 'สถานีดับเพลิงเทศบาล',
          acquired_date: '2025-02-14',
          fiscal_year: 2568,
          budget_source: 'งบประมาณเทศบัญญัติ',
          vendor: 'บจก. ธนบุรี ไฟร์ไฟท์ติ้ง ซัพพลาย',
          cost_price: 385000.0,
          useful_life_years: 8,
          salvage_value: 1.0,
          status: 'active',
          notes: 'ใช้ดับเพลิงในตรอกซอกซอยแคบที่รถดับเพลิงเข้าไม่ถึง และสูบน้ำจากแหล่งน้ำธรรมชาติ'
        },
        {
          asset_code: 'ค.08/2568/001',
          name: 'เครื่องพ่นหมอกควันกำจัดยุงลายและแมลงนำโรค ชนิดสะพายไหล่',
          category_id: 8,
          brand: 'Swingfog',
          model: 'SN50 เยอรมนีแท้',
          serial_number: 'SW-SN50-3341',
          department_id: 4,
          sub_department_id: 13,
          custodian_name: 'นางสมพร รักษ์อนามัย',
          location_room: 'คลังเวชภัณฑ์และควบคุมโรค กองสาธารณสุข',
          acquired_date: '2025-01-10',
          fiscal_year: 2568,
          budget_source: 'งบประมาณเทศบัญญัติ',
          vendor: 'บจก. เอ็นไวรอนเมนท์ แคร์ ซัพพลาย',
          cost_price: 82000.0,
          useful_life_years: 5,
          salvage_value: 1.0,
          status: 'active',
          notes: 'ใช้ฉีดพ่นละอองหมอกควันกำจัดยุงลายป้องกันโรคไข้เลือดออกในชุมชนและโรงเรียน'
        },
        {
          asset_code: 'ค.08/2567/001',
          name: 'เครื่องกระตุกหัวใจไฟฟ้าอัตโนมัติ (AED) พร้อมตู้เก็บสัญญาณเตือนภัย',
          category_id: 8,
          brand: 'Philips',
          model: 'HeartStart FRx พร้อมแผ่นนำไฟฟ้า',
          serial_number: 'PH-AED-99210',
          department_id: 4,
          sub_department_id: 11,
          custodian_name: 'นางสมพร รักษ์อนามัย',
          location_room: 'จุดบริการประชาชน ชั้น 1 สำนักงานเทศบาล',
          acquired_date: '2024-07-15',
          fiscal_year: 2567,
          budget_source: 'งบกองทุนหลักประกันสุขภาพตำบล (สปสช.)',
          vendor: 'บจก. เมดิคอล ซัพพลาย แอนด์ เซอร์วิส',
          cost_price: 95000.0,
          useful_life_years: 5,
          salvage_value: 1.0,
          status: 'active',
          notes: 'อุปกรณ์ช่วยฟื้นคืนชีพขั้นพื้นฐานสำหรับกรณีเกิดเหตุผู้ป่วยหัวใจหยุดเต้นฉับพลัน'
        },
        {
          asset_code: 'ค.08/2568/002',
          name: 'ตู้แช่เก็บรักษายาและวัคซีนควบคุมอุณหภูมิ 2-8 องศาเซลเซียส พร้อมระบบเตือนภัย',
          category_id: 8,
          brand: 'Haier',
          model: 'HXC-158 Biomedical Vaccine Refrigerator',
          serial_number: 'HR-HXC158-4412',
          department_id: 4,
          sub_department_id: 11,
          custodian_name: 'นางสมพร รักษ์อนามัย',
          location_room: 'ห้องเวชปฏิบัติและฉีดวัคซีน รพ.สต.',
          acquired_date: '2025-02-18',
          fiscal_year: 2568,
          budget_source: 'งบเงินอุดหนุนถ่ายโอน รพ.สต.',
          vendor: 'บจก. ไบโอเมดิคอล เทคโนโลยี',
          cost_price: 135000.0,
          useful_life_years: 8,
          salvage_value: 1.0,
          status: 'active',
          notes: 'ใช้เก็บรักษาวัคซีนป้องกันโรคเด็กแรกเกิดและเซรุ่มป้องกันพิษสุนัขบ้าตามมาตรฐาน GSP'
        },
        {
          asset_code: 'ค.02/2567/003',
          name: 'รถพยาบาลฉุกเฉิน (Ambulance) พร้อมอุปกรณ์กู้ชีพขั้นสูง EMS ตามมาตรฐาน สพฉ.',
          category_id: 2,
          brand: 'Toyota',
          model: 'Hiace Commuter ดีเซล 2.8L กู้ชีพขั้นสูง',
          serial_number: 'TY-AMB-88310',
          department_id: 4,
          sub_department_id: 11,
          custodian_name: 'นางสมพร รักษ์อนามัย',
          location_room: 'จุดจอดรถพยาบาล รพ.สต.',
          acquired_date: '2024-09-10',
          fiscal_year: 2567,
          budget_source: 'งบประมาณเทศบัญญัติ',
          vendor: 'บจก. แอมบูแลนซ์ โมดิฟายด์ เซ็นเตอร์',
          cost_price: 2350000.0,
          useful_life_years: 8,
          salvage_value: 1.0,
          status: 'active',
          notes: 'ใช้ส่งต่อผู้ป่วยฉุกเฉินวิกฤตและออกรับผู้ประสบอุบัติเหตุระบบบริการการแพทย์ฉุกเฉิน 1669'
        },
        {
          asset_code: 'ค.11/2568/002',
          name: 'จอภาพอัจฉริยะระบบสัมผัส Interactive Smart Board ขนาด 75 นิ้ว 4K สำหรับห้องเรียนดิจิทัล',
          category_id: 11,
          brand: 'Newline',
          model: 'TT-7521Q 4K Ultra HD พร้อมระบบปฏิบัติการคู่',
          serial_number: 'NL-7521-1189',
          department_id: 5,
          sub_department_id: 16,
          custodian_name: 'นางสาวดวงใจ การศึกษา',
          location_room: 'ห้องปฏิบัติการคอมพิวเตอร์และสื่อดิจิทัล',
          acquired_date: '2025-01-20',
          fiscal_year: 2568,
          budget_source: 'งบเงินอุดหนุนการจัดการศึกษาขั้นพื้นฐาน',
          vendor: 'บจก. เอ็ดดูเคชั่น อินโนเวชั่น ไทยแลนด์',
          cost_price: 145000.0,
          useful_life_years: 5,
          salvage_value: 1.0,
          status: 'active',
          notes: 'ใช้จัดการเรียนการสอนแบบ Active Learning และสื่อมัลติมีเดียสำหรับนักเรียน'
        },
        {
          asset_code: 'ค.12/2567/002',
          name: 'ชุดเครื่องเล่นสนามเด็กเล่นกลางแจ้งรวมมิตร มอก. เสริมทักษะพัฒนาการเด็ก ศพด.',
          category_id: 12,
          brand: 'Playground Pro',
          model: 'Classic Wonder Land Series ชิงช้า-สไลเดอร์-อุโมงค์',
          serial_number: 'PGP-2567-004',
          department_id: 5,
          sub_department_id: 15,
          custodian_name: 'นางสาวดวงใจ การศึกษา',
          location_room: 'ลานกิจกรรมกลางแจ้ง ศพด. เทศบาล',
          acquired_date: '2024-05-18',
          fiscal_year: 2567,
          budget_source: 'งบประมาณเทศบัญญัติ',
          vendor: 'บจก. เพลย์กราวด์ แอนด์ สปอร์ต อิควิปเมนท์',
          cost_price: 220000.0,
          useful_life_years: 8,
          salvage_value: 1.0,
          status: 'active',
          notes: 'เครื่องเล่นสนามมาตรฐานความปลอดภัย มอก.3000 สำหรับพัฒนาการกล้ามเนื้อมัดใหญ่เด็กปฐมวัย'
        },
        {
          asset_code: 'ค.01/2568/002',
          name: 'เครื่องฟอกอากาศฆ่าเชื้อโรคระบบ HEPA H14 สำหรับห้องเรียนเด็กปฐมวัย (ชุด 4 เครื่อง)',
          category_id: 1,
          brand: 'Daikin',
          model: 'MC55UVM6 Streamer Technology',
          serial_number: 'DK-MC55-SET4',
          department_id: 5,
          sub_department_id: 15,
          custodian_name: 'นางสาวดวงใจ การศึกษา',
          location_room: 'ห้องเรียนระดับปฐมวัย ศพด.',
          acquired_date: '2025-02-12',
          fiscal_year: 2568,
          budget_source: 'งบประมาณเทศบัญญัติ',
          vendor: 'หจก. ลานนา แอร์คอนดิชั่น แอนด์ ซัพพลาย',
          cost_price: 58000.0,
          useful_life_years: 5,
          salvage_value: 1.0,
          status: 'active',
          notes: 'ใช้กรองฝุ่นละออง PM 2.5 และฆ่าเชื้อแบคทีเรีย/ไวรัสในห้องเรียนเด็กเล็ก'
        },
        {
          asset_code: 'ค.08/2568/003',
          name: 'รถเข็นวีลแชร์ผู้ป่วยและคนพิการชนิดพับได้ น้ำหนักเบา สำหรับบริการประชาชนยืมใช้ (ชุด 6 คัน)',
          category_id: 8,
          brand: 'Karma',
          model: 'Ergo 105 อะลูมิเนียมอัลลอยด์',
          serial_number: 'KM-ERGO-SET6',
          department_id: 6,
          sub_department_id: 19,
          custodian_name: 'นางกานดา สวัสดิ์ดี',
          location_room: 'ห้องปฏิบัติงานกองสวัสดิการสังคม ชั้น 1',
          acquired_date: '2025-01-15',
          fiscal_year: 2568,
          budget_source: 'งบประมาณเทศบัญญัติ',
          vendor: 'บจก. กู้ดเวลเนส การแพทย์',
          cost_price: 72000.0,
          useful_life_years: 5,
          salvage_value: 1.0,
          status: 'active',
          notes: 'ใช้สำหรับบริการยืมอุปกรณ์ฟื้นฟูสมรรถภาพแก่คนพิการและผู้สูงอายุในชุมชน'
        },
        {
          asset_code: 'ค.08/2567/002',
          name: 'เตียงผู้ป่วยปรับระดับ 3 ไกร์ พร้อมที่นอนลมป้องกันแผลกดทับ (ชุด 3 ชุด)',
          category_id: 8,
          brand: 'Paramount',
          model: 'A5 Series Manual Bed พร้อมที่นอนลม',
          serial_number: 'PM-BED3-SET3',
          department_id: 6,
          sub_department_id: 19,
          custodian_name: 'นางกานดา สวัสดิ์ดี',
          location_room: 'คลังเก็บอุปกรณ์สงเคราะห์ กองสวัสดิการสังคม',
          acquired_date: '2024-06-20',
          fiscal_year: 2567,
          budget_source: 'งบกองทุนสวัสดิการชุมชน',
          vendor: 'บจก. สยามเมดิคอล แคร์',
          cost_price: 105000.0,
          useful_life_years: 8,
          salvage_value: 1.0,
          status: 'active',
          notes: 'เตียงบริการยืมสำหรับผู้ป่วยติดเตียงและผู้สูงอายุภาวะพึ่งพิงในเขตเทศบาล'
        }
      ];

      const insertOtherAsset = db.prepare(`
        INSERT INTO assets (
          asset_code, name, category_id, brand, model, serial_number,
          department_id, sub_department_id, custodian_name, location_room, acquired_date,
          fiscal_year, budget_source, vendor, cost_price, useful_life_years,
          salvage_value, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const checkOther = db.prepare('SELECT id FROM assets WHERE asset_code = ?');
      const insertOtherAudit = db.prepare(`
        INSERT OR IGNORE INTO annual_audit_details (audit_id, asset_id, physical_status, verified_by, verified_at, remarks)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const a of allNewAssets) {
        const existing = checkOther.get(a.asset_code);
        let assetId = existing?.id;
        if (!existing) {
          const res = insertOtherAsset.run(
            a.asset_code, a.name, a.category_id, a.brand, a.model, a.serial_number,
            a.department_id, a.sub_department_id, a.custodian_name, a.location_room, a.acquired_date,
            a.fiscal_year, a.budget_source, a.vendor, a.cost_price, a.useful_life_years,
            a.salvage_value, a.status, a.notes
          );
          assetId = res.lastInsertRowid;
        }
        if (assetId) {
          insertOtherAudit.run(1, assetId, 'normal', 'คณะกรรมการตรวจสอบพัสดุ', '2025-09-25 11:00:00', 'ตรวจนับหน้างาน สภาพดีพร้อมใช้งานตามภารกิจ');
        }
      }
    }
  } catch (err) {
    console.error('Error auto-seeding other specialized assets:', err.message);
  }
}

