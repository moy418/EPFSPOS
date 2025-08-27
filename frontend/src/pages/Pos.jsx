import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Trash2, Search, PlusCircle } from 'lucide-react';

function useDebounce(value, delay) { /* ... (código del hook sin cambios) ... */
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Pos({ t, adminToken }) {
  const [cart, setCart] = useState([]);
  const [seller, setSeller] = useState(localStorage.getItem('seller') || '');
  const [pmethod, setPmethod] = useState('cash');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [discountTotal, setDiscountTotal] = useState(0);
  const [taxRate, setTaxRate] = useState(8.25);
  
  // --- Estados de Cliente ---
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });

  // ... (el resto de los estados y hooks sin cambios)
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [manualForm, setManualForm] = useState({ name: '', sku: '', price: '', qty: 1, discount: 0 });

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => setTaxRate(Number(s.tax_rate || 8.25)));
    fetch('/api/customers').then(r => r.json()).then(setCustomers);
  }, []);
  
  useEffect(() => {
    if (debouncedSearchTerm.length < 2) {
      setSearchResults([]);
      return;
    }
    fetch(`/api/products/search?q=${debouncedSearchTerm}`).then(r => r.json()).then(setSearchResults);
  }, [debouncedSearchTerm]);

  useEffect(() => localStorage.setItem('seller', seller), [seller]);

  const addItemToCart = (item) => { /* ... (sin cambios) ... */
    const finalItem = { ...item, qty: Number(item.qty || 1), price: Number(item.price || 0), discount: Number(item.discount || 0) };
    setCart(prev => [...prev, finalItem]);
    toast.success(`${finalItem.name} agregado al carrito`);
  };
  
  const handleSelectProduct = (product) => { /* ... (sin cambios) ... */
    addItemToCart({
      id: product.id, name: product.name, sku: product.sku, price: product.price_cents / 100,
    });
    setSearchTerm('');
    setSearchResults([]);
  };
  
  const handleManualAdd = (e) => { /* ... (sin cambios) ... */
    e.preventDefault();
    if (!manualForm.name || !manualForm.price) {
      return toast.error('El nombre y el precio son obligatorios.');
    }
    addItemToCart(manualForm);
    setManualForm({ name: '', sku: '', price: '', qty: 1, discount: 0 });
  };

  const removeIndex = (i) => { /* ... (sin cambios) ... */
    setCart(prev => prev.filter((_, idx) => idx !== i));
  };

  const subtotal = cart.reduce((s, it) => s + Math.max(0, (it.price - it.discount)) * it.qty, 0);
  const discTotal = Math.min(subtotal, Number(discountTotal || 0));
  const taxableBase = Math.max(0, subtotal - discTotal);
  const tax = Number((taxableBase * (taxRate / 100)).toFixed(2));
  const total = taxableBase + tax;

  async function finalizeSale() {
    if (cart.length === 0) return toast.error('Carrito vacío');
    if (isNewCustomer && !newCustomer.name) return toast.error('El nombre del nuevo cliente es obligatorio.');
    
    const body = {
      status: 'paid',
      customer_id: isNewCustomer ? null : (customerId ? Number(customerId) : null),
      new_customer: isNewCustomer ? newCustomer : null,
      seller_name: seller || null,
      payment_method: pmethod,
      payment_details: pmethod === 'finance' ? paymentDetails : null,
      discount_total: Number(discTotal),
      items: cart.map(it => ({ name: it.name, price: Number(it.price), discount: Number(it.discount || 0), qty: Number(it.qty), sku: it.sku || null }))
    };
    
    const res = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { return toast.error('Error creando venta'); }
    const data = await res.json();
    window.open(`/api/sales/${data.id}/pdf?doc=ticket`, '_blank');
    setCart([]); setDiscountTotal(0);
    // Resetear campos de cliente
    setIsNewCustomer(false);
    setNewCustomer({ name: '', phone: '', address: '' });
    setCustomerId('');
    toast.success('Venta realizada con éxito');
  }
  
  return (
    <div className="grid lg:grid-cols-[1fr_420px] gap-6">
      <div className="space-y-4">
          {/* ... (bloque híbrido sin cambios) ... */}
          <div className="card p-4 space-y-4">
              <div>
                  <label className="label">1. Buscar producto existente</label>
                  <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" className="input pl-10" placeholder="Ej: Sofá, Mesa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />{searchResults.length > 0 && <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">{searchResults.map(p => (<div key={p.id} className="p-3 hover:bg-gray-100 cursor-pointer border-b" onClick={() => handleSelectProduct(p)}><div className="font-medium">{p.name}</div><div className="text-sm text-gray-500">SKU: {p.sku || 'N/A'} - Precio: ${(p.price_cents / 100).toFixed(2)}</div></div>))}</div>}</div>
              </div>
              <div className="text-center text-sm text-gray-400">ó</div>
              <form onSubmit={handleManualAdd}>
                  <label className="label">2. Agregar un ítem manualmente</label>
                  <div className="grid md:grid-cols-6 gap-3"><input value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} placeholder={t.name} className="input md:col-span-2" /><input value={manualForm.sku} onChange={e => setManualForm({...manualForm, sku: e.target.value})} placeholder="SKU" className="input" /><input value={manualForm.price} onChange={e => setManualForm({...manualForm, price: e.target.value})} type="number" step="0.01" placeholder={t.price} className="input" /><input value={manualForm.qty} onChange={e => setManualForm({...manualForm, qty: e.target.value})} type="number" min="1" placeholder={t.qty} className="input" /><button type="submit" className="btn btn-primary h-10"><PlusCircle size={16}/> {t.add}</button></div>
              </form>
          </div>
          <div className="card p-4">{/* ... (carrito sin cambios) ... */}</div>
      </div>

      {/* Checkout con nuevos campos */}
      <div className="card p-4 h-fit sticky top-4 space-y-4">
        <div><label className="label">{t.seller}</label><input className="input" value={seller} onChange={e => setSeller(e.target.value)} placeholder="Nombre del vendedor" /></div>
        
        {/* --- Bloque de Cliente Mejorado --- */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="label">{t.customer}</label>
            <label className="flex items-center text-xs"><input type="checkbox" checked={isNewCustomer} onChange={e => setIsNewCustomer(e.target.checked)} className="mr-1"/> Nuevo Cliente</label>
          </div>
          {isNewCustomer ? (
            <div className="space-y-2 p-2 border rounded-md">
              <input className="input" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} placeholder="Nombre del Cliente (Obligatorio)" />
              <input className="input" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} placeholder="Teléfono (Opcional)" />
              <input className="input" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} placeholder="Dirección (Opcional)" />
            </div>
          ) : (
            <select className="input" value={customerId} onChange={e => setCustomerId(e.target.value)}>
              <option value="">— Cliente Genérico —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {/* --- Bloque de Pago Mejorado --- */}
        <div>
            <label className="label">{t.payment_method}</label>
            <select className="input" value={pmethod} onChange={e => setPmethod(e.target.value)}>
                <option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="zelle">Zelle</option><option value="cashapp">Cash App</option><option value="transfer">Transferencia</option><option value="finance">Financiamiento</option><option value="layaway">Apartado</option>
            </select>
        </div>
        {pmethod === 'finance' && (
            <div>
                <label className="label">Datos de la Financiera</label>
                <input className="input" value={paymentDetails} onChange={e => setPaymentDetails(e.target.value)} placeholder="Ej: Synchrony, Aprobación #123" />
            </div>
        )}

        <div><label className="label">{t.total_discount}</label><input className="input" type="number" step="0.01" value={discountTotal} onChange={e => setDiscountTotal(e.target.value || 0)} /></div>
        <div className="border-t pt-4 space-y-2 text-sm">{/* ... (totales sin cambios) ... */}</div>
        <button className="btn btn-primary w-full py-3 text-base font-semibold" onClick={finalizeSale}>{t.finalize_sale}</button>
      </div>
    </div>
  );
}
