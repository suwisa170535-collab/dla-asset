import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Building,
  User,
  Calendar,
  Printer,
  X,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { formatBaht, formatThaiDate } from '../utils/formatters.js';
import { generateTransferVoucherHTML, openPrintWindow } from '../utils/printTemplates.js';

export default function TransferView({ settings, departments, subDepartments = [], currentUser }) {
  const [transfers, setTransfers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [form, setForm] = useState({
    asset_id: '',
    to_department_id: '',
    to_sub_department_id: '',
    transfer_date: new Date().toISOString().split('T')[0],
    reason: 'ปรับเกลี่ยการใช้งานทรัพย์สินภายในเทศบาลตามความจำเป็น',
    deliverer_name: currentUser?.name || '',
    receiver_name: '',
    new_location_room: '',
    new_custodian_name: '',
    approver_name: `${settings.mayor_name || 'นายสมศักดิ์ วัฒนากูล'} (นายกเทศมนตรี)`,
    notes: ''
  });

  const [selectedAssetInfo, setSelectedAssetInfo] = useState(null);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/transfers');
      const data = await res.json();
      setTransfers(data);
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
      setAssets(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTransfers();
    fetchAssets();
  }, []);

  const handleAssetSelect = (e) => {
    const assetId = Number(e.target.value);
    const asset = assets.find(a => a.id === assetId);
    setSelectedAssetInfo(asset || null);
    setForm(prev => ({
      ...prev,
      asset_id: assetId,
      deliverer_name: asset ? (asset.custodian_name || currentUser?.name || '') : ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.asset_id || !form.to_department_id) {
      alert('กรุณาเลือกครุภัณฑ์และสำนัก/กองปลายทาง');
      return;
    }

    if (selectedAssetInfo && selectedAssetInfo.department_id === Number(form.to_department_id)) {
      alert('สำนัก/กองปลายทาง ต้องไม่ใช่กองเดิมที่ครุภัณฑ์สังกัดอยู่');
      return;
    }

    try {
      const payload = {
        ...form,
        asset_id: Number(form.asset_id),
        to_department_id: Number(form.to_department_id),
        actorName: currentUser?.name,
        actorRole: currentUser?.title
      };

      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchTransfers();
        fetchAssets();
        setSelectedAssetInfo(null);
        setForm({
          asset_id: '',
          to_department_id: '',
          transfer_date: new Date().toISOString().split('T')[0],
          reason: 'ปรับเกลี่ยการใช้งานทรัพย์สินภายในเทศบาลตามความจำเป็น',
          deliverer_name: currentUser?.name || '',
          receiver_name: '',
          new_location_room: '',
          new_custodian_name: '',
          approver_name: `${settings.mayor_name || 'นายสมศักดิ์ วัฒนากูล'} (นายกเทศมนตรี)`,
          notes: ''
        });
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกการโอนย้าย');
    }
  };

  const handlePrint = (transfer) => {
    const html = generateTransferVoucherHTML(transfer, settings);
    openPrintWindow(html, `ใบส่งมอบรับมอบ_${transfer.transfer_number}`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <ArrowLeftRight className="w-7 h-7 text-gov-700" />
            <span>ระบบโอนย้ายครุภัณฑ์ระหว่างสำนัก/กอง (Asset Transfer)</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            บันทึกการส่งมอบ-รับมอบครุภัณฑ์ข้ามกอง แก้ไขทะเบียนคุมอัตโนมัติ พร้อมพิมพ์ใบส่งมอบตามระเบียบพัสดุฯ ข้อ 211
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 bg-gov-700 hover:bg-gov-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>บันทึกการโอนย้ายครุภัณฑ์</span>
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-gov-50 via-slate-50 to-emerald-50 rounded-2xl p-4 border border-gov-200 text-xs text-slate-700 flex items-center justify-between">
        <div>
          <div className="font-bold text-gov-900 text-sm">💡 ความสำคัญของการโอนย้ายพัสดุตามระเบียบกระทรวงการคลัง:</div>
          <div className="text-slate-600 mt-0.5">
            เมื่อมีการย้ายโต๊ะ, คอมพิวเตอร์ หรืออุปกรณ์ระหว่างกอง ระบบจะปรับเปลี่ยนชื่อสำนัก/กอง และผู้ดูแลในทะเบียนคุมทรัพย์สิน (สท.1) ให้อัตโนมัติ ป้องกันปัญหา สตง. ตรวจสอบแล้วหาของไม่พบ
          </div>
        </div>
        <div className="hidden sm:block text-right whitespace-nowrap pl-4 font-bold text-gov-800">
          โอนย้ายสำเร็จแล้ว {transfers.length} ครั้ง
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">เลขที่ใบโอน</th>
                <th className="py-3 px-4">ครุภัณฑ์ที่โอนย้าย</th>
                <th className="py-3 px-4">โอนจากกองเดิม ➡️ ไปยังกองใหม่</th>
                <th className="py-3 px-4">ผู้ส่งมอบ & ผู้รับมอบ</th>
                <th className="py-3 px-4">เหตุผลความจำเป็น</th>
                <th className="py-3 px-4 text-center">วันที่โอน</th>
                <th className="py-3 px-4 text-center">พิมพ์ใบส่งมอบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    กำลังโหลดประวัติการโอนย้าย...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    ยังไม่มีประวัติการโอนย้ายครุภัณฑ์
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-gov-800 whitespace-nowrap">
                      {t.transfer_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{t.asset_name}</div>
                      <div className="text-xs font-mono text-gov-700 font-semibold">{t.asset_code}</div>
                      <div className="text-[11px] text-slate-400">ราคาทุน: {formatBaht(t.cost_price)}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                      <div className="text-slate-500">จาก: <strong className="text-slate-700">{t.from_department_name}</strong></div>
                      <div className="text-emerald-700 font-bold mt-0.5">➡️ ไปยัง: {t.to_department_name}</div>
                      <div className="text-[11px] text-slate-400">ห้อง: {t.new_location_room || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div>ผู้ส่ง: <span className="font-semibold text-slate-700">{t.deliverer_name}</span></div>
                      <div>ผู้รับ: <span className="font-semibold text-slate-900">{t.receiver_name}</span></div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs">
                      <div className="line-clamp-2">{t.reason}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs whitespace-nowrap text-slate-600">
                      {formatThaiDate(t.transfer_date)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handlePrint(t)}
                        title="พิมพ์ใบส่งมอบ-รับมอบทรัพย์สินทางราชการ"
                        className="flex items-center space-x-1 px-3 py-1 bg-gov-50 hover:bg-gov-100 text-gov-800 font-bold rounded-xl text-xs border border-gov-200 transition mx-auto"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>พิมพ์ใบส่งมอบ</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD TRANSFER (บันทึกการโอนย้าย) */}
      {/* ------------------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full my-auto p-6 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <ArrowLeftRight className="w-6 h-6 text-gov-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">บันทึกการโอนย้ายครุภัณฑ์ระหว่างสำนัก/กอง</h2>
                  <p className="text-xs text-slate-500">ระบบจะอัปเดตสังกัดและผู้ดูแลในทะเบียนคุมทรัพย์สินให้อัตโนมัติ</p>
                </div>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">เลือกครุภัณฑ์ที่ต้องการโอนย้าย *</label>
                <select
                  value={form.asset_id}
                  onChange={handleAssetSelect}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500 font-medium"
                >
                  <option value="">-- เลือกครุภัณฑ์ --</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.asset_code} : {a.name} [สังกัดปัจจุบัน: {a.department_name}]
                    </option>
                  ))}
                </select>
              </div>

              {selectedAssetInfo && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">สังกัดกองปัจจุบัน:</span>
                    <strong className="text-gov-800 block">
                      {selectedAssetInfo.department_name}
                      {selectedAssetInfo.sub_department_name ? ` (${selectedAssetInfo.sub_department_name})` : ''}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">ผู้ดูแลปัจจุบัน:</span>
                    <strong className="text-slate-800 block">{selectedAssetInfo.custodian_name || '-'}</strong>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">โอนย้ายไปยังสำนัก/กองใหม่ *</label>
                  <select
                    value={form.to_department_id}
                    onChange={e => setForm({ ...form, to_department_id: e.target.value, to_sub_department_id: '' })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500 font-bold text-emerald-800"
                  >
                    <option value="">-- เลือกสำนัก/กอง ปลายทาง --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-700 mb-1">หน่วยงานย่อย/ฝ่าย ปลายทาง</label>
                  <select
                    value={form.to_sub_department_id || ''}
                    onChange={e => setForm({ ...form, to_sub_department_id: e.target.value })}
                    className="w-full px-3 py-2 border border-indigo-200 bg-indigo-50/20 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">-- ไม่ระบุ / สังกัดกองโดยตรง --</option>
                    {subDepartments
                      .filter(sd => String(sd.department_id) === String(form.to_department_id))
                      .map(sd => (
                        <option key={sd.id} value={sd.id}>{sd.name}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วันที่ส่งมอบโอนย้าย *</label>
                  <input
                    type="date"
                    value={form.transfer_date}
                    onChange={e => setForm({ ...form, transfer_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สถานที่ตั้ง/ห้องใหม่</label>
                  <input
                    type="text"
                    placeholder="เช่น ห้อง ผอ.กองช่าง ชั้น 2"
                    value={form.new_location_room}
                    onChange={e => setForm({ ...form, new_location_room: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ผู้ส่งมอบ (เจ้าหน้าที่กองเดิม) *</label>
                  <input
                    type="text"
                    placeholder="ชื่อ-สกุล ผู้ส่งมอบ"
                    value={form.deliverer_name}
                    onChange={e => setForm({ ...form, deliverer_name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ผู้รับมอบ (เจ้าหน้าที่กองใหม่) *</label>
                  <input
                    type="text"
                    placeholder="ชื่อ-สกุล ผู้รับมอบ"
                    value={form.receiver_name}
                    onChange={e => setForm({ ...form, receiver_name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">เหตุผลความจำเป็นในการโอนย้าย *</label>
                  <input
                    type="text"
                    placeholder="เช่น เพื่อใช้ในภารกิจงานสำรวจของกองช่าง หรือ ปรับเกลี่ยตามอัตรากำลัง"
                    value={form.reason}
                    onChange={e => setForm({ ...form, reason: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">ผู้มีอำนาจอนุมัติ (นายก/ปลัด)</label>
                  <input
                    type="text"
                    value={form.approver_name}
                    onChange={e => setForm({ ...form, approver_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
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
                  ยืนยันการโอนย้าย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

