import React, { useState, useEffect } from 'react';
import {
  Trash2,
  Plus,
  Search,
  DollarSign,
  FileText,
  Calendar,
  CheckCircle2,
  X,
  Building,
  ArrowRight,
  Printer
} from 'lucide-react';
import { formatBaht, formatThaiDate, DISPOSAL_METHOD_MAP } from '../utils/formatters.js';
import { generateDisposalVoucherHTML, openPrintWindow } from '../utils/printTemplates.js';

export default function DisposalView({ settings, currentUser }) {
  const [disposals, setDisposals] = useState([]);
  const [pendingAssets, setPendingAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [form, setForm] = useState({
    asset_id: '',
    disposal_method: 'auction',
    disposal_date: new Date().toISOString().split('T')[0],
    approved_order_no: `คำสั่งเทศบาลตำบล ที่ .../2569`,
    approved_by: `${settings.mayor_name || 'นายสมศักดิ์ วัฒนากูล'} (นายกเทศมนตรี)`,
    sale_proceeds: '',
    transfer_to: '',
    notes: ''
  });

  // Fetch Disposals
  const fetchDisposals = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/disposals');
      const data = await res.json();
      setDisposals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Assets eligible for disposal (damaged or pending_disposal)
  const fetchPendingAssets = async () => {
    try {
      const res = await fetch('/api/assets');
      const data = await res.json();
      // Filter items marked as pending_disposal, damaged or any active that needs write-off
      const eligible = data.filter(a => a.status !== 'disposed');
      setPendingAssets(eligible);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDisposals();
    fetchPendingAssets();
  }, []);

  // Submit Disposal
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.asset_id) {
      alert('กรุณาเลือกครุภัณฑ์ที่ต้องการแทงจำหน่าย');
      return;
    }

    try {
      const payload = {
        ...form,
        asset_id: Number(form.asset_id),
        actorName: currentUser?.name,
        actorRole: currentUser?.title
      };

      const res = await fetch('/api/disposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchDisposals();
        fetchPendingAssets();
        setForm({
          asset_id: '',
          disposal_method: 'auction',
          disposal_date: new Date().toISOString().split('T')[0],
          approved_order_no: `คำสั่งเทศบาลตำบล ที่ .../2569`,
          approved_by: `${settings.mayor_name || 'นายสมศักดิ์ วัฒนากูล'} (นายกเทศมนตรี)`,
          sale_proceeds: '',
          transfer_to: '',
          notes: ''
        });
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกการแทงจำหน่าย');
    }
  };

  const totalProceeds = disposals.reduce((sum, d) => sum + (d.sale_proceeds || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <Trash2 className="w-7 h-7 text-gov-700" />
            <span>ระบบจำหน่ายพัสดุ (Asset Disposal & Write-off)</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            บันทึกการแทงจำหน่ายครุภัณฑ์เสื่อมสภาพตามระเบียบพัสดุภาครัฐ พ.ศ. 2560 (ขายทอดตลาด, โอน, บริจาค, แปรสภาพ/ทำลาย)
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 bg-gov-700 hover:bg-gov-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>บันทึกการแทงจำหน่าย</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 uppercase font-bold">ครุภัณฑ์ที่แทงจำหน่ายแล้ว</div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{disposals.length} รายการ</div>
          <div className="text-xs text-slate-400 mt-1">ตัดออกจากทะเบียนสินทรัพย์</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 uppercase font-bold">เงินรายได้จากการขายทอดตลาด</div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{formatBaht(totalProceeds)}</div>
          <div className="text-xs text-slate-400 mt-1">นำส่งเป็นรายได้แผ่นดิน/เทศบาล</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 uppercase font-bold">ครุภัณฑ์รอการจำหน่าย</div>
          <div className="text-2xl font-bold text-purple-700 mt-2">
            {pendingAssets.filter(a => a.status === 'pending_disposal').length} รายการ
          </div>
          <div className="text-xs text-slate-400 mt-1">เตรียมเสนอตั้งคณะกรรมการประเมิน</div>
        </div>
      </div>

      {/* Disposals List Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="hidden md:block">
          <table className="w-full text-left text-sm table-auto">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="py-3 px-3.5 w-[30%]">รายการจำหน่าย &amp; วิธีการ</th>
                <th className="py-3 px-3.5 w-[24%]">คำสั่งอนุมัติ / วันที่</th>
                <th className="py-3 px-3.5 text-right w-28 whitespace-nowrap">เงินที่ได้จากการขาย</th>
                <th className="py-3 px-3.5 w-[24%]">ผู้รับโอน / หมายเหตุ</th>
                <th className="py-3 px-3.5 text-center w-32 whitespace-nowrap">จัดการ / พิมพ์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-400">
                    กำลังโหลดข้อมูลการจำหน่าย...
                  </td>
                </tr>
              ) : disposals.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-400">
                    ยังไม่มีรายการแทงจำหน่าย
                  </td>
                </tr>
              ) : (
                disposals.map((disp) => {
                  const method = DISPOSAL_METHOD_MAP[disp.disposal_method] || { label: disp.disposal_method };
                  return (
                    <tr key={disp.id} className="hover:bg-slate-50/80 transition align-top">
                      <td className="py-3.5 px-3.5">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="font-mono text-xs font-bold text-gov-800">{disp.disposal_number}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                            {method.label}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 leading-snug">{disp.asset_name}</div>
                        <div className="text-xs font-mono text-slate-500 font-semibold mt-0.5">{disp.asset_code}</div>
                        <div className="text-[11px] text-slate-400">ราคาทุนเดิม: {formatBaht(disp.cost_price)}</div>
                      </td>
                      <td className="py-3.5 px-3.5 text-xs">
                        <div className="font-semibold text-slate-800 leading-snug">{disp.approved_order_no}</div>
                        <div className="text-slate-500 mt-0.5">อนุมัติโดย: {disp.approved_by}</div>
                        <div className="text-slate-400">วันที่: {formatThaiDate(disp.disposal_date)}</div>
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-bold text-emerald-600 whitespace-nowrap">
                        {disp.sale_proceeds > 0 ? formatBaht(disp.sale_proceeds) : '-'}
                      </td>
                      <td className="py-3.5 px-3.5 text-xs text-slate-600">
                        <div className="font-medium text-slate-800">{disp.transfer_to || '-'}</div>
                        {disp.notes && <div className="text-slate-400 mt-0.5 leading-snug">{disp.notes}</div>}
                      </td>
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            const html = generateDisposalVoucherHTML(disp, settings);
                            openPrintWindow(html, `รายงานจำหน่ายพัสดุและตัดบัญชี (${disp.disposal_number})`);
                          }}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-gov-700 hover:bg-gov-800 text-white rounded-xl text-xs font-bold shadow-sm transition"
                        >
                          <Printer className="w-3.5 h-3.5 text-gold-400" />
                          <span>พิมพ์ใบจำหน่าย</span>
                        </button>
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
            <div className="text-center py-10 text-slate-400 text-sm">กำลังโหลดข้อมูลการจำหน่าย...</div>
          ) : disposals.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">ยังไม่มีรายการแทงจำหน่าย</div>
          ) : (
            disposals.map((disp) => {
              const method = DISPOSAL_METHOD_MAP[disp.disposal_method] || { label: disp.disposal_method };
              return (
                <div key={disp.id} className="p-4 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold text-gov-800">{disp.disposal_number}</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">{disp.asset_name}</div>
                      <div className="font-mono text-slate-500">{disp.asset_code}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 shrink-0">
                      {method.label}
                    </span>
                  </div>
                  <div className="text-slate-600 space-y-0.5">
                    <div>{disp.approved_order_no} • {formatThaiDate(disp.disposal_date)}</div>
                    <div>ผู้รับโอน: {disp.transfer_to || '-'} | ขายได้: <strong className="text-emerald-600">{disp.sale_proceeds > 0 ? formatBaht(disp.sale_proceeds) : '-'}</strong></div>
                  </div>
                  <button
                    onClick={() => {
                      const html = generateDisposalVoucherHTML(disp, settings);
                      openPrintWindow(html, `รายงานจำหน่ายพัสดุและตัดบัญชี (${disp.disposal_number})`);
                    }}
                    className="w-full py-1.5 bg-gov-700 hover:bg-gov-800 text-white rounded-xl font-bold flex items-center justify-center space-x-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-gold-400" /><span>พิมพ์ใบจำหน่าย</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD DISPOSAL RECORD (บันทึกแทงจำหน่าย) */}
      {/* ------------------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full my-auto p-6 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-6 h-6 text-gov-700" />
                <h2 className="text-lg font-bold text-slate-900">บันทึกการแทงจำหน่ายครุภัณฑ์</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เลือกครุภัณฑ์ที่ต้องการจำหน่าย *</label>
                <select
                  value={form.asset_id}
                  onChange={e => setForm({ ...form, asset_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                >
                  <option value="">-- เลือกครุภัณฑ์ --</option>
                  {pendingAssets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.asset_code} : {a.name} ({a.department_name}) [สถานะ: {a.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วิธีการจำหน่ายตามระเบียบ *</label>
                  <select
                    value={form.disposal_method}
                    onChange={e => setForm({ ...form, disposal_method: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500 font-semibold"
                  >
                    <option value="auction">ขายทอดตลาด (Auction)</option>
                    <option value="transfer">โอนให้หน่วยงานอื่น</option>
                    <option value="donation">บริจาค</option>
                    <option value="destruction">แปรสภาพหรือทำลาย</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วันที่จำหน่าย *</label>
                  <input
                    type="date"
                    value={form.disposal_date}
                    onChange={e => setForm({ ...form, disposal_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">คำสั่ง / มติอนุมัติจำหน่าย *</label>
                <input
                  type="text"
                  placeholder="เช่น คำสั่งเทศบาลตำบล ที่ 145/2569 ลงวันที่ 25 ก.ย. 2569"
                  value={form.approved_order_no}
                  onChange={e => setForm({ ...form, approved_order_no: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ผู้อนุมัติจำหน่าย *</label>
                <input
                  type="text"
                  value={form.approved_by}
                  onChange={e => setForm({ ...form, approved_by: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                />
              </div>

              {form.disposal_method === 'auction' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เงินที่ได้จากการขายทอดตลาด (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.sale_proceeds}
                    onChange={e => setForm({ ...form, sale_proceeds: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-emerald-600 focus:ring-2 focus:ring-gov-500"
                  />
                </div>
              )}

              {(form.disposal_method === 'transfer' || form.disposal_method === 'donation') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">หน่วยงานที่รับโอน / รับบริจาค</label>
                  <input
                    type="text"
                    placeholder="เช่น โรงเรียนบ้านทุ่งยาว หรือ รพ.สต. ในพื้นที่"
                    value={form.transfer_to}
                    onChange={e => setForm({ ...form, transfer_to: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
                <input
                  type="text"
                  placeholder="เช่น ผู้ประมูลได้คือ... หรือ ทำลายโดยการเผาทำลายตามสุขอนามัย"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
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
                  ยืนยันการแทงจำหน่าย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

