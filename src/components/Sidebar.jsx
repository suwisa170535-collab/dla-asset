import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  Handshake,
  ArrowLeftRight,
  Package,
  FileText,
  Wrench,
  QrCode,
  Trash2,
  BarChart3,
  ShieldAlert,
  Settings,
  Lock,
  Landmark,
  X
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  summaryData,
  currentRole,
  currentUser,
  isOpenMobile,
  onCloseMobile
}) {
  const isDeptStaff = currentUser?.roleType === 'department_staff';

  const navItems = [
    { id: 'dashboard', label: 'แดชบอร์ดภาพรวม', icon: LayoutDashboard },
    { id: 'assets', label: 'ทะเบียนครุภัณฑ์', icon: Boxes },
    {
      id: 'borrow-return',
      label: 'ยืม - คืน ครุภัณฑ์',
      icon: Handshake,
      badge: summaryData?.activeBorrowsCount > 0 ? summaryData.activeBorrowsCount : null,
      badgeColor: 'bg-indigo-500 text-white'
    },
    { id: 'transfers', label: 'โอนย้ายระหว่างกอง', icon: ArrowLeftRight },
    {
      id: 'inventory',
      label: 'พัสดุคลังย่อย (FIFO)',
      icon: Package,
      badge: summaryData?.lowStockCount > 0 ? summaryData.lowStockCount : null,
      badgeColor: 'bg-rose-500 text-white'
    },
    {
      id: 'requisitions',
      label: 'ใบเบิกพัสดุออนไลน์',
      icon: FileText,
      badge: summaryData?.pendingRequisitionsCount > 0 ? summaryData.pendingRequisitionsCount : null,
      badgeColor: 'bg-amber-500 text-white'
    },
    {
      id: 'maintenance',
      label: 'แจ้งซ่อมและบำรุงรักษา',
      icon: Wrench,
      badge: summaryData?.ongoingRepairsCount > 0 ? summaryData.ongoingRepairsCount : null,
      badgeColor: 'bg-blue-500 text-white'
    },
    { id: 'annual-audit', label: 'ตรวจนับพัสดุประจำปี', icon: QrCode },
    { id: 'disposal', label: 'ระบบแทงจำหน่าย', icon: Trash2, adminOnly: true },
    { id: 'reports', label: 'รายงาน & e-LAAS', icon: BarChart3 },
    { id: 'audit-trail', label: 'ประวัติใช้งาน (Audit)', icon: ShieldAlert },
    { id: 'settings', label: 'ตั้งค่าหน่วยงาน', icon: Settings, adminOnly: true },
  ];

  const renderNavList = (isMobile = false) => (
    <nav className="p-2.5 sm:p-3 space-y-1">
      <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
        <span>เมนูระบบงาน</span>
        {isDeptStaff && (
          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300">
            สิทธิ์ประจำกอง
          </span>
        )}
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        const isRestricted = isDeptStaff && item.adminOnly;

        return (
          <button
            key={item.id}
            onClick={() => {
              if (isRestricted) {
                alert(`เมนู "${item.label}" สงวนสิทธิ์เฉพาะฝ่ายพัสดุกลางและผู้ดูแลระบบ (Admin) เท่านั้นครับ`);
                return;
              }
              setActiveTab(item.id);
              if (isMobile && onCloseMobile) {
                onCloseMobile();
              }
            }}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
              isActive
                ? 'bg-gov-700 text-white shadow-sm'
                : isRestricted
                ? 'text-slate-400 bg-slate-50/50 hover:bg-slate-100 cursor-not-allowed opacity-75'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : isRestricted ? 'text-slate-400' : 'text-slate-500'}`} />
              <span className="whitespace-nowrap truncate">{item.label}</span>
            </div>
            {isRestricted ? (
              <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" title="เฉพาะส่วนกลาง/แอดมิน" />
            ) : item.badge ? (
              <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );

  const renderFooterInfo = () => (
    <div className="p-4 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/50">
      <div className="flex items-center space-x-2 text-emerald-600 font-semibold mb-1">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>{isDeptStaff ? `โหมดสังกัด: ${currentUser?.dept}` : 'ระบบส่วนกลาง (เต็มสิทธิ์)'}</span>
      </div>
      <p className="text-[11px] text-slate-400">
        รองรับระเบียบพัสดุฯ พ.ศ. 2560 & ระบบ e-LAAS กรมส่งเสริมการปกครองท้องถิ่น
      </p>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Static Sidebar (Visible on screens >= md) */}
      <aside className="hidden md:flex w-60 xl:w-[248px] flex-shrink-0 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] flex-col justify-between shadow-sm">
        {renderNavList(false)}
        {renderFooterInfo()}
      </aside>

      {/* 2. Mobile Drawer Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* 3. Mobile Off-Canvas Drawer (Slides in on mobile) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col justify-between md:hidden transform transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 bg-gov-900 text-white flex items-center justify-between border-b border-gov-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gold-500/20 border border-gold-400/30 flex items-center justify-center text-gold-300">
              <Landmark className="w-4 h-4 text-gold-300" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">เมนูระบบงานพัสดุ</div>
              <div className="text-[10px] text-gold-300 leading-tight">ครุภัณฑ์ & พัสดุ อปท.</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-gov-800 transition"
            aria-label="ปิดเมนู"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Nav list */}
        <div className="flex-1 overflow-y-auto">
          {renderNavList(true)}
        </div>

        {/* Drawer Footer */}
        {renderFooterInfo()}
      </div>
    </>
  );
}
