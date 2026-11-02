import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Layers,
  Calendar,
  DollarSign,
  Info,
} from 'lucide-react';
import { CategoryInfo, CurrencyConfig, Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface MonthlyBudgetProgressBarProps {
  transactions: Transaction[];
  categories: CategoryInfo[];
  currency: CurrencyConfig;
  onSelectCategory?: (categoryId: string | null) => void;
  selectedCategory?: string | null;
  onNavigateToBudgets?: () => void;
}

export const MonthlyBudgetProgressBar: React.FC<MonthlyBudgetProgressBarProps> = ({
  transactions,
  categories,
  currency,
  onSelectCategory,
  selectedCategory,
  onNavigateToBudgets,
}) => {
  const [displayMode, setDisplayMode] = useState<'category_segments' | 'unified'>('category_segments');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Month reference: November 2026 (or active month based on transaction dates)
  const stats = useMemo(() => {
    // Target November 2026 as standard reference or latest month with expenses
    const currentMonthKey = '2026-11';
    const monthName = 'November 2026';

    // Filter month expenses
    const monthExpenses = transactions.filter(
      (t) => t.type === 'expense' && (t.date.startsWith(currentMonthKey) || transactions.length < 25)
    );

    // Sum category spending
    const spendByCategory = new Map<string, number>();
    let totalSpent = 0;

    monthExpenses.forEach((tx) => {
      totalSpent += tx.amount;
      const prev = spendByCategory.get(tx.category) || 0;
      spendByCategory.set(tx.category, prev + tx.amount);
    });

    // Total cumulative budget across all categories
    const cumulativeBudget = categories.reduce((sum, c) => sum + (c.monthlyBudget || 0), 0);
    const utilizationRate = cumulativeBudget > 0 ? (totalSpent / cumulativeBudget) * 100 : 0;
    const remainingHeadroom = cumulativeBudget - totalSpent;

    // Day of month & pacing benchmarks
    // November 2026 has 30 days. Reference current day: Day 1 (or derived from latest transaction)
    const totalDaysInMonth = 30;
    const currentDay = 1; // Nov 1, 2026 per simulation timestamp
    const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1);
    const expectedElapsedRate = (currentDay / totalDaysInMonth) * 100;
    const dailySafePace = remainingHeadroom > 0 ? remainingHeadroom / daysRemaining : 0;

    // Health verdict
    let healthStatus: 'healthy' | 'moderate' | 'caution' | 'critical' | 'exceeded' = 'healthy';
    let statusLabel = 'Optimal Financial Health';
    let statusDescription = 'Spending pace is well within cumulative monthly allocations.';

    if (utilizationRate > 100) {
      healthStatus = 'exceeded';
      statusLabel = 'Cumulative Budget Exceeded';
      statusDescription = `Expenditures have surpassed the combined category limit by ${formatCurrency(Math.abs(remainingHeadroom), currency)}.`;
    } else if (utilizationRate >= 90) {
      healthStatus = 'critical';
      statusLabel = 'Near Budget Ceiling';
      statusDescription = 'Over 90% of combined category allocations consumed.';
    } else if (utilizationRate >= 75) {
      healthStatus = 'caution';
      statusLabel = 'Approaching Allocation Limit';
      statusDescription = 'Spending pace is elevated relative to calendar progression.';
    } else if (utilizationRate >= 50) {
      healthStatus = 'moderate';
      statusLabel = 'Moderate Controlled Pace';
      statusDescription = 'Expenditures are aligned with standard monthly burn-rate.';
    } else {
      healthStatus = 'healthy';
      statusLabel = 'Substantial Budget Headroom';
      statusDescription = 'Excellent capital discipline with high remaining buffer.';
    }

    // Build category segments sorted by spend
    const categorySegments = categories
      .map((cat) => {
        const spent = spendByCategory.get(cat.id) || 0;
        const percentOfBudget = cumulativeBudget > 0 ? (spent / cumulativeBudget) * 100 : 0;
        const percentOfSpend = totalSpent > 0 ? (spent / totalSpent) * 100 : 0;
        const categoryBudgetRate = cat.monthlyBudget > 0 ? (spent / cat.monthlyBudget) * 100 : 0;
        return {
          ...cat,
          spent,
          percentOfBudget,
          percentOfSpend,
          categoryBudgetRate,
        };
      })
      .filter((c) => c.spent > 0)
      .sort((a, b) => b.spent - a.spent);

    return {
      monthName,
      totalSpent,
      cumulativeBudget,
      utilizationRate,
      remainingHeadroom,
      currentDay,
      totalDaysInMonth,
      daysRemaining,
      expectedElapsedRate,
      dailySafePace,
      healthStatus,
      statusLabel,
      statusDescription,
      categorySegments,
    };
  }, [transactions, categories, currency]);

  // Color theme per health status
  const getStatusBadgeClasses = () => {
    switch (stats.healthStatus) {
      case 'healthy':
        return 'border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300';
      case 'moderate':
        return 'border-blue-200 bg-blue-50/80 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300';
      case 'caution':
        return 'border-amber-200 bg-amber-50/80 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300';
      case 'critical':
      case 'exceeded':
        return 'border-rose-200 bg-rose-50/80 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300';
    }
  };

  const getUnifiedBarColor = () => {
    if (stats.utilizationRate > 100) return 'bg-rose-600';
    if (stats.utilizationRate >= 90) return 'bg-orange-500';
    if (stats.utilizationRate >= 75) return 'bg-amber-500';
    if (stats.utilizationRate >= 50) return 'bg-blue-600';
    return 'bg-emerald-500';
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
      {/* 1. Header & Status Badge */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Monthly Cumulative Budget Health
            </h3>
            <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
              ({stats.monthName})
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {stats.statusDescription}
          </p>
        </div>

        {/* Health Verdict Badge & View Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClasses()}`}
          >
            {stats.healthStatus === 'healthy' || stats.healthStatus === 'moderate' ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            <span>{stats.statusLabel}</span>
          </div>

          {/* Segmented vs Unified Toggle */}
          <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setDisplayMode('category_segments')}
              title="View by category contribution"
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                displayMode === 'category_segments'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                <span className="hidden sm:inline">Categories</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('unified')}
              title="View unified fill bar"
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                displayMode === 'unified'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <span className="hidden sm:inline">Unified</span>
              <span className="sm:hidden">Fill</span>
            </button>
          </div>

          {onNavigateToBudgets && (
            <button
              type="button"
              onClick={onNavigateToBudgets}
              className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/60 transition-colors"
              title="Change category monthly budget caps in the Budgets tab"
            >
              <span>Edit Caps ↗</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Visual Progress Bar Section */}
      <div className="mt-5 space-y-2">
        {/* Top Labels: Spend vs Total Cap */}
        <div className="flex items-baseline justify-between text-xs">
          <div className="flex items-baseline gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Total Spent:</span>
            <span className="font-mono text-base font-bold text-slate-900 tabular-nums dark:text-slate-100">
              {formatCurrency(stats.totalSpent, currency)}
            </span>
            <span className="font-mono text-xs font-medium text-slate-500 tabular-nums dark:text-slate-400">
              ({stats.utilizationRate.toFixed(1)}%)
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 text-right">
            <span className="text-slate-500 dark:text-slate-400">Cumulative Target:</span>
            <span className="font-mono text-sm font-semibold text-slate-800 tabular-nums dark:text-slate-200">
              {formatCurrency(stats.cumulativeBudget, currency)}
            </span>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="relative">
          {/* Main Track */}
          <div className="relative h-5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 shadow-inner dark:bg-slate-800">
            {displayMode === 'category_segments' ? (
              /* Multi-segment stacked category breakdown */
              <div className="flex h-full w-full overflow-hidden rounded-full">
                {stats.categorySegments.map((cat) => {
                  const isHovered = hoveredCategory === cat.id;
                  const isSelected = selectedCategory === cat.id;
                  // Percentage width of the bar (capped relative to 100% target or proportional)
                  const displayWidth = Math.min(
                    100,
                    stats.utilizationRate > 100
                      ? (cat.spent / stats.totalSpent) * 100
                      : cat.percentOfBudget
                  );

                  return (
                    <div
                      key={cat.id}
                      style={{
                        width: `${displayWidth}%`,
                        backgroundColor: cat.color,
                      }}
                      onMouseEnter={() => setHoveredCategory(cat.id)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onClick={() => onSelectCategory && onSelectCategory(isSelected ? null : cat.id)}
                      className={`h-full cursor-pointer transition-all duration-300 relative group ${
                        isHovered || isSelected ? 'brightness-110 ring-2 ring-white/60 dark:ring-black/60' : 'hover:brightness-105'
                      }`}
                      title={`${cat.name}: ${formatCurrency(cat.spent, currency)} (${cat.percentOfBudget.toFixed(1)}% of cumulative budget)`}
                    />
                  );
                })}

                {/* Over-budget overflow striped segment */}
                {stats.utilizationRate > 100 && (
                  <div
                    className="h-full bg-rose-600/90 animate-pulse"
                    style={{ width: `${Math.min(30, stats.utilizationRate - 100)}%` }}
                    title={`Over-budget excess: ${formatCurrency(stats.totalSpent - stats.cumulativeBudget, currency)}`}
                  />
                )}
              </div>
            ) : (
              /* Unified Progress Fill */
              <div
                style={{ width: `${Math.min(100, stats.utilizationRate)}%` }}
                className={`h-full rounded-full transition-all duration-500 ${getUnifiedBarColor()}`}
              />
            )}
          </div>

          {/* Benchmark Markers: 25%, 50%, 75%, 100% Target */}
          <div className="relative mt-1 flex justify-between text-[10px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
            <span>0%</span>
            <span className="hidden sm:inline">25%</span>
            <span>50%</span>
            <span className="hidden sm:inline">75%</span>
            <span className="font-semibold text-slate-600 dark:text-slate-400">100% Ceiling</span>
          </div>

          {/* Dynamic Day of Month Pace Indicator Marker */}
          <div
            style={{ left: `${Math.min(98, Math.max(2, stats.expectedElapsedRate))}%` }}
            className="pointer-events-none absolute -top-1 -bottom-4 z-10 flex flex-col items-center -translate-x-1/2"
            title={`Calendar Day ${stats.currentDay} of ${stats.totalDaysInMonth} (${stats.expectedElapsedRate.toFixed(0)}% elapsed)`}
          >
            <div className="h-7 w-0.5 bg-slate-900/50 dark:bg-slate-100/50 shadow-xs" />
            <div className="rounded bg-slate-900 px-1 py-0.5 text-[9px] font-mono font-medium text-white shadow-xs dark:bg-slate-100 dark:text-slate-900 mt-0.5">
              Day {stats.currentDay}
            </div>
          </div>
        </div>

        {/* Hovered Category Tooltip Banner (if user hovers any segment) */}
        {hoveredCategory && (
          <div className="mt-1 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs border border-slate-100 dark:bg-slate-800/60 dark:border-slate-800">
            {(() => {
              const cat = stats.categorySegments.find((c) => c.id === hoveredCategory);
              if (!cat) return null;
              return (
                <>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: cat.color }} />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.name}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {cat.percentOfSpend.toFixed(1)}% of total monthly spend
                    </span>
                  </div>
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatCurrency(cat.spent, currency)}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* 3. Snapshot Metrics Grid - 4 Essential Health Indicators */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* KPI 1: Budget Utilized */}
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/60 dark:bg-slate-800/40">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Budget Utilized</span>
            <DollarSign className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="mt-1 font-mono text-base font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
            {stats.utilizationRate.toFixed(1)}%
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>{stats.utilizationRate <= 100 ? 'Within ceiling' : 'Over limit'}</span>
          </div>
        </div>

        {/* KPI 2: Available Headroom / Deficit */}
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/60 dark:bg-slate-800/40">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Remaining Buffer</span>
            <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div
            className={`mt-1 font-mono text-base font-bold tracking-tight tabular-nums ${
              stats.remainingHeadroom >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {stats.remainingHeadroom >= 0
              ? `+${formatCurrency(stats.remainingHeadroom, currency)}`
              : `-${formatCurrency(Math.abs(stats.remainingHeadroom), currency)}`}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>{stats.remainingHeadroom >= 0 ? 'Surplus unspent' : 'Budget deficit'}</span>
          </div>
        </div>

        {/* KPI 3: Safe Daily Burn Rate */}
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/60 dark:bg-slate-800/40">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Daily Safe Limit</span>
            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="mt-1 font-mono text-base font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
            {formatCurrency(stats.dailySafePace, currency)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>For {stats.daysRemaining} remaining days</span>
          </div>
        </div>

        {/* KPI 4: Active Categories Contributing */}
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/60 dark:bg-slate-800/40">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Cumulative Budget</span>
            <Info className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-1 font-mono text-base font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
            {formatCurrency(stats.cumulativeBudget, currency)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Across {categories.length} category targets</span>
          </div>
        </div>
      </div>

      {/* 4. Category Contribution Chips / Legend Strip */}
      <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span>Active Category Outflows (click category to filter)</span>
          <span className="font-mono">{stats.categorySegments.length} categories active</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {stats.categorySegments.map((cat) => {
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory && onSelectCategory(isSelected ? null : cat.id)}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 font-semibold text-blue-900 dark:border-blue-400 dark:bg-blue-950/60 dark:text-blue-200'
                    : 'border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-xs shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="font-medium">{cat.name}</span>
                <span className="font-mono text-[11px] font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                  {formatCurrency(cat.spent, currency)}
                </span>
                {cat.categoryBudgetRate >= 100 ? (
                  <span className="rounded bg-rose-100 px-1 py-0.2 font-mono text-[9px] font-bold text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                    {cat.categoryBudgetRate.toFixed(0)}% Cap
                  </span>
                ) : cat.categoryBudgetRate >= 80 ? (
                  <span className="rounded bg-amber-100 px-1 py-0.2 font-mono text-[9px] font-bold text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
                    {cat.categoryBudgetRate.toFixed(0)}% Cap
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    ({cat.categoryBudgetRate.toFixed(0)}%)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
