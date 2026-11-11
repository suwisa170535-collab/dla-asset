import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  QrCode,
  Calculator,
  Printer,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Check,
  X,
  ExternalLink,
  Info,
  Download,
  Upload,
  AlertCircle,
  Landmark,
  ShieldAlert,
  Phone,
  ShieldCheck,
  Eye,
  Image,
  FileUp,
  Paperclip,
  MapPin,
  Building2,
  FileText,
  LayoutGrid,
  List,
  FileCheck
} from 'lucide-react';
import { formatBaht, formatThaiDate, ASSET_STATUS_MAP } from '../utils/formatters.js';
import { generateST1HTML, generateST3HTML, generateQrStickerHTML, generateBatchQrStickersHTML, generateInspectionHTML, openPrintWindow } from '../utils/printTemplates.js';

export default function AssetManagementView({ settings, departments = [], subDepartments = [], categories = [], currentUser, currentRole }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSubDept, setSelectedSubDept] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('asset_view_mode') || 'table');

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('asset_view_mode', mode);
  };

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAssetForDetail, setSelectedAssetForDetail] = useState(null);
  const [showDepModal, setShowDepModal] = useState(false);
  const [selectedAssetForDep, setSelectedAssetForDep] = useState(null);
  const [depSchedule, setDepSchedule] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrAsset, setQrAsset] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Edit & Delete Asset States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);

  // Upload States
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Batch QR Code Selection States
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [batchPrinting, setBatchPrinting] = useState(false);

  // Excel Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  // Inspection Records (แบบ ตร.) States
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspections, setInspections] = useState([]);
  const [showNewInspectionForm, setShowNewInspectionForm] = useState(false);
  const [newInspectionForm, setNewInspectionForm] = useState({
    doc_number: '',
    inspection_date: new Date().toISOString().split('T')[0],
    purchase_order_no: '',
    contract_date: '',
    vendor_name: '',
    vendor_phone: '',
    department_id: 1,
    item_name: '',
    category_id: 1,
    brand: '',
    model: '',
    serial_number: '',
    quantity: 1,
    cost_price: '',
    budget_source: 'เงินงบประมาณเทศบาล',
    inspection_result: 'passed',
    chairman_name: `${settings?.clerk_name || 'นางพิมพา จิตตรง'} (ประธานกรรมการ)`,
    member1_name: 'นายเอกชัย ช่างประดิษฐ์ (กรรมการตรวจรับ)',
    member2_name: 'นางสาวนิตยา พัสดุเจริญ (กรรมการตรวจรับ)',
    notes: 'ตรวจรับของถูกต้อง ครบถ้วนตามสัญญา พร้อมทดสอบการใช้งานเรียบร้อย'
  });

  const fetchInspections = async () => {
    try {
      const res = await fetch('/api/inspections');
      const data = await res.json();
      if (Array.isArray(data)) setInspections(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (showInspectionModal) {
      fetchInspections();
    }
  }, [showInspectionModal]);

  const handleCreateInspection = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newInspectionForm,
        actorName: currentUser?.name,
        actorRole: currentUser?.title
      };
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        alert('✅ บันทึกใบตรวจรับพัสดุเรียบร้อยแล้ว');
        setShowNewInspectionForm(false);
        fetchInspections();
      } else {
        alert('❌ เกิดข้อผิดพลาด: ' + (data.error || 'ไม่สามารถบันทึกได้'));
      }
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handlePrintInspection = (ins) => {
    const html = generateInspectionHTML(ins, settings);
    openPrintWindow(html, `ใบตรวจรับพัสดุ_${ins.doc_number}`);
  };

  const handleConvertInspectionToAsset = async (ins) => {
    if (!window.confirm(`ยืนยันการขึ้นทะเบียนครุภัณฑ์ สท.1 จากใบตรวจรับ "${ins.doc_number}" (${ins.item_name})?\nระบบจะออกรหัสครุภัณฑ์อัตโนมัติตามระเบียบ`)) {
      return;
    }
    try {
      const res = await fetch(`/api/inspections/${ins.id}/convert-to-asset`, {
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
        fetchInspections();
        fetchAssets();
      } else {
        alert('❌ เกิดข้อผิดพลาด: ' + (data.error || 'ไม่สามารถขึ้นทะเบียนได้'));
      }
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Form State for Adding Asset
  const [formData, setFormData] = useState({
    name: '',
    category_id: 1,
    brand: '',
    model: '',
    serial_number: '',
    department_id: 1,
    sub_department_id: '',
    custodian_name: '',
    location_room: '',
    acquired_date: new Date().toISOString().split('T')[0],
    fiscal_year: Number(settings?.fiscal_year) || 2569,
    budget_source: 'เงินงบประมาณเทศบาล',
    vendor: '',
    cost_price: '',
    useful_life_years: 5,
    salvage_value: 1.0,
    status: 'active',
    notes: '',
    warranty_expiry_date: '',
    vendor_phone: '',
    contract_number: '',
    procurement_method: 'เฉพาะเจาะจง',
    deed_number: '',
    land_area: '',
    gps_location: '',
    asset_type: 'equipment',
    photo_url: '',
    document_url: '',
    document_name: ''
  });
  const [autoCodePreview, setAutoCodePreview] = useState('');

  // Sync department filter if current user is department staff
  useEffect(() => {
    if (currentUser?.departmentId) {
      setSelectedDept(String(currentUser.departmentId));
    }
  }, [currentUser]);

  // Fetch Assets
  const fetchAssets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedDept) params.append('department_id', selectedDept);
      if (selectedSubDept) params.append('sub_department_id', selectedSubDept);
      if (selectedCat) params.append('category_id', selectedCat);
      if (selectedStatus && selectedStatus !== 'expiring_warranty') {
        params.append('status', selectedStatus);
      }

      const res = await fetch(`/api/assets?${params.toString()}`);
      let data = await res.json();

      // Client filter for expiring warranties
      if (selectedStatus === 'expiring_warranty') {
        const today = new Date();
        data = data.filter(a => {
          if (!a.warranty_expiry_date) return false;
          const diffDays = Math.ceil((new Date(a.warranty_expiry_date) - today) / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 60;
        });
      }

      setAssets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [searchTerm, selectedDept, selectedSubDept, selectedCat, selectedStatus]);

  // Update auto code preview when category or fiscal year changes
  useEffect(() => {
    if (showAddModal && formData.category_id && formData.fiscal_year) {
      fetch(`/api/assets/next-code?category_id=${formData.category_id}&fiscal_year=${formData.fiscal_year}`)
        .then(res => res.json())
        .then(data => {
          if (data.nextCode) setAutoCodePreview(data.nextCode);
        })
        .catch(err => console.error(err));
    }
  }, [showAddModal, formData.category_id, formData.fiscal_year]);

  // Handle category selection change in form to auto-populate useful life
  const handleCategoryChange = (e) => {
    const catId = Number(e.target.value);
    const cat = categories.find(c => c.id === catId);
    const isLand = cat?.code === '10' || cat?.prefix === 'สท.3' || cat?.name?.includes('ที่ดิน');
    setFormData(prev => ({
      ...prev,
      category_id: catId,
      asset_type: isLand ? 'land' : prev.asset_type || 'equipment',
      useful_life_years: isLand ? 0 : (cat ? cat.useful_life_years : 5)
    }));
  };

  // Upload Photo handler
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('ขนาดไฟล์รูปภาพต้องไม่เกิน 10MB ครับ');
      return;
    }
    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, base64Data: reader.result })
        });
        const data = await res.json();
        if (data.url) {
          setFormData(prev => ({ ...prev, photo_url: data.url }));
        }
      } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
      } finally {
        setUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload Document handler
  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      alert('ขนาดไฟล์เอกสารต้องไม่เกิน 25MB ครับ');
      return;
    }
    setUploadingDoc(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, base64Data: reader.result })
        });
        const data = await res.json();
        if (data.url) {
          setFormData(prev => ({
            ...prev,
            document_url: data.url,
            document_name: file.name
          }));
        }
      } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการอัปโหลดเอกสาร');
      } finally {
        setUploadingDoc(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Add Asset
  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        asset_code: autoCodePreview,
        actorName: currentUser?.name,
        actorRole: currentUser?.title
      };

      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchAssets();
        // Reset form
        setFormData({
          name: '',
          category_id: 1,
          brand: '',
          model: '',
          serial_number: '',
          department_id: 1,
          custodian_name: '',
          location_room: '',
          acquired_date: new Date().toISOString().split('T')[0],
          fiscal_year: Number(settings?.fiscal_year) || 2569,
          budget_source: 'เงินงบประมาณเทศบาล',
          vendor: '',
          cost_price: '',
          useful_life_years: 5,
          salvage_value: 1.0,
          status: 'active',
          notes: '',
          warranty_expiry_date: '',
          vendor_phone: '',
          contract_number: '',
          procurement_method: 'เฉพาะเจาะจง',
          deed_number: '',
          land_area: '',
          gps_location: '',
          asset_type: 'equipment',
          photo_url: '',
          document_url: '',
          document_name: ''
        });
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (asset) => {
    setEditFormData({
      ...asset,
      cost_price: asset.cost_price || '',
      useful_life_years: asset.useful_life_years !== undefined ? asset.useful_life_years : 5,
      salvage_value: asset.salvage_value !== undefined ? asset.salvage_value : 1.0,
      fiscal_year: asset.fiscal_year || Number(settings?.fiscal_year) || 2569,
      department_id: asset.department_id || 1,
      sub_department_id: asset.sub_department_id || '',
      category_id: asset.category_id || 1,
      status: asset.status || 'active',
      notes: asset.notes || '',
      vendor: asset.vendor || '',
      vendor_phone: asset.vendor_phone || '',
      contract_number: asset.contract_number || '',
      procurement_method: asset.procurement_method || 'เฉพาะเจาะจง'
    });
    setShowDetailModal(false);
    setShowEditModal(true);
  };

  // Submit Edit Asset
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editFormData || !editFormData.id) return;
    try {
      const payload = {
        ...editFormData,
        actorName: currentUser?.name || 'เจ้าหน้าที่พัสดุ',
        actorRole: currentUser?.title || 'officer'
      };

      const res = await fetch(`/api/assets/${editFormData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('✅ บันทึกการแก้ไขข้อมูลครุภัณฑ์เรียบร้อยแล้ว (บันทึกประวัติลง Audit Trail สำเร็จ)');
        setShowEditModal(false);
        setEditFormData(null);
        fetchAssets();
      } else {
        const err = await res.json();
        alert('❌ ไม่สามารถบันทึกได้: ' + (err.error || 'เกิดข้อผิดพลาด'));
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  // Delete Asset with official confirmation
  const handleDeleteAsset = async (asset) => {
    if (!asset || !asset.id) return;
    const confirmMsg = `⚠️ คำเตือนการลบข้อมูลตามระเบียบราชการ:\n\nคุณต้องการลบครุภัณฑ์ "${asset.name}" (${asset.asset_code}) ออกจากระบบหรือไม่?\n\n(การลบจะถูกบันทึกประวัติการกระทำลงในระบบ Audit Trail เพื่อให้ สตง. ตรวจสอบความโปร่งใส)`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorName: currentUser?.name || 'เจ้าหน้าที่พัสดุ',
          actorRole: currentUser?.title || 'officer'
        })
      });

      if (res.ok) {
        alert('✅ ลบรายการครุภัณฑ์เรียบร้อยแล้ว');
        setShowDetailModal(false);
        fetchAssets();
      } else {
        const err = await res.json();
        alert('❌ ไม่สามารถลบได้: ' + (err.error || 'เกิดข้อผิดพลาด'));
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการลบครุภัณฑ์');
    }
  };

  // Upload Photo for Edit
  const handleEditPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('ขนาดไฟล์รูปภาพต้องไม่เกิน 10MB ครับ');
      return;
    }
    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, base64Data: reader.result })
        });
        const data = await res.json();
        if (data.url) {
          setEditFormData(prev => ({ ...prev, photo_url: data.url }));
        }
      } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
      } finally {
        setUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Open Depreciation Modal
  const openDepreciationModal = async (asset) => {
    setSelectedAssetForDep(asset);
    try {
      const res = await fetch(`/api/assets/${asset.id}/depreciation`);
      const data = await res.json();
      setDepSchedule(data.depreciation);
      setShowDepModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Open QR Code Modal
  const openQrModal = async (asset) => {
    setQrAsset(asset);
    try {
      const res = await fetch(`/api/assets/${asset.id}/qr`);
      const data = await res.json();
      setQrDataUrl(data.qrDataUrl);
      setShowQrModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Print ST.1 or ST.3 Form (สท.1 สำหรับครุภัณฑ์ทั่วไป / สท.3 สำหรับที่ดินและสิ่งปลูกสร้าง)
  const handlePrintST1 = async (asset) => {
    try {
      const isLandBuilding = asset.category_code === '10' || asset.asset_type === 'land_building' || asset.category_id === 10;
      if (isLandBuilding) {
        const html = generateST3HTML(asset, settings);
        openPrintWindow(html, `แบบ สท.3 ทะเบียนคุมที่ดินและสิ่งปลูกสร้าง ${asset.asset_code}`);
      } else {
        const res = await fetch(`/api/assets/${asset.id}/depreciation`);
        const data = await res.json();
        const html = generateST1HTML(asset, settings, data.depreciation);
        openPrintWindow(html, `แบบ สท.1 ทะเบียนคุมทรัพย์สิน ${asset.asset_code}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Print QR Sticker
  const handlePrintSticker = async (asset) => {
    try {
      const res = await fetch(`/api/assets/${asset.id}/qr`);
      const data = await res.json();
      const html = generateQrStickerHTML(asset, settings, data.qrDataUrl);
      openPrintWindow(html, `สติกเกอร์รหัสครุภัณฑ์ ${asset.asset_code}`);
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle individual asset selection for batch actions
  const handleToggleSelect = (id) => {
    setSelectedAssetIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Toggle select all currently displayed assets
  const handleSelectAll = () => {
    if (selectedAssetIds.length === assets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(assets.map(a => a.id));
    }
  };

  // Print Batch QR Stickers on A4 Sheet
  const handleBatchPrintQR = async (idsToPrint = null) => {
    const ids = idsToPrint || selectedAssetIds;
    if (ids.length === 0) {
      alert('กรุณาติ๊กเลือกรายการครุภัณฑ์ที่ต้องการพิมพ์สติกเกอร์อย่างน้อย 1 รายการ');
      return;
    }

    try {
      setBatchPrinting(true);
      const res = await fetch('/api/assets/batch-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_ids: ids })
      });
      const data = await res.json();
      if (res.ok && data.length > 0) {
        const html = generateBatchQrStickersHTML(data, settings);
        openPrintWindow(html, `แผ่นสติกเกอร์ QR Code ครุภัณฑ์ (${data.length} ชิ้น)`);
      } else {
        alert('ไม่พบข้อมูลสำหรับพิมพ์สติกเกอร์');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการสร้างสติกเกอร์');
    } finally {
      setBatchPrinting(false);
    }
  };

  // Download Standard Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'รหัสครุภัณฑ์': 'ค.01/2567/001',
        'ชื่อครุภัณฑ์': 'โต๊ะทำงานระดับ 3-6 ขนาด 1.5 เมตร',
        'หมวดหมู่': 'ครุภัณฑ์สำนักงาน',
        'ยี่ห้อ': 'Modernform',
        'รุ่น': 'Executive Desk',
        'หมายเลขเครื่อง_Serial': 'MF-2024-001',
        'สำนัก_กอง': 'สำนักปลัดเทศบาล',
        'ผู้รับผิดชอบ': 'นายสมชาย ใจดี',
        'สถานที่ตั้ง_ห้อง': 'ห้องสำนักปลัด ชั้น 2',
        'วันที่ตรวจรับ': '2024-01-15',
        'ปีงบประมาณ': 2567,
        'แหล่งเงิน': 'เงินงบประมาณเทศบาล',
        'ผู้ขาย': 'บจก. เฟอร์นิเจอร์สยาม',
        'ราคาทุน_บาท': 12500,
        'อายุการใช้งาน_ปี': 5,
        'สถานะ': 'active',
        'หมายเหตุ': 'สำหรับโต๊ะทำงานเจ้าหน้าที่'
      },
      {
        'รหัสครุภัณฑ์': 'ค.03/2567/001',
        'ชื่อครุภัณฑ์': 'เครื่องคอมพิวเตอร์ประมวลผล All-in-One',
        'หมวดหมู่': 'ครุภัณฑ์คอมพิวเตอร์',
        'ยี่ห้อ': 'Dell',
        'รุ่น': 'OptiPlex 7400 AIO',
        'หมายเลขเครื่อง_Serial': 'DL-OPT-8812',
        'สำนัก_กอง': 'กองคลัง',
        'ผู้รับผิดชอบ': 'นางสาววิมล สถิตย์',
        'สถานที่ตั้ง_ห้อง': 'ห้องการเงินและบัญชี',
        'วันที่ตรวจรับ': '2024-02-10',
        'ปีงบประมาณ': 2567,
        'แหล่งเงิน': 'เงินงบประมาณเทศบาล',
        'ผู้ขาย': 'บจก. ไอที โซลูชั่นส์',
        'ราคาทุน_บาท': 31900,
        'อายุการใช้งาน_ปี': 3,
        'สถานะ': 'active',
        'หมายเหตุ': 'ใช้งานระบบ e-LAAS กองคลัง'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'แบบฟอร์มครุภัณฑ์');
    XLSX.writeFile(wb, 'แบบฟอร์มนำเข้าครุภัณฑ์_เทศบาล.xlsx');
  };

  // Handle Upload and parse Excel / CSV
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          alert('ไม่พบข้อมูลในไฟล์ Excel ที่เลือก');
          return;
        }

        // Map Thai and English column names dynamically
        const mapped = rawJson.map(row => {
          const findVal = (keys) => {
            for (const k of keys) {
              if (row[k] !== undefined && row[k] !== '') return row[k];
            }
            return '';
          };

          return {
            asset_code: findVal(['รหัสครุภัณฑ์', 'รหัส', 'code', 'asset_code']),
            name: findVal(['ชื่อครุภัณฑ์', 'ชื่อ', 'รายการ', 'name', 'asset_name']),
            category: findVal(['หมวดหมู่', 'หมวด', 'ประเภท', 'category']),
            brand: findVal(['ยี่ห้อ', 'brand']),
            model: findVal(['รุ่น', 'แบบ', 'model']),
            serial_number: findVal(['หมายเลขเครื่อง_Serial', 'หมายเลขเครื่อง', 'Serial', 'S/N', 'serial_number', 'ซีเรียล']),
            department: findVal(['สำนัก_กอง', 'สำนัก/กอง', 'กอง', 'แผนก', 'department']),
            custodian_name: findVal(['ผู้รับผิดชอบ', 'ผู้ครอบครอง', 'custodian_name', 'custodian']),
            location_room: findVal(['สถานที่ตั้ง_ห้อง', 'สถานที่ตั้ง', 'ห้อง', 'location_room', 'location']),
            acquired_date: findVal(['วันที่ตรวจรับ', 'วันที่ได้มา', 'acquired_date', 'date']),
            fiscal_year: findVal(['ปีงบประมาณ', 'ปี', 'fiscal_year', 'year']),
            budget_source: findVal(['แหล่งเงิน', 'แหล่งเงินงบประมาณ', 'budget_source']),
            vendor: findVal(['ผู้ขาย', 'ผู้ขาย_ผู้รับจ้าง', 'ผู้รับจ้าง', 'vendor', 'supplier']),
            cost_price: findVal(['ราคาทุน_บาท', 'ราคาทุน', 'ราคา', 'cost_price', 'price']),
            useful_life_years: findVal(['อายุการใช้งาน_ปี', 'อายุการใช้งาน', 'อายุ', 'useful_life_years']),
            status: findVal(['สถานะ', 'status']) || 'active',
            notes: findVal(['หมายเหตุ', 'notes'])
          };
        }).filter(r => r.name);

        setImportRows(mapped);
      } catch (err) {
        console.error('Error parsing excel:', err);
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบรูปแบบไฟล์');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Submit Batch Import
  const handleExecuteImport = async () => {
    if (importRows.length === 0) return;
    try {
      setImporting(true);
      const res = await fetch('/api/assets/import-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: importRows,
          actorName: currentUser?.name,
          actorRole: currentUser?.title
        })
      });

      const data = await res.json();
      if (res.ok) {
        setImportSuccessMsg(`นำเข้าข้อมูลครุภัณฑ์สำเร็จเรียบร้อย ${data.count} รายการ!`);
        fetchAssets();
        setTimeout(() => {
          setShowImportModal(false);
          setImportRows([]);
          setImportFileName('');
          setImportSuccessMsg('');
        }, 1800);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการนำเข้า');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Department Staff Mode Notice Banner */}
      {currentUser?.roleType === 'department_staff' && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 flex items-center justify-between text-amber-900 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-950">
                คุณกำลังเข้าใช้งานในสิทธิ์: <span className="underline decoration-amber-400 font-semibold">{currentUser.dept}</span>
              </div>
              <div className="text-[11px] text-amber-700">
                ระบบจำกัดการแสดงผลเฉพาะรายการครุภัณฑ์ในความรับผิดชอบของกองคุณโดยอัตโนมัติ
              </div>
            </div>
          </div>
          <button
            onClick={() => setSelectedDept(prev => prev ? '' : String(currentUser.departmentId))}
            className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 hover:bg-amber-200 px-3 py-1 rounded-lg border border-amber-300 transition"
          >
            {selectedDept ? 'ดูครุภัณฑ์ทุกกอง (ภาพรวม)' : `กลับไปดูกอง ${currentUser.dept}`}
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <Boxes className="w-7 h-7 text-gov-700" />
            <span>ระบบบริหารจัดการทะเบียนครุภัณฑ์ (Asset Management)</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            ออกรหัสอัตโนมัติตามหมวดและปีงบประมาณ คำนวณค่าเสื่อมราคาเส้นตรงตามเกณฑ์กรมบัญชีกลาง และพิมพ์สติกเกอร์ QR Code
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowInspectionModal(true)}
            className="flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3.5 py-2.5 rounded-xl font-bold text-sm shadow-xs transition"
            title="ใบตรวจรับพัสดุตามระเบียบกระทรวงการคลังฯ พ.ศ. 2560 ข้อ 175-180"
          >
            <FileCheck className="w-4 h-4 text-amber-700" />
            <span>ใบตรวจรับพัสดุ (แบบ ตร.)</span>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>นำเข้าจาก Excel (Import)</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-gov-700 hover:bg-gov-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>ลงทะเบียนครุภัณฑ์ใหม่</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="ค้นหารหัส, ชื่อครุภัณฑ์, ยี่ห้อ, รุ่น, Serial No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gov-500"
          />
        </div>

        <div>
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setSelectedSubDept('');
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gov-500"
          >
            <option value="">ทุกสำนัก/กอง</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedSubDept}
            onChange={(e) => setSelectedSubDept(e.target.value)}
            className="w-full px-3 py-2 border border-indigo-200 bg-indigo-50/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
          >
            <option value="">ทุกหน่วยงานย่อย/ฝ่าย</option>
            {subDepartments
              .filter(sd => !selectedDept || String(sd.department_id) === String(selectedDept))
              .map((sd) => (
                <option key={sd.id} value={sd.id}>{sd.name} ({sd.code})</option>
              ))}
          </select>
        </div>

        <div>
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gov-500"
          >
            <option value="">ทุกหมวดหมู่ครุภัณฑ์</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.prefix})</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gov-500"
          >
            <option value="">ทุกสถานะ</option>
            <option value="active">ใช้งานปกติ</option>
            <option value="expiring_warranty">⚠️ ใกล้หมดประกัน (&le; 60 วัน)</option>
            <option value="damaged">ชำรุดรอซ่อม</option>
            <option value="repairing">อยู่ระหว่างซ่อม</option>
            <option value="pending_disposal">รอจำหน่าย</option>
            <option value="disposed">จำหน่ายแล้ว</option>
          </select>
        </div>
      </div>

      {/* Batch Action Bar & View Mode Toggle */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3 text-xs">
          <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-700">
            <input
              type="checkbox"
              checked={assets.length > 0 && selectedAssetIds.length === assets.length}
              onChange={handleSelectAll}
              className="w-4 h-4 text-gov-600 rounded border-slate-300 focus:ring-gov-500 cursor-pointer"
            />
            <span>เลือกทั้งหมด ({assets.length} รายการ)</span>
          </label>

          {selectedAssetIds.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gov-100 text-gov-800 border border-gov-300">
              เลือกแล้ว {selectedAssetIds.length} รายการ
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Switcher: Table vs Cards */}
          <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex items-center mr-1">
            <button
              type="button"
              onClick={() => handleSetViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-white text-gov-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="มุมมองตารางกระชับ (พอดีหน้าจอ ไม่ต้องเลื่อนซ้ายขวา)"
            >
              <List className="w-3.5 h-3.5" />
              <span>ตารางพอดีจอ</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('cards')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'cards'
                  ? 'bg-white text-gov-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="มุมมองการ์ด (รูปภาพชัดเจน สวยงาม ไม่ต้องเลื่อน)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>การ์ดรูปภาพ</span>
            </button>
          </div>

          {selectedAssetIds.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedAssetIds([])}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium"
              >
                ล้างการเลือก
              </button>
              <button
                type="button"
                disabled={batchPrinting}
                onClick={() => handleBatchPrintQR()}
                className="flex items-center space-x-1.5 px-4 py-2 bg-gov-800 hover:bg-gov-900 text-white rounded-xl text-xs font-bold shadow transition"
              >
                <Printer className="w-3.5 h-3.5 text-gold-400" />
                <span>{batchPrinting ? 'กำลังสร้างสติกเกอร์...' : `🖨️ พิมพ์สติกเกอร์ QR ยกชุด (${selectedAssetIds.length} ดวง)`}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={assets.length === 0 || batchPrinting}
              onClick={() => handleBatchPrintQR(assets.map(a => a.id))}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>พิมพ์สติกเกอร์ QR ทั้งหมด ({assets.length} ดวง)</span>
            </button>
          )}
        </div>
      </div>

      {/* Assets Content: Cards View or Compact Full-width Table View */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              กำลังโหลดข้อมูลครุภัณฑ์...
            </div>
          ) : assets.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              ไม่พบรายการครุภัณฑ์ที่ตรงกับเงื่อนไข
            </div>
          ) : (
            assets.map((asset) => {
              const statusInfo = ASSET_STATUS_MAP[asset.status] || { label: asset.status, color: 'bg-slate-100 text-slate-700' };
              const isSelected = selectedAssetIds.includes(asset.id);
              return (
                <div
                  key={asset.id}
                  className={`bg-white rounded-2xl border p-4 shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                    isSelected ? 'border-gov-500 ring-2 ring-gov-200 bg-gov-50/20' : 'border-slate-200'
                  }`}
                >
                  <div>
                    {/* Header: Select + Code + Status */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(asset.id)}
                          className="w-4 h-4 text-gov-600 rounded border-slate-300 focus:ring-gov-500 cursor-pointer"
                        />
                        <span className="font-mono font-bold text-xs text-gov-800 bg-gov-50 px-2 py-0.5 rounded border border-gov-200">
                          {asset.asset_code}
                        </span>
                        <span className="text-[11px] text-slate-400">ปี {asset.fiscal_year}</span>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Thumbnail + Name */}
                    <div className="flex items-start space-x-3 mb-3">
                      <div
                        onClick={() => { setSelectedAssetForDetail(asset); setShowDetailModal(true); }}
                        className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 cursor-pointer flex items-center justify-center hover:opacity-80 transition shadow-xs"
                        title="คลิกดูภาพถ่ายและรายละเอียดเต็ม"
                      >
                        {asset.photo_url ? (
                          <img src={asset.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Image className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          onClick={() => { setSelectedAssetForDetail(asset); setShowDetailModal(true); }}
                          className="font-bold text-slate-900 hover:text-gov-700 cursor-pointer text-sm leading-snug line-clamp-2"
                        >
                          {asset.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                          {asset.brand && <span className="font-medium text-slate-700">{asset.brand} </span>}
                          {asset.model && <span>รุ่น {asset.model} </span>}
                        </div>
                        {asset.serial_number && (
                          <div className="text-[11px] text-slate-400 font-mono">S/N: {asset.serial_number}</div>
                        )}
                      </div>
                    </div>

                    {/* Department & Custodian */}
                    <div className="bg-slate-50 rounded-xl p-2.5 mb-2.5 text-xs space-y-1 border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-500">สำนัก/กอง:</span>
                        <strong className="text-slate-800">{asset.department_name || '-'}</strong>
                      </div>
                      {asset.sub_department_name && (
                        <div className="flex justify-between text-indigo-700">
                          <span className="text-slate-500">ฝ่าย/หน่วยงาน:</span>
                          <strong className="text-indigo-700 font-semibold">{asset.sub_department_name}</strong>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">ผู้ดูแล:</span>
                        <span className="text-slate-700">{asset.custodian_name || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">สถานที่:</span>
                        <span className="text-slate-500 truncate max-w-[140px]">{asset.location_room || '-'}</span>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-500">ราคาทุนจัดซื้อ</div>
                        <div className="font-semibold text-slate-800">{formatBaht(asset.cost_price)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500">มูลค่าสุทธิตามบัญชี</div>
                        <div className="font-bold text-emerald-700">{formatBaht(asset.depreciation?.bookValue)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => { setSelectedAssetForDetail(asset); setShowDetailModal(true); }}
                      className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>ดูข้อมูล</span>
                    </button>
                    <button
                      onClick={() => handlePrintST1(asset)}
                      title={asset.category_code === '10' ? "พิมพ์ทะเบียนคุมที่ดินและสิ่งปลูกสร้าง (แบบ สท.3)" : "พิมพ์ทะเบียนคุมทรัพย์สิน (แบบ สท.1)"}
                      className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{asset.category_code === '10' ? 'พิมพ์ สท.3' : 'พิมพ์ สท.1'}</span>
                    </button>
                    <button
                      onClick={() => openQrModal(asset)}
                      title="ดู QR Code & สติกเกอร์"
                      className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDepreciationModal(asset)}
                      title="ตารางค่าเสื่อมราคา"
                      className="p-1.5 rounded-lg text-gov-700 hover:bg-gov-100 border border-gov-200 transition"
                    >
                      <Calculator className="w-4 h-4" />
                    </button>
                    {(asset.category_name?.includes('ที่ดิน') || asset.asset_code?.startsWith('สท.3')) && (
                      <button
                        onClick={() => {
                          const html = generateST3HTML(asset, settings);
                          openPrintWindow(html, `แบบ สท.3 ทะเบียนคุมที่ดินและสิ่งปลูกสร้าง (${asset.asset_code})`);
                        }}
                        title="พิมพ์ทะเบียนคุมที่ดินและสิ่งปลูกสร้าง (แบบ สท.3)"
                        className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                      >
                        <Landmark className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEdit(asset)}
                      title="แก้ไขข้อมูลครุภัณฑ์"
                      className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAsset(asset)}
                      title="ลบรายการครุภัณฑ์ (บันทึก Audit Log)"
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 border border-rose-200 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Compact Responsive Table - Fits 100% width on screen with NO horizontal scrollbar */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm table-auto">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="py-3 px-2 text-center w-9">
                  <input
                    type="checkbox"
                    checked={assets.length > 0 && selectedAssetIds.length === assets.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-gov-600 rounded border-slate-300 focus:ring-gov-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">รายการครุภัณฑ์</th>
                <th className="py-3 px-3 w-44">สำนัก/กอง & ผู้ดูแล</th>
                <th className="py-3 px-3 text-right w-36">ราคา / มูลค่าสุทธิ</th>
                <th className="py-3 px-2 text-center w-36">จัดการ / พิมพ์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-400">
                    กำลังโหลดข้อมูลครุภัณฑ์...
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-400">
                    ไม่พบรายการครุภัณฑ์ที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const statusInfo = ASSET_STATUS_MAP[asset.status] || { label: asset.status, color: 'bg-slate-100 text-slate-700' };
                  const isSelected = selectedAssetIds.includes(asset.id);
                  return (
                    <tr key={asset.id} className={`transition ${isSelected ? 'bg-gov-50/70' : 'hover:bg-slate-50/80'}`}>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(asset.id)}
                          className="w-4 h-4 text-gov-600 rounded border-slate-300 focus:ring-gov-500 cursor-pointer"
                        />
                      </td>

                      {/* รายการครุภัณฑ์: ภาพ + รหัส + ปี + สถานะ + ชื่อ + รุ่น/SN */}
                      <td className="py-3 px-3">
                        <div className="flex items-start space-x-2.5">
                          {/* Asset Thumbnail */}
                          <div
                            onClick={() => { setSelectedAssetForDetail(asset); setShowDetailModal(true); }}
                            className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 cursor-pointer flex items-center justify-center hover:opacity-80 transition shadow-xs mt-0.5"
                            title="คลิกดูภาพถ่ายและรายละเอียดเต็ม"
                          >
                            {asset.photo_url ? (
                              <img src={asset.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Image className="w-5 h-5 text-slate-300" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            {/* Badges row */}
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 mb-0.5">
                              <span className="font-mono font-bold text-xs text-gov-800 bg-gov-50 px-1.5 py-0.5 rounded border border-gov-200">
                                {asset.asset_code}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                ปี {asset.fiscal_year}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                              {asset.document_url && (
                                <span title={`มีเอกสารแนบ: ${asset.document_name || 'สัญญา'}`} className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded text-[10px] flex items-center">
                                  <Paperclip className="w-3 h-3 mr-0.5 inline" /> สัญญา
                                </span>
                              )}
                            </div>

                            {/* Name */}
                            <div
                              onClick={() => { setSelectedAssetForDetail(asset); setShowDetailModal(true); }}
                              className="font-bold text-slate-900 hover:text-gov-700 cursor-pointer text-sm leading-snug"
                              title={asset.name}
                            >
                              {asset.name}
                            </div>

                            {/* Details */}
                            <div className="text-xs text-slate-500 mt-0.5">
                              {asset.brand && <span className="font-medium text-slate-700">{asset.brand} </span>}
                              {asset.model && <span>รุ่น {asset.model} </span>}
                              {asset.serial_number && <span className="text-slate-400 font-mono text-[11px]">(S/N: {asset.serial_number})</span>}
                            </div>

                            {/* Warranty Badge */}
                            {asset.warranty_expiry_date && (
                              <div className="mt-1">
                                {(() => {
                                  const diffDays = Math.ceil((new Date(asset.warranty_expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                                  if (diffDays < 0) {
                                    return <span className="text-[10px] text-slate-400">⚪ หมดประกัน</span>;
                                  } else if (diffDays <= 60) {
                                    return (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                                        ⚠️ ใกล้หมดประกัน ({diffDays} วัน)
                                      </span>
                                    );
                                  } else {
                                    return <span className="text-[10px] text-emerald-700 font-medium">🛡️ ในประกัน ({diffDays} วัน)</span>;
                                  }
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* สำนัก/กอง & ผู้ดูแล */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 text-xs">{asset.department_name}</div>
                        {asset.sub_department_name && (
                          <div className="text-[11px] font-semibold text-indigo-700 mt-0.5 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1 inline-block"></span>
                            {asset.sub_department_name}
                          </div>
                        )}
                        <div className="text-xs text-slate-600 mt-0.5">ผู้ดูแล: <span className="font-medium text-slate-700">{asset.custodian_name || '-'}</span></div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[170px]">ห้อง: {asset.location_room || '-'}</div>
                        {asset.deed_number && <div className="text-[11px] text-blue-600 font-medium mt-0.5 truncate max-w-[170px]">โฉนด: {asset.deed_number}</div>}
                      </td>

                      {/* ราคาทุน & มูลค่าสุทธิ */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="text-xs text-slate-700">
                          ทุน: <span className="font-semibold">{formatBaht(asset.cost_price)}</span>
                        </div>
                        <div className="text-xs font-bold text-emerald-600 mt-0.5">
                          สุทธิ: {formatBaht(asset.depreciation?.bookValue)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          สะสม: {formatBaht(asset.depreciation?.accumulated)}
                        </div>
                      </td>

                      {/* ปุ่มจัดการ / พิมพ์เอกสาร */}
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => { setSelectedAssetForDetail(asset); setShowDetailModal(true); }}
                            title="ดูรายละเอียดทรัพย์สิน / ภาพถ่าย / เอกสารสัญญา"
                            className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </button>
                          <button
                            onClick={() => handlePrintST1(asset)}
                            title={asset.category_code === '10' ? "พิมพ์ทะเบียนคุมที่ดินและสิ่งปลูกสร้าง (แบบ สท.3)" : "พิมพ์ทะเบียนคุมทรัพย์สิน (แบบ สท.1)"}
                            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-emerald-200 bg-emerald-50/50 transition"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openQrModal(asset)}
                            title="ดู QR Code & สติกเกอร์"
                            className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDepreciationModal(asset)}
                            title="ตารางคำนวณค่าเสื่อมราคา"
                            className="p-1.5 rounded-lg text-gov-600 hover:bg-gov-50 border border-slate-200 transition"
                          >
                            <Calculator className="w-4 h-4" />
                          </button>
                          {(asset.category_name?.includes('ที่ดิน') || asset.asset_code?.startsWith('สท.3')) && (
                            <button
                              onClick={() => {
                                const html = generateST3HTML(asset, settings);
                                openPrintWindow(html, `แบบ สท.3 ทะเบียนคุมที่ดินและสิ่งปลูกสร้าง (${asset.asset_code})`);
                              }}
                              title="พิมพ์ทะเบียนคุมที่ดินและสิ่งปลูกสร้าง (แบบ สท.3)"
                              className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-50 border border-blue-200 bg-blue-50/50 transition"
                            >
                              <Landmark className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(asset)}
                            title="แก้ไขข้อมูลครุภัณฑ์"
                            className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-50 border border-blue-200 bg-blue-50/50 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset)}
                            title="ลบรายการครุภัณฑ์ (บันทึก Audit Log)"
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 bg-rose-50/50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD ASSET (ลงทะเบียนครุภัณฑ์ใหม่) */}
      {/* ------------------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-3 sm:p-4 md:p-6">
          <div className="bg-white rounded-2xl max-w-3xl w-full my-auto shadow-2xl relative border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header (Fixed) */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0 bg-white">
              <div className="flex items-center space-x-2">
                <Boxes className="w-6 h-6 text-gov-700" />
                <h2 className="text-xl font-bold text-slate-900">ลงทะเบียนครุภัณฑ์ใหม่</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="flex-1 overflow-y-auto flex flex-col min-h-0">
              <div className="p-6 space-y-4 flex-1">
                {/* Auto Code Preview Box */}
              <div className="bg-gov-50 border border-gov-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-gov-700 font-semibold uppercase">รหัสครุภัณฑ์อัตโนมัติ (Generated Asset Code)</div>
                  <div className="text-lg font-mono font-bold text-gov-900 mt-0.5">{autoCodePreview || 'กำลังสร้างรหัส...'}</div>
                  <div className="text-[11px] text-gov-600">รันตามหมวดหมู่ / ปีงบประมาณ / ลำดับที่</div>
                </div>
                <div className="text-xs font-semibold px-2.5 py-1 bg-gov-200 text-gov-800 rounded-lg">
                  ระบบจัดสรรอัตโนมัติ
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">หมวดหมู่ครุภัณฑ์ *</label>
                  <select
                    value={formData.category_id}
                    onChange={handleCategoryChange}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.prefix}) - เกณฑ์อายุ {c.useful_life_years} ปี
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fiscal Year */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ปีงบประมาณ พ.ศ. *</label>
                  <input
                    type="number"
                    value={formData.fiscal_year}
                    onChange={e => setFormData({ ...formData, fiscal_year: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>

                {/* Asset Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อครุภัณฑ์ *</label>
                  <input
                    type="text"
                    placeholder="เช่น เครื่องคอมพิวเตอร์ประมวลผล All-in-One, เครื่องปรับอากาศ 24,000 BTU"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>

                {/* Brand & Model */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ยี่ห้อ (Brand)</label>
                  <input
                    type="text"
                    placeholder="เช่น Dell, Toyota, Daikin"
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รุ่น/แบบ (Model)</label>
                  <input
                    type="text"
                    placeholder="เช่น OptiPlex 7400, Hilux Revo"
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>

                {/* Serial Number & Acquired Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">หมายเลขเครื่อง (Serial Number)</label>
                  <input
                    type="text"
                    placeholder="เช่น S/N: 99812A-TH"
                    value={formData.serial_number}
                    onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วันที่ตรวจรับ *</label>
                  <input
                    type="date"
                    value={formData.acquired_date}
                    onChange={e => setFormData({ ...formData, acquired_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>

                {/* Department & Sub-Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สำนัก/กอง ที่ครอบครอง *</label>
                  <select
                    value={formData.department_id}
                    onChange={e => {
                      const newDeptId = Number(e.target.value);
                      setFormData({ ...formData, department_id: newDeptId, sub_department_id: '' });
                    }}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-700 mb-1">หน่วยงานย่อย / ฝ่าย / ศพด. / โรงเรียน</label>
                  <select
                    value={formData.sub_department_id || ''}
                    onChange={e => setFormData({ ...formData, sub_department_id: e.target.value ? Number(e.target.value) : '' })}
                    className="w-full px-3 py-2 border border-indigo-200 bg-indigo-50/20 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">-- ไม่ระบุ / สังกัดส่วนกลางของกอง --</option>
                    {subDepartments
                      .filter(sd => String(sd.department_id) === String(formData.department_id))
                      .map(sd => (
                        <option key={sd.id} value={sd.id}>{sd.name} ({sd.code})</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ผู้รับผิดชอบดูแล (Custodian)</label>
                  <input
                    type="text"
                    placeholder="ชื่อ-สกุล ข้าราชการ/พนักงานผู้รับผิดชอบ"
                    value={formData.custodian_name}
                    onChange={e => setFormData({ ...formData, custodian_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>

                {/* Location Room & Budget Source */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สถานที่ตั้ง / ห้อง</label>
                  <input
                    type="text"
                    placeholder="เช่น ห้องการเงิน ชั้น 1, อาคารป้องกันฯ"
                    value={formData.location_room}
                    onChange={e => setFormData({ ...formData, location_room: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">แหล่งเงินงบประมาณ</label>
                  <select
                    value={formData.budget_source}
                    onChange={e => setFormData({ ...formData, budget_source: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  >
                    <option value="เงินงบประมาณเทศบาล">เงินงบประมาณเทศบาล</option>
                    <option value="เงินสะสม">เงินสะสม</option>
                    <option value="เงินอุดหนุนเฉพาะกิจ">เงินอุดหนุนเฉพาะกิจ</option>
                    <option value="เงินบริจาค">เงินบริจาค</option>
                  </select>
                </div>

                {/* Cost Price & Useful Life */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ราคาทุนจัดซื้อ (บาท) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.cost_price}
                    onChange={e => setFormData({ ...formData, cost_price: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">อายุการใช้งาน (ปี) *</label>
                  <input
                    type="number"
                    value={formData.useful_life_years}
                    onChange={e => setFormData({ ...formData, useful_life_years: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>

                {/* Vendor / Supplier */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ผู้ขาย / ผู้รับจ้าง (Vendor)</label>
                  <input
                    type="text"
                    placeholder="ชื่อบริษัท/ห้างหุ้นส่วนจำกัด"
                    value={formData.vendor}
                    onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ผู้ขาย / ช่าง</label>
                  <input
                    type="text"
                    placeholder="เช่น 053-123456, 081-999xxxx"
                    value={formData.vendor_phone}
                    onChange={e => setFormData({ ...formData, vendor_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>

                {/* Procurement Method & Contract Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วิธีจัดซื้อจัดจ้าง (ระเบียบฯ 2560)</label>
                  <select
                    value={formData.procurement_method}
                    onChange={e => setFormData({ ...formData, procurement_method: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  >
                    <option value="เฉพาะเจาะจง">เฉพาะเจาะจง</option>
                    <option value="คัดเลือก">คัดเลือก</option>
                    <option value="e-bidding (ประกวดราคาอิเล็กทรอนิกส์)">e-bidding (ประกวดราคาอิเล็กทรอนิกส์)</option>
                    <option value="e-market (ตลาดอิเล็กทรอนิกส์)">e-market (ตลาดอิเล็กทรอนิกส์)</option>
                    <option value="รับมอบ/บริจาค">รับมอบ/บริจาค</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่สัญญา / ใบสั่งซื้อ</label>
                  <input
                    type="text"
                    placeholder="เช่น สัญญาเลขที่ 12/2569, ใบสั่งซื้อเลขที่ 05/2569"
                    value={formData.contract_number}
                    onChange={e => setFormData({ ...formData, contract_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>

                {/* Warranty Expiry */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วันสิ้นสุดการรับประกัน (Warranty Expiry)</label>
                  <input
                    type="date"
                    value={formData.warranty_expiry_date}
                    onChange={e => setFormData({ ...formData, warranty_expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                  <span className="text-[10px] text-slate-400">ระบบจะช่วยแจ้งเตือนล่วงหน้า 60 วันเพื่อรักษาสิทธิ์เคลมซ่อม</span>
                </div>

                {/* Land and Building specific fields if category is 10 or prefix สท.3 */}
                {(categories.find(c => c.id === formData.category_id)?.code === '10' ||
                  categories.find(c => c.id === formData.category_id)?.prefix === 'สท.3' ||
                  categories.find(c => c.id === formData.category_id)?.name?.includes('ที่ดิน')) && (
                  <div className="sm:col-span-2 bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between text-blue-900">
                      <div className="font-bold text-xs flex items-center space-x-1.5">
                        <Landmark className="w-4 h-4 text-blue-700" />
                        <span>ข้อมูลเฉพาะ: ที่ดินและสิ่งปลูกสร้าง (แบบ สท.3)</span>
                      </div>
                      <span className="text-[10px] bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded font-semibold">
                        อสังหาริมทรัพย์ภาครัฐ
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-blue-900 mb-1">ประเภททรัพย์สิน *</label>
                        <select
                          value={formData.asset_type}
                          onChange={e => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              asset_type: val,
                              useful_life_years: val === 'land' ? 0 : val === 'building' ? 20 : 10
                            }));
                          }}
                          className="w-full px-3 py-2 border border-blue-300 bg-white rounded-xl text-xs focus:ring-2 focus:ring-blue-500 font-medium"
                        >
                          <option value="land">ที่ดิน (สาธารณประโยชน์ / ที่ราชพัสดุ)</option>
                          <option value="building">อาคารสำนักงาน / อาคารเรียน / ศูนย์เด็กเล็ก</option>
                          <option value="infrastructure">สิ่งก่อสร้าง (ถนน สะพาน ท่อระบายน้ำ)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-blue-900 mb-1">เอกสารสิทธิ์ / เลขที่โฉนด</label>
                        <input
                          type="text"
                          placeholder="เช่น โฉนดเลขที่ 45129, น.ส.3ก 88"
                          value={formData.deed_number}
                          onChange={e => setFormData({ ...formData, deed_number: e.target.value })}
                          className="w-full px-3 py-2 border border-blue-300 bg-white rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-blue-900 mb-1">เนื้อที่ / ขนาดที่ดิน</label>
                        <input
                          type="text"
                          placeholder="เช่น 3 ไร่ 2 งาน 40 ตร.ว."
                          value={formData.land_area}
                          onChange={e => setFormData({ ...formData, land_area: e.target.value })}
                          className="w-full px-3 py-2 border border-blue-300 bg-white rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-xs font-bold text-blue-900 mb-1">พิกัด GPS / ละติจูด ลองจิจูด</label>
                        <input
                          type="text"
                          placeholder="เช่น 18.79038, 98.98171 หรือ ลิงก์ Google Maps"
                          value={formData.gps_location}
                          onChange={e => setFormData({ ...formData, gps_location: e.target.value })}
                          className="w-full px-3 py-2 border border-blue-300 bg-white rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {formData.asset_type === 'land' && (
                      <div className="text-[11px] text-blue-800 bg-blue-100/70 p-2 rounded-lg flex items-center space-x-1">
                        <Info className="w-3.5 h-3.5 text-blue-700 flex-shrink-0" />
                        <span>ตามมาตรฐานกรมบัญชีกลาง: ที่ดินไม่มีการคิดค่าเสื่อมราคา (ตั้งค่าอายุใช้งานอัตโนมัติเป็น 0 ปี)</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Photo & Document Attachments Section */}
                <div className="sm:col-span-2 border-t border-slate-100 pt-3">
                  <div className="text-xs font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
                    <Image className="w-4 h-4 text-gov-700" />
                    <span>ภาพถ่ายครุภัณฑ์ & เอกสารสัญญาแนบ (Attachments)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Photo Uploader */}
                    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3 text-center">
                      <div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-center space-x-1">
                        <Image className="w-3.5 h-3.5 text-slate-500" />
                        <span>รูปถ่ายครุภัณฑ์จริง (Asset Photo)</span>
                      </div>
                      {formData.photo_url ? (
                        <div className="relative inline-block mt-1">
                          <img src={formData.photo_url} alt="ตัวอย่างรูป" className="w-24 h-24 object-cover rounded-lg border border-slate-200 shadow-xs" />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
                            className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-full text-xs shadow"
                            title="ลบรูปภาพ"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer block py-3 text-xs text-slate-500 hover:text-gov-700 transition">
                          <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                          <span>{uploadingPhoto ? '⏳ กำลังอัปโหลด...' : 'คลิกเพื่ออัปโหลดรูปภาพ (PNG/JPG)'}</span>
                          <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                        </label>
                      )}
                    </div>

                    {/* Document Uploader */}
                    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3 text-center">
                      <div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-center space-x-1">
                        <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                        <span>เอกสารสัญญา / ใบตรวจรับ (PDF/ภาพ)</span>
                      </div>
                      {formData.document_url ? (
                        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2.5 mt-2 text-xs">
                          <div className="flex items-center space-x-2 truncate">
                            <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="truncate font-medium text-slate-800">{formData.document_name || 'สัญญาแนบ'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, document_url: '', document_name: '' }))}
                            className="text-rose-500 hover:text-rose-700 p-1"
                            title="นำเอกสารออก"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer block py-3 text-xs text-slate-500 hover:text-gov-700 transition">
                          <FileUp className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                          <span>{uploadingDoc ? '⏳ กำลังอัปโหลด...' : 'คลิกเพื่อแนบไฟล์สัญญา (PDF/Word/รูปภาพ)'}</span>
                          <input type="file" accept=".pdf,image/*,.doc,.docx" onChange={handleDocUpload} className="hidden" disabled={uploadingDoc} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

              {/* Action Buttons (Fixed Footer) */}
              <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex justify-end space-x-3 shrink-0 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-sm shadow-md transition"
                >
                  บันทึกทะเบียนครุภัณฑ์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT ASSET (แก้ไขข้อมูลทะเบียนครุภัณฑ์) */}
      {/* ------------------------------------------------------------- */}
      {showEditModal && editFormData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-3 sm:p-4 md:p-6">
          <div className="bg-white rounded-2xl max-w-3xl w-full my-auto shadow-2xl relative border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header (Fixed) */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0 bg-white">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-xl font-bold text-slate-900">แก้ไขข้อมูลทะเบียนครุภัณฑ์</h2>
                  <p className="text-xs text-gov-700 font-mono font-semibold">รหัสครุภัณฑ์: {editFormData.asset_code}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="flex-1 overflow-y-auto flex flex-col min-h-0">
              <div className="p-6 space-y-4 flex-1">
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs text-blue-900">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <span>การแก้ไขข้อมูลจะถูกบันทึกประวัติลงในระบบ <strong>Audit Trail</strong> อัตโนมัติ เพื่อความโปร่งใสตามระเบียบราชการ</span>
                  </div>
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-blue-300">{editFormData.asset_code}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ชื่อครุภัณฑ์ */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อครุภัณฑ์ *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name || ''}
                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500 font-medium"
                  />
                </div>

                {/* สำนัก/กอง */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สำนัก/กองที่รับผิดชอบ *</label>
                  <select
                    value={editFormData.department_id || 1}
                    onChange={e => setEditFormData({ ...editFormData, department_id: Number(e.target.value), sub_department_id: '' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500 font-medium"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* หน่วยงานย่อย / ฝ่าย */}
                <div>
                  <label className="block text-xs font-bold text-indigo-700 mb-1">หน่วยงานย่อย / ฝ่าย / ศพด. / โรงเรียน</label>
                  <select
                    value={editFormData.sub_department_id || ''}
                    onChange={e => setEditFormData({ ...editFormData, sub_department_id: e.target.value ? Number(e.target.value) : '' })}
                    className="w-full px-3 py-2 border border-indigo-200 bg-indigo-50/20 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">-- ไม่ระบุ / สังกัดส่วนกลางของกอง --</option>
                    {subDepartments
                      .filter(sd => String(sd.department_id) === String(editFormData.department_id || 1))
                      .map(sd => (
                        <option key={sd.id} value={sd.id}>{sd.name} ({sd.code})</option>
                      ))}
                  </select>
                </div>

                {/* สถานะครุภัณฑ์ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สถานะครุภัณฑ์ *</label>
                  <select
                    value={editFormData.status || 'active'}
                    onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500 font-semibold"
                  >
                    <option value="active">ใช้งานปกติ (พร้อมใช้งาน)</option>
                    <option value="borrowed">กำลังถูกยืม</option>
                    <option value="repair">ส่งซ่อมบำรุง</option>
                    <option value="damaged">ชำรุดรอซ่อม/รอจำหน่าย</option>
                    <option value="pending_disposal">รออนุมัติจำหน่าย</option>
                    <option value="disposed">จำหน่ายแล้ว</option>
                  </select>
                </div>

                {/* ผู้ดูแล & ห้อง */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ผู้ครอบครองดูแล</label>
                  <input
                    type="text"
                    value={editFormData.custodian_name || ''}
                    onChange={e => setEditFormData({ ...editFormData, custodian_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สถานที่ตั้ง / ห้อง</label>
                  <input
                    type="text"
                    value={editFormData.location_room || ''}
                    onChange={e => setEditFormData({ ...editFormData, location_room: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>

                {/* ยี่ห้อ & รุ่น */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ยี่ห้อ / ตราสินค้า</label>
                  <input
                    type="text"
                    value={editFormData.brand || ''}
                    onChange={e => setEditFormData({ ...editFormData, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รุ่น / โมเดล</label>
                  <input
                    type="text"
                    value={editFormData.model || ''}
                    onChange={e => setEditFormData({ ...editFormData, model: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>

                {/* Serial Number & ราคาทุน */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">หมายเลขเครื่อง (Serial Number)</label>
                  <input
                    type="text"
                    value={editFormData.serial_number || ''}
                    onChange={e => setEditFormData({ ...editFormData, serial_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ราคาทุนจัดซื้อ (บาท) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editFormData.cost_price || ''}
                    onChange={e => setEditFormData({ ...editFormData, cost_price: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500 font-bold"
                  />
                </div>

                {/* วันที่ตรวจรับ & ปีงบประมาณ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วันที่ได้มา / ตรวจรับ *</label>
                  <input
                    type="date"
                    required
                    value={editFormData.acquired_date ? editFormData.acquired_date.split('T')[0] : ''}
                    onChange={e => setEditFormData({ ...editFormData, acquired_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ปีงบประมาณ (พ.ศ.) *</label>
                  <input
                    type="number"
                    required
                    value={editFormData.fiscal_year || 2569}
                    onChange={e => setEditFormData({ ...editFormData, fiscal_year: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>

                {/* แหล่งเงิน & วิธีจัดซื้อ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">แหล่งเงินงบประมาณ</label>
                  <select
                    value={editFormData.budget_source || 'เงินงบประมาณเทศบาล'}
                    onChange={e => setEditFormData({ ...editFormData, budget_source: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  >
                    <option value="เงินงบประมาณเทศบาล">เงินงบประมาณเทศบาล (เทศบัญญัติ)</option>
                    <option value="เงินสะสม">เงินสะสม</option>
                    <option value="เงินอุดหนุนเฉพาะกิจ">เงินอุดหนุนเฉพาะกิจ (สถ./รัฐบาล)</option>
                    <option value="เงินบริจาค">เงินบริจาค / รับมอบ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">วิธีจัดซื้อจัดจ้าง</label>
                  <select
                    value={editFormData.procurement_method || 'เฉพาะเจาะจง'}
                    onChange={e => setEditFormData({ ...editFormData, procurement_method: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  >
                    <option value="เฉพาะเจาะจง">เฉพาะเจาะจง (มาตรา 56(2))</option>
                    <option value="คัดเลือก">คัดเลือก</option>
                    <option value="e-bidding">e-Bidding (ประกวดราคาอิเล็กทรอนิกส์)</option>
                    <option value="รับบริจาค">รับบริจาค / โอนย้าย</option>
                  </select>
                </div>

                {/* สัญญา & ผู้ขาย */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่สัญญา / ใบสั่งซื้อ</label>
                  <input
                    type="text"
                    value={editFormData.contract_number || ''}
                    onChange={e => setEditFormData({ ...editFormData, contract_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ผู้ขาย / ผู้รับจ้าง</label>
                  <input
                    type="text"
                    value={editFormData.vendor || ''}
                    onChange={e => setEditFormData({ ...editFormData, vendor: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>

                {/* หมายเหตุ */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">บันทึกเพิ่มเติม / หมายเหตุ</label>
                  <textarea
                    rows="2"
                    value={editFormData.notes || ''}
                    onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                  />
                </div>
              </div>
            </div>

              {/* Action Buttons (Fixed Footer) */}
              <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex justify-end space-x-3 shrink-0 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md transition flex items-center space-x-1.5"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>บันทึกการแก้ไข</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DEPRECIATION SCHEDULE (คำนวณค่าเสื่อมราคา กรมบัญชีกลาง) */}
      {/* ------------------------------------------------------------- */}
      {showDepModal && selectedAssetForDep && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-3 sm:p-4 md:p-6">
          <div className="bg-white rounded-2xl max-w-3xl w-full my-auto shadow-2xl relative border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header (Fixed) */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0 bg-white">
              <div className="flex items-center space-x-2">
                <Calculator className="w-6 h-6 text-gov-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">ตารางคำนวณค่าเสื่อมราคาประจำปี (วิธีเส้นตรง)</h2>
                  <p className="text-xs text-slate-500">ตามหลักเกณฑ์กระทรวงการคลังและกรมบัญชีกลาง</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDepModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">

            {/* Asset Mini Header */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">รหัสครุภัณฑ์:</span>
                <strong className="text-slate-900 font-mono text-sm">{selectedAssetForDep.asset_code}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">ชื่อครุภัณฑ์:</span>
                <strong className="text-slate-900">{selectedAssetForDep.name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">ราคาทุนจัดซื้อ:</span>
                <strong className="text-slate-900 text-sm">{formatBaht(selectedAssetForDep.cost_price)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">อัตราค่าเสื่อม:</span>
                <strong className="text-gov-700 text-sm">{depSchedule?.annualRate}% ต่อปี ({selectedAssetForDep.useful_life_years} ปี)</strong>
              </div>
            </div>

            {/* Schedule Table */}
            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl mb-4">
              <table className="w-full text-left text-xs table-auto">
                <thead className="bg-gov-900 text-white sticky top-0">
                  <tr>
                    <th className="py-2 px-2 text-center w-12">ปีที่</th>
                    <th className="py-2 px-2 text-center">ปีงบฯ (จำนวนวัน)</th>
                    <th className="py-2 px-2.5 text-right">ค่าเสื่อมปีนี้</th>
                    <th className="py-2 px-2.5 text-right">ค่าเสื่อมสะสม</th>
                    <th className="py-2 px-2.5 text-right">มูลค่าสุทธิ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {depSchedule?.schedule?.map(row => (
                    <tr key={row.yearIndex} className="hover:bg-slate-50">
                      <td className="py-2 px-2 text-center font-medium">{row.yearIndex}</td>
                      <td className="py-2 px-2 text-center">
                        <span className="font-bold text-gov-800">{row.fiscalYear}</span>{' '}
                        <span className="text-[11px] text-slate-500">({row.daysCount} วัน)</span>
                      </td>
                      <td className="py-2 px-2.5 text-right font-medium">{formatBaht(row.depreciationAmount)}</td>
                      <td className="py-2 px-2.5 text-right text-rose-600 font-medium">{formatBaht(row.accumulatedDepreciation)}</td>
                      <td className="py-2 px-2.5 text-right font-bold text-emerald-600">{formatBaht(row.bookValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>

            {/* Modal Footer (Fixed) */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0 rounded-b-2xl">
              <div className="text-xs text-slate-500">
                * กรมบัญชีกลางกำหนดมูลค่าซากคงเหลือทางบัญชี 1 บาท
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDepModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-100 transition"
                >
                  ปิด
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintST1(selectedAssetForDep)}
                  className="px-4 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ทะเบียนคุม (แบบ สท.1)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: QR CODE STICKER (สติกเกอร์ติดตัวทรัพย์สิน) */}
      {/* ------------------------------------------------------------- */}
      {showQrModal && qrAsset && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <QrCode className="w-6 h-6 text-gov-700" />
                <h2 className="text-lg font-bold text-slate-900">ป้ายสติกเกอร์รหัส QR Code ครุภัณฑ์</h2>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sticker Preview Box */}
            <div className="border-2 border-slate-900 rounded-xl p-4 bg-white shadow-inner mb-4">
              <div className="text-center border-b border-slate-800 pb-2 mb-3">
                <div className="font-bold text-slate-900 text-sm">🏛️ {settings.org_name}</div>
                <div className="text-xs text-slate-600">ทะเบียนทรัพย์สินทางราชการ</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1 text-xs">
                  <div className="font-mono font-bold text-base text-slate-900">{qrAsset.asset_code}</div>
                  <div className="font-semibold text-slate-800 line-clamp-1">{qrAsset.name}</div>
                  <div className="text-slate-500">กอง: {qrAsset.department_name}</div>
                  <div className="text-slate-500">ผู้ดูแล: {qrAsset.custodian_name || '-'}</div>
                  <div className="text-slate-400 text-[10px]">ตรวจรับ: {formatThaiDate(qrAsset.acquired_date)}</div>
                </div>
                <div className="text-center">
                  <img src={qrDataUrl} alt="QR Code" className="w-24 h-24 border border-slate-200 p-1 rounded-lg" />
                  <span className="text-[9px] text-slate-400 block mt-1">สแกนตรวจนับ</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowQrModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50"
              >
                ปิด
              </button>
              <button
                onClick={() => handlePrintSticker(qrAsset)}
                className="px-4 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์สติกเกอร์ (Print Tag)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: IMPORT EXCEL (นำเข้าข้อมูลครุภัณฑ์จาก Excel) */}
      {/* ------------------------------------------------------------- */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">นำเข้าข้อมูลครุภัณฑ์จากไฟล์ Excel (.xlsx, .xls, .csv)</h2>
                  <p className="text-xs text-slate-500">รองรับไฟล์ Excel เดิมของเทศบาล และคำนวณค่าเสื่อมราคาให้อัตโนมัติ</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportRows([]);
                  setImportFileName('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center space-x-2 text-sm mb-4">
                <Check className="w-5 h-5 text-emerald-600" />
                <span className="font-bold">{importSuccessMsg}</span>
              </div>
            )}

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Step 1 & 2 Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Step 1: Download Template */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-gov-800 uppercase tracking-wide">ขั้นตอนที่ 1: แบบฟอร์มมาตรฐาน</div>
                    <div className="text-sm font-semibold text-slate-900 mt-1">ดาวน์โหลดไฟล์แม่แบบ Excel</div>
                    <p className="text-xs text-slate-500 mt-1">
                      มีหัวคอลัมน์มาตรฐานครบถ้วน (รหัส, ชื่อ, หมวดหมู่, สังกัดกอง, ราคาทุน, วันที่ตรวจรับ) พร้อมตัวอย่าง
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="mt-3 flex items-center justify-center space-x-1.5 w-full py-2 bg-white hover:bg-slate-100 text-gov-800 font-bold rounded-xl text-xs border border-slate-300 shadow-sm transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลดไฟล์แม่แบบ Excel (.xlsx)</span>
                  </button>
                </div>

                {/* Step 2: Upload File */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-gov-800 uppercase tracking-wide">ขั้นตอนที่ 2: อัปโหลดไฟล์</div>
                    <div className="text-sm font-semibold text-slate-900 mt-1">เลือกไฟล์ Excel ที่ต้องการนำเข้า</div>
                    <p className="text-xs text-slate-500 mt-1">
                      รองรับไฟล์สกุล .xlsx, .xls และ .csv (ระบบจะตรวจสอบหัวคอลัมน์ให้อัตโนมัติ)
                    </p>
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 flex items-center justify-center space-x-1.5 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{importFileName ? `เปลี่ยนไฟล์: ${importFileName}` : 'เลือกไฟล์ Excel จากในเครื่อง'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3: Preview Table */}
              {importRows.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-700 uppercase">ตัวอย่างข้อมูลที่จะนำเข้า:</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        พบ {importRows.length} รายการ
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">แสดงตัวอย่าง 5 รายการแรก</span>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs table-auto">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2 px-2.5 w-10 text-center">ที่</th>
                          <th className="py-2 px-2.5">รหัส &amp; ชื่อครุภัณฑ์</th>
                          <th className="py-2 px-2.5">หมวดหมู่ / สำนัก/กอง</th>
                          <th className="py-2 px-2.5 text-right whitespace-nowrap">ราคาทุน &amp; วันที่รับ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importRows.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 align-top">
                            <td className="py-2 px-2.5 text-center text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-2.5">
                              <div className="font-mono font-bold text-gov-800">
                                {row.asset_code || <span className="text-slate-400 font-normal italic">(สร้างให้อัตโนมัติ)</span>}
                              </div>
                              <div className="font-semibold text-slate-900">{row.name}</div>
                            </td>
                            <td className="py-2 px-2.5 text-slate-600">
                              <div>{row.category || '-'}</div>
                              <div className="text-[11px] text-slate-400">{row.department || '-'}</div>
                            </td>
                            <td className="py-2 px-2.5 text-right whitespace-nowrap">
                              <div className="font-medium text-slate-900">{formatBaht(row.cost_price || 0)}</div>
                              <div className="text-[11px] text-slate-400">{row.acquired_date || '-'}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-[11px] text-slate-500 mt-2 flex items-center space-x-1">
                    <Info className="w-3.5 h-3.5 text-gov-600" />
                    <span>หากรายการใดไม่ได้ระบุรหัสครุภัณฑ์ ระบบจะจัดสรรรหัสตามหมวดหมู่และปีงบประมาณให้อัตโนมัติ</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center">
              <div className="text-xs text-slate-500">
                {importRows.length > 0 ? `พร้อมนำเข้าข้อมูล ${importRows.length} รายการ` : 'กรุณาเลือกไฟล์ Excel เพื่อดูตัวอย่างข้อมูล'}
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportRows([]);
                    setImportFileName('');
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={importRows.length === 0 || importing}
                  onClick={handleExecuteImport}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center space-x-1.5 ${
                    importRows.length === 0 || importing
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{importing ? 'กำลังนำเข้าข้อมูล...' : `ยืนยันนำเข้าข้อมูล (${importRows.length} รายการ)`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ASSET DETAIL & ATTACHMENTS (ดูรายละเอียดเต็ม / รูปถ่าย / สัญญา) */}
      {/* ------------------------------------------------------------- */}
      {showDetailModal && selectedAssetForDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-3 sm:p-4 md:p-6">
          <div className="bg-white rounded-2xl max-w-3xl w-full my-auto shadow-2xl relative border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header (Fixed) */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0 bg-white">
              <div className="flex items-center space-x-2">
                <Boxes className="w-6 h-6 text-gov-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">ทะเบียนทรัพย์สิน: {selectedAssetForDetail.name}</h2>
                  <p className="text-xs text-gov-700 font-mono font-semibold">{selectedAssetForDetail.asset_code}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Photo & Basic Info Header */}
              <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="w-32 h-32 rounded-xl bg-white border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xs">
                  {selectedAssetForDetail.photo_url ? (
                    <img
                      src={selectedAssetForDetail.photo_url}
                      alt={selectedAssetForDetail.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <Image className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                      <span className="text-[10px]">ไม่มีภาพถ่าย</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{selectedAssetForDetail.name}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ASSET_STATUS_MAP[selectedAssetForDetail.status]?.color || 'bg-slate-100 text-slate-700'}`}>
                      {ASSET_STATUS_MAP[selectedAssetForDetail.status]?.label || selectedAssetForDetail.status}
                    </span>
                  </div>
                  <div><strong>หมวดหมู่:</strong> {selectedAssetForDetail.category_name}</div>
                  <div><strong>ยี่ห้อ/รุ่น:</strong> {selectedAssetForDetail.brand || '-'} รุ่น {selectedAssetForDetail.model || '-'}</div>
                  <div><strong>หมายเลขเครื่อง (S/N):</strong> <span className="font-mono">{selectedAssetForDetail.serial_number || '-'}</span></div>
                  <div><strong>สำนัก/กอง:</strong> <span className="font-semibold text-gov-800">{selectedAssetForDetail.department_name}</span> {selectedAssetForDetail.sub_department_name && <span className="text-indigo-700 font-bold ml-1.5 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-md">({selectedAssetForDetail.sub_department_name})</span>}</div>
                  <div><strong>ผู้ครอบครองดูแล:</strong> {selectedAssetForDetail.custodian_name || '-'} | ห้อง: {selectedAssetForDetail.location_room || '-'}</div>
                </div>
              </div>

              {/* Financial and Procurement Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-gov-50/50 p-3.5 rounded-xl border border-gov-100">
                <div>
                  <span className="text-slate-500 block">ราคาทุนจัดซื้อ:</span>
                  <strong className="text-sm text-slate-900">{formatBaht(selectedAssetForDetail.cost_price)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">มูลค่าสุทธิ (Book Value):</span>
                  <strong className="text-sm text-emerald-600">{formatBaht(selectedAssetForDetail.depreciation?.bookValue)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">อายุการใช้งาน:</span>
                  <strong>{selectedAssetForDetail.useful_life_years} ปี</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">วันที่ตรวจรับ:</span>
                  <strong>{formatThaiDate(selectedAssetForDetail.acquired_date)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">วิธีจัดซื้อจัดจ้าง:</span>
                  <strong>{selectedAssetForDetail.procurement_method || 'เฉพาะเจาะจง'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">เลขที่สัญญา:</span>
                  <strong className="font-mono">{selectedAssetForDetail.contract_number || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">ผู้ขาย/ผู้รับจ้าง:</span>
                  <span className="truncate block font-medium">{selectedAssetForDetail.vendor || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">เบอร์โทรศัพท์:</span>
                  <span className="font-mono">{selectedAssetForDetail.vendor_phone || '-'}</span>
                </div>
              </div>

              {/* Land and Building Special Information (if applicable) */}
              {(selectedAssetForDetail.deed_number || selectedAssetForDetail.land_area || selectedAssetForDetail.gps_location || selectedAssetForDetail.category_name?.includes('ที่ดิน')) && (
                <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 text-xs text-blue-950 space-y-2">
                  <div className="font-bold flex items-center space-x-1.5 text-blue-900">
                    <Landmark className="w-4 h-4 text-blue-700" />
                    <span>ข้อมูลอสังหาริมทรัพย์ ที่ดินและสิ่งปลูกสร้าง (แบบ สท.3)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div><strong>เอกสารสิทธิ์/เลขที่โฉนด:</strong> {selectedAssetForDetail.deed_number || '-'}</div>
                    <div><strong>ขนาดเนื้อที่:</strong> {selectedAssetForDetail.land_area || '-'}</div>
                    <div>
                      <strong>พิกัด GPS/แผนที่:</strong>{' '}
                      {selectedAssetForDetail.gps_location ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedAssetForDetail.gps_location)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 underline font-semibold inline-flex items-center space-x-1"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>ดูบน Google Maps</span>
                        </a>
                      ) : '-'}
                    </div>
                  </div>
                </div>
              )}

              {/* Document Attachment Box */}
              {selectedAssetForDetail.document_url ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-950">
                  <div className="flex items-center space-x-2 truncate">
                    <FileText className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                    <div>
                      <div className="font-bold">{selectedAssetForDetail.document_name || 'เอกสารสัญญาแนบ'}</div>
                      <div className="text-[10px] text-emerald-700">เอกสารสัญญาจัดซื้อจัดจ้าง / ใบตรวจรับพัสดุ</div>
                    </div>
                  </div>
                  <a
                    href={selectedAssetForDetail.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs flex items-center space-x-1 flex-shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>เปิดดู / ดาวน์โหลด</span>
                  </a>
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  ไม่มีไฟล์เอกสารสัญญาแนบ
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedAssetForDetail)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>แก้ไขข้อมูล</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAsset(selectedAssetForDetail)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบรายการ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePrintST1(selectedAssetForDetail);
                  }}
                  className="px-3 py-1.5 bg-gov-700 hover:bg-gov-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ สท.1</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openQrModal(selectedAssetForDetail);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 flex items-center space-x-1"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR Code</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>

          {/* Modal Footer (Fixed) */}
          <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0 rounded-b-2xl">
            <div className="text-xs text-slate-500">
              สถานะ: <strong className="text-gov-800">{selectedAssetForDetail.status === 'active' ? 'ใช้งานปกติ' : selectedAssetForDetail.status}</strong>
            </div>
            <button
              type="button"
              onClick={() => setShowDetailModal(false)}
              className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs shadow transition"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: INSPECTION RECORDS (ใบตรวจรับพัสดุ แบบ ตร.) */}
      {/* ------------------------------------------------------------- */}
      {showInspectionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-6 h-6 text-gov-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">ทะเบียนใบตรวจรับพัสดุ (แบบ ตร.)</h2>
                  <p className="text-xs text-slate-500">
                    ตามระเบียบกระทรวงการคลังฯ พ.ศ. 2560 ข้อ 175 - 180 (ตรวจรับของถูกต้อง แล้วขึ้นทะเบียน สท.1 ทันที)
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewInspectionForm(!showNewInspectionForm)}
                  className="px-3.5 py-1.5 bg-gov-700 hover:bg-gov-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showNewInspectionForm ? 'ปิดฟอร์ม' : '➕ ออกใบตรวจรับใหม่'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowInspectionModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form to create new inspection record */}
            {showNewInspectionForm && (
              <form onSubmit={handleCreateInspection} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5 space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase flex items-center space-x-1">
                  <span>บันทึกใบตรวจรับพัสดุใหม่</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">เลขที่ใบตรวจรับ (Auto ได้)</label>
                    <input
                      type="text"
                      placeholder="เช่น ตร.02/2569"
                      value={newInspectionForm.doc_number}
                      onChange={e => setNewInspectionForm({ ...newInspectionForm, doc_number: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">วันที่ตรวจรับ *</label>
                    <input
                      type="date"
                      value={newInspectionForm.inspection_date}
                      onChange={e => setNewInspectionForm({ ...newInspectionForm, inspection_date: e.target.value })}
                      required
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">ตามสัญญา/ใบสั่งซื้อเลขที่ *</label>
                    <input
                      type="text"
                      placeholder="เช่น บก.12/2569"
                      value={newInspectionForm.purchase_order_no}
                      onChange={e => setNewInspectionForm({ ...newInspectionForm, purchase_order_no: e.target.value })}
                      required
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">ผู้ขาย/ผู้รับจ้าง *</label>
                    <input
                      type="text"
                      placeholder="เช่น บจก. สยามไอที โซลูชั่นส์"
                      value={newInspectionForm.vendor_name}
                      onChange={e => setNewInspectionForm({ ...newInspectionForm, vendor_name: e.target.value })}
                      required
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">เบอร์โทรศัพท์ผู้ขาย</label>
                    <input
                      type="text"
                      placeholder="02-xxx-xxxx"
                      value={newInspectionForm.vendor_phone}
                      onChange={e => setNewInspectionForm({ ...newInspectionForm, vendor_phone: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">สำนัก/กอง ที่ขอซื้อ</label>
                    <select
                      value={newInspectionForm.department_id}
                      onChange={e => setNewInspectionForm({ ...newInspectionForm, department_id: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">ชื่อรายการพัสดุ/ครุภัณฑ์ *</label>
                    <input
                      type="text"
                      placeholder="เช่น เครื่องปรับอากาศ ขนาด 24,000 BTU"
                      value={newInspectionForm.item_name}
                      onChange={e => setNewInspectionForm({ ...newInspectionForm, item_name: e.target.value })}
                      required
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">หมวดหมู่ครุภัณฑ์ *</label>
                    <select
                      value={newInspectionForm.category_id}
                      onChange={e => setNewInspectionForm({ ...newInspectionForm, category_id: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.prefix})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">ราคาทุนรวม (บาท) *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newInspectionForm.cost_price}
                      onChange={e => setNewInspectionForm({ ...newInspectionForm, cost_price: e.target.value })}
                      required
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">ยี่ห้อ</label>
                    <input
                      type="text"
                      placeholder="เช่น Daikin / HP / Dell"
                      value={newInspectionForm.brand}
                      onChange={e => setNewInspectionForm({ ...newInspectionForm, brand: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">รุ่น (Model)</label>
                    <input
                      type="text"
                      placeholder="เช่น Inverter FTKC"
                      value={newInspectionForm.model}
                      onChange={e => setNewInspectionForm({ ...newInspectionForm, model: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">หมายเลขเครื่อง (Serial No.)</label>
                    <input
                      type="text"
                      placeholder="S/N ของเครื่อง"
                      value={newInspectionForm.serial_number}
                      onChange={e => setNewInspectionForm({ ...newInspectionForm, serial_number: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">ประธานกรรมการตรวจรับ *</label>
                    <input
                      type="text"
                      value={newInspectionForm.chairman_name}
                      onChange={e => setNewInspectionForm({ ...newInspectionForm, chairman_name: e.target.value })}
                      required
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">กรรมการตรวจรับ คนที่ 1 *</label>
                    <input
                      type="text"
                      value={newInspectionForm.member1_name}
                      onChange={e => setNewInspectionForm({ ...newInspectionForm, member1_name: e.target.value })}
                      required
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">กรรมการตรวจรับ คนที่ 2 *</label>
                    <input
                      type="text"
                      value={newInspectionForm.member2_name}
                      onChange={e => setNewInspectionForm({ ...newInspectionForm, member2_name: e.target.value })}
                      required
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs shadow-sm transition"
                  >
                    บันทึกใบตรวจรับพัสดุ
                  </button>
                </div>
              </form>
            )}

            {/* Inspections List */}
            <div className="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-xl">
              <div className="hidden md:block">
                <table className="w-full text-left text-xs table-auto">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 w-36">ใบตรวจรับ / วันที่</th>
                      <th className="py-2.5 px-3">รายการพัสดุ / ผู้ขาย &amp; สัญญา</th>
                      <th className="py-2.5 px-3 text-right w-28 whitespace-nowrap">วงเงิน (บาท)</th>
                      <th className="py-2.5 px-3 text-center w-36 whitespace-nowrap">สถานะขึ้นทะเบียน</th>
                      <th className="py-2.5 px-3 text-center w-28 whitespace-nowrap">ปฏิบัติการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspections.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-10 text-slate-400">
                          ยังไม่มีประวัติการบันทึกใบตรวจรับพัสดุ (กดปุ่ม "➕ ออกใบตรวจรับใหม่" เพื่อสร้างรายการ)
                        </td>
                      </tr>
                    ) : (
                      inspections.map(ins => (
                        <tr key={ins.id} className="hover:bg-slate-50 transition align-top">
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-900">{ins.doc_number}</div>
                            <div className="text-slate-500 mt-0.5">{formatThaiDate(ins.inspection_date)}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{ins.item_name}</div>
                            <div className="text-[11px] text-slate-500">
                              หมวด: {ins.category_name} {ins.brand || ins.model ? `| ${ins.brand} ${ins.model}` : ''}
                            </div>
                            <div className="text-[11px] text-slate-600 mt-1">
                              ผู้ขาย: {ins.vendor_name} <span className="text-slate-400 font-mono">({ins.purchase_order_no})</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            {formatBaht(ins.cost_price)}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {ins.created_asset_id ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>ขึ้นทะเบียนแล้ว</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleConvertInspectionToAsset(ins)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-gov-700 hover:bg-gov-800 text-white rounded-lg text-[10.5px] font-bold shadow-xs transition"
                                title="ตรวจรับผ่านแล้ว ขึ้นทะเบียนเป็นครุภัณฑ์ สท.1 รหัสใหม่อัตโนมัติ"
                              >
                                <span>✅ ขึ้นทะเบียน สท.1</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => handlePrintInspection(ins)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition"
                              title="พิมพ์ใบตรวจรับพัสดุ (แบบ ตร.)"
                            >
                              <Printer className="w-3.5 h-3.5 text-amber-700" />
                              <span>พิมพ์แบบ ตร.</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-100">
                {inspections.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    ยังไม่มีประวัติการบันทึกใบตรวจรับพัสดุ
                  </div>
                ) : (
                  inspections.map(ins => (
                    <div key={ins.id} className="p-3.5 space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-mono font-bold text-slate-900">{ins.doc_number} • {formatThaiDate(ins.inspection_date)}</div>
                          <div className="font-bold text-slate-900 text-sm mt-0.5">{ins.item_name}</div>
                        </div>
                        <div className="font-bold text-gov-800 shrink-0">{formatBaht(ins.cost_price)}</div>
                      </div>
                      <div className="text-slate-600">
                        ผู้ขาย: {ins.vendor_name} ({ins.purchase_order_no})
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        {ins.created_asset_id ? (
                          <span className="flex-1 text-center py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                            ขึ้นทะเบียนแล้ว
                          </span>
                        ) : (
                          <button
                            onClick={() => handleConvertInspectionToAsset(ins)}
                            className="flex-1 py-1.5 bg-gov-700 text-white rounded-lg text-[11px] font-bold"
                          >
                            ✅ ขึ้นทะเบียน สท.1
                          </button>
                        )}
                        <button
                          onClick={() => handlePrintInspection(ins)}
                          className="flex-1 py-1.5 bg-amber-50 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-700" /><span>พิมพ์แบบ ตร.</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-3 mt-4">
              <button
                type="button"
                onClick={() => setShowInspectionModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

