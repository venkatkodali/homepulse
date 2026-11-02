import React, { useMemo } from 'react';
import { CategoryInfo, CurrencyConfig, Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface BudgetVarianceChartProps {
  transactions: Transaction[];
  categories: CategoryInfo[];
  currency: CurrencyConfig;
  onEditCategoryBudget?: (categoryId: string) => void;
}

export const BudgetVarianceChart: React.FC<BudgetVarianceChartProps> = ({
  transactions,
  categories,
  currency,
  onEditCategoryBudget,
}) => {
  // Calculate expenses by category for the current filtered scope
  const budgetData = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'expense');

    const spentMap = new Map<string, number>();
    expenses.forEach((t) => {
      spentMap.set(t.category, (spentMap.get(t.category) || 0) + t.amount);
    });

    return categories.map((cat) => {
      const spent = spentMap.get(cat.id) || 0;
      const budget = cat.monthlyBudget;
      const ratio = budget > 0 ? (spent / budget) * 100 : 0;
      const variance = budget - spent; // positive = under budget, negative = over budget

      let status: 'safe' | 'warning' | 'danger' = 'safe';
      if (ratio >= 100) {
        status = 'danger';
      } else if (ratio >= 80) {
        status = 'warning';
      }

      return {
        ...cat,
        spent,
        budget,
        ratio,
        variance,
        status,
      };
    }).sort((a, b) => b.ratio - a.ratio); // show highest consumed first
  }, [transactions, categories]);

  const totalBudget = categories.reduce((sum, c) => sum + c.monthlyBudget, 0);
  const totalSpent = budgetData.reduce((sum, c) => sum + c.spent, 0);
  const totalRatio = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Overall Budget Progress Header */}
      <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800/80 dark:bg-slate-900/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Total Monthly Budget Allocation
            </span>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              <span>{formatCurrency(totalSpent, currency)} spent</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>{formatCurrency(totalBudget, currency)} target</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span className={totalSpent > totalBudget ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}>
                {totalSpent > totalBudget
                  ? `${formatCurrency(totalSpent - totalBudget, currency)} over limit`
                  : `${formatCurrency(totalBudget - totalSpent, currency)} headroom`}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {totalRatio.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              totalRatio > 100
                ? 'bg-rose-500'
                : totalRatio > 85
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, totalRatio)}%` }}
          />
        </div>
      </div>

      {/* Category breakdown bars */}
      <div className="space-y-3">
        {budgetData.map((item) => {
          const isOver = item.variance < 0;

          return (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200/60 bg-white p-3 transition-colors hover:border-slate-300 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-xs"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {item.name}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="font-mono text-slate-700 tabular-nums dark:text-slate-300">
                    {formatCurrency(item.spent, currency)}
                    <span className="text-slate-400"> / {formatCurrency(item.budget, currency)}</span>
                  </span>

                  {/* Clean unboxed indicator */}
                  <span
                    className={`font-mono text-[11px] font-medium tabular-nums ${
                      item.status === 'danger'
                        ? 'text-rose-600 dark:text-rose-400'
                        : item.status === 'warning'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {item.ratio.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Progress bar track */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    item.status === 'danger'
                      ? 'bg-rose-500'
                      : item.status === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, item.ratio)}%` }}
                />
              </div>

              {/* Quiet metadata line */}
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                  {isOver
                    ? `${formatCurrency(Math.abs(item.variance), currency)} over cap`
                    : `${formatCurrency(item.variance, currency)} available`}
                </span>

                {onEditCategoryBudget && (
                  <button
                    onClick={() => onEditCategoryBudget(item.id)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    Edit Limit
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
