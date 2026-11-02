import React, { useMemo, useState } from 'react';
import {
  Search,
  Filter,
  Download,
  Trash2,
  Plus,
  ArrowUpDown,
  MoreVertical,
  CheckSquare,
  Square,
  Tag,
  Receipt,
  X,
  RefreshCw,
} from 'lucide-react';
import { CategoryInfo, CurrencyConfig, DateFilter, PaymentMethod, RecurringTransaction, Transaction, TransactionType } from '../../types';
import { exportTransactionsToCSV, formatCurrency, formatDate, downloadFile } from '../../utils/formatters';

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: CategoryInfo[];
  currency: CurrencyConfig;
  recurringTransactions?: RecurringTransaction[];
  onOpenRecurringModal?: () => void;
  onOpenAddModal: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onBatchDeleteTransactions: (ids: string[]) => void;
  dateFilter: DateFilter;
  onSetDateFilter: (filter: DateFilter) => void;
  selectedCategory: string | null;
  onSelectCategoryFilter: (categoryId: string | null) => void;
}

type SortField = 'date' | 'amount' | 'merchant' | 'title';
type SortOrder = 'asc' | 'desc';

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categories,
  currency,
  recurringTransactions = [],
  onOpenRecurringModal,
  onOpenAddModal,
  onEditTransaction,
  onDeleteTransaction,
  onBatchDeleteTransactions,
  dateFilter,
  onSetDateFilter,
  selectedCategory,
  onSelectCategoryFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter & Sort
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // State-based search filter: filter by merchant name or description
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const matchesDescription = tx.title.toLowerCase().includes(query);
        const matchesMerchant = tx.merchant.toLowerCase().includes(query);
        if (!matchesDescription && !matchesMerchant) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) {
        return false;
      }

      // Category filter
      if (selectedCategory && tx.category !== selectedCategory) {
        return false;
      }

      // Payment filter
      if (paymentFilter !== 'all' && tx.paymentMethod !== paymentFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortField === 'merchant') {
        comparison = a.merchant.localeCompare(b.merchant);
      } else if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [transactions, searchTerm, typeFilter, selectedCategory, paymentFilter, sortField, sortOrder]);

  // Aggregate sums for filtered records
  const aggregates = useMemo(() => {
    let expSum = 0;
    let incSum = 0;
    filteredTransactions.forEach((t) => {
      if (t.type === 'expense') expSum += t.amount;
      else incSum += t.amount;
    });
    return { expSum, incSum, count: filteredTransactions.length };
  }, [filteredTransactions]);

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Delete ${selectedIds.size} selected transactions?`)) {
      onBatchDeleteTransactions(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleExportSelected = () => {
    const toExport = transactions.filter((t) => selectedIds.has(t.id));
    if (toExport.length === 0) return;
    const csv = exportTransactionsToCSV(toExport);
    downloadFile(csv, `selected_ledger_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Strip */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Bar: State-based filter by merchant name or description */}
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by merchant name or description..."
              aria-label="Search by merchant name or description"
              className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            {searchTerm.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Clear search"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns & Segmented Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category dropdown */}
            <select
              value={selectedCategory || 'all'}
              onChange={(e) => onSelectCategoryFilter(e.target.value === 'all' ? null : e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Type selector */}
            <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
              <button
                onClick={() => setTypeFilter('all')}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  typeFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                All Types
              </button>
              <button
                onClick={() => setTypeFilter('expense')}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  typeFilter === 'expense'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setTypeFilter('income')}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  typeFilter === 'income'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                Income
              </button>
            </div>

            {/* Payment Method filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">All Payment Modes</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="digital_wallet">Digital Wallet</option>
              <option value="cash">Cash</option>
            </select>

            {/* Recurring Transactions Button */}
            {onOpenRecurringModal && (
              <button
                onClick={onOpenRecurringModal}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/60 transition-colors shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Recurring Rules ({recurringTransactions.length})</span>
              </button>
            )}

            {/* Add Transaction Button */}
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Record</span>
            </button>
          </div>
        </div>

        {/* Date Presets Row */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span className="font-medium text-slate-400">Period:</span>
          {(['this_month', 'last_month', 'last_30_days', 'last_90_days', 'all'] as const).map((preset) => {
            const labels: Record<string, string> = {
              this_month: 'This Month',
              last_month: 'Last Month',
              last_30_days: 'Last 30 Days',
              last_90_days: 'Last 90 Days',
              all: 'All History',
            };
            return (
              <button
                key={preset}
                onClick={() => onSetDateFilter({ preset })}
                className={`rounded px-2 py-0.5 transition-colors ${
                  dateFilter.preset === preset
                    ? 'bg-slate-200 font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                    : 'hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {labels[preset]}
              </button>
            );
          })}
        </div>

        {/* Active Search Filter State Feedback */}
        {searchTerm.trim().length > 0 && (
          <div className="mt-2.5 flex items-center justify-between rounded-md bg-slate-100/80 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            <div className="flex items-center gap-1.5 truncate">
              <span>Filtering by merchant or description:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">"{searchTerm}"</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {filteredTransactions.length} matching {filteredTransactions.length === 1 ? 'record' : 'records'}
              </span>
            </div>
            <button
              onClick={() => setSearchTerm('')}
              className="ml-2 font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 shrink-0"
            >
              Reset search
            </button>
          </div>
        )}
      </div>

      {/* Batch Action Toolbar (appears when items selected) */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2.5 text-xs text-blue-900 dark:bg-blue-950/60 dark:text-blue-100">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{selectedIds.size} transactions selected</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportSelected}
              className="flex items-center gap-1 font-medium hover:text-blue-700 dark:hover:text-blue-300"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Selected CSV</span>
            </button>
            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-1 font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Ledger Table Container */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                <th className="w-10 px-4 py-3">
                  <button onClick={handleSelectAll} className="flex items-center">
                    {selectedIds.size > 0 && selectedIds.size === filteredTransactions.length ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => toggleSort('date')}
                  className="cursor-pointer px-3 py-3 font-medium transition-colors hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('title')}
                  className="cursor-pointer px-3 py-3 font-medium transition-colors hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    <span>Description & Tags</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('merchant')}
                  className="cursor-pointer px-3 py-3 font-medium transition-colors hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    <span>Merchant / Payee</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 font-medium">Payment Mode</th>
                <th
                  onClick={() => toggleSort('amount')}
                  className="cursor-pointer px-4 py-3 text-right font-medium transition-colors hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Amount</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="w-10 px-3 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    {searchTerm.trim().length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          No transactions found matching merchant or description "{searchTerm}".
                        </p>
                        <button
                          onClick={() => setSearchTerm('')}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          Clear search query
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        No transactions match the selected filter criteria.
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isSelected = selectedIds.has(tx.id);
                  const cat = categories.find((c) => c.id === tx.category);

                  return (
                    <tr
                      key={tx.id}
                      className={`group transition-colors ${
                        isSelected
                          ? 'bg-blue-50/50 dark:bg-blue-950/20'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => handleToggleSelect(tx.id)}
                          className="flex items-center"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300 group-hover:text-slate-400 dark:text-slate-700" />
                          )}
                        </button>
                      </td>
                      <td
                        onClick={() => onEditTransaction(tx)}
                        className="cursor-pointer px-3 py-2.5 font-mono text-slate-500 tabular-nums dark:text-slate-400"
                      >
                        {formatDate(tx.date)}
                      </td>
                      <td
                        onClick={() => onEditTransaction(tx)}
                        className="cursor-pointer px-3 py-2.5"
                      >
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {tx.title}
                        </div>
                        {tx.tags && tx.tags.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-slate-400">
                            {tx.tags.map((t, idx) => (
                              <React.Fragment key={t}>
                                {idx > 0 && <span aria-hidden="true">·</span>}
                                <span>#{t}</span>
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </td>
                      <td
                        onClick={() => onEditTransaction(tx)}
                        className="cursor-pointer px-3 py-2.5 text-slate-600 dark:text-slate-300"
                      >
                        {tx.merchant}
                      </td>
                      <td
                        onClick={() => onEditTransaction(tx)}
                        className="cursor-pointer px-3 py-2.5"
                      >
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <span
                            className="h-2 w-2 rounded-xs"
                            style={{ backgroundColor: cat?.color || '#94A3B8' }}
                          />
                          <span>{cat?.name || tx.category}</span>
                        </div>
                      </td>
                      <td
                        onClick={() => onEditTransaction(tx)}
                        className="cursor-pointer px-3 py-2.5 capitalize text-slate-500 dark:text-slate-400"
                      >
                        {tx.paymentMethod.replace('_', ' ')}
                      </td>
                      <td
                        onClick={() => onEditTransaction(tx)}
                        className={`cursor-pointer px-4 py-2.5 text-right font-mono font-semibold tabular-nums ${
                          tx.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(tx.amount, currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => onEditTransaction(tx)}
                          className="rounded p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Summary Footer */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span>Showing {filteredTransactions.length} of {transactions.length} records</span>
          </div>
          <div className="flex items-center gap-6">
            <span>
              Total Expenses:{' '}
              <span className="font-mono font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                {formatCurrency(aggregates.expSum, currency)}
              </span>
            </span>
            {aggregates.incSum > 0 && (
              <span>
                Total Income:{' '}
                <span className="font-mono font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                  +{formatCurrency(aggregates.incSum, currency)}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
