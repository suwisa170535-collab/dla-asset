import React, { useState, useEffect } from 'react';
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Printer,
  Plus,
  Camera,
  Calendar,
  Users,
  Search,
  Check,
  X,
  FileCheck
} from 'lucide-react';
import { formatThaiDate } from '../utils/formatters.js';
import { openPrintWindow, getGarudaSVG, renderGovHeader, renderSignatureItem } from '../utils/printTemplates.js';

export default function AnnualAuditView({ settings, currentUser }) {
  const [audits, setAudits] = useState([]);
  const [activeAudit, setActiveAudit] = useState(null);
  const [auditDetails, setAuditDetails] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scanner Simulator Modal
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [quickStatus, setQuickStatus] = useState('normal');
  const [quickRemark, setQuickRemark] = useState('');

  // New Audit Round Modal
  const [showNewAuditModal, setShowNewAuditModal] = useState(false);
  const [newAuditForm, setNewAuditForm] = useState({
    fiscal_year: Number(settings.fiscal_year) || 2569,
    audit_date: new Date().toISOString().split('T')[0],
    committee_chairman: `${settings.clerk_name || 'นางพิมพา จิตตรง'} (ปลัดเทศบาล - ประธานกรรมการ)`,
    committee_members: 'นายเอกชัย ช่างประดิษฐ์ (ผอ.กองช่าง), นางวราภรณ์ ทรัพย์เพิ่ม (ผอ.กองคลัง), นางสาวนิตยา พัสดุเจริญ (นักวิชาการพัสดุ - เลขานุการ)',
    notes: 'การตรวจสอบพัสดุประจำปีตามระเบียบกระทรวงการคลังฯ พ.ศ. 2560 ข้อ 213'
  });

  // Fetch Audits
  const fetchAudits = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/annual-audits');
      const data = await res.json();
      setAudits(data);
      if (data.length > 0 && !activeAudit) {
        fetchAuditDetails(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditDetails = async (auditId) => {
    try {
      const res = await fetch(`/api/annual-audits/${auditId}`);
      const data = await res.json();
      setActiveAudit(data.audit);
      setAuditDetails(data.items);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  // Record single check
  const handleVerifyAsset = async (assetId, status, remark = '') => {
    if (!activeAudit) return;
    try {
      const payload = {
        asset_id: assetId,
        physical_status: status,
        verified_by: currentUser?.name || 'กรรมการตรวจสอบ',
        remarks: remark,
        actorName: currentUser?.name,
        actorRole: currentUser?.title
      };

      const res = await fetch(`/api/annual-audits/${activeAudit.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchAuditDetails(activeAudit.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Scan by code
  const handleScanSubmit = (e) => {
    e.preventDefault();
    if (!scannedCode) return;

    const matched = auditDetails.find(item =>
      item.asset_code.toLowerCase().includes(scannedCode.toLowerCase().trim())
    );

    if (matched) {
      handleVerifyAsset(matched.asset_id, quickStatus, quickRemark || 'สแกน QR Code ตรวจสอบพบหน้างาน');
      alert(`✅ บันทึกผลตรวจเช็กครุภัณฑ์: ${matched.asset_code} (${matched.name}) เรียบร้อยแล้ว`);
      setScannedCode('');
      setQuickRemark('');
    } else {
      alert(`⚠️ ไม่พบครุภัณฑ์ที่มีรหัส: ${scannedCode} ในระบบ`);
    }
  };

  // Submit New Audit Round
  const handleCreateAudit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newAuditForm,
        actorName: currentUser?.name,
        actorRole: currentUser?.title
      };

      const res = await fetch('/api/annual-audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setShowNewAuditModal(false);
        fetchAudits();
        fetchAuditDetails(data.id);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเปิดรอบตรวจสอบ');
    }
  };

  // Print Official Inspection Sheet
  const handlePrintInspectionReport = () => {
    if (!activeAudit) return;

    const rows = auditDetails.map((item, idx) => `
      <tr style="font-size: 11px;">
        <td class="text-center" style="padding: 3px 2px;">${idx + 1}</td>
        <td class="text-center font-bold font-mono" style="padding: 3px 2px; font-size: 10.5px; color: #1e3a8a;">${item.asset_code}</td>
        <td style="padding: 3px 4px;"><strong>${item.name}</strong></td>
        <td style="padding: 3px 4px; font-size: 10.5px;">${item.department_name}</td>
        <td style="padding: 3px 4px; font-size: 10.5px;">${item.location_room || '-'}</td>
        <td class="text-center font-bold" style="padding: 3px 2px; font-size: 10.5px; color: ${item.physical_status === 'normal' ? '#047857' : '#b91c1c'};">
          ${item.physical_status === 'normal' ? '✓ ปกติ' :
            item.physical_status === 'damaged' ? 'ชำรุด' :
            item.physical_status === 'worn_out' ? 'เสื่อมสภาพ' :
            item.physical_status === 'missing' ? 'หาไม่พบ' : 'รอตรวจ'}
        </td>
        <td style="padding: 3px 4px; font-size: 10px; color: #475569;">${item.remarks || '-'}</td>
      </tr>
    `).join('');

    const orgName = settings.org_name || 'เทศบาลตำบลสุขเกษมพัฒนา';

    // Parse committee members nicely into a numbered list
    const committeeList = [];
    if (activeAudit.committee_chairman) {
      committeeList.push(activeAudit.committee_chairman);
    }
    if (activeAudit.committee_members) {
      if (typeof activeAudit.committee_members === 'string' && activeAudit.committee_members.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(activeAudit.committee_members);
          parsed.forEach(m => {
            if (typeof m === 'object' && m !== null) {
              const name = m.name || '';
              const pos = m.position ? ` (${m.position})` : '';
              committeeList.push(`${name}${pos}`.trim());
            } else {
              committeeList.push(String(m));
            }
          });
        } catch {
          committeeList.push(activeAudit.committee_members);
        }
      } else {
        const parts = activeAudit.committee_members.split(/,|;|\n/).map(s => s.trim()).filter(Boolean);
        parts.forEach(p => committeeList.push(p));
      }
    }

    const extractCleanName = (str, fallback) => {
      if (!str) return fallback;
      const m = str.match(/^([^(]+)/);
      return m ? m[1].trim() : str.trim();
    };

    const chairmanSig = extractCleanName(committeeList[0], settings.clerk_name || 'ประธานกรรมการ');
    const memberSig = extractCleanName(committeeList[1], 'นายเอกชัย ช่างประดิษฐ์');
    const secSig = extractCleanName(committeeList.length > 2 ? committeeList[committeeList.length - 1] : committeeList[2], settings.supply_officer_name || 'นางสาวนิตยา พัสดุเจริญ');

    const isSingle = (auditDetails?.length || 0) <= 10;
    const innerContent = `
      <div class="doc-body">
        ${renderGovHeader(orgName, 'แบบรายงานผลตรวจพัสดุ', 46)}
        <div class="header-title" style="font-size: 16px; margin-top: 2px; margin-bottom: 2px;">รายงานผลการตรวจสอบพัสดุและครุภัณฑ์ ประจำปีงบประมาณ พ.ศ. ${activeAudit.fiscal_year}</div>
        <div class="header-sub" style="font-size: 12.5px; margin-bottom: 6px;">${orgName}</div>
        <div style="font-size: 11px; margin-bottom: 6px; text-align: center; color: #475569;">
          ตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 213 - 214 | วันที่ตรวจนับ: ${formatThaiDate(activeAudit.audit_date)}
        </div>

        <div style="margin-bottom: 6px; font-size: 11px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 4px; line-height: 1.45;">
          <strong>คณะกรรมการตรวจสอบพัสดุประจำปี:</strong> ${committeeList.map((c, i) => `<strong>${i + 1}.</strong> ${c}`).join(' &nbsp;&nbsp;|&nbsp;&nbsp; ')}
        </div>

        <table style="margin-top: 4px; margin-bottom: 6px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="width: 5%; font-size: 11px; padding: 3px 2px;">ที่</th>
              <th style="width: 16%; font-size: 11px; padding: 3px 2px;">รหัสครุภัณฑ์</th>
              <th style="width: 27%; font-size: 11px; padding: 3px 4px;">ชื่อรายการครุภัณฑ์</th>
              <th style="width: 13%; font-size: 11px; padding: 3px 3px;">สำนัก/กอง</th>
              <th style="width: 13%; font-size: 11px; padding: 3px 3px;">สถานที่ตั้ง</th>
              <th style="width: 11%; font-size: 11px; padding: 3px 2px;">ผลตรวจนับ</th>
              <th style="width: 15%; font-size: 11px; padding: 3px 3px;">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>

      <div class="doc-signatures" style="margin-top: 14px;">
        <!-- Audit Committee Signatures -->
        <div class="sig-grid-3" style="gap: 16px; margin-top: 0;">
          ${renderSignatureItem(chairmanSig, 'ประธานกรรมการตรวจสอบพัสดุ', `วันที่ ${formatThaiDate(activeAudit.audit_date)}`, '20px')}
          ${renderSignatureItem(memberSig, 'กรรมการตรวจสอบพัสดุ', `วันที่ ${formatThaiDate(activeAudit.audit_date)}`, '20px')}
          ${renderSignatureItem(secSig, 'กรรมการและเลขานุการ', `วันที่ ${formatThaiDate(activeAudit.audit_date)}`, '20px')}
        </div>

        <!-- Mayor's Endorsement & Directives (ระเบียบฯ ข้อ 214) Side-by-Side Compact Layout -->
        <div style="margin-top: 8px; border: 1.2px solid #000; padding: 8px 12px; border-radius: 4px; page-break-inside: avoid; background: #fff;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div style="flex: 1;">
              <div style="font-weight: bold; font-size: 11.5px; margin-bottom: 4px; color: #1e293b;">
                คำสั่ง / ข้อสั่งการของนายกเทศมนตรี (ตามระเบียบฯ ข้อ 214):
              </div>
              <div style="font-size: 10.5px; line-height: 1.5; color: #334155;">
                <div style="margin-bottom: 3px;">[ &nbsp; ] <strong>ทราบ</strong> รายงานผลการตรวจสอบพัสดุประจำปีงบประมาณ พ.ศ. ${activeAudit.fiscal_year}</div>
                <div style="margin-bottom: 3px;">[ &nbsp; ] <strong>อนุมัติ</strong> ให้ดำเนินการจำหน่ายพัสดุชำรุด/เสื่อมสภาพตามระเบียบฯ ข้อ 215</div>
                <div style="margin-bottom: 3px;">[ &nbsp; ] <strong>มอบหมาย</strong> ให้เจ้าหน้าที่พัสดุจัดทำรายงานขออนุมัติจำหน่ายต่อไป</div>
                <div>[ &nbsp; ] อื่นๆ: ............................................................................................................</div>
              </div>
            </div>
            <div style="width: 230px; text-align: center; flex-shrink: 0; padding-top: 35px;">
              ${renderSignatureItem(settings.mayor_name, 'นายกเทศมนตรี', 'วันที่ ....../....../...........', '24px')}
            </div>
          </div>
        </div>
      </div>
    `;

    const html = isSingle ? `<div class="single-page-wrapper">${innerContent}</div>` : innerContent;

    openPrintWindow(html, `รายงานผลการตรวจสอบพัสดุประจำปี ${activeAudit.fiscal_year}`);
  };

  // Stats for active audit
  const verifiedCount = auditDetails.filter(i => i.physical_status).length;
  const normalCount = auditDetails.filter(i => i.physical_status === 'normal').length;
  const damagedCount = auditDetails.filter(i => i.physical_status === 'damaged').length;
  const missingCount = auditDetails.filter(i => i.physical_status === 'missing').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <QrCode className="w-7 h-7 text-gov-700" />
            <span>ระบบตรวจสอบพัสดุประจำปี (Annual Asset Verification)</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            ตรวจนับทรัพย์สินประจำปีตามระเบียบพัสดุฯ ข้อ 213 สแกน QR Code ตรวจสอบหน้างาน และพิมพ์รายงานเสนอผู้บริหาร
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowScannerModal(true)}
            className="flex items-center space-x-1.5 bg-gold-500 hover:bg-gold-600 text-gov-950 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
          >
            <Camera className="w-4 h-4" />
            <span>สแกน QR Code ตรวจนับ</span>
          </button>
          <button
            onClick={() => setShowNewAuditModal(true)}
            className="flex items-center space-x-1.5 bg-gov-700 hover:bg-gov-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>เปิดรอบตรวจสอบใหม่</span>
          </button>
        </div>
      </div>

      {/* Select Active Round */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-slate-500 uppercase">รอบการตรวจสอบ:</span>
          <select
            value={activeAudit?.id || ''}
            onChange={e => fetchAuditDetails(Number(e.target.value))}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-bold text-gov-800 focus:ring-2 focus:ring-gov-500"
          >
            {audits.map(a => (
              <option key={a.id} value={a.id}>
                รอบปีงบประมาณ {a.fiscal_year} ({a.audit_code}) - {a.status === 'completed' ? 'เสร็จสิ้นแล้ว' : 'กำลังดำเนินการ'}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handlePrintInspectionReport}
          className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition border border-slate-300"
        >
          <Printer className="w-4 h-4" />
          <span>พิมพ์ใบสำรวจ / รายงานผลตรวจนับ</span>
        </button>
      </div>

      {/* Verification KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500">ความคืบหน้าการตรวจ</div>
          <div className="text-xl font-bold text-gov-800 mt-1">
            {verifiedCount} / {auditDetails.length} รายการ
          </div>
          <div className="text-[11px] text-slate-400">
            ({auditDetails.length > 0 ? Math.round((verifiedCount / auditDetails.length) * 100) : 0}%)
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-emerald-600 font-semibold">สภาพปกติ</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{normalCount} รายการ</div>
          <div className="text-[11px] text-slate-400">ใช้งานได้เรียบร้อย</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-amber-600 font-semibold">ชำรุด / เสื่อมสภาพ</div>
          <div className="text-xl font-bold text-amber-700 mt-1">{damagedCount} รายการ</div>
          <div className="text-[11px] text-slate-400">เสนอซ่อมหรือจำหน่าย</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-rose-600 font-semibold">สูญหาย / หาไม่พบ</div>
          <div className="text-xl font-bold text-rose-700 mt-1">{missingCount} รายการ</div>
          <div className="text-[11px] text-slate-400">ต้องสอบสวนข้อเท็จจริง</div>
        </div>
      </div>

      {/* Checklist Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">รหัสครุภัณฑ์</th>
                <th className="py-3 px-4">ชื่อครุภัณฑ์</th>
                <th className="py-3 px-4">สำนัก/กอง & สถานที่</th>
                <th className="py-3 px-4 text-center">สถานะการตรวจ</th>
                <th className="py-3 px-4">หมายเหตุ / ผู้ตรวจ</th>
                <th className="py-3 px-4 text-center">เช็กสถานะรวดเร็ว</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditDetails.map((item) => (
                <tr key={item.asset_id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-gov-800 whitespace-nowrap">
                    {item.asset_code}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {item.name}
                    <div className="text-xs text-slate-400 font-normal">
                      {item.brand} {item.model}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="font-semibold text-slate-800">{item.department_name}</div>
                    <div className="text-slate-400">ห้อง: {item.location_room || '-'}</div>
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {item.physical_status === 'normal' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> ปกติ
                      </span>
                    )}
                    {item.physical_status === 'damaged' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" /> ชำรุด
                      </span>
                    )}
                    {item.physical_status === 'worn_out' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                        เสื่อมสภาพ
                      </span>
                    )}
                    {item.physical_status === 'missing' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        หาไม่พบ
                      </span>
                    )}
                    {!item.physical_status && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                        รอตรวจนับ
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="text-slate-700">{item.remarks || '-'}</div>
                    {item.verified_by && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        ผู้ตรวจ: {item.verified_by} ({item.verified_at})
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => handleVerifyAsset(item.asset_id, 'normal', 'ตรวจสอบแล้ว สภาพดี')}
                        title="ทำเครื่องหมายว่าปกติ"
                        className={`p-1.5 rounded-lg border transition ${
                          item.physical_status === 'normal'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleVerifyAsset(item.asset_id, 'damaged', 'ตรวจพบอาการชำรุด')}
                        title="ทำเครื่องหมายว่าชำรุด"
                        className={`p-1.5 rounded-lg border transition ${
                          item.physical_status === 'damaged'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleVerifyAsset(item.asset_id, 'missing', 'ไม่พบตัวทรัพย์สินในพื้นที่')}
                        title="ทำเครื่องหมายว่าหาไม่พบ"
                        className={`p-1.5 rounded-lg border transition ${
                          item.physical_status === 'missing'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                        }`}
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: QR CODE SCANNER (สแกนตรวจนับครุภัณฑ์หน้างาน) */}
      {/* ------------------------------------------------------------- */}
      {showScannerModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full my-auto p-6 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Camera className="w-6 h-6 text-gov-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">สแกน QR Code / บาร์โค้ด ตรวจนับ</h2>
                  <p className="text-xs text-slate-500">ใช้สแกนเนอร์หรือป้อนรหัสครุภัณฑ์เพื่อเช็กสภาพทันที</p>
                </div>
              </div>
              <button
                onClick={() => setShowScannerModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visual Scanner Camera simulation box */}
            <div className="relative bg-slate-950 rounded-2xl p-6 text-center text-white mb-4 overflow-hidden border-2 border-dashed border-gov-500">
              <div className="w-40 h-40 mx-auto border-2 border-emerald-400 rounded-xl relative flex items-center justify-center">
                <div className="w-full h-0.5 bg-emerald-400 absolute top-1/2 -translate-y-1/2 animate-pulse shadow-lg shadow-emerald-500"></div>
                <QrCode className="w-20 h-20 text-slate-600" />
              </div>
              <p className="text-xs text-slate-400 mt-3">นำกล้องมือถือ/แท็บเล็ต หรือเครื่องสแกน ยิงไปที่ป้ายสติกเกอร์</p>
            </div>

            <form onSubmit={handleScanSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">รหัสครุภัณฑ์ (สแกนหรือพิมพ์) *</label>
                <input
                  type="text"
                  placeholder="เช่น ค.01/2567/001"
                  value={scannedCode}
                  onChange={e => setScannedCode(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono font-bold text-gov-800 focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">สภาพที่พบหน้างาน *</label>
                <select
                  value={quickStatus}
                  onChange={e => setQuickStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-gov-500"
                >
                  <option value="normal">สภาพปกติ พร้อมใช้งาน</option>
                  <option value="damaged">ชำรุด ต้องส่งซ่อม</option>
                  <option value="worn_out">เสื่อมสภาพ เสนอแทงจำหน่าย</option>
                  <option value="missing">หาไม่พบ / สูญหาย</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ข้อสังเกต / สถานที่พบ</label>
                <input
                  type="text"
                  placeholder="เช่น พบที่ห้องประชาสัมพันธ์ ชั้น 1"
                  value={quickRemark}
                  onChange={e => setQuickRemark(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowScannerModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50"
                >
                  ปิด
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  บันทึกผลการตรวจนับ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: NEW AUDIT ROUND (เปิดรอบตรวจสอบประจำปี) */}
      {/* ------------------------------------------------------------- */}
      {showNewAuditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full my-auto p-6 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-6 h-6 text-gov-700" />
                <h2 className="text-lg font-bold text-slate-900">เปิดรอบการตรวจสอบพัสดุประจำปีใหม่</h2>
              </div>
              <button
                onClick={() => setShowNewAuditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAudit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ปีงบประมาณ พ.ศ. *</label>
                  <input
                    type="number"
                    value={newAuditForm.fiscal_year}
                    onChange={e => setNewAuditForm({ ...newAuditForm, fiscal_year: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วันที่เริ่มตรวจสอบ *</label>
                  <input
                    type="date"
                    value={newAuditForm.audit_date}
                    onChange={e => setNewAuditForm({ ...newAuditForm, audit_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ประธานกรรมการตรวจสอบ *</label>
                <input
                  type="text"
                  value={newAuditForm.committee_chairman}
                  onChange={e => setNewAuditForm({ ...newAuditForm, committee_chairman: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">รายชื่อกรรมการตรวจสอบ</label>
                <textarea
                  rows={2}
                  value={newAuditForm.committee_members}
                  onChange={e => setNewAuditForm({ ...newAuditForm, committee_members: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุ / คำสั่งแต่งตั้ง</label>
                <input
                  type="text"
                  value={newAuditForm.notes}
                  onChange={e => setNewAuditForm({ ...newAuditForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewAuditModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  เริ่มรอบการตรวจสอบ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

