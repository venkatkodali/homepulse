import React, { useRef, useState } from 'react';
import {
  X,
  Download,
  Upload,
  RefreshCw,
  FileText,
  CheckCircle2,
  FileDown,
  FileCode,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  Database,
  Check,
  Info,
  Calendar,
  Layers,
  FolderDown,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { CategoryInfo, CurrencyConfig, Subscription, Transaction } from '../../types';
import { exportTransactionsToCSV, downloadFile, formatCurrency } from '../../utils/formatters';
import { generateMonthlyReportPDF } from '../../utils/monthlyReportGenerator';
import { parseCSVToTransactions, generateSampleCSV } from '../../utils/csvParser';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: CategoryInfo[];
  subscriptions: Subscription[];
  currency: CurrencyConfig;
  onImportTransactions: (imported: Transaction[], replace?: boolean) => void;
  onResetDemoData: () => void;
  onClearAllData?: (options?: { clearAllEntities?: boolean }) => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  categories,
  subscriptions,
  currency,
  onImportTransactions,
  onResetDemoData,
  onClearAllData,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');

  // CSV Import State
  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stagedFileName, setStagedFileName] = useState<string | null>(null);
  const [stagedFileSize, setStagedFileSize] = useState<number>(0);
  const [stagedTransactions, setStagedTransactions] = useState<Transaction[] | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);

  // Clear All Data Confirmation State
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearAllEntities, setClearAllEntities] = useState(true);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Notification helper
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  // Reset staged import
  const handleClearStaged = () => {
    setStagedFileName(null);
    setStagedFileSize(0);
    setStagedTransactions(null);
    setParseWarnings([]);
    if (csvInputRef.current) csvInputRef.current.value = '';
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  // Clear all data handler
  const handleExecuteClearData = () => {
    if (onClearAllData) {
      onClearAllData({ clearAllEntities });
    }
    setShowClearConfirm(false);
    showSuccess(
      clearAllEntities
        ? 'All transactions, subscriptions, recurring bills, and debts have been cleared. Ready for your own data!'
        : 'All transactions cleared from local storage. Ready for your own data!'
    );
  };

  // Process raw CSV string
  const processCSVContent = (content: string, fileName: string, size: number) => {
    try {
      const result = parseCSVToTransactions(content, categories);

      if (!result.success || result.transactions.length === 0) {
        showError(
          result.errors.length > 0
            ? result.errors.join('. ')
            : 'No valid transactions found in this CSV file. Please check format.'
        );
        handleClearStaged();
        return;
      }

      setStagedFileName(fileName);
      setStagedFileSize(size);
      setStagedTransactions(result.transactions);
      setParseWarnings(result.warnings);
      setErrorMessage(null);
    } catch (err) {
      console.error('CSV Parsing error:', err);
      showError('Failed to parse CSV file. Ensure it is encoded in UTF-8.');
      handleClearStaged();
    }
  };

  // Handle file selection from <input type="file" />
  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      showError('Please select a valid .csv file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCSVContent(text, file.name, file.size);
    };
    reader.onerror = () => {
      showError('Error reading uploaded CSV file.');
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processCSVContent(text, file.name, file.size);
      };
      reader.readAsText(file);
    } else if (file.name.toLowerCase().endsWith('.json')) {
      handleJSONFileProcess(file);
    } else {
      showError('Unsupported file type. Please upload a .csv transaction file.');
    }
  };

  // JSON backup upload fallback
  const handleJSONFileProcess = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStagedFileName(file.name);
          setStagedFileSize(file.size);
          setStagedTransactions(parsed as Transaction[]);
          setParseWarnings([]);
          setErrorMessage(null);
        } else {
          showError('JSON file does not contain a valid transaction array.');
        }
      } catch (err) {
        showError('Invalid JSON structure.');
      }
    };
    reader.readAsText(file);
  };

  const handleJSONInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleJSONFileProcess(file);
  };

  // Confirm import into application state
  const handleConfirmImport = () => {
    if (!stagedTransactions || stagedTransactions.length === 0) return;

    onImportTransactions(stagedTransactions, importMode === 'replace');

    const actionText = importMode === 'replace' ? 'replaced ledger with' : 'appended';
    showSuccess(
      `Successfully ${actionText} ${stagedTransactions.length} transactions from "${stagedFileName}"`
    );

    handleClearStaged();
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const templateCSV = generateSampleCSV();
    downloadFile(templateCSV, 'homepulse_transaction_template.csv', 'text/csv');
    showSuccess('Downloaded standard CSV template');
  };

  // Export handlers
  const handleExportPDF = () => {
    try {
      generateMonthlyReportPDF(transactions, categories, subscriptions, currency);
      showSuccess('Generated and downloaded Monthly Summary PDF report');
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
      showError('Unable to generate PDF report. Please verify transaction data.');
    }
  };

  const handleExportCSV = () => {
    const csvContent = exportTransactionsToCSV(transactions);
    downloadFile(
      csvContent,
      `homepulse_transactions_${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv'
    );
    showSuccess(`Exported ${transactions.length} transactions to CSV`);
  };

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify(transactions, null, 2);
    downloadFile(
      jsonContent,
      `homepulse_backup_${new Date().toISOString().slice(0, 10)}.json`,
      'application/json'
    );
    showSuccess('Exported database backup to JSON');
  };

  // Calculations for staged transactions preview
  const stagedExpenseTotal =
    stagedTransactions?.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;
  const stagedIncomeTotal =
    stagedTransactions?.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#071026] p-1 shadow-xs ring-1 ring-slate-800">
              <img
                src="/assets/aistudio/image_806b5b1b.png"
                alt="HomePulse Logo"
                className="h-full w-auto object-contain"
              />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Data Management & CSV Import
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Import CSV bank statements or export records & financial reports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mt-4 flex border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'import'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Import CSV Transactions</span>
            {stagedTransactions && (
              <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                {stagedTransactions.length} staged
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'export'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Download className="h-4 w-4" />
            <span>Export & Reports</span>
            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
              ({transactions.length} rows)
            </span>
          </button>
        </div>

        {/* Global Notifications */}
        {successMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: CSV IMPORT */}
        {activeTab === 'import' && (
          <div className="mt-4 space-y-4">
            {/* Clean slate prompt banner if demo data exists */}
            {transactions.length > 0 && !stagedTransactions && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/90 bg-amber-50/70 p-3 text-xs dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-amber-950 dark:text-amber-100">
                      Starting fresh with your personal data?
                    </div>
                    <div className="text-[11px] text-amber-800 dark:text-amber-300">
                      HomePulse currently has <strong className="font-mono">{transactions.length}</strong> sample records. You can wipe them to an empty slate before importing.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-2xs transition hover:bg-rose-50 dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-slate-800"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Clear All Data</span>
                </button>
              </div>
            )}

            {!stagedTransactions ? (
              <>
                {/* Drag & Drop File Upload Input Container */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/70 dark:border-blue-400 dark:bg-blue-950/40'
                      : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600'
                  }`}
                >
                  {/* Real Hidden File Upload Input */}
                  <input
                    id="csv-file-upload-input"
                    type="file"
                    ref={csvInputRef}
                    onChange={handleCSVFileChange}
                    accept=".csv,text/csv"
                    className="sr-only"
                  />

                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
                    <Upload className="h-6 w-6" />
                  </div>

                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Upload Transactions CSV
                  </h4>
                  <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                    Drag and drop your spreadsheet or bank export file here, or browse from your device.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => csvInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Select CSV File</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-500" />
                      <span>Sample Template (.csv)</span>
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                    <Info className="h-3 w-3" />
                    <span>Supports HomePulse exports and standard bank statements (Date, Amount, Description)</span>
                  </div>
                </div>

                {/* CSV Format Reference Accordion / Callout */}
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between font-medium text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-blue-500" />
                      Supported Column Headers
                    </span>
                    <span className="text-[11px] text-slate-400">RFC 4180 / Auto-mapped</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    Expected columns include <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[10px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">Date</code> (YYYY-MM-DD), <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[10px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">Title / Description</code>, <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[10px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">Amount</code>, and optional <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[10px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">Category</code>, <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[10px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">Type</code>, and <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[10px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">Merchant</code>.
                  </p>

                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400">Have an existing JSON backup?</span>
                    <input
                      type="file"
                      ref={jsonInputRef}
                      onChange={handleJSONInputChange}
                      accept=".json"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => jsonInputRef.current?.click()}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      Upload JSON Backup instead
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Staged Preview Section */
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {stagedFileName}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                          ({(stagedFileSize / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        Ready to import <strong className="font-mono text-blue-700 dark:text-blue-300">{stagedTransactions.length}</strong> transactions into application state.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearStaged}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      title="Clear file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    <div className="rounded-lg bg-white/80 p-2 border border-blue-100 dark:border-blue-900/40 dark:bg-slate-900/70">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total Rows</span>
                      <div className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                        {stagedTransactions.length}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/80 p-2 border border-rose-100 dark:border-rose-950/40 dark:bg-slate-900/70">
                      <span className="text-[10px] uppercase font-bold text-rose-500">Expenses Sum</span>
                      <div className="font-mono text-sm font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                        {formatCurrency(stagedExpenseTotal, currency)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/80 p-2 border border-emerald-100 dark:border-emerald-950/40 dark:bg-slate-900/70">
                      <span className="text-[10px] uppercase font-bold text-emerald-600">Income Sum</span>
                      <div className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatCurrency(stagedIncomeTotal, currency)}
                      </div>
                    </div>
                  </div>

                  {/* Warnings if any rows skipped */}
                  {parseWarnings.length > 0 && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        {parseWarnings.map((w, i) => (
                          <div key={i}>{w}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview Table (First 4 rows) */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    <span>Transaction Preview (First {Math.min(stagedTransactions.length, 4)} entries)</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      Showing sample from CSV
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Title</th>
                          <th className="px-3 py-2">Category</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                        {stagedTransactions.slice(0, 4).map((tx, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="px-3 py-2 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {tx.date}
                            </td>
                            <td className="px-3 py-2 font-medium truncate max-w-[150px]">
                              {tx.title}
                            </td>
                            <td className="px-3 py-2">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300 capitalize">
                                {tx.category}
                              </span>
                            </td>
                            <td className={`px-3 py-2 font-mono text-right font-medium tabular-nums ${
                              tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                            }`}>
                              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Import Mode Selection */}
                <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Import Behavior:
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label
                      onClick={() => setImportMode('append')}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition ${
                        importMode === 'append'
                          ? 'border-blue-500 bg-blue-50/50 dark:border-blue-500/80 dark:bg-blue-950/40'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="mt-0.5 text-blue-600"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          Append Records (Recommended)
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Adds {stagedTransactions.length} entries to your {transactions.length} existing transactions.
                        </div>
                      </div>
                    </label>

                    <label
                      onClick={() => setImportMode('replace')}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition ${
                        importMode === 'replace'
                          ? 'border-rose-500 bg-rose-50/50 dark:border-rose-500/80 dark:bg-rose-950/40'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="mt-0.5 text-rose-600"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          Replace Ledger
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Overwrites all current entries with only this CSV's records.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleClearStaged}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Select Different File
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
                  >
                    <Check className="h-4 w-4" />
                    <span>Import {stagedTransactions.length} Transactions</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EXPORT & REPORTS */}
        {activeTab === 'export' && (
          <div className="mt-4 space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Financial Reports & Statements
              </h4>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Export comprehensive summaries and structured data formats.
              </p>

              <div className="mt-3 space-y-2">
                {/* Summary PDF Report */}
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="flex w-full items-center justify-between rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-xs font-medium text-rose-950 transition hover:border-rose-300 hover:bg-rose-100/70 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100 dark:hover:bg-rose-900/50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-600 text-white">
                      <FileDown className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        Monthly Summary PDF Report (.pdf)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Executive financial statement with cash flow, categories, and subscription audit
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                    PDF Document
                  </span>
                </button>

                {/* Download CSV File */}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex w-full items-center justify-between rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-xs font-medium text-blue-950 transition hover:border-blue-300 hover:bg-blue-100/70 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100 dark:hover:bg-blue-900/50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white">
                      <Download className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        Export Ledger to CSV (.csv)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Export all {transactions.length} rows compatible with Excel, Google Sheets, and Numbers
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] font-semibold text-blue-700 dark:text-blue-300 tabular-nums">
                    {transactions.length} rows
                  </span>
                </button>

                {/* Complete Project Source Code (.zip) */}
                <a
                  href="/api/download/codebase"
                  download="homepulse-codebase.zip"
                  className="flex w-full items-center justify-between rounded-lg border border-purple-200 bg-purple-50/60 p-3 text-xs font-medium text-purple-950 transition hover:border-purple-300 hover:bg-purple-100/70 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-100 dark:hover:bg-purple-900/50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-600 text-white">
                      <FolderDown className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        Download Entire Source Code (.zip)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Complete codebase with React, Tailwind, SQLite backend, and Git history
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 rounded bg-purple-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                    ZIP Archive
                  </span>
                </a>

                {/* SQLite Binary Download */}
                <a
                  href="/api/sqlite/export/db"
                  download
                  className="flex w-full items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 text-xs font-medium text-emerald-900 transition hover:bg-emerald-100/60 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-mono text-white">
                      SQL
                    </div>
                    <span>Download SQLite Database (.sqlite)</span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                    Binary DB
                  </span>
                </a>

                {/* SQL Dump Script */}
                <a
                  href="/api/sqlite/export/sql"
                  download
                  className="flex w-full items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50/50 p-2.5 text-xs font-medium text-indigo-900 transition hover:bg-indigo-100/60 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-200 dark:hover:bg-indigo-900/40"
                >
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Download SQL Dump Script (.sql)</span>
                  </div>
                  <span className="font-mono text-[11px] text-indigo-700 dark:text-indigo-300">
                    DDL + DML
                  </span>
                </a>

                {/* JSON Backup */}
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <span>Download JSON Backup (.json)</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Raw structure</span>
                </button>
              </div>
            </div>

            {/* Data Reset & Clean Slate Management */}
            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Reset & Clean Slate Management
              </h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Reset your application local storage state to an empty slate for your personal data, or restore the sample demo dataset.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {/* Clear All Data Button */}
                <div className="flex flex-col justify-between rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 transition dark:border-rose-900/50 dark:bg-rose-950/20">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-600 text-white">
                        <Trash2 className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-semibold text-rose-950 dark:text-rose-100 text-xs">
                        Clear All Data (Clean Slate)
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-rose-800/80 dark:text-rose-300/80">
                      Wipes all transactions from local storage so you can start tracking with your own records from $0.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-700 active:scale-[0.98]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear All Data</span>
                  </button>
                </div>

                {/* Reset to Sample Ledger Button */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 transition dark:border-slate-800 dark:bg-slate-800/30">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        Restore Sample Dataset
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                      Reload the rich pre-configured household demo ledger, recurring bills, and savings goals.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          'Restore demo dataset? Any custom data will be replaced by the default sample dataset.'
                        )
                      ) {
                        onResetDemoData();
                        showSuccess('Restored sample household dataset successfully');
                      }
                    }}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 active:scale-[0.98]"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Reset to Sample Ledger</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <Database className="h-3.5 w-3.5" />
            <span>Application State & SQLite Storage</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Done
          </button>
        </div>

        {/* Clear All Data Confirmation Modal Overlay */}
        {showClearConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-slate-900/80 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-xl border border-rose-200 bg-white p-5 shadow-2xl dark:border-rose-900/60 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Clear All Data & Start Fresh?
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Reset local storage to an empty slate
                  </p>
                </div>
              </div>

              <div className="mt-3.5 rounded-lg bg-rose-50/70 p-3 text-xs text-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                <p className="leading-relaxed">
                  This will remove all <strong className="font-mono font-bold">{transactions.length}</strong> transactions from your local storage and database.
                </p>
              </div>

              {/* Entity clearing option */}
              <div className="mt-3 space-y-2 rounded-lg border border-slate-200/80 p-3 text-xs dark:border-slate-800">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearAllEntities}
                    onChange={(e) => setClearAllEntities(e.target.checked)}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div className="text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">Also clear sample subscriptions, debts & recurring bills</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Check this to get a clean slate across all tabs. Standard budget categories (Groceries, Housing, etc.) will be preserved for your new transactions.
                    </p>
                  </div>
                </label>
              </div>

              <p className="mt-2.5 text-[11px] text-slate-400 dark:text-slate-500">
                Tip: You can export a JSON or CSV backup first, or click &ldquo;Restore Sample Dataset&rdquo; at any time.
              </p>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteClearData}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 active:scale-[0.98]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Yes, Clear All Data</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
