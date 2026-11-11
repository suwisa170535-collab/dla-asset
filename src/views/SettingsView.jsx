import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Save,
  Plus,
  Users,
  CheckCircle2,
  Calendar,
  Database,
  Download,
  UploadCloud,
  ShieldCheck,
  Clock,
  HardDrive,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Trash2,
  Landmark,
  Edit2,
  X,
  Layers,
  Tag,
  Search,
  KeyRound,
  UserPlus,
  Lock,
  UserCheck,
  Shield
} from 'lucide-react';

export default function SettingsView({ 
  settings, 
  setSettings, 
  departments = [], 
  fetchDepartments, 
  subDepartments = [],
  fetchSubDepartments,
  categories = [], 
  fetchCategories, 
  currentUser 
}) {
  const [formData, setFormData] = useState({
    org_name: settings.org_name || 'เทศบาลตำบลสุขเกษมพัฒนา',
    org_type: settings.org_type || 'เทศบาลตำบล',
    org_logo: settings.org_logo || '',
    district: settings.district || 'อำเภอเมือง',
    province: settings.province || 'จังหวัดเชียงใหม่',
    fiscal_year: settings.fiscal_year || '2569',
    mayor_name: settings.mayor_name || 'นายสมศักดิ์ วัฒนากูล',
    clerk_name: settings.clerk_name || 'นางพิมพา จิตตรง',
    supply_officer_name: settings.supply_officer_name || 'นางสาวนิตยา พัสดุเจริญ'
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');
  const [autoBackups, setAutoBackups] = useState([]);

  // Fetch Database Status
  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/backup/status');
      const data = await res.json();
      setDbStatus(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Auto Backups List
  const fetchAutoBackups = async () => {
    try {
      const res = await fetch('/api/backup/list');
      const data = await res.json();
      if (Array.isArray(data)) setAutoBackups(data);
    } catch (err) {
      console.error(err);
    }
  };

  // User & Password Management State
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetPassUser, setResetPassUser] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    password: '',
    name: '',
    title: '',
    dept: 'สำนักปลัดเทศบาล',
    department_id: 1,
    role_type: 'department_staff'
  });

  // Fetch Users List
  const fetchUsersList = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (Array.isArray(data)) setUsersList(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    fetchDbStatus();
    fetchAutoBackups();
    fetchUsersList();
  }, []);

  useEffect(() => {
    if (settings) {
      setFormData({
        org_name: settings.org_name || '',
        org_type: settings.org_type || 'เทศบาลตำบล',
        org_logo: settings.org_logo || '',
        district: settings.district || '',
        province: settings.province || '',
        fiscal_year: settings.fiscal_year || '2569',
        mayor_name: settings.mayor_name || '',
        clerk_name: settings.clerk_name || '',
        supply_officer_name: settings.supply_officer_name || ''
      });
    }
  }, [settings]);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('กรุณาเลือกไฟล์ภาพขนาดไม่เกิน 5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, org_logo: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, org_logo: '' }));
  };

  // New Department Form
  const [newDept, setNewDept] = useState({
    code: '',
    name: '',
    head_name: '',
    head_position: ''
  });

  // Edit Department State
  const [editingDept, setEditingDept] = useState(null);

  const handleUpdateDept = async (e) => {
    e.preventDefault();
    if (!editingDept) return;
    try {
      const res = await fetch(`/api/departments/${editingDept.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingDept,
          actorName: currentUser?.name,
          actorRole: currentUser?.title
        })
      });
      const data = await res.json();
      if (res.ok) {
        setEditingDept(null);
        if (fetchDepartments) fetchDepartments();
        alert('✅ บันทึกการแก้ไขสำนัก/กองเรียบร้อยแล้ว');
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการแก้ไขสำนัก/กอง');
    }
  };

  const handleDeleteDept = async (dept) => {
    const confirmDelete = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบสำนัก/กอง "${dept.name}" (รหัส ${dept.code})?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/departments/${dept.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorName: currentUser?.name,
          actorRole: currentUser?.title
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (fetchDepartments) fetchDepartments();
        alert('✅ ลบสำนัก/กองเรียบร้อยแล้ว');
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการลบสำนัก/กอง');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการลบสำนัก/กอง');
    }
  };

  // Sub-Department Management State
  const [selectedSubDeptFilterDept, setSelectedSubDeptFilterDept] = useState('');
  const [newSubDept, setNewSubDept] = useState({
    department_id: departments[0]?.id || 1,
    code: '',
    name: '',
    head_name: '',
    head_position: '',
    notes: ''
  });
  const [editingSubDept, setEditingSubDept] = useState(null);

  const handleAddSubDept = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/sub-departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSubDept,
          actorName: currentUser?.name,
          actorRole: currentUser?.title
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNewSubDept({
          department_id: departments[0]?.id || 1,
          code: '',
          name: '',
          head_name: '',
          head_position: '',
          notes: ''
        });
        if (fetchSubDepartments) fetchSubDepartments();
        alert('✅ เพิ่มหน่วยงานย่อย/ฝ่าย เรียบร้อยแล้ว');
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleUpdateSubDept = async (e) => {
    e.preventDefault();
    if (!editingSubDept) return;
    try {
      const res = await fetch(`/api/sub-departments/${editingSubDept.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingSubDept,
          actorName: currentUser?.name,
          actorRole: currentUser?.title
        })
      });
      const data = await res.json();
      if (res.ok) {
        setEditingSubDept(null);
        if (fetchSubDepartments) fetchSubDepartments();
        alert('✅ บันทึกการแก้ไขหน่วยงานย่อยเรียบร้อยแล้ว');
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการแก้ไขหน่วยงานย่อย');
    }
  };

  const handleDeleteSubDept = async (sd) => {
    const confirmDelete = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหน่วยงานย่อย "${sd.name}" (รหัส ${sd.code})?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/sub-departments/${sd.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorName: currentUser?.name,
          actorRole: currentUser?.title
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (fetchSubDepartments) fetchSubDepartments();
        alert('✅ ลบหน่วยงานย่อยเรียบร้อยแล้ว');
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการลบหน่วยงานย่อย');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการลบหน่วยงานย่อย');
    }
  };

  // Category Management State
  const [catSearch, setCatSearch] = useState('');
  const [editingCat, setEditingCat] = useState(null);
  const [newCat, setNewCat] = useState({
    code: '',
    name: '',
    prefix: 'ค.',
    useful_life_years: 5,
    depreciation_rate_pct: 20,
    description: ''
  });

  const handleAddCat = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCat)
      });
      const data = await res.json();
      if (res.ok) {
        setNewCat({
          code: '',
          name: '',
          prefix: 'ค.',
          useful_life_years: 5,
          depreciation_rate_pct: 20,
          description: ''
        });
        if (fetchCategories) fetchCategories();
        alert('✅ เพิ่มหมวดหมู่ครุภัณฑ์เรียบร้อยแล้ว');
      } else {
        alert('❌ ไม่สามารถเพิ่มหมวดหมู่ได้: ' + (data.error || 'เกิดข้อผิดพลาด'));
      }
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleUpdateCat = async (e) => {
    e.preventDefault();
    if (!editingCat) return;
    try {
      const res = await fetch(`/api/categories/${editingCat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCat)
      });
      const data = await res.json();
      if (res.ok) {
        setEditingCat(null);
        if (fetchCategories) fetchCategories();
        alert('✅ บันทึกการแก้ไขหมวดหมู่เรียบร้อยแล้ว');
      } else {
        alert('❌ ไม่สามารถแก้ไขหมวดหมู่ได้: ' + (data.error || 'เกิดข้อผิดพลาด'));
      }
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleDeleteCat = async (cat) => {
    if ((cat.asset_count || 0) > 0) {
      alert(`⚠️ ไม่สามารถลบ "${cat.name}" ได้เนื่องจากมีครุภัณฑ์ในระบบใช้งานอยู่ ${cat.asset_count} รายการ`);
      return;
    }
    if (!window.confirm(`ยืนยันการลบหมวดหมู่ "${cat.name}" (${cat.prefix})?`)) return;
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        if (fetchCategories) fetchCategories();
        alert('✅ ลบหมวดหมู่เรียบร้อยแล้ว');
      } else {
        alert('❌ ไม่สามารถลบได้: ' + (data.error || 'เกิดข้อผิดพลาด'));
      }
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const [demoLoading, setDemoLoading] = useState(false);

  const handleLoadDemo = async () => {
    const confirmLoad = window.confirm(
      '✨ โหลดชุดข้อมูลตัวอย่างสำหรับนำเสนอ Demo:\nระบบจะสร้างข้อมูลครุภัณฑ์, วัสดุ, การเบิกจ่าย, การยืม-คืน, การซ่อมบำรุง และผลการตรวจนับ สตง. ครบทุกมิติ\n\nคุณต้องการดำเนินการต่อใช่หรือไม่?'
    );
    if (!confirmLoad) return;

    try {
      setDemoLoading(true);
      const res = await fetch('/api/backup/load-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorName: currentUser?.name || 'ผู้ดูแลระบบ',
          actorRole: currentUser?.title || 'admin'
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('✅ โหลดชุดข้อมูลตัวอย่าง Demo เรียบร้อยแล้ว!');
        fetchDbStatus();
        if (fetchDepartments) fetchDepartments();
        window.location.reload();
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error}`);
      }
      setDemoLoading(false);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูลตัวอย่าง');
      setDemoLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: formData,
          actorName: currentUser?.name,
          actorRole: currentUser?.title
        })
      });

      if (res.ok) {
        setSettings(formData);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
    }
  };

  const handleAddDept = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newDept,
          actorName: currentUser?.name,
          actorRole: currentUser?.title
        })
      });

      if (res.ok) {
        fetchDepartments();
        setNewDept({ code: '', name: '', head_name: '', head_position: '' });
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเพิ่มสำนัก/กอง');
    }
  };

  const handleCleanSlate = async () => {
    const confirm1 = window.confirm(
      '⚠️ คำเตือนสำคัญ:\nคุณต้องการล้างข้อมูลครุภัณฑ์, วัสดุ, ประวัติการยืม-คืน และรายงานทั้งหมด เพื่อส่งมอบงานให้เทศบาลใหม่เริ่มต้นป้อนข้อมูล ใช่หรือไม่?\n\n(การตั้งค่าชื่อหน่วยงาน หมวดหมู่พัสดุ 01-10 และโครงสร้างกองจะยังคงอยู่ครบถ้วน)'
    );
    if (!confirm1) return;

    const confirm2 = window.prompt('เพื่อยืนยันความปลอดภัย กรุณาพิมพ์คำว่า "RESET" เพื่อดำเนินการล้างข้อมูล:');
    if (confirm2 !== 'RESET') {
      alert('ยกเลิกการล้างข้อมูล (พิมพ์ข้อความยืนยันไม่ถูกต้อง)');
      return;
    }

    try {
      const res = await fetch('/api/backup/clean-slate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorName: currentUser?.name || 'ผู้ดูแลระบบ',
          actorRole: currentUser?.title || 'admin'
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('✅ ล้างข้อมูลตัวอย่างสำเร็จเรียบร้อยแล้ว!\nระบบพร้อมสำหรับให้เทศบาลใหม่เริ่มต้นป้อนข้อมูลครุภัณฑ์จริง');
        fetchDbStatus();
        if (fetchDepartments) fetchDepartments();
        window.location.reload();
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  // User Management Handlers
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserForm.username.trim() || !newUserForm.password.trim() || !newUserForm.name.trim()) {
      alert('กรุณากรอก Username, รหัสผ่าน และชื่อ-นามสกุลให้ครบถ้วน');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newUserForm,
          actorName: currentUser?.name || 'ผู้ดูแลระบบ',
          actorRole: currentUser?.title || 'admin'
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ สร้างบัญชีผู้ใช้ "${newUserForm.username}" เรียบร้อยแล้ว`);
        setShowAddUserModal(false);
        setNewUserForm({
          username: '',
          password: '',
          name: '',
          title: '',
          dept: departments[0]?.name || 'สำนักปลัดเทศบาล',
          department_id: departments[0]?.id || 1,
          role_type: 'department_staff'
        });
        fetchUsersList();
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการสร้างบัญชีผู้ใช้');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingUser,
          actorName: currentUser?.name || 'ผู้ดูแลระบบ',
          actorRole: currentUser?.title || 'admin'
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('✅ บันทึกการแก้ไขข้อมูลผู้ใช้เรียบร้อยแล้ว');
        setEditingUser(null);
        fetchUsersList();
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้ใช้');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPassUser) return;
    if (!newPasswordVal.trim()) {
      alert('กรุณากรอกรหัสผ่านใหม่');
      return;
    }
    if (newPasswordVal !== confirmPasswordVal) {
      alert('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    try {
      const res = await fetch(`/api/users/${resetPassUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: newPasswordVal,
          actorName: currentUser?.name || 'ผู้ดูแลระบบ',
          actorRole: currentUser?.title || 'admin'
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ เปลี่ยนรหัสผ่านสำหรับผู้ใช้ "${resetPassUser.username}" (${resetPassUser.name}) เรียบร้อยแล้ว`);
        setResetPassUser(null);
        setNewPasswordVal('');
        setConfirmPasswordVal('');
        fetchUsersList();
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.username === 'admin') {
      alert('ไม่อนุญาตให้ลบบัญชีผู้ดูแลระบบหลัก (admin)');
      return;
    }
    const confirmDelete = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีผู้ใช้ "${user.username}" (${user.name})?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorName: currentUser?.name || 'ผู้ดูแลระบบ',
          actorRole: currentUser?.title || 'admin'
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('✅ ลบบัญชีผู้ใช้งานเรียบร้อยแล้ว');
        fetchUsersList();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้');
    }
  };

  return (
    <div className="space-y-6">
      {/* Pitch / Onboarding Guidance Box */}
      <div className="bg-gradient-to-r from-gov-800 to-gov-900 text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-gov-700">
        <div>
          <div className="flex items-center space-x-2 font-bold text-base text-gold-300">
            <Sparkles className="w-5 h-5 text-gold-400" />
            <span>คำแนะนำสำหรับการนำไปเสนอขาย หรือส่งมอบงานให้แต่ละเทศบาล / อบต.</span>
          </div>
          <p className="text-slate-200 text-xs mt-1.5 leading-relaxed">
            คุณสามารถพิมพ์แก้ไข <strong>ชื่อหน่วยงานราชการ</strong>, <strong>ประเภทองค์กร</strong>, <strong>ชื่อนายกฯ</strong>, <strong>ชื่อปลัด</strong>, <strong>เจ้าหน้าที่พัสดุ</strong> และ <strong>โครงสร้างสำนัก/กอง</strong> ในฟอร์มด้านล่างนี้ได้โดยตรง เมื่อกดปุ่ม <strong>"บันทึกการตั้งค่า"</strong> ระบบจะเปลี่ยนชื่อบนหัวโปรแกรมและในเอกสารทางการทุกฉบับเป็นของเทศบาลนั้นทันทีโดยอัตโนมัติ
          </p>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
          <Settings className="w-7 h-7 text-gov-700" />
          <span>การตั้งค่าหน่วยงานและระบบ (System Settings)</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          กำหนดชื่อหน่วยงานราชการ ผู้บริหารผู้ลงนาม ปีงบประมาณ และโครงสร้างสำนัก/กอง
        </p>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center space-x-2 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span className="font-semibold">บันทึกข้อมูลการตั้งค่าเรียบร้อยแล้ว</span>
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Building className="w-5 h-5 text-gov-700" />
            <h2 className="font-bold text-slate-900 text-base">ข้อมูลองค์กรปกครองส่วนท้องถิ่น และตราสัญลักษณ์</h2>
          </div>

          {/* Logo & Agency Info Layout */}
          <div className="flex flex-col md:flex-row gap-5 items-start p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
            {/* Logo Preview & Upload */}
            <div className="flex flex-col items-center space-y-2 w-full md:w-44 shrink-0">
              <span className="text-xs font-bold text-slate-700">ตราสัญลักษณ์ / โลโก้</span>
              <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center p-2 shadow-sm overflow-hidden relative">
                {formData.org_logo ? (
                  <img src={formData.org_logo} alt="โลโก้เทศบาล" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center text-slate-400">
                    <Landmark className="w-10 h-10 mx-auto text-slate-300" />
                    <span className="text-[10px] block mt-1">ใช้ไอคอนกลาง</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-1.5">
                <label className="cursor-pointer inline-flex items-center space-x-1 px-3 py-1.5 bg-gov-700 hover:bg-gov-800 text-white rounded-lg text-xs font-semibold shadow-sm transition">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>เปลี่ยนโลโก้</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
                {formData.org_logo && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition"
                    title="ลบโลโก้ (ใช้ไอคอนเริ่มต้น)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <span className="text-[10px] text-slate-400 text-center">ไฟล์ภาพ PNG/JPG ขนาด &le; 5MB</span>
            </div>

            {/* Inputs Grid */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทองค์กรปกครองส่วนท้องถิ่น *</label>
                <select
                  value={formData.org_type}
                  onChange={e => setFormData({ ...formData, org_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                >
                  <option value="เทศบาลตำบล">เทศบาลตำบล</option>
                  <option value="เทศบาลเมือง">เทศบาลเมือง</option>
                  <option value="เทศบาลนคร">เทศบาลนคร</option>
                  <option value="องค์การบริหารส่วนตำบล">องค์การบริหารส่วนตำบล (อบต.)</option>
                  <option value="องค์การบริหารส่วนจังหวัด">องค์การบริหารส่วนจังหวัด (อบจ.)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อหน่วยงานราชการ *</label>
                <input
                  type="text"
                  value={formData.org_name}
                  onChange={e => setFormData({ ...formData, org_name: e.target.value })}
                  required
                  placeholder="เช่น เทศบาลตำบลสุขเกษมพัฒนา หรือ อบต.บางแก้ว"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">อำเภอ</label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={e => setFormData({ ...formData, district: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">จังหวัด</label>
                <input
                  type="text"
                  value={formData.province}
                  onChange={e => setFormData({ ...formData, province: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ปีงบประมาณปัจจุบัน (พ.ศ.) *</label>
                <input
                  type="number"
                  value={formData.fiscal_year}
                  onChange={e => setFormData({ ...formData, fiscal_year: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-gov-800 focus:ring-2 focus:ring-gov-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 pt-3">
            <Users className="w-5 h-5 text-gov-700" />
            <h2 className="font-bold text-slate-900 text-base">ผู้มีอำนาจลงนามและเจ้าหน้าที่พัสดุ</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {formData.org_type?.includes('จังหวัด') ? 'นายก อบจ. *' :
                 formData.org_type?.includes('ตำบล') && !formData.org_type?.includes('เทศบาล') ? 'นายก อบต. *' :
                 'นายกเทศมนตรี / ผู้บริหารสูงสุด *'}
              </label>
              <input
                type="text"
                value={formData.mayor_name}
                onChange={e => setFormData({ ...formData, mayor_name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {formData.org_type?.includes('จังหวัด') ? 'ปลัด อบจ. *' :
                 formData.org_type?.includes('ตำบล') && !formData.org_type?.includes('เทศบาล') ? 'ปลัด อบต. *' :
                 'ปลัดเทศบาล / ปลัดองค์กร *'}
              </label>
              <input
                type="text"
                value={formData.clerk_name}
                onChange={e => setFormData({ ...formData, clerk_name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">หัวหน้าเจ้าหน้าที่พัสดุ / เจ้าหน้าที่พัสดุ *</label>
              <input
                type="text"
                value={formData.supply_officer_name}
                onChange={e => setFormData({ ...formData, supply_officer_name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gov-500"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex justify-end">
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-sm shadow-md transition"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่า</span>
            </button>
          </div>
        </form>
      </div>

      {/* Departments Management */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4">
          <Building className="w-5 h-5 text-gov-700" />
          <h2 className="font-bold text-slate-900 text-base">รายชื่อสำนัก/กอง ในสังกัดเทศบาล/อบต.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {departments.map(d => (
            <div key={d.id} className="p-3.5 bg-slate-50 hover:bg-slate-100/70 transition rounded-xl border border-slate-200 text-xs flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gov-800 text-sm">{d.name}</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-semibold">รหัส {d.code}</span>
                </div>
                <div className="text-slate-600 mt-2">
                  <span className="text-slate-400">หัวหน้างาน:</span> {d.head_name || '-'}
                </div>
                <div className="text-slate-500">
                  <span className="text-slate-400">ตำแหน่ง:</span> {d.head_position || '-'}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingDept({ ...d })}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-gov-50 text-gov-700 border border-gov-300 rounded-lg text-xs font-semibold shadow-xs transition"
                  title="แก้ไขชื่อสำนัก/กอง หรือชื่อหัวหน้างาน"
                >
                  <Edit2 className="w-3 h-3 text-gov-600" />
                  <span>แก้ไข</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteDept(d)}
                  className="flex items-center space-x-1 px-2 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold shadow-xs transition"
                  title="ลบสำนัก/กองนี้"
                >
                  <Trash2 className="w-3 h-3 text-rose-500" />
                  <span>ลบ</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Department Inline Form */}
        <form onSubmit={handleAddDept} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="text-xs font-bold text-slate-700 uppercase">เพิ่มสำนัก/กอง ใหม่</div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <input
                type="text"
                placeholder="รหัสกอง เช่น 07"
                value={newDept.code}
                onChange={e => setNewDept({ ...newDept, code: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="ชื่อสำนัก/กอง เช่น กองส่งเสริมการท่องเที่ยว"
                value={newDept.name}
                onChange={e => setNewDept({ ...newDept, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="ชื่อหัวหน้าสำนัก/กอง"
                value={newDept.head_name}
                onChange={e => setNewDept({ ...newDept, head_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="ตำแหน่ง"
                value={newDept.head_position}
                onChange={e => setNewDept({ ...newDept, head_position: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs whitespace-nowrap shadow-sm"
              >
                เพิ่ม
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUB-DEPARTMENTS MANAGEMENT (หน่วยงานย่อย / ฝ่าย / ศพด. / โรงเรียน / รพ.สต.) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 mb-4 gap-2">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-slate-900 text-base">รายชื่อหน่วยงานย่อย / ฝ่าย / ศพด. / โรงเรียน / รพ.สต.</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                  {subDepartments.length} หน่วยงานย่อย
                </span>
              </div>
              <p className="text-xs text-slate-500">โครงสร้างองค์กรระดับที่ 2 เพื่อแยกบัญชีทรัพย์สิน ทะเบียน สท.1 สท.3 และการตรวจนับรายฝ่าย</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-xs text-slate-500 whitespace-nowrap font-medium">สังกัดกอง:</label>
            <select
              value={selectedSubDeptFilterDept}
              onChange={e => setSelectedSubDeptFilterDept(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">ทุกสำนัก/กอง (ทั้งหมด {subDepartments.length})</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sub-departments List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {subDepartments
            .filter(sd => !selectedSubDeptFilterDept || String(sd.department_id) === String(selectedSubDeptFilterDept))
            .map(sd => (
              <div key={sd.id} className="p-3.5 bg-slate-50 hover:bg-indigo-50/40 transition rounded-xl border border-slate-200 text-xs flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px]">
                      {sd.department_name || departments.find(d => d.id === sd.department_id)?.name || 'สำนัก/กอง'}
                    </span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-semibold text-[10px]">
                      รหัส {sd.code}
                    </span>
                  </div>

                  <div className="font-bold text-slate-900 text-sm mt-1">
                    {sd.name}
                  </div>

                  {sd.notes && (
                    <div className="text-[11px] text-slate-500 mt-1 italic line-clamp-1">
                      {sd.notes}
                    </div>
                  )}

                  <div className="mt-2.5 space-y-0.5 text-slate-600 text-[11px]">
                    <div>
                      <span className="text-slate-400">หัวหน้าฝ่าย/ผู้ดูแล:</span> {sd.head_name || '-'}
                    </div>
                    {sd.head_position && (
                      <div className="text-slate-500 text-[10.5px]">
                        <span className="text-slate-400">ตำแหน่ง:</span> {sd.head_position}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">
                    ครุภัณฑ์ในสังกัด: <strong className="text-indigo-700">{sd.asset_count || 0}</strong> ชิ้น
                  </span>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingSubDept({ ...sd })}
                      className="flex items-center space-x-1 px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold shadow-xs transition"
                      title="แก้ไขข้อมูลหน่วยงานย่อย"
                    >
                      <Edit2 className="w-3 h-3 text-indigo-600" />
                      <span>แก้ไข</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubDept(sd)}
                      className="flex items-center space-x-1 px-2 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold shadow-xs transition"
                      title="ลบหน่วยงานย่อยนี้"
                    >
                      <Trash2 className="w-3 h-3 text-rose-500" />
                      <span>ลบ</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Add Sub-Department Inline Form */}
        <form onSubmit={handleAddSubDept} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="text-xs font-bold text-slate-700 uppercase flex items-center space-x-1.5">
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>เพิ่มหน่วยงานย่อย / ฝ่าย / ศพด. / โรงเรียน ใหม่</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">สังกัดสำนัก/กอง *</label>
              <select
                value={newSubDept.department_id}
                onChange={e => setNewSubDept({ ...newSubDept, department_id: Number(e.target.value) })}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">รหัสฝ่าย/หน่วยงาน *</label>
              <input
                type="text"
                placeholder="เช่น 05-02"
                value={newSubDept.code}
                onChange={e => setNewSubDept({ ...newSubDept, code: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold bg-white"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">ชื่อหน่วยงานย่อย / ฝ่าย / ศูนย์ฯ *</label>
              <input
                type="text"
                placeholder="เช่น ศูนย์พัฒนาเด็กเล็ก 1 หรือ ฝ่ายการเงิน"
                value={newSubDept.name}
                onChange={e => setNewSubDept({ ...newSubDept, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">หัวหน้าฝ่าย/ผู้ดูแล</label>
              <input
                type="text"
                placeholder="ชื่อ-นามสกุล"
                value={newSubDept.head_name}
                onChange={e => setNewSubDept({ ...newSubDept, head_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
              />
            </div>

            <div className="lg:col-span-3">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">ตำแหน่ง</label>
              <input
                type="text"
                placeholder="เช่น หัวหน้าฝ่ายอำนวยการ / ผอ.โรงเรียน"
                value={newSubDept.head_position}
                onChange={e => setNewSubDept({ ...newSubDept, head_position: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">ภารกิจ/หมายเหตุ</label>
              <input
                type="text"
                placeholder="เช่น งานดับเพลิง / งานสารบรรณ"
                value={newSubDept.notes}
                onChange={e => setNewSubDept({ ...newSubDept, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl text-xs whitespace-nowrap shadow-sm transition"
              >
                + เพิ่มหน่วยงานย่อย
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ASSET CATEGORIES & DEPRECIATION MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-gov-50 text-gov-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-slate-900 text-base">หมวดหมู่ครุภัณฑ์และเกณฑ์คำนวณค่าเสื่อมราคา</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gov-100 text-gov-800">
                  {categories.length} หมวดหมู่มาตรฐาน
                </span>
              </div>
              <p className="text-xs text-slate-500">
                จำแนกตามมาตรฐานสำนักงบประมาณ และระเบียบกรมบัญชีกลาง ว.179 / ว.214 (กำหนดคำนำหน้ารหัส Prefix, อายุใช้งาน และอัตราค่าเสื่อม)
              </p>
            </div>
          </div>

          {/* Search categories */}
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาหมวดหมู่ หรือ Prefix..."
              value={catSearch}
              onChange={e => setCatSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-gov-500"
            />
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories
            .filter(c => {
              if (!catSearch.trim()) return true;
              const s = catSearch.toLowerCase();
              return (
                c.name?.toLowerCase().includes(s) ||
                c.prefix?.toLowerCase().includes(s) ||
                c.code?.toLowerCase().includes(s) ||
                c.description?.toLowerCase().includes(s)
              );
            })
            .map(c => (
              <div 
                key={c.id} 
                className="p-3.5 bg-slate-50 hover:bg-slate-100/70 transition rounded-xl border border-slate-200 text-xs flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                    <div className="flex items-center space-x-1">
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-semibold text-[11px]">
                        รหัส {c.code}
                      </span>
                      <span className="font-mono bg-gov-700 text-white px-2 py-0.5 rounded font-bold text-[11px]">
                        {c.prefix}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center space-x-2 text-slate-600">
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[11px] font-semibold">
                      อายุ {c.useful_life_years} ปี ({c.depreciation_rate_pct}% / ปี)
                    </span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[11px] font-semibold">
                      {c.asset_count || 0} รายการ
                    </span>
                  </div>

                  <div className="text-slate-500 text-[11.5px] mt-2 line-clamp-2 leading-relaxed" title={c.description}>
                    <span className="text-slate-400">ตัวอย่าง:</span> {c.description || '-'}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingCat({ ...c })}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-gov-50 text-gov-700 border border-gov-300 rounded-lg text-xs font-semibold shadow-xs transition"
                    title="แก้ไขอายุการใช้งาน / อัตราค่าเสื่อม / คำนำหน้ารหัส"
                  >
                    <Edit2 className="w-3 h-3 text-gov-600" />
                    <span>แก้ไข</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCat(c)}
                    className={`flex items-center space-x-1 px-2 py-1 bg-white rounded-lg text-xs font-semibold shadow-xs transition ${
                      (c.asset_count || 0) > 0 
                        ? 'opacity-40 text-slate-400 border border-slate-200 cursor-not-allowed' 
                        : 'hover:bg-rose-50 text-rose-600 border border-rose-200'
                    }`}
                    title={(c.asset_count || 0) > 0 ? `ไม่สามารถลบได้เนื่องจากมีครุภัณฑ์ในระบบ ${c.asset_count} รายการ` : 'ลบหมวดหมู่นี้'}
                    disabled={(c.asset_count || 0) > 0}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>ลบ</span>
                  </button>
                </div>
              </div>
            ))}
        </div>

        {/* Add Category Inline Form */}
        <form onSubmit={handleAddCat} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase flex items-center space-x-1">
              <Plus className="w-4 h-4 text-gov-700" />
              <span>เพิ่มหมวดหมู่ครุภัณฑ์ใหม่</span>
            </span>
            <span className="text-[11px] text-slate-400">
              * รหัสและ Prefix จะถูกนำไปใช้ออกเลขครุภัณฑ์อัตโนมัติ (เช่น ค.18/2569/001)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">รหัส (Code)</label>
              <input
                type="text"
                placeholder="เช่น 18"
                value={newCat.code}
                onChange={e => setNewCat({ ...newCat, code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ชื่อหมวดหมู่ครุภัณฑ์ *</label>
              <input
                type="text"
                placeholder="เช่น ครุภัณฑ์วิทยาการหุ่นยนต์และ AI"
                value={newCat.name}
                onChange={e => setNewCat({ ...newCat, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">คำนำหน้ารหัส (Prefix) *</label>
              <input
                type="text"
                placeholder="เช่น ค.18"
                value={newCat.prefix}
                onChange={e => setNewCat({ ...newCat, prefix: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">อายุใช้งาน (ปี)</label>
              <input
                type="number"
                min="1"
                max="50"
                value={newCat.useful_life_years}
                onChange={e => {
                  const years = Number(e.target.value) || 1;
                  setNewCat({ 
                    ...newCat, 
                    useful_life_years: years,
                    depreciation_rate_pct: Number((100 / years).toFixed(2))
                  });
                }}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ค่าเสื่อม (% / ปี)</label>
              <input
                type="number"
                step="0.01"
                value={newCat.depreciation_rate_pct}
                onChange={e => setNewCat({ ...newCat, depreciation_rate_pct: Number(e.target.value) })}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-100 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <input
                type="text"
                placeholder="คำอธิบาย / รายการพัสดุตัวอย่างในหมวดนี้ เช่น แขนกล, บอร์ดไมโครคอนโทรลเลอร์..."
                value={newCat.description}
                onChange={e => setNewCat({ ...newCat, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center justify-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>บันทึกหมวดหมู่</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* USER & PASSWORD MANAGEMENT SECTION */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-slate-900 text-base">ระบบจัดการบัญชีผู้ใช้งานและรหัสผ่าน (Users & Passwords)</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                  {usersList.length} บัญชีในระบบ
                </span>
              </div>
              <p className="text-xs text-slate-500">
                กำหนด Username, รหัสผ่าน และสิทธิ์การเข้าถึง (Admin, ผู้บริหาร, เจ้าหน้าที่ประจำกอง, กรรมการตรวจนับ)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search users */}
            <div className="relative w-full sm:w-52">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหา Username หรือชื่อ..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-gov-500"
              />
            </div>

            {/* Add User Button */}
            <button
              type="button"
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center space-x-1 px-3.5 py-1.5 bg-gov-700 hover:bg-gov-800 text-white rounded-xl text-xs font-bold shadow-sm transition whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>เพิ่มผู้ใช้งาน</span>
            </button>
          </div>
        </div>

        {/* Notice badge */}
        <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
          <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">รหัสผ่านเริ่มต้นของระบบตัวอย่าง:</span> รหัสผ่านเริ่มต้นสำหรับทุกบัญชีคือ <code className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">123</code> ท่านสามารถคลิกปุ่ม <strong>"เปลี่ยนรหัส"</strong> ที่แต่ละแถวเพื่อเปลี่ยนเป็นรหัสผ่านจริงของเจ้าหน้าที่แต่ละคนได้ทันที
          </div>
        </div>

        {/* Users Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="hidden md:block">
            <table className="w-full text-left text-xs divide-y divide-slate-200 table-auto">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">ชื่อผู้ใช้ (Username)</th>
                  <th className="py-3 px-3">ชื่อ-นามสกุล / ตำแหน่ง</th>
                  <th className="py-3 px-3">สังกัดสำนัก/กอง</th>
                  <th className="py-3 px-3">สิทธิ์การใช้งาน (Role)</th>
                  <th className="py-3 px-3 text-center w-40 whitespace-nowrap">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {usersList
                  .filter(u => {
                    if (!userSearch.trim()) return true;
                    const s = userSearch.toLowerCase();
                    return (
                      u.username?.toLowerCase().includes(s) ||
                      u.name?.toLowerCase().includes(s) ||
                      u.title?.toLowerCase().includes(s) ||
                      u.dept?.toLowerCase().includes(s)
                    );
                  })
                  .map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition align-top">
                      <td className="py-3 px-3 font-mono font-bold text-gov-800 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="w-7 h-7 rounded-lg bg-gov-100 text-gov-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {u.username.substring(0, 2)}
                          </span>
                          <span>{u.username}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500">{u.title || '-'}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                          {u.dept || u.department_name || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {u.role_type === 'admin' ? (
                          <span className="inline-block bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full text-[11px] border border-rose-200">
                            👑 พัสดุกลาง (Admin)
                          </span>
                        ) : u.role_type === 'executive' ? (
                          <span className="inline-block bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full text-[11px] border border-indigo-200">
                            🏛️ ผู้บริหาร (นายก/ปลัด)
                          </span>
                        ) : u.role_type === 'auditor' ? (
                          <span className="inline-block bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full text-[11px] border border-purple-200">
                            🔍 กรรมการตรวจนับ สตง.
                          </span>
                        ) : (
                          <span className="inline-block bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[11px] border border-emerald-200">
                            🏢 จนท. ประจำสำนัก/กอง
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setResetPassUser(u);
                              setNewPasswordVal('');
                              setConfirmPasswordVal('');
                            }}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                            title="ตั้งรหัสผ่านใหม่"
                          >
                            <KeyRound className="w-3 h-3 text-amber-700" />
                            <span>เปลี่ยนรหัส</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingUser(u)}
                            className="p-1 text-slate-500 hover:text-gov-700 hover:bg-slate-100 rounded-lg transition"
                            title="แก้ไขข้อมูลผู้ใช้"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {u.username !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="ลบบัญชีผู้ใช้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100 bg-white">
            {usersList
              .filter(u => {
                if (!userSearch.trim()) return true;
                const s = userSearch.toLowerCase();
                return (
                  u.username?.toLowerCase().includes(s) ||
                  u.name?.toLowerCase().includes(s) ||
                  u.title?.toLowerCase().includes(s) ||
                  u.dept?.toLowerCase().includes(s)
                );
              })
              .map(u => (
                <div key={u.id} className="p-3.5 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold text-gov-800">@{u.username}</div>
                      <div className="font-bold text-slate-900 text-sm">{u.name}</div>
                      <div className="text-slate-500">{u.title || '-'} • {u.dept || u.department_name || '-'}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[11px] font-semibold text-slate-700">
                      {u.role_type === 'admin' ? '👑 พัสดุกลาง' : u.role_type === 'executive' ? '🏛️ ผู้บริหาร' : u.role_type === 'auditor' ? '🔍 สตง.' : '🏢 จนท.กอง'}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setResetPassUser(u);
                          setNewPasswordVal('');
                          setConfirmPasswordVal('');
                        }}
                        className="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-semibold"
                      >
                        เปลี่ยนรหัส
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingUser(u)}
                        className="p-1.5 text-slate-500 bg-slate-100 rounded-lg"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {u.username !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 text-rose-500 bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DATABASE BACKUP & RESTORE SECTION */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">ความปลอดภัยและการสำรองฐานข้อมูล (Backup & Restore)</h2>
              <p className="text-xs text-slate-500">สำรองฐานข้อมูล SQLite ลง Flash Drive เพื่อป้องกันข้อมูลสูญหาย หรือกู้คืนข้อมูล</p>
            </div>
          </div>
          <button
            onClick={fetchDbStatus}
            title="รีเฟรชสถานะฐานข้อมูล"
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Database Status Cards */}
        {dbStatus && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500">ขนาดไฟล์ฐานข้อมูล</div>
              <div className="text-lg font-bold text-slate-800">{dbStatus.sizeKB} KB</div>
              <div className="text-[10px] text-slate-400">database.sqlite</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500">จำนวนครุภัณฑ์ในระบบ</div>
              <div className="text-lg font-bold text-gov-800">{dbStatus.counts?.assets || 0} รายการ</div>
              <div className="text-[10px] text-slate-400">พร้อมประวัติค่าเสื่อม</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500">วัสดุคลังย่อย (FIFO)</div>
              <div className="text-lg font-bold text-indigo-700">{dbStatus.counts?.inventory || 0} รายการ</div>
              <div className="text-[10px] text-slate-400">ตัดสต็อกอัตโนมัติ</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500">ประวัติบันทึกการทำงาน</div>
              <div className="text-lg font-bold text-emerald-700">{dbStatus.counts?.audits || 0} บันทึก</div>
              <div className="text-[10px] text-slate-400">Audit Trail</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Backup Box */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 font-bold text-indigo-900 text-sm">
                <Download className="w-4 h-4 text-indigo-600" />
                <span>สำรองฐานข้อมูล (Backup SQLite)</span>
              </div>
              <p className="text-xs text-indigo-700 mt-1">
                ดาวน์โหลดไฟล์ข้อมูลทั้งหมดของระบบ (.sqlite) เก็บไว้ในเครื่องหรือ Flash Drive แนะนำให้ทำสัปดาห์ละ 1 ครั้ง หรือก่อนปิดงบประมาณ
              </p>
            </div>
            <div className="mt-4">
              <a
                href={`/api/backup/download?actorName=${encodeURIComponent(currentUser?.name || 'ผู้ดูแลระบบ')}&actorRole=${encodeURIComponent(currentUser?.title || 'admin')}`}
                download
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดไฟล์สำรองข้อมูล (.sqlite)</span>
              </a>
            </div>
          </div>

          {/* Restore Box */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 font-bold text-amber-900 text-sm">
                <UploadCloud className="w-4 h-4 text-amber-700" />
                <span>กู้คืนฐานข้อมูล (Restore SQLite)</span>
              </div>
              <p className="text-xs text-amber-800 mt-1">
                เลือกไฟล์สำรอง (.sqlite) เพื่อกู้คืนข้อมูลกลับมา ระบบจะสร้างสำเนาฉุกเฉินของข้อมูลปัจจุบันไว้ให้อัตโนมัติก่อนเขียนทับ
              </p>
            </div>
            <div className="mt-4 flex items-center space-x-2">
              <label className="cursor-pointer inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{restoreLoading ? 'กำลังกู้คืนข้อมูล...' : 'เลือกไฟล์ .sqlite เพื่อกู้คืน'}</span>
                <input
                  type="file"
                  accept=".sqlite,.db"
                  className="hidden"
                  disabled={restoreLoading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const confirmRestore = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการกู้คืนฐานข้อมูลจากไฟล์ "${file.name}"?\n(ระบบจะสร้างไฟล์สำรองของข้อมูลเดิมไว้ให้อัตโนมัติก่อนเริ่มกู้คืน)`);
                    if (!confirmRestore) {
                      e.target.value = '';
                      return;
                    }

                    try {
                      setRestoreLoading(true);
                      const reader = new FileReader();
                      reader.onload = async () => {
                        const base64 = (reader.result).split(',')[1];
                        const res = await fetch('/api/backup/restore', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            fileBase64: base64,
                            fileName: file.name,
                            actorName: currentUser?.name || 'ผู้ดูแลระบบ',
                            actorRole: currentUser?.title || 'admin'
                          })
                        });
                        const data = await res.json();
                        if (res.ok) {
                          alert('✅ กู้คืนฐานข้อมูลสำเร็จเรียบร้อยแล้ว!');
                          fetchDbStatus();
                          if (fetchDepartments) fetchDepartments();
                        } else {
                          alert(`เกิดข้อผิดพลาด: ${data.error}`);
                        }
                        setRestoreLoading(false);
                      };
                      reader.readAsDataURL(file);
                    } catch (err) {
                      console.error(err);
                      alert('เกิดข้อผิดพลาดในการอ่านไฟล์');
                      setRestoreLoading(false);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Automated Daily Backups History Box */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 sm:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-emerald-950 text-sm">
                <Clock className="w-4 h-4 text-emerald-700" />
                <span>ประวัติไฟล์สำรองข้อมูลอัตโนมัติประจำวัน (Daily Auto-Backups)</span>
                <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  ระบบสำรองให้อัตโนมัติทุกวัน
                </span>
              </div>
              <button
                type="button"
                onClick={fetchAutoBackups}
                className="text-xs text-emerald-700 hover:underline font-semibold"
              >
                รีเฟรชรายการ
              </button>
            </div>
            <p className="text-xs text-emerald-800">
              ระบบจะทำการก๊อปปี้ฐานข้อมูล SQLite สำรองไว้ในโฟลเดอร์ <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-300">server/backups/</code> โดยอัตโนมัติทุกวัน (เก็บย้อนหลัง 30 วัน) เพื่อป้องกันข้อมูลสูญหาย 100%
            </p>

            {autoBackups.length > 0 ? (
              <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden max-h-48 overflow-y-auto divide-y divide-emerald-100">
                {autoBackups.map(b => (
                  <div key={b.filename} className="p-2.5 px-3 flex items-center justify-between hover:bg-emerald-50/50 text-xs">
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="font-mono font-bold text-slate-800">{b.filename}</span>
                        <span className="text-slate-400 text-[11px] ml-2">({b.sizeKB} KB)</span>
                      </div>
                    </div>
                    <a
                      href={`/api/backup/download/${encodeURIComponent(b.filename)}`}
                      download
                      className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>ดาวน์โหลดไฟล์นี้</span>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 bg-white rounded-xl border border-dashed border-emerald-200 text-xs text-slate-400">
                ยังไม่มีไฟล์สำรองอัตโนมัติ
              </div>
            )}
          </div>

          {/* Load Demo Data Box */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 flex flex-col justify-between sm:col-span-2">
            <div>
              <div className="flex items-center space-x-2 font-bold text-indigo-900 text-sm">
                <Sparkles className="w-4 h-4 text-indigo-700" />
                <span>โหลดชุดข้อมูลตัวอย่างสำหรับการนำเสนอ (Load Demo Presentation Data)</span>
              </div>
              <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
                เหมาะสำหรับใช้สาธิต (Demo) ให้ผู้บริหารเทศบาลดู: ระบบจะสร้างชุดข้อมูลตัวอย่างสมจริงครบทุกระบบ (ครุภัณฑ์ 10 หมวด, วัสดุสำนักงาน, ใบเบิก พด.1, ใบยืม-คืน, รายการซ่อมบำรุง, และผลการตรวจนับพัสดุประจำปี สตง.) ให้คุณนำเสนอได้ทันที
              </p>
            </div>
            <div className="mt-4 flex items-center space-x-2">
              <button
                type="button"
                onClick={handleLoadDemo}
                disabled={demoLoading}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-gold-300" />
                <span>{demoLoading ? 'กำลังสร้างข้อมูล Demo...' : 'โหลดชุดข้อมูลตัวอย่าง Demo'}</span>
              </button>
            </div>
          </div>

          {/* Clean Slate / Reset for New Client Box */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col justify-between sm:col-span-2">
            <div>
              <div className="flex items-center space-x-2 font-bold text-rose-900 text-sm">
                <Trash2 className="w-4 h-4 text-rose-700" />
                <span>ล้างข้อมูลตัวอย่างเพื่อส่งมอบงานให้เทศบาลใหม่ (Clean Slate for New Municipality)</span>
              </div>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                ใช้เมื่อนำระบบไปติดตั้งส่งมอบงานให้เทศบาลใหม่ใช้งานจริง: 
                ระบบจะล้างข้อมูลครุภัณฑ์, วัสดุ, ประวัติการยืม-คืน, และรายงานทั้งหมดออก 
                โดย<strong>คงการตั้งค่าชื่อหน่วยงาน, หมวดหมู่พัสดุ (01-10) และโครงสร้างกองไว้</strong> ให้พร้อมสำหรับเจ้าหน้าที่พัสดุของเทศบาลเริ่มป้อนข้อมูลจริงได้ทันที (ระบบจะสำรองไฟล์ปัจจุบันไว้ให้อัตโนมัติก่อนล้าง)
              </p>
            </div>
            <div className="mt-4 flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCleanSlate}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ล้างข้อมูลตัวอย่างเพื่อเริ่มใช้งานจริง</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Department Modal */}
      {editingDept && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full my-auto p-6 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-gov-700" />
                <h3 className="font-bold text-slate-900 text-base">แก้ไขข้อมูลสำนัก/กอง</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDept(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDept} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">รหัสสำนัก/กอง *</label>
                <input
                  type="text"
                  value={editingDept.code}
                  onChange={e => setEditingDept({ ...editingDept, code: e.target.value })}
                  required
                  placeholder="เช่น 01"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อสำนัก/กอง *</label>
                <input
                  type="text"
                  value={editingDept.name}
                  onChange={e => setEditingDept({ ...editingDept, name: e.target.value })}
                  required
                  placeholder="เช่น สำนักปลัด อบต. หรือ สำนักการช่าง"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อหัวหน้าสำนัก/กอง</label>
                <input
                  type="text"
                  value={editingDept.head_name || ''}
                  onChange={e => setEditingDept({ ...editingDept, head_name: e.target.value })}
                  placeholder="เช่น นายชวลิต บุญมา"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ตำแหน่งหัวหน้างาน</label>
                <input
                  type="text"
                  value={editingDept.head_position || ''}
                  onChange={e => setEditingDept({ ...editingDept, head_position: e.target.value })}
                  placeholder="เช่น หัวหน้าสำนักปลัด หรือ ผู้อำนวยการกองคลัง"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sub-Department Modal */}
      {editingSubDept && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full my-auto p-6 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-indigo-700" />
                <h3 className="font-bold text-slate-900 text-base">แก้ไขข้อมูลหน่วยงานย่อย / ฝ่าย</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSubDept(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubDept} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">สังกัดสำนัก/กอง *</label>
                <select
                  value={editingSubDept.department_id}
                  onChange={e => setEditingSubDept({ ...editingSubDept, department_id: Number(e.target.value) })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รหัสฝ่าย *</label>
                  <input
                    type="text"
                    value={editingSubDept.code}
                    onChange={e => setEditingSubDept({ ...editingSubDept, code: e.target.value })}
                    required
                    placeholder="เช่น 05-02"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อหน่วยงานย่อย / ฝ่าย *</label>
                  <input
                    type="text"
                    value={editingSubDept.name}
                    onChange={e => setEditingSubDept({ ...editingSubDept, name: e.target.value })}
                    required
                    placeholder="เช่น ศูนย์พัฒนาเด็กเล็ก 1"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">หัวหน้าฝ่าย/ผู้ดูแล</label>
                  <input
                    type="text"
                    value={editingSubDept.head_name || ''}
                    onChange={e => setEditingSubDept({ ...editingSubDept, head_name: e.target.value })}
                    placeholder="ชื่อ-นามสกุล"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ตำแหน่ง</label>
                  <input
                    type="text"
                    value={editingSubDept.head_position || ''}
                    onChange={e => setEditingSubDept({ ...editingSubDept, head_position: e.target.value })}
                    placeholder="ตำแหน่ง"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ภารกิจ/หมายเหตุ</label>
                <textarea
                  value={editingSubDept.notes || ''}
                  onChange={e => setEditingSubDept({ ...editingSubDept, notes: e.target.value })}
                  rows={2}
                  placeholder="รายละเอียดงานหรือสถานที่ตั้ง"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingSubDept(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCat && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full my-auto p-6 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-gov-700" />
                <h3 className="font-bold text-slate-900 text-base">แก้ไขหมวดหมู่ครุภัณฑ์</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCat(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCat} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รหัสหมวดหมู่ (Code) *</label>
                  <input
                    type="text"
                    value={editingCat.code}
                    onChange={e => setEditingCat({ ...editingCat, code: e.target.value })}
                    required
                    placeholder="เช่น 01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">คำนำหน้ารหัส (Prefix) *</label>
                  <input
                    type="text"
                    value={editingCat.prefix}
                    onChange={e => setEditingCat({ ...editingCat, prefix: e.target.value })}
                    required
                    placeholder="เช่น ค.01 หรือ สท.3"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-gov-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อหมวดหมู่ครุภัณฑ์ *</label>
                <input
                  type="text"
                  value={editingCat.name}
                  onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
                  required
                  placeholder="เช่น ครุภัณฑ์สำนักงาน"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">อายุการใช้งาน (ปี) *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editingCat.useful_life_years}
                    onChange={e => {
                      const years = Number(e.target.value) || 1;
                      setEditingCat({
                        ...editingCat,
                        useful_life_years: years,
                        depreciation_rate_pct: Number((100 / years).toFixed(2))
                      });
                    }}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">อัตราค่าเสื่อมราคา (% ต่อปี) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingCat.depreciation_rate_pct}
                    onChange={e => setEditingCat({ ...editingCat, depreciation_rate_pct: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-gov-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">คำอธิบายและตัวอย่างทรัพย์สิน</label>
                <textarea
                  rows="3"
                  value={editingCat.description || ''}
                  onChange={e => setEditingCat({ ...editingCat, description: e.target.value })}
                  placeholder="เช่น โต๊ะ, ตู้, เก้าอี้, เครื่องปรับอากาศ..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gov-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingCat(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full my-auto p-6 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-gov-700" />
                <h3 className="font-bold text-slate-900 text-base">เพิ่มบัญชีผู้ใช้งานใหม่</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้ใช้งาน (Username) *</label>
                  <input
                    type="text"
                    value={newUserForm.username}
                    onChange={e => setNewUserForm({ ...newUserForm, username: e.target.value.toLowerCase().trim() })}
                    required
                    placeholder="เช่น somchai, engineer2"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รหัสผ่านเริ่มต้น *</label>
                  <input
                    type="password"
                    value={newUserForm.password}
                    onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    required
                    placeholder="เช่น 1234"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gov-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
                  <input
                    type="text"
                    value={newUserForm.name}
                    onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    required
                    placeholder="เช่น นายสมชาย ช่างทอง"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ตำแหน่งราชการ</label>
                  <input
                    type="text"
                    value={newUserForm.title}
                    onChange={e => setNewUserForm({ ...newUserForm, title: e.target.value })}
                    placeholder="เช่น นายช่างโยธาชำนาญงาน"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gov-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สังกัดสำนัก/กอง</label>
                  <select
                    value={newUserForm.department_id || ''}
                    onChange={e => {
                      const deptId = e.target.value ? Number(e.target.value) : null;
                      const dept = departments.find(d => d.id === deptId);
                      setNewUserForm({
                        ...newUserForm,
                        department_id: deptId,
                        dept: dept ? dept.name : 'ส่วนกลาง'
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-gov-500"
                  >
                    <option value="">-- ส่วนกลาง / คณะกรรมการ --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สิทธิ์การเข้าใช้งาน (Role)</label>
                  <select
                    value={newUserForm.role_type}
                    onChange={e => setNewUserForm({ ...newUserForm, role_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-gov-500 font-bold"
                  >
                    <option value="department_staff">🏢 เจ้าหน้าที่ประจำสำนัก/กอง</option>
                    <option value="admin">👑 เจ้าหน้าที่พัสดุกลาง (Admin)</option>
                    <option value="executive">🏛️ ผู้บริหาร (นายกเทศมนตรี / ปลัด)</option>
                    <option value="auditor">🔍 คณะกรรมการตรวจนับ สตง.</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  บันทึกผู้ใช้ใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full my-auto p-6 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-gov-700" />
                <h3 className="font-bold text-slate-900 text-base">แก้ไขข้อมูลผู้ใช้งาน: {editingUser.username}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ตำแหน่งราชการ</label>
                  <input
                    type="text"
                    value={editingUser.title || ''}
                    onChange={e => setEditingUser({ ...editingUser, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-gov-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สังกัดสำนัก/กอง</label>
                  <select
                    value={editingUser.department_id || ''}
                    onChange={e => {
                      const deptId = e.target.value ? Number(e.target.value) : null;
                      const dept = departments.find(d => d.id === deptId);
                      setEditingUser({
                        ...editingUser,
                        department_id: deptId,
                        dept: dept ? dept.name : 'ส่วนกลาง'
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-gov-500"
                  >
                    <option value="">-- ส่วนกลาง / คณะกรรมการ --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สิทธิ์การเข้าใช้งาน (Role)</label>
                  <select
                    value={editingUser.role_type}
                    onChange={e => setEditingUser({ ...editingUser, role_type: e.target.value })}
                    disabled={editingUser.username === 'admin'}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-gov-500 font-bold disabled:bg-slate-100"
                  >
                    <option value="department_staff">🏢 เจ้าหน้าที่ประจำสำนัก/กอง</option>
                    <option value="admin">👑 เจ้าหน้าที่พัสดุกลาง (Admin)</option>
                    <option value="executive">🏛️ ผู้บริหาร (นายกเทศมนตรี / ปลัด)</option>
                    <option value="auditor">🔍 คณะกรรมการตรวจนับ สตง.</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPassUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full my-auto p-6 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">เปลี่ยนรหัสผ่านผู้ใช้งาน</h3>
              </div>
              <button
                type="button"
                onClick={() => setResetPassUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl mb-4 text-xs space-y-1">
              <div><span className="text-slate-500">บัญชีผู้ใช้:</span> <strong className="font-mono text-gov-800">{resetPassUser.username}</strong></div>
              <div><span className="text-slate-500">ชื่อเจ้าหน้าที่:</span> <strong>{resetPassUser.name}</strong> ({resetPassUser.dept || '-'})</div>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">รหัสผ่านใหม่ (New Password) *</label>
                <input
                  type="password"
                  value={newPasswordVal}
                  onChange={e => setNewPasswordVal(e.target.value)}
                  required
                  placeholder="กรอกรหัสผ่านใหม่..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ยืนยันรหัสผ่านใหม่อีกครั้ง *</label>
                <input
                  type="password"
                  value={confirmPasswordVal}
                  onChange={e => setConfirmPasswordVal(e.target.value)}
                  required
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้งเพื่อยืนยัน..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setResetPassUser(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  บันทึกรหัสผ่านใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

