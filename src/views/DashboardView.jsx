import React, { useState, useEffect } from 'react';
import {
  Boxes,
  TrendingDown,
  Package,
  AlertTriangle,
  FileCheck2,
  Wrench,
  ArrowRight,
  PlusCircle,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Handshake,
  ArrowLeftRight,
  ShieldAlert,
  Database,
  Landmark,
  Bell,
  CalendarCheck
} from 'lucide-react';
import { formatBaht, formatNumber, formatThaiDate } from '../utils/formatters.js';

export default function DashboardView({ summary, setActiveTab, auditLogs, inventoryItems }) {
  const lowStockItems = inventoryItems?.filter(i => i.current_stock <= i.min_stock) || [];
  const [complianceAlerts, setComplianceAlerts] = useState([]);

  useEffect(() => {
    fetch('/api/compliance/alerts')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setComplianceAlerts(data);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-gov-800 via-gov-700 to-gov-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-gold-500/20 px-3 py-1 rounded-full text-gold-300 text-xs font-semibold mb-2 border border-gold-400/30">
            <span>🏛️ ระบบบริหารงานพัสดุและสินทรัพย์ภาครัฐ</span>
          </div>
          <h1 className="text-2xl font-bold">ภาพรวมระบบครุภัณฑ์และคลังพัสดุเทศบาล</h1>
          <p className="text-gov-200 text-sm mt-1">
            ข้อมูลอัปเดตแบบเรียลไทม์ คำนวณค่าเสื่อมราคาตามเกณฑ์กรมบัญชีกลาง และควบคุมสต็อกแบบ FIFO
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setActiveTab('assets')}
            className="flex items-center space-x-1.5 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gov-950 font-bold rounded-xl text-sm transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>ลงทะเบียนครุภัณฑ์</span>
          </button>
          <button
            onClick={() => setActiveTab('borrow-return')}
            className="flex items-center space-x-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-sm transition border border-white/20"
          >
            <Handshake className="w-4 h-4" />
            <span>ยืม-คืน ครุภัณฑ์</span>
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className="flex items-center space-x-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-sm transition border border-white/20"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>โอนย้ายกอง</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className="flex items-center space-x-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-sm transition border border-white/20"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>แบบ สขร.1</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 text-white font-medium rounded-xl text-sm transition border border-emerald-400/30"
          >
            <Database className="w-4 h-4" />
            <span>สำรองข้อมูลระบบ</span>
          </button>
        </div>
      </div>

      {/* Fiscal & Compliance Alerts Center (ศูนย์แจ้งเตือนตามระเบียบราชการ) */}
      {complianceAlerts.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Bell className="w-4 h-4 text-amber-700 animate-bounce" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                  <span>ศูนย์แจ้งเตือนงานพัสดุและกำหนดเวลาตามระเบียบราชการ</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                    {complianceAlerts.length} การแจ้งเตือน
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  แจ้งเตือนกำหนดเวลาทางกฎหมายตามระเบียบกระทรวงการคลังฯ พ.ศ. 2560 และการบำรุงรักษา
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {complianceAlerts.map(alert => {
              const bgColors = {
                critical: 'bg-rose-50 border-rose-200 text-rose-900',
                high: 'bg-orange-50 border-orange-200 text-orange-900',
                warning: 'bg-amber-50 border-amber-200 text-amber-900',
                medium: 'bg-amber-50/60 border-amber-200 text-amber-900',
                info: 'bg-blue-50 border-blue-200 text-blue-900',
                low: 'bg-slate-50 border-slate-200 text-slate-800'
              };
              const badgeColors = {
                critical: 'bg-rose-600 text-white',
                high: 'bg-orange-600 text-white',
                warning: 'bg-amber-600 text-white',
                medium: 'bg-amber-500 text-white',
                info: 'bg-blue-600 text-white',
                low: 'bg-slate-500 text-white'
              };

              return (
                <div 
                  key={alert.id}
                  className={`p-3 rounded-xl border flex flex-col justify-between ${bgColors[alert.type] || bgColors.warning}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">{alert.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold ${badgeColors[alert.type] || badgeColors.warning}`}>
                        {alert.urgency === 'critical' ? 'ด่วนที่สุด' : alert.urgency === 'high' ? 'ด่วน' : 'แจ้งเตือน'}
                      </span>
                    </div>
                    <p className="text-[11.5px] opacity-90 leading-relaxed">
                      {alert.description}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-black/5 flex justify-end">
                    <button
                      onClick={() => setActiveTab(alert.action_tab)}
                      className="inline-flex items-center space-x-1 text-xs font-bold hover:underline opacity-95"
                    >
                      <span>{alert.action_label}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets Cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">มูลค่าครุภัณฑ์ (ราคาทุน)</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{formatBaht(summary?.totalAssetsCost)}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>จำนวนทั้งหมด:</span>
              <strong className="text-slate-700 font-semibold">{formatNumber(summary?.totalAssetsCount)} รายการ</strong>
            </div>
          </div>
        </div>

        {/* Net Book Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">มูลค่าสุทธิตามบัญชี</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600">{formatBaht(summary?.totalBookValue)}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>ค่าเสื่อมสะสม:</span>
              <span className="text-rose-500 font-medium">-{formatBaht(summary?.totalAccumulatedDepreciation)}</span>
            </div>
          </div>
        </div>

        {/* Inventory Stock Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">มูลค่าวัสดุคงคลัง</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{formatBaht(summary?.totalInventoryValue)}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>หมวดวัสดุสิ้นเปลือง:</span>
              <strong className="text-slate-700 font-semibold">{formatNumber(summary?.totalInventoryItems)} รายการ</strong>
            </div>
          </div>
        </div>

        {/* Reorder Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">เตือนจุดสั่งซื้อ (Reorder)</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${summary?.lowStockCount > 0 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold ${summary?.lowStockCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {summary?.lowStockCount || 0} รายการ
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>ต่ำกว่าเกณฑ์ความปลอดภัย:</span>
              <button
                onClick={() => setActiveTab('inventory')}
                className="text-gov-600 hover:underline font-semibold flex items-center"
              >
                ดูรายการ <ArrowRight className="w-3 h-3 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Low Stock Alert Box & Pending Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Action Card: Reorder point items */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
              <h2 className="font-bold text-slate-800 text-base">รายการวัสดุที่ต้องจัดซื้อเพิ่ม (ต่ำกว่าเกณฑ์ Reorder Point)</h2>
            </div>
            <button
              onClick={() => setActiveTab('inventory')}
              className="text-xs text-gov-600 font-semibold hover:underline flex items-center"
            >
              คลังพัสดุทั้งหมด <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="text-center py-8 text-slate-400 flex flex-col items-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
              <p className="font-medium text-slate-700">พัสดุคงคลังมีปริมาณเพียงพอทุกรายการ</p>
              <p className="text-xs">ไม่มีรายการใดที่ต่ำกว่าเกณฑ์สั่งซื้อขั้นต่ำ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase font-semibold">
                    <th className="pb-2">รหัสพัสดุ</th>
                    <th className="pb-2">ชื่อวัสดุ</th>
                    <th className="pb-2">หมวดหมู่</th>
                    <th className="pb-2 text-center">คงเหลือ</th>
                    <th className="pb-2 text-center">เกณฑ์ต่ำสุด</th>
                    <th className="pb-2 text-right">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 font-medium text-slate-700">{item.item_code}</td>
                      <td className="py-2.5 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-2.5 text-slate-500 text-xs">{item.category}</td>
                      <td className="py-2.5 text-center font-bold text-rose-600">
                        {item.current_stock} {item.unit}
                      </td>
                      <td className="py-2.5 text-center text-slate-500 text-xs">
                        {item.min_stock} {item.unit}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          ต้องสั่งซื้อด่วน
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pending Workflow Badges & Quick Links */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h2 className="font-bold text-slate-800 text-base">สถานะงานรอดำเนินการ</h2>

          <div
            onClick={() => setActiveTab('borrow-return')}
            className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70 transition cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-200/80 text-indigo-800 flex items-center justify-center">
                <Handshake className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">ครุภัณฑ์ที่ยืมใช้งานอยู่</div>
                <div className="text-xs text-indigo-700">ระเบียบพัสดุฯ ข้อ 207-210</div>
              </div>
            </div>
            <span className="text-lg font-bold text-indigo-700 bg-indigo-200 px-2.5 py-0.5 rounded-full">
              {summary?.activeBorrowsCount || 0}
            </span>
          </div>

          <div
            onClick={() => setActiveTab('assets')}
            className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
              summary?.expiringWarrantyCount > 0
                ? 'border-orange-300 bg-orange-50/70 hover:bg-orange-100/80 animate-pulse'
                : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                summary?.expiringWarrantyCount > 0 ? 'bg-orange-200 text-orange-800' : 'bg-slate-200 text-slate-600'
              }`}>
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">ครุภัณฑ์ใกล้หมดประกัน</div>
                <div className="text-xs text-orange-700">เหลือประกัน &le; 60 วัน (สิทธิเคลมซ่อมฟรี)</div>
              </div>
            </div>
            <span className={`text-lg font-bold px-2.5 py-0.5 rounded-full ${
              summary?.expiringWarrantyCount > 0 ? 'text-orange-700 bg-orange-200' : 'text-slate-600 bg-slate-200'
            }`}>
              {summary?.expiringWarrantyCount || 0}
            </span>
          </div>

          <div
            onClick={() => setActiveTab('requisitions')}
            className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 transition cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-amber-200/80 text-amber-800 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">ใบเบิกพัสดุรออนุมัติ</div>
                <div className="text-xs text-amber-700">ส่งถึงหัวหน้าสำนัก/กอง</div>
              </div>
            </div>
            <span className="text-lg font-bold text-amber-700 bg-amber-200 px-2.5 py-0.5 rounded-full">
              {summary?.pendingRequisitionsCount || 0}
            </span>
          </div>

          <div
            onClick={() => setActiveTab('maintenance')}
            className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 transition cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-blue-200/80 text-blue-800 flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">ครุภัณฑ์กำลังส่งซ่อม</div>
                <div className="text-xs text-blue-700">รอตรวจสภาพหรือรออะไหล่</div>
              </div>
            </div>
            <span className="text-lg font-bold text-blue-700 bg-blue-200 px-2.5 py-0.5 rounded-full">
              {summary?.ongoingRepairsCount || 0}
            </span>
          </div>

          <div
            onClick={() => setActiveTab('transfers')}
            className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/70 transition cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-teal-200/80 text-teal-800 flex items-center justify-center">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">ประวัติโอนย้ายทรัพย์สิน</div>
                <div className="text-xs text-teal-700">ใบส่งมอบตามระเบียบฯ ข้อ 211</div>
              </div>
            </div>
            <span className="text-lg font-bold text-teal-700 bg-teal-200 px-2.5 py-0.5 rounded-full">
              {summary?.transfersCount || 0}
            </span>
          </div>

          <div
            onClick={() => setActiveTab('annual-audit')}
            className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 transition cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-200/80 text-emerald-800 flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">ตรวจนับพัสดุประจำปี</div>
                <div className="text-xs text-emerald-700">ระเบียบพัสดุฯ ข้อ 213</div>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-200 px-2.5 py-1 rounded-lg">
              พร้อมตรวจนับ
            </span>
          </div>
        </div>
      </div>

      {/* Audit Log / Transparency Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-gov-600" />
            <h2 className="font-bold text-slate-800 text-base">ประวัติการทำงานล่าสุดในระบบ (Audit Trail)</h2>
          </div>
          <button
            onClick={() => setActiveTab('audit-trail')}
            className="text-xs text-gov-600 font-semibold hover:underline flex items-center"
          >
            ดูบันทึกทั้งหมด <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        <div className="space-y-3">
          {auditLogs?.slice(0, 5).map((log) => (
            <div key={log.id} className="flex items-start justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-gov-600 mt-2"></div>
                <div>
                  <div className="font-semibold text-slate-800">{log.details}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    โดย: <strong className="text-slate-700">{log.actor_name}</strong> ({log.actor_role})
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-400 flex items-center space-x-1 whitespace-nowrap">
                <Clock className="w-3.5 h-3.5" />
                <span>{log.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

