import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Trash2, Search, PlusCircle } from 'lucide-react';

// Hook para "retrasar" la ejecución de una función
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Pos({ t, adminToken }) {
  const [cart, setCart] = useState([]);
  const [seller, setSeller] = useState(localStorage.getItem('seller') || '');
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [pmethod, setPmethod] = useState('cash');
  const [discountTotal, setDiscountTotal] = useState(0);
  const [taxRate, setTaxRate] = useState(8.25);
  
  // Estados para el buscador
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Estados para el formulario manual
  const [manualForm, setManualForm] = useState({ name: '', sku: '', price: '', qty: 1, discount: 0 });

  // Carga inicial de datos
  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => setTaxRate(Number(s.tax_rate || 8.25)));
    fetch('/api/customers').then(r => r.json()).then(setCustomers);
  }, []);
  
  // Efecto para buscar productos
  useEffect(() => {
    if (debouncedSearchTerm.length < 2) {
      setSearchResults([]);
      return;
    }
    fetch(`/api/products/search?q=${debouncedSearchTerm}`)
      .then(r => r.json())
      .then(setSearchResults);
  }, [debouncedSearchTerm]);

  // Guardar vendedor
  useEffect(() => localStorage.setItem('seller', seller), [seller]);

  const addItemToCart = (item) => {
    const finalItem = { ...item, qty: Number(item.qty || 1), price: Number(item.price || 0), discount: Number(item.discount || 0) };
    setCart(prev => [...prev, finalItem]);
    toast.success(`${finalItem.name} agregado al carrito`);
  };
  
  const handleSelectProduct = (product) => {
    addItemToCart({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price_cents / 100,
    });
    setSearchTerm('');
    setSearchResults([]);
  };
  
  const handleManualAdd = (e) => {
    e.preventDefault();
    if (!manualForm.name || !manualForm.price) {
      return toast.error('El nombre y el precio son obligatorios para agregados manuales.');
    }
    addItemToCart(manualForm);
    // Limpiar formulario manual
    setManualForm({ name: '', sku: '', price: '', qty: 1, discount: 0 });
  };

  const removeIndex = (i) => {
    setCart(prev => prev.filter((_, idx) => idx !== i));
  };

  const subtotal = cart.reduce((s, it) => s + Math.max(0, (it.price - it.discount)) * it.qty, 0);
  const discTotal = Math.min(subtotal, Number(discountTotal || 0));
  const taxableBase = Math.max(0, subtotal - discTotal);
  const tax = Number((taxableBase * (taxRate / 100)).toFixed(2));
  const total = taxableBase + tax;

  async function finalizeSale() {
    if (cart.length === 0) return toast.error('Carrito vacío');
    const body = {
      status: 'paid',
      customer_id: customerId ? Number(customerId) : null,
      seller_name: seller || null,
      payment_method: pmethod,
      discount_total: Number(discTotal),
      items: cart.map(it => ({
        name: it.name,
        price: Number(it.price),
        discount: Number(it.discount || 0),
        qty: Number(it.qty),
        sku: it.sku || null
      }))
    };
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) { return toast.error('Error creando venta'); }
    const data = await res.json();
    window.open(`/api/sales/${data.id}/pdf?doc=ticket`, '_blank');
    setCart([]);
    setDiscountTotal(0);
    toast.success('Venta realizada con éxito');
  }
  
  return (
    <div className="grid lg:grid-cols-[1fr_420px] gap-6">
      <div className="space-y-4">
        {/* --- Bloque Híbrido --- */}
        <div className="card p-4 space-y-4">
            {/* Buscador */}
            <div>
                <label className="label">1. Buscar producto existente</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input type="text" className="input pl-10" placeholder="Ej: Sofá, Mesa, etc..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    {searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                            {searchResults.map(p => (
                                <div key={p.id} className="p-3 hover:bg-gray-100 cursor-pointer border-b" onClick={() => handleSelectProduct(p)}>
                                    <div className="font-medium">{p.name}</div>
                                    <div className="text-sm text-gray-500">SKU: {p.sku || 'N/A'} - Precio: ${(p.price_cents / 100).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="text-center text-sm text-gray-400">ó</div>

            {/* Formulario Manual */}
            <form onSubmit={handleManualAdd}>
                <label className="label">2. Agregar un ítem manualmente</label>
                <div className="grid md:grid-cols-6 gap-3">
                    <input value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} placeholder={t.name} className="input md:col-span-2" />
                    <input value={manualForm.sku} onChange={e => setManualForm({...manualForm, sku: e.target.value})} placeholder="SKU" className="input" />
                    <input value={manualForm.price} onChange={e => setManualForm({...manualForm, price: e.target.value})} type="number" step="0.01" placeholder={t.price} className="input" />
                    <input value={manualForm.qty} onChange={e => setManualForm({...manualForm, qty: e.target.value})} type="number" min="1" placeholder={t.qty} className="input" />
                    <button type="submit" className="btn btn-primary h-10"><PlusCircle size={16}/> {t.add}</button>
                </div>
            </form>
        </div>

        {/* Carrito */}
        <div className="card p-4">
          <h3 className="font-semibold mb-2 text-lg font-heading">{t.cart}</h3>
          <div className="space-y-2">
            {cart.length === 0 && <div className="text-sm text-gray-500 py-4 text-center">Sin ítems</div>}
            {cart.map((it, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 border-b py-2">
                <div className="min-w-0"><div className="font-medium truncate">{it.name}</div><div className="text-sm text-gray-500">{it.qty} × ${Number(it.price).toFixed(2)}</div></div>
                <div className="flex items-center gap-2"><span className="font-semibold">${(Math.max(0, (it.price - it.discount)) * it.qty).toFixed(2)}</span><button className="btn p-2 hover:bg-red-100" onClick={() => removeIndex(idx)}><Trash2 size={16} className="text-red-600"/></button></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Checkout */}
      <div className="card p-4 h-fit sticky top-4 space-y-4">
        <div><label className="label">{t.seller}</label><input className="input" value={seller} onChange={e => setSeller(e.target.value)} placeholder="Nombre del vendedor" /></div>
        <div><label className="label">{t.customer}</label><select className="input" value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="">— Cliente Genérico —</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="label">{t.payment_method}</label><select className="input" value={pmethod} onChange={e => setPmethod(e.target.value)}><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="zelle">Zelle</option><option value="cashapp">Cash App</option><option value="transfer">Transferencia</option><option value="finance">Financiamiento</option><option value="layaway">Apartado</option></select></div>
        <div><label className="label">{t.total_discount}</label><input className="input" type="number" step="0.01" value={discountTotal} onChange={e => setDiscountTotal(e.target.value || 0)} /></div>
        <div className="border-t pt-4 space-y-2 text-sm"><div className="flex justify-between"><span>{t.subtotal}</span><span>${subtotal.toFixed(2)}</span></div><div className="flex justify-between text-gray-600"><span>{t.tax} ({taxRate}%)</span><span>${tax.toFixed(2)}</span></div><div className="flex justify-between font-bold text-xl mt-2"><span>{t.total}</span><span>${total.toFixed(2)}</span></div></div>
        <button className="btn btn-primary w-full py-3 text-base font-semibold" onClick={finalizeSale}>{t.finalize_sale}</button>
      </div>
    </div>
  );
}
