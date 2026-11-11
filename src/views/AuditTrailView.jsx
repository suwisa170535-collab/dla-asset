import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Clock,
  User,
  ShieldCheck,
  Lock,
  Layers
} from 'lucide-react';

export default function AuditTrailView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [selectedModule]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const q = selectedModule ? `?module=${selectedModule}` : '';
      const res = await fetch(`/api/audit-logs${q}`);
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const ACTION_COLORS = {
    CREATE: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    UPDATE: 'bg-blue-100 text-blue-800 border-blue-300',
    DELETE: 'bg-rose-100 text-rose-800 border-rose-300',
    APPROVE: 'bg-purple-100 text-purple-800 border-purple-300',
    DISPENSE: 'bg-amber-100 text-amber-800 border-amber-300',
    RECEIVE_STOCK: 'bg-sky-100 text-sky-800 border-sky-300',
    DISPOSE: 'bg-slate-200 text-slate-800 border-slate-300',
    AUDIT_CHECK: 'bg-teal-100 text-teal-800 border-teal-300',
    LOGIN: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <ShieldAlert className="w-7 h-7 text-gov-700" />
            <span>ระบบบันทึกประวัติการใช้งาน (Audit Trail & Anti-Corruption)</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            บันทึกการกระทำทุกขั้นตอน (ใคร ทำอะไร เมื่อใด) ป้องกันการแก้ไขหรือทุจริตพัสดุตามระเบียบตรวจสอบภายใน
          </p>
        </div>
      </div>

      {/* Filter Modules */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
        <span className="text-xs font-bold text-slate-500 uppercase">กรองตามระบบงาน:</span>
        <select
          value={selectedModule}
          onChange={e => setSelectedModule(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-gov-500"
        >
          <option value="">ทุกระบบงาน (All Modules)</option>
          <option value="ASSETS">ระบบทะเบียนครุภัณฑ์ (Assets)</option>
          <option value="INVENTORY">ระบบคลังพัสดุ (Inventory/FIFO)</option>
          <option value="REQUISITION">ระบบใบเบิกพัสดุ (Requisitions)</option>
          <option value="MAINTENANCE">ระบบซ่อมบำรุง (Maintenance)</option>
          <option value="AUDIT">การตรวจสอบพัสดุประจำปี (Annual Audit)</option>
          <option value="DISPOSAL">การแทงจำหน่าย (Disposal)</option>
          <option value="SETTINGS">การตั้งค่าระบบ (Settings)</option>
        </select>
      </div>

      {/* Audit Log Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="hidden md:block">
          <table className="w-full text-left text-xs table-auto">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-3 px-3.5 w-36">วัน-เวลา / ระบบงาน</th>
                <th className="py-3 px-3.5 w-32 whitespace-nowrap">ประเภทการกระทำ</th>
                <th className="py-3 px-3.5 w-44">ผู้ดำเนินการ / ตำแหน่ง</th>
                <th className="py-3 px-3.5">รายละเอียดการดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-slate-400">
                    กำลังโหลดประวัติการใช้งาน...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-slate-400">
                    ไม่มีประวัติการใช้งานในเงื่อนไขนี้
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const badgeColor = ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-700';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition align-top">
                      <td className="py-3 px-3.5">
                        <div className="text-slate-500 font-mono text-[11px]">{log.timestamp}</div>
                        <div className="font-semibold text-slate-700 mt-0.5">{log.module}</div>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${badgeColor}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900">{log.actor_name}</div>
                        <div className="text-[11px] text-slate-400 leading-snug">{log.actor_role}</div>
                      </td>
                      <td className="py-3 px-3.5 text-slate-800 font-medium leading-snug">
                        {log.details}
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
            <div className="text-center py-10 text-slate-400 text-sm">กำลังโหลดประวัติการใช้งาน...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">ไม่มีประวัติการใช้งานในเงื่อนไขนี้</div>
          ) : (
            logs.map(log => {
              const badgeColor = ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-700';
              return (
                <div key={log.id} className="p-4 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${badgeColor}`}>
                      {log.action}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">{log.timestamp}</span>
                  </div>
                  <div className="font-bold text-slate-900">{log.details}</div>
                  <div className="text-slate-500">
                    ระบบ: {log.module} • โดย <span className="font-semibold text-slate-700">{log.actor_name}</span> ({log.actor_role})
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

