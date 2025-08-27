import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Edit, Trash2 } from 'lucide-react';

export default function Products({ t, adminToken }){
  const [list, setList] = useState([]);
  const [name,setName]=useState(''); const [price,setPrice]=useState(''); const [sku,setSku]=useState('');
  const isAdmin = Boolean(adminToken);

  async function load(){
    try {
      const r = await fetch('/api/products');
      if (!r.ok) throw new Error('Failed to fetch');
      setList(await r.json());
    } catch (error) {
      toast.error('No se pudieron cargar los productos.');
    }
  }
  useEffect(()=>{ load(); },[]);

  async function add(e){
    e.preventDefault();
    if(!isAdmin){ return toast.error('Admin requerido'); }
    const payload = { name: name.trim(), price: Number(price), sku: sku.trim() || null };
    const res = await fetch('/api/products', {
      method:'POST',
      headers:{'Content-Type':'application/json', 'Authorization': `Bearer ${adminToken}`},
      body: JSON.stringify(payload)
    });
    if(!res.ok){ return toast.error('Error creando producto'); }
    toast.success('Producto agregado');
    setName(''); setPrice(''); setSku('');
    load();
  }

  async function editProduct(product) {
    if (!isAdmin) return toast.error('Admin requerido');
    const newName = prompt('Nuevo nombre:', product.name);
    const newPrice = prompt('Nuevo precio:', (product.price_cents / 100).toFixed(2));
    if (newName === null || newPrice === null) return; // User cancelled

    const payload = { name: newName.trim(), price: Number(newPrice), sku: product.sku };
    const res = await fetch(`/api/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      toast.success('Producto actualizado');
      load();
    } else {
      toast.error('Error al actualizar el producto');
    }
  }

  async function deleteProduct(productId) {
    if (!isAdmin) return toast.error('Admin requerido');
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;

    const res = await fetch(`/api/products/${productId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (res.ok) {
      toast.success('Producto eliminado');
      load();
    } else {
      toast.error('Error al eliminar el producto');
    }
  }

  return (
    <div className="card p-4 space-y-4">
      <h2 className="text-xl font-semibold">{t.products}</h2>
      
      {isAdmin && (
        <form onSubmit={add} className="grid md:grid-cols-5 gap-3 items-end p-3 bg-gray-50 rounded-lg">
          <div className="md:col-span-2">
            <label className="label">{t.name}</label>
            <input className="input" value={name} onChange={e=>setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">SKU</label>
            <input className="input" value={sku} onChange={e=>setSku(e.target.value)} />
          </div>
          <div>
            <label className="label">{t.price}</label>
            <input className="input" type="number" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary h-10">{t.add}</button>
        </form>
      )}
      {!isAdmin && <div className="text-sm text-red-700 bg-red-100 p-3 rounded-lg">Inicia sesión como administrador (PIN) para gestionar productos.</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">{t.name}</th>
              <th className="p-3">SKU</th>
              <th className="p-3">{t.price}</th>
              {isAdmin && <th className="p-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id} className="border-b">
                <td className="p-3">{p.id}</td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-gray-500">{p.sku || 'N/A'}</td>
                <td className="p-3">${(p.price_cents / 100).toFixed(2)}</td>
                {isAdmin && (
                  <td className="p-3 flex justify-end gap-2">
                    <button onClick={() => editProduct(p)} className="btn p-2"><Edit size={16} /></button>
                    <button onClick={() => deleteProduct(p.id)} className="btn p-2 hover:bg-red-100"><Trash2 size={16} className="text-red-600"/></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
