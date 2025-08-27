import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Users, Package, Settings, FileText, BarChart, LogOut, Lock } from 'lucide-react';
import { Toaster, toast } from 'sonner';

import Pos from './pages/Pos';
import Customers from './pages/Customers';
import Products from './pages/Products';
import SettingsPage from './pages/Settings';
import ExportPage from './pages/Export';
import Reports from './pages/Reports';

import es from './i18n/es.json';
import en from './i18n/en.json';

const translations = { es, en };

function App() {
  const [lang, setLang] = useState('es');
  const t = translations[lang];
  const location = useLocation();
  const navigate = useNavigate();
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || null);
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);

  useEffect(() => {
    // Si no hay token y no estamos en /admin (para evitar loop) y no estamos en la página de inicio, redirigir
    // No redirigimos a /pos por defecto si no hay token para permitir ver productos
    // if (!adminToken && location.pathname !== '/admin' && location.pathname !== '/') {
    //   navigate('/');
    // }
  }, [adminToken, location.pathname, navigate]);

  const handleAdminLogin = async (pin) => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: Number(pin) })
      });
      if (!res.ok) throw new Error('PIN incorrecto');
      const data = await res.json();
      localStorage.setItem('adminToken', data.token);
      setAdminToken(data.token);
      setShowAdminPinModal(false);
      toast.success('Sesión de administrador iniciada');
    } catch (error) {
      toast.error(error.message || 'Error de autenticación');
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    toast.info('Sesión de administrador cerrada');
  };

  const navLinks = [
    { to: "/", icon: <ShoppingCart size={20} />, label: t.pos },
    { to: "/products", icon: <Package size={20} />, label: t.products },
    { to: "/customers", icon: <Users size={20} />, label: t.customers },
    { to: "/reports", icon: <BarChart size={20} />, label: t.reports },
    { to: "/export", icon: <FileText size={20} />, label: t.export },
    { to: "/settings", icon: <Settings size={20} />, label: t.settings },
  ];

  return (
    <div className="flex h-screen bg-gray-100 font-body">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg p-4 flex flex-col justify-between">
        <div>
          {/* Logo */}
          <div className="mb-8 p-2">
            <img src="/logo.png" alt="El Paso Furniture & Style POS" className="w-full h-auto" />
            <p className="text-center text-xs text-gray-500 mt-2 font-heading">Your Comfort, Our Priority</p>
          </div>
          <nav className="space-y-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
              >
                {link.icon}
                <span className="ml-3">{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        {/* Admin Section */}
        <div className="p-3 border-t mt-4 space-y-2">
          {adminToken ? (
            <button onClick={handleAdminLogout} className="sidebar-link w-full bg-red-100 text-red-700 hover:bg-red-200">
              <LogOut size={20} />
              <span className="ml-3">Cerrar Admin ({t.admin})</span>
            </button>
          ) : (
            <button onClick={() => setShowAdminPinModal(true)} className="sidebar-link w-full">
              <Lock size={20} />
              <span className="ml-3">Abrir Admin ({t.admin})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <Routes>
          <Route path="/" element={<Pos t={t} adminToken={adminToken} />} />
          <Route path="/products" element={<Products t={t} adminToken={adminToken} />} />
          <Route path="/customers" element={<Customers t={t} adminToken={adminToken} />} />
          <Route path="/reports" element={<Reports t={t} adminToken={adminToken} />} />
          <Route path="/export" element={<ExportPage t={t} adminToken={adminToken} />} />
          <Route path="/settings" element={<SettingsPage t={t} adminToken={adminToken} />} />
        </Routes>
      </div>

      {/* Admin PIN Modal */}
      {showAdminPinModal && (
        <AdminPinModal
          onClose={() => setShowAdminPinModal(false)}
          onLogin={handleAdminLogin}
          t={t}
        />
      )}
      <Toaster position="bottom-right" />
    </div>
  );
}

function AdminPinModal({ onClose, onLogin, t }) {
  const [pin, setPin] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(pin);
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-80">
        <h3 className="text-lg font-semibold mb-4">{t.admin_pin_required}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            className="input text-center text-lg tracking-widest"
            placeholder="PIN"
            maxLength="4"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">{t.cancel}</button>
            <button type="submit" className="btn btn-primary">{t.login}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
