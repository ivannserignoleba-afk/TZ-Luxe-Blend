import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 3001;
const JWT_SECRET = 'tzluxe-secret-key';

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'tzluxe.db');
const db = new sqlite3.Database(dbPath);

const ensureTables = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        tag TEXT,
        description TEXT,
        image TEXT,
        featured INTEGER DEFAULT 0
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_name TEXT,
        customer_phone TEXT,
        customer_email TEXT,
        city TEXT,
        address TEXT,
        delivery TEXT,
        items TEXT,
        total INTEGER,
        status TEXT,
        created_at TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT
      )
    `);

    const defaultUsername = 'admin';
    const defaultPasswordHash = bcrypt.hashSync('TZLUXE2026', 10);
    db.get('SELECT * FROM users WHERE username = ?', [defaultUsername], (err, row) => {
      if (err) return;
      if (!row) {
        db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [defaultUsername, defaultPasswordHash]);
      }
    });
  });
};

const productsSeed = [
  { id: 'instant-cleanse', name: 'TZ LUXE Instant Cleanse', price: 12000, tag: 'Spray', description: 'Nettoyage rapide sans rinçage', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80', featured: 1 },
  { id: 'beginner-bundle', name: 'Beginner Starter Kit', price: 24000, tag: 'Beginner', description: 'Essential Brush Set + Simple Case + Mini Cleaner', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80', featured: 1 },
  { id: 'pro-bundle', name: 'Pro Artist Starter Kit', price: 49000, tag: 'Pro', description: 'Full Brush Set + Brush Cleaner Machine + Extra Face Brushes', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80', featured: 1 },
  { id: 'travel-kit', name: 'Travel Glam Kit', price: 36000, tag: 'Travel', description: 'Compact Brush Set + LED mirror case', image: 'https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=900&q=80', featured: 0 },
  { id: 'complexion-set', name: 'Complexion Perfection Set', price: 18000, tag: 'Mini Set', description: 'Foundation + Concealer + Powder + Blending Brush', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80', featured: 0 },
  { id: 'eye-set', name: 'Soft Glam Eye Set', price: 16000, tag: 'Mini Set', description: 'À utiliser pour les yeux et les finitions', image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=900&q=80', featured: 0 },
];

const seedProducts = () => {
  db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
    if (!err && row && row.count === 0) {
      const stmt = db.prepare('INSERT INTO products (id, name, price, tag, description, image, featured) VALUES (?, ?, ?, ?, ?, ?, ?)');
      productsSeed.forEach((product) => {
        stmt.run(product.id, product.name, product.price, product.tag, product.description, product.image, product.featured);
      });
      stmt.finalize();
    }
  });
};

ensureTables();
seedProducts();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

app.get('/api/health', (_, res) => {
  res.json({ ok: true, message: 'TZ LUXE API is running' });
});

app.get('/api/products', (_, res) => {
  db.all('SELECT * FROM products ORDER BY featured DESC, name ASC', (err, rows) => {
    if (err) return res.status(500).json({ message: 'Erreur DB produits' });
    res.json(rows);
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: 'Identifiants requis' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token, user: { username: user.username } });
  });
});

app.get('/api/orders', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Non autorisé' });
  }

  try {
    jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'Token invalide' });
  }

  db.all('SELECT * FROM orders ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ message: 'Erreur DB commandes' });
    res.json(rows.map(row => ({
      ...row,
      items: JSON.parse(row.items || '[]')
    })));
  });
});

app.post('/api/orders', (req, res) => {
  const payload = req.body || {};
  const { customer, items, total } = payload;

  if (!customer || !items || !items.length) {
    return res.status(400).json({ message: 'Commande invalide' });
  }

  const orderId = `TZ-${Date.now()}`;
  const now = new Date().toISOString();
  const orderRow = {
    id: orderId,
    customer_name: customer.fullName || '',
    customer_phone: customer.phone || '',
    customer_email: customer.email || '',
    city: customer.city || '',
    address: customer.address || '',
    delivery: customer.delivery || 'Livraison locale',
    items: JSON.stringify(items),
    total: Number(total) || 0,
    status: 'Nouveau',
    created_at: now,
  };

  db.run(`
    INSERT INTO orders (id, customer_name, customer_phone, customer_email, city, address, delivery, items, total, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [orderRow.id, orderRow.customer_name, orderRow.customer_phone, orderRow.customer_email, orderRow.city, orderRow.address, orderRow.delivery, orderRow.items, orderRow.total, orderRow.status, orderRow.created_at], (err) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur création commande' });
    }
    res.status(201).json({ message: 'Commande enregistrée', orderId: orderRow.id });
  });
});

app.put('/api/orders/:id/status', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ message: 'Non autorisé' });

  try { jwt.verify(token, JWT_SECRET); } catch {
    return res.status(401).json({ message: 'Token invalide' });
  }

  const { status } = req.body || {};
  const { id } = req.params;

  if (!status) return res.status(400).json({ message: 'Statut requis' });

  db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id], (err) => {
    if (err) return res.status(500).json({ message: 'Erreur de mise à jour' });
    res.json({ message: 'Statut mis à jour', id });
  });
});

app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`TZ LUXE server running on http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.warn(`Port ${PORT} is already in use; continuing with the active server instance.`);
    return;
  }
  throw error;
});
