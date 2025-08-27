import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import archiver from 'archiver';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import { z } from 'zod';

import db, { DB_PATH } from './db.js';
import { generateSalePDF } from './pdf.js';
import { scheduleBackups } from './backup.js';

const log = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false }));

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        log.info({ m: req.method, u: req.originalUrl, s: res.statusCode, ms: Date.now() - start }, 'req');
    });
    next();
});

const upload = multer({ dest: '/tmp' });
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

function cents(n) { return Math.round(Number(n || 0) * 100); }
function dollars(c) { return (c / 100).toFixed(2); }

function adminOnly(req, res, next) {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'no_token' });
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
        req.user = payload;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'invalid_token' });
    }
}

function validate(schema) {
    return (req, res, next) => {
        const data = req.method === 'GET' ? req.query : req.body;
        const parsed = schema.safeParse(data);
        if (!parsed.success) {
            return res.status(400).json({ error: 'validation_error', details: parsed.error.flatten() });
        }
        if (req.method === 'GET') req.query = parsed.data;
        else req.body = parsed.data;
        next();
    };
}

app.get('/api/health', (_, res) => res.json({ ok: true }));

// Settings
app.get('/api/settings', (_, res) => {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const out = {};
    rows.forEach(r => out[r.key] = r.value);
    res.json(out);
});
const settingsSchema = z.object({
    tax_rate: z.union([z.string(), z.number()]).optional(),
    brand_name: z.string().max(200).optional(),
    brand_address: z.string().max(400).optional(),
    brand_phone: z.string().max(50).optional(),
    brand_taxid: z.string().max(100).optional()
});
app.post('/api/settings', adminOnly, validate(settingsSchema), (req, res) => {
    const allowed = ['tax_rate', 'brand_name', 'brand_address', 'brand_phone', 'brand_taxid'];
    const tx = db.transaction((obj) => {
        for (const k of allowed) {
            if (obj[k] !== undefined) {
                db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, String(obj[k]));
            }
        }
    });
    tx(req.body);
    res.json({ ok: true });
});

// Auth
const loginLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
app.post('/api/auth/admin-login', loginLimiter, validate(z.object({ pin: z.string().min(1) })), (req, res) => {
    const { pin } = req.body;
    if (pin === String(process.env.ADMIN_PIN || '1092')) {
        const token = jwt.sign({ role: 'admin', iat: Math.floor(Date.now() / 1000) }, JWT_SECRET, { expiresIn: '10h' });
        return res.json({ token, role: 'admin' });
    }
    return res.status(401).json({ error: 'invalid_pin' });
});

// Products
app.get('/api/products', (req, res) => {
    const rows = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
    res.json(rows);
});
app.get('/api/products/search', (req, res) => {
    const { q = '' } = req.query;
    if (q.length < 2) return res.json([]);
    const rows = db.prepare('SELECT id, name, sku, price_cents FROM products WHERE name LIKE ? ORDER BY name LIMIT 10').all(`%${q}%`);
    res.json(rows);
});
const productSchema = z.object({ name: z.string().min(1).max(200), price: z.number().nonnegative(), sku: z.string().max(100).optional().nullable() });
app.post('/api/products', adminOnly, validate(productSchema), (req, res) => {
    const { name, price, sku } = req.body;
    const info = db.prepare('INSERT INTO products(name,sku,price_cents) VALUES(?,?,?)')
        .run(name, sku || null, cents(price));
    res.json({ id: info.lastInsertRowid });
});
app.put('/api/products/:id', adminOnly, validate(productSchema), (req, res) => {
    const { name, price, sku } = req.body;
    db.prepare('UPDATE products SET name=?, sku=?, price_cents=? WHERE id=?')
        .run(name, sku || null, cents(price), req.params.id);
    res.json({ ok: true });
});
app.delete('/api/products/:id', adminOnly, (req, res) => {
    db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
    res.json({ ok: true });
});

// Customers
app.get('/api/customers', (req, res) => {
    const rows = db.prepare('SELECT * FROM customers ORDER BY id DESC').all();
    res.json(rows);
});
const customerSchema = z.object({
    name: z.string().min(1).max(200),
    phone: z.string().max(50).optional().nullable(),
    email: z.string().email().optional().nullable(),
    address: z.string().max(300).optional().nullable(),
    notes: z.string().max(500).optional().nullable()
});
app.post('/api/customers', validate(customerSchema), (req, res) => {
    const { name, phone, email, address, notes } = req.body;
    const info = db.prepare('INSERT INTO customers(name,phone,email,address,notes) VALUES(?,?,?,?,?)')
        .run(name, phone || null, email || null, address || null, notes || null);
    res.json({ id: info.lastInsertRowid });
});

// Helpers
function getSettings() {
    const rows = db.prepare('SELECT key,value FROM settings').all();
    const s = {};
    rows.forEach(r => s[r.key] = r.value);
    return s;
}

// Sales
const saleItemSchema = z.object({ name: z.string().min(1).max(200), sku: z.string().max(100).optional().nullable(), price: z.number().nonnegative(), discount: z.number().min(0).optional().default(0), qty: z.number().int().positive().max(1000) });
const newCustomerSchema = z.object({ name: z.string().min(1), phone: z.string().optional().nullable(), address: z.string().optional().nullable() });
const saleSchema = z.object({
    status: z.enum(['paid', 'layaway', 'quote']).optional().default('paid'),
    customer_id: z.number().int().positive().optional().nullable(),
    new_customer: newCustomerSchema.optional().nullable(),
    seller_name: z.string().max(200).optional().nullable(),
    payment_method: z.string().max(50).optional().nullable(),
    payment_details: z.string().max(200).optional().nullable(),
    discount_total: z.number().min(0).optional().default(0),
    items: z.array(saleItemSchema).min(1),
    note: z.string().max(1000).optional().nullable()
});
app.post('/api/sales', validate(saleSchema), (req, res) => {
    const body = req.body;
    let customer_id = body.customer_id || null;
    const settings = getSettings();
    const tax_rate = Number(settings.tax_rate || process.env.TAX_RATE || 8.25);

    const tx = db.transaction(() => {
        if (body.new_customer && body.new_customer.name) {
            const info = db.prepare('INSERT INTO customers(name,phone,address) VALUES(?,?,?)')
                .run(body.new_customer.name, body.new_customer.phone || null, body.new_customer.address || null);
            customer_id = info.lastInsertRowid;
        }

        let subtotal_cents = 0;
        body.items.forEach(it => {
            const price_c = cents(it.price);
            const disc_c = cents(it.discount || 0);
            const qty = it.qty;
            const line = Math.max(0, (price_c - disc_c)) * qty;
            it._computed = { price_c, disc_c, qty, line };
            subtotal_cents += line;
        });

        const discTotal = Math.min(subtotal_cents, cents(body.discount_total || 0));
        const taxable_base = Math.max(0, subtotal_cents - discTotal);
        const tax_cents = Math.round(taxable_base * (tax_rate / 100));
        const total_cents = taxable_base + tax_cents;

        const saleInfo = db.prepare(`
          INSERT INTO sales(status,customer_id,seller_name,subtotal_cents,discount_total_cents,tax_rate,tax_cents,total_cents,payment_method,payment_details,note)
          VALUES(?,?,?,?,?,?,?,?,?,?,?)
        `).run(body.status, customer_id, body.seller_name, subtotal_cents, discTotal, tax_rate, tax_cents, total_cents, body.payment_method, body.payment_details, body.note);
        const sale_id = saleInfo.lastInsertRowid;

        const insItem = db.prepare(`INSERT INTO sale_items(sale_id,product_name,sku,qty,price_cents,discount_cents,line_total_cents) VALUES(?,?,?,?,?,?,?)`);
        for (const it of body.items) {
            insItem.run(sale_id, it.name, it.sku || null, it._computed.qty, it._computed.price_c, it._computed.disc_c, it._computed.line);
        }

        if (body.status === 'paid' && total_cents > 0) {
            db.prepare(`INSERT INTO payments(sale_id,method,amount_cents) VALUES(?,?,?)`).run(sale_id, body.payment_method, total_cents);
        }

        return { sale_id, total_cents, tax_cents };
    });

    const { sale_id, total_cents, tax_cents } = tx();
    res.json({ id: sale_id, total: dollars(total_cents), tax: dollars(tax_cents) });
});


app.get('/api/sales', (req, res) => {
    const rows = db.prepare(`
      SELECT s.*, c.name as customer_name
      FROM sales s LEFT JOIN customers c ON c.id=s.customer_id
      ORDER BY s.id DESC
      LIMIT 200
    `).all();
    res.json(rows);
});

app.get('/api/sales/:id', (req, res) => {
    const sale = db.prepare(`SELECT s.*, c.name as customer_name
                             FROM sales s LEFT JOIN customers c ON c.id=s.customer_id
                             WHERE s.id=?`).get(req.params.id);
    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id=?').all(req.params.id);
    res.json({ sale, items });
});

app.get('/api/sales/:id/pdf', async (req, res) => {
    const { doc = 'ticket' } = req.query;
    const sale = db.prepare(`SELECT s.*, c.name as customer_name
                             FROM sales s LEFT JOIN customers c ON c.id=s.customer_id
                             WHERE s.id=?`).get(req.params.id);
    if (!sale) return res.status(404).send('Not found');
    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id=?').all(req.params.id);
    const settings = getSettings();

    const pdf = await generateSalePDF({ sale, items, settings, docType: String(doc) });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="sale-${sale.id}.pdf"`);
    res.send(pdf);
});

// Reports
app.get('/api/reports/summary', (req, res) => {
    const today = dayjs().format('YYYY-MM-DD');
    const totalsToday = db.prepare(`
      SELECT IFNULL(SUM(total_cents),0) as total_cents
      FROM sales
      WHERE DATE(created_at)=DATE(?)
        AND status='paid'
    `).get(today);

    const byMethod = db.prepare(`
      SELECT payment_method, IFNULL(SUM(total_cents),0) as total_cents
      FROM sales
      WHERE DATE(created_at)=DATE(?)
        AND status='paid'
      GROUP BY payment_method
    `).all(today);

    res.json({
        today_total: Number(totalsToday.total_cents) / 100,
        by_method: byMethod.map(r => ({ method: r.payment_method || '—', total: Number(r.total_cents) / 100 }))
    });
});

// Export & Import
app.get('/api/export/db', adminOnly, (req, res) => res.download(DB_PATH, 'pos.db'));
// ... (resto de las rutas de exportación e importación sin cambios)

app.get('/', (_, res) => res.json({ ok: true, service: 'epfs-pos-api' }));
scheduleBackups();
app.use((err, req, res, next) => {
    log.error({ err }, 'unhandled_error');
    res.status(500).json({ error: 'internal_error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => log.info(`API on :${PORT}`));
