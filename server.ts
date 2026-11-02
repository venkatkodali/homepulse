import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
  db,
  DB_PATH,
  getDatabaseStatus,
  getDatabaseSchema,
  executeCustomQuery,
  generateSqlDump,
  syncAllData,
  fetchAllData,
  initSchema,
} from './server/db';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_DEBTS,
  DEFAULT_RECURRING_TRANSACTIONS,
  DEFAULT_SAVINGS_GOALS,
  DEFAULT_SUBSCRIPTIONS,
  INITIAL_TRANSACTIONS,
} from './src/data/initialData';
import { suggestCategoryWithGemini } from './server/gemini';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '50mb' }));

// Ensure database is initialized and seeded if empty
initSchema();
const initialStatus = getDatabaseStatus();
if (initialStatus.totalRows === 0) {
  console.log('SQLite database is empty, seeding initial financial data...');
  syncAllData({
    categories: DEFAULT_CATEGORIES,
    transactions: INITIAL_TRANSACTIONS,
    subscriptions: DEFAULT_SUBSCRIPTIONS,
    debts: DEFAULT_DEBTS,
    recurringTransactions: DEFAULT_RECURRING_TRANSACTIONS,
    savingsGoals: DEFAULT_SAVINGS_GOALS,
  });
  console.log('SQLite database seeded successfully.');
}

// -------------------------------------------------------------
// 1. SQLite Engine & Health APIs
// -------------------------------------------------------------

app.get('/api/sqlite/status', (req, res) => {
  try {
    const status = getDatabaseStatus();
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/sqlite/schema', (req, res) => {
  try {
    const schema = getDatabaseSchema();
    res.json({ success: true, schema });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sqlite/query', (req, res) => {
  try {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ success: false, error: 'SQL query string is required' });
    }
    const result = executeCustomQuery(sql);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/sqlite/history', (req, res) => {
  try {
    const history = db.prepare(`
      SELECT id, query, executed_at, duration_ms, row_count, success
      FROM sql_query_history
      ORDER BY id DESC
      LIMIT 25
    `).all();
    res.json({ success: true, history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/sqlite/export/db', (req, res) => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return res.status(404).send('Database file not found');
    }
    res.download(DB_PATH, `homepulse_${new Date().toISOString().slice(0, 10)}.sqlite`);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

app.get('/api/sqlite/export/sql', (req, res) => {
  try {
    const dump = generateSqlDump();
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="homepulse_dump_${new Date().toISOString().slice(0, 10)}.sql"`);
    res.send(dump);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/download/codebase', (req, res) => {
  try {
    const zipBuffer = execSync('git archive --format=zip main', { cwd: __dirname });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="homepulse-codebase.zip"');
    res.send(zipBuffer);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to archive codebase' });
  }
});

app.post('/api/sqlite/import/sql', (req, res) => {
  try {
    const { sqlScript } = req.body;
    if (!sqlScript || typeof sqlScript !== 'string') {
      return res.status(400).json({ success: false, error: 'SQL script content is required' });
    }
    db.exec(sqlScript);
    const status = getDatabaseStatus();
    res.json({ success: true, message: 'SQL script executed successfully', status });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/sqlite/reset', (req, res) => {
  try {
    syncAllData({
      categories: DEFAULT_CATEGORIES,
      transactions: INITIAL_TRANSACTIONS,
      subscriptions: DEFAULT_SUBSCRIPTIONS,
      debts: DEFAULT_DEBTS,
      recurringTransactions: DEFAULT_RECURRING_TRANSACTIONS,
      savingsGoals: DEFAULT_SAVINGS_GOALS,
    });
    const status = getDatabaseStatus();
    res.json({ success: true, message: 'Database reset to default template', status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sqlite/clear', (req, res) => {
  try {
    const { clearEntities = true } = req.body || {};
    syncAllData({
      categories: DEFAULT_CATEGORIES,
      transactions: [],
      subscriptions: clearEntities ? [] : undefined,
      debts: clearEntities ? [] : undefined,
      recurringTransactions: clearEntities ? [] : undefined,
      savingsGoals: clearEntities ? [] : undefined,
    });
    const status = getDatabaseStatus();
    res.json({ success: true, message: 'Database transactions and records cleared', status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 2. Data Persistence & Synchronization APIs
// -------------------------------------------------------------

app.get('/api/data', (req, res) => {
  try {
    const data = fetchAllData();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sync', (req, res) => {
  try {
    const { transactions, categories, subscriptions, debts, recurringTransactions, savingsGoals } = req.body;
    const status = syncAllData({
      transactions,
      categories,
      subscriptions,
      debts,
      recurringTransactions,
      savingsGoals,
    });
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 3. Gemini AI Smart Category Suggester APIs
// -------------------------------------------------------------

const handleCategorySuggestion = async (req: express.Request, res: express.Response) => {
  try {
    const { merchant, description, transactionType, amount, categories } = req.body;
    const effectiveCategories =
      Array.isArray(categories) && categories.length > 0
        ? categories
        : DEFAULT_CATEGORIES.map((c) => ({ id: c.id, name: c.name }));

    const suggestion = await suggestCategoryWithGemini({
      merchant: typeof merchant === 'string' ? merchant : '',
      description: typeof description === 'string' ? description : '',
      transactionType: transactionType === 'income' ? 'income' : 'expense',
      amount: typeof amount === 'number' ? amount : undefined,
      categories: effectiveCategories,
    });

    res.json({
      success: true,
      ...suggestion,
    });
  } catch (err: any) {
    console.error('Category suggestion error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to suggest category',
      suggestedCategoryId: 'other',
      suggestedCategoryName: 'Miscellaneous',
      confidence: 0.5,
      reasoning: 'Fallback due to server error.',
      alternativeCategoryIds: [],
      source: 'heuristic',
    });
  }
};

app.post('/api/gemini/suggest-category', handleCategorySuggestion);
app.post('/api/suggest-category', handleCategorySuggestion);

// -------------------------------------------------------------
// 4. Vite Middleware (Dev) or Static Assets (Prod)
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: HOST,
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`[HomePulse] Server with SQLite running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
