import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  Download,
  Building,
  DollarSign,
  TrendingDown,
  Layers,
  ArrowRight,
  Boxes,
  FileText,
  FileCheck2,
  Landmark,
  Scale
} from 'lucide-react';
import { formatBaht, formatThaiDate } from '../utils/formatters.js';
import { openPrintWindow, generateSKR1HTML, generateST3HTML, generateReconciliationHTML, getGarudaSVG, renderGovHeader, renderSignatureItem } from '../utils/printTemplates.js';

export default function ReportsView({ settings, departments }) {
  const [reportType, setReportType] = useState('st2');
  const [assets, setAssets] = useState([]);
  const [items, setItems] = useState([]);
  const [disposals, setDisposals] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(false);

  // SKR.1 state
  const [skrMonth, setSkrMonth] = useState(String(new Date().getMonth() + 1));
  const [skrYear, setSkrYear] = useState(settings.fiscal_year || '2569');
  const [skrData, setSkrData] = useState({ items: [], totalBudget: 0 });

  // Fixed Asset Reconciliation state
  const [reconData, setReconData] = useState(null);
  const [reconYear, setReconYear] = useState(settings.fiscal_year || '2569');

  const fetchReconciliation = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/fixed-asset-reconciliation?fiscal_year=${reconYear}`);
      const data = await res.json();
      setReconData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportType === 'reconciliation') {
      fetchReconciliation();
    }
  }, [reportType, reconYear]);

  const handlePrintReconciliation = () => {
    if (!reconData) return;
    const html = generateReconciliationHTML(reconData, reconYear, settings);
    openPrintWindow(html, `งบกระทบยอดสินทรัพย์_ปี_${reconYear}`);
  };

  const handleExportReconciliationExcel = async () => {
    if (!reconData || !reconData.categories) return;
    try {
      const XLSX = await import('xlsx');
      const rows = reconData.categories.map((r, i) => ({
        'ลำดับ': i + 1,
        'รหัสหมวด': r.prefix,
        'หมวดหมู่ครุภัณฑ์': r.name,
        'ยอดยกมาต้นปี (บาท)': r.beginning_cost,
        'ได้มาระหว่างปี (บาท)': r.additions_cost,
        'จำหน่าย/โอนออก (บาท)': r.disposals_cost + r.transfers_out_cost,
        'ยอดยกไปราคาทุน (บาท)': r.ending_cost,
        'ค่าเสื่อมสะสมยกมา (บาท)': r.beginning_accum_dep,
        'ค่าเสื่อมราคาประจำปีนี้ (บาท)': r.year_depreciation,
        'ตัดจำหน่ายค่าเสื่อม (บาท)': r.disposal_accum_dep,
        'ค่าเสื่อมสะสมยกไป (บาท)': r.ending_accum_dep,
        'มูลค่าสุทธิตามบัญชียกไป (Net Book Value)': r.ending_net_book_value
      }));

      const t = reconData.totals || {};
      rows.push({
        'ลำดับ': 'รวมทั้งสิ้น',
        'รหัสหมวด': '',
        'หมวดหมู่ครุภัณฑ์': 'ยอดรวมทั้งสิ้นทุกหมวด',
        'ยอดยกมาต้นปี (บาท)': t.beginning_cost,
        'ได้มาระหว่างปี (บาท)': t.additions_cost,
        'จำหน่าย/โอนออก (บาท)': (t.disposals_cost || 0) + (t.transfers_out_cost || 0),
        'ยอดยกไปราคาทุน (บาท)': t.ending_cost,
        'ค่าเสื่อมสะสมยกมา (บาท)': t.beginning_accum_dep,
        'ค่าเสื่อมราคาประจำปีนี้ (บาท)': t.year_depreciation,
        'ตัดจำหน่ายค่าเสื่อม (บาท)': t.disposal_accum_dep,
        'ค่าเสื่อมสะสมยกไป (บาท)': t.ending_accum_dep,
        'มูลค่าสุทธิตามบัญชียกไป (Net Book Value)': t.ending_net_book_value
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `งบกระทบยอด_${reconYear}`);
      XLSX.writeFile(wb, `งบกระทบยอดสินทรัพย์_${settings.org_name || 'เทศบาล'}_ปี_${reconYear}.xlsx`);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการส่งออก Excel: ' + err.message);
    }
  };

  const thaiMonths = [
    { num: '1', name: 'มกราคม' },
    { num: '2', name: 'กุมภาพันธ์' },
    { num: '3', name: 'มีนาคม' },
    { num: '4', name: 'เมษายน' },
    { num: '5', name: 'พฤษภาคม' },
    { num: '6', name: 'มิถุนายน' },
    { num: '7', name: 'กรกฎาคม' },
    { num: '8', name: 'สิงหาคม' },
    { num: '9', name: 'กันยายน' },
    { num: '10', name: 'ตุลาคม' },
    { num: '11', name: 'พฤศจิกายน' },
    { num: '12', name: 'ธันวาคม' }
  ];

  const fetchSKR1 = async () => {
    try {
      const res = await fetch(`/api/reports/skr1?year=${skrYear}&month=${skrMonth}`);
      const data = await res.json();
      setSkrData(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (reportType === 'skr1') {
      fetchSKR1();
    }
  }, [reportType, skrMonth, skrYear]);

  useEffect(() => {
    fetchData();
  }, [selectedDept]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = selectedDept ? `?department_id=${selectedDept}` : '';
      const [resA, resI, resD] = await Promise.all([
        fetch(`/api/assets${q}`),
        fetch('/api/inventory'),
        fetch('/api/disposals')
      ]);
      const dataA = await resA.json();
      const dataI = await resI.json();
      const dataD = await resD.json();

      setAssets(dataA);
      setItems(dataI);
      setDisposals(dataD);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Download e-LAAS File (Excel / CSV)
  const handleDownloadELAAS = async (format = 'xlsx') => {
    try {
      const res = await fetch('/api/export-elaas');
      const data = await res.json();

      if (!data || data.length === 0) {
        alert('ไม่มีข้อมูลสำหรับส่งออก');
        return;
      }

      const fy = settings.fiscal_year || '2569';
      const org = settings.org_name || 'เทศบาล';

      if (format === 'xlsx') {
        const XLSX = await import('xlsx');
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `eLAAS_${fy}`);
        XLSX.writeFile(wb, `eLAAS_Asset_Export_${org}_${fy}.xlsx`);
      } else {
        // CSV with UTF-8 BOM
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];

        for (const row of data) {
          const values = headers.map(header => {
            const val = row[header] ?? '';
            const escaped = String(val).replace(/"/g, '""');
            return `"${escaped}"`;
          });
          csvRows.push(values.join(','));
        }

        const csvContent = '\uFEFF' + csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `eLAAS_Asset_Export_${fy}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ e-LAAS');
    }
  };

  // Print ST.2 Form (บัญชีครุภัณฑ์)
  const handlePrintST2 = () => {
    const orgName = settings.org_name || 'เทศบาลตำบลสุขเกษมพัฒนา';
    const rows = assets.map((a, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="text-center font-bold font-mono">${a.asset_code}</td>
        <td>${a.name}</td>
        <td>${a.brand || '-'} / ${a.model || '-'}</td>
        <td class="text-center font-mono">${a.serial_number || '-'}</td>
        <td class="text-center">${formatThaiDate(a.acquired_date)}</td>
        <td class="text-right">${a.cost_price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
        <td class="text-right">${a.depreciation?.accumulated?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) || '0.00'}</td>
        <td class="text-right font-bold">${a.depreciation?.bookValue?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) || '0.00'}</td>
        <td>${a.department_name}</td>
        <td>${a.custodian_name || '-'}</td>
        <td class="text-center">${a.status === 'active' ? 'ปกติ' : a.status}</td>
      </tr>
    `).join('');

    const isSingle = (assets?.length || 0) <= 6;
    const innerContent = `
      <div class="doc-body">
        ${renderGovHeader(orgName, 'แบบ สท.2', 58)}
        <div class="header-title">บัญชีครุภัณฑ์ (Asset Ledger)</div>
        <div class="header-sub">${orgName} ประจำปีงบประมาณ พ.ศ. ${settings.fiscal_year || '2569'}</div>
        <div style="font-size: 11.5px; color: #475569; text-align: center; margin-bottom: 14px;">
          ตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 และหลักเกณฑ์กรมบัญชีกลาง
        </div>

        <table>
          <thead>
            <tr>
              <th>ที่</th>
              <th>รหัสครุภัณฑ์</th>
              <th>ชื่อครุภัณฑ์</th>
              <th>ยี่ห้อ/รุ่น</th>
              <th>Serial Number</th>
              <th>วันที่ได้มา</th>
              <th>ราคาทุน (บาท)</th>
              <th>ค่าเสื่อมสะสม (บาท)</th>
              <th>มูลค่าสุทธิ (บาท)</th>
              <th>สำนัก/กอง</th>
              <th>ผู้ดูแล</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>

      <div class="doc-signatures">
        <div class="sig-grid-3">
          ${renderSignatureItem(settings.supply_officer_name, 'เจ้าหน้าที่พัสดุผู้จัดทำบัญชี')}
          ${renderSignatureItem(settings.clerk_name, 'ปลัดเทศบาล / หัวหน้าเจ้าหน้าที่พัสดุ')}
          ${renderSignatureItem(settings.mayor_name, 'นายกเทศมนตรี / ผู้บริหารท้องถิ่น')}
        </div>
      </div>
    `;

    const html = isSingle ? `<div class="single-page-wrapper">${innerContent}</div>` : innerContent;

    openPrintWindow(html, 'แบบ สท.2 บัญชีครุภัณฑ์');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <BarChart3 className="w-7 h-7 text-gov-700" />
            <span>ระบบรายงานและเชื่อมโยงระบบ e-LAAS (Reporting & Integration)</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            พิมพ์แบบฟอร์มมาตรฐานราชการ (สท.1, สท.2, พด.1) รายงานค่าเสื่อมราคา และส่งออกไฟล์ตามโครงสร้างระบบบัญชีคอมพิวเตอร์ e-LAAS
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleDownloadELAAS('xlsx')}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition"
            title="ส่งออกเป็นไฟล์ Excel พร้อมจัดรูปแบบตัวเลขสวยงาม"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ส่งออก e-LAAS (.xlsx)</span>
          </button>
          <button
            onClick={() => handleDownloadELAAS('csv')}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3 py-2.5 rounded-xl font-bold text-xs shadow-sm transition"
            title="ส่งออกไฟล์ CSV มาตรฐานสำหรับอัปโหลดเข้าระบบ e-LAAS สถ."
          >
            <Download className="w-3.5 h-3.5" />
            <span>.CSV</span>
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setReportType('st2')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              reportType === 'st2'
                ? 'bg-gov-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            แบบ สท.2 (บัญชีครุภัณฑ์รวม)
          </button>
          <button
            onClick={() => setReportType('reconciliation')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs ${
              reportType === 'reconciliation'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>⚖️ งบกระทบยอดสินทรัพย์ (ส่ง สตง.)</span>
          </button>
          <button
            onClick={() => setReportType('depreciation')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              reportType === 'depreciation'
                ? 'bg-gov-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            รายงานค่าเสื่อมราคาส่งกองคลัง
          </button>
          <button
            onClick={() => setReportType('inventory')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              reportType === 'inventory'
                ? 'bg-gov-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            รายงานพัสดุสิ้นเปลืองคงคลัง
          </button>
          <button
            onClick={() => setReportType('skr1')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              reportType === 'skr1'
                ? 'bg-gov-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>แบบ สขร.1 (สรุปจัดซื้อรายเดือน)</span>
          </button>
          <button
            onClick={() => setReportType('st3')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              reportType === 'st3'
                ? 'bg-gov-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>แบบ สท.3 (ที่ดิน & สิ่งปลูกสร้าง)</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {reportType === 'reconciliation' ? (
            <>
              <select
                value={reconYear}
                onChange={e => setReconYear(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gov-500 font-medium"
              >
                <option value="2569">ปีงบประมาณ พ.ศ. 2569</option>
                <option value="2568">ปีงบประมาณ พ.ศ. 2568</option>
                <option value="2567">ปีงบประมาณ พ.ศ. 2567</option>
              </select>
              <button
                onClick={handlePrintReconciliation}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gov-800 hover:bg-gov-900 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Printer className="w-3.5 h-3.5 text-gold-400" />
                <span>🖨️ พิมพ์งบกระทบยอด (PDF)</span>
              </button>
              <button
                onClick={handleExportReconciliationExcel}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>📥 ส่งออก Excel</span>
              </button>
            </>
          ) : reportType === 'skr1' ? (
            <>
              <select
                value={skrMonth}
                onChange={e => setSkrMonth(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gov-500 font-medium"
              >
                {thaiMonths.map(m => (
                  <option key={m.num} value={m.num}>{m.name}</option>
                ))}
              </select>
              <select
                value={skrYear}
                onChange={e => setSkrYear(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gov-500 font-medium"
              >
                <option value="2569">ปี พ.ศ. 2569</option>
                <option value="2568">ปี พ.ศ. 2568</option>
                <option value="2567">ปี พ.ศ. 2567</option>
              </select>
              <button
                onClick={() => {
                  const monthName = thaiMonths.find(m => m.num === skrMonth)?.name || '';
                  const html = generateSKR1HTML(skrData, monthName, skrYear, settings);
                  openPrintWindow(html, `แบบ สขร.1 ประจำเดือน ${monthName} ${skrYear}`);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gov-800 hover:bg-gov-900 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Printer className="w-3.5 h-3.5 text-gold-400" />
                <span>พิมพ์แบบ สขร.1</span>
              </button>
            </>
          ) : reportType === 'st3' ? (
            <div className="text-xs text-slate-500">
              ทะเบียนคุมสินทรัพย์ที่ดินและสิ่งปลูกสร้างตามมาตรฐานกรมบัญชีกลาง
            </div>
          ) : (
            <>
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gov-500"
              >
                <option value="">ทุกสำนัก/กอง</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <button
                onClick={handlePrintST2}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>พิมพ์รายงาน</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Report Table Display */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
        {reportType === 'st2' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 text-base">แบบ สท.2 ทะเบียนบัญชีครุภัณฑ์แยกตามสำนัก/กอง</h2>
              <span className="text-xs text-slate-500">รวม {assets.length} รายการ</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">รหัสครุภัณฑ์</th>
                    <th className="py-2.5 px-3">ชื่อครุภัณฑ์</th>
                    <th className="py-2.5 px-3">สำนัก/กอง</th>
                    <th className="py-2.5 px-3 text-right">ราคาทุน (บาท)</th>
                    <th className="py-2.5 px-3 text-right">ค่าเสื่อมสะสม (บาท)</th>
                    <th className="py-2.5 px-3 text-right">มูลค่าสุทธิตามบัญชี</th>
                    <th className="py-2.5 px-3 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-gov-800">{a.asset_code}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{a.name}</td>
                      <td className="py-2 px-3 text-slate-600">{a.department_name}</td>
                      <td className="py-2 px-3 text-right">{formatBaht(a.cost_price)}</td>
                      <td className="py-2 px-3 text-right text-rose-600">-{formatBaht(a.depreciation?.accumulated)}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600">{formatBaht(a.depreciation?.bookValue)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'depreciation' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 text-base">รายงานค่าเสื่อมราคาครุภัณฑ์ประจำปี (ส่งกองคลังบันทึกบัญชี)</h2>
              <span className="text-xs text-slate-500">ปีงบประมาณ พ.ศ. {settings.fiscal_year || '2569'}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">รหัสครุภัณฑ์</th>
                    <th className="py-2.5 px-3">ชื่อครุภัณฑ์</th>
                    <th className="py-2.5 px-3 text-center">วันที่ตรวจรับ</th>
                    <th className="py-2.5 px-3 text-center">อายุ (ปี)</th>
                    <th className="py-2.5 px-3 text-right">ราคาทุนจัดซื้อ</th>
                    <th className="py-2.5 px-3 text-right">ค่าเสื่อมปีนี้</th>
                    <th className="py-2.5 px-3 text-right">ค่าเสื่อมราคาสะสม</th>
                    <th className="py-2.5 px-3 text-right">มูลค่าคงเหลือสุทธิ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-gov-800">{a.asset_code}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{a.name}</td>
                      <td className="py-2 px-3 text-center text-slate-500">{formatThaiDate(a.acquired_date)}</td>
                      <td className="py-2 px-3 text-center">{a.useful_life_years} ปี</td>
                      <td className="py-2 px-3 text-right font-medium">{formatBaht(a.cost_price)}</td>
                      <td className="py-2 px-3 text-right font-medium text-gov-700">{formatBaht(a.depreciation?.currentAnnual)}</td>
                      <td className="py-2 px-3 text-right font-medium text-rose-600">-{formatBaht(a.depreciation?.accumulated)}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600">{formatBaht(a.depreciation?.bookValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'inventory' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 text-base">รายงานพัสดุสิ้นเปลืองคงคลังย่อยและมูลค่าคงเหลือ</h2>
              <span className="text-xs text-slate-500">รวม {items.length} รายการ</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">รหัสพัสดุ</th>
                    <th className="py-2.5 px-3">ชื่อรายการวัสดุ</th>
                    <th className="py-2.5 px-3">หมวดหมู่</th>
                    <th className="py-2.5 px-3 text-center">ยอดคงเหลือ</th>
                    <th className="py-2.5 px-3 text-center">เกณฑ์สั่งซื้อ</th>
                    <th className="py-2.5 px-3 text-right">ราคาต่อหน่วย</th>
                    <th className="py-2.5 px-3 text-right">มูลค่าสต็อกรวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(i => (
                    <tr key={i.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-slate-700">{i.item_code}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{i.name}</td>
                      <td className="py-2 px-3 text-slate-500">{i.category}</td>
                      <td className="py-2 px-3 text-center font-bold">{i.current_stock} {i.unit}</td>
                      <td className="py-2 px-3 text-center text-slate-400">{i.min_stock} {i.unit}</td>
                      <td className="py-2 px-3 text-right">{formatBaht(i.unit_price)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatBaht(i.current_stock * i.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'skr1' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-800 text-base">
                  แบบ สขร.1: สรุปผลการดำเนินการจัดซื้อจัดจ้างในรอบเดือน {thaiMonths.find(m => m.num === skrMonth)?.name} {skrYear}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ตามประกาศคณะกรรมการข้อมูลข่าวสารของราชการ มาตรา 9 (8) สำหรับปิดประกาศและส่ง สตง.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">รวม {skrData.items?.length || 0} รายการ</span>
                <div className="text-sm font-bold text-gov-800">วงเงินรวม {formatBaht(skrData.totalBudget || 0)}</div>
              </div>
            </div>

            {(!skrData.items || skrData.items.length === 0) ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <FileCheck2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">ไม่พบรายการจัดซื้อจัดจ้างในรอบเดือนนี้</p>
                <p className="text-xs">สามารถเลือกเดือนอื่น หรือตรวจสอบข้อมูลวันที่ตรวจรับในทะเบียนครุภัณฑ์</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-2 text-center w-8">ที่</th>
                      <th className="py-2.5 px-3">งานที่จัดซื้อหรือจัดจ้าง</th>
                      <th className="py-2.5 px-3 text-right">วงเงินงบประมาณ</th>
                      <th className="py-2.5 px-3 text-center">วิธีจัดซื้อ</th>
                      <th className="py-2.5 px-3">ผู้เสนอราคา</th>
                      <th className="py-2.5 px-3">ผู้ได้รับคัดเลือก & ราคา</th>
                      <th className="py-2.5 px-3">เลขที่สัญญา/ข้อตกลง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {skrData.items.map((it) => (
                      <tr key={it.seq} className="hover:bg-slate-50">
                        <td className="py-2 px-2 text-center font-bold text-slate-500">{it.seq}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          <div>{it.project_name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{it.department_name}</div>
                        </td>
                        <td className="py-2 px-3 text-right font-medium">{formatBaht(it.budget_amount)}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                            {it.procurement_method}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600">{it.bidders}</td>
                        <td className="py-2 px-3">
                          <strong className="text-slate-800">{it.winner}</strong>
                          <div className="text-[10px] text-emerald-700 font-bold">{formatBaht(it.agreed_price)}</div>
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[11px] font-mono">{it.contract_info}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {reportType === 'st3' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-800 text-base">แบบ สท.3: ทะเบียนคุมที่ดินและสิ่งปลูกสร้างเทศบาล</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  สินทรัพย์โครงสร้างพื้นฐาน ที่ดินสาธารณประโยชน์ และอาคารสำนักงานตามมาตรฐานกรมบัญชีกลาง
                </p>
              </div>
              <span className="text-xs text-slate-500">
                รวม {assets.filter(a => a.category_name?.includes('ที่ดิน') || a.asset_code?.startsWith('สท.3')).length} รายการ
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">รหัสสินทรัพย์</th>
                    <th className="py-2.5 px-3">ชื่อที่ดิน / สิ่งปลูกสร้าง</th>
                    <th className="py-2.5 px-3">เอกสารสิทธิ์ / เลขที่โฉนด</th>
                    <th className="py-2.5 px-3">เนื้อที่</th>
                    <th className="py-2.5 px-3">สถานที่ตั้ง</th>
                    <th className="py-2.5 px-3 text-right">ราคาทุนสิ่งปลูกสร้าง</th>
                    <th className="py-2.5 px-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.filter(a => a.category_name?.includes('ที่ดิน') || a.asset_code?.startsWith('สท.3')).map(a => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-gov-800">{a.asset_code}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{a.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{a.deed_number || 'โฉนดที่ดินสาธารณะ'}</td>
                      <td className="py-2.5 px-3 text-slate-600">{a.land_area || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-500">{a.location_room || '-'}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatBaht(a.cost_price)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            const html = generateST3HTML(a, settings);
                            openPrintWindow(html, `แบบ สท.3 ทะเบียนคุมที่ดินและสิ่งปลูกสร้าง (${a.asset_code})`);
                          }}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-gov-700 hover:bg-gov-800 text-white rounded-lg text-[11px] font-bold shadow-sm transition"
                        >
                          <Printer className="w-3 h-3 text-gold-400" />
                          <span>พิมพ์ สท.3</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {assets.filter(a => a.category_name?.includes('ที่ดิน') || a.asset_code?.startsWith('สท.3')).length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-slate-400">
                        ยังไม่มีรายการที่ดินหรือสิ่งปลูกสร้างในระบบ (สามารถลงทะเบียนเพิ่มได้ในเมนู ทะเบียนครุภัณฑ์)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'reconciliation' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-slate-800 text-base flex items-center space-x-2">
                  <Scale className="w-5 h-5 text-gov-700" />
                  <span>งบกระทบยอดสินทรัพย์และค่าเสื่อมราคาสะสม ประจำปีงบประมาณ พ.ศ. {reconYear}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  สำหรับแนบประกอบงบแสดงฐานะการเงินและหมายเหตุประกอบงบการเงินเสนอ สตง. (คำนวณแยก 18 หมวดหมู่ตามเกณฑ์ e-LAAS)
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrintReconciliation}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-gov-800 hover:bg-gov-900 text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  <Printer className="w-3.5 h-3.5 text-gold-400" />
                  <span>พิมพ์งบกระทบยอด</span>
                </button>
                <button
                  onClick={handleExportReconciliationExcel}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            {reconData && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">มูลค่าราคาทุนรวมยกไป</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {formatBaht(reconData.totals?.ending_cost || 0)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">ยอดยกมา + ได้มาระหว่างปี - จำหน่าย</div>
                </div>
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-[11px] text-emerald-700 font-medium">ได้มาระหว่างปีงบประมาณนี้</div>
                  <div className="text-base font-bold text-emerald-800 mt-0.5">
                    {formatBaht(reconData.totals?.additions_cost || 0)}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-1">สินทรัพย์ที่เพิ่มขึ้นในปี {reconYear}</div>
                </div>
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="text-[11px] text-amber-700 font-medium">ค่าเสื่อมราคาสะสมยกไป</div>
                  <div className="text-base font-bold text-amber-800 mt-0.5">
                    {formatBaht(reconData.totals?.ending_accum_dep || 0)}
                  </div>
                  <div className="text-[10px] text-amber-600 mt-1">ค่าเสื่อมสะสมทุกหมวดหมู่</div>
                </div>
                <div className="p-3.5 bg-sky-50 rounded-xl border border-sky-200">
                  <div className="text-[11px] text-sky-700 font-medium">มูลค่าสุทธิตามบัญชี (Net Book Value)</div>
                  <div className="text-base font-bold text-sky-900 mt-0.5">
                    {formatBaht(reconData.totals?.ending_net_book_value || 0)}
                  </div>
                  <div className="text-[10px] text-sky-600 mt-1">มูลค่าคงเหลือในงบดุลสิ้นปี</div>
                </div>
              </div>
            )}

            {/* Reconciliation Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th rowSpan="2" className="py-2 px-2.5 text-center border-r border-slate-200">รหัส</th>
                    <th rowSpan="2" className="py-2 px-3 border-r border-slate-200">หมวดหมู่ครุภัณฑ์</th>
                    <th colSpan="4" className="py-1 px-2 text-center border-r border-slate-200 bg-slate-50">
                      มูลค่าราคาทุน (Cost)
                    </th>
                    <th colSpan="3" className="py-1 px-2 text-center border-r border-slate-200 bg-amber-50/70">
                      ค่าเสื่อมราคาสะสม (Accum Dep)
                    </th>
                    <th rowSpan="2" className="py-2 px-3 text-right bg-sky-50 text-sky-900">
                      มูลค่าสุทธิตามบัญชี
                    </th>
                  </tr>
                  <tr className="text-[11px]">
                    <th className="py-1.5 px-2 text-right border-r border-slate-200 font-medium">ยอดยกมา</th>
                    <th className="py-1.5 px-2 text-right border-r border-slate-200 font-medium text-emerald-700">ได้มา</th>
                    <th className="py-1.5 px-2 text-right border-r border-slate-200 font-medium text-rose-700">จำหน่าย</th>
                    <th className="py-1.5 px-2 text-right border-r border-slate-200 font-bold">ยอดยกไป</th>
                    <th className="py-1.5 px-2 text-right border-r border-slate-200 font-medium">ยอดยกมา</th>
                    <th className="py-1.5 px-2 text-right border-r border-slate-200 font-medium text-amber-700">ปีนี้</th>
                    <th className="py-1.5 px-2 text-right border-r border-slate-200 font-bold">สะสมยกไป</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!reconData ? (
                    <tr>
                      <td colSpan="10" className="text-center py-8 text-slate-400">
                        กำลังคำนวณงบกระทบยอดสินทรัพย์...
                      </td>
                    </tr>
                  ) : (
                    reconData.categories?.map(r => (
                      <tr key={r.category_id} className="hover:bg-slate-50/80 transition text-[11px]">
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-700 border-r border-slate-100">
                          {r.prefix}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-100">
                          {r.name}
                        </td>
                        <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">
                          {formatBaht(r.beginning_cost)}
                        </td>
                        <td className="py-2 px-2 text-right border-r border-slate-100 font-semibold text-emerald-600">
                          {r.additions_cost > 0 ? formatBaht(r.additions_cost) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right border-r border-slate-100 font-semibold text-rose-600">
                          {(r.disposals_cost + r.transfers_out_cost) > 0 ? formatBaht(r.disposals_cost + r.transfers_out_cost) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right border-r border-slate-100 font-bold text-slate-900 bg-slate-50/50">
                          {formatBaht(r.ending_cost)}
                        </td>
                        <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">
                          {formatBaht(r.beginning_accum_dep)}
                        </td>
                        <td className="py-2 px-2 text-right border-r border-slate-100 font-semibold text-amber-700">
                          {formatBaht(r.year_depreciation)}
                        </td>
                        <td className="py-2 px-2 text-right border-r border-slate-100 font-bold text-slate-900 bg-amber-50/30">
                          {formatBaht(r.ending_accum_dep)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-sky-900 bg-sky-50/60">
                          {formatBaht(r.ending_net_book_value)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {reconData && (
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 text-xs">
                      <td colSpan="2" className="py-2.5 px-3 text-center border-r border-slate-200">
                        รวมทั้งสิ้น (18 หมวดหมู่)
                      </td>
                      <td className="py-2.5 px-2 text-right border-r border-slate-200">
                        {formatBaht(reconData.totals?.beginning_cost || 0)}
                      </td>
                      <td className="py-2.5 px-2 text-right border-r border-slate-200 text-emerald-700">
                        {formatBaht(reconData.totals?.additions_cost || 0)}
                      </td>
                      <td className="py-2.5 px-2 text-right border-r border-slate-200 text-rose-700">
                        {formatBaht((reconData.totals?.disposals_cost || 0) + (reconData.totals?.transfers_out_cost || 0))}
                      </td>
                      <td className="py-2.5 px-2 text-right border-r border-slate-200 bg-slate-200/50">
                        {formatBaht(reconData.totals?.ending_cost || 0)}
                      </td>
                      <td className="py-2.5 px-2 text-right border-r border-slate-200">
                        {formatBaht(reconData.totals?.beginning_accum_dep || 0)}
                      </td>
                      <td className="py-2.5 px-2 text-right border-r border-slate-200 text-amber-800">
                        {formatBaht(reconData.totals?.year_depreciation || 0)}
                      </td>
                      <td className="py-2.5 px-2 text-right border-r border-slate-200 bg-amber-100/50">
                        {formatBaht(reconData.totals?.ending_accum_dep || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-sky-900 bg-sky-100 text-sm">
                        {formatBaht(reconData.totals?.ending_net_book_value || 0)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Integration Card & Workflow Guide */}
      <div className="bg-gradient-to-r from-gov-900 via-gov-800 to-slate-900 rounded-2xl p-6 text-white space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-gold-300 font-bold text-base">
              <span>🌐 คู่มือขั้นตอนการนำข้อมูลเข้าสู่ระบบบัญชีภาครัฐ e-LAAS</span>
            </div>
            <p className="text-xs text-gov-200 mt-1">
              ระบบ e-LAAS ของกรมส่งเสริมการปกครองท้องถิ่น (สถ.) เป็นระบบปิดผ่านอินเทอร์เน็ตของกระทรวงมหาดไทย การเชื่อมต่องานทำได้ 2 วิธีตามมาตรฐาน:
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleDownloadELAAS('xlsx')}
              className="whitespace-nowrap px-3.5 py-2 bg-gold-500 hover:bg-gold-600 text-gov-950 font-bold rounded-xl text-xs transition shadow flex items-center space-x-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>ดาวน์โหลด Excel (.xlsx)</span>
            </button>
            <button
              onClick={() => handleDownloadELAAS('csv')}
              className="whitespace-nowrap px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-xs transition border border-white/20 flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.CSV (e-LAAS)</span>
            </button>
          </div>
        </div>

        {/* 3 Steps Workflow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
          <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
            <div className="font-bold text-gold-300 mb-1 flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-gold-500 text-gov-950 flex items-center justify-center text-[11px] font-extrabold">1</span>
              <span>บันทึกงานในระบบตามปกติ</span>
            </div>
            <p className="text-gov-200 text-[11.5px] leading-relaxed">
              เมื่อลงทะเบียนครุภัณฑ์, บันทึกการตรวจรับ, คำนวณค่าเสื่อมราคา หรือจำหน่ายพัสดุในโปรแกรม ข้อมูลทั้งหมดจะวิ่งมารวมคำนวณในระบบรายงานนี้ให้อัตโนมัติทันที
            </p>
          </div>

          <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
            <div className="font-bold text-gold-300 mb-1 flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-gold-500 text-gov-950 flex items-center justify-center text-[11px] font-extrabold">2</span>
              <span>ส่งออกไฟล์ตามโครงสร้าง e-LAAS</span>
            </div>
            <p className="text-gov-200 text-[11.5px] leading-relaxed">
              กดปุ่มดาวน์โหลดไฟล์ (.xlsx หรือ .csv) ไฟล์จะมีคอลัมน์มาตรฐานครบ (รหัสสินทรัพย์ e-LAAS, ชื่อ, หมวด, สำนัก/กอง, ราคาทุน, ค่าเสื่อมสะสม, มูลค่าสุทธิ)
            </p>
          </div>

          <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
            <div className="font-bold text-gold-300 mb-1 flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-gold-500 text-gov-950 flex items-center justify-center text-[11px] font-extrabold">3</span>
              <span>นำเข้า e-LAAS หรือปรับปรุงงบการเงิน</span>
            </div>
            <p className="text-gov-200 text-[11.5px] leading-relaxed">
              เจ้าหน้าที่กองคลังนำไฟล์ไปอัปโหลดในระบบ e-LAAS หรือคัดลอกยอดรวมจากแท็บ <strong>"งบกระทบยอดสินทรัพย์"</strong> ไปบันทึกใบผ่านรายการทั่วไป (JV) ปิดงบสิ้นปีเสนอ สตง.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

