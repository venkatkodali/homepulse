import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Calendar,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  FileText,
} from 'lucide-react';
import { CategoryInfo, CurrencyConfig, DateFilter, RecurringTransaction, Subscription, Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CashFlowTrendChart } from '../charts/CashFlowTrendChart';
import { CategoryDonutChart } from '../charts/CategoryDonutChart';
import { SpendingPatternsChart } from '../charts/SpendingPatternsChart';
import { UpcomingMonthlyBills } from '../dashboard/UpcomingMonthlyBills';
import { MonthlyBudgetProgressBar } from '../dashboard/MonthlyBudgetProgressBar';
import { BudgetAlertsNotification } from '../dashboard/BudgetAlertsNotification';

interface DashboardViewProps {
  transactions: Transaction[];
  categories: CategoryInfo[];
  subscriptions: Subscription[];
  recurringTransactions?: RecurringTransaction[];
  currency: CurrencyConfig;
  dateFilter: DateFilter;
  onSetDateFilter: (filter: DateFilter) => void;
  onOpenAddModal: () => void;
  onOpenReportModal?: () => void;
  onOpenRecurringModal?: () => void;
  onSelectCategoryFilter: (categoryId: string | null) => void;
  selectedCategory: string | null;
  onViewAllTransactions: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onNavigateToSubscriptions?: () => void;
  onNavigateToBudgets?: () => void;
  onUpdateCategoryBudget?: (categoryId: string, newBudget: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  categories,
  subscriptions,
  recurringTransactions = [],
  currency,
  dateFilter,
  onSetDateFilter,
  onOpenAddModal,
  onOpenReportModal,
  onOpenRecurringModal,
  onSelectCategoryFilter,
  selectedCategory,
  onViewAllTransactions,
  onEditTransaction,
  onNavigateToSubscriptions,
  onNavigateToBudgets,
  onUpdateCategoryBudget,
}) => {
  // Compute Key Metrics
  const metrics = useMemo(() => {
    let totalExpense = 0;
    let totalIncome = 0;

    transactions.forEach((t) => {
      if (t.type === 'expense') {
        totalExpense += t.amount;
      } else {
        totalIncome += t.amount;
      }
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Distinct days
    const uniqueDays = new Set(transactions.map((t) => t.date)).size || 1;
    const avgDailySpend = totalExpense / Math.max(1, uniqueDays);

    const totalBudget = categories.reduce((sum, c) => sum + c.monthlyBudget, 0);
    const budgetRemaining = totalBudget - totalExpense;

    return {
      totalExpense,
      totalIncome,
      netSavings,
      savingsRate,
      avgDailySpend,
      totalBudget,
      budgetRemaining,
    };
  }, [transactions, categories]);

  // Recent 6 transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Date Filter Bar & Quick Actions Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Preset filter tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => onSetDateFilter({ preset: 'this_month' })}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              dateFilter.preset === 'this_month'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => onSetDateFilter({ preset: 'last_month' })}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              dateFilter.preset === 'last_month'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Last Month
          </button>
          <button
            onClick={() => onSetDateFilter({ preset: 'last_90_days' })}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              dateFilter.preset === 'last_90_days'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Last 90 Days
          </button>
          <button
            onClick={() => onSetDateFilter({ preset: 'all' })}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              dateFilter.preset === 'all'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            All Ledger Records
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Notification System: Categories exceeding 80% of budget */}
          <BudgetAlertsNotification
            transactions={transactions}
            categories={categories}
            currency={currency}
            onNavigateToBudgets={onNavigateToBudgets}
            onSelectCategoryFilter={onSelectCategoryFilter}
            onUpdateCategoryBudget={onUpdateCategoryBudget}
          />

          {onOpenReportModal && (
            <button
              onClick={onOpenReportModal}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/60 transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Summary Report</span>
            </button>
          )}

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Quick Log Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Strip - 4 High Impact Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Total Spent */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Outflow</span>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
            {formatCurrency(metrics.totalExpense, currency)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Avg {formatCurrency(metrics.avgDailySpend, currency)} / day</span>
          </div>
        </div>

        {/* Metric 2: Total Inflow */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Inflow</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
            {formatCurrency(metrics.totalIncome, currency)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Direct salary & revenue</span>
          </div>
        </div>

        {/* Metric 3: Net Cash Flow */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Net Surplus</span>
            <Wallet className="h-4 w-4 text-blue-500" />
          </div>
          <div
            className={`mt-2 font-mono text-2xl font-bold tracking-tight tabular-nums ${
              metrics.netSavings >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(metrics.netSavings, currency)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
              {metrics.savingsRate.toFixed(1)}%
            </span>{' '}
            savings efficiency
          </div>
        </div>

        {/* Metric 4: Monthly Budget Headroom */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Monthly Budget Cap</span>
            <PieChart className="h-4 w-4 text-indigo-500" />
          </div>
          <div
            className={`mt-2 font-mono text-2xl font-bold tracking-tight tabular-nums ${
              metrics.budgetRemaining >= 0
                ? 'text-slate-900 dark:text-slate-100'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(Math.max(0, metrics.budgetRemaining), currency)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {metrics.budgetRemaining >= 0
                ? `${formatCurrency(metrics.totalBudget, currency)} target allocated`
                : `${formatCurrency(Math.abs(metrics.budgetRemaining), currency)} over plan`}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Progress Bar: Monthly Spending vs Cumulative Budget */}
      <MonthlyBudgetProgressBar
        transactions={transactions}
        categories={categories}
        currency={currency}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategoryFilter}
      />

      {/* Primary Trend Chart Section */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
        <CashFlowTrendChart
          transactions={transactions}
          currency={currency}
          recurringTransactions={recurringTransactions}
          onOpenRecurringModal={onOpenRecurringModal}
        />
      </div>

      {/* Two Column Grid: Category Donut & Spending Cadence */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category Outflow Distribution */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
          <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Category Distribution
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive allocation of expenditure by classification
            </p>
          </div>
          <CategoryDonutChart
            transactions={transactions}
            categories={categories}
            currency={currency}
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategoryFilter}
          />
        </div>

        {/* Behavioral Patterns */}
        <SpendingPatternsChart transactions={transactions} currency={currency} />
      </div>

      {/* Two Column Grid: Upcoming Monthly Bills & Recent Ledger Entries */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Dedicated Upcoming Monthly Bills Component */}
        <UpcomingMonthlyBills
          subscriptions={subscriptions}
          categories={categories}
          currency={currency}
          onNavigateToSubscriptions={onNavigateToSubscriptions}
        />

        {/* Recent Ledger Entries Strip */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Recent Transactions
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest financial activity recorded in your ledger
              </p>
            </div>

            <button
              onClick={onViewAllTransactions}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <span>View All Records</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto dark:divide-slate-800">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 dark:text-slate-500">
                  <th className="py-2.5 font-medium">Date</th>
                  <th className="py-2.5 font-medium">Description</th>
                  <th className="py-2.5 font-medium">Merchant</th>
                  <th className="py-2.5 font-medium">Category</th>
                  <th className="py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                        <div className="relative flex h-10 w-16 items-center justify-center overflow-hidden rounded-lg bg-[#071026] p-1 shadow-xs ring-1 ring-slate-800">
                          <img
                            src="/assets/aistudio/image_806b5b1b.png"
                            alt="HomePulse Logo"
                            className="h-full w-auto object-contain"
                          />
                        </div>
                        <p className="font-medium text-slate-600 dark:text-slate-400">
                          No transactions recorded yet
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Click &ldquo;+ Log Expense&rdquo; in the top bar or open Data Management to import a bank CSV.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => {
                    const cat = categories.find((c) => c.id === tx.category);

                    return (
                      <tr
                        key={tx.id}
                        onClick={() => onEditTransaction(tx)}
                        className="cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                      >
                        <td className="py-3 font-mono text-slate-500 tabular-nums dark:text-slate-400">
                          {formatDate(tx.date)}
                        </td>
                        <td className="py-3 font-medium text-slate-800 dark:text-slate-200">
                          {tx.title}
                        </td>
                        <td className="py-3 text-slate-500 dark:text-slate-400">
                          {tx.merchant}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <span
                              className="h-2 w-2 rounded-xs"
                              style={{ backgroundColor: cat?.color || '#94A3B8' }}
                            />
                            <span>{cat?.name || tx.category}</span>
                          </div>
                        </td>
                        <td
                          className={`py-3 text-right font-mono font-semibold tabular-nums ${
                            tx.type === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {formatCurrency(tx.amount, currency)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
