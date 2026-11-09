import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Search,
  Check,
  X,
  Package,
  Layers,
  ArrowRight
} from 'lucide-react';
import { formatBaht, formatThaiDate, REQ_STATUS_MAP } from '../utils/formatters.js';
import { generatePD1HTML, openPrintWindow } from '../utils/printTemplates.js';

export default function RequisitionsView({ settings, departments, currentUser, currentRole }) {
  const [requests, setRequests] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedReqForApprove, setSelectedReqForApprove] = useState(null);
  const [approvalComment, setApprovalComment] = useState('อนุมัติตามขอเบิกเพื่อการปฏิบัติงาน');

  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [selectedReqForDispense, setSelectedReqForDispense] = useState(null);

  // Form State: Create Requisition
  const [reqForm, setReqForm] = useState({
    department_id: 1,
    requester_name: currentUser?.name || 'นายกานต์ สิทธิชัย',
    requester_position: 'เจ้าหน้าที่',
    requested_date: new Date().toISOString().split('T')[0],
    purpose: '',
    notes: '',
    items: [{ item_id: '', requested_qty: 1 }]
  });

  // Fetch Requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/requests?${params.toString()}`);
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Inventory items for selection in requisition
  const fetchInventoryItems = async () => {
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      setInventoryItems(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchInventoryItems();
  }, [statusFilter]);

  // Handle Item Row changes in create modal
  const handleItemChange = (index, field, value) => {
    const updated = [...reqForm.items];
    updated[index][field] = value;
    setReqForm({ ...reqForm, items: updated });
  };

  const addItemRow = () => {
    setReqForm({
      ...reqForm,
      items: [...reqForm.items, { item_id: '', requested_qty: 1 }]
    });
  };

  const removeItemRow = (index) => {
    if (reqForm.items.length > 1) {
      const updated = reqForm.items.filter((_, i) => i !== index);
      setReqForm({ ...reqForm, items: updated });
    }
  };

  // Submit Create Requisition
  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    try {
      // Validate items
      const validItems = reqForm.items.filter(i => i.item_id && Number(i.requested_qty) > 0);
      if (validItems.length === 0) {
        alert('กรุณาเลือกรายการวัสดุและระบุจำนวนอย่างน้อย 1 รายการ');
        return;
      }

      const payload = {
        ...reqForm,
        items: validItems.map(i => ({
          item_id: Number(i.item_id),
          requested_qty: Number(i.requested_qty)
        })),
        actorName: currentUser?.name,
        actorRole: currentUser?.title
      };

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowCreateModal(false);
        fetchRequests();
        setReqForm({
          department_id: 1,
          requester_name: currentUser?.name || 'นายกานต์ สิทธิชัย',
          requester_position: 'เจ้าหน้าที่',
          requested_date: new Date().toISOString().split('T')[0],
          purpose: '',
          notes: '',
          items: [{ item_id: '', requested_qty: 1 }]
        });
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการสร้างใบเบิก');
    }
  };

  // Submit Approval
  const handleApprove = async () => {
    if (!selectedReqForApprove) return;
    try {
      const res = await fetch(`/api/requests/${selectedReqForApprove.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approver_name: currentUser?.name || 'หัวหน้าสำนัก/กอง',
          approval_comment: approvalComment,
          actorName: currentUser?.name,
          actorRole: currentUser?.title
        })
      });
      if (res.ok) {
        setShowApproveModal(false);
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการอนุมัติ');
    }
  };

  // Submit Rejection
  const handleReject = async () => {
    if (!selectedReqForApprove) return;
    try {
      const res = await fetch(`/api/requests/${selectedReqForApprove.id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approver_name: currentUser?.name || 'หัวหน้าสำนัก/กอง',
          reason: approvalComment || 'ไม่อนุมัติ',
          actorName: currentUser?.name,
          actorRole: currentUser?.title
        })
      });
      if (res.ok) {
        setShowApproveModal(false);
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการปฏิเสธคำขอ');
    }
  };

  // Submit Dispense (FIFO Deduction)
  const handleDispense = async () => {
    if (!selectedReqForDispense) return;
    try {
      const res = await fetch(`/api/requests/${selectedReqForDispense.id}/dispense`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispenser_name: currentUser?.name || settings.supply_officer_name,
          actorName: currentUser?.name,
          actorRole: currentUser?.title
        })
      });
      if (res.ok) {
        setShowDispenseModal(false);
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการจ่ายพัสดุ');
    }
  };

  // Print PD.1 Form
  const handlePrintPD1 = (req) => {
    const html = generatePD1HTML(req, settings);
    openPrintWindow(html, `แบบ พด.1 ใบเบิกพัสดุ ${req.req_number}`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <FileText className="w-7 h-7 text-gov-700" />
            <span>ระบบใบเบิกพัสดุออนไลน์ (Paperless Requisitions)</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            ยื่นขอเบิกพัสดุออนไลน์ อนุมัติผ่านระบบ และจ่ายพัสดุตัดสต็อกแบบ FIFO อัตโนมัติ พร้อมพิมพ์แบบฟอร์ม พด.1
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-gov-700 hover:bg-gov-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างใบเบิกพัสดุใหม่</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        {[
          { id: '', label: 'ทั้งหมด' },
          { id: 'pending_approval', label: 'รอหัวหน้าอนุมัติ' },
          { id: 'approved', label: 'อนุมัติแล้ว (รอจ่ายพัสดุ)' },
          { id: 'dispensed', label: 'จ่ายพัสดุเรียบร้อย' },
          { id: 'rejected', label: 'ไม่อนุมัติ' },
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

      {/* Requisitions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl p-10 text-center text-slate-400 border border-slate-200">
            กำลังโหลดข้อมูลใบเบิก...
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center text-slate-400 border border-slate-200">
            ไม่พบใบเบิกพัสดุในสถานะนี้
          </div>
        ) : (
          requests.map((req) => {
            const statusInfo = REQ_STATUS_MAP[req.status] || { label: req.status, color: 'bg-slate-100 text-slate-700' };
            const canApprove = (currentRole === 'dept_head' || currentRole === 'admin') && req.status === 'pending_approval';
            const canDispense = (currentRole === 'central_supply' || currentRole === 'admin') && req.status === 'approved';

            return (
              <div key={req.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-bold text-base text-gov-800">{req.req_number}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      สำนัก/กอง: <strong className="text-slate-800">{req.department_name}</strong> |
                      ผู้ขอเบิก: <strong className="text-slate-800">{req.requester_name}</strong> ({req.requester_position || 'เจ้าหน้าที่'}) |
                      วันที่ขอ: {formatThaiDate(req.requested_date)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePrintPD1(req)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
                      title="พิมพ์ใบเบิกพัสดุราชการ (แบบ พด.1)"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>พิมพ์แบบ พด.1</span>
                    </button>

                    {/* Head of Dept Action: Approve */}
                    {canApprove && (
                      <button
                        onClick={() => {
                          setSelectedReqForApprove(req);
                          setShowApproveModal(true);
                        }}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>พิจารณาอนุมัติ</span>
                      </button>
                    )}

                    {/* Central Supply Officer Action: Dispense */}
                    {canDispense && (
                      <button
                        onClick={() => {
                          setSelectedReqForDispense(req);
                          setShowDispenseModal(true);
                        }}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-gov-700 hover:bg-gov-800 text-white rounded-xl text-xs font-bold shadow-sm transition"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>จ่ายพัสดุ & ตัดสต็อก FIFO</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Purpose & Notes */}
                <div className="mt-3 text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">วัตถุประสงค์: </span>
                  {req.purpose}
                </div>

                {/* Items in this requisition */}
                <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    รายการพัสดุที่ขอเบิก
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {req.items?.map((item) => (
                      <div key={item.id} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-800">{item.item_name}</div>
                          <div className="text-slate-400 font-mono text-[10px]">{item.item_code}</div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900">{item.requested_qty}</span>
                          <span className="text-slate-500 ml-1">{item.unit}</span>
                          {req.status === 'dispensed' && item.dispensed_qty && (
                            <div className="text-[10px] text-emerald-600 font-medium">จ่ายแล้ว {item.dispensed_qty}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sign-off trail */}
                <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                  {req.approver_name && (
                    <div>ผู้อนุมัติ: <strong className="text-slate-700">{req.approver_name}</strong> ({formatThaiDate(req.approved_date)})</div>
                  )}
                  {req.approval_comment && (
                    <div>ความเห็น: <span className="italic text-slate-600">"{req.approval_comment}"</span></div>
                  )}
                  {req.dispenser_name && (
                    <div>ผู้จ่ายพัสดุ: <strong className="text-slate-700">{req.dispenser_name}</strong> ({formatThaiDate(req.dispensed_date)})</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE REQUISITION (ยื่นขอเบิกพัสดุออนไลน์) */}
      {/* ------------------------------------------------------------- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full my-auto p-6 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-6 h-6 text-gov-700" />
                <h2 className="text-lg font-bold text-slate-900">สร้างใบขอเบิกพัสดุออนไลน์ (แบบ พด.1)</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สำนัก/กอง ที่ขอเบิก *</label>
                  <select
                    value={reqForm.department_id}
                    onChange={e => setReqForm({ ...reqForm, department_id: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วันที่ขอเบิก *</label>
                  <input
                    type="date"
                    value={reqForm.requested_date}
                    onChange={e => setReqForm({ ...reqForm, requested_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้ขอเบิก *</label>
                  <input
                    type="text"
                    value={reqForm.requester_name}
                    onChange={e => setReqForm({ ...reqForm, requester_name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ตำแหน่งผู้ขอเบิก</label>
                  <input
                    type="text"
                    value={reqForm.requester_position}
                    onChange={e => setReqForm({ ...reqForm, requester_position: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">วัตถุประสงค์ในการขอเบิก *</label>
                  <textarea
                    rows={2}
                    placeholder="เช่น ใช้สำหรับจัดเตรียมเอกสารการประชุมสภาเทศบาล สมัยสามัญ หรือ โครงการรณรงค์ความสะอาด"
                    value={reqForm.purpose}
                    onChange={e => setReqForm({ ...reqForm, purpose: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
              </div>

              {/* Items Line rows */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">รายการพัสดุที่ต้องการเบิก</label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs text-gov-700 font-bold hover:underline flex items-center"
                  >
                    <Plus className="w-3.5 h-3.5 mr-0.5" /> เพิ่มรายการ
                  </button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {reqForm.items.map((row, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <select
                        value={row.item_id}
                        onChange={e => handleItemChange(idx, 'item_id', e.target.value)}
                        required
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                      >
                        <option value="">-- เลือกรายการพัสดุ --</option>
                        {inventoryItems.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.item_code}) [{item.category} | คงเหลือ: {item.current_stock} {item.unit}]
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        placeholder="จำนวน"
                        value={row.requested_qty}
                        onChange={e => handleItemChange(idx, 'requested_qty', e.target.value)}
                        required
                        className="w-24 px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-gov-500"
                      />

                      {reqForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  ส่งใบเบิกพัสดุ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: APPROVE REQUISITION (หัวหน้าสำนัก/กอง พิจารณาอนุมัติ) */}
      {/* ------------------------------------------------------------- */}
      {showApproveModal && selectedReqForApprove && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full my-auto p-6 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-900">พิจารณาอนุมัติใบเบิกพัสดุ</h2>
              </div>
              <button
                onClick={() => setShowApproveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs mb-4 space-y-1">
              <div>เลขที่ใบเบิก: <strong className="font-mono text-sm text-gov-800">{selectedReqForApprove.req_number}</strong></div>
              <div>ผู้ขอเบิก: <strong className="text-slate-800">{selectedReqForApprove.requester_name}</strong> ({selectedReqForApprove.department_name})</div>
              <div>วัตถุประสงค์: <span className="text-slate-700">{selectedReqForApprove.purpose}</span></div>
            </div>

            <div className="space-y-3 mb-4">
              <label className="block text-xs font-bold text-slate-700">ความเห็น / คำสั่งผู้อนุมัติ</label>
              <textarea
                rows={3}
                value={approvalComment}
                onChange={e => setApprovalComment(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
              />
            </div>

            <div className="flex justify-between items-center border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={handleReject}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition border border-rose-200"
              >
                ไม่อนุมัติ (ส่งคืน)
              </button>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs"
                >
                  ปิด
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  อนุมัติใบเบิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DISPENSE (เจ้าหน้าที่พัสดุ จ่ายพัสดุและตัดสต็อก FIFO) */}
      {/* ------------------------------------------------------------- */}
      {showDispenseModal && selectedReqForDispense && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full my-auto p-6 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Package className="w-6 h-6 text-gov-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">จ่ายพัสดุและตัดสต็อกอัตโนมัติ (FIFO)</h2>
                  <p className="text-xs text-slate-500">ระบบจะตัดลดยอดคงเหลือตามล็อตที่รับเข้าก่อนเป็นอันดับแรก</p>
                </div>
              </div>
              <button
                onClick={() => setShowDispenseModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs mb-4">
              <div>เลขที่ใบเบิก: <strong className="font-mono text-sm text-gov-800">{selectedReqForDispense.req_number}</strong></div>
              <div>สำนัก/กอง: <strong className="text-slate-800">{selectedReqForDispense.department_name}</strong></div>
              <div>ผู้ขอเบิก: <strong className="text-slate-800">{selectedReqForDispense.requester_name}</strong></div>
            </div>

            <div className="mb-4 space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase">รายการที่จ่าย</label>
              {selectedReqForDispense.items?.map(item => (
                <div key={item.id} className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-800">{item.item_name}</div>
                    <div className="text-slate-400 font-mono text-[10px]">{item.item_code}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-gov-800">{item.approved_qty || item.requested_qty}</span>
                    <span className="text-slate-500 ml-1">{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowDispenseModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDispense}
                className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs shadow-md transition"
              >
                ยืนยันการจ่ายพัสดุและตัดสต็อก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

