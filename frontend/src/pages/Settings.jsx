import React, { useEffect, useState } from 'react';

export default function Settings({ t, adminToken }){
  const [s, setS] = useState({ tax_rate:'8.25', brand_name:'', brand_address:'', brand_phone:'', brand_taxid:'' });

  useEffect(()=>{
    fetch('/api/settings')
      .then(r=>r.json())
      .then((v)=> setS({
        tax_rate: String(v.tax_rate ?? '8.25'),
        brand_name: v.brand_name || '',
        brand_address: v.brand_address || '',
        brand_phone: v.brand_phone || '',
        brand_taxid: v.brand_taxid || ''
      }))
      .catch(()=>{});
  },[]);

  async function save(){
    if(!adminToken) return alert('Admin requerido (usa el botón Admin PIN)');
    const res = await fetch('/api/settings', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify(s)
    });
    alert(res.ok ? 'Guardado' : 'Error guardando');
  }

  return (
    <div>
      <h2>{t.settings}</h2>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, maxWidth:720}}>
        <label>Tax Rate (%)<input value={s.tax_rate||''} onChange={e=>setS({...s, tax_rate:e.target.value})}/></label>
        <label>Nombre Comercial<input value={s.brand_name||''} onChange={e=>setS({...s, brand_name:e.target.value})}/></label>
        <label>Dirección<input value={s.brand_address||''} onChange={e=>setS({...s, brand_address:e.target.value})}/></label>
        <label>Teléfono<input value={s.brand_phone||''} onChange={e=>setS({...s, brand_phone:e.target.value})}/></label>
        <label>Tax ID<input value={s.brand_taxid||''} onChange={e=>setS({...s, brand_taxid:e.target.value})}/></label>
      </div>
      <button onClick={save} style={{marginTop:8}}>Guardar</button>
    </div>
  );
}
