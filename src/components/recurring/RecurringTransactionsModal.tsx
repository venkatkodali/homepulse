import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Trash2,
  Edit2,
  Check,
  Calendar,
  AlertCircle,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import {
  CategoryInfo,
  CurrencyConfig,
  RecurringFrequency,
  RecurringTransaction,
  Transaction,
  TransactionType,
} from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface RecurringTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurringTransactions: RecurringTransaction[];
  categories: CategoryInfo[];
  currency: CurrencyConfig;
  onAddRecurring: (item: Omit<RecurringTransaction, 'id'>) => void;
  onUpdateRecurring: (item: RecurringTransaction) => void;
  onDeleteRecurring: (id: string) => void;
  onToggleActive: (id: string) => void;
  onPostToLedger: (item: RecurringTransaction, date: string) => void;
}

export const getMonthlyEquivalent = (amount: number, frequency: RecurringFrequency): number => {
  switch (frequency) {
    case 'weekly':
      return (amount * 52) / 12;
    case 'biweekly':
      return (amount * 26) / 12;
    case 'yearly':
      return amount / 12;
    case 'monthly':
    default:
      return amount;
  }
};

export const RecurringTransactionsModal: React.FC<RecurringTransactionsModalProps> = ({
  isOpen,
  onClose,
  recurringTransactions,
  categories,
  currency,
  onAddRecurring,
  onUpdateRecurring,
  onDeleteRecurring,
  onToggleActive,
  onPostToLedger,
}) => {
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recentlyPostedId, setRecentlyPostedId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]?.id || 'housing');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [startDate, setStartDate] = useState('2026-11-01');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  // Monthly summary metrics
  const summary = useMemo(() => {
    let monthlyIncome = 0;
    let monthlyExpense = 0;

    recurringTransactions.forEach((item) => {
      if (!item.active) return;
      const equiv = getMonthlyEquivalent(item.amount, item.frequency);
      if (item.type === 'income') {
        monthlyIncome += equiv;
      } else {
        monthlyExpense += equiv;
      }
    });

    const netBaseline = monthlyIncome - monthlyExpense;

    return {
      monthlyIncome,
      monthlyExpense,
      netBaseline,
      activeCount: recurringTransactions.filter((r) => r.active).length,
    };
  }, [recurringTransactions]);

  const filteredItems = useMemo(() => {
    return recurringTransactions.filter((item) => {
      if (filterType === 'all') return true;
      return item.type === filterType;
    });
  }, [recurringTransactions, filterType]);

  const handleStartAdd = () => {
    setName('');
    setType('income');
    setAmount('');
    setCategory(categories[0]?.id || 'housing');
    setFrequency('monthly');
    setDayOfMonth(1);
    setStartDate('2026-11-01');
    setNotes('');
    setEditingId(null);
    setIsAdding(true);
  };

  const handleStartEdit = (item: RecurringTransaction) => {
    setName(item.name);
    setType(item.type);
    setAmount(item.amount.toString());
    setCategory(item.category);
    setFrequency(item.frequency);
    setDayOfMonth(item.dayOfMonth || 1);
    setStartDate(item.startDate);
    setNotes(item.notes || '');
    setEditingId(item.id);
    setIsAdding(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    if (editingId) {
      const existing = recurringTransactions.find((r) => r.id === editingId);
      if (existing) {
        onUpdateRecurring({
          ...existing,
          name: name.trim(),
          type,
          amount: parsedAmount,
          category,
          frequency,
          dayOfMonth: frequency === 'monthly' ? Number(dayOfMonth) : undefined,
          startDate,
          notes: notes.trim() || undefined,
        });
      }
    } else {
      onAddRecurring({
        name: name.trim(),
        type,
        amount: parsedAmount,
        category,
        frequency,
        dayOfMonth: frequency === 'monthly' ? Number(dayOfMonth) : undefined,
        startDate,
        active: true,
        notes: notes.trim() || undefined,
      });
    }

    setIsAdding(false);
    setEditingId(null);
  };

  const handlePostOccurrence = (item: RecurringTransaction) => {
    // Determine posting date in current active month (November 2026)
    const day = item.dayOfMonth ? String(item.dayOfMonth).padStart(2, '0') : '01';
    const date = `2026-11-${day}`;
    onPostToLedger(item, date);
    setRecentlyPostedId(item.id);
    setTimeout(() => {
      setRecentlyPostedId(null);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Recurring Transactions & Standing Rules
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define regular salaries, rent, mortgages, and bills projected into cash flow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body - Scrollable */}
        <div className="overflow-y-auto space-y-5 py-4 flex-1">
          {/* Top Metric Strip: Monthly Cash Flow Predictability */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-emerald-50/50 p-3.5 dark:border-slate-800 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between text-xs font-medium text-emerald-800 dark:text-emerald-400">
                <span>Monthly Recurring Inflow</span>
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
              <div className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums dark:text-emerald-300">
                +{formatCurrency(summary.monthlyIncome, currency)}
              </div>
              <div className="mt-0.5 text-[11px] text-emerald-600/80 dark:text-emerald-400/70">
                Guaranteed monthly base
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-rose-50/50 p-3.5 dark:border-slate-800 dark:bg-rose-950/20">
              <div className="flex items-center justify-between text-xs font-medium text-rose-800 dark:text-rose-400">
                <span>Monthly Recurring Outflow</span>
                <TrendingDown className="h-3.5 w-3.5" />
              </div>
              <div className="mt-1 font-mono text-lg font-bold text-rose-700 tabular-nums dark:text-rose-300">
                -{formatCurrency(summary.monthlyExpense, currency)}
              </div>
              <div className="mt-0.5 text-[11px] text-rose-600/80 dark:text-rose-400/70">
                Committed rent & fixed bills
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-blue-50/50 p-3.5 dark:border-slate-800 dark:bg-blue-950/20">
              <div className="flex items-center justify-between text-xs font-medium text-blue-800 dark:text-blue-400">
                <span>Net Recurring Baseline</span>
                <RefreshCw className="h-3.5 w-3.5" />
              </div>
              <div
                className={`mt-1 font-mono text-lg font-bold tabular-nums ${
                  summary.netBaseline >= 0
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {summary.netBaseline >= 0 ? '+' : ''}
                {formatCurrency(summary.netBaseline, currency)}
              </div>
              <div className="mt-0.5 text-[11px] text-blue-600/80 dark:text-blue-400/70">
                Before variable day-to-day spend
              </div>
            </div>
          </div>

          {/* Form when adding or editing */}
          {isAdding && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
              <div className="flex items-center justify-between pb-3 border-b border-blue-100 dark:border-blue-900/40">
                <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                  {editingId ? 'Edit Recurring Rule' : 'New Recurring Transaction Rule'}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSaveForm} className="mt-3 space-y-3.5">
                {/* Type Segmented Buttons */}
                <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800 max-w-xs">
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex-1 rounded-md py-1 text-xs font-semibold transition-all ${
                      type === 'income'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                    }`}
                  >
                    Income (Salary / Inflow)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 rounded-md py-1 text-xs font-semibold transition-all ${
                      type === 'expense'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                    }`}
                  >
                    Expense (Rent / Outflow)
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Rule Name / Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Monthly Salary, Apartment Rent"
                      className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Amount ({currency.symbol}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Frequency
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                      className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="biweekly">Bi-weekly (Every 2 wks)</option>
                      <option value="weekly">Weekly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      {frequency === 'monthly' ? 'Day of Month' : 'Start Date'}
                    </label>
                    {frequency === 'monthly' ? (
                      <div className="mt-1 flex items-center gap-1.5">
                        <select
                          value={dayOfMonth}
                          onChange={(e) => setDayOfMonth(Number(e.target.value))}
                          className="block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>
                              Day {d} (e.g. {d === 1 ? '1st' : d === 2 ? '2nd' : d === 3 ? '3rd' : `${d}th`})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Notes / Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Paycheck direct deposit schedule or landlord bank transfer"
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingId(null);
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                  >
                    {editingId ? 'Save Changes' : 'Create Recurring Rule'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Action & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
              <button
                onClick={() => setFilterType('all')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                All Rules ({recurringTransactions.length})
              </button>
              <button
                onClick={() => setFilterType('income')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterType === 'income'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                Incomes ({recurringTransactions.filter((r) => r.type === 'income').length})
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterType === 'expense'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                Expenses ({recurringTransactions.filter((r) => r.type === 'expense').length})
              </button>
            </div>

            {!isAdding && (
              <button
                onClick={handleStartAdd}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Recurring Rule</span>
              </button>
            )}
          </div>

          {/* Rules List */}
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white dark:divide-slate-800 dark:border-slate-800/80 dark:bg-slate-900">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No recurring rules found in this filter.
              </div>
            ) : (
              filteredItems.map((item) => {
                const cat = categories.find((c) => c.id === item.category);
                const monthlyEquiv = getMonthlyEquivalent(item.amount, item.frequency);
                const isPosted = recentlyPostedId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 transition-colors gap-3 ${
                      !item.active ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/40' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          item.type === 'income'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}
                      >
                        {item.type === 'income' ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {item.name}
                          </span>
                          {!item.active && (
                            <span className="text-[10px] font-medium text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.2">
                              Paused
                            </span>
                          )}
                        </div>

                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: cat?.color || '#94A3B8' }}
                            />
                            {cat?.name || item.category}
                          </span>
                          <span>•</span>
                          <span>
                            {item.frequency === 'monthly'
                              ? `Recurs every ${item.dayOfMonth || 1}${
                                  item.dayOfMonth === 1
                                    ? 'st'
                                    : item.dayOfMonth === 2
                                    ? 'nd'
                                    : item.dayOfMonth === 3
                                    ? 'rd'
                                    : 'th'
                                } of month`
                              : `Recurs ${item.frequency}`}
                          </span>
                          {item.notes && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px]">{item.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <div
                          className={`font-mono text-sm font-bold tabular-nums ${
                            item.type === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {item.type === 'income' ? '+' : '-'}
                          {formatCurrency(item.amount, currency)}
                        </div>
                        {item.frequency !== 'monthly' && (
                          <div className="text-[10px] text-slate-400">
                            ~{formatCurrency(monthlyEquiv, currency)}/mo
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        {/* Quick Post to Ledger button */}
                        <button
                          type="button"
                          onClick={() => handlePostOccurrence(item)}
                          disabled={isPosted}
                          title="Record this month's occurrence to transaction ledger"
                          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                            isPosted
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isPosted ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Recorded!</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-3 w-3" />
                              <span className="hidden md:inline">Post to Ledger</span>
                            </>
                          )}
                        </button>

                        {/* Toggle active switch */}
                        <button
                          type="button"
                          onClick={() => onToggleActive(item.id)}
                          title={item.active ? 'Pause rule' : 'Activate rule'}
                          className={`rounded-md p-1.5 transition-colors ${
                            item.active
                              ? 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40'
                              : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          title="Edit rule"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => onDeleteRecurring(item.id)}
                          title="Delete rule"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800 shrink-0 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            <span>Active rules are automatically projected into cash flow forecasting</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
