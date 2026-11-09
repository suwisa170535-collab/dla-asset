import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import DashboardView from './views/DashboardView.jsx';
import AssetManagementView from './views/AssetManagementView.jsx';
import BorrowReturnView from './views/BorrowReturnView.jsx';
import TransferView from './views/TransferView.jsx';
import InventoryView from './views/InventoryView.jsx';
import RequisitionsView from './views/RequisitionsView.jsx';
import MaintenanceView from './views/MaintenanceView.jsx';
import AnnualAuditView from './views/AnnualAuditView.jsx';
import DisposalView from './views/DisposalView.jsx';
import ReportsView from './views/ReportsView.jsx';
import AuditTrailView from './views/AuditTrailView.jsx';
import SettingsView from './views/SettingsView.jsx';
import LoginView from './views/LoginView.jsx';

export default function App() {
  const mainRef = useRef(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState({
    org_name: 'เทศบาลตำบลสุขเกษมพัฒนา',
    org_type: 'เทศบาลตำบล',
    org_logo: '',
    district: 'อำเภอเมือง',
    province: 'จังหวัดเชียงใหม่',
    fiscal_year: '2569',
    mayor_name: 'นายสมศักดิ์ วัฒนากูล',
    clerk_name: 'นางพิมพา จิตตรง',
    supply_officer_name: 'นางสาวนิตยา พัสดุเจริญ'
  });

  const [departments, setDepartments] = useState([]);
  const [subDepartments, setSubDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  // Active Role and User for Demo Presentation (เข้าใช้งานได้ทันทีไม่ต้องใส่รหัสผ่าน)
  const defaultDemoUser = {
    id: 'central_supply',
    roleType: 'admin',
    title: 'เจ้าหน้าที่พัสดุกลาง',
    name: 'นางสาวนิตยา พัสดุเจริญ',
    dept: 'กองคลัง',
    departmentId: 2
  };

  const [currentRole, setCurrentRole] = useState('central_supply');
  const [currentUser, setCurrentUser] = useState(defaultDemoUser);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load Initial Settings & Metadata
  const loadInitialData = async () => {
    try {
      const [resS, resD, resSubD, resC, resSum, resLogs, resInv] = await Promise.all([
        fetch('/api/settings').then(r => r.json()),
        fetch('/api/departments').then(r => r.json()),
        fetch('/api/sub-departments').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/reports/summary').then(r => r.json()),
        fetch('/api/audit-logs?limit=10').then(r => r.json()),
        fetch('/api/inventory').then(r => r.json())
      ]);

      if (resS && Object.keys(resS).length > 0) setSettings(resS);
      if (resD) setDepartments(resD);
      if (resSubD) setSubDepartments(resSubD);
      if (resC) setCategories(resC);
      if (resSum) setSummary(resSum);
      if (resLogs) setAuditLogs(resLogs);
      if (resInv) setInventoryItems(resInv);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const fetchSubDepartments = async () => {
    try {
      const res = await fetch('/api/sub-departments');
      if (res.ok) {
        const data = await res.json();
        setSubDepartments(data);
      }
    } catch (err) {
      console.error('Failed to load sub-departments:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
    setIsMobileMenuOpen(false);
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-x-hidden">
      <Header
        settings={settings}
        departments={departments}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto min-w-0">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          summaryData={summary}
          currentRole={currentRole}
          currentUser={currentUser}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        <main ref={mainRef} className="flex-1 min-w-0 p-3 sm:p-5 md:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              setActiveTab={setActiveTab}
              auditLogs={auditLogs}
              inventoryItems={inventoryItems}
            />
          )}

          {activeTab === 'assets' && (
            <AssetManagementView
              settings={settings}
              departments={departments}
              subDepartments={subDepartments}
              categories={categories}
              currentUser={currentUser}
              currentRole={currentRole}
            />
          )}

          {activeTab === 'borrow-return' && (
            <BorrowReturnView
              settings={settings}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'transfers' && (
            <TransferView
              settings={settings}
              departments={departments}
              subDepartments={subDepartments}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              settings={settings}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'requisitions' && (
            <RequisitionsView
              settings={settings}
              departments={departments}
              currentUser={currentUser}
              currentRole={currentRole}
            />
          )}

          {activeTab === 'maintenance' && (
            <MaintenanceView
              currentUser={currentUser}
            />
          )}

          {activeTab === 'annual-audit' && (
            <AnnualAuditView
              settings={settings}
              departments={departments}
              subDepartments={subDepartments}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'disposal' && (
            <DisposalView
              settings={settings}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              settings={settings}
              departments={departments}
              subDepartments={subDepartments}
            />
          )}

          {activeTab === 'audit-trail' && (
            <AuditTrailView />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              setSettings={setSettings}
              departments={departments}
              fetchDepartments={loadInitialData}
              subDepartments={subDepartments}
              fetchSubDepartments={fetchSubDepartments}
              categories={categories}
              fetchCategories={loadInitialData}
              currentUser={currentUser}
            />
          )}
        </main>
      </div>
    </div>
  );
}

