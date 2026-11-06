import { formatBaht, formatThaiDate } from './formatters.js';
import { GARUDA_BASE64 } from './garudaBase64.js';

/**
 * Official Royal Thai Garuda Emblem (ตราครุฑพ่าห์ มาตรฐานงานสารบรรณของแท้)
 */
export function getGarudaSVG(height = 55) {
  return `
    <div style="text-align: center; margin: 0 auto;">
      <img src="${GARUDA_BASE64}" alt="ตราครุฑ" style="height: ${height}px; width: auto; max-width: 100%; display: inline-block; object-fit: contain; vertical-align: middle;" />
    </div>
  `;
}

/**
 * Official Government Document Header with mathematically centered Garuda emblem
 * ตราครุฑกึ่งกลางหน้ากระดาษ ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ
 */
export function renderGovHeader(orgName, formCode, garudaHeight = 55) {
  return `
    <div class="gov-header">
      <div class="gov-header-left">
        ส่วนราชการ: <strong>${orgName || 'เทศบาลตำบลสุขเกษมพัฒนา'}</strong>
      </div>
      <div class="gov-header-center">
        ${getGarudaSVG(garudaHeight)}
      </div>
      <div class="gov-header-right">
        ${formCode || ''}
      </div>
    </div>
  `;
}

/**
 * Official Government Signature Column item with spaced layout and pen clearance
 */
export function renderSignatureItem(name, title, date = 'วันที่ ....../....../...........', penGap = null) {
  let cleanName = (name || '').trim();

  // Strip wrapping parentheses if already present
  if (cleanName.startsWith('(') && cleanName.endsWith(')')) {
    cleanName = cleanName.slice(1, -1).trim();
  }
  // Strip duplicate trailing position inside parentheses e.g. "นายสมศักดิ์ วัฒนากูล (นายกเทศมนตรี)" -> "นายสมศักดิ์ วัฒนากูล"
  cleanName = cleanName.replace(/\s*\([^)]*\)$/, '').trim();

  let displayName;
  if (!cleanName || cleanName.includes('.....')) {
    displayName = '( ................................................... )';
  } else {
    displayName = `( ${cleanName} )`;
  }

  const lineStyle = penGap ? `style="margin-bottom: ${penGap};"` : '';

  return `
    <div class="sig-col">
      <div class="sig-line" ${lineStyle}>ลงชื่อ <span class="sig-dots">...................................................</span></div>
      <div class="sig-name">${displayName}</div>
      <div class="sig-title">${title || '-'}</div>
      <div class="sig-date">${date}</div>
    </div>
  `;
}

export function openPrintWindow(htmlContent, title = 'พิมพ์เอกสารราชการ') {
  const win = window.open('', '_blank', 'width=950,height=1000');
  if (!win) {
    alert('กรุณาอนุญาตป๊อปอัป (Pop-up) เพื่อพิมพ์เอกสารราชการ');
    return;
  }
  win.document.write(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="utf-8">
      <base href="${window.location.origin}/">
      <title>${title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; }
        @page {
          size: A4 portrait;
          margin: 15mm 20mm 15mm 20mm;
        }
        body {
          font-family: 'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', 'Leelawadee', sans-serif;
          margin: 0;
          padding: 8mm 16mm;
          font-size: 13.5px;
          color: #000;
          background: #fff;
          line-height: 1.4;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          margin-bottom: 12px;
        }
        th, td {
          border: 1px solid #000;
          padding: 5px 8px;
          font-size: 13px;
        }
        th {
          background-color: #f8fafc;
          font-weight: bold;
          text-align: center;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .header-title {
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          margin-top: 6px;
          margin-bottom: 3px;
        }
        .header-sub {
          font-size: 13.5px;
          text-align: center;
          margin-bottom: 12px;
          color: #1e293b;
        }
        .grid-2 {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        /* Official Government Header with mathematically centered Garuda */
        .gov-header {
          position: relative;
          text-align: center;
          margin-bottom: 14px;
          min-height: 60px;
        }
        .gov-header-left {
          position: absolute;
          left: 0;
          top: 0;
          font-size: 13px;
          color: #334155;
          text-align: left;
          max-width: 38%;
          line-height: 1.35;
        }
        .gov-header-center {
          display: inline-block;
          margin: 0 auto;
          text-align: center;
        }
        .gov-header-right {
          position: absolute;
          right: 0;
          top: 0;
          font-size: 13.5px;
          font-weight: bold;
          text-align: right;
          max-width: 38%;
          line-height: 1.35;
        }
        /* Single Page Document Container - Anchors signatures at the bottom of the A4 page without spilling */
        .single-page-wrapper {
          min-height: 250mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
        }
        .doc-body {
          flex: 0 0 auto;
        }
        .doc-signatures {
          margin-top: auto;
          padding-top: 25px;
          page-break-inside: avoid;
        }
        /* Official Signatures Grid */
        .sig-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          text-align: center;
          margin-top: 24px;
          page-break-inside: avoid;
        }
        .sig-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          text-align: center;
          margin-top: 24px;
          page-break-inside: avoid;
        }
        .sig-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 48px;
          text-align: center;
          margin-top: 24px;
          page-break-inside: avoid;
        }
        .sig-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 0 4px;
          box-sizing: border-box;
        }
        .sig-line {
          font-size: 13px;
          white-space: nowrap;
          margin-bottom: 24px; /* เว้นที่ว่าง 24px ชิดชื่อด้านล่างอย่างสมดุลตามมาตรฐานเอกสารราชการ */
        }
        .sig-dots {
          letter-spacing: 0.5px;
        }
        .sig-name {
          font-size: 13px;
          font-weight: 500;
          line-height: 1.4;
          margin-bottom: 3px;
          word-break: break-word;
          max-width: 100%;
        }
        .sig-title {
          font-size: 12px;
          color: #1e293b;
          line-height: 1.35;
          margin-bottom: 3px;
        }
        .sig-date {
          font-size: 11.5px;
          color: #475569;
          line-height: 1.3;
        }
        .sig-tier-gap {
          margin-top: 50px !important; /* ระยะห่างระหว่างชั้นผู้ลงนาม เช่น ผู้ส่งมอบ/รับมอบ กับ ปลัด/นายกเทศมนตรี */
        }
        /* Backward compatibility */
        .signature-box {
          margin-top: 25px;
          display: flex;
          justify-content: space-between;
          text-align: center;
          page-break-inside: avoid;
        }
        .sig-col-4 {
          width: 24%;
        }
        @media print {
          body {
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print { display: none !important; }
          button { display: none !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          .single-page-wrapper {
            height: 252mm !important;
            min-height: 252mm !important;
            max-height: 254mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            box-sizing: border-box !important;
          }
          .doc-signatures {
            margin-top: auto !important;
            page-break-inside: avoid !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 16px; padding: 10px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 13px; color: #475569;">
          🏛️ <strong>แบบฟอร์มมาตรฐานราชการ</strong> (ระเบียบสำนักนายกรัฐมนตรีฯ และ ระเบียบพัสดุฯ 2560)
        </div>
        <div>
          <button onclick="window.print()" style="padding: 7px 18px; background: #0f172a; color: white; border: none; border-radius: 6px; cursor: pointer; font-family: Sarabun, sans-serif; font-size: 13px; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">🖨️ สั่งพิมพ์เอกสาร / บันทึกเป็น PDF</button>
          <button onclick="window.close()" style="padding: 7px 14px; background: #e2e8f0; color: #334155; border: none; border-radius: 6px; cursor: pointer; font-family: Sarabun, sans-serif; font-size: 13px; font-weight: 600; margin-left: 8px;">ปิดหน้านี้</button>
        </div>
      </div>
      ${htmlContent}
    </body>
    </html>
  `);
  win.document.close();
}

/**
 * แบบ สท.1 (ทะเบียนคุมทรัพย์สิน) - ตามระเบียบกรมบัญชีกลาง
 */
export function generateST1HTML(asset, settings, depData) {
  const orgName = settings.org_name || 'เทศบาลตำบลสุขเกษมพัฒนา';
  const scheduleRows = depData?.schedule?.map(row => `
    <tr>
      <td class="text-center">${row.yearIndex}</td>
      <td class="text-center">${row.fiscalYear}</td>
      <td class="text-center">${row.daysCount}</td>
      <td class="text-right">${row.depreciationAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
      <td class="text-right">${row.accumulatedDepreciation.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
      <td class="text-right font-bold">${row.bookValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
      <td class="text-center">${row.isFullyDepreciated ? 'ครบอายุใช้งาน (มูลค่าซาก)' : '-'}</td>
    </tr>
  `).join('') || '';

  const scheduleCount = depData?.schedule?.length || 0;
  const isShortTable = scheduleCount <= 5;

  const content = `
    <div class="doc-body">
      ${renderGovHeader(orgName, 'แบบ สท.1', 58)}
      <div class="header-title">ทะเบียนคุมทรัพย์สิน (ครุภัณฑ์)</div>
      <div class="header-sub">ตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 และหลักเกณฑ์กรมบัญชีกลาง</div>

      <table style="border: none; margin-bottom: 10px; margin-top: 10px;">
        <tr style="border: none;">
          <td style="border: none; width: ${asset.photo_url ? '45%' : '55%'}; padding: 3px 0; vertical-align: top;">
            <div><strong>รหัสครุภัณฑ์:</strong> <span style="font-family: monospace; font-weight: bold; font-size: 15px; color: #1e3a8a;">${asset.asset_code}</span></div>
            <div style="margin-top: 2px;"><strong>ชื่อครุภัณฑ์:</strong> <strong>${asset.name}</strong></div>
            <div style="margin-top: 2px;"><strong>ประเภท/หมวดหมู่:</strong> ${asset.category_name || '-'}</div>
            <div style="margin-top: 2px;"><strong>ยี่ห้อ/รุ่น/แบบ:</strong> ${asset.brand || '-'} รุ่น ${asset.model || '-'}</div>
            <div style="margin-top: 2px;"><strong>หมายเลขเครื่อง (Serial No.):</strong> <span style="font-family: monospace;">${asset.serial_number || '-'}</span></div>
            <div style="margin-top: 2px;"><strong>สถานที่ตั้ง/ห้อง:</strong> ${asset.location_room || '-'}</div>
            ${asset.deed_number ? `<div style="margin-top: 2px;"><strong>เอกสารสิทธิ์/เลขที่โฉนด:</strong> ${asset.deed_number}</div>` : ''}
            ${asset.land_area ? `<div style="margin-top: 2px;"><strong>เนื้อที่/ขนาด:</strong> ${asset.land_area}</div>` : ''}
            ${asset.gps_location ? `<div style="margin-top: 2px;"><strong>พิกัด GPS/แผนที่:</strong> ${asset.gps_location}</div>` : ''}
          </td>
          <td style="border: none; width: ${asset.photo_url ? '35%' : '45%'}; vertical-align: top; padding: 3px 0;">
            <div><strong>สำนัก/กองที่ครอบครอง:</strong> ${asset.department_name || '-'}</div>
            <div style="margin-top: 2px;"><strong>ผู้รับผิดชอบดูแล:</strong> ${asset.custodian_name || '-'}</div>
            <div style="margin-top: 2px;"><strong>วันที่ตรวจรับ:</strong> ${formatThaiDate(asset.acquired_date)}</div>
            <div style="margin-top: 2px;"><strong>ปีงบประมาณ:</strong> พ.ศ. ${asset.fiscal_year}</div>
            <div style="margin-top: 2px;"><strong>แหล่งเงินงบประมาณ:</strong> ${asset.budget_source || 'เงินงบประมาณเทศบาล'}</div>
            <div style="margin-top: 2px;"><strong>ผู้ขาย/ผู้รับจ้าง:</strong> ${asset.vendor || '-'} ${asset.vendor_phone ? `(โทร. ${asset.vendor_phone})` : ''}</div>
            <div style="margin-top: 2px;"><strong>เลขที่สัญญา/ใบสั่งซื้อ:</strong> ${asset.contract_number || '-'}</div>
            ${asset.document_name ? `<div style="margin-top: 2px;"><strong>เอกสารแนบ:</strong> ${asset.document_name}</div>` : ''}
          </td>
          ${asset.photo_url ? `
          <td style="border: none; width: 20%; text-align: center; vertical-align: top; padding: 3px 0;">
            <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px; background: #f8fafc; display: inline-block;">
              <img src="${asset.photo_url}" alt="${asset.name}" style="max-width: 110px; max-height: 110px; object-fit: contain; border-radius: 4px;" />
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">ภาพถ่ายทรัพย์สินจริง</div>
            </div>
          </td>
          ` : ''}
        </tr>
      </table>

      <div style="background: #f8fafc; padding: 8px 12px; border: 1px solid #cbd5e1; margin-bottom: 10px; font-size: 13.5px;">
        <div style="display: flex; justify-content: space-between;">
          <span><strong>ราคาทุนจัดซื้อ:</strong> ${formatBaht(asset.cost_price)}</span>
          <span><strong>อายุการใช้งาน:</strong> ${asset.useful_life_years} ปี</span>
          <span><strong>อัตราค่าเสื่อมราคา:</strong> ${depData?.annualRate || 20}% ต่อปี</span>
          <span><strong>มูลค่าซากคงเหลือ:</strong> ${formatBaht(asset.salvage_value || 1)}</span>
        </div>
      </div>

      <div class="font-bold" style="margin-top: 10px; margin-bottom: 4px; font-size: 13.5px;">ตารางคำนวณค่าเสื่อมราคาประจำปี (วิธีเส้นตรง กรมบัญชีกลาง):</div>
      <table>
        <thead>
          <tr>
            <th style="width: 8%;">ลำดับที่</th>
            <th style="width: 12%;">ปีงบประมาณ</th>
            <th style="width: 12%;">จำนวนวัน</th>
            <th style="width: 20%;">ค่าเสื่อมราคาประจำปี (บาท)</th>
            <th style="width: 20%;">ค่าเสื่อมราคาสะสม (บาท)</th>
            <th style="width: 18%;">มูลค่าสุทธิตามบัญชี (บาท)</th>
            <th style="width: 10%;">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          ${scheduleRows || '<tr><td colspan="7" class="text-center" style="padding: 15px;">ไม่มีข้อมูล</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="doc-signatures" style="margin-top: ${isShortTable ? '65px' : '30px'};">
      <!-- Official 4-tier Municipal Signature Block -->
      <div class="sig-grid-4">
        ${renderSignatureItem(asset.custodian_name, 'ผู้ครอบครองดูแลทรัพย์สิน')}
        ${renderSignatureItem(settings.supply_officer_name, 'เจ้าหน้าที่พัสดุผู้จัดทำ')}
        ${renderSignatureItem(settings.clerk_name, 'ปลัดเทศบาล / หัวหน้าพัสดุ')}
        ${renderSignatureItem(settings.mayor_name, 'นายกเทศมนตรี / สั่งการ')}
      </div>
    </div>
  `;

  return isShortTable ? `<div class="single-page-wrapper">${content}</div>` : content;
}

/**
 * แบบ พด.1 (ใบเบิกพัสดุราชการ) - ตามระเบียบกระทรวงการคลังฯ พ.ศ. 2560
 * ลายเซ็นอยู่ด้านล่างสุดของหน้า A4 พอดี 1 หน้า ไม่ลอยชิดบน
 */
export function generatePD1HTML(req, settings) {
  const orgName = settings.org_name || 'เทศบาลตำบลสุขเกษมพัฒนา';
  const rawItems = req.items || [];
  const filledItems = [...rawItems];
  
  while (filledItems.length < 4) {
    filledItems.push({ isBlank: true });
  }

  const itemRows = filledItems.map((item, idx) => {
    if (item.isBlank) {
      return `
        <tr>
          <td class="text-center" style="color: #cbd5e1; height: 26px;">-</td>
          <td class="text-center" style="color: #cbd5e1;">-</td>
          <td style="color: #cbd5e1;">-</td>
          <td class="text-center" style="color: #cbd5e1;">-</td>
          <td class="text-center" style="color: #cbd5e1;">-</td>
          <td class="text-center" style="color: #cbd5e1;">-</td>
          <td class="text-center" style="color: #cbd5e1;">-</td>
          <td class="text-center" style="color: #cbd5e1;">-</td>
          <td class="text-center" style="color: #cbd5e1;">-</td>
        </tr>
      `;
    }
    return `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="text-center font-mono">${item.item_code}</td>
        <td>${item.item_name}</td>
        <td class="text-center">${item.unit}</td>
        <td class="text-center font-bold">${item.requested_qty}</td>
        <td class="text-center">${item.approved_qty ?? item.requested_qty}</td>
        <td class="text-center">${item.dispensed_qty ?? '-'}</td>
        <td class="text-right">${item.unit_cost_at_dispense ? item.unit_cost_at_dispense.toFixed(2) : '-'}</td>
        <td class="text-center">${req.status === 'dispensed' ? 'จ่ายแล้ว' : '-'}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="single-page-wrapper">
      <div class="doc-body">
        ${renderGovHeader(orgName, 'แบบ พด.1', 55)}
        <div class="header-title">ใบเบิกพัสดุ / วัสดุสำนักงาน</div>
        <div class="header-sub">ตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560</div>

        <div class="grid-2" style="margin-top: 14px;">
          <div><strong>เลขที่ใบเบิก:</strong> <span style="font-family: monospace; font-weight: bold; font-size: 14px;">${req.req_number}</span></div>
          <div><strong>วันที่ขอเบิก:</strong> ${formatThaiDate(req.requested_date)}</div>
        </div>
        <div class="grid-2">
          <div><strong>สำนัก/กองที่ขอเบิก:</strong> ${req.department_name || '-'}</div>
          <div><strong>ชื่อผู้ขอเบิก:</strong> ${req.requester_name} (${req.requester_position || 'เจ้าหน้าที่'})</div>
        </div>
        <div style="margin-bottom: 12px;">
          <strong>วัตถุประสงค์ในการขอเบิก:</strong> ${req.purpose}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 5%;">ที่</th>
              <th style="width: 14%;">รหัสพัสดุ</th>
              <th style="width: 33%;">รายการพัสดุ</th>
              <th style="width: 8%;">หน่วย</th>
              <th style="width: 10%;">จำนวนขอ</th>
              <th style="width: 10%;">จำนวนอนุมัติ</th>
              <th style="width: 10%;">จำนวนจ่าย</th>
              <th style="width: 10%;">ราคา/หน่วย</th>
              <th style="width: 10%;">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <div style="margin-top: 14px; margin-bottom: 14px; font-size: 13px; background: #f8fafc; padding: 10px 14px; border: 1.2px solid #cbd5e1; border-radius: 4px; min-height: 50px; line-height: 1.5;">
          <strong>ความเห็น/คำสั่งหัวหน้าฝ่าย/ผู้อำนวยการกอง:</strong> ${req.approval_comment || 'เห็นชอบ อนุมัติให้เบิกจ่ายได้ตามระเบียบพัสดุ'}
        </div>
      </div>

      <div class="doc-signatures" style="margin-top: 55px;">
        <!-- Official 4-tier Municipal Signature Block for Store Issue Voucher -->
        <div class="sig-grid-4">
          ${renderSignatureItem(req.requester_name, 'ผู้ขอเบิกพัสดุ', `วันที่ ${formatThaiDate(req.requested_date)}`)}
          ${renderSignatureItem(req.approver_name, 'ผู้อนุมัติ (หัวหน้าสำนัก/กอง)', `วันที่ ${req.approved_date ? formatThaiDate(req.approved_date) : '....../....../...........'}`)}
          ${renderSignatureItem(req.dispenser_name || settings.supply_officer_name, 'เจ้าหน้าที่พัสดุผู้จ่ายของ', `วันที่ ${req.dispensed_date ? formatThaiDate(req.dispensed_date) : '....../....../...........'}`)}
          ${renderSignatureItem(req.requester_name, 'ผู้รับพัสดุถูกต้องครบถ้วน', `วันที่ ${req.dispensed_date ? formatThaiDate(req.dispensed_date) : '....../....../...........'}`)}
        </div>
      </div>
    </div>
  `;
}

/**
 * สติกเกอร์ QR Code ครุภัณฑ์ (สำหรับติดตัวทรัพย์สิน)
 */
export function generateQrStickerHTML(asset, settings, qrDataUrl) {
  const orgName = settings.org_name || 'เทศบาลตำบลสุขเกษมพัฒนา';
  const logoElement = settings.org_logo 
    ? `<img src="${settings.org_logo}" style="height: 18px; max-width: 28px; object-fit: contain; vertical-align: middle; margin-right: 4px;" />`
    : '🏛️ ';

  return `
    <div style="width: 85mm; height: 50mm; border: 2px solid #000; border-radius: 6px; padding: 3mm; display: flex; flex-direction: column; justify-content: space-between; page-break-inside: avoid; margin: 5px auto; background: #fff;">
      <div style="text-align: center; border-bottom: 1.5px solid #000; padding-bottom: 2px;">
        <div style="font-size: 13px; font-weight: bold; line-height: 1.2; display: flex; align-items: center; justify-content: center;">
          ${logoElement}<span>${orgName}</span>
        </div>
        <div style="font-size: 11px; color: #333;">ทะเบียนครุภัณฑ์ทางราชการ</div>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 2mm 0;">
        <div style="width: 60%; font-size: 11px; line-height: 1.3;">
          <div style="font-size: 13px; font-weight: bold; color: #000;">${asset.asset_code}</div>
          <div style="font-weight: 600; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${asset.name}</div>
          <div>กอง: ${asset.department_name || '-'}</div>
          <div>ผู้ดูแล: ${asset.custodian_name || '-'}</div>
          <div>ตรวจรับ: ${formatThaiDate(asset.acquired_date)}</div>
        </div>
        <div style="width: 38%; text-align: center;">
          <img src="${qrDataUrl}" style="width: 28mm; height: 28mm; display: block; margin: 0 auto;" />
          <div style="font-size: 8px; color: #555; margin-top: 1px;">สแกนตรวจสอบพัสดุ</div>
        </div>
      </div>
      <div style="font-size: 9px; text-align: center; border-top: 1px dashed #666; padding-top: 2px; color: #444;">
        * ห้ามแกะ ทำลาย หรือเคลื่อนย้ายโดยไม่ได้รับอนุญาต *
      </div>
    </div>
  `;
}

/**
 * แผ่นสติกเกอร์ QR Code ครุภัณฑ์ A4 สำหรับพิมพ์พร้อมกันยกชุด (Batch Sticker Sheet)
 */
export function generateBatchQrStickersHTML(items, settings) {
  const orgName = settings.org_name || 'เทศบาลตำบลสุขเกษมพัฒนา';
  const logoElement = settings.org_logo 
    ? `<img src="${settings.org_logo}" style="height: 16px; max-width: 24px; object-fit: contain; vertical-align: middle; margin-right: 3px;" />`
    : '🏛️ ';

  const stickerBoxes = items.map(({ asset, qrDataUrl }) => `
    <div style="width: 90mm; height: 52mm; border: 1.5px dashed #444; border-radius: 6px; padding: 3mm; display: flex; flex-direction: column; justify-content: space-between; page-break-inside: avoid; background: #fff; box-sizing: border-box;">
      <div style="text-align: center; border-bottom: 1.2px solid #000; padding-bottom: 2px;">
        <div style="font-size: 12px; font-weight: bold; line-height: 1.1; display: flex; align-items: center; justify-content: center;">
          ${logoElement}<span>${orgName}</span>
        </div>
        <div style="font-size: 10px; color: #444;">ทะเบียนครุภัณฑ์ทางราชการ</div>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 2mm 0;">
        <div style="width: 62%; font-size: 11px; line-height: 1.3;">
          <div style="font-size: 13px; font-weight: bold; font-family: monospace; color: #000;">${asset.asset_code}</div>
          <div style="font-weight: 600; font-size: 11px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${asset.name}</div>
          <div style="font-size: 10px; color: #333;">กอง: ${asset.department_name || '-'}</div>
          <div style="font-size: 10px; color: #555;">ตรวจรับ: ${formatThaiDate(asset.acquired_date)}</div>
        </div>
        <div style="width: 35%; text-align: center;">
          <img src="${qrDataUrl}" style="width: 27mm; height: 27mm; display: block; margin: 0 auto;" />
          <div style="font-size: 8px; color: #666; margin-top: 1px;">สแกนตรวจนับ</div>
        </div>
      </div>
      <div style="font-size: 8px; text-align: center; border-top: 1px dotted #888; padding-top: 2px; color: #555;">
        * ห้ามแกะ ทำลาย หรือเคลื่อนย้ายโดยไม่ได้รับอนุญาต *
      </div>
    </div>
  `).join('');

  return `
    <style>
      @page {
        size: A4 portrait;
        margin: 8mm 6mm;
      }
      .sticker-grid {
        display: grid;
        grid-template-columns: repeat(2, 92mm);
        gap: 6mm 8mm;
        justify-content: center;
      }
    </style>
    <div class="no-print" style="margin-bottom: 12px; padding: 8px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 12px;">
      💡 <strong>คำแนะนำในการพิมพ์:</strong> ใช้กระดาษสติกเกอร์ขนาด A4 สั่งพิมพ์แล้วสามารถตัดตามรอยประนำไปแปะติดตัวครุภัณฑ์ได้ทันที (รวม ${items.length} ดวง)
    </div>
    <div class="sticker-grid">
      ${stickerBoxes}
    </div>
  `;
}

/**
 * ใบยืม - คืน ครุภัณฑ์และพัสดุทางราชการ (ตามระเบียบกระทรวงการคลังฯ พ.ศ. 2560 ข้อ 208)
 * วางลายเซ็นตรึงไว้ด้านล่างของหน้า A4 พอดี 1 หน้า ไม่ลอยชิดบน และไม่ล้นหน้า 2
 */
export function generateBorrowVoucherHTML(borrow, settings) {
  const orgName = settings.org_name || 'เทศบาลตำบลสุขเกษมพัฒนา';
  const isReturned = borrow.status === 'returned';

  return `
    <div class="single-page-wrapper">
      <div class="doc-body">
        ${renderGovHeader(orgName, 'แบบใบยืมพัสดุราชการ', 55)}
        <div class="header-title">ใบยืม - คืน ครุภัณฑ์และพัสดุทางราชการ</div>
        <div class="header-sub">ตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 207 - 210</div>

        <table style="border: none; margin-bottom: 10px; margin-top: 10px;">
          <tr style="border: none;">
            <td style="border: none; width: 55%; padding: 3px 0;">
              <div><strong>เลขที่ใบยืม:</strong> <span style="font-family: monospace; font-weight: bold; font-size: 14px;">${borrow.borrow_code}</span></div>
              <div style="margin-top: 2px;"><strong>ชื่อผู้ขอยืม:</strong> <strong>${borrow.borrower_name}</strong></div>
              <div style="margin-top: 2px;"><strong>ตำแหน่ง:</strong> ${borrow.borrower_position || '-'}</div>
              <div style="margin-top: 2px;"><strong>สำนัก/กอง/หน่วยงาน:</strong> ${borrow.borrower_department || '-'}</div>
              <div style="margin-top: 2px;"><strong>เบอร์โทรศัพท์ติดต่อ:</strong> ${borrow.borrower_phone || '-'}</div>
            </td>
            <td style="border: none; width: 45%; vertical-align: top; padding: 3px 0;">
              <div><strong>วันที่ยืม:</strong> ${formatThaiDate(borrow.borrow_date)}</div>
              <div style="margin-top: 2px;"><strong>กำหนดส่งคืน:</strong> ${formatThaiDate(borrow.expected_return_date)}</div>
              <div style="margin-top: 2px;"><strong>สถานะปัจจุบัน:</strong> <span style="font-weight: bold; color: ${isReturned ? '#059669' : '#d97706'};">${isReturned ? 'ส่งคืนเรียบร้อยแล้ว' : 'อยู่ระหว่างการยืม'}</span></div>
              <div style="margin-top: 2px;"><strong>วันที่ส่งคืนจริง:</strong> ${borrow.actual_return_date ? formatThaiDate(borrow.actual_return_date) : '-'}</div>
            </td>
          </tr>
        </table>

        <div style="background: #f8fafc; border: 1.2px solid #cbd5e1; border-radius: 6px; padding: 8px 14px; margin-bottom: 10px;">
          <div style="font-weight: bold; margin-bottom: 2px;">วัตถุประสงค์และความจำเป็นในการขอยืม:</div>
          <div style="font-size: 13px; color: #1e293b; line-height: 1.45;">${borrow.purpose}</div>
        </div>

        <div class="font-bold" style="margin-bottom: 4px; font-size: 13.5px;">รายการครุภัณฑ์และพัสดุที่ขอยืม:</div>
        <table>
          <thead>
            <tr>
              <th style="width: 8%;">ที่</th>
              <th style="width: 25%;">รหัสครุภัณฑ์</th>
              <th style="width: 35%;">ชื่อรายการครุภัณฑ์</th>
              <th style="width: 17%;">ยี่ห้อ / รุ่น</th>
              <th style="width: 15%;">หมายเลขเครื่อง (S/N)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-center">1</td>
              <td class="text-center font-bold" style="font-family: monospace; color: #1e3a8a;">${borrow.asset_code}</td>
              <td><strong>${borrow.asset_name}</strong></td>
              <td>${borrow.brand || '-'} ${borrow.model ? 'รุ่น ' + borrow.model : ''}</td>
              <td class="text-center" style="font-family: monospace;">${borrow.serial_number || '-'}</td>
            </tr>
          </tbody>
        </table>

        <div style="font-size: 11.5px; margin-top: 8px; line-height: 1.5; color: #334155; background: #fffbeb; border: 1px solid #fef3c7; padding: 6px 12px; border-radius: 4px;">
          <strong>ข้อตกลงและเงื่อนไขการยืมพัสดุหลวง (ระเบียบฯ ข้อ 208):</strong>
          1. ผู้ยืมต้องนำพัสดุไปใช้เพื่อประโยชน์ในทางราชการตามวัตถุประสงค์ที่ระบุไว้เท่านั้น ห้ามนำไปใช้ประโยชน์ส่วนตัวโดยเด็ดขาด |
          2. ผู้ยืมสัญญาว่าจะบำรุงรักษาพัสดุให้อยู่ในสภาพใช้งานได้ดี และจะนำมาส่งคืนพัสดุภายในกำหนดเวลา หากชำรุดเสียหายหรือสูญหาย ยินดีรับผิดชอบชดใช้ค่าเสียหายตามระเบียบกระทรวงการคลังฯ
        </div>
      </div>

      <div class="doc-signatures" style="margin-top: 55px;">
        <div class="sig-grid-3">
          ${renderSignatureItem(borrow.borrower_name, 'ผู้ยืมพัสดุหลวง', `วันที่ ${formatThaiDate(borrow.borrow_date)}`)}
          ${renderSignatureItem(settings.supply_officer_name, 'เจ้าหน้าที่พัสดุผู้จ่ายของ', `วันที่ ${formatThaiDate(borrow.borrow_date)}`)}
          ${renderSignatureItem(settings.clerk_name, 'ปลัดเทศบาล / ผู้อนุมัติให้ยืม')}
        </div>

        <div style="margin-top: 25px; border-top: 1.5px dashed #475569; padding-top: 12px; page-break-inside: avoid;">
          <div style="font-weight: bold; font-size: 12.5px; color: ${isReturned ? '#047857' : '#334155'};">
            หลักฐานการรับคืนพัสดุทางราชการ:
          </div>
          <div style="font-size: 12px; margin-top: 4px; line-height: 1.5; color: #334155;">
            ${isReturned ? `
              ตรวจรับคืนเมื่อวันที่: <strong>${formatThaiDate(borrow.actual_return_date)}</strong> | 
              สภาพพัสดุ ณ วันรับคืน: <strong>${borrow.return_condition === 'normal' ? 'เรียบร้อยสมบูรณ์ปกติ' : borrow.return_condition === 'damaged' ? 'ชำรุดเสียหาย' : 'สูญหาย'}</strong> |
              บันทึกเพิ่มเติม: ${borrow.notes || 'ตรวจรับคืนเรียบร้อย ครบถ้วนตามสภาพ'}
            ` : `
              ตรวจรับคืนเมื่อวันที่: ........................................................... | 
              สภาพพัสดุ ณ วันรับคืน: [ &nbsp; ] เรียบร้อยสมบูรณ์ปกติ &nbsp;&nbsp; [ &nbsp; ] ชำรุดเสียหาย &nbsp;&nbsp; [ &nbsp; ] สูญหาย |
              บันทึกเพิ่มเติม: ............................................................................................................
            `}
          </div>
          <div style="display: flex; justify-content: flex-end; margin-top: 35px;">
            <div style="width: 270px;">
              ${renderSignatureItem(
                isReturned ? settings.supply_officer_name : '',
                'เจ้าหน้าที่พัสดุผู้ตรวจรับคืน',
                isReturned ? `วันที่ ${formatThaiDate(borrow.actual_return_date)}` : 'วันที่ ....../....../...........'
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * ใบส่งมอบ - รับมอบ ทรัพย์สินและครุภัณฑ์ทางราชการ (การโอนย้ายระหว่างสำนัก/กอง ตามระเบียบฯ ข้อ 211)
 */
export function generateTransferVoucherHTML(transfer, settings) {
  const orgName = settings.org_name || 'เทศบาลตำบลสุขเกษมพัฒนา';
  return `
    <div class="single-page-wrapper">
      <div class="doc-body">
        ${renderGovHeader(orgName, 'แบบใบส่งมอบ-รับมอบพัสดุ', 55)}
        <div class="header-title">ใบส่งมอบ - รับมอบ ทรัพย์สินทางราชการ</div>
        <div class="header-sub">ตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 211</div>

        <div class="grid-2" style="margin-top: 14px;">
          <div><strong>เลขที่ใบโอนย้าย:</strong> <span style="font-family: monospace; font-weight: bold; font-size: 14px;">${transfer.transfer_number}</span></div>
          <div><strong>วันที่โอนส่งมอบ:</strong> ${formatThaiDate(transfer.transfer_date)}</div>
        </div>

        <div style="background: #f1f5f9; padding: 10px 14px; border: 1.2px solid #cbd5e1; border-radius: 6px; margin-bottom: 12px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between;">
            <div><strong>หน่วยงานเดิม (ผู้ส่งมอบ):</strong> ${transfer.from_department_name}</div>
            <div><strong>หน่วยงานใหม่ (ผู้รับมอบ):</strong> ${transfer.to_department_name}</div>
          </div>
          <div style="margin-top: 4px;"><strong>เหตุผลความจำเป็นในการโอนย้าย:</strong> ${transfer.reason}</div>
        </div>

        <div class="font-bold" style="margin-bottom: 6px; font-size: 13.5px;">รายละเอียดทรัพย์สินที่โอนย้าย:</div>
        <table>
          <thead>
            <tr>
              <th style="width: 8%;">ที่</th>
              <th style="width: 22%;">รหัสครุภัณฑ์</th>
              <th style="width: 32%;">ชื่อครุภัณฑ์ / ยี่ห้อ - รุ่น</th>
              <th style="width: 18%;">ราคาทุนจัดซื้อ (บาท)</th>
              <th style="width: 20%;">สถานที่ตั้งใหม่ & ผู้ดูแลใหม่</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-center">1</td>
              <td class="text-center font-bold" style="font-family: monospace; color: #1e3a8a;">${transfer.asset_code}</td>
              <td>
                <div style="font-weight: bold;">${transfer.asset_name}</div>
                <div style="font-size: 11px; color: #555;">${transfer.brand || '-'} ${transfer.model || ''}</div>
              </td>
              <td class="text-right font-medium">${formatBaht(transfer.cost_price)}</td>
              <td>
                <div>ห้อง: ${transfer.new_location_room || '-'}</div>
                <div style="font-size: 11px; color: #555;">ผู้ดูแล: ${transfer.new_custodian_name || '-'}</div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style="font-size: 12px; margin-top: 10px; color: #475569; line-height: 1.5;">
          ตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 211 ทรัพย์สินรายการข้างต้นได้ทำการส่งมอบและรับมอบไว้ในความควบคุมดูแลของ <strong>${transfer.to_department_name}</strong> เรียบร้อยแล้ว พร้อมให้เจ้าหน้าที่พัสดุดำเนินการบันทึกแก้ไขในทะเบียนคุมทรัพย์สิน (แบบ สท.1) ต่อไป
        </div>
      </div>

      <div class="doc-signatures" style="margin-top: 65px;">
        <div class="sig-grid-2">
          ${renderSignatureItem(transfer.deliverer_name, `ผู้ส่งมอบ (${transfer.from_department_name})`, `วันที่ ${formatThaiDate(transfer.transfer_date)}`)}
          ${renderSignatureItem(transfer.receiver_name, `ผู้รับมอบ (${transfer.to_department_name})`, `วันที่ ${formatThaiDate(transfer.transfer_date)}`)}
        </div>

        <div class="sig-grid-2 sig-tier-gap">
          ${renderSignatureItem(settings.clerk_name, 'ปลัดเทศบาล / หัวหน้าเจ้าหน้าที่พัสดุ')}
          ${renderSignatureItem(transfer.approver_name || settings.mayor_name, 'นายกเทศมนตรี / ผู้มีอำนาจสั่งการ')}
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// แบบ สขร.1: สรุปผลการดำเนินการจัดซื้อจัดจ้างในรอบเดือน
// -------------------------------------------------------------
export function generateSKR1HTML(skrData, monthName, year, settings) {
  const orgName = settings.org_name || 'เทศบาลตำบลสุขเกษมพัฒนา';
  const rows = (skrData.items || []).map((item) => `
    <tr>
      <td class="text-center" style="font-size: 11px;">${item.seq}</td>
      <td style="font-size: 11px;">
        <div style="font-weight: 600;">${item.project_name}</div>
        <div style="color: #64748b; font-size: 10px;">${item.department_name || ''}</div>
      </td>
      <td class="text-right" style="font-size: 11px;">${formatBaht(item.budget_amount)}</td>
      <td class="text-right" style="font-size: 11px;">${formatBaht(item.reference_price)}</td>
      <td class="text-center" style="font-size: 11px;">${item.procurement_method}</td>
      <td style="font-size: 10px;">${item.bidders}</td>
      <td style="font-size: 10px;">
        <strong>${item.winner}</strong><br/>
        ราคา ${formatBaht(item.agreed_price)}
      </td>
      <td style="font-size: 10px;">${item.reason}</td>
      <td style="font-size: 10px;">${item.contract_info}</td>
    </tr>
  `).join('');

  const itemCount = skrData.items?.length || 0;
  const isSinglePage = itemCount <= 5;

  const content = `
    <div class="doc-body">
      ${renderGovHeader(orgName, 'แบบ สขร.1', 52)}
      <div class="header-title" style="font-size: 17px;">สรุปผลการดำเนินการจัดซื้อจัดจ้างในรอบเดือน</div>
      <div class="header-sub">
        <strong>${orgName}</strong> ประจำเดือน <strong>${monthName}</strong> พ.ศ. <strong>${year}</strong>
      </div>
      <div style="font-size: 11.5px; color: #475569; margin-bottom: 12px; text-align: center;">
        ตามประกาศคณะกรรมการข้อมูลข่าวสารของราชการ เรื่อง กำหนดให้ข้อมูลข่าวสารเกี่ยวกับผลการพิจารณาการจัดซื้อจัดจ้างของหน่วยงานของรัฐเป็นข้อมูลข่าวสารที่ต้องจัดไว้ให้ประชาชนตรวจดูได้ตามมาตรา 9 (8)
      </div>

      <table style="font-size: 11px;">
        <thead>
          <tr>
            <th style="width: 4%;">ลำดับ</th>
            <th style="width: 18%;">งานที่จัดซื้อหรือจัดจ้าง</th>
            <th style="width: 10%;">วงเงินงบประมาณ (บาท)</th>
            <th style="width: 10%;">ราคากลาง (บาท)</th>
            <th style="width: 9%;">วิธีซื้อหรือจ้าง</th>
            <th style="width: 14%;">รายชื่อผู้เสนอราคา และราคาที่เสนอ</th>
            <th style="width: 13%;">ผู้ได้รับการคัดเลือก และราคาที่ตกลง</th>
            <th style="width: 11%;">เหตุผลที่คัดเลือกโดยสรุป</th>
            <th style="width: 11%;">เลขที่และวันที่ของสัญญา/ข้อตกลง</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="9" class="text-center" style="padding: 25px 20px; font-size: 12.5px; color: #64748b;">- ในรอบเดือนนี้ไม่มีรายการจัดซื้อจัดจ้างที่ต้องรายงานตามประกาศฯ -</td></tr>'}
        </tbody>
        ${itemCount > 0 ? `
        <tfoot>
          <tr style="background: #f8fafc; font-weight: bold;">
            <td colspan="2" class="text-center">รวมทั้งสิ้น (${itemCount} รายการ)</td>
            <td class="text-right">${formatBaht(skrData.totalBudget)}</td>
            <td class="text-right">${formatBaht(skrData.totalBudget)}</td>
            <td colspan="5"></td>
          </tr>
        </tfoot>
        ` : ''}
      </table>
    </div>

    <div class="doc-signatures" style="margin-top: ${isSinglePage ? '85px' : '30px'};">
      <div class="sig-grid-3">
        ${renderSignatureItem(settings.supply_officer_name, 'เจ้าหน้าที่ผู้จัดทำสรุปรายงาน')}
        ${renderSignatureItem(settings.clerk_name, 'ปลัดเทศบาล / หัวหน้าเจ้าหน้าที่พัสดุ')}
        ${renderSignatureItem(settings.mayor_name, 'นายกเทศมนตรี / ผู้บริหารท้องถิ่น')}
      </div>
    </div>
  `;

  return isSinglePage ? `<div class="single-page-wrapper">${content}</div>` : content;
}

// -------------------------------------------------------------
// แบบ สท.3: ทะเบียนคุมที่ดินและสิ่งปลูกสร้าง
// -------------------------------------------------------------
export function generateST3HTML(asset, settings) {
  const orgName = settings.org_name || 'เทศบาลตำบลสุขเกษมพัฒนา';
  return `
    <div class="single-page-wrapper">
      <div class="doc-body">
        ${renderGovHeader(orgName, 'แบบ สท.3', 55)}
        <div class="header-title">ทะเบียนคุมที่ดินและสิ่งปลูกสร้าง</div>
        <div class="header-sub">${orgName} ประจำปีงบประมาณ พ.ศ. ${asset.fiscal_year || settings.fiscal_year || '2569'}</div>

        <table style="margin-top: 10px;">
          <tr>
            <th style="width: 25%; text-align: left;">รหัสทรัพย์สิน / สินทรัพย์</th>
            <td style="width: 25%; font-weight: bold; font-family: monospace; color: #1e3a8a;">${asset.asset_code}</td>
            <th style="width: 25%; text-align: left;">วันที่ตรวจรับเข้าบัญชี</th>
            <td style="width: 25%;">${formatThaiDate(asset.acquired_date)}</td>
          </tr>
          <tr>
            <th style="text-align: left;">ชื่อที่ดิน / สิ่งปลูกสร้าง</th>
            <td colspan="3" style="font-weight: bold; font-size: 14px; color: #1e3a8a;">${asset.name}</td>
          </tr>
          <tr>
            <th style="text-align: left;">เอกสารสิทธิ์ / เลขที่โฉนด</th>
            <td style="font-weight: bold;">${asset.deed_number || 'โฉนดที่ดินสาธารณประโยชน์'}</td>
            <th style="text-align: left;">เนื้อที่ / ขนาด</th>
            <td>${asset.land_area || '-'}</td>
          </tr>
          <tr>
            <th style="text-align: left;">สถานที่ตั้ง / ตำบล</th>
            <td colspan="3">${asset.location_room || '-'}</td>
          </tr>
          <tr>
            <th style="text-align: left;">สำนัก/กอง ผู้ครอบครอง</th>
            <td>${asset.department_name || '-'}</td>
            <th style="text-align: left;">ผู้รับผิดชอบดูแล</th>
            <td>${asset.custodian_name || '-'}</td>
          </tr>
          <tr>
            <th style="text-align: left;">ประเภทเงินงบประมาณ</th>
            <td>${asset.budget_source || 'เงินอุดหนุนเฉพาะกิจ'}</td>
            <th style="text-align: left;">วิธีจัดซื้อจัดจ้าง</th>
            <td>${asset.procurement_method || 'e-bidding (ประกวดราคา)'}</td>
          </tr>
          <tr>
            <th style="text-align: left;">ผู้ขาย / ผู้รับเหมาก่อสร้าง</th>
            <td>${asset.vendor || '-'} (โทร. ${asset.vendor_phone || '-'})</td>
            <th style="text-align: left;">เลขที่สัญญาจ้าง</th>
            <td>${asset.contract_number || '-'}</td>
          </tr>
          <tr>
            <th style="text-align: left;">ราคาทุนสิ่งปลูกสร้าง (บาท)</th>
            <td style="font-weight: bold; color: #047857; font-size: 14px;">${formatBaht(asset.cost_price)}</td>
            <th style="text-align: left;">อายุการใช้งาน (ปี)</th>
            <td>${asset.useful_life_years} ปี (อัตราค่าเสื่อมร้อยละ 5 ต่อปี)</td>
          </tr>
          <tr>
            <th style="text-align: left;">ระยะเวลารับประกันสัญญา</th>
            <td>สิ้นสุดวันที่ ${asset.warranty_expiry_date ? formatThaiDate(asset.warranty_expiry_date) : 'ตามเงื่อนไขสัญญา'}</td>
            <th style="text-align: left;">สถานะปัจจุบัน</th>
            <td style="font-weight: bold;">${asset.status === 'active' ? 'ใช้งานปกติ' : asset.status}</td>
          </tr>
          <tr>
            <th style="text-align: left;">หมายเหตุ / การใช้ประโยชน์</th>
            <td colspan="3">${asset.notes || 'ใช้เป็นสถานที่ปฏิบัติราชการและบริการประชาชน'}</td>
          </tr>
        </table>

        <div style="font-size: 11px; color: #475569; margin-top: 10px;">
          * บันทึกและควบคุมตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 และมาตรฐานการบัญชีภาครัฐ ฉบับที่ 17 (ที่ดิน อาคารและอุปกรณ์)
        </div>
      </div>

      <div class="doc-signatures" style="margin-top: 65px;">
        <!-- Official 4-tier Municipal Signature Block for ST.3 Land & Building Register -->
        <div class="sig-grid-4">
          ${renderSignatureItem(settings.supply_officer_name, 'เจ้าหน้าที่พัสดุผู้จัดทำ')}
          ${renderSignatureItem('ผู้อำนวยการกองช่าง', 'ผู้ตรวจสอบสิ่งปลูกสร้าง')}
          ${renderSignatureItem(settings.clerk_name, 'ปลัดเทศบาล / หัวหน้าพัสดุ')}
          ${renderSignatureItem(settings.mayor_name, 'นายกเทศมนตรี / สั่งการ')}
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// รายงานการจำหน่ายพัสดุและตัดบัญชีทะเบียนทรัพย์สิน (ระเบียบฯ ข้อ 215-217)
// -------------------------------------------------------------
export function generateDisposalVoucherHTML(disp, settings) {
  const orgName = settings.org_name || 'เทศบาลตำบลสุขเกษมพัฒนา';
  const methodMap = {
    auction: 'ขายทอดตลาด (ประมูลนำเงินส่งเป็นรายได้เทศบาล)',
    transfer: 'โอนให้หน่วยงานของรัฐหรือองค์กรการกุศล',
    donation: 'บริจาคเพื่อประโยชน์สาธารณะ',
    destruction: 'แปรสภาพหรือทำลาย (เนื่องจากไม่สามารถขายหรือใช้ประโยชน์ได้)'
  };

  return `
    <div class="single-page-wrapper">
      <div class="doc-body">
        ${renderGovHeader(orgName, 'แบบจำหน่ายพัสดุ', 55)}
        <div class="header-title">รายงานการจำหน่ายพัสดุและตัดบัญชีทะเบียนทรัพย์สิน</div>
        <div class="header-sub">${orgName} ประจำปีงบประมาณ พ.ศ. ${settings.fiscal_year || '2569'}</div>
        <div style="font-size: 11px; color: #475569; text-align: center; margin-bottom: 10px;">
          ตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 215 - 217
        </div>

        <table>
          <tr>
            <th style="width: 25%; text-align: left;">เลขที่คำสั่งอนุมัติจำหน่าย</th>
            <td style="width: 25%; font-weight: bold;">${disp.approved_order_no || 'คำสั่งเทศบาล'}</td>
            <th style="width: 25%; text-align: left;">วันที่อนุมัติจำหน่าย</th>
            <td style="width: 25%;">${formatThaiDate(disp.disposal_date)}</td>
          </tr>
          <tr>
            <th style="text-align: left;">รหัสครุภัณฑ์ที่จำหน่าย</th>
            <td style="font-weight: bold; font-family: monospace; color: #b91c1c;">${disp.asset_code}</td>
            <th style="text-align: left;">ชื่อครุภัณฑ์</th>
            <td style="font-weight: bold;">${disp.asset_name}</td>
          </tr>
          <tr>
            <th style="text-align: left;">ยี่ห้อ / รุ่น / หมายเลขเครื่อง</th>
            <td>${disp.brand || '-'} ${disp.model || ''} (S/N: ${disp.serial_number || '-'})</td>
            <th style="text-align: left;">สังกัดสำนัก/กองเดิม</th>
            <td>${disp.department_name || '-'}</td>
          </tr>
          <tr>
            <th style="text-align: left;">ราคาทุนจัดซื้อเดิม</th>
            <td style="font-weight: bold;">${formatBaht(disp.cost_price)}</td>
            <th style="text-align: left;">วันที่ตรวจรับเข้าบัญชีเดิม</th>
            <td>${formatThaiDate(disp.acquired_date)}</td>
          </tr>
          <tr>
            <th style="text-align: left;">วิธีการจำหน่ายตามระเบียบฯ</th>
            <td colspan="3" style="font-weight: bold; color: #1e3a8a;">${methodMap[disp.disposal_method] || disp.disposal_method}</td>
          </tr>
          <tr>
            <th style="text-align: left;">เงินรายได้จากการจำหน่าย (บาท)</th>
            <td style="font-weight: bold; color: #047857; font-size: 14px;">${disp.sale_proceeds > 0 ? formatBaht(disp.sale_proceeds) : '0.00 บาท'}</td>
            <th style="text-align: left;">หน่วยงานผู้รับโอน/ผู้รับบริจาค</th>
            <td>${disp.transfer_to || '-'}</td>
          </tr>
          <tr>
            <th style="text-align: left;">เหตุผลความจำเป็น / สภาพของ</th>
            <td colspan="3">${disp.notes || 'ชำรุดเสื่อมสภาพตามอายุการใช้งาน ซ่อมแซมแล้วไม่คุ้มค่าทางราชการ'}</td>
          </tr>
        </table>

        <div style="font-size: 12px; margin-top: 10px; color: #334155; line-height: 1.5; background: #f8fafc; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px;">
          <strong>การดำเนินการทางบัญชีและการควบคุม:</strong><br/>
          1. เจ้าหน้าที่พัสดุได้ดำเนินการลงบันทึก <strong>"จำหน่ายแล้ว (Disposed)"</strong> ในทะเบียนคุมทรัพย์สิน (แบบ สท.1) เรียบร้อยแล้ว<br/>
          2. ส่งสำเนารายงานฉบับนี้ให้กองคลัง เพื่อตัดมูลค่าสินทรัพย์และค่าเสื่อมราคาสะสมออกจากระบบบัญชี e-LAAS<br/>
          ${disp.sale_proceeds > 0 ? `3. เงินรายได้จากการขายทอดตลาดจำนวน ${formatBaht(disp.sale_proceeds)} ได้นำส่งเข้าบัญชีเงินรายได้ของเทศบาลเรียบร้อยแล้ว` : ''}
        </div>
      </div>

      <div class="doc-signatures" style="margin-top: 65px;">
        <div class="sig-grid-3">
          ${renderSignatureItem(settings.supply_officer_name, 'เจ้าหน้าที่พัสดุผู้รายงานตัดบัญชี')}
          ${renderSignatureItem(settings.clerk_name, 'ปลัดเทศบาล / หัวหน้าเจ้าหน้าที่พัสดุ')}
          ${renderSignatureItem(disp.approved_by || settings.mayor_name, 'นายกเทศมนตรี / ผู้มีอำนาจสั่งการจำหน่าย')}
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// แบบ พด.2 บัญชีวัสดุ (Stock Card) ตามระเบียบพัสดุฯ 2560 ข้อ 205
// -------------------------------------------------------------
export function generatePD2HTML(item, transactions = [], settings = {}) {
  const orgName = settings.org_name || 'เทศบาลตำบลสุขเกษมพัฒนา';
  const rowCount = transactions.length;
  const isShort = rowCount <= 6;
  const sigMarginTop = isShort ? '85px' : '35px';

  const rows = transactions.map(t => `
    <tr>
      <td class="text-center" style="font-size: 11px;">${formatThaiDate(t.trans_date)}</td>
      <td class="text-center" style="font-family: monospace; font-size: 11px;">${t.doc_no || '-'}</td>
      <td style="font-size: 11px;">${t.party || '-'}</td>
      <td class="text-right" style="font-size: 11px;">${Number(t.unit_price || 0).toFixed(2)}</td>
      <td class="text-center font-bold" style="font-size: 11px; color: #047857;">${t.in_qty > 0 ? t.in_qty : '-'}</td>
      <td class="text-right" style="font-size: 11px;">${t.in_amount > 0 ? Number(t.in_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}</td>
      <td class="text-center font-bold" style="font-size: 11px; color: #b91c1c;">${t.out_qty > 0 ? t.out_qty : '-'}</td>
      <td class="text-right" style="font-size: 11px;">${t.out_amount > 0 ? Number(t.out_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}</td>
      <td class="text-center font-bold" style="font-size: 11px; background: #f8fafc;">${t.balance_qty}</td>
      <td class="text-right font-bold" style="font-size: 11px; background: #f8fafc;">${Number(t.balance_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
      <td style="font-size: 10px; color: #475569;">${t.remark || '-'}</td>
    </tr>
  `).join('');

  const content = `
    <div class="doc-body">
      ${renderGovHeader(orgName, 'แบบ พด.2', 55)}
      <div class="header-title" style="font-size: 18px;">บัญชีวัสดุ (Stock Card)</div>
      <div class="header-sub">${orgName} ประจำปีงบประมาณ พ.ศ. ${settings.fiscal_year || '2569'}</div>
      <div style="font-size: 11.5px; color: #475569; text-align: center; margin-bottom: 12px;">
        ตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 205
      </div>

      <table style="border: none; margin-bottom: 10px; margin-top: 6px;">
        <tr style="border: none;">
          <td style="border: none; width: 60%; padding: 2px 0;">
            <div><strong>ชื่อหรือชนิดวัสดุ:</strong> <span style="font-size: 15px; font-weight: bold; color: #1e3a8a;">${item.name}</span></div>
            <div style="margin-top: 2px;"><strong>รหัสพัสดุ:</strong> <span style="font-family: monospace; font-weight: bold;">${item.item_code}</span> | <strong>หมวดหมู่:</strong> ${item.category}</div>
            <div style="margin-top: 2px;"><strong>ขนาดหรือลักษณะ:</strong> ${item.storage_location || 'มาตรฐานสำนักงาน'}</div>
          </td>
          <td style="border: none; width: 40%; vertical-align: top; padding: 2px 0;">
            <div><strong>หน่วยนับ:</strong> <strong>${item.unit}</strong></div>
            <div style="margin-top: 2px;"><strong>ที่เก็บ:</strong> ${item.storage_location || 'คลังพัสดุกลาง'}</div>
            <div style="margin-top: 2px;"><strong>เกณฑ์สำรองขั้นต่ำ:</strong> ${item.min_stock} ${item.unit} | <strong>คงเหลือปัจจุบัน:</strong> <span style="font-weight: bold; color: #047857;">${item.current_stock} ${item.unit}</span></div>
          </td>
        </tr>
      </table>

      <table>
        <thead>
          <tr>
            <th rowspan="2" style="width: 8%;">วัน เดือน ปี</th>
            <th rowspan="2" style="width: 12%;">ที่เอกสาร</th>
            <th rowspan="2" style="width: 16%;">รับจาก / จ่ายให้</th>
            <th rowspan="2" style="width: 8%;">ราคา/หน่วย</th>
            <th colspan="2" style="width: 16%; background: #f0fdf4;">รับ</th>
            <th colspan="2" style="width: 16%; background: #fef2f2;">จ่าย</th>
            <th colspan="2" style="width: 16%; background: #f8fafc;">คงเหลือ</th>
            <th rowspan="2" style="width: 8%;">หมายเหตุ</th>
          </tr>
          <tr>
            <th style="font-size: 11px; background: #f0fdf4;">จำนวน</th>
            <th style="font-size: 11px; background: #f0fdf4;">รวมเงิน</th>
            <th style="font-size: 11px; background: #fef2f2;">จำนวน</th>
            <th style="font-size: 11px; background: #fef2f2;">รวมเงิน</th>
            <th style="font-size: 11px; background: #f8fafc;">จำนวน</th>
            <th style="font-size: 11px; background: #f8fafc;">รวมเงิน</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="11" class="text-center" style="padding: 20px; color: #64748b;">- ยังไม่มีประวัติการรับเข้าหรือจ่ายออกในรอบปี -</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="doc-signatures" style="margin-top: ${sigMarginTop};">
      <div class="sig-grid-2">
        ${renderSignatureItem(settings.supply_officer_name, 'เจ้าหน้าที่พัสดุผู้จัดทำบัญชีวัสดุ')}
        ${renderSignatureItem(settings.clerk_name, 'หัวหน้าเจ้าหน้าที่พัสดุ / ปลัดเทศบาล')}
      </div>
    </div>
  `;

  return isShort ? `<div class="single-page-wrapper">${content}</div>` : content;
}

// -------------------------------------------------------------
// งบกระทบยอดสินทรัพย์และค่าเสื่อมราคาประจำปี (Fixed Asset Reconciliation)
// -------------------------------------------------------------
export function generateReconciliationHTML(reportData, fiscalYear, settings = {}) {
  const orgName = settings.org_name || 'เทศบาลตำบลสุขเกษมพัฒนา';
  const rows = (reportData.categories || []).map(r => `
    <tr>
      <td class="text-center font-bold" style="font-family: monospace; font-size: 11px;">${r.prefix}</td>
      <td style="font-size: 11px; font-weight: 600;">${r.name}</td>
      <td class="text-right" style="font-size: 11px;">${formatBaht(r.beginning_cost)}</td>
      <td class="text-right" style="font-size: 11px; color: #047857;">${formatBaht(r.additions_cost)}</td>
      <td class="text-right" style="font-size: 11px; color: #b91c1c;">${formatBaht(r.disposals_cost + r.transfers_out_cost)}</td>
      <td class="text-right font-bold" style="font-size: 11px;">${formatBaht(r.ending_cost)}</td>
      <td class="text-right" style="font-size: 11px;">${formatBaht(r.beginning_accum_dep)}</td>
      <td class="text-right" style="font-size: 11px; color: #d97706;">${formatBaht(r.year_depreciation)}</td>
      <td class="text-right" style="font-size: 11px;">${formatBaht(r.disposal_accum_dep)}</td>
      <td class="text-right font-bold" style="font-size: 11px;">${formatBaht(r.ending_accum_dep)}</td>
      <td class="text-right font-bold" style="font-size: 11px; color: #1e3a8a; background: #f8fafc;">${formatBaht(r.ending_net_book_value)}</td>
    </tr>
  `).join('');

  const t = reportData.totals || {};

  return `
    <div>
      <style>
        @page { size: A4 landscape; margin: 10mm 15mm; }
      </style>
      ${renderGovHeader(orgName, 'งบกระทบยอดสินทรัพย์', 55)}
      <div class="header-title" style="font-size: 18px;">งบกระทบยอดสินทรัพย์และค่าเสื่อมราคาสะสม ประจำปีงบประมาณ พ.ศ. ${fiscalYear}</div>
      <div class="header-sub">${orgName}</div>
      <div style="font-size: 11px; color: #475569; text-align: center; margin-bottom: 12px;">
        สำหรับประกอบการจัดทำงบแสดงฐานะการเงินและหมายเหตุประกอบงบการเงินเสนอ สตง. ตามระบบบัญชีคอมพิวเตอร์ e-LAAS
      </div>

      <table style="font-size: 11px;">
        <thead>
          <tr>
            <th rowspan="2" style="width: 5%;">รหัส</th>
            <th rowspan="2" style="width: 15%;">หมวดหมู่ครุภัณฑ์</th>
            <th colspan="4" style="background: #f1f5f9;">มูลค่าราคาทุน (Cost Price)</th>
            <th colspan="4" style="background: #fef3c7;">ค่าเสื่อมราคาสะสม (Accumulated Depreciation)</th>
            <th rowspan="2" style="width: 10%; background: #e0f2fe;">มูลค่าสุทธิตามบัญชี (Net Book Value)</th>
          </tr>
          <tr>
            <th style="font-size: 10px; width: 8%;">ยอดยกมา</th>
            <th style="font-size: 10px; width: 8%;">ได้มาระหว่างปี</th>
            <th style="font-size: 10px; width: 8%;">จำหน่าย/โอน</th>
            <th style="font-size: 10px; width: 8%;">ยอดยกไป</th>
            <th style="font-size: 10px; width: 8%;">ยอดยกมา</th>
            <th style="font-size: 10px; width: 8%;">ค่าเสื่อมปีนี้</th>
            <th style="font-size: 10px; width: 7%;">ตัดจำหน่าย</th>
            <th style="font-size: 10px; width: 8%;">ยอดยกไป</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr style="background: #f8fafc; font-weight: bold; border-top: 2px solid #000;">
            <td colspan="2" class="text-center">รวมทั้งสิ้น</td>
            <td class="text-right">${formatBaht(t.beginning_cost || 0)}</td>
            <td class="text-right" style="color: #047857;">${formatBaht(t.additions_cost || 0)}</td>
            <td class="text-right" style="color: #b91c1c;">${formatBaht((t.disposals_cost || 0) + (t.transfers_out_cost || 0))}</td>
            <td class="text-right">${formatBaht(t.ending_cost || 0)}</td>
            <td class="text-right">${formatBaht(t.beginning_accum_dep || 0)}</td>
            <td class="text-right" style="color: #d97706;">${formatBaht(t.year_depreciation || 0)}</td>
            <td class="text-right">${formatBaht(t.disposal_accum_dep || 0)}</td>
            <td class="text-right">${formatBaht(t.ending_accum_dep || 0)}</td>
            <td class="text-right" style="color: #1e3a8a; font-size: 12px; background: #e0f2fe;">${formatBaht(t.ending_net_book_value || 0)}</td>
          </tr>
        </tfoot>
      </table>

      <div class="sig-grid-4" style="margin-top: 25px;">
        ${renderSignatureItem(settings.supply_officer_name, 'นักวิชาการพัสดุ (ผู้จัดทำ)')}
        ${renderSignatureItem('นางวราภรณ์ ทรัพย์เพิ่ม', 'ผู้อำนวยการกองคลัง (ผู้ตรวจสอบ)')}
        ${renderSignatureItem(settings.clerk_name, 'ปลัดเทศบาล')}
        ${renderSignatureItem(settings.mayor_name, 'นายกเทศมนตรี')}
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// ใบตรวจรับพัสดุ (แบบ ตร.) ตามระเบียบข้อ 175 - 180
// -------------------------------------------------------------
export function generateInspectionHTML(ins, settings = {}) {
  const orgName = settings.org_name || 'เทศบาลตำบลสุขเกษมพัฒนา';
  return `
    <div class="single-page-wrapper">
      <div class="doc-body">
        ${renderGovHeader(orgName, 'แบบ ตร.', 55)}
        <div class="header-title" style="font-size: 18px;">ใบตรวจรับพัสดุ (การจัดซื้อจัดจ้าง)</div>
        <div class="header-sub">${orgName} ประจำปีงบประมาณ พ.ศ. ${settings.fiscal_year || '2569'}</div>
        <div style="font-size: 11px; color: #475569; text-align: center; margin-bottom: 12px;">
          ตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 175 - 180
        </div>

        <table style="border: none; margin-bottom: 10px;">
          <tr style="border: none;">
            <td style="border: none; width: 55%; padding: 2px 0;">
              <div><strong>เลขที่ใบตรวจรับ:</strong> <span style="font-family: monospace; font-weight: bold; font-size: 14px;">${ins.doc_number}</span></div>
              <div style="margin-top: 2px;"><strong>ตามสัญญา/ใบสั่งซื้อเลขที่:</strong> <strong>${ins.purchase_order_no}</strong></div>
              <div style="margin-top: 2px;"><strong>ผู้ขาย/ผู้รับจ้าง:</strong> ${ins.vendor_name} ${ins.vendor_phone ? `(โทร. ${ins.vendor_phone})` : ''}</div>
              <div style="margin-top: 2px;"><strong>หน่วยงานที่ขอซื้อ/จ้าง:</strong> ${ins.department_name || '-'}</div>
            </td>
            <td style="border: none; width: 45%; vertical-align: top; padding: 2px 0;">
              <div><strong>วันที่ตรวจรับ:</strong> ${formatThaiDate(ins.inspection_date)}</div>
              <div style="margin-top: 2px;"><strong>ลงวันที่ในสัญญา:</strong> ${ins.contract_date ? formatThaiDate(ins.contract_date) : '-'}</div>
              <div style="margin-top: 2px;"><strong>แหล่งเงิน:</strong> ${ins.budget_source || 'เงินงบประมาณเทศบาล'}</div>
              <div style="margin-top: 2px;"><strong>ผลการตรวจรับ:</strong> <span style="font-weight: bold; color: ${ins.inspection_result === 'passed' ? '#059669' : '#d97706'};">${ins.inspection_result === 'passed' ? 'ถูกต้องครบถ้วน' : 'ผ่านโดยมีเงื่อนไข'}</span></div>
            </td>
          </tr>
        </table>

        <table>
          <thead>
            <tr>
              <th style="width: 6%;">ที่</th>
              <th style="width: 38%;">รายการพัสดุที่ตรวจรับ</th>
              <th style="width: 18%;">ยี่ห้อ / รุ่น / S/N</th>
              <th style="width: 10%;">จำนวน</th>
              <th style="width: 14%;">ราคาต่อหน่วย</th>
              <th style="width: 14%;">จำนวนเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-center">1</td>
              <td>
                <div style="font-weight: bold;">${ins.item_name}</div>
                <div style="font-size: 11px; color: #64748b;">หมวด: ${ins.category_name || '-'}</div>
              </td>
              <td style="font-size: 11px;">
                ${ins.brand || '-'} ${ins.model || ''}<br/>
                <span style="font-family: monospace;">${ins.serial_number ? `S/N: ${ins.serial_number}` : ''}</span>
              </td>
              <td class="text-center font-bold">${ins.quantity || 1}</td>
              <td class="text-right">${formatBaht(ins.cost_price / (ins.quantity || 1))}</td>
              <td class="text-right font-bold">${formatBaht(ins.cost_price)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: bold;">
              <td colspan="5" class="text-center">รวมเป็นเงินทั้งสิ้น</td>
              <td class="text-right" style="color: #1e3a8a; font-size: 13.5px;">${formatBaht(ins.cost_price)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="font-size: 12px; margin-top: 10px; line-height: 1.55; background: #f8fafc; border: 1.2px solid #cbd5e1; padding: 10px 14px; border-radius: 4px;">
          <strong>คำรับรองของคณะกรรมการตรวจรับพัสดุ:</strong><br/>
          คณะกรรมการตรวจรับพัสดุได้พร้อมกันตรวจรับพัสดุตามรายการข้างต้นแล้ว ปรากฏว่าผู้ขาย/ผู้รับจ้าง ได้ส่งมอบพัสดุถูกต้อง ครบถ้วนตามรูปแบบและข้อกำหนดแห่งสัญญาหรือข้อตกลงทุกประการ พร้อมทดสอบการใช้งานเรียบร้อย จึงลงลายมือชื่อไว้เป็นหลักฐาน และเห็นควรส่งเรื่องให้ฝ่ายการเงินและบัญชีดำเนินการเบิกจ่ายเงินตามระเบียบต่อไป
          ${ins.notes ? `<div style="margin-top: 4px; color: #334155;"><strong>บันทึกเพิ่มเติม:</strong> ${ins.notes}</div>` : ''}
        </div>
      </div>

      <div class="doc-signatures" style="margin-top: 60px;">
        <div style="text-align: center; font-weight: bold; margin-bottom: 12px; font-size: 12.5px;">คณะกรรมการตรวจรับพัสดุ</div>
        <div class="sig-grid-3">
          ${renderSignatureItem(ins.chairman_name, 'ประธานกรรมการตรวจรับพัสดุ', `วันที่ ${formatThaiDate(ins.inspection_date)}`)}
          ${renderSignatureItem(ins.member1_name, 'กรรมการตรวจรับพัสดุ', `วันที่ ${formatThaiDate(ins.inspection_date)}`)}
          ${renderSignatureItem(ins.member2_name, 'กรรมการตรวจรับพัสดุ', `วันที่ ${formatThaiDate(ins.inspection_date)}`)}
        </div>
      </div>
    </div>
  `;
}
