import React, { useState, useEffect } from 'react';
import {
  Database,
  Play,
  RotateCcw,
  Download,
  Upload,
  RefreshCw,
  Clock,
  Table,
  CheckCircle2,
  AlertCircle,
  FileCode,
  HardDrive,
  Cpu,
  Layers,
  Search,
  ExternalLink,
  Copy,
} from 'lucide-react';
import {
  SqliteQueryResult,
  SqliteStatus,
  SqliteTableSchema,
  SqlQueryHistoryItem,
  CategoryInfo,
  CurrencyConfig,
  DebtItem,
  RecurringTransaction,
  SavingsGoal,
  Subscription,
  Transaction,
} from '../../types';

interface SqliteViewProps {
  transactions: Transaction[];
  categories: CategoryInfo[];
  subscriptions: Subscription[];
  debts: DebtItem[];
  recurringTransactions: RecurringTransaction[];
  savingsGoals: SavingsGoal[];
  currency: CurrencyConfig;
  onRefreshDataFromDb: () => Promise<void>;
  onSyncLocalStateToDb: () => Promise<void>;
}

const PRESET_QUERIES = [
  {
    name: 'Top Expense Categories',
    description: 'Aggregates spending and transaction volume by category',
    sql: `SELECT 
  category, 
  round(sum(amount), 2) as total_spent, 
  count(*) as tx_count,
  round(avg(amount), 2) as avg_amount
FROM transactions 
WHERE type = 'expense' 
GROUP BY category 
ORDER BY total_spent DESC;`,
  },
  {
    name: 'Monthly Cash Flow Summary',
    description: 'Income vs Expense totals grouped by calendar month',
    sql: `SELECT 
  strftime('%Y-%m', date) as month, 
  type, 
  round(sum(amount), 2) as total, 
  count(*) as count 
FROM transactions 
GROUP BY month, type 
ORDER BY month DESC, type ASC;`,
  },
  {
    name: 'Debt Avalanche Priority',
    description: 'Calculates monthly interest cost and prioritizes debts by APR',
    sql: `SELECT 
  name, 
  lender, 
  balance, 
  interest_rate as apr_percent, 
  min_payment, 
  round(balance * (interest_rate / 100.0) / 12.0, 2) as approx_monthly_interest 
FROM debts 
WHERE balance > 0 
ORDER BY interest_rate DESC;`,
  },
  {
    name: 'Active Subscriptions & Cost',
    description: 'Lists all active recurring subscriptions with next billing dates',
    sql: `SELECT 
  name, 
  amount, 
  billing_cycle, 
  category, 
  next_billing_date 
FROM subscriptions 
WHERE active = 1 
ORDER BY next_billing_date ASC;`,
  },
  {
    name: 'Recurring Salary & Fixed Inflows',
    description: 'Recurring cash flow rules and projected occurrences',
    sql: `SELECT 
  name, 
  type, 
  amount, 
  frequency, 
  day_of_month, 
  active 
FROM recurring_transactions 
ORDER BY amount DESC;`,
  },
  {
    name: 'SQLite Master Tables & Indices',
    description: 'Examines all tables, views, and indexes defined in sqlite_master',
    sql: `SELECT 
  type, 
  name, 
  tbl_name 
FROM sqlite_master 
WHERE name NOT LIKE 'sqlite_%' 
ORDER BY type, name;`,
  },
];

export const SqliteView: React.FC<SqliteViewProps> = ({
  transactions,
  categories,
  subscriptions,
  debts,
  recurringTransactions,
  savingsGoals,
  currency,
  onRefreshDataFromDb,
  onSyncLocalStateToDb,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'console' | 'schema' | 'operations'>('console');
  const [sqlInput, setSqlInput] = useState<string>(PRESET_QUERIES[0].sql);
  const [queryResult, setQueryResult] = useState<SqliteQueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  const [dbStatus, setDbStatus] = useState<SqliteStatus | null>(null);
  const [dbSchema, setDbSchema] = useState<SqliteTableSchema[]>([]);
  const [queryHistory, setQueryHistory] = useState<SqlQueryHistoryItem[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Custom SQL script for import/run
  const [importSqlScript, setImportSqlScript] = useState<string>('');
  const [isExecutingScript, setIsExecutingScript] = useState(false);

  // Fetch status and schema on load
  const loadDbInfo = async () => {
    setIsLoadingStatus(true);
    try {
      const [statusRes, schemaRes, historyRes] = await Promise.all([
        fetch('/api/sqlite/status'),
        fetch('/api/sqlite/schema'),
        fetch('/api/sqlite/history'),
      ]);

      if (statusRes.ok) {
        const sData = await statusRes.json();
        setDbStatus(sData.status);
      }
      if (schemaRes.ok) {
        const scData = await schemaRes.json();
        setDbSchema(scData.schema);
      }
      if (historyRes.ok) {
        const hData = await historyRes.json();
        setQueryHistory(hData.history || []);
      }
    } catch (err: any) {
      console.warn('Could not load SQLite status from server:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadDbInfo();
  }, []);

  const handleRunQuery = async (queryToRun?: string) => {
    const q = (queryToRun || sqlInput).trim();
    if (!q) return;

    setIsExecuting(true);
    setQueryError(null);

    try {
      const res = await fetch('/api/sqlite/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: q }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Failed to execute query');
      }

      setQueryResult(data);
      // Reload status & history in background
      loadDbInfo();

      // If mutation query (INSERT, UPDATE, DELETE), trigger state refresh
      if (!data.isSelect) {
        onRefreshDataFromDb();
      }
    } catch (err: any) {
      setQueryError(err.message || 'Execution error');
      setQueryResult(null);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunQuery();
    }
  };

  const handleSyncToDb = async () => {
    setIsSyncing(true);
    try {
      await onSyncLocalStateToDb();
      await loadDbInfo();
      setNotification({ type: 'success', message: 'Full local state synced atomically to SQLite database' });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to sync with SQLite database' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetDb = async () => {
    if (!confirm('Are you sure you want to reset SQLite tables to default seed templates?')) return;
    try {
      const res = await fetch('/api/sqlite/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await onRefreshDataFromDb();
        await loadDbInfo();
        setNotification({ type: 'success', message: 'SQLite database reset to default data' });
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to reset SQLite database' });
    }
  };

  const handleExecuteImportScript = async () => {
    if (!importSqlScript.trim()) return;
    setIsExecutingScript(true);
    try {
      const res = await fetch('/api/sqlite/import/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sqlScript: importSqlScript }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to execute SQL script');
      }
      setNotification({ type: 'success', message: 'SQL batch statements executed successfully' });
      setTimeout(() => setNotification(null), 4000);
      setImportSqlScript('');
      await onRefreshDataFromDb();
      await loadDbInfo();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsExecutingScript(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!queryResult || !queryResult.rows.length) return;
    const cols = queryResult.columns;
    const csvRows = [cols.join(',')];

    queryResult.rows.forEach((r) => {
      const row = cols.map((c) => {
        const val = r[c];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
        return val;
      });
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sqlite_query_result_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Engine Diagnostics Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  SQLite Database Studio
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Native relational SQLite engine with WAL journaling, zero-latency queries, and full schema introspection.
                </p>
              </div>
            </div>
          </div>

          {/* Quick diagnostic pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
              <Cpu className="h-3.5 w-3.5 text-blue-500" />
              <span>{dbStatus?.engine || 'SQLite 3'}</span>
              <span className="text-slate-400">({dbStatus?.version || 'v3.x'})</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>WAL Mode</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
              <HardDrive className="h-3.5 w-3.5 text-indigo-500" />
              <span>{dbStatus?.fileSizeFormatted || 'Database'}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
              <Layers className="h-3.5 w-3.5 text-amber-500" />
              <span>{dbStatus?.totalRows ?? 0} Records</span>
            </div>

            <button
              onClick={handleSyncToDb}
              disabled={isSyncing}
              title="Sync current frontend state to SQLite database"
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync to SQLite'}</span>
            </button>
          </div>
        </div>

        {/* Global notification banner */}
        {notification && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-xs font-medium ${
              notification.type === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{notification.message}</span>
          </div>
        )}
      </div>

      {/* 2. Studio Sub-navigation tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveSubTab('console')}
            className={`flex items-center gap-2 border-b-2 py-2.5 text-xs font-semibold transition-colors ${
              activeSubTab === 'console'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Play className="h-3.5 w-3.5" />
            <span>SQL Query Studio</span>
          </button>

          <button
            onClick={() => setActiveSubTab('schema')}
            className={`flex items-center gap-2 border-b-2 py-2.5 text-xs font-semibold transition-colors ${
              activeSubTab === 'schema'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Table className="h-3.5 w-3.5" />
            <span>Schema & Tables ({dbSchema.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('operations')}
            className={`flex items-center gap-2 border-b-2 py-2.5 text-xs font-semibold transition-colors ${
              activeSubTab === 'operations'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>Portability & DDL Dump</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/sqlite/export/db"
            download
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-blue-500" />
            <span>.sqlite File</span>
          </a>

          <a
            href="/api/sqlite/export/sql"
            download
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-indigo-500" />
            <span>.sql Script</span>
          </a>
        </div>
      </div>

      {/* 3. Sub-Tab 1: SQL Query Studio */}
      {activeSubTab === 'console' && (
        <div className="space-y-5">
          {/* Preset query library pills */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Financial Query Templates:
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESET_QUERIES.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSqlInput(preset.sql);
                    handleRunQuery(preset.sql);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* SQL Code Editor Area */}
          <div className="rounded-xl border border-slate-200 bg-slate-950 text-slate-100 shadow-xs overflow-hidden dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2 text-xs">
              <div className="flex items-center gap-2 text-slate-400 font-mono">
                <FileCode className="h-4 w-4 text-blue-400" />
                <span>SQL Console</span>
                <span className="text-slate-500">|</span>
                <span className="text-[11px] text-slate-500">Ctrl + Enter to execute</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSqlInput('')}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => handleRunQuery()}
                  disabled={isExecuting || !sqlInput.trim()}
                  className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1 font-semibold text-white shadow-xs hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  <Play className={`h-3.5 w-3.5 fill-current ${isExecuting ? 'animate-pulse' : ''}`} />
                  <span>{isExecuting ? 'Running...' : 'Execute SQL'}</span>
                </button>
              </div>
            </div>

            <textarea
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={6}
              spellCheck={false}
              className="w-full bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-400 placeholder-slate-600 focus:outline-hidden"
              placeholder="Enter any valid SQLite query (e.g., SELECT * FROM transactions LIMIT 20;)"
            />
          </div>

          {/* Query Error Message */}
          {queryError && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold">SQLite Query Error</div>
                <div className="font-mono">{queryError}</div>
              </div>
            </div>
          )}

          {/* Query Execution Metrics Banner */}
          {queryResult && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Execution Successful</span>
                </div>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <div className="flex items-center gap-1 font-mono text-slate-600 dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{queryResult.durationMs} ms</span>
                </div>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {queryResult.isSelect ? `${queryResult.rowCount} rows returned` : `${queryResult.affectedRows} row(s) affected`}
                </span>
              </div>

              {queryResult.rows && queryResult.rows.length > 0 && (
                <button
                  onClick={handleDownloadCsv}
                  className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <Download className="h-3 w-3" />
                  <span>Export CSV</span>
                </button>
              )}
            </div>
          )}

          {/* Results Table */}
          {queryResult && queryResult.isSelect && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
              {queryResult.rows.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  No records returned for this query.
                </div>
              ) : (
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 border-b border-slate-200 bg-slate-100 font-mono text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 text-[11px] text-slate-400 w-10">#</th>
                        {queryResult.columns.map((col) => (
                          <th key={col} className="py-2.5 px-3 font-semibold whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                      {queryResult.rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-2 px-3 text-slate-400 text-[11px]">{rIdx + 1}</td>
                          {queryResult.columns.map((col) => {
                            const val = row[col];
                            return (
                              <td
                                key={col}
                                className="py-2 px-3 text-slate-800 dark:text-slate-200 whitespace-nowrap max-w-xs truncate"
                                title={String(val)}
                              >
                                {val === null ? (
                                  <span className="italic text-slate-400">NULL</span>
                                ) : typeof val === 'number' ? (
                                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                    {val.toLocaleString()}
                                  </span>
                                ) : (
                                  String(val)
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Recent Query History Drawer */}
          {queryHistory.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Recent Query Execution Log
                </span>
                <span className="text-[11px] text-slate-400">Last 25 executions</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {queryHistory.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs dark:border-slate-800/80 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          h.success ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <code className="truncate font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {h.query}
                      </code>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[11px] text-slate-400">{h.duration_ms}ms</span>
                      <button
                        onClick={() => {
                          setSqlInput(h.query);
                          handleRunQuery(h.query);
                        }}
                        className="rounded px-1.5 py-0.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                      >
                        Re-run
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Sub-Tab 2: Schema & Tables Explorer */}
      {activeSubTab === 'schema' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dbSchema.map((t) => (
              <div
                key={t.tableName}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Table className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                        {t.tableName}
                      </h3>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {t.rowCount} rows
                    </span>
                  </div>

                  {/* Columns list */}
                  <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                    {t.columns.map((c) => (
                      <div key={c.name} className="py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-slate-800 dark:text-slate-200">{c.name}</span>
                          {c.pk === 1 && (
                            <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              PK
                            </span>
                          )}
                          {c.notnull === 1 && c.pk !== 1 && (
                            <span className="text-[9px] text-slate-400 font-sans">REQ</span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                          {c.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {t.columns.length} columns
                  </span>
                  <button
                    onClick={() => {
                      const sampleQuery = `SELECT * FROM ${t.tableName} LIMIT 50;`;
                      setSqlInput(sampleQuery);
                      setActiveSubTab('console');
                      handleRunQuery(sampleQuery);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    <span>Browse Rows</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Sub-Tab 3: Database Portability, Batch SQL & Maintenance */}
      {activeSubTab === 'operations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Download and Backup */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  SQLite Database Portability
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Download binary SQLite database files or text DDL/DML dumps to open with tools like DB Browser for SQLite, DBeaver, or command line sqlite3.
                </p>
              </div>

              <div className="space-y-2">
                <a
                  href="/api/sqlite/export/db"
                  download
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Download homepulse.sqlite
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Binary SQLite 3 database file with all tables and indices
                      </div>
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-slate-400" />
                </a>

                <a
                  href="/api/sqlite/export/sql"
                  download
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <FileCode className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Download SQL Dump Script
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Plain-text CREATE TABLE and INSERT statements
                      </div>
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-slate-400" />
                </a>
              </div>
            </div>

            {/* Danger zone / maintenance */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Maintenance & Sync Actions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Synchronize active application records or reset tables to initial demonstration seeds.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleSyncToDb}
                  disabled={isSyncing}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Writing to SQLite...' : 'Force Local State to SQLite Database'}</span>
                </button>

                <button
                  onClick={handleResetDb}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset Database to Initial Template</span>
                </button>
              </div>
            </div>
          </div>

          {/* Batch SQL Script Runner */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Execute Batch SQL Script / Migration
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Paste raw SQL statements or DDL scripts to execute multiple commands in SQLite.
                </p>
              </div>
              <button
                onClick={handleExecuteImportScript}
                disabled={isExecutingScript || !importSqlScript.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>{isExecutingScript ? 'Executing...' : 'Run SQL Script'}</span>
              </button>
            </div>

            <textarea
              value={importSqlScript}
              onChange={(e) => setImportSqlScript(e.target.value)}
              rows={5}
              placeholder="-- Paste SQL statements here...&#10;CREATE INDEX IF NOT EXISTS idx_custom ON transactions(merchant);&#10;UPDATE categories SET monthly_budget = monthly_budget * 1.05;"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-emerald-400"
            />
          </div>
        </div>
      )}
    </div>
  );
};
