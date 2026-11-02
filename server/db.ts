import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store database file in project root data/homepulse.sqlite
const DATA_DIR = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const DB_PATH = path.join(DATA_DIR, 'homepulse.sqlite');

// Initialize better-sqlite3 database
export const db = new Database(DB_PATH);

// Enable high performance WAL mode and foreign key constraints
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

/**
 * Initialize all SQLite tables if they do not exist
 */
export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      monthly_budget REAL NOT NULL,
      icon_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
      amount REAL NOT NULL,
      title TEXT NOT NULL,
      merchant TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      notes TEXT,
      tags TEXT,
      is_recurring INTEGER DEFAULT 0,
      recurring_interval TEXT,
      receipt_name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      billing_cycle TEXT NOT NULL CHECK(billing_cycle IN ('monthly', 'yearly')),
      next_billing_date TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      lender TEXT NOT NULL,
      balance REAL NOT NULL,
      original_amount REAL NOT NULL,
      interest_rate REAL NOT NULL,
      min_payment REAL NOT NULL,
      due_date TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
      category TEXT NOT NULL,
      frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')),
      day_of_month INTEGER,
      start_date TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL,
      target_date TEXT NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sql_query_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      executed_at TEXT DEFAULT (datetime('now')),
      duration_ms REAL,
      row_count INTEGER,
      success INTEGER
    );
  `);
}

/**
 * Return general SQLite status and statistics
 */
export function getDatabaseStatus() {
  const versionRow = db.prepare('SELECT sqlite_version() as version').get() as { version: string };
  const journalModeRow = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };

  let fileSize = 0;
  try {
    if (fs.existsSync(DB_PATH)) {
      const stats = fs.statSync(DB_PATH);
      fileSize = stats.size;
    }
  } catch (e) {
    // Ignore error
  }

  const tables = ['transactions', 'categories', 'subscriptions', 'debts', 'recurring_transactions', 'savings_goals'];
  const tableStats: Record<string, number> = {};
  let totalRows = 0;

  for (const table of tables) {
    try {
      const row = db.prepare(`SELECT count(*) as count FROM ${table}`).get() as { count: number };
      tableStats[table] = row.count;
      totalRows += row.count;
    } catch {
      tableStats[table] = 0;
    }
  }

  return {
    engine: 'SQLite 3',
    version: versionRow.version,
    journalMode: journalModeRow.journal_mode,
    path: DB_PATH,
    fileSizeBytes: fileSize,
    fileSizeFormatted: `${(fileSize / 1024).toFixed(1)} KB`,
    tableStats,
    totalRows,
    tablesCount: tables.length,
  };
}

/**
 * Return schema information for all user tables
 */
export function getDatabaseSchema() {
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all() as { name: string }[];

  const schemaInfo: Array<{
    tableName: string;
    rowCount: number;
    columns: Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;
    sql: string;
  }> = [];

  for (const { name } of tables) {
    const columns = db.prepare(`PRAGMA table_info("${name}")`).all() as any[];
    const countRow = db.prepare(`SELECT count(*) as count FROM "${name}"`).get() as { count: number };
    const masterRow = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(name) as { sql: string };

    schemaInfo.push({
      tableName: name,
      rowCount: countRow ? countRow.count : 0,
      columns,
      sql: masterRow ? masterRow.sql : '',
    });
  }

  return schemaInfo;
}

/**
 * Execute custom SQL query safely with timing
 */
export function executeCustomQuery(sqlQuery: string) {
  const trimmed = sqlQuery.trim();
  if (!trimmed) {
    throw new Error('Query cannot be empty');
  }

  const startTime = performance.now();
  const isSelect = /^(SELECT|PRAGMA|EXPLAIN|WITH)/i.test(trimmed);

  try {
    let resultRows: any[] = [];
    let changes = 0;

    if (isSelect) {
      const stmt = db.prepare(trimmed);
      resultRows = stmt.all();
    } else {
      // Could be multi-statement DDL or DML
      if (trimmed.includes(';')) {
        db.exec(trimmed);
        changes = 1;
      } else {
        const stmt = db.prepare(trimmed);
        const info = stmt.run();
        changes = info.changes;
      }
    }

    const durationMs = performance.now() - startTime;
    const columns = resultRows.length > 0 ? Object.keys(resultRows[0]) : [];

    // Log query history
    try {
      db.prepare(`
        INSERT INTO sql_query_history (query, duration_ms, row_count, success)
        VALUES (?, ?, ?, 1)
      `).run(trimmed.slice(0, 500), durationMs, resultRows.length || changes);
    } catch {
      // non-fatal
    }

    return {
      success: true,
      query: trimmed,
      isSelect,
      columns,
      rows: resultRows,
      rowCount: resultRows.length,
      affectedRows: changes,
      durationMs: parseFloat(durationMs.toFixed(2)),
    };
  } catch (error: any) {
    const durationMs = performance.now() - startTime;
    try {
      db.prepare(`
        INSERT INTO sql_query_history (query, duration_ms, row_count, success)
        VALUES (?, ?, 0, 0)
      `).run(trimmed.slice(0, 500), durationMs);
    } catch {
      // non-fatal
    }
    throw error;
  }
}

/**
 * Generate full SQL dump script for backup / portability
 */
export function generateSqlDump(): string {
  const dumpLines: string[] = [
    `-- HomePulse SQLite Database Dump`,
    `-- Generated: ${new Date().toISOString()}`,
    `PRAGMA foreign_keys=OFF;`,
    `BEGIN TRANSACTION;`,
    '',
  ];

  const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string; sql: string }[];

  for (const { name, sql } of tables) {
    dumpLines.push(`-- Table: ${name}`);
    dumpLines.push(`DROP TABLE IF EXISTS "${name}";`);
    dumpLines.push(`${sql};`);

    const rows = db.prepare(`SELECT * FROM "${name}"`).all() as any[];
    for (const row of rows) {
      const cols = Object.keys(row).map((c) => `"${c}"`).join(', ');
      const vals = Object.values(row).map((v) => {
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number') return v;
        return `'${String(v).replace(/'/g, "''")}'`;
      }).join(', ');

      dumpLines.push(`INSERT INTO "${name}" (${cols}) VALUES (${vals});`);
    }
    dumpLines.push('');
  }

  dumpLines.push('COMMIT;');
  return dumpLines.join('\n');
}

/**
 * Full sync: write all application collections into SQLite inside one atomic transaction
 */
export function syncAllData(data: {
  transactions?: any[];
  categories?: any[];
  subscriptions?: any[];
  debts?: any[];
  recurringTransactions?: any[];
  savingsGoals?: any[];
}) {
  const syncTx = db.transaction(() => {
    if (Array.isArray(data.categories)) {
      db.prepare('DELETE FROM categories').run();
      const insertCat = db.prepare(`
        INSERT INTO categories (id, name, color, monthly_budget, icon_name)
        VALUES (@id, @name, @color, @monthlyBudget, @iconName)
      `);
      for (const cat of data.categories) {
        insertCat.run(cat);
      }
    }

    if (Array.isArray(data.subscriptions)) {
      db.prepare('DELETE FROM subscriptions').run();
      const insertSub = db.prepare(`
        INSERT INTO subscriptions (id, name, amount, category, billing_cycle, next_billing_date, active, notes)
        VALUES (@id, @name, @amount, @category, @billingCycle, @nextBillingDate, @active, @notes)
      `);
      for (const sub of data.subscriptions) {
        insertSub.run({
          id: sub.id,
          name: sub.name,
          amount: sub.amount,
          category: sub.category,
          billingCycle: sub.billingCycle,
          nextBillingDate: sub.nextBillingDate,
          active: sub.active ? 1 : 0,
          notes: sub.notes || null,
        });
      }
    }

    if (Array.isArray(data.debts)) {
      db.prepare('DELETE FROM debts').run();
      const insertDebt = db.prepare(`
        INSERT INTO debts (id, name, type, lender, balance, original_amount, interest_rate, min_payment, due_date, notes)
        VALUES (@id, @name, @type, @lender, @balance, @originalAmount, @interestRate, @minPayment, @dueDate, @notes)
      `);
      for (const d of data.debts) {
        insertDebt.run({
          id: d.id,
          name: d.name,
          type: d.type,
          lender: d.lender,
          balance: d.balance,
          originalAmount: d.originalAmount,
          interestRate: d.interestRate,
          minPayment: d.minPayment,
          dueDate: d.dueDate,
          notes: d.notes || null,
        });
      }
    }

    if (Array.isArray(data.recurringTransactions)) {
      db.prepare('DELETE FROM recurring_transactions').run();
      const insertRec = db.prepare(`
        INSERT INTO recurring_transactions (id, name, amount, type, category, frequency, day_of_month, start_date, active, notes)
        VALUES (@id, @name, @amount, @type, @category, @frequency, @dayOfMonth, @startDate, @active, @notes)
      `);
      for (const r of data.recurringTransactions) {
        insertRec.run({
          id: r.id,
          name: r.name,
          amount: r.amount,
          type: r.type,
          category: r.category,
          frequency: r.frequency,
          dayOfMonth: r.dayOfMonth ?? null,
          startDate: r.startDate,
          active: r.active ? 1 : 0,
          notes: r.notes || null,
        });
      }
    }

    if (Array.isArray(data.savingsGoals)) {
      db.prepare('DELETE FROM savings_goals').run();
      const insertGoal = db.prepare(`
        INSERT INTO savings_goals (id, name, target_amount, current_amount, target_date, color)
        VALUES (@id, @name, @targetAmount, @currentAmount, @targetDate, @color)
      `);
      for (const g of data.savingsGoals) {
        insertGoal.run({
          id: g.id,
          name: g.name,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          targetDate: g.targetDate,
          color: g.color,
        });
      }
    }

    if (Array.isArray(data.transactions)) {
      db.prepare('DELETE FROM transactions').run();
      const insertTx = db.prepare(`
        INSERT INTO transactions (id, type, amount, title, merchant, category, subcategory, date, payment_method, notes, tags, is_recurring, recurring_interval, receipt_name)
        VALUES (@id, @type, @amount, @title, @merchant, @category, @subcategory, @date, @paymentMethod, @notes, @tags, @isRecurring, @recurringInterval, @receiptName)
      `);
      for (const t of data.transactions) {
        insertTx.run({
          id: t.id,
          type: t.type,
          amount: t.amount,
          title: t.title,
          merchant: t.merchant,
          category: t.category,
          subcategory: t.subcategory || null,
          date: t.date,
          paymentMethod: t.paymentMethod,
          notes: t.notes || null,
          tags: JSON.stringify(t.tags || []),
          isRecurring: t.isRecurring ? 1 : 0,
          recurringInterval: t.recurringInterval || null,
          receiptName: t.receiptName || null,
        });
      }
    }
  });

  syncTx();
  return getDatabaseStatus();
}

/**
 * Retrieve all domain entities from SQLite database
 */
export function fetchAllData() {
  const rawCategories = db.prepare('SELECT * FROM categories').all() as any[];
  const categories = rawCategories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    monthlyBudget: c.monthly_budget,
    iconName: c.icon_name,
  }));

  const rawTransactions = db.prepare('SELECT * FROM transactions ORDER BY date DESC, created_at DESC').all() as any[];
  const transactions = rawTransactions.map((t) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    title: t.title,
    merchant: t.merchant,
    category: t.category,
    subcategory: t.subcategory || undefined,
    date: t.date,
    paymentMethod: t.payment_method,
    notes: t.notes || undefined,
    tags: t.tags ? JSON.parse(t.tags) : [],
    isRecurring: Boolean(t.is_recurring),
    recurringInterval: t.recurring_interval || undefined,
    receiptName: t.receipt_name || undefined,
  }));

  const rawSubscriptions = db.prepare('SELECT * FROM subscriptions ORDER BY next_billing_date ASC').all() as any[];
  const subscriptions = rawSubscriptions.map((s) => ({
    id: s.id,
    name: s.name,
    amount: s.amount,
    category: s.category,
    billingCycle: s.billing_cycle,
    nextBillingDate: s.next_billing_date,
    active: Boolean(s.active),
    notes: s.notes || undefined,
  }));

  const rawDebts = db.prepare('SELECT * FROM debts ORDER BY balance DESC').all() as any[];
  const debts = rawDebts.map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    lender: d.lender,
    balance: d.balance,
    originalAmount: d.original_amount,
    interestRate: d.interest_rate,
    minPayment: d.min_payment,
    dueDate: d.due_date,
    notes: d.notes || undefined,
  }));

  const rawRecurring = db.prepare('SELECT * FROM recurring_transactions ORDER BY active DESC, amount DESC').all() as any[];
  const recurringTransactions = rawRecurring.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
    type: r.type,
    category: r.category,
    frequency: r.frequency,
    dayOfMonth: r.day_of_month || undefined,
    startDate: r.start_date,
    active: Boolean(r.active),
    notes: r.notes || undefined,
  }));

  const rawGoals = db.prepare('SELECT * FROM savings_goals').all() as any[];
  const savingsGoals = rawGoals.map((g) => ({
    id: g.id,
    name: g.name,
    targetAmount: g.target_amount,
    currentAmount: g.current_amount,
    targetDate: g.target_date,
    color: g.color,
  }));

  return {
    transactions,
    categories,
    subscriptions,
    debts,
    recurringTransactions,
    savingsGoals,
  };
}

// Initialize tables on startup
initSchema();
