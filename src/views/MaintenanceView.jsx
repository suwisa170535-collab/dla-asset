import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  FileText,
  DollarSign,
  User,
  Building,
  AlertTriangle,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { formatBaht, formatThaiDate, REPAIR_STATUS_MAP } from '../utils/formatters.js';

export default function MaintenanceView({ currentUser }) {
  const [records, setRecords] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const handleConvertToDisposal = async (rec) => {
    if (!window.confirm(`ยืนยันการส่งเรื่องขอจำหน่ายพัสดุ "${rec.asset_name}" (${rec.asset_code})?\n\nเนื่องจากค่าซ่อมสะสมอยู่ที่ ${rec.repair_ratio_pct}% ของราคาทุนเดิม ซึ่งเกินเกณฑ์ความคุ้มค่าตามระเบียบกระทรวงการคลังฯ พ.ศ. 2560 ข้อ 215`)) {
      return;
    }
    try {
      const res = await fetch(`/api/maintenance/${rec.id}/convert-to-disposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorName: currentUser?.name,
          actorRole: currentUser?.title
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('✅ ' + data.message);
        fetchRecords();
      } else {
        alert('❌ เกิดข้อผิดพลาด: ' + (data.error || 'ไม่สามารถดำเนินการได้'));
      }
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  // Form State: Report Damage
  const [reportForm, setReportForm] = useState({
    asset_id: '',
    report_date: new Date().toISOString().split('T')[0],
    reporter_name: currentUser?.name || 'นายสายชล แดงดี',
    symptom: '',
    repair_vendor: '',
    spare_parts: '',
    repair_cost: ''
  });

  // Form State: Update Ticket
  const [updateForm, setUpdateForm] = useState({
    status: 'inspecting',
    repair_vendor: '',
    spare_parts: '',
    repair_cost: '',
    completion_date: '',
    notes: ''
  });

  // Fetch Tickets
  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/maintenance?${params.toString()}`);
      const data = await res.json();
      setRecords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Assets for selection
  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets');
      const data = await res.json();
      setAssets(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchAssets();
  }, [statusFilter]);

  // Submit Report Damage
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportForm.asset_id) {
      alert('กรุณาเลือกครุภัณฑ์ที่ต้องการแจ้งซ่อม');
      return;
    }

    try {
      const payload = {
        ...reportForm,
        asset_id: Number(reportForm.asset_id),
        actorName: currentUser?.name,
        actorRole: currentUser?.title
      };

      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchRecords();
        setReportForm({
          asset_id: '',
          report_date: new Date().toISOString().split('T')[0],
          reporter_name: currentUser?.name || 'นายสายชล แดงดี',
          symptom: '',
          repair_vendor: '',
          spare_parts: '',
          repair_cost: ''
        });
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกแจ้งซ่อม');
    }
  };

  // Open Update Modal
  const openUpdateModal = (ticket) => {
    setSelectedTicket(ticket);
    setUpdateForm({
      status: ticket.status,
      repair_vendor: ticket.repair_vendor || '',
      spare_parts: ticket.spare_parts || '',
      repair_cost: ticket.repair_cost || '',
      completion_date: ticket.completion_date || (ticket.status === 'completed' ? new Date().toISOString().split('T')[0] : ''),
      notes: ticket.notes || ''
    });
    setShowUpdateModal(true);
  };

  // Submit Ticket Update
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      const payload = {
        ...updateForm,
        actorName: currentUser?.name,
        actorRole: currentUser?.title
      };

      const res = await fetch(`/api/maintenance/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowUpdateModal(false);
        fetchRecords();
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <Wrench className="w-7 h-7 text-gov-700" />
            <span>ระบบตรวจสภาพและซ่อมบำรุงครุภัณฑ์ (Maintenance & Repair)</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            บันทึกประวัติการชำรุด ติดตามสถานะงานซ่อม การเปลี่ยนอะไหล่ ค่าใช้จ่าย และปรับปรุงสถานะทรัพย์สินอัตโนมัติ
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 bg-gov-700 hover:bg-gov-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>แจ้งซ่อมครุภัณฑ์</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        {[
          { id: '', label: 'ทั้งหมด' },
          { id: 'reported', label: 'แจ้งซ่อมแล้ว' },
          { id: 'inspecting', label: 'ตรวจสภาพ/รออะไหล่' },
          { id: 'in_progress', label: 'กำลังส่งซ่อม' },
          { id: 'completed', label: 'ซ่อมเสร็จใช้งานได้' },
          { id: 'unrepairable', label: 'ซ่อมไม่ได้ เสนอจำหน่าย' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === tab.id
                ? 'bg-gov-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl p-10 text-center text-slate-400 border border-slate-200">
            กำลังโหลดข้อมูลการซ่อม...
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center text-slate-400 border border-slate-200">
            ไม่พบประวัติการแจ้งซ่อมในสถานะนี้
          </div>
        ) : (
          records.map((rec) => {
            const statusInfo = REPAIR_STATUS_MAP[rec.status] || { label: rec.status, color: 'bg-slate-100 text-slate-700' };
            return (
              <div key={rec.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-bold text-base text-gov-800">{rec.ticket_number}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      ครุภัณฑ์: <strong className="text-slate-900">{rec.asset_name}</strong> (รหัส: <span className="font-mono text-gov-700 font-semibold">{rec.asset_code}</span>) |
                      สังกัด: {rec.department_name}
                    </div>
                  </div>

                  <button
                    onClick={() => openUpdateModal(rec)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-gov-50 hover:bg-gov-100 text-gov-800 rounded-xl text-xs font-bold border border-gov-200 transition"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>อัปเดตผลการซ่อม</span>
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-slate-500">อาการชำรุดที่พบ:</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{rec.symptom}</div>
                    <div className="text-slate-400 mt-1">ผู้แจ้ง: {rec.reporter_name} ({formatThaiDate(rec.report_date)})</div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <div>
                      ผู้ซ่อม/ร้านค้า: <strong className="text-slate-700">{rec.repair_vendor || '-'}</strong>
                    </div>
                    <div>
                      อะไหล่ที่ใช้: <span className="text-slate-600">{rec.spare_parts || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                      <span>ค่าใช้จ่ายในการซ่อม:</span>
                      <strong className="text-sm font-bold text-slate-900">{formatBaht(rec.repair_cost)}</strong>
                    </div>
                    {rec.completion_date && (
                      <div className="text-emerald-700 font-medium text-[11px]">
                        ซ่อมเสร็จสิ้นเมื่อ: {formatThaiDate(rec.completion_date)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Repair vs Replacement Benchmark Bar (ตามระเบียบข้อ 215) */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-500">เกณฑ์ความคุ้มค่า (ข้อ 215):</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      rec.is_unviable 
                        ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      ค่าซ่อมสะสม {formatBaht(rec.total_repair_cost || 0)} ({rec.repair_ratio_pct}% ของราคาทุน)
                    </span>
                    {rec.is_unviable && (
                      <span className="inline-flex items-center space-x-1 text-rose-600 font-semibold text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        <span>เกินเกณฑ์ 50% แนะนำเสนอจำหน่าย</span>
                      </span>
                    )}
                  </div>

                  {rec.is_unviable && rec.status !== 'unrepairable' && (
                    <button
                      onClick={() => handleConvertToDisposal(rec)}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                      title="ส่งเรื่องขอจำหน่ายพัสดุตามระเบียบพัสดุฯ พ.ศ. 2560 ข้อ 215"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>ส่งเรื่องขอจำหน่ายพัสดุ (ข้อ 215)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: REPORT DAMAGE (แจ้งซ่อมครุภัณฑ์) */}
      {/* ------------------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full my-auto p-6 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Wrench className="w-6 h-6 text-gov-700" />
                <h2 className="text-lg font-bold text-slate-900">แจ้งซ่อมครุภัณฑ์</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เลือกครุภัณฑ์ที่ชำรุด *</label>
                <select
                  value={reportForm.asset_id}
                  onChange={e => setReportForm({ ...reportForm, asset_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                >
                  <option value="">-- เลือกครุภัณฑ์ --</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.asset_code} : {a.name} ({a.department_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วันที่แจ้ง *</label>
                  <input
                    type="date"
                    value={reportForm.report_date}
                    onChange={e => setReportForm({ ...reportForm, report_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ผู้แจ้ง *</label>
                  <input
                    type="text"
                    value={reportForm.reporter_name}
                    onChange={e => setReportForm({ ...reportForm, reporter_name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">อาการชำรุด / ปัญหาที่พบ *</label>
                <textarea
                  rows={3}
                  placeholder="ระบุอาการชำรุด เช่น เครื่องเปิดไม่ติด, สายพานขาด, มีควันและเสียงดังผิดปกติ"
                  value={reportForm.symptom}
                  onChange={e => setReportForm({ ...reportForm, symptom: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  บันทึกใบแจ้งซ่อม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: UPDATE REPAIR TICKET (อัปเดตผลการซ่อม/ค่าใช้จ่าย) */}
      {/* ------------------------------------------------------------- */}
      {showUpdateModal && selectedTicket && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full my-auto p-6 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Wrench className="w-6 h-6 text-gov-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">อัปเดตสถานะและผลการซ่อมบำรุง</h2>
                  <p className="text-xs text-slate-500">ใบแจ้งซ่อม: {selectedTicket.ticket_number}</p>
                </div>
              </div>
              <button
                onClick={() => setShowUpdateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">สถานะงานซ่อม *</label>
                <select
                  value={updateForm.status}
                  onChange={e => setUpdateForm({ ...updateForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500 font-semibold"
                >
                  <option value="reported">แจ้งซ่อมแล้ว</option>
                  <option value="inspecting">ตรวจสภาพ/รออะไหล่</option>
                  <option value="in_progress">กำลังส่งซ่อม</option>
                  <option value="completed">ซ่อมเสร็จใช้งานได้ปกติ</option>
                  <option value="unrepairable">ซ่อมไม่ได้ เสนอแทงจำหน่าย</option>
                </select>
                <div className="text-[11px] text-slate-500 mt-1">
                  * หากเลือก "ซ่อมเสร็จ" ครุภัณฑ์จะกลับมาใช้งานปกติ, หากเลือก "ซ่อมไม่ได้" ระบบจะเปลี่ยนสถานะเป็นรอจำหน่าย
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ผู้ดำเนินการซ่อม / ร้านค้า / อู่</label>
                <input
                  type="text"
                  placeholder="เช่น อู่ช่างเล็กการเกษตร หรือ บริษัทเซอร์วิส"
                  value={updateForm.repair_vendor}
                  onChange={e => setUpdateForm({ ...updateForm, repair_vendor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">รายการอะไหล่ที่เปลี่ยน</label>
                <input
                  type="text"
                  placeholder="เช่น หัวเทียน, ซีลยาง, สายไฮดรอลิก"
                  value={updateForm.spare_parts}
                  onChange={e => setUpdateForm({ ...updateForm, spare_parts: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ค่าใช้จ่ายในการซ่อม (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={updateForm.repair_cost}
                    onChange={e => setUpdateForm({ ...updateForm, repair_cost: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วันที่ซ่อมเสร็จสิ้น</label>
                  <input
                    type="date"
                    value={updateForm.completion_date}
                    onChange={e => setUpdateForm({ ...updateForm, completion_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  บันทึกการอัปเดต
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

