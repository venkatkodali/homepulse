import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Filter,
  X,
  Edit2,
  Check,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { CategoryInfo, CurrencyConfig, Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface BudgetAlertsNotificationProps {
  transactions: Transaction[];
  categories: CategoryInfo[];
  currency: CurrencyConfig;
  onNavigateToBudgets?: () => void;
  onSelectCategoryFilter?: (categoryId: string | null) => void;
  onUpdateCategoryBudget?: (categoryId: string, newBudget: number) => void;
}

export interface BudgetAlertItem {
  category: CategoryInfo;
  spent: number;
  budget: number;
  percentUsed: number;
  remaining: number;
  status: 'warning' | 'exceeded';
}

export const BudgetAlertsNotification: React.FC<BudgetAlertsNotificationProps> = ({
  transactions,
  categories,
  currency,
  onNavigateToBudgets,
  onSelectCategoryFilter,
  onUpdateCategoryBudget,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editBudgetValue, setEditBudgetValue] = useState<string>('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Calculate category spending against budgets
  // Threshold: >= 80% of monthly budget
  const alerts: BudgetAlertItem[] = useMemo(() => {
    // Current month scoping key: November 2026 or transactions in scope
    const currentMonthPrefix = '2026-11';
    const monthExpenses = transactions.filter(
      (t) => t.type === 'expense' && (t.date.startsWith(currentMonthPrefix) || transactions.length < 30)
    );

    const spendMap = new Map<string, number>();
    monthExpenses.forEach((tx) => {
      spendMap.set(tx.category, (spendMap.get(tx.category) || 0) + tx.amount);
    });

    const flagged: BudgetAlertItem[] = [];

    categories.forEach((cat) => {
      const budget = cat.monthlyBudget || 0;
      if (budget <= 0) return;

      const spent = spendMap.get(cat.id) || 0;
      const percentUsed = (spent / budget) * 100;

      // Condition: Exceeding 80% of budget
      if (percentUsed >= 80) {
        flagged.push({
          category: cat,
          spent,
          budget,
          percentUsed,
          remaining: budget - spent,
          status: percentUsed >= 100 ? 'exceeded' : 'warning',
        });
      }
    });

    // Sort: exceeded first, then by highest percentage used
    return flagged.sort((a, b) => {
      if (a.status === 'exceeded' && b.status !== 'exceeded') return -1;
      if (b.status === 'exceeded' && a.status !== 'exceeded') return 1;
      return b.percentUsed - a.percentUsed;
    });
  }, [transactions, categories]);

  const exceededCount = alerts.filter((a) => a.status === 'exceeded').length;
  const warningCount = alerts.filter((a) => a.status === 'warning').length;
  const hasAlerts = alerts.length > 0;

  // Handle outside click & escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setEditingCategoryId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setEditingCategoryId(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleStartEdit = (alert: BudgetAlertItem) => {
    setEditingCategoryId(alert.category.id);
    setEditBudgetValue(alert.budget.toString());
  };

  const handleSaveEdit = (categoryId: string) => {
    const val = parseFloat(editBudgetValue);
    if (!isNaN(val) && val >= 0 && onUpdateCategoryBudget) {
      onUpdateCategoryBudget(categoryId, val);
    }
    setEditingCategoryId(null);
  };

  const handleFilterClick = (categoryId: string) => {
    if (onSelectCategoryFilter) {
      onSelectCategoryFilter(categoryId);
      setIsOpen(false);
    }
  };

  const handleNavigateBudgets = () => {
    setIsOpen(false);
    if (onNavigateToBudgets) {
      onNavigateToBudgets();
    }
  };

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Button with Badge Indicator */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={
          hasAlerts
            ? `${alerts.length} budget alerts: ${exceededCount} exceeded, ${warningCount} nearing limit`
            : 'Budget notifications: all categories within healthy limits'
        }
        className={`group relative flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          hasAlerts
            ? exceededCount > 0
              ? 'border-rose-200 bg-rose-50/80 text-rose-800 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/70'
              : 'border-amber-200 bg-amber-50/80 text-amber-800 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/60'
        }`}
      >
        {/* Pulsing indicator dot if alerts present */}
        {hasAlerts ? (
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                exceededCount > 0 ? 'bg-rose-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                exceededCount > 0 ? 'bg-rose-500' : 'bg-amber-500'
              }`}
            />
          </span>
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        )}

        <div className="flex items-center gap-1.5">
          <Bell
            className={`h-3.5 w-3.5 transition-transform group-hover:scale-110 ${
              hasAlerts
                ? exceededCount > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-amber-600 dark:text-amber-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          />
          <span className="hidden sm:inline">Budget Alerts</span>
        </div>

        {/* Badge counter */}
        {hasAlerts ? (
          <span
            className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.2 font-mono text-[11px] font-bold tabular-nums text-white ${
              exceededCount > 0 ? 'bg-rose-600' : 'bg-amber-600'
            }`}
          >
            {alerts.length}
          </span>
        ) : (
          <span className="font-mono text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
            0
          </span>
        )}
      </button>

      {/* Notification Popover Dropdown */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Budget Threshold Notifications"
          className="absolute right-0 z-50 mt-2 w-88 sm:w-104 origin-top-right rounded-xl border border-slate-200 bg-white p-0 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  exceededCount > 0
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                    : hasAlerts
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                    : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                }`}
              >
                {exceededCount > 0 ? (
                  <AlertCircle className="h-4 w-4" />
                ) : hasAlerts ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Budget Threshold Alerts
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Categories exceeding 80% of monthly allocation
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              aria-label="Close notification panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          {hasAlerts ? (
            <div className="flex items-center justify-between bg-slate-50/80 px-4 py-2 border-b border-slate-100 text-xs dark:bg-slate-950/40 dark:border-slate-800">
              <span className="font-medium text-slate-600 dark:text-slate-400">
                {alerts.length} {alerts.length === 1 ? 'category' : 'categories'} flagged
              </span>
              <div className="flex items-center gap-2">
                {exceededCount > 0 && (
                  <span className="font-mono text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                    {exceededCount} Exceeded (≥100%)
                  </span>
                )}
                {exceededCount > 0 && warningCount > 0 && (
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                )}
                {warningCount > 0 && (
                  <span className="font-mono text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    {warningCount} Warning (80-99%)
                  </span>
                )}
              </div>
            </div>
          ) : null}

          {/* Alert Category List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 p-2 dark:divide-slate-800">
            {!hasAlerts ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  All Budgets Healthy
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  None of your active categories have crossed the 80% monthly budget threshold. Great job maintaining spending discipline!
                </p>
              </div>
            ) : (
              alerts.map((item) => {
                const isEditing = editingCategoryId === item.category.id;
                const isOver = item.status === 'exceeded';

                return (
                  <div
                    key={item.category.id}
                    className="p-3 transition-colors hover:bg-slate-50/80 rounded-lg dark:hover:bg-slate-800/50"
                  >
                    {/* Top Row: Category Identity & Status Tag */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.category.color }}
                        />
                        <span className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {item.category.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`font-mono text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${
                            isOver
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                          }`}
                        >
                          {isOver ? 'Exceeded' : 'Warning'} ({item.percentUsed.toFixed(0)}%)
                        </span>
                      </div>
                    </div>

                    {/* Financial details & progress bar */}
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                          Spent{' '}
                          <span className="font-mono font-medium tabular-nums text-slate-900 dark:text-slate-100">
                            {formatCurrency(item.spent, currency)}
                          </span>{' '}
                          of{' '}
                          <span className="font-mono font-medium tabular-nums text-slate-600 dark:text-slate-400">
                            {formatCurrency(item.budget, currency)}
                          </span>
                        </span>

                        <span
                          className={`font-mono text-xs font-semibold tabular-nums ${
                            isOver
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {isOver
                            ? `${formatCurrency(Math.abs(item.remaining), currency)} over`
                            : `${formatCurrency(item.remaining, currency)} left`}
                        </span>
                      </div>

                      {/* Visual Progress Bar with 80% Marker */}
                      <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        {/* 80% indicator line */}
                        <div
                          className="absolute top-0 bottom-0 z-10 w-0.5 bg-slate-400 dark:bg-slate-600 opacity-70"
                          style={{ left: '80%' }}
                          title="80% Warning Threshold"
                        />
                        {/* Progress Fill */}
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOver ? 'bg-rose-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, item.percentUsed)}%` }}
                        />
                      </div>
                    </div>

                    {/* Inline Quick Budget Edit or Actions */}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100/60 pt-2 dark:border-slate-800/60">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            New budget:
                          </span>
                          <div className="relative flex-1">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                              {currency.symbol}
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="25"
                              value={editBudgetValue}
                              onChange={(e) => setEditBudgetValue(e.target.value)}
                              className="w-full rounded border border-blue-400 bg-white py-1 pl-5 pr-2 font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-blue-600 dark:bg-slate-800 dark:text-slate-100"
                              autoFocus
                            />
                          </div>
                          <button
                            onClick={() => handleSaveEdit(item.category.id)}
                            className="rounded bg-blue-600 p-1 text-white hover:bg-blue-700 transition-colors"
                            title="Save Budget"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingCategoryId(null)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleFilterClick(item.category.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                          >
                            <Filter className="h-3 w-3" />
                            <span>Filter Transactions</span>
                          </button>

                          {onUpdateCategoryBudget && (
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>Adjust Budget</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Action */}
          {onNavigateToBudgets && (
            <div className="border-t border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
              <button
                onClick={handleNavigateBudgets}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/60 dark:hover:text-blue-400 transition-colors"
              >
                <span>Manage Budgets & Financial Goals</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
