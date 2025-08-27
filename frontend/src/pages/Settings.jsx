import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

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
      .catch(()=>{ toast.error('No se pudieron cargar los ajustes.'); });
  },[]);

  async function save(){
    if(!adminToken) return toast.error('Admin requerido (usa el botón Admin PIN)');
    const res = await fetch('/api/settings', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify(s)
    });
    if (res.ok) {
      toast.success('Ajustes guardados');
    } else {
      toast.error('Error guardando los ajustes');
    }
  }

  return (
    <div className="card p-4 space-y-4">
      <h2 className="text-xl font-semibold">{t.settings}</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="label">Tax Rate (%)</label><input className="input" value={s.tax_rate||''} onChange={e=>setS({...s, tax_rate:e.target.value})}/></div>
        <div><label className="label">Nombre Comercial</label><input className="input" value={s.brand_name||''} onChange={e=>setS({...s, brand_name:e.target.value})}/></div>
        <div className="md:col-span-2"><label className="label">Dirección</label><input className="input" value={s.brand_address||''} onChange={e=>setS({...s, brand_address:e.target.value})}/></div>
        <div><label className="label">Teléfono</label><input className="input" value={s.brand_phone||''} onChange={e=>setS({...s, brand_phone:e.target.value})}/></div>
        <div><label className="label">Tax ID</label><input className="input" value={s.brand_taxid||''} onChange={e=>setS({...s, brand_taxid:e.target.value})}/></div>
      </div>
      <div className="pt-4">
        <button onClick={save} className="btn btn-primary">Guardar Ajustes</button>
      </div>
    </div>
  );
}
