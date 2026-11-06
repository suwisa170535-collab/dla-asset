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
  Lock
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, summaryData, currentRole, currentUser }) {
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

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] flex flex-col justify-between shadow-sm">
      <nav className="p-4 space-y-1">
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
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gov-700 text-white shadow-sm'
                  : isRestricted
                  ? 'text-slate-400 bg-slate-50/50 hover:bg-slate-100 cursor-not-allowed opacity-75'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isRestricted ? 'text-slate-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {isRestricted ? (
                <Lock className="w-3.5 h-3.5 text-slate-400" title="เฉพาะส่วนกลาง/แอดมิน" />
              ) : item.badge ? (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Footer Info in Sidebar */}
      <div className="p-4 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center space-x-2 text-emerald-600 font-semibold mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{isDeptStaff ? `โหมดสังกัด: ${currentUser?.dept}` : 'ระบบส่วนกลาง (เต็มสิทธิ์)'}</span>
        </div>
        <p className="text-[11px] text-slate-400">
          รองรับระเบียบพัสดุฯ พ.ศ. 2560 & ระบบ e-LAAS กรมส่งเสริมการปกครองท้องถิ่น
        </p>
      </div>
    </aside>
  );
}
