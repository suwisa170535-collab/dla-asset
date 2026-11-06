/**
 * Utility functions for Thai Government formatting
 */

export function formatBaht(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00 ฿';
  return Number(amount).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' ฿';
}

export function formatNumber(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return Number(amount).toLocaleString('th-TH');
}

export function formatThaiDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const month = thaiMonths[d.getMonth()];
    const buddhistYear = d.getFullYear() + 543;
    return `${day} ${month} ${buddhistYear}`;
  } catch {
    return dateStr;
  }
}

export function formatThaiDateTime(dateTimeStr) {
  if (!dateTimeStr) return '-';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    const datePart = formatThaiDate(dateTimeStr);
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${datePart} ${hours}:${mins} น.`;
  } catch {
    return dateTimeStr;
  }
}

export const ASSET_STATUS_MAP = {
  active: { label: 'ใช้งานปกติ', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  borrowed: { label: 'ถูกยืมใช้งาน', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  damaged: { label: 'ชำรุดรอซ่อม', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  repairing: { label: 'อยู่ระหว่างซ่อม', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  pending_disposal: { label: 'รอจำหน่าย', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  disposed: { label: 'จำหน่ายแล้ว', color: 'bg-slate-200 text-slate-700 border-slate-400' },
  lost: { label: 'สูญหาย', color: 'bg-rose-100 text-rose-800 border-rose-300' }
};

export const BORROW_STATUS_MAP = {
  borrowed: { label: 'อยู่ระหว่างการยืม', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  returned: { label: 'ส่งคืนเรียบร้อยแล้ว', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  overdue: { label: 'เกินกำหนดส่งคืน', color: 'bg-rose-100 text-rose-800 border-rose-300' }
};

export const REQ_STATUS_MAP = {
  draft: { label: 'ร่างใบเบิก', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  pending_approval: { label: 'รอหัวหน้าอนุมัติ', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  approved: { label: 'อนุมัติแล้ว (รอจ่ายพัสดุ)', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  dispensed: { label: 'จ่ายพัสดุแล้ว', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  rejected: { label: 'ไม่อนุมัติ', color: 'bg-rose-100 text-rose-800 border-rose-300' }
};

export const REPAIR_STATUS_MAP = {
  reported: { label: 'แจ้งซ่อมแล้ว', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  inspecting: { label: 'ตรวจสภาพ/รออะไหล่', color: 'bg-sky-100 text-sky-800 border-sky-300' },
  in_progress: { label: 'กำลังส่งซ่อม', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  completed: { label: 'ซ่อมเสร็จใช้งานได้', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  unrepairable: { label: 'ซ่อมไม่ได้ เสนอจำหน่าย', color: 'bg-rose-100 text-rose-800 border-rose-300' }
};

export const DISPOSAL_METHOD_MAP = {
  auction: { label: 'ขายทอดตลาด', desc: 'จำหน่ายโดยการประมูลราคา นำส่งเงินเป็นรายได้เทศบาล' },
  transfer: { label: 'โอน', desc: 'โอนให้ส่วนราชการหรือหน่วยงานของรัฐอื่น' },
  donation: { label: 'บริจาค', desc: 'บริจาคให้วัด โรงเรียน หรือสาธารณกุศล' },
  destruction: { label: 'แปรสภาพหรือทำลาย', desc: 'ทำลายหรือฝังกลบตามสุขอนามัย' }
};

