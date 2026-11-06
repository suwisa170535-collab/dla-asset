import React, { useState } from 'react';
import {
  Lock,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  Landmark,
  KeyRound,
  ArrowRight,
  Sparkles,
  Building2,
  AlertCircle
} from 'lucide-react';

export default function LoginView({ settings, onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Quick Demo Accounts
  const demoAccounts = [
    { username: 'admin', password: '123', label: '👑 พัสดุกลาง (Admin)', role: 'เต็มสิทธิ์ทุกเมนู', color: 'border-gold-400 bg-gold-500/10 text-gold-300' },
    { username: 'mayor', password: '123', label: '👔 นายกเทศมนตรี', role: 'ฝ่ายบริหาร', color: 'border-blue-400 bg-blue-500/10 text-blue-300' },
    { username: 'clerk', password: '123', label: '📑 ปลัดเทศบาล', role: 'หัวหน้าเจ้าหน้าที่พัสดุ', color: 'border-purple-400 bg-purple-500/10 text-purple-300' },
    { username: 'engineer', password: '123', label: '🏗️ กองช่าง', role: 'สิทธิ์ประจำกอง', color: 'border-amber-400 bg-amber-500/10 text-amber-300' },
    { username: 'health', password: '123', label: '🏥 กองสาธารณสุข', role: 'สิทธิ์ประจำกอง', color: 'border-emerald-400 bg-emerald-500/10 text-emerald-300' },
    { username: 'education', password: '123', label: '📚 กองการศึกษา', role: 'สิทธิ์ประจำกอง', color: 'border-sky-400 bg-sky-500/10 text-sky-300' },
    { username: 'welfare', password: '123', label: '🤝 กองสวัสดิการ', role: 'สิทธิ์ประจำกอง', color: 'border-rose-400 bg-rose-500/10 text-rose-300' },
    { username: 'auditor', password: '123', label: '🔍 กก. ตรวจนับ สตง.', role: 'ตรวจนับประจำปี', color: 'border-teal-400 bg-teal-500/10 text-teal-300' },
  ];

  const handleQuickLogin = (acc) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setErrorMsg('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onLoginSuccess(data.user, data.token);
      } else {
        setErrorMsg(data.error || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gov-950 via-gov-900 to-gov-800 flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Decor Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2" />

      <div className="max-w-md w-full relative z-10 space-y-5">
        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-7 shadow-2xl border border-white/20">
          {/* Header & Logo */}
          <div className="text-center space-y-2 mb-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-gov-800 to-gov-900 border-2 border-gold-400/50 flex items-center justify-center text-gold-300 shadow-lg p-2.5">
              {settings?.org_logo ? (
                <img src={settings.org_logo} alt="โลโก้เทศบาล" className="w-full h-full object-contain" />
              ) : (
                <Landmark className="w-9 h-9 text-gold-300" />
              )}
            </div>
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-gold-100 text-gold-900 text-[11px] font-bold border border-gold-300">
                <ShieldCheck className="w-3.5 h-3.5 text-gold-700" />
                <span>ระบบรักษาความปลอดภัยภาครัฐ</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-2">
                {settings?.org_name || 'เทศบาลตำบลสุขเกษมพัฒนา'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                ระบบบริหารจัดการครุภัณฑ์และพัสดุคลังย่อย องค์กรปกครองส่วนท้องถิ่น
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชื่อผู้ใช้งาน (Username)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="เช่น admin, mayor, engineer"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-gov-600 focus:outline-none font-medium text-slate-800 bg-slate-50/50"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="กรอกรหัสผ่าน"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-gov-600 focus:outline-none font-medium text-slate-800 bg-slate-50/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-gov-800 to-gov-900 hover:from-gov-900 hover:to-gov-950 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 border border-gov-700"
            >
              <span>{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ (Sign In)'}</span>
              <ArrowRight className="w-4 h-4 text-gold-400" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-white px-2 text-slate-400 font-bold">
                หรือคลิกเลือกบัญชีเพื่อทดสอบ (รหัสผ่าน: 123)
              </span>
            </div>
          </div>

          {/* Quick Demo Credentials Pills */}
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map(acc => (
              <button
                key={acc.username}
                type="button"
                onClick={() => handleQuickLogin(acc)}
                className={`p-2 rounded-xl border text-left transition hover:scale-[1.02] active:scale-[0.98] ${
                  username === acc.username ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-bold truncate">{acc.label}</div>
                <div className="text-[10px] opacity-75 truncate">{acc.role}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-gov-300/80 space-y-1">
          <p>ระบบงานสารสนเทศภาครัฐ สำหรับเจ้าหน้าที่เทศบาลที่ได้รับมอบหมายเท่านั้น</p>
          <p className="text-[10px] text-gov-400/60">มาตรฐานระเบียบกระทรวงการคลังฯ พ.ศ. 2560 & ระบบ New e-LAAS</p>
        </div>
      </div>
    </div>
  );
}

