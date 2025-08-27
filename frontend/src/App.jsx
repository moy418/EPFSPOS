import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Routes, Route } from 'react-router-dom';
import { getDict } from './i18n';
import { Home, Package, Users, BarChart3, Settings as Cog, Download } from 'lucide-react';
import Pos from './pages/Pos.jsx';
import Products from './pages/Products.jsx';
import Customers from './pages/Customers.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import ExportPage from './pages/Export.jsx';
import { Toaster } from 'sonner';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';

function SideLink({ to, children }) {
  return (
    <NavLink
      to={to}
      end={to==='/'}
      className={({isActive}) => `flex items-center gap-2 px-3 py-2 rounded-xl ${isActive ? 'active' : ''}`}
    >
      {children}
    </NavLink>
  );
}

export default function App(){
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'es');
  const t = useMemo(() => getDict(lang), [lang]);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');

  useEffect(() => localStorage.setItem('lang', lang), [lang]);
  useEffect(() => {
    if(adminToken) localStorage.setItem('adminToken', adminToken);
    else localStorage.removeItem('adminToken');
  }, [adminToken]);

  async function adminLogin(){
    const pin = prompt('PIN Admin:');
    if(!pin) return;
    const res = await fetch('/api/auth/admin-login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ pin })
    });
    if(res.ok){
      const data = await res.json();
      setAdminToken(data.token);
      alert('Admin habilitado');
    } else {
      alert('PIN incorrecto');
    }
  }
  function adminLogout(){ setAdminToken(''); }

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <Toaster richColors position="top-center" />
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white text-brand grid place-items-center font-bold">E</div>
          <div className="text-lg font-semibold">EPFS POS</div>
        </div>
        <nav className="flex flex-col gap-1">
          <SideLink to="/"><Home size={18}/> {t.pos}</SideLink>
          <SideLink to="/products"><Package size={18}/> {t.products}</SideLink>
          <SideLink to="/customers"><Users size={18}/> {t.customers}</SideLink>
          <SideLink to="/reports"><BarChart3 size={18}/> {t.reports}</SideLink>
          <SideLink to="/settings"><Cog size={18}/> {t.settings}</SideLink>
          <SideLink to="/export"><Download size={18}/> {t.export}</SideLink>
        </nav>
      </aside>

      {/* Main */}
      <div className="p-6 space-y-4">
        {/* Topbar */}
        <header className="topbar">
          <div className="font-semibold text-brand">El Paso Furniture & Style <span className="text-xs opacity-70 align-top">v{APP_VERSION}</span></div>
          <div className="flex items-center gap-3">
            <select className="select" value={lang} onChange={e=>setLang(e.target.value)}>
              <option value="es">ES</option>
              <option value="en">EN</option>
            </select>
            {adminToken ? (
              <button className="btn" onClick={()=>adminLogout()}>{t.logout}</button>
            ) : (
              <button className="btn btn-primary" onClick={()=>adminLogin()}>{t.admin_login}</button>
            )}
          </div>
        </header>

        <main className="space-y-4">
          <Routes>
            <Route path="/" element={<Pos t={t} adminToken={adminToken} />} />
            <Route path="/products" element={<Products t={t} adminToken={adminToken} />} />
            <Route path="/customers" element={<Customers t={t} adminToken={adminToken} />} />
            <Route path="/reports" element={<Reports t={t} />} />
            <Route path="/settings" element={<Settings t={t} adminToken={adminToken} />} />
            <Route path="/export" element={<ExportPage t={t} adminToken={adminToken} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
