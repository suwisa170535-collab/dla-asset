import { db, initDatabase } from './db.js';

export function seedData(force = false) {
  initDatabase();

  if (force) {
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
      DELETE FROM departments;
      DELETE FROM categories;
      DELETE FROM audit_logs;
    `);
  } else {
    // Check if already seeded
    const check = db.prepare('SELECT COUNT(*) as count FROM departments').get();
    if (check && check.count > 0) {
      console.log('Database already initialized and seeded.');
      return;
    }
  }

  console.log('Seeding initial municipal data...');

  // Settings
  const settingsData = [
    ['org_name', 'เทศบาลตำบลสุขเกษมพัฒนา'],
    ['org_type', 'เทศบาลตำบล'],
    ['district', 'อำเภอเมือง'],
    ['province', 'จังหวัดเชียงใหม่'],
    ['fiscal_year', '2569'],
    ['mayor_name', 'นายสมศักดิ์ วัฒนากูล'],
    ['clerk_name', 'นางพิมพา จิตตรง'],
    ['supply_officer_name', 'นางสาวนิตยา พัสดุเจริญ'],
    ['code_format', '{prefix}/{year}/{seq}']
  ];

  const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of settingsData) {
    insertSetting.run(k, v);
  }

  // Departments
  const departments = [
    { code: '01', name: 'สำนักปลัดเทศบาล', head_name: 'นายชวลิต บุญมา', head_position: 'หัวหน้าสำนักปลัด' },
    { code: '02', name: 'กองคลัง', head_name: 'นางวราภรณ์ ทรัพย์เพิ่ม', head_position: 'ผู้อำนวยการกองคลัง' },
    { code: '03', name: 'กองช่าง', head_name: 'นายเอกชัย ช่างประดิษฐ์', head_position: 'ผู้อำนวยการกองช่าง' },
    { code: '04', name: 'กองสาธารณสุขและสิ่งแวดล้อม', head_name: 'ดร.อรทัย รักสะอาด', head_position: 'ผู้อำนวยการกองสาธารณสุขฯ' },
    { code: '05', name: 'กองการศึกษา ศาสนาและวัฒนธรรม', head_name: 'นายประสิทธิ์ สอนดี', head_position: 'ผู้อำนวยการกองการศึกษา' },
    { code: '06', name: 'กองสวัสดิการสังคม', head_name: 'นางกมลวรรณ เกื้อกูล', head_position: 'ผู้อำนวยการกองสวัสดิการสังคม' }
  ];

  const insertDept = db.prepare('INSERT INTO departments (code, name, head_name, head_position) VALUES (?, ?, ?, ?)');
  for (const d of departments) {
    insertDept.run(d.code, d.name, d.head_name, d.head_position);
  }

  // Categories
  const categories = [
    { code: '01', name: 'ครุภัณฑ์สำนักงาน', prefix: 'ค.01', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'โต๊ะ, ตู้, เก้าอี้, เครื่องปรับอากาศ, เครื่องถ่ายเอกสาร' },
    { code: '02', name: 'ครุภัณฑ์ยานพาหนะและขนส่ง', prefix: 'ค.02', useful_life_years: 8, depreciation_rate_pct: 12.5, description: 'รถยนต์ส่วนกลาง, รถบรรทุกขยะ, รถดับเพลิง, รถพยาบาลฉุกเฉิน' },
    { code: '03', name: 'ครุภัณฑ์คอมพิวเตอร์', prefix: 'ค.03', useful_life_years: 3, depreciation_rate_pct: 33.33, description: 'เครื่องคอมพิวเตอร์, โน้ตบุ๊ก, เครื่องพิมพ์, เซิร์ฟเวอร์, สวิตช์เครือข่าย' },
    { code: '04', name: 'ครุภัณฑ์ไฟฟ้าและวิทยุ', prefix: 'ค.04', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'วิทยุสื่อสาร, เครื่องเสียงตามสาย, โทรทัศน์, โซล่าร์เซลล์' },
    { code: '05', name: 'ครุภัณฑ์การเกษตร', prefix: 'ค.05', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'เครื่องตัดหญ้าสะพายบ่า, เครื่องพ่นหมอกควัน, เครื่องสูบน้ำ' },
    { code: '06', name: 'ครุภัณฑ์ก่อสร้าง', prefix: 'ค.06', useful_life_years: 8, depreciation_rate_pct: 12.5, description: 'เครื่องตบดิน, เครื่องสกัดคอนกรีต, กล้องระดับสำรวจ' },
    { code: '07', name: 'ครุภัณฑ์งานบ้านงานครัว', prefix: 'ค.07', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'ตู้เย็น, ไมโครเวฟ, ตู้กดน้ำดื่ม' },
    { code: '08', name: 'ครุภัณฑ์การแพทย์และวิทยาศาสตร์', prefix: 'ค.08', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'เครื่องวัดความดัน, ถังออกซิเจน, เครื่องตรวจน้ำตาล' },
    { code: '09', name: 'ครุภัณฑ์โฆษณาและเผยแพร่', prefix: 'ค.09', useful_life_years: 5, depreciation_rate_pct: 20.0, description: 'กล้องดิจิทัล, ขาตั้งกล้อง, ป้ายไฟ LED ประชาสัมพันธ์' },
    { code: '10', name: 'ที่ดินและสิ่งปลูกสร้าง', prefix: 'สท.3', useful_life_years: 20, depreciation_rate_pct: 5.0, description: 'อาคารสำนักงาน, อาคารเรียน, โรงจอดรถ, ที่ดินสาธารณประโยชน์' }
  ];

  const insertCat = db.prepare('INSERT INTO categories (code, name, prefix, useful_life_years, depreciation_rate_pct, description) VALUES (?, ?, ?, ?, ?, ?)');
  for (const c of categories) {
    insertCat.run(c.code, c.name, c.prefix, c.useful_life_years, c.depreciation_rate_pct, c.description);
  }

  // Assets
  const assets = [
    {
      asset_code: 'ค.03/2567/001',
      name: 'เครื่องคอมพิวเตอร์ประมวลผล All-in-One สำนักงาน',
      category_id: 3,
      brand: 'Dell',
      model: 'OptiPlex 7400 AIO',
      serial_number: 'DL-7400-99812A',
      department_id: 2, // กองคลัง
      custodian_name: 'นางสาววิมล สถิตย์',
      location_room: 'ห้องงานการเงินและบัญชี ชั้น 1',
      acquired_date: '2023-11-15',
      fiscal_year: 2567,
      budget_source: 'เงินงบประมาณเทศบาล',
      vendor: 'บริษัท ไอที โซลูชั่นส์ จำกัด',
      cost_price: 32500.0,
      useful_life_years: 3,
      salvage_value: 1.0,
      status: 'active',
      notes: 'ใช้งานระบบ e-LAAS บัญชีเทศบาล'
    },
    {
      asset_code: 'ค.03/2567/002',
      name: 'เครื่องคอมพิวเตอร์โน้ตบุ๊กสำหรับประมวลผล',
      category_id: 3,
      brand: 'Lenovo',
      model: 'ThinkPad L14 Gen 4',
      serial_number: 'LN-TP-2023-0887',
      department_id: 1, // สำนักปลัด
      custodian_name: 'นายชวลิต บุญมา',
      location_room: 'ห้องหัวหน้าสำนักปลัด',
      acquired_date: '2023-12-01',
      fiscal_year: 2567,
      budget_source: 'เงินงบประมาณเทศบาล',
      vendor: 'ห้างหุ้นส่วนจำกัด สุขเกษมการค้า',
      cost_price: 28900.0,
      useful_life_years: 3,
      salvage_value: 1.0,
      status: 'active',
      notes: 'ใช้สำหรับงานบริหารจัดการและประชุมสภาเทศบาล'
    },
    {
      asset_code: 'ค.01/2567/001',
      name: 'เครื่องปรับอากาศ ชนิดแยกส่วน แบบแขวน 24,000 BTU',
      category_id: 1,
      brand: 'Daikin',
      model: 'FH-24NV2S',
      serial_number: 'DK-AC-24K-44321',
      department_id: 1,
      custodian_name: 'นายกานต์ สิทธิชัย',
      location_room: 'ห้องประชุมสภาเทศบาล ชั้น 2',
      acquired_date: '2024-01-20',
      fiscal_year: 2567,
      budget_source: 'เงินสะสม',
      vendor: 'ห้างหุ้นส่วนจำกัด เมืองเหนือแอร์ เซอร์วิส',
      cost_price: 35000.0,
      useful_life_years: 5,
      salvage_value: 1.0,
      status: 'active',
      notes: 'ติดตั้งพร้อมท่อทองแดงและเบรกเกอร์'
    },
    {
      asset_code: 'ค.02/2566/001',
      name: 'รถบรรทุกขยะมูลฝอย แบบอัดท้าย ขนาด 6 ตัน 6 ล้อ',
      category_id: 2,
      brand: 'ISUZU',
      model: 'NPR 150 แรงม้า',
      serial_number: 'ISZ-NPR-66-8890',
      department_id: 4, // กองสาธารณสุข
      custodian_name: 'นายบุญทัน ขยันดี',
      location_room: 'โรงจอดรถยนต์ส่วนกลาง',
      acquired_date: '2022-12-10',
      fiscal_year: 2566,
      budget_source: 'เงินอุดหนุนเฉพาะกิจ',
      vendor: 'บริษัท อีซูซุล้านนามอเตอร์ จำกัด',
      cost_price: 2450000.0,
      useful_life_years: 8,
      salvage_value: 1.0,
      status: 'active',
      notes: 'ทะเบียน 82-4512 เชียงใหม่ ติดตั้งเครื่องอัดไฮดรอลิก'
    },
    {
      asset_code: 'ค.06/2568/001',
      name: 'กล้องระดับสำรวจอิเล็กทรอนิกส์ (Total Station)',
      category_id: 6,
      brand: 'Topcon',
      model: 'GM-52 Series',
      serial_number: 'TP-GM-52-1192',
      department_id: 3, // กองช่าง
      custodian_name: 'นายเอกชัย ช่างประดิษฐ์',
      location_room: 'ห้องฝ่ายแบบแผนและก่อสร้าง กองช่าง',
      acquired_date: '2024-11-05',
      fiscal_year: 2568,
      budget_source: 'เงินงบประมาณเทศบาล',
      vendor: 'บริษัท สยามเซอร์เวย์ ซิสเต็มส์ จำกัด',
      cost_price: 185000.0,
      useful_life_years: 8,
      salvage_value: 1.0,
      status: 'active',
      notes: 'พร้อมขาตั้งกล้องและเป้าปริซึมสะท้อนแสง'
    },
    {
      asset_code: 'ค.05/2568/001',
      name: 'เครื่องตัดหญ้าสะพายบ่า ชนิดเครื่องยนต์เบนซิน 2 จังหวะ',
      category_id: 5,
      brand: 'Honda',
      model: 'UMK435T',
      serial_number: 'HD-UMK-2025-01',
      department_id: 4, // กองสาธารณสุข
      custodian_name: 'นายสายชล แดงดี',
      location_room: 'คลังเก็บเครื่องมือ กองสาธารณสุข',
      acquired_date: '2025-01-15',
      fiscal_year: 2568,
      budget_source: 'เงินงบประมาณเทศบาล',
      vendor: 'ร้าน สุขเกษมการเกษตร',
      cost_price: 9800.0,
      useful_life_years: 5,
      salvage_value: 1.0,
      status: 'damaged',
      notes: 'ใบมีดบิ่นและสตาร์ทติดยาก อยู่ระหว่างรอส่งซ่อม'
    },
    {
      asset_code: 'ค.01/2562/003',
      name: 'เครื่องถ่ายเอกสารระบบดิจิทัลมัลติฟังก์ชัน ขาว-ดำ/สี',
      category_id: 1,
      brand: 'Fuji Xerox',
      model: 'DocuCentre-V C2263',
      serial_number: 'FX-DC-2263-9090',
      department_id: 1, // สำนักปลัด
      custodian_name: 'นางสมศรี ใจกล้า',
      location_room: 'ห้องงานสารบรรณ สำนักปลัด',
      acquired_date: '2019-03-12',
      fiscal_year: 2562,
      budget_source: 'เงินงบประมาณเทศบาล',
      vendor: 'บริษัท ฟูจิ ซีร็อกซ์ (ประเทศไทย) จำกัด',
      cost_price: 85000.0,
      useful_life_years: 5,
      salvage_value: 1.0,
      status: 'pending_disposal',
      notes: 'หมดอายุการใช้งานแล้ว ชิ้นส่วนลูกดรัมชำรุด ซ่อมไม่คุ้มค่า เสนอแทงจำหน่าย'
    },
    {
      asset_code: 'ค.09/2569/001',
      name: 'กล้องดิจิทัล Mirrorless สำหรับงานประชาสัมพันธ์เทศบาล',
      category_id: 9,
      brand: 'Sony',
      model: 'Alpha 7 IV (พร้อมเลนส์ 24-70mm)',
      serial_number: 'SN-A7M4-77123',
      department_id: 1, // สำนักปลัด
      custodian_name: 'นายอัครเดช สื่อสาร',
      location_room: 'ฝ่ายงานประชาสัมพันธ์ สำนักปลัด',
      acquired_date: '2025-10-18',
      fiscal_year: 2569,
      budget_source: 'เงินงบประมาณเทศบาล',
      vendor: 'บริษัท บิ๊ก คาเมร่า คอร์ปอเรชั่น จำกัด',
      cost_price: 89900.0,
      useful_life_years: 5,
      salvage_value: 1.0,
      status: 'active',
      notes: 'ใช้บันทึกภาพนิ่งและวิดีโอภารกิจของผู้บริหาร'
    },
    {
      asset_code: 'สท.3/2565/001',
      name: 'อาคารสำนักงานเทศบาลตำบลสุขเกษมพัฒนา (3 ชั้น คสล.)',
      category_id: 10,
      brand: 'อาคารสำนักงาน คสล.',
      model: 'แบบมาตรฐาน มท. 3 ชั้น',
      serial_number: 'BLD-SKP-01',
      department_id: 1, // สำนักปลัด
      custodian_name: 'นายชวลิต บุญมา',
      location_room: 'สำนักงานใหญ่เทศบาล',
      acquired_date: '2022-05-10',
      fiscal_year: 2565,
      budget_source: 'เงินอุดหนุนเฉพาะกิจ',
      vendor: 'หจก. เชียงใหม่คอนสตรัคชั่น กรุ๊ป',
      vendor_phone: '053-998877',
      contract_number: 'จบ.12/2564',
      procurement_method: 'e-bidding (ประกวดราคาอิเล็กทรอนิกส์)',
      deed_number: 'โฉนดที่ดินเลขที่ 45892 (น.ส.4 จ)',
      land_area: '4 ไร่ 2 งาน 50 ตารางวา',
      warranty_expiry_date: '2027-05-10',
      cost_price: 18500000.0,
      useful_life_years: 20,
      salvage_value: 1.0,
      status: 'active',
      notes: 'ใช้เป็นสถานที่ปฏิบัติราชการและบริการประชาชน'
    }
  ];

  const insertAsset = db.prepare(`
    INSERT INTO assets (
      asset_code, name, category_id, brand, model, serial_number,
      department_id, custodian_name, location_room, acquired_date,
      fiscal_year, budget_source, vendor, cost_price, useful_life_years,
      salvage_value, status, notes,
      warranty_expiry_date, vendor_phone, contract_number, procurement_method, deed_number, land_area
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const a of assets) {
    insertAsset.run(
      a.asset_code, a.name, a.category_id, a.brand, a.model, a.serial_number,
      a.department_id, a.custodian_name, a.location_room, a.acquired_date,
      a.fiscal_year, a.budget_source, a.vendor, a.cost_price, a.useful_life_years,
      a.salvage_value, a.status, a.notes,
      a.warranty_expiry_date || null, a.vendor_phone || null, a.contract_number || null,
      a.procurement_method || null, a.deed_number || null, a.land_area || null
    );
  }

  // Inventory Items (Consumables)
  const items = [
    { item_code: 'ว.01-001', name: 'กระดาษถ่ายเอกสาร A4 80 แกรม (Double A)', category: 'วัสดุสำนักงาน', unit: 'รีม', min_stock: 50, current_stock: 120, unit_price: 135.0, storage_location: 'คลังพัสดุกลาง ชั้น 1 ตู้ A-01' },
    { item_code: 'ว.01-002', name: 'ตลับหมึกเลเซอร์ HP LaserJet MFP M428 (CF258A)', category: 'วัสดุคอมพิวเตอร์', unit: 'ตลับ', min_stock: 5, current_stock: 3, unit_price: 2450.0, storage_location: 'คลังพัสดุกลาง ชั้น 1 ตู้ IT-02' },
    { item_code: 'ว.01-003', name: 'ปากกาลูกลื่นเจล สีน้ำเงิน 0.5 มม. (กล่อง 50 ด้าม)', category: 'วัสดุสำนักงาน', unit: 'กล่อง', min_stock: 10, current_stock: 18, unit_price: 280.0, storage_location: 'คลังพัสดุกลาง ชั้น 1 ตู้ A-03' },
    { item_code: 'ว.01-004', name: 'แฟ้มเสนอเซ็นต์หนังเทียม A4 สีกรมท่า', category: 'วัสดุสำนักงาน', unit: 'เล่ม', min_stock: 15, current_stock: 8, unit_price: 120.0, storage_location: 'คลังพัสดุกลาง ชั้น 1 ตู้ B-01' },
    { item_code: 'ว.01-005', name: 'ถุงขยะดำ ขนาด 30x40 นิ้ว หนาพิเศษ', category: 'วัสดุงานบ้านงานครัว', unit: 'แพ็ค', min_stock: 40, current_stock: 75, unit_price: 65.0, storage_location: 'คลังพัสดุกลาง ห้องเก็บอุปกรณ์แม่บ้าน' },
    { item_code: 'ว.01-006', name: 'น้ำยาฆ่าเชื้อทำความสะอาดพื้น (แกลลอน 3.8 ลิตร)', category: 'วัสดุงานบ้านงานครัว', unit: 'แกลลอน', min_stock: 10, current_stock: 4, unit_price: 185.0, storage_location: 'คลังพัสดุกลาง ห้องเก็บอุปกรณ์แม่บ้าน' },
    { item_code: 'ว.01-007', name: 'ลวดเย็บกระดาษ เบอร์ 10 (กล่อง 24 ตลับ)', category: 'วัสดุสำนักงาน', unit: 'กล่อง', min_stock: 12, current_stock: 22, unit_price: 150.0, storage_location: 'คลังพัสดุกลาง ชั้น 1 ตู้ A-02' },
    { item_code: 'ว.01-008', name: 'ถ่านอัลคาไลน์ AA (แพ็ค 4 ก้อน)', category: 'วัสดุไฟฟ้าและวิทยุ', unit: 'แพ็ค', min_stock: 15, current_stock: 12, unit_price: 95.0, storage_location: 'คลังพัสดุกลาง ชั้น 1 ตู้ EL-01' }
  ];

  const insertItem = db.prepare(`
    INSERT INTO inventory_items (item_code, name, category, unit, min_stock, current_stock, unit_price, storage_location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of items) {
    insertItem.run(item.item_code, item.name, item.category, item.unit, item.min_stock, item.current_stock, item.unit_price, item.storage_location);
  }

  // FIFO Stock Lots for Items
  const lots = [
    { item_id: 1, lot_number: 'LOT-2569/01', received_date: '2025-10-05', quantity_received: 80, quantity_remaining: 50, unit_cost: 130.0, supplier: 'ร้าน สุขเกษมสเตชั่นเนอรี่', po_number: 'PO-69/001' },
    { item_id: 1, lot_number: 'LOT-2569/02', received_date: '2026-01-10', quantity_received: 70, quantity_remaining: 70, unit_cost: 135.0, supplier: 'บจก. ก้าวหน้าเครื่องเขียน', po_number: 'PO-69/045' },
    { item_id: 2, lot_number: 'LOT-2569/01', received_date: '2025-11-20', quantity_received: 6, quantity_remaining: 3, unit_cost: 2450.0, supplier: 'บจก. ไอที ซัพพลาย ล้านนา', po_number: 'PO-69/012' },
    { item_id: 4, lot_number: 'LOT-2569/01', received_date: '2025-10-12', quantity_received: 20, quantity_remaining: 8, unit_cost: 120.0, supplier: 'ร้าน สุขเกษมสเตชั่นเนอรี่', po_number: 'PO-69/003' },
    { item_id: 6, lot_number: 'LOT-2569/01', received_date: '2025-12-05', quantity_received: 10, quantity_remaining: 4, unit_cost: 185.0, supplier: 'บจก. สะอาดดีคลีนนิ่ง', po_number: 'PO-69/028' }
  ];

  const insertLot = db.prepare(`
    INSERT INTO inventory_lots (item_id, lot_number, received_date, quantity_received, quantity_remaining, unit_cost, supplier, po_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const l of lots) {
    insertLot.run(l.item_id, l.lot_number, l.received_date, l.quantity_received, l.quantity_remaining, l.unit_cost, l.supplier, l.po_number);
  }

  // Requisitions (Paperless Requisition System)
  const requisitions = [
    {
      req_number: 'บบ.01/2569',
      department_id: 2, // กองคลัง
      requester_name: 'นางสาววิมล สถิตย์',
      requester_position: 'เจ้าพนักงานการเงินและบัญชีปฏิบัติงาน',
      requested_date: '2026-02-10',
      purpose: 'ใช้สำหรับพิมพ์รายงานงบทดลองและเอกสารประกอบการบันทึกบัญชีประจำเดือน',
      status: 'dispensed',
      approver_name: 'นางวราภรณ์ ทรัพย์เพิ่ม',
      approved_date: '2026-02-11',
      approval_comment: 'อนุมัติตามขอเบิกเพื่อการปฏิบัติงานกองคลัง',
      dispenser_name: 'นางสาวนิตยา พัสดุเจริญ',
      dispensed_date: '2026-02-11',
      notes: 'จ่ายพัสดุครบตามจำนวนเรียบร้อย',
      items: [
        { item_id: 1, requested_qty: 10, approved_qty: 10, dispensed_qty: 10, unit_cost: 130.0 },
        { item_id: 3, requested_qty: 2, approved_qty: 2, dispensed_qty: 2, unit_cost: 280.0 }
      ]
    },
    {
      req_number: 'บบ.02/2569',
      department_id: 1, // สำนักปลัด
      requester_name: 'นายกานต์ สิทธิชัย',
      requester_position: 'เจ้าพนักงานธุรการปฏิบัติงาน',
      requested_date: '2026-03-01',
      purpose: 'จัดเตรียมเอกสารการประชุมสภาเทศบาล สมัยสามัญ สมัยแรก ประจำปี 2569',
      status: 'pending_approval',
      approver_name: null,
      approved_date: null,
      approval_comment: null,
      dispenser_name: null,
      dispensed_date: null,
      notes: 'ขอเร่งด่วนก่อนวันศุกร์นี้',
      items: [
        { item_id: 1, requested_qty: 15, approved_qty: 15, dispensed_qty: null, unit_cost: 130.0 },
        { item_id: 4, requested_qty: 5, approved_qty: 5, dispensed_qty: null, unit_cost: 120.0 }
      ]
    },
    {
      req_number: 'บบ.03/2569',
      department_id: 4, // กองสาธารณสุข
      requester_name: 'นายสายชล แดงดี',
      requester_position: 'พนักงานขับเครื่องจักรกลขนาดเบา',
      requested_date: '2026-03-05',
      purpose: 'กิจกรรม Big Cleaning Day ป้องกันโรคไข้เลือดออกรอบอาคารสำนักงาน',
      status: 'approved',
      approver_name: 'ดร.อรทัย รักสะอาด',
      approved_date: '2026-03-05',
      approval_comment: 'เห็นชอบตามโครงการรณรงค์ความสะอาด',
      dispenser_name: null,
      dispensed_date: null,
      notes: 'รอเจ้าหน้าที่พัสดุจัดเตรียมจ่ายของ',
      items: [
        { item_id: 5, requested_qty: 20, approved_qty: 20, dispensed_qty: null, unit_cost: 65.0 },
        { item_id: 6, requested_qty: 2, approved_qty: 2, dispensed_qty: null, unit_cost: 185.0 }
      ]
    }
  ];

  const insertReq = db.prepare(`
    INSERT INTO requisitions (req_number, department_id, requester_name, requester_position, requested_date, purpose, status, approver_name, approved_date, approval_comment, dispenser_name, dispensed_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertReqItem = db.prepare(`
    INSERT INTO requisition_items (requisition_id, item_id, requested_qty, approved_qty, dispensed_qty, unit_cost_at_dispense)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const r of requisitions) {
    const res = insertReq.run(
      r.req_number, r.department_id, r.requester_name, r.requester_position,
      r.requested_date, r.purpose, r.status, r.approver_name, r.approved_date,
      r.approval_comment, r.dispenser_name, r.dispensed_date, r.notes
    );
    const reqId = res.lastInsertRowid;
    for (const item of r.items) {
      insertReqItem.run(reqId, item.item_id, item.requested_qty, item.approved_qty, item.dispensed_qty, item.unit_cost);
    }
  }

  // Maintenance Records
  const maintenance = [
    {
      ticket_number: 'ซร.01/2569',
      asset_id: 6, // เครื่องตัดหญ้า
      report_date: '2026-02-15',
      reporter_name: 'นายสายชล แดงดี',
      symptom: 'สตาร์ทติดยาก มีควันขาวผิดปกติ และใบมีดหลวมเกิดอาการสั่นสะเทือนรุนแรง',
      status: 'inspecting',
      repair_vendor: 'อู่ช่างเล็กการเกษตร',
      spare_parts: 'หัวเทียน, ไส้กรองอากาศ, ใบมีดตัดหญ้าสี่เหลี่ยม',
      repair_cost: 1250.0,
      completion_date: null,
      notes: 'อยู่ระหว่างรออะไหล่เทียบแท้'
    },
    {
      ticket_number: 'ซร.02/2568',
      asset_id: 4, // รถบรรทุกขยะ
      report_date: '2025-08-10',
      reporter_name: 'นายบุญทัน ขยันดี',
      symptom: 'สายไฮดรอลิกชุดอัดขยะรั่วซึม ทำให้แรงดันตก อัดขยะได้ช้าลง',
      status: 'completed',
      repair_vendor: 'บริษัท ไฮดรอลิก ซิสเต็มส์ แอนด์ เซอร์วิส จำกัด',
      spare_parts: 'สายไฮดรอลิกทนแรงดันสูง 2 เส้น, ซีลกระบอกสูบ, น้ำมันไฮดรอลิก ISO 68',
      repair_cost: 14800.0,
      completion_date: '2025-08-16',
      notes: 'ซ่อมแซมและทดสอบระบบอัดใช้งานได้แรงดันมาตรฐาน 200 บาร์'
    }
  ];

  const insertMaint = db.prepare(`
    INSERT INTO maintenance_records (ticket_number, asset_id, report_date, reporter_name, symptom, status, repair_vendor, spare_parts, repair_cost, completion_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const m of maintenance) {
    insertMaint.run(m.ticket_number, m.asset_id, m.report_date, m.reporter_name, m.symptom, m.status, m.repair_vendor, m.spare_parts, m.repair_cost, m.completion_date, m.notes);
  }

  // Annual Audits
  const annualAudit = {
    audit_code: 'ตส.2568/01',
    fiscal_year: 2568,
    audit_date: '2025-09-25',
    committee_chairman: 'นางพิมพา จิตตรง (ปลัดเทศบาล - ประธานกรรมการ)',
    committee_members: 'นายเอกชัย ช่างประดิษฐ์ (ผอ.กองช่าง - กรรมการ), นางวราภรณ์ ทรัพย์เพิ่ม (ผอ.กองคลัง - กรรมการ), นางสาวนิตยา พัสดุเจริญ (นักวิชาการพัสดุชำนาญการ - กรรมการและเลขานุการ)',
    status: 'completed',
    notes: 'การตรวจสอบพัสดุประจำปีงบประมาณ พ.ศ. 2568 ตามระเบียบกระทรวงการคลังฯ พ.ศ. 2560 ข้อ 213'
  };

  const insertAudit = db.prepare(`
    INSERT INTO annual_audits (audit_code, fiscal_year, audit_date, committee_chairman, committee_members, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const auditRes = insertAudit.run(
    annualAudit.audit_code, annualAudit.fiscal_year, annualAudit.audit_date,
    annualAudit.committee_chairman, annualAudit.committee_members, annualAudit.status, annualAudit.notes
  );
  const auditId = auditRes.lastInsertRowid;

  // Audit Details for assets
  const auditDetails = [
    { asset_id: 1, physical_status: 'normal', verified_by: 'นางพิมพา จิตตรง', verified_at: '2025-09-25 10:15:00', remarks: 'สภาพดี อยู่ที่ห้องการเงิน กองคลัง' },
    { asset_id: 2, physical_status: 'normal', verified_by: 'นางพิมพา จิตตรง', verified_at: '2025-09-25 10:30:00', remarks: 'สภาพดี ใช้งานประจำสำนักปลัด' },
    { asset_id: 3, physical_status: 'normal', verified_by: 'นายเอกชัย ช่างประดิษฐ์', verified_at: '2025-09-25 11:00:00', remarks: 'แอร์ทำงานเย็นปกติ ห้องประชุมสภา' },
    { asset_id: 4, physical_status: 'normal', verified_by: 'นายเอกชัย ช่างประดิษฐ์', verified_at: '2025-09-25 11:30:00', remarks: 'รถยนต์ใช้งานประจำการ กองสาธารณสุข' },
    { asset_id: 5, physical_status: 'normal', verified_by: 'นายเอกชัย ช่างประดิษฐ์', verified_at: '2025-09-25 13:45:00', remarks: 'กล้องระดับใช้งานได้แม่นยำ กองช่าง' },
    { asset_id: 6, physical_status: 'damaged', verified_by: 'นางสาวนิตยา พัสดุเจริญ', verified_at: '2025-09-25 14:10:00', remarks: 'เครื่องตัดหญ้าชำรุดรอซ่อมเปลี่ยนอะไหล่' },
    { asset_id: 7, physical_status: 'worn_out', verified_by: 'นางสาวนิตยา พัสดุเจริญ', verified_at: '2025-09-25 14:40:00', remarks: 'เครื่องถ่ายเอกสารเสื่อมสภาพ เสนอคณะกรรมการจำหน่าย' }
  ];

  const insertAuditDetail = db.prepare(`
    INSERT INTO annual_audit_details (audit_id, asset_id, physical_status, verified_by, verified_at, remarks)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const ad of auditDetails) {
    insertAuditDetail.run(auditId, ad.asset_id, ad.physical_status, ad.verified_by, ad.verified_at, ad.remarks);
  }

  // Disposals (การแทงจำหน่าย)
  const disposal = {
    disposal_number: 'จน.01/2568',
    asset_id: 7, // เครื่องถ่ายเอกสาร Fuji Xerox
    disposal_method: 'auction', // ขายทอดตลาด
    disposal_date: '2025-09-28',
    approved_order_no: 'คำสั่งเทศบาลตำบลสุขเกษมพัฒนา ที่ 145/2568 ลงวันที่ 20 ก.ย. 2568',
    approved_by: 'นายสมศักดิ์ วัฒนากูล (นายกเทศมนตรี)',
    sale_proceeds: 3500.0,
    transfer_to: 'ผู้ประมูลได้: นายมานพ ค้าของเก่า',
    notes: 'ดำเนินการประมูลขายทอดตลาดตามระเบียบพัสดุฯ นำเงินเข้าเป็นรายได้เทศบาล'
  };

  const insertDisposal = db.prepare(`
    INSERT INTO disposals (disposal_number, asset_id, disposal_method, disposal_date, approved_order_no, approved_by, sale_proceeds, transfer_to, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertDisposal.run(
    disposal.disposal_number, disposal.asset_id, disposal.disposal_method,
    disposal.disposal_date, disposal.approved_order_no, disposal.approved_by,
    disposal.sale_proceeds, disposal.transfer_to, disposal.notes
  );

  // Audit Logs (Security Audit Trail)
  const auditLogs = [
    { action: 'LOGIN', module: 'AUTH', entity_id: null, actor_name: 'นางสาวนิตยา พัสดุเจริญ', actor_role: 'เจ้าหน้าที่พัสดุกลาง', details: 'เข้าสู่ระบบจาก IP 192.168.1.45' },
    { action: 'CREATE', module: 'ASSETS', entity_id: 8, actor_name: 'นางสาวนิตยา พัสดุเจริญ', actor_role: 'เจ้าหน้าที่พัสดุกลาง', details: 'ลงทะเบียนครุภัณฑ์ใหม่: กล้องดิจิทัล Mirrorless รหัส ค.09/2569/001' },
    { action: 'CREATE', module: 'REQUISITION', entity_id: 2, actor_name: 'นายกานต์ สิทธิชัย', actor_role: 'เจ้าหน้าที่สำนักปลัด', details: 'สร้างใบเบิกพัสดุ บบ.02/2569 (กระดาษ A4, แฟ้ม)' },
    { action: 'APPROVE', module: 'REQUISITION', entity_id: 3, actor_name: 'ดร.อรทัย รักสะอาด', actor_role: 'หัวหน้ากองสาธารณสุข', details: 'อนุมัติใบเบิกพัสดุ บบ.03/2569 สำหรับกิจกรรม Big Cleaning' },
    { action: 'DISPENSE', module: 'INVENTORY', entity_id: 1, actor_name: 'นางสาวนิตยา พัสดุเจริญ', actor_role: 'เจ้าหน้าที่พัสดุกลาง', details: 'จ่ายพัสดุตามใบเบิก บบ.01/2569 ตัดสต็อกกระดาษ A4 10 รีม (FIFO)' },
    { action: 'CREATE', module: 'MAINTENANCE', entity_id: 1, actor_name: 'นายสายชล แดงดี', actor_role: 'พนักงานขับเครื่องจักรกล', details: 'แจ้งซ่อมเครื่องตัดหญ้า ค.05/2568/001 ใบมีดบิ่น' },
    { action: 'AUDIT_CHECK', module: 'AUDIT', entity_id: 1, actor_name: 'นางพิมพา จิตตรง', actor_role: 'ประธานกรรมการตรวจสอบ', details: 'ตรวจนับพัสดุประจำปีงบประมาณ 2568 เสร็จสมบูรณ์' }
  ];

  const insertAuditLog = db.prepare(`
    INSERT INTO audit_logs (action, module, entity_id, actor_name, actor_role, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const log of auditLogs) {
    insertAuditLog.run(log.action, log.module, log.entity_id, log.actor_name, log.actor_role, log.details);
  }

  console.log('Seeding completed successfully!');
}

export const resetToDemoData = () => seedData(true);

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedData();
}

