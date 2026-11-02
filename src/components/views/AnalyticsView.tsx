import React, { useMemo } from 'react';
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Award,
  Layers,
  ArrowRight,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { CategoryInfo, CurrencyConfig, RecurringTransaction, Subscription, Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { BudgetVarianceChart } from '../charts/BudgetVarianceChart';
import { SpendingPatternsChart } from '../charts/SpendingPatternsChart';
import { FutureSpendingProjectionChart } from '../charts/FutureSpendingProjectionChart';

interface AnalyticsViewProps {
  transactions: Transaction[];
  categories: CategoryInfo[];
  subscriptions: Subscription[];
  recurringTransactions: RecurringTransaction[];
  currency: CurrencyConfig;
  onEditCategoryBudget: (categoryId: string) => void;
  onOpenAddModal: () => void;
  onOpenReportModal?: () => void;
  onOpenRecurringModal?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions,
  categories,
  subscriptions,
  recurringTransactions,
  currency,
  onEditCategoryBudget,
  onOpenReportModal,
  onOpenRecurringModal,
}) => {
  // Compute monthly comparison: Nov 2026 vs Oct 2026
  const monthComparison = useMemo(() => {
    let novExp = 0;
    let novInc = 0;
    let octExp = 0;
    let octInc = 0;

    transactions.forEach((t) => {
      if (t.date.startsWith('2026-11')) {
        if (t.type === 'expense') novExp += t.amount;
        else novInc += t.amount;
      } else if (t.date.startsWith('2026-10')) {
        if (t.type === 'expense') octExp += t.amount;
        else octInc += t.amount;
      }
    });

    const expDelta = octExp > 0 ? ((novExp - octExp) / octExp) * 100 : 0;

    return {
      novExp,
      novInc,
      octExp,
      octInc,
      expDelta,
    };
  }, [transactions]);

  // Top 5 largest single expenses
  const largestExpenses = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Financial Analytics & Visual Intelligence
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              In-depth comparative analysis, category variance, and behavioral metrics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
            {onOpenRecurringModal && (
              <button
                onClick={onOpenRecurringModal}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/60 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Recurring Rules ({recurringTransactions.filter((r) => r.active).length})</span>
              </button>
            )}

            {onOpenReportModal && (
              <button
                onClick={onOpenReportModal}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/60 transition-colors"
              >
                <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Generate Summary Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Month-over-Month Comparative Cards */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="rounded-lg bg-slate-50/70 p-3.5 dark:bg-slate-800/40">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Current Month Outflow (Nov)
            </span>
            <div className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums dark:text-slate-100">
              {formatCurrency(monthComparison.novExp, currency)}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Inflow: {formatCurrency(monthComparison.novInc, currency)}
            </div>
          </div>

          <div className="rounded-lg bg-slate-50/70 p-3.5 dark:bg-slate-800/40">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Previous Month Outflow (Oct)
            </span>
            <div className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums dark:text-slate-100">
              {formatCurrency(monthComparison.octExp, currency)}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Inflow: {formatCurrency(monthComparison.octInc, currency)}
            </div>
          </div>

          <div className="rounded-lg bg-slate-50/70 p-3.5 dark:bg-slate-800/40">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Pacing Variance
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-xl font-bold text-slate-900 tabular-nums dark:text-slate-100">
                {monthComparison.novExp < monthComparison.octExp ? 'Under Pace' : 'Higher Outflow'}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Early in cycle compared to full 31-day October
            </div>
          </div>
        </div>
      </div>

      {/* Recharts Future Spending Projection Section */}
      <FutureSpendingProjectionChart
        transactions={transactions}
        categories={categories}
        subscriptions={subscriptions}
        recurringTransactions={recurringTransactions}
        currency={currency}
        onOpenRecurringModal={onOpenRecurringModal}
      />

      {/* Two Column Grid: Budget Variance vs Largest Expenses */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Budget vs Actual Variance Section */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
          <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Monthly Budget Variance & Limit Compliance
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Category target tracking with overage status alerts
            </p>
          </div>

          <BudgetVarianceChart
            transactions={transactions}
            categories={categories}
            currency={currency}
            onEditCategoryBudget={onEditCategoryBudget}
          />
        </div>

        {/* Largest Expenses & Behavioral Insights */}
        <div className="space-y-6">
          {/* Largest Outflow Table */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
            <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Top Capital Outflows (Single Expenses)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Largest individual transactions across ledger history
              </p>
            </div>

            <div className="space-y-2.5">
              {largestExpenses.map((tx, idx) => {
                const cat = categories.find((c) => c.id === tx.category);

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-slate-100 font-mono text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {tx.title}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {tx.merchant} · {formatDate(tx.date)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-bold text-slate-900 tabular-nums dark:text-slate-100">
                        {formatCurrency(tx.amount, currency)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {cat?.name || tx.category}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Behavioral Distribution */}
          <SpendingPatternsChart transactions={transactions} currency={currency} />
        </div>
      </div>
    </div>
  );
};
