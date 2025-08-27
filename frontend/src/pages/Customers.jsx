import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function Customers({ t }){
  const [list, setList] = useState([]);
  const [f, setF] = useState({ name:'', phone:'', email:'', address:'', notes:'' });

  async function loadCustomers() {
    try {
      const r = await fetch('/api/customers');
      if (!r.ok) throw new Error('Failed to fetch');
      setList(await r.json());
    } catch (error) {
      toast.error('No se pudieron cargar los clientes.');
    }
  }

  useEffect(()=>{ loadCustomers(); },[]);

  async function add(e){
    e.preventDefault();
    const payload = {
      name: f.name.trim(),
      phone: f.phone.trim() || null,
      email: f.email.trim() || null,
      address: f.address.trim() || null,
      notes: f.notes.trim() || null
    };
    const res = await fetch('/api/customers',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if(!res.ok){ return toast.error('Error creando cliente'); }
    toast.success('Cliente agregado');
    setF({ name:'', phone:'', email:'', address:'', notes:'' });
    loadCustomers();
  }

  return (
    <div className="card p-4 space-y-4">
      <h2 className="text-xl font-semibold">{t.customers}</h2>
      <form onSubmit={add} className="p-3 bg-gray-50 rounded-lg grid md:grid-cols-3 gap-4">
        <div className="md:col-span-3"><label className="label">Nombre</label><input className="input" placeholder="Nombre completo" value={f.name} onChange={e=>setF({...f, name:e.target.value})} required/></div>
        <div><label className="label">Teléfono</label><input className="input" placeholder="Opcional" value={f.phone} onChange={e=>setF({...f, phone:e.target.value})}/></div>
        <div><label className="label">Email</label><input className="input" type="email" placeholder="Opcional" value={f.email} onChange={e=>setF({...f, email:e.target.value})}/></div>
        <div><label className="label">Dirección</label><input className="input" placeholder="Opcional" value={f.address} onChange={e=>setF({...f, address:e.target.value})}/></div>
        <div className="md:col-span-3"><label className="label">Notas</label><input className="input" placeholder="Notas adicionales (opcional)" value={f.notes} onChange={e=>setF({...f, notes:e.target.value})}/></div>
        <div className="md:col-span-3"><button type="submit" className="btn btn-primary">Agregar Cliente</button></div>
      </form>
      <ul className="space-y-2">
        {list.map(c=> <li key={c.id} className="p-2 border-b">{c.name} — {c.phone||'Sin teléfono'} {c.email?`<${c.email}>`:''}</li>)}
      </ul>
    </div>
  );
}
