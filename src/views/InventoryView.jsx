import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ArrowDownToLine,
  Layers,
  CheckCircle2,
  Calendar,
  X,
  History,
  Tag,
  Printer,
  MapPin
} from 'lucide-react';
import { formatBaht, formatThaiDate } from '../utils/formatters.js';
import { openPrintWindow, generatePD2HTML } from '../utils/printTemplates.js';

export const STANDARD_MATERIAL_CATEGORIES = [
  'วัสดุสำนักงาน',
  'วัสดุคอมพิวเตอร์',
  'วัสดุไฟฟ้าและวิทยุ',
  'วัสดุก่อสร้าง',
  'วัสดุยานพาหนะและขนส่ง',
  'วัสดุเชื้อเพลิงและหล่อลื่น',
  'วัสดุการเกษตร',
  'วัสดุงานบ้านงานครัว',
  'วัสดุการแพทย์และวิทยาศาสตร์',
  'วัสดุการศึกษา',
  'วัสดุความปลอดภัย',
  'วัสดุเคมีภัณฑ์',
  'วัสดุโฆษณาและเผยแพร่',
  'วัสดุเครื่องแต่งกาย',
  'วัสดุดนตรีและกีฬา',
  'วัสดุโรงงานและเครื่องมือช่าง',
  'วัสดุอื่น ๆ'
];

export default function InventoryView({ settings = {}, currentUser }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [categoriesSummary, setCategoriesSummary] = useState([]);

  // Modals
  const [showAddMasterModal, setShowAddMasterModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedItemForReceive, setSelectedItemForReceive] = useState(null);
  const [showLotsModal, setShowLotsModal] = useState(false);
  const [selectedItemLots, setSelectedItemLots] = useState(null);

  // Fetch Categories Summary
  const fetchCategoriesSummary = async () => {
    try {
      const res = await fetch('/api/inventory/categories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setCategoriesSummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories summary:', err);
    }
  };

  useEffect(() => {
    fetchCategoriesSummary();
  }, []);

  // Compute union of standard categories and any extra categories present in DB
  const availableCategories = Array.from(new Set([
    ...STANDARD_MATERIAL_CATEGORIES,
    ...categoriesSummary.map(c => c.category).filter(Boolean)
  ]));

  const categoryCountMap = categoriesSummary.reduce((acc, c) => {
    acc[c.category] = c.count;
    return acc;
  }, {});

  const totalItemCount = categoriesSummary.reduce((sum, c) => sum + (c.count || 0), 0) || items.length;

  // Print Stock Card (แบบ พด.2)
  const handlePrintStockCard = async (item) => {
    try {
      const res = await fetch(`/api/inventory/items/${item.id}/stock-card`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch stock card');
      const html = generatePD2HTML(data.item, data.transactions, settings);
      openPrintWindow(html, `แบบ พด.2 บัญชีวัสดุ_${item.item_code}`);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการโหลดบัญชีวัสดุ: ' + err.message);
    }
  };

  // Form State: Add Master Item
  const [masterForm, setMasterForm] = useState({
    item_code: '',
    name: '',
    category: 'วัสดุสำนักงาน',
    unit: 'รีม',
    min_stock: 10,
    current_stock: 0,
    unit_price: '',
    storage_location: ''
  });

  // Form State: Receive Stock (Add FIFO Lot)
  const [receiveForm, setReceiveForm] = useState({
    lot_number: '',
    received_date: new Date().toISOString().split('T')[0],
    quantity: '',
    unit_cost: '',
    supplier: '',
    po_number: ''
  });

  // Fetch Inventory
  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      if (lowStockFilter) params.append('low_stock_only', 'true');

      const res = await fetch(`/api/inventory?${params.toString()}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setItems(data);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [searchTerm, selectedCategory, lowStockFilter]);

  // Open Receive Modal
  const openReceiveModal = (item) => {
    setSelectedItemForReceive(item);
    const dateCode = new Date().toISOString().slice(2, 7).replace('-', '');
    setReceiveForm({
      lot_number: `LOT-69/${dateCode}-${item.id}`,
      received_date: new Date().toISOString().split('T')[0],
      quantity: '',
      unit_cost: item.unit_price || '',
      supplier: '',
      po_number: ''
    });
    setShowReceiveModal(true);
  };

  // Submit Receive Stock
  const handleReceiveStock = async (e) => {
    e.preventDefault();
    if (!selectedItemForReceive) return;

    try {
      const payload = {
        ...receiveForm,
        actorName: currentUser?.name,
        actorRole: currentUser?.title
      };

      const res = await fetch(`/api/inventory/${selectedItemForReceive.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowReceiveModal(false);
        fetchItems();
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกรับพัสดุ');
    }
  };

  // Submit Master Item
  const handleCreateMaster = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...masterForm,
        actorName: currentUser?.name,
        actorRole: currentUser?.title
      };

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddMasterModal(false);
        fetchItems();
        fetchCategoriesSummary();
        setMasterForm({
          item_code: '',
          name: '',
          category: 'วัสดุสำนักงาน',
          unit: 'รีม',
          min_stock: 10,
          current_stock: 0,
          unit_price: '',
          storage_location: ''
        });
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเพิ่มพัสดุใหม่');
    }
  };

  const openLotsModal = (item) => {
    setSelectedItemLots(item);
    setShowLotsModal(true);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <Package className="w-7 h-7 text-gov-700" />
            <span>ระบบบริหารจัดการพัสดุคลังย่อย (Inventory & FIFO Stock)</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            ควบคุมสต็อกพัสดุสิ้นเปลืองทุกหมวดหมู่ (17 หมวดตามระเบียบกระทรวงการคลังฯ พ.ศ. 2560 และ e-LAAS) แบบเข้าก่อนออกก่อน (FIFO) พร้อมระบบแจ้งเตือนจุดสั่งซื้อขั้นต่ำ (Reorder Point)
          </p>
        </div>
        <button
          onClick={() => setShowAddMasterModal(true)}
          className="flex items-center space-x-2 bg-gov-700 hover:bg-gov-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มรายการวัสดุใหม่</span>
        </button>
      </div>

      {/* Category Pills Quick Filter */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1.5 scrollbar-thin">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
            selectedCategory === ''
              ? 'bg-gov-800 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>ทุกหมวดวัสดุ</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
            selectedCategory === '' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {totalItemCount}
          </span>
        </button>

        {availableCategories.map(cat => {
          const count = categoryCountMap[cat] || 0;
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(isSelected ? '' : cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
                isSelected
                  ? 'bg-gov-700 text-white shadow-sm ring-2 ring-gov-500'
                  : count > 0
                  ? 'bg-white text-slate-700 border border-slate-200 hover:border-gov-400 hover:bg-slate-50'
                  : 'bg-slate-50 text-slate-400 border border-slate-200/60 hover:bg-white'
              }`}
            >
              <span>{cat}</span>
              {count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-white/25 text-white' : 'bg-gov-50 text-gov-700 font-bold'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="ค้นหารหัส หรือชื่อวัสดุ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gov-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gov-500 bg-white"
          >
            <option value="">ทุกหมวดวัสดุ ({totalItemCount} รายการ)</option>
            {availableCategories.map(cat => {
              const count = categoryCountMap[cat] || 0;
              return (
                <option key={cat} value={cat}>
                  {cat} {count > 0 ? `(${count})` : '(0)'}
                </option>
              );
            })}
          </select>

          <button
            onClick={() => setLowStockFilter(!lowStockFilter)}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
              lowStockFilter
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>เฉพาะต่ำกว่าเกณฑ์</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[1120px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="py-3 px-3.5 w-28 whitespace-nowrap">รหัสวัสดุ</th>
                <th className="py-3 px-3.5 min-w-[280px]">ชื่อวัสดุสิ้นเปลือง</th>
                <th className="py-3 px-3.5 w-44 whitespace-nowrap">หมวดหมู่วัสดุ</th>
                <th className="py-3 px-3.5 min-w-[180px]">สถานที่จัดเก็บ</th>
                <th className="py-3 px-3.5 text-center w-28 whitespace-nowrap">คงเหลือ</th>
                <th className="py-3 px-3.5 text-center w-28 whitespace-nowrap">เกณฑ์สั่งซื้อ</th>
                <th className="py-3 px-3.5 text-right w-28 whitespace-nowrap">ราคาต่อหน่วย</th>
                <th className="py-3 px-3.5 text-center w-32 whitespace-nowrap">สถานะสต็อก</th>
                <th className="py-3 px-3.5 text-center w-52 whitespace-nowrap">การปฏิบัติการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-slate-400">
                    กำลังโหลดข้อมูลพัสดุคลังย่อย...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-slate-400">
                    ไม่พบรายการพัสดุ
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition align-top">
                    <td className="py-3.5 px-3.5 font-mono font-bold text-slate-800 whitespace-nowrap pt-3.5">
                      {item.item_code}
                    </td>
                    <td className="py-3.5 px-3.5 min-w-[280px]">
                      <div className="font-bold text-slate-900 leading-snug">{item.name}</div>
                      <div className="text-xs text-slate-400 mt-1">หน่วยนับ: <span className="font-medium text-slate-600">{item.unit}</span></div>
                    </td>
                    <td className="py-3.5 px-3.5 whitespace-nowrap pt-3.5">
                      <span className="inline-block px-2.5 py-1 rounded-lg font-medium text-xs bg-slate-100 text-slate-700 border border-slate-200/80">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5 text-xs text-slate-600 pt-3.5">
                      <div className="flex items-center space-x-1.5 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.storage_location || 'คลังพัสดุกลาง'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3.5 text-center whitespace-nowrap pt-3.5">
                      <span className={`text-base font-bold ${item.is_low_stock ? 'text-rose-600' : 'text-slate-900'}`}>
                        {item.current_stock}
                      </span>{' '}
                      <span className="text-xs text-slate-500">{item.unit}</span>
                    </td>
                    <td className="py-3.5 px-3.5 text-center text-xs text-slate-500 whitespace-nowrap pt-4">
                      {item.min_stock} {item.unit}
                    </td>
                    <td className="py-3.5 px-3.5 text-right font-medium text-slate-800 whitespace-nowrap pt-4">
                      {formatBaht(item.unit_price)}
                    </td>
                    <td className="py-3.5 px-3.5 text-center whitespace-nowrap pt-3">
                      {item.is_low_stock ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-300">
                          <AlertTriangle className="w-3 h-3" />
                          <span>จุดสั่งซื้อ (ต่ำ)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>สต็อกปกติ</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3.5 text-center whitespace-nowrap pt-3">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => openReceiveModal(item)}
                          title="รับวัสดุเข้าคลัง (เพิ่มล็อต FIFO)"
                          className="flex items-center space-x-1 px-2.5 py-1 bg-gov-50 hover:bg-gov-100 text-gov-700 rounded-lg text-xs font-bold border border-gov-200 transition"
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                          <span>รับเข้า</span>
                        </button>
                        <button
                          onClick={() => openLotsModal(item)}
                          title="ดูทุกล็อต FIFO ในคลัง"
                          className="flex items-center space-x-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                        >
                          <Layers className="w-3.5 h-3.5 text-slate-500" />
                          <span>ล็อต ({item.lots?.length || 0})</span>
                        </button>
                        <button
                          onClick={() => handlePrintStockCard(item)}
                          title="พิมพ์บัญชีวัสดุ แบบ พด.2 (Stock Card) ตามระเบียบข้อ 205"
                          className="flex items-center space-x-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-200 transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>พด.2</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: RECEIVE STOCK (รับวัสดุเข้าคลังย่อย FIFO) */}
      {/* ------------------------------------------------------------- */}
      {showReceiveModal && selectedItemForReceive && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full my-auto p-6 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <ArrowDownToLine className="w-6 h-6 text-gov-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">รับพัสดุเข้าคลัง (บันทึกล็อต FIFO)</h2>
                  <p className="text-xs text-slate-500">ระบบจะควบคุมการจ่ายออกตามลำดับเข้าก่อน-ออกก่อน</p>
                </div>
              </div>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-xs">
              <span className="text-slate-500">รายการพัสดุ:</span>
              <div className="font-bold text-slate-900 text-sm mt-0.5">
                {selectedItemForReceive.name} ({selectedItemForReceive.item_code})
              </div>
              <div className="text-slate-500 mt-1">
                คงเหลือปัจจุบัน: <strong className="text-slate-700">{selectedItemForReceive.current_stock} {selectedItemForReceive.unit}</strong>
              </div>
            </div>

            <form onSubmit={handleReceiveStock} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">หมายเลขล็อต (Lot No.) *</label>
                  <input
                    type="text"
                    value={receiveForm.lot_number}
                    onChange={e => setReceiveForm({ ...receiveForm, lot_number: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วันที่ตรวจรับ *</label>
                  <input
                    type="date"
                    value={receiveForm.received_date}
                    onChange={e => setReceiveForm({ ...receiveForm, received_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">จำนวนที่รับเข้า ({selectedItemForReceive.unit}) *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="เช่น 50"
                    value={receiveForm.quantity}
                    onChange={e => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-gov-800 focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ราคาต่อหน่วย (บาท) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={receiveForm.unit_cost}
                    onChange={e => setReceiveForm({ ...receiveForm, unit_cost: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้จำหน่าย / ร้านค้า</label>
                  <input
                    type="text"
                    placeholder="เช่น ร้าน สุขเกษมสเตชั่นเนอรี่"
                    value={receiveForm.supplier}
                    onChange={e => setReceiveForm({ ...receiveForm, supplier: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่ใบสั่งซื้อ / PO</label>
                  <input
                    type="text"
                    placeholder="เช่น PO-69/088"
                    value={receiveForm.po_number}
                    onChange={e => setReceiveForm({ ...receiveForm, po_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  ยืนยันการรับพัสดุเข้าคลัง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: FIFO LOTS BREAKDOWN (ดูล็อตคงเหลือ FIFO) */}
      {/* ------------------------------------------------------------- */}
      {showLotsModal && selectedItemLots && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full my-auto p-6 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Layers className="w-6 h-6 text-gov-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">ประวัติสต็อกคงคลังเรียงตามลำดับ FIFO</h2>
                  <p className="text-xs text-slate-500">{selectedItemLots.name} ({selectedItemLots.item_code})</p>
                </div>
              </div>
              <button
                onClick={() => setShowLotsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
              {(!selectedItemLots.lots || selectedItemLots.lots.length === 0) ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  ยังไม่มีล็อตคงคลังในระบบ
                </div>
              ) : (
                selectedItemLots.lots.map((lot, idx) => (
                  <div key={lot.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gov-800 font-mono text-sm">{lot.lot_number}</span>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            คิวจ่ายลำดับแรก (First-Out)
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 mt-1">
                        รับเข้าวันที่: {formatThaiDate(lot.received_date)} | ผู้ขาย: {lot.supplier || '-'}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        รับมา: {lot.quantity_received} {selectedItemLots.unit} @ {formatBaht(lot.unit_cost)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-600">
                        คงเหลือ {lot.quantity_remaining} {selectedItemLots.unit}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        มูลค่า {formatBaht(lot.quantity_remaining * lot.unit_cost)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center border-t border-slate-100 pt-3">
              <button
                onClick={() => handlePrintStockCard(selectedItemLots)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-gov-700 hover:bg-gov-800 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ พิมพ์แบบ พด.2 บัญชีวัสดุ</span>
              </button>
              <button
                onClick={() => setShowLotsModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD MASTER ITEM (เพิ่มรายการพัสดุใหม่) */}
      {/* ------------------------------------------------------------- */}
      {showAddMasterModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full my-auto p-6 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Plus className="w-6 h-6 text-gov-700" />
                <h2 className="text-lg font-bold text-slate-900">เพิ่มรายการพัสดุสิ้นเปลืองใหม่</h2>
              </div>
              <button
                onClick={() => setShowAddMasterModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMaster} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รหัสพัสดุ *</label>
                  <input
                    type="text"
                    placeholder="เช่น ว.01-009"
                    value={masterForm.item_code}
                    onChange={e => setMasterForm({ ...masterForm, item_code: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">หมวดพัสดุ (17 หมวดมาตรฐาน e-LAAS) *</label>
                  <select
                    value={masterForm.category}
                    onChange={e => setMasterForm({ ...masterForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500 bg-white"
                  >
                    {STANDARD_MATERIAL_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อวัสดุพัสดุ *</label>
                  <input
                    type="text"
                    placeholder="เช่น หมึกพิมพ์ HP LaserJet M428"
                    value={masterForm.name}
                    onChange={e => setMasterForm({ ...masterForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">หน่วยนับ *</label>
                  <input
                    type="text"
                    placeholder="เช่น รีม, ตลับ, เล่ม, ด้าม"
                    value={masterForm.unit}
                    onChange={e => setMasterForm({ ...masterForm, unit: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">จุดสั่งซื้อขั้นต่ำ (Reorder Point) *</label>
                  <input
                    type="number"
                    value={masterForm.min_stock}
                    onChange={e => setMasterForm({ ...masterForm, min_stock: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">จำนวนยอดยกมาเริ่มต้น</label>
                  <input
                    type="number"
                    value={masterForm.current_stock}
                    onChange={e => setMasterForm({ ...masterForm, current_stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ราคาต่อหน่วยประมาณการ (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={masterForm.unit_price}
                    onChange={e => setMasterForm({ ...masterForm, unit_price: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">สถานที่จัดเก็บในคลัง</label>
                  <input
                    type="text"
                    placeholder="เช่น คลังพัสดุกลาง ชั้น 1 ตู้ A-05"
                    value={masterForm.storage_location}
                    onChange={e => setMasterForm({ ...masterForm, storage_location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddMasterModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  บันทึกพัสดุ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

