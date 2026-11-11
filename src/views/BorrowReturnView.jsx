import React, { useState, useEffect } from 'react';
import {
  Handshake,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Printer,
  X,
  Phone,
  Building,
  User,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { formatThaiDate, BORROW_STATUS_MAP } from '../utils/formatters.js';
import { generateBorrowVoucherHTML, openPrintWindow } from '../utils/printTemplates.js';

export default function BorrowReturnView({ settings, currentUser }) {
  const [borrows, setBorrows] = useState([]);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedBorrowForReturn, setSelectedBorrowForReturn] = useState(null);

  // Form: Borrow
  const [borrowForm, setBorrowForm] = useState({
    asset_id: '',
    borrower_name: currentUser?.name || '',
    borrower_position: '',
    borrower_department: '',
    borrower_phone: '',
    purpose: '',
    borrow_date: new Date().toISOString().split('T')[0],
    expected_return_date: '',
    notes: ''
  });

  // Form: Return
  const [returnForm, setReturnForm] = useState({
    actual_return_date: new Date().toISOString().split('T')[0],
    return_condition: 'normal',
    notes: ''
  });

  const fetchBorrows = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`/api/borrows?${params.toString()}`);
      const data = await res.json();
      setBorrows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets?status=active');
      const data = await res.json();
      // ไม่รวมที่ดินและอาคารสิ่งปลูกสร้าง (ไม่สามารถยืมยกไปใช้งานภายนอกได้)
      const borrowable = Array.isArray(data)
        ? data.filter(a => a.category_id !== 10 && !a.asset_code?.startsWith('สท.'))
        : [];
      setAvailableAssets(borrowable);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBorrows();
    fetchAssets();
  }, [statusFilter, searchTerm]);

  // Submit Borrow
  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    if (!borrowForm.asset_id) {
      alert('กรุณาเลือกครุภัณฑ์ที่ต้องการยืม');
      return;
    }

    try {
      const payload = {
        ...borrowForm,
        actorName: currentUser?.name,
        actorRole: currentUser?.title
      };

      const res = await fetch('/api/borrows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowBorrowModal(false);
        fetchBorrows();
        fetchAssets();
        setBorrowForm({
          asset_id: '',
          borrower_name: currentUser?.name || '',
          borrower_position: '',
          borrower_department: '',
          borrower_phone: '',
          purpose: '',
          borrow_date: new Date().toISOString().split('T')[0],
          expected_return_date: '',
          notes: ''
        });
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกการยืม');
    }
  };

  // Open Return Modal
  const openReturnModal = (item) => {
    setSelectedBorrowForReturn(item);
    setReturnForm({
      actual_return_date: new Date().toISOString().split('T')[0],
      return_condition: 'normal',
      notes: ''
    });
    setShowReturnModal(true);
  };

  // Submit Return
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBorrowForReturn) return;

    try {
      const payload = {
        ...returnForm,
        actorName: currentUser?.name,
        actorRole: currentUser?.title
      };

      const res = await fetch(`/api/borrows/${selectedBorrowForReturn.id}/return`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowReturnModal(false);
        fetchBorrows();
        fetchAssets();
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกการส่งคืน');
    }
  };

  // Print Borrow Voucher
  const handlePrint = (item) => {
    const html = generateBorrowVoucherHTML(item, settings);
    openPrintWindow(html, `ใบยืมพัสดุราชการ_${item.borrow_code}`);
  };

  // Stats
  const activeCount = borrows.filter(b => b.status === 'borrowed').length;
  const overdueCount = borrows.filter(b => b.is_overdue).length;
  const returnedCount = borrows.filter(b => b.status === 'returned').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <Handshake className="w-7 h-7 text-gov-700" />
            <span>ระบบยืม - คืน ครุภัณฑ์และพัสดุ (Borrow & Return System)</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            ควบคุมการยืมของไปจัดกิจกรรม ชุมชน ประชุมสภา ติดตามกำหนดส่งคืน ป้องกันของหลวงสูญหาย
          </p>
        </div>
        <button
          onClick={() => setShowBorrowModal(true)}
          className="flex items-center space-x-2 bg-gov-700 hover:bg-gov-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>บันทึกการยืมครุภัณฑ์</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 uppercase font-bold">ครุภัณฑ์ที่กำลังถูกยืม</div>
            <div className="text-2xl font-bold text-amber-700 mt-1">{activeCount} รายการ</div>
            <div className="text-[11px] text-slate-400">อยู่ระหว่างใช้งานนอกสถานที่</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Handshake className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 uppercase font-bold">เกินกำหนดส่งคืน (Overdue)</div>
            <div className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-700'}`}>
              {overdueCount} รายการ
            </div>
            <div className="text-[11px] text-slate-400">ต้องติดตามทวงถามด่วน</div>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${overdueCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 uppercase font-bold">ส่งคืนเรียบร้อยแล้ว</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{returnedCount} รายการ</div>
            <div className="text-[11px] text-slate-400">ตรวจรับคืนสภาพสมบูรณ์</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่ใบยืม, ผู้ยืม, รหัส หรือชื่อครุภัณฑ์..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gov-500"
          />
        </div>

        <div className="flex space-x-2 w-full sm:w-auto">
          {[
            { id: '', label: 'ทั้งหมด' },
            { id: 'borrowed', label: 'กำลังยืมอยู่' },
            { id: 'overdue', label: 'เกินกำหนดส่ง' },
            { id: 'returned', label: 'ส่งคืนแล้ว' },
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
      </div>

      {/* Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="hidden md:block">
          <table className="w-full text-left text-sm table-auto">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="py-3 px-3.5 w-[28%]">ใบยืม / ครุภัณฑ์ที่ยืม</th>
                <th className="py-3 px-3.5 w-[32%]">ผู้ยืม / สังกัด &amp; วัตถุประสงค์</th>
                <th className="py-3 px-3.5 text-center w-36 whitespace-nowrap">วันที่ยืม - กำหนดคืน</th>
                <th className="py-3 px-3.5 text-center w-32 whitespace-nowrap">สถานะ</th>
                <th className="py-3 px-3.5 text-center w-32 whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-400">
                    กำลังโหลดข้อมูลการยืม-คืน...
                  </td>
                </tr>
              ) : borrows.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-400">
                    ไม่พบรายการยืม-คืนในเงื่อนไขนี้
                  </td>
                </tr>
              ) : (
                borrows.map((b) => {
                  const isOverdue = b.is_overdue;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition align-top">
                      <td className="py-3.5 px-3.5">
                        <div className="font-mono text-xs font-bold text-gov-800">{b.borrow_code}</div>
                        <div className="font-bold text-slate-900 leading-snug mt-0.5">{b.asset_name}</div>
                        <div className="text-xs font-mono text-gov-700 font-semibold mt-0.5">{b.asset_code}</div>
                        {(b.brand || b.model) && (
                          <div className="text-[11px] text-slate-400">{b.brand} {b.model}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-xs">
                        <div className="font-bold text-slate-800">{b.borrower_name}</div>
                        <div className="text-slate-500">
                          {b.borrower_department || '-'}
                          {b.borrower_phone ? ` • 📞 ${b.borrower_phone}` : ''}
                        </div>
                        {b.purpose && (
                          <div className="text-slate-600 mt-1 line-clamp-2 leading-snug">
                            เหตุผล: {b.purpose}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-center text-xs whitespace-nowrap">
                        <div className="text-slate-700 font-medium">{formatThaiDate(b.borrow_date)}</div>
                        <div className={`text-[11px] font-semibold mt-0.5 ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                          ถึง {formatThaiDate(b.expected_return_date)} {isOverdue && '(เลยกำหนด)'}
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        {b.status === 'returned' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> ส่งคืนแล้ว
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> เกินกำหนดคืน
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3.5 h-3.5 mr-1" /> อยู่ระหว่างยืม
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          {b.status === 'borrowed' && (
                            <button
                              onClick={() => openReturnModal(b)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs border border-emerald-200 transition"
                            >
                              รับคืนของ
                            </button>
                          )}
                          <button
                            onClick={() => handlePrint(b)}
                            title="พิมพ์ใบยืม-คืนพัสดุราชการ"
                            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">กำลังโหลดข้อมูลการยืม-คืน...</div>
          ) : borrows.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">ไม่พบรายการยืม-คืนในเงื่อนไขนี้</div>
          ) : (
            borrows.map((b) => {
              const isOverdue = b.is_overdue;
              return (
                <div key={b.id} className="p-4 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold text-gov-800">{b.borrow_code}</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">{b.asset_name}</div>
                      <div className="font-mono text-gov-700 font-semibold">{b.asset_code}</div>
                    </div>
                    <div className="shrink-0">
                      {b.status === 'returned' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">ส่งคืนแล้ว</span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">เกินกำหนดคืน</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">อยู่ระหว่างยืม</span>
                      )}
                    </div>
                  </div>
                  <div className="text-slate-600 space-y-0.5">
                    <div><span className="font-semibold text-slate-800">{b.borrower_name}</span> ({b.borrower_department || '-'})</div>
                    {b.purpose && <div>วัตถุประสงค์: {b.purpose}</div>}
                    <div className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                      ยืม {formatThaiDate(b.borrow_date)} ถึง {formatThaiDate(b.expected_return_date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {b.status === 'borrowed' && (
                      <button
                        onClick={() => openReturnModal(b)}
                        className="flex-1 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-200"
                      >
                        รับคืนของ
                      </button>
                    )}
                    <button
                      onClick={() => handlePrint(b)}
                      className="flex-1 py-1.5 text-slate-700 bg-slate-50 rounded-lg border border-slate-200 font-semibold flex items-center justify-center space-x-1"
                    >
                      <Printer className="w-3.5 h-3.5" /><span>พิมพ์ใบยืม-คืน</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: BORROW ASSET (บันทึกการยืม) */}
      {/* ------------------------------------------------------------- */}
      {showBorrowModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full my-auto p-6 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Handshake className="w-6 h-6 text-gov-700" />
                <h2 className="text-lg font-bold text-slate-900">บันทึกการยืมครุภัณฑ์ทางราชการ</h2>
              </div>
              <button
                onClick={() => setShowBorrowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBorrowSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เลือกครุภัณฑ์ที่ต้องการยืม *</label>
                <select
                  value={borrowForm.asset_id}
                  onChange={e => setBorrowForm({ ...borrowForm, asset_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500 font-medium"
                >
                  <option value="">-- เลือกครุภัณฑ์ (เฉพาะสถานะพร้อมใช้งาน) --</option>
                  {availableAssets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.asset_code} : {a.name} ({a.department_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อ-สกุล ผู้ขอยืม *</label>
                  <input
                    type="text"
                    placeholder="เช่น นายประสิทธิ์ สอนดี"
                    value={borrowForm.borrower_name}
                    onChange={e => setBorrowForm({ ...borrowForm, borrower_name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ตำแหน่ง</label>
                  <input
                    type="text"
                    placeholder="เช่น ผอ.กองการศึกษา"
                    value={borrowForm.borrower_position}
                    onChange={e => setBorrowForm({ ...borrowForm, borrower_position: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สังกัดสำนัก/กอง/หน่วยงาน</label>
                  <input
                    type="text"
                    placeholder="เช่น กองการศึกษาฯ"
                    value={borrowForm.borrower_department}
                    onChange={e => setBorrowForm({ ...borrowForm, borrower_department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
                  <input
                    type="text"
                    placeholder="เช่น 081-9988221"
                    value={borrowForm.borrower_phone}
                    onChange={e => setBorrowForm({ ...borrowForm, borrower_phone: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วันที่ยืม *</label>
                  <input
                    type="date"
                    value={borrowForm.borrow_date}
                    onChange={e => setBorrowForm({ ...borrowForm, borrow_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">กำหนดส่งคืนภายในวันที่ *</label>
                  <input
                    type="date"
                    value={borrowForm.expected_return_date}
                    onChange={e => setBorrowForm({ ...borrowForm, expected_return_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-gov-800 focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">วัตถุประสงค์ในการยืมไปใช้งาน *</label>
                  <textarea
                    rows={2}
                    placeholder="เช่น ใช้จัดงานประเพณีลอยกระทง หรือ ใช้ประชุมสัมมนาประจำปี"
                    value={borrowForm.purpose}
                    onChange={e => setBorrowForm({ ...borrowForm, purpose: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">อุปกรณ์ส่วนควบ / หมายเหตุ</label>
                  <input
                    type="text"
                    placeholder="เช่น พร้อมสายชาร์จ กระเป๋า หรือ แบตเตอรี่ 2 ก้อน"
                    value={borrowForm.notes}
                    onChange={e => setBorrowForm({ ...borrowForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBorrowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  บันทึกการยืม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: RETURN ASSET (บันทึกรับคืน) */}
      {/* ------------------------------------------------------------- */}
      {showReturnModal && selectedBorrowForReturn && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full my-auto p-6 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">บันทึกรับคืนครุภัณฑ์</h2>
                  <p className="text-xs text-slate-500">ใบยืม: {selectedBorrowForReturn.borrow_code}</p>
                </div>
              </div>
              <button
                onClick={() => setShowReturnModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs mb-4 space-y-1">
              <div>ครุภัณฑ์: <strong className="text-slate-900">{selectedBorrowForReturn.asset_name}</strong> ({selectedBorrowForReturn.asset_code})</div>
              <div>ผู้ยืม: <strong className="text-slate-800">{selectedBorrowForReturn.borrower_name}</strong></div>
              <div>กำหนดส่งคืนเดิม: {formatThaiDate(selectedBorrowForReturn.expected_return_date)}</div>
            </div>

            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">วันที่ส่งคืนจริง *</label>
                <input
                  type="date"
                  value={returnForm.actual_return_date}
                  onChange={e => setReturnForm({ ...returnForm, actual_return_date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">สภาพของตอนรับคืน *</label>
                <select
                  value={returnForm.return_condition}
                  onChange={e => setReturnForm({ ...returnForm, return_condition: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-gov-500"
                >
                  <option value="normal">✅ สภาพปกติ สมบูรณ์พร้อมใช้งาน</option>
                  <option value="damaged">⚠️ ชำรุดเสียหาย (ส่งเข้างานซ่อมบำรุง)</option>
                  <option value="lost">❌ สูญหาย</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุการรับคืน</label>
                <input
                  type="text"
                  placeholder="เช่น อุปกรณ์ส่งคืนครบถ้วน ตรวจสอบเปิดติดปกติ"
                  value={returnForm.notes}
                  onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  ยืนยันการรับคืน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

