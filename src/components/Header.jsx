import React from 'react';
import { Landmark, User, ShieldCheck, Calendar, Bell, Building2, KeyRound, LogOut, Menu, X } from 'lucide-react';

export default function Header({
  settings,
  departments = [],
  currentRole,
  setCurrentRole,
  currentUser,
  setCurrentUser,
  onLogout,
  onToggleMobileMenu,
  isMobileMenuOpen
}) {
  // Base Administration Roles
  const adminRoles = [
    { id: 'admin', roleType: 'admin', title: 'ผู้ดูแลระบบ (Admin)', name: 'ผู้ดูแลระบบสารสนเทศ', dept: 'ฝ่ายพัสดุ/ไอที', departmentId: null },
    { id: 'central_supply', roleType: 'supply', title: 'เจ้าหน้าที่พัสดุกลาง', name: settings.supply_officer_name || 'นางสาวนิตยา พัสดุเจริญ', dept: 'กองคลัง', departmentId: null },
    { id: 'mayor', roleType: 'executive', title: 'นายกเทศมนตรี (ฝ่ายบริหาร)', name: settings.mayor_name || 'นายกเทศมนตรี', dept: 'ฝ่ายบริหาร', departmentId: null },
    { id: 'clerk', roleType: 'executive', title: 'ปลัดเทศบาล (หัวหน้าพัสดุ)', name: settings.clerk_name || 'ปลัดเทศบาล', dept: 'สำนักปลัด', departmentId: null },
    { id: 'auditor', roleType: 'auditor', title: 'คณะกรรมการตรวจนับประจำปี', name: 'ประธานกรรมการตรวจนับ', dept: 'คณะกรรมการตรวจนับ', departmentId: null },
  ];

  // Dynamic Department Roles based on real database departments
  const deptRoles = departments.map(d => ({
    id: `dept_${d.id}`,
    roleType: 'department_staff',
    title: `เจ้าหน้าที่: ${d.name}`,
    name: d.head_name ? `จนท. ${d.name} (${d.head_name})` : `เจ้าหน้าที่ ${d.name}`,
    dept: d.name,
    departmentId: d.id
  }));

  const allRoles = [...adminRoles, ...deptRoles];

  const handleRoleChange = (e) => {
    const selected = allRoles.find(r => r.id === e.target.value);
    if (selected) {
      setCurrentRole(selected.id);
      setCurrentUser(selected);
    }
  };

  const isDeptStaff = currentUser?.roleType === 'department_staff';

  return (
    <header className="bg-gov-900 text-white shadow-md border-b border-gov-800 sticky top-0 z-30">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6">
        <div className="flex justify-between items-center h-16 gap-2">
          {/* Brand & Municipality Logo + Mobile Hamburger Button */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            {/* Hamburger Button for Mobile Menu */}
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 -ml-1 text-gold-300 hover:text-white hover:bg-gov-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-400 transition"
              aria-label="เปิด-ปิดเมนูระบบ"
              title="เปิด-ปิดเมนูระบบงาน"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6 text-rose-300" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gold-500/20 border border-gold-400/40 flex-shrink-0 flex items-center justify-center text-gold-300 shadow-inner overflow-hidden p-1">
              {settings.org_logo ? (
                <img src={settings.org_logo} alt="โลโก้เทศบาล" className="w-full h-full object-contain" />
              ) : (
                <Landmark className="w-5 h-5 sm:w-6 sm:h-6 text-gold-300" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-bold text-sm sm:text-lg tracking-wide text-white truncate max-w-[130px] sm:max-w-[240px] md:max-w-none">
                  {settings.org_name || 'เทศบาลตำบลสุขเกษมพัฒนา'}
                </span>
                <span className="hidden sm:inline-block bg-gold-500/30 text-gold-300 text-xs px-2 py-0.5 rounded-full border border-gold-400/30 font-medium">
                  {settings.org_type || 'เทศบาลตำบล'}
                </span>
              </div>
              <p className="hidden md:block text-xs text-gov-200 truncate">
                ระบบบริหารจัดการครุภัณฑ์และพัสดุคลังย่อย ภาครัฐ (มาตรฐาน มท. & กรมบัญชีกลาง)
              </p>
            </div>
          </div>

          {/* Right Header items: Fiscal year badge & Role/Department Switcher */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <div className="hidden lg:flex items-center space-x-1.5 bg-gov-800/80 px-3 py-1.5 rounded-lg border border-gov-700/60 text-xs text-gov-100">
              <Calendar className="w-3.5 h-3.5 text-gold-400" />
              <span>ปีงบประมาณ พ.ศ.</span>
              <strong className="text-gold-300 font-bold text-sm ml-1">{settings.fiscal_year || '2569'}</strong>
            </div>

            {/* Role & Department Switcher */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 bg-gov-950/70 p-1 sm:p-1.5 rounded-xl border border-gov-700/70 shadow-inner">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isDeptStaff ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' : 'bg-gov-700 text-gov-200'
              }`}>
                {isDeptStaff ? <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold-400" />}
              </div>
              <div className="text-left hidden xl:block max-w-[130px] truncate">
                <div className="text-xs font-semibold text-white leading-tight truncate">{currentUser?.name || 'ผู้ใช้งาน'}</div>
                <div className="text-[10px] text-gov-300 leading-tight flex items-center space-x-1">
                  <span>{currentUser?.dept || 'กองคลัง'}</span>
                </div>
              </div>
              <select
                value={currentRole}
                onChange={handleRoleChange}
                className="bg-gov-800 text-xs text-white border border-gov-600 rounded-lg px-2 py-1.5 sm:px-2.5 sm:py-1.5 focus:outline-none focus:ring-2 focus:ring-gold-400 cursor-pointer font-medium max-w-[125px] sm:max-w-[180px] md:max-w-none truncate"
                title="สลับสิทธิ์การเข้าใช้งานเพื่อทดสอบการทำงานแยกตามสำนัก/กอง"
              >
                <optgroup label="👑 ฝ่ายบริหารและพัสดุกลาง">
                  {adminRoles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🏢 เจ้าหน้าที่ประจำสำนัก/กอง (แยกสิทธิ์รายกอง)">
                  {deptRoles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Logout Button */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="ออกจากระบบ"
                className="flex items-center space-x-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 text-xs font-semibold transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

