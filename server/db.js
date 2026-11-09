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
}

