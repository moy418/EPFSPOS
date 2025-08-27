import React, { useRef } from 'react';
import { toast } from 'sonner';

export default function ExportPage({ t, adminToken }){
  const dbRef = useRef(); const seedRef = useRef();

  function dlDb(){
    if(!adminToken) return toast.error('Admin requerido');
    window.location.href = '/api/export/db';
  }
  function dlCsv(){
    if(!adminToken) return toast.error('Admin requerido');
    window.location.href = '/api/export/csv';
  }

  async function importDb(e){
    e.preventDefault();
    if(!adminToken) return toast.error('Admin requerido');
    const f = dbRef.current.files[0];
    if(!f) return toast.warning('Selecciona un archivo .db');
    const fd = new FormData(); fd.append('dbfile', f);
    const r = await fetch('/api/import/db', { method:'POST', headers: { 'Authorization': `Bearer ${adminToken}` }, body: fd });
    if (r.ok) {
      toast.success('Importado con éxito (DB reemplazada). La aplicación se recargará.');
      setTimeout(() => window.location.reload(), 2000);
    } else {
      toast.error('Error importando la base de datos.');
    }
  }

  async function importSeed(e){
    e.preventDefault();
    if(!adminToken) return toast.error('Admin requerido');
    const f = seedRef.current.files[0];
    if(!f) return toast.warning('Selecciona un archivo .json');
    const fd = new FormData(); fd.append('seedfile', f);
    const r = await fetch('/api/import/seed', { method:'POST', headers: { 'Authorization': `Bearer ${adminToken}` }, body: fd });
    if (r.ok) {
      toast.success('Seed importado con éxito.');
    } else {
      toast.error('Error importando el seed.');
    }
  }

  return (
    <div className="card p-4 space-y-6">
      <h2 className="text-xl font-semibold">{t.export}</h2>
      
      <div className="space-y-2">
        <h3 className="font-semibold">Exportar Datos</h3>
        <div className="flex gap-4">
          <button onClick={dlDb} className="btn">Descargar DB (.db)</button>
          <button onClick={dlCsv} className="btn">Descargar CSV (zip)</button>
        </div>
      </div>
      
      <hr/>
      
      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={importDb} className="space-y-2">
          <h3 className="font-semibold">Importar DB (.db)</h3>
          <p className="text-sm text-gray-600">Esto reemplazará la base de datos actual. Se creará un backup automático.</p>
          <input type="file" ref={dbRef} accept=".db" className="input"/>
          <button type="submit" className="btn btn-primary">Importar DB</button>
        </form>

        <form onSubmit={importSeed} className="space-y-2">
          <h3 className="font-semibold">Importar Seed (.json)</h3>
          <p className="text-sm text-gray-600">Añade productos o clientes desde un archivo JSON.</p>
          <input type="file" ref={seedRef} accept="application/json,.json" className="input"/>
          <button type="submit" className="btn btn-primary">Importar Seed</button>
        </form>
      </div>
    </div>
  );
}
