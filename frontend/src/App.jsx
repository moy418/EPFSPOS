import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Routes, Route } from 'react-router-dom';
import { getDict } from './i18n.js';
import { Home, Package, Users, BarChart3, Settings as Cog, Download, Lock, LogOut, History } from 'lucide-react';
import Pos from './pages/Pos.jsx';
import Products from './pages/Products.jsx';
import Customers from './pages/Customers.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import ExportPage from './pages/Export.jsx';
import SalesHistory from './pages/SalesHistory.jsx'; // <-- Nueva página
import { Toaster, toast } from 'sonner';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';

function SideLink({ to, children }) {
  return (
    <NavLink to={to} end={to==='/'} className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}>
      {children}
    </NavLink>
  );
}

export default function App(){
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'es');
  const t = useMemo(() => getDict(lang), [lang]);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');

  // ... (el resto del código de App.jsx se mantiene igual, pero lo incluimos todo para reemplazar)

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
      toast.success('Admin habilitado');
    } else {
      toast.error('PIN incorrecto');
    }
  }
  function adminLogout(){ setAdminToken(''); }
  
  const navLinks = [
    { to: "/", icon: <Home size={18}/>, label: t.pos },
    { to: "/products", icon: <Package size={18}/>, label: t.products },
    { to: "/customers", icon: <Users size={18}/>, label: t.customers },
    { to: "/history", icon: <History size={18}/>, label: "Historial" }, // <-- Nuevo enlace
    { to: "/reports", icon: <BarChart3 size={18}/>, label: t.reports },
    { to: "/settings", icon: <Cog size={18}/>, label: t.settings },
    { to: "/export", icon: <Download size={18}/>, label: t.export },
  ];

  return (
    <>
      <Toaster richColors position="top-center" /> {/* <-- Movido aquí para ser global */}
      <div className="min-h-screen grid grid-cols-[260px_1fr] font-body bg-gray-50">
        <aside className="bg-white flex flex-col shadow-lg">
          <div className="p-4 border-b">
            <img src="/logo.png" alt="El Paso Furniture & Style Logo" className="w-full h-auto" />
            <p className="text-center text-xs text-gray-500 mt-2 font-heading">YOUR COMFORT, OUR PRIORITY</p>
          </div>
          <nav className="flex-grow p-4 space-y-2">
            {navLinks.map(link => <SideLink key={link.to} to={link.to}>{link.icon} {link.label}</SideLink>)}
          </nav>
          <div className="p-4 border-t">
            {adminToken ? (
                <button className="btn btn-secondary w-full" onClick={adminLogout}><LogOut size={16}/> {t.logout}</button>
              ) : (
                <button className="btn btn-primary w-full" onClick={adminLogin}><Lock size={16}/> {t.admin_login}</button>
              )}
          </div>
        </aside>

        <div className="p-6 overflow-auto">
          <header className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-heading text-gray-800">El Paso Furniture & Style</h1>
               <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">v{APP_VERSION}</span>
                  <select className="input w-24" value={lang} onChange={e=>setLang(e.target.value)}>
                    <option value="es">ES</option>
                    <option value="en">EN</option>
                  </select>
               </div>
          </header>

          <main>
            <Routes>
              <Route path="/" element={<Pos t={t} adminToken={adminToken} />} />
              <Route path="/products" element={<Products t={t} adminToken={adminToken} />} />
              <Route path="/customers" element={<Customers t={t} adminToken={adminToken} />} />
              <Route path="/history" element={<SalesHistory t={t} adminToken={adminToken} />} /> {/* <-- Nueva ruta */}
              <Route path="/reports" element={<Reports t={t} />} />
              <Route path="/settings" element={<Settings t={t} adminToken={adminToken} />} />
              <Route path="/export" element={<ExportPage t={t} adminToken={adminToken} />} />
            </Routes>
          </main>
        </div>
      </div>
    </>
  );
}
