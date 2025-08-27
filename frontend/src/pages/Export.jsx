import React, { useRef } from 'react';

export default function ExportPage({ t, adminToken }){
  const dbRef = useRef(); const seedRef = useRef();

  function dlDb(){
    if(!adminToken) return alert('Admin requerido');
    window.location.href = '/api/export/db';
  }
  function dlCsv(){
    if(!adminToken) return alert('Admin requerido');
    window.location.href = '/api/export/csv';
  }

  async function importDb(e){
    e.preventDefault();
    if(!adminToken) return alert('Admin requerido');
    const f = dbRef.current.files[0];
    if(!f) return alert('Selecciona un archivo .db');
    const fd = new FormData(); fd.append('dbfile', f);
    const r = await fetch('/api/import/db', { method:'POST', headers: { 'Authorization': `Bearer ${adminToken}` }, body: fd });
    alert(r.ok ? 'Importado (DB reemplazada)' : 'Error importando DB');
  }

  async function importSeed(e){
    e.preventDefault();
    if(!adminToken) return alert('Admin requerido');
    const f = seedRef.current.files[0];
    if(!f) return alert('Selecciona un archivo .json');
    const fd = new FormData(); fd.append('seedfile', f);
    const r = await fetch('/api/import/seed', { method:'POST', headers: { 'Authorization': `Bearer ${adminToken}` }, body: fd });
    alert(r.ok ? 'Seed importado' : 'Error importando seed');
  }

  return (
    <div>
      <h2>{t.export}</h2>
      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        <button onClick={dlDb}>Descargar DB (.db)</button>
        <button onClick={dlCsv}>Descargar CSV (zip)</button>
      </div>
      <hr/>
      <form onSubmit={importDb}>
        <h3>Importar DB (.db)</h3>
        <input type="file" ref={dbRef} accept=".db"/>
        <button type="submit">Importar DB</button>
      </form>
      <form onSubmit={importSeed}>
        <h3>Importar Seed (.json)</h3>
        <input type="file" ref={seedRef} accept="application/json,.json"/>
        <button type="submit">Importar Seed</button>
      </form>
    </div>
  );
}
