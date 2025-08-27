import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { Printer, Edit } from 'lucide-react';

export default function SalesHistory({ t, adminToken }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadSales() {
    try {
      setLoading(true);
      const res = await fetch('/api/sales');
      if (!res.ok) throw new Error('Failed to fetch sales');
      setSales(await res.json());
    } catch (err) {
      toast.error('No se pudo cargar el historial de ventas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSales();
  }, []);

  function reprint(saleId) {
    window.open(`/api/sales/${saleId}/pdf?doc=ticket`, '_blank');
  }
  
  function editSale(saleId) {
    // La edición completa es compleja. Por ahora, solo mostraremos un mensaje.
    // Esto se puede ampliar en el futuro.
    toast.info(`Función de editar para la venta #${saleId} aún no implementada.`);
  }

  if (loading) return <div>Cargando historial...</div>;

  return (
    <div className="card p-4 space-y-4">
      <h2 className="text-xl font-semibold">Historial de Ventas</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3">Nota #</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Vendedor</th>
              <th className="p-3">Total</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(s => (
              <tr key={s.id} className="border-b">
                <td className="p-3 font-medium">#{s.id}</td>
                <td className="p-3">{dayjs(s.created_at).format('MM/DD/YYYY hh:mm A')}</td>
                <td className="p-3">{s.customer_name || 'Genérico'}</td>
                <td className="p-3">{s.seller_name || '-'}</td>
                <td className="p-3 font-semibold">${(s.total_cents / 100).toFixed(2)}</td>
                <td className="p-3"><span className="badge">{s.status}</span></td>
                <td className="p-3 flex justify-end gap-2">
                  <button onClick={() => reprint(s.id)} title="Reimprimir Nota" className="btn p-2"><Printer size={16} /></button>
                  {adminToken && <button onClick={() => editSale(s.id)} title="Editar Nota" className="btn p-2"><Edit size={16} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
