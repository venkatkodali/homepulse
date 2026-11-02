import React, { useMemo, useState } from 'react';
import { CategoryInfo, CurrencyConfig, Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface CategoryDonutChartProps {
  transactions: Transaction[];
  categories: CategoryInfo[];
  currency: CurrencyConfig;
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  transactions,
  categories,
  currency,
  selectedCategory,
  onSelectCategory,
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Filter only expenses
  const expenseData = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'expense');
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

    const map = new Map<string, { total: number; count: number }>();
    expenses.forEach((t) => {
      const cur = map.get(t.category) || { total: 0, count: 0 };
      cur.total += t.amount;
      cur.count += 1;
      map.set(t.category, cur);
    });

    const categoryStats = categories
      .map((cat) => {
        const stats = map.get(cat.id) || { total: 0, count: 0 };
        const percent = totalExpense > 0 ? (stats.total / totalExpense) * 100 : 0;
        return {
          ...cat,
          total: stats.total,
          count: stats.count,
          percent,
        };
      })
      .filter((cat) => cat.total > 0)
      .sort((a, b) => b.total - a.total);

    return {
      totalExpense,
      categoryStats,
    };
  }, [transactions, categories]);

  // SVG Donut geometry
  const size = 260;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute strokeDasharray and strokeDashoffset for each slice
  const slices = useMemo(() => {
    let accumulatedAngle = 0;
    return expenseData.categoryStats.map((item) => {
      const sliceLength = (item.percent / 100) * circumference;
      const strokeDashoffset = -accumulatedAngle;
      accumulatedAngle += sliceLength;

      return {
        ...item,
        strokeDasharray: `${Math.max(0, sliceLength - 1.5)} ${circumference - Math.max(0, sliceLength - 1.5)}`,
        strokeDashoffset,
      };
    });
  }, [expenseData.categoryStats, circumference]);

  const activeCategory = hoveredCategory || selectedCategory;
  const activeStat = expenseData.categoryStats.find((c) => c.id === activeCategory);

  if (expenseData.totalExpense === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          No expense distribution available
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
      {/* Donut graphic */}
      <div className="relative mx-auto flex shrink-0 items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 transform select-none"
        >
          {/* Background track circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-slate-100 dark:text-slate-800"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {slices.map((slice) => {
            const isHovered = hoveredCategory === slice.id;
            const isSelected = selectedCategory === slice.id;
            const isDimmed = activeCategory && activeCategory !== slice.id;

            return (
              <circle
                key={slice.id}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={isHovered || isSelected ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                className="cursor-pointer transition-all duration-200"
                style={{
                  opacity: isDimmed ? 0.35 : 1,
                }}
                onMouseEnter={() => setHoveredCategory(slice.id)}
                onMouseLeave={() => setHoveredCategory(null)}
                onClick={() => {
                  onSelectCategory(selectedCategory === slice.id ? null : slice.id);
                }}
              />
            );
          })}
        </svg>

        {/* Center cutout info */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {activeStat ? activeStat.name : 'Total Outflow'}
          </span>
          <span className="mt-0.5 font-mono text-xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
            {formatCurrency(activeStat ? activeStat.total : expenseData.totalExpense, currency)}
          </span>
          <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {activeStat
              ? `${activeStat.percent.toFixed(1)}% of total`
              : `${expenseData.categoryStats.length} active categories`}
          </span>
        </div>
      </div>

      {/* Category breakdown table / list */}
      <div className="flex-1 space-y-2">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Category Breakdown</span>
          <span>Share / Amount</span>
        </div>

        <div className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
          {expenseData.categoryStats.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const isHovered = hoveredCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(isSelected ? null : cat.id)}
                onMouseEnter={() => setHoveredCategory(cat.id)}
                onMouseLeave={() => setHoveredCategory(null)}
                className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                  isSelected
                    ? 'bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100'
                    : isHovered
                    ? 'bg-slate-100 dark:bg-slate-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-xs"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                    {cat.name}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({cat.count} tx)
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="w-10 text-right font-mono text-[11px] text-slate-400 tabular-nums">
                    {cat.percent.toFixed(1)}%
                  </span>
                  <span className="w-20 text-right font-mono font-semibold text-slate-800 tabular-nums dark:text-slate-200">
                    {formatCurrency(cat.total, currency)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {selectedCategory && (
          <div className="pt-2 text-right">
            <button
              onClick={() => onSelectCategory(null)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Clear category filter
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
