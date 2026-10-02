import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initDatabase } from './server/db.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize database schema and initial data
initDatabase();

const app = express();
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ==========================================
// REST API ROUTES
// ==========================================

// 1. Database Health & Status
app.get('/api/database/status', (req, res) => {
  try {
    const prodCount = (db.prepare('SELECT count(*) as count FROM products').get() as { count: number }).count;
    const userCount = (db.prepare('SELECT count(*) as count FROM users').get() as { count: number }).count;
    const trxCount = (db.prepare('SELECT count(*) as count FROM transactions').get() as { count: number }).count;
    const expCount = (db.prepare('SELECT count(*) as count FROM expenses').get() as { count: number }).count;

    res.json({
      status: 'connected',
      engine: 'SQLite Relational Database (node:sqlite)',
      databaseFile: 'data/haypop.sqlite',
      isPersistent: true,
      counts: {
        products: prodCount,
        users: userCount,
        transactions: trxCount,
        expenses: expCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

// 2. Products API
app.get('/api/products', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM products ORDER BY category, name').all() as any[];
    const products = rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      price: Number(r.price),
      stock: Number(r.stock),
      unit: r.unit,
      image: r.image,
      description: r.description,
      modifierGroups: r.modifier_groups ? JSON.parse(r.modifier_groups) : [],
      isAvailable: Boolean(r.is_available),
      updatedAt: r.updated_at,
    }));
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const p = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO products (id, name, category, price, stock, unit, image, description, modifier_groups, is_available, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      p.id || 'prod-' + Date.now(),
      p.name,
      p.category,
      p.price,
      p.stock,
      p.unit,
      p.image,
      p.description,
      p.modifierGroups ? JSON.stringify(p.modifierGroups) : null,
      p.isAvailable ? 1 : 0,
      new Date().toISOString()
    );

    res.json({ success: true, id: p.id });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const id = req.params.id;
    const p = req.body;
    const stmt = db.prepare(`
      UPDATE products SET
        name = ?,
        category = ?,
        price = ?,
        stock = ?,
        unit = ?,
        image = ?,
        description = ?,
        modifier_groups = ?,
        is_available = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      p.name,
      p.category,
      p.price,
      p.stock,
      p.unit,
      p.image,
      p.description,
      p.modifierGroups ? JSON.stringify(p.modifierGroups) : null,
      p.isAvailable ? 1 : 0,
      new Date().toISOString(),
      id
    );

    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 3. Users API
app.get('/api/users', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM users ORDER BY role, name').all() as any[];
    const users = rows.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      pin: u.pin,
      role: u.role,
      avatarColor: u.avatar_color,
      isActive: Boolean(u.is_active),
      createdAt: u.created_at,
    }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/users', (req, res) => {
  try {
    const u = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO users (id, name, username, pin, role, avatar_color, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      u.id || 'usr-' + Date.now(),
      u.name,
      u.username,
      u.pin,
      u.role,
      u.avatarColor,
      u.isActive ? 1 : 0,
      u.createdAt || new Date().toISOString()
    );

    res.json({ success: true, id: u.id });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/users/:id', (req, res) => {
  try {
    const id = req.params.id;
    const u = req.body;
    const stmt = db.prepare(`
      UPDATE users SET
        name = ?,
        username = ?,
        pin = ?,
        role = ?,
        avatar_color = ?,
        is_active = ?
      WHERE id = ?
    `);

    stmt.run(u.name, u.username, u.pin, u.role, u.avatarColor, u.isActive ? 1 : 0, id);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/users/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 4. Transactions API (Atomic insert + stock reduction)
app.get('/api/transactions', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM transactions ORDER BY timestamp DESC').all() as any[];
    const trxs = rows.map((t) => ({
      id: t.id,
      invoiceNumber: t.invoice_number,
      cashierId: t.cashier_id,
      cashierName: t.cashier_name,
      timestamp: t.timestamp,
      items: JSON.parse(t.items),
      subtotal: Number(t.subtotal),
      discount: Number(t.discount),
      tax: Number(t.tax),
      totalAmount: Number(t.total_amount),
      paymentMethod: t.payment_method,
      amountPaid: Number(t.amount_paid),
      change: Number(t.change),
      customer: t.customer ? JSON.parse(t.customer) : undefined,
      isSynced: Boolean(t.is_synced),
      syncTimestamp: t.sync_timestamp,
    }));
    res.json(trxs);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/transactions', (req, res) => {
  try {
    const t = req.body;

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO transactions (
        id, invoice_number, cashier_id, cashier_name, timestamp, items,
        subtotal, discount, tax, total_amount, payment_method, amount_paid, change, customer, is_synced, sync_timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      t.id || 'trx-' + Date.now(),
      t.invoiceNumber,
      t.cashierId,
      t.cashierName,
      t.timestamp || new Date().toISOString(),
      JSON.stringify(t.items),
      t.subtotal,
      t.discount || 0,
      t.tax || 0,
      t.totalAmount,
      t.paymentMethod,
      t.amountPaid,
      t.change || 0,
      t.customer ? JSON.stringify(t.customer) : null,
      1,
      new Date().toISOString()
    );

    // Atomically decrement stock
    if (Array.isArray(t.items)) {
      const updateStock = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?');
      for (const item of t.items) {
        if (item.productId && item.quantity > 0) {
          updateStock.run(item.quantity, item.productId);
        }
      }
    }

    res.json({ success: true, id: t.id });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 5. Batch Offline Sync Endpoint
app.post('/api/sync', (req, res) => {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: 'transactions array is required' });
    }

    const checkExisting = db.prepare('SELECT id FROM transactions WHERE id = ?');
    const insertStmt = db.prepare(`
      INSERT INTO transactions (
        id, invoice_number, cashier_id, cashier_name, timestamp, items,
        subtotal, discount, tax, total_amount, payment_method, amount_paid, change, customer, is_synced, sync_timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateStock = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?');

    let syncedCount = 0;

    for (const t of transactions) {
      const existing = checkExisting.get(t.id);
      if (!existing) {
        insertStmt.run(
          t.id,
          t.invoiceNumber,
          t.cashierId,
          t.cashierName,
          t.timestamp,
          JSON.stringify(t.items),
          t.subtotal,
          t.discount || 0,
          t.tax || 0,
          t.totalAmount,
          t.paymentMethod,
          t.amountPaid,
          t.change || 0,
          t.customer ? JSON.stringify(t.customer) : null,
          1,
          new Date().toISOString()
        );

        if (Array.isArray(t.items)) {
          for (const item of t.items) {
            if (item.productId && item.quantity > 0) {
              updateStock.run(item.quantity, item.productId);
            }
          }
        }
        syncedCount++;
      }
    }

    res.json({ success: true, syncedCount });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 6. Expenses API
app.get('/api/expenses', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC, timestamp DESC').all() as any[];
    const expenses = rows.map((e) => ({
      id: e.id,
      date: e.date,
      category: e.category,
      categoryLabel: e.category_label,
      amount: Number(e.amount),
      description: e.description,
      recordedBy: e.recorded_by,
      timestamp: e.timestamp,
    }));
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/expenses', (req, res) => {
  try {
    const e = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO expenses (id, date, category, category_label, amount, description, recorded_by, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      e.id || 'exp-' + Date.now(),
      e.date,
      e.category,
      e.categoryLabel,
      e.amount,
      e.description,
      e.recordedBy || 'Admin',
      e.timestamp || new Date().toISOString()
    );

    res.json({ success: true, id: e.id });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/expenses/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 7. Store Settings API
app.get('/api/settings', (req, res) => {
  try {
    const row = db.prepare('SELECT value FROM key_value_store WHERE key = ?').get('store_settings') as any;
    if (row && row.value) {
      res.json(JSON.parse(row.value));
    } else {
      res.json({});
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO key_value_store (key, value, updated_at) VALUES (?, ?, ?)');
    stmt.run('store_settings', JSON.stringify(req.body), new Date().toISOString());
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 8. Payment Settings API
app.get('/api/payment-settings', (req, res) => {
  try {
    const row = db.prepare('SELECT value FROM key_value_store WHERE key = ?').get('payment_settings') as any;
    if (row && row.value) {
      res.json(JSON.parse(row.value));
    } else {
      res.json({});
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/payment-settings', (req, res) => {
  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO key_value_store (key, value, updated_at) VALUES (?, ?, ?)');
    stmt.run('payment_settings', JSON.stringify(req.body), new Date().toISOString());
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 9. Full Database Backup & Restore
app.get('/api/database/backup', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products').all();
    const users = db.prepare('SELECT * FROM users').all();
    const transactions = db.prepare('SELECT * FROM transactions').all();
    const expenses = db.prepare('SELECT * FROM expenses').all();
    const kv = db.prepare('SELECT * FROM key_value_store').all();

    res.json({
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: { products, users, transactions, expenses, kv },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==========================================
// VITE / STATIC SERVING
// ==========================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const port = process.env.PORT || 3000;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Serve transformed index.html for any SPA routes
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return next();
      }
      try {
        const fs = await import('fs');
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`[HAYPOP Server] Running at http://0.0.0.0:${port} with SQLite database persistent storage.`);
  });
}

startServer();
