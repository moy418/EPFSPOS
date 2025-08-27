import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export default function Pos({ t }){
  const [cart, setCart] = useState([]);
  const [seller, setSeller] = useState(localStorage.getItem('seller') || '');
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [pmethod, setPmethod] = useState('cash');
  const [discountTotal, setDiscountTotal] = useState(0);
  const [taxRate, setTaxRate] = useState(8.25);

  useEffect(()=>{
    fetch('/api/settings').then(r=>r.json()).then(s=> setTaxRate(Number(s.tax_rate||8.25)));
    fetch('/api/customers').then(r=>r.json()).then(setCustomers);
  },[]);
  useEffect(()=> localStorage.setItem('seller', seller), [seller]);

  function addItem(it){
    setCart(prev => [...prev, { ...it, qty: Number(it.qty||1), price: Number(it.price||0), discount: Number(it.discount||0) }]);
    toast.success('Ítem agregado');
  }
  function removeIndex(i){
    setCart(prev => prev.filter((_,idx)=> idx!==i));
  }

  const subtotal = cart.reduce((s,it)=> s + Math.max(0,(it.price - it.discount))*it.qty, 0);
  const discTotal = Math.min(subtotal, Number(discountTotal||0));
  const taxableBase = Math.max(0, subtotal - discTotal);
  const tax = Number((taxableBase * (taxRate/100)).toFixed(2));
  const total = taxableBase + tax;

  async function finalizeSale(){
    if(cart.length===0) return toast.error('Carrito vacío');
    const body = {
      status: 'paid',
      customer_id: customerId ? Number(customerId) : null,
      seller_name: seller || null,
      payment_method: pmethod,
      discount_total: Number(discTotal),
      items: cart.map(it=>({ name: it.name, price: Number(it.price), discount: Number(it.discount||0), qty: Number(it.qty), sku: it.sku || null }))
    };
    const res = await fetch('/api/sales', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if(!res.ok){ return toast.error('Error creando venta'); }
    const data = await res.json();
    window.open(`/api/sales/${data.id}/pdf?doc=ticket`, '_blank');
    setCart([]); setDiscountTotal(0);
    toast.success('Venta realizada');
  }

  // Atajos: Ctrl+Enter (cobrar), Ctrl+K (foco en nombre del ítem)
  useEffect(()=>{
    function handler(e){
      if(e.ctrlKey && e.key === 'Enter'){
        e.preventDefault();
        finalizeSale();
      }
      if(e.ctrlKey && e.key.toLowerCase() === 'k'){
        e.preventDefault();
        document.getElementById('name')?.focus();
      }
    }
    window.addEventListener('keydown', handler);
    return ()=> window.removeEventListener('keydown', handler);
  }, [cart, finalizeSale]);

  return (
    <div className="grid lg:grid-cols-[1fr_420px] gap-4">
      {/* Panel items */}
      <div className="space-y-4">
        <div className="card p-4">
          <div className="grid md:grid-cols-6 gap-3">
            <input name="name" placeholder={t.name} className="input md:col-span-2" id="name"/>
            <input name="sku" placeholder="SKU (opcional)" className="input" id="sku"/>
            <input name="price" type="number" step="0.01" placeholder={t.price} className="input" id="price"/>
            <input name="qty" type="number" min="1" defaultValue="1" placeholder={t.qty} className="input" id="qty"/>
            <input name="discount" type="number" step="0.01" defaultValue="0" placeholder={t.discount} className="input" id="discount"/>
            <button
              className="btn btn-primary"
              onClick={()=>{
                const f = {
                  name: document.getElementById('name').value,
                  sku: document.getElementById('sku').value,
                  price: document.getElementById('price').value,
                  qty: document.getElementById('qty').value || 1,
                  discount: document.getElementById('discount').value || 0
                };
                if(!f.name || !f.price) return toast.error('Falta nombre o precio');
                addItem(f);
                ['name','sku','price','qty','discount'].forEach(id=> document.getElementById(id).value='');
                document.getElementById('qty').value = 1;
                document.getElementById('discount').value = 0;
              }}
            >
              {t.add}
            </button>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-2">{t.cart}</h3>
          <div className="space-y-2">
            {cart.length===0 && <div className="text-sm text-gray-500">Sin ítems</div>}
            {cart.map((it,idx)=>(
              <div key={idx} className="flex items-center justify-between gap-3 border-b py-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.name}</div>
                  <div className="text-sm text-gray-500">{it.qty} × ${Number(it.price).toFixed(2)} {it.discount?`(desc $${Number(it.discount).toFixed(2)})`:''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge">${(Math.max(0,(it.price-it.discount))*it.qty).toFixed(2)}</span>
                  <button className="btn" onClick={()=>removeIndex(idx)}>Quitar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Totales / Checkout */}
      <div className="card p-4 h-fit sticky top-4 space-y-3">
        <div>
          <label className="label">{t.seller}</label>
          <input className="input" value={seller} onChange={e=>setSeller(e.target.value)} placeholder="Nombre del vendedor"/>
        </div>
        <div>
          <label className="label">{t.customer}</label>
          <select className="select" value={customerId} onChange={e=>setCustomerId(e.target.value)}>
            <option value="">—</option>
            {customers.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t.payment_method}</label>
          <select className="select" value={pmethod} onChange={e=>setPmethod(e.target.value)}>
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="zelle">Zelle</option>
            <option value="cashapp">Cash App</option>
            <option value="transfer">Transferencia</option>
            <option value="finance">Financiamiento</option>
            <option value="layaway">Apartado</option>
          </select>
        </div>
        <div>
          <label className="label">{t.total_discount}</label>
          <input className="input" type="number" step="0.01" value={discountTotal} onChange={e=>setDiscountTotal(e.target.value || 0)}/>
        </div>
        <div className="border-t pt-3 space-y-1 text-sm">
          <div className="flex justify-between"><span>{t.subtotal}</span><span>${subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>{t.tax} ({taxRate}%)</span><span>${tax.toFixed(2)}</span></div>
          <div className="flex justify-between font-semibold text-lg"><span>{t.total}</span><span>${total.toFixed(2)}</span></div>
        </div>
        <button className="btn btn-primary w-full py-3 text-base" onClick={finalizeSale}>{t.finalize_sale}</button>
      </div>
    </div>
  );
}
