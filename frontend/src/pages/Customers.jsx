import React, { useEffect, useState } from 'react';

export default function Customers({ t }){
  const [list, setList] = useState([]);
  const [f, setF] = useState({ name:'', phone:'', email:'', address:'', notes:'' });

  useEffect(()=>{ fetch('/api/customers').then(r=>r.json()).then(setList); },[]);
  async function add(e){
    e.preventDefault();
    // Adapt blank optional fields to null (backend schema allows undefined/null, not empty strings)
    const payload = {
      name: f.name.trim(),
      phone: f.phone.trim() || null,
      email: f.email.trim() || null,
      address: f.address.trim() || null,
      notes: f.notes.trim() || null
    };
    const res = await fetch('/api/customers',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if(!res.ok){ return alert('Error creando cliente'); }
    setF({ name:'', phone:'', email:'', address:'', notes:'' });
    const r = await fetch('/api/customers'); setList(await r.json());
  }

  return (
    <div>
      <h2>{t.customers}</h2>
      <form onSubmit={add} style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, maxWidth:720}}>
        <input placeholder="Nombre" value={f.name} onChange={e=>setF({...f, name:e.target.value})} required/>
        <input placeholder="Teléfono" value={f.phone} onChange={e=>setF({...f, phone:e.target.value})}/>
        <input placeholder="Email" value={f.email} onChange={e=>setF({...f, email:e.target.value})}/>
        <input placeholder="Dirección" value={f.address} onChange={e=>setF({...f, address:e.target.value})}/>
        <input placeholder="Notas" value={f.notes} onChange={e=>setF({...f, notes:e.target.value})}/>
        <button type="submit">Agregar</button>
      </form>
      <ul>
        {list.map(c=> <li key={c.id}>{c.name} — {c.phone||''} {c.email?`<${c.email}>`:''}</li>)}
      </ul>
    </div>
  );
}
