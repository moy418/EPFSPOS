import React, { useEffect, useState } from 'react';

export default function Products({ t, adminToken }){
  const [list, setList] = useState([]);
  const [name,setName]=useState(''); const [price,setPrice]=useState(''); const [sku,setSku]=useState('');
  const isAdmin = Boolean(adminToken);

  async function load(){
    const r = await fetch('/api/products');
    setList(await r.json());
  }
  useEffect(()=>{ load(); },[]);

  async function add(e){
    e.preventDefault();
    if(!isAdmin){ return alert('Admin requerido'); }
    const payload = { name: name.trim(), price: Number(price), sku: sku.trim() || null };
    const res = await fetch('/api/products', { method:'POST', headers:{'Content-Type':'application/json', 'Authorization': `Bearer ${adminToken}`}, body: JSON.stringify(payload) });
    if(!res.ok){ return alert('Error creando producto'); }
    setName(''); setPrice(''); setSku(''); load();
  }

  return (
    <div>
      <h2>{t.products}</h2>
      <form onSubmit={add} style={{display:'flex', gap:6}}>
        <input placeholder={t.name} value={name} onChange={e=>setName(e.target.value)} required disabled={!isAdmin}/>
        <input placeholder="SKU" value={sku} onChange={e=>setSku(e.target.value)} disabled={!isAdmin}/>
        <input type="number" step="0.01" placeholder={t.price} value={price} onChange={e=>setPrice(e.target.value)} required disabled={!isAdmin}/>
        <button type="submit" disabled={!isAdmin}>{t.add}</button>
      </form>
      {!isAdmin && <div style={{marginTop:8, fontSize:12, color:'#b91c1c'}}>Inicia sesión admin (PIN) para crear productos.</div>}
      <ul>
        {list.map(p=> <li key={p.id}>{p.name} — ${ (p.price_cents/100).toFixed(2) } {p.sku?`[${p.sku}]`:''}</li>)}
      </ul>
    </div>
  );
}
