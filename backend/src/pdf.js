import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';

export function generateSalePDF({ sale, items, settings, docType = 'ticket' }) {
  const doc = new PDFDocument({ size: 'LETTER', margin: 36 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const brandName = settings.brand_name || process.env.BRAND_NAME || 'Your Store';
  const brandAddress = settings.brand_address || process.env.BRAND_ADDRESS || '';
  const brandPhone = settings.brand_phone || process.env.BRAND_PHONE || '';
  const brandTaxId = settings.brand_taxid || process.env.BRAND_TAXID || '';

  doc.fontSize(18).text(brandName, { align: 'left' });
  doc.fontSize(10).text(brandAddress);
  doc.text(`Phone: ${brandPhone}    Tax ID: ${brandTaxId}`);
  doc.moveDown(0.5);
  doc.fontSize(12).text(`${docType === 'quote' ? 'QUOTE' : docType === 'delivery' ? 'DELIVERY NOTE' : 'SALE TICKET'}  #${sale.id}`);
  doc.text(`Date: ${dayjs(sale.created_at).format('MM/DD/YYYY hh:mm A')}`);
  doc.text(`Seller: ${sale.seller_name || '—'}`);
  if (sale.customer_name) doc.text(`Customer: ${sale.customer_name}`);

  doc.moveDown();
  doc.fontSize(10);
  doc.text('Qty  Description                       Price      Disc      Line', { continued: false });
  doc.moveTo(doc.x, doc.y).lineTo(560, doc.y).stroke();

  items.forEach(it => {
    const line = `${String(it.qty).padEnd(3)}  ${String(it.product_name).padEnd(30)}  ${(it.price_cents/100).toFixed(2).padStart(8)}  ${(it.discount_cents/100).toFixed(2).padStart(8)}  ${(it.line_total_cents/100).toFixed(2).padStart(8)}`;
    doc.text(line);
  });

  doc.moveDown();
  doc.text(`Subtotal: $${(sale.subtotal_cents/100).toFixed(2)}`, { align: 'right' });
  if (sale.discount_total_cents) doc.text(`Discounts: -$${(sale.discount_total_cents/100).toFixed(2)}`, { align: 'right' });
  doc.text(`Tax (${sale.tax_rate}%): $${(sale.tax_cents/100).toFixed(2)}`, { align: 'right' });
  doc.fontSize(12).text(`TOTAL: $${(sale.total_cents/100).toFixed(2)}`, { align: 'right' });
  doc.fontSize(10).text(`Payment: ${sale.payment_method || '—'}`, { align: 'right' });

  doc.end();
  return done;
}
