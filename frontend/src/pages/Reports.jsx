import React, { useEffect, useState } from 'react';

export default function Reports({ t }){
  const [data, setData] = useState({ today_total:0, by_method:[] });

  useEffect(()=>{
    fetch('/api/reports/summary')
      .then(r=>r.json())
      .then(setData)
      .catch(()=> setData({ today_total:0, by_method:[] }));
  },[]);

  return (
    <div>
      <h2>{t.reports}</h2>
      <h3>Hoy</h3>
      <div>Total: ${Number(data.today_total||0).toFixed(2)}</div>
      <ul>
        {(data.by_method||[]).map((m,i)=> (
          <li key={i}>
            {m.method}: ${Number(m.total||0).toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
}
