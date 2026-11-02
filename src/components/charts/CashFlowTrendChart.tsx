import React, { useMemo, useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { CurrencyConfig, RecurringTransaction, Transaction } from '../../types';
import { formatCurrency, formatShortDate } from '../../utils/formatters';

interface CashFlowTrendChartProps {
  transactions: Transaction[];
  currency: CurrencyConfig;
  recurringTransactions?: RecurringTransaction[];
  onOpenRecurringModal?: () => void;
}

type Granularity = 'daily' | 'cumulative' | 'weekly' | 'projected';

export const CashFlowTrendChart: React.FC<CashFlowTrendChartProps> = ({
  transactions,
  currency,
  recurringTransactions = [],
  onOpenRecurringModal,
}) => {
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    expense: number;
    income: number;
    cumulativeExpense: number;
    net: number;
    isProjected?: boolean;
    recurringDetail?: string;
    x: number;
    y: number;
  } | null>(null);

  // Group and sort data points by date or compute projection
  const chartData = useMemo(() => {
    // If granularity is projected, project full November 2026 month
    if (granularity === 'projected') {
      const novExpenses = transactions.filter((t) => t.type === 'expense' && t.date.startsWith('2026-11'));
      const novIncomes = transactions.filter((t) => t.type === 'income' && t.date.startsWith('2026-11'));

      const day1Expense = novExpenses.reduce((sum, t) => sum + t.amount, 0);
      const day1Income = novIncomes.reduce((sum, t) => sum + t.amount, 0);

      // October baseline variable daily spend
      const octExpenses = transactions.filter((t) => t.type === 'expense' && t.date.startsWith('2026-10'));
      const octDiscretionary = octExpenses
        .filter((t) => !t.isRecurring && t.category !== 'housing')
        .reduce((sum, t) => sum + t.amount, 0);
      const dailyVariableSpend = octDiscretionary > 0 ? octDiscretionary / 31 : 42.5;

      const activeRules = recurringTransactions.filter((r) => r.active);

      const days: {
        date: string;
        expense: number;
        income: number;
        cumulativeExpense: number;
        cumulativeIncome: number;
        net: number;
        itemCount: number;
        isProjected: boolean;
        recurringDetail?: string;
      }[] = [];

      let runningExpense = 0;
      let runningIncome = 0;

      for (let day = 1; day <= 30; day++) {
        const dateStr = `2026-11-${String(day).padStart(2, '0')}`;
        let exp = 0;
        let inc = 0;
        let isProj = day > 1;
        const details: string[] = [];

        if (day === 1) {
          exp = day1Expense;
          inc = day1Income;
          details.push('Recorded Ledger Entries');
        } else {
          // Check recurring rules for this day
          activeRules.forEach((rule) => {
            if (rule.frequency === 'monthly' && (rule.dayOfMonth || 1) === day) {
              if (rule.type === 'income') {
                inc += rule.amount;
                details.push(`+${rule.name}`);
              } else {
                exp += rule.amount;
                details.push(`-${rule.name}`);
              }
            } else if (rule.frequency === 'biweekly' && (day === 1 || day === 15)) {
              if (rule.type === 'income') {
                inc += rule.amount;
                details.push(`+${rule.name}`);
              } else {
                exp += rule.amount;
                details.push(`-${rule.name}`);
              }
            }
          });

          // Add daily variable spend
          exp += dailyVariableSpend;
        }

        runningExpense += exp;
        runningIncome += inc;

        days.push({
          date: dateStr,
          expense: Math.round(exp),
          income: Math.round(inc),
          cumulativeExpense: Math.round(runningExpense),
          cumulativeIncome: Math.round(runningIncome),
          net: Math.round(runningIncome - runningExpense),
          itemCount: 1,
          isProjected: isProj,
          recurringDetail: details.length > 0 ? details.join(', ') : undefined,
        });
      }

      return days;
    }

    // Standard historical ledger modes
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    const dayMap = new Map<string, { expense: number; income: number; items: Transaction[] }>();

    sorted.forEach((t) => {
      const existing = dayMap.get(t.date) || { expense: 0, income: 0, items: [] };
      if (t.type === 'expense') {
        existing.expense += t.amount;
      } else {
        existing.income += t.amount;
      }
      existing.items.push(t);
      dayMap.set(t.date, existing);
    });

    if (dayMap.size === 0) return [];

    const sortedDays = Array.from(dayMap.keys()).sort();
    let runningExpense = 0;
    let runningIncome = 0;

    const points = sortedDays.map((date) => {
      const entry = dayMap.get(date)!;
      runningExpense += entry.expense;
      runningIncome += entry.income;

      return {
        date,
        expense: entry.expense,
        income: entry.income,
        cumulativeExpense: runningExpense,
        cumulativeIncome: runningIncome,
        net: entry.income - entry.expense,
        itemCount: entry.items.length,
        isProjected: false,
      };
    });

    if (granularity === 'weekly' && points.length > 7) {
      const weekly: typeof points = [];
      for (let i = 0; i < points.length; i += 7) {
        const slice = points.slice(i, i + 7);
        const expSum = slice.reduce((acc, p) => acc + p.expense, 0);
        const incSum = slice.reduce((acc, p) => acc + p.income, 0);
        const lastPt = slice[slice.length - 1];
        weekly.push({
          date: `Week of ${formatShortDate(slice[0].date)}`,
          expense: expSum,
          income: incSum,
          cumulativeExpense: lastPt.cumulativeExpense,
          cumulativeIncome: lastPt.cumulativeIncome,
          net: incSum - expSum,
          itemCount: slice.reduce((acc, p) => acc + p.itemCount, 0),
          isProjected: false,
        });
      }
      return weekly;
    }

    return points;
  }, [transactions, granularity, recurringTransactions]);

  // Chart dimensions & scaling
  const width = 800;
  const height = 280;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };

  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;

  const maxVal = useMemo(() => {
    if (chartData.length === 0) return 100;
    if (granularity === 'cumulative' || granularity === 'projected') {
      const maxExp = Math.max(...chartData.map((d) => d.cumulativeExpense), 1);
      const maxInc = Math.max(...chartData.map((d) => d.cumulativeIncome), 1);
      return Math.max(maxExp, maxInc) * 1.1;
    }
    const maxExp = Math.max(...chartData.map((d) => d.expense), 1);
    const maxInc = Math.max(...chartData.map((d) => d.income), 1);
    return Math.max(maxExp, maxInc) * 1.15;
  }, [chartData, granularity]);

  const avgExpense = useMemo(() => {
    if (chartData.length === 0) return 0;
    const totalExp = chartData.reduce((acc, d) => acc + d.expense, 0);
    return totalExp / chartData.length;
  }, [chartData]);

  // Coordinate transforms
  const getX = (index: number) => {
    if (chartData.length <= 1) return padding.left + usableWidth / 2;
    return padding.left + (index / (chartData.length - 1)) * usableWidth;
  };

  const getY = (value: number) => {
    const clamped = Math.max(0, value);
    return padding.top + usableHeight - (clamped / maxVal) * usableHeight;
  };

  // Generate SVG path strings
  const expensePath = useMemo(() => {
    if (chartData.length === 0) return '';
    return chartData.reduce((acc, d, i) => {
      const val = granularity === 'cumulative' || granularity === 'projected' ? d.cumulativeExpense : d.expense;
      const x = getX(i);
      const y = getY(val);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [chartData, granularity, maxVal]);

  const expenseAreaPath = useMemo(() => {
    if (chartData.length === 0) return '';
    const firstX = getX(0);
    const lastX = getX(chartData.length - 1);
    const bottomY = padding.top + usableHeight;
    return `${expensePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [expensePath, chartData, usableHeight]);

  const incomePath = useMemo(() => {
    if (chartData.length === 0) return '';
    return chartData.reduce((acc, d, i) => {
      const val = granularity === 'cumulative' || granularity === 'projected' ? d.cumulativeIncome : d.income;
      const x = getX(i);
      const y = getY(val);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [chartData, granularity, maxVal]);

  // Tick marks
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((ratio) => ({
    val: ratio * maxVal,
    y: padding.top + usableHeight - ratio * usableHeight,
  }));

  const xTickIndices = useMemo(() => {
    if (chartData.length <= 6) return chartData.map((_, i) => i);
    const step = Math.floor(chartData.length / 5);
    const indices = [0];
    for (let i = step; i < chartData.length - 1; i += step) {
      indices.push(i);
    }
    indices.push(chartData.length - 1);
    return Array.from(new Set(indices));
  }, [chartData]);

  // Projection end of month metrics
  const lastProjectedPoint = chartData[chartData.length - 1];

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Cash Flow Trend & Trajectory
            </h3>
            {granularity === 'projected' && (
              <span className="flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                <Sparkles className="h-3 w-3" />
                <span>Auto-Projected</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {granularity === 'projected'
              ? 'Monthly cash flow forecast factoring in recurring salary, rent, bills, and burn rate'
              : 'Daily capital movement, income inflows, and cumulative spend trajectory'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Granularity segmented buttons */}
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setGranularity('daily')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                granularity === 'daily'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setGranularity('weekly')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                granularity === 'weekly'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setGranularity('cumulative')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                granularity === 'cumulative'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Cumulative
            </button>
            <button
              onClick={() => setGranularity('projected')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                granularity === 'projected'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Projected
            </button>
          </div>
        </div>
      </div>

      {/* Projection summary KPI strip when projected mode is active */}
      {granularity === 'projected' && lastProjectedPoint && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 rounded-lg border border-blue-100 bg-blue-50/40 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-900 dark:text-blue-300 font-medium">Month-End Inflow:</span>
            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{formatCurrency(lastProjectedPoint.cumulativeIncome, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-900 dark:text-blue-300 font-medium">Month-End Outflow:</span>
            <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              -{formatCurrency(lastProjectedPoint.cumulativeExpense, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-900 dark:text-blue-300 font-medium">Projected Net Surplus:</span>
            <span
              className={`font-mono text-xs font-bold tabular-nums ${
                lastProjectedPoint.net >= 0
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-rose-700 dark:text-rose-300'
              }`}
            >
              {lastProjectedPoint.net >= 0 ? '+' : ''}
              {formatCurrency(lastProjectedPoint.net, currency)}
            </span>
          </div>
        </div>
      )}

      {/* SVG Canvas Container */}
      <div className="relative w-full overflow-hidden rounded-xl border border-slate-200/80 bg-white p-2 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full select-none"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={width - padding.right}
                y2={tick.y}
                stroke="#E2E8F0"
                strokeDasharray="3 3"
                className="dark:stroke-slate-800"
              />
              <text
                x={padding.left - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-slate-400 font-mono text-[10px] tabular-nums dark:fill-slate-500"
              >
                {formatCurrency(tick.val, currency, true)}
              </text>
            </g>
          ))}

          {/* Daily average horizontal marker (only in daily view) */}
          {granularity === 'daily' && avgExpense > 0 && (
            <g>
              <line
                x1={padding.left}
                y1={getY(avgExpense)}
                x2={width - padding.right}
                y2={getY(avgExpense)}
                stroke="#94A3B8"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
            </g>
          )}

          {/* Expense Area & Line */}
          <path d={expenseAreaPath} fill="url(#expenseGradient)" />
          <path
            d={expensePath}
            fill="none"
            stroke="#2563EB"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Income Line */}
          <path
            d={incomePath}
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
            strokeDasharray={granularity === 'cumulative' || granularity === 'projected' ? 'none' : '4 3'}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />

          {/* Data Points & Interactive hover zones */}
          {chartData.map((d, i) => {
            const expVal = granularity === 'cumulative' || granularity === 'projected' ? d.cumulativeExpense : d.expense;
            const x = getX(i);
            const yExp = getY(expVal);

            return (
              <g key={i}>
                {/* Dot for significant expense */}
                {expVal > 0 && (
                  <circle
                    cx={x}
                    cy={yExp}
                    r={hoveredPoint?.date === d.date ? 5 : 3}
                    className="fill-white stroke-blue-600 transition-all dark:fill-slate-900"
                    strokeWidth="2"
                  />
                )}

                {/* Vertical hit zone */}
                <rect
                  x={x - usableWidth / (chartData.length * 2)}
                  y={padding.top}
                  width={usableWidth / chartData.length}
                  height={usableHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => {
                    setHoveredPoint({
                      date: d.date,
                      expense: d.expense,
                      income: d.income,
                      cumulativeExpense: d.cumulativeExpense,
                      net: d.net,
                      isProjected: d.isProjected,
                      recurringDetail: (d as any).recurringDetail,
                      x,
                      y: yExp,
                    });
                  }}
                />
              </g>
            );
          })}

          {/* Active Hover Crosshair Line */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={padding.top}
                x2={hoveredPoint.x}
                y2={padding.top + usableHeight}
                stroke="#64748B"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.7"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="6"
                className="fill-blue-600 stroke-white stroke-2 shadow-md dark:stroke-slate-900"
              />
            </g>
          )}

          {/* X-axis labels */}
          {xTickIndices.map((idx) => {
            const d = chartData[idx];
            if (!d) return null;
            return (
              <text
                key={idx}
                x={getX(idx)}
                y={height - 12}
                textAnchor="middle"
                className="fill-slate-400 font-mono text-[10px] tabular-nums dark:fill-slate-500"
              >
                {formatShortDate(d.date)}
              </text>
            );
          })}
        </svg>

        {/* Floating Tooltip Card */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-20 w-52 -translate-x-1/2 rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${Math.max(10, (hoveredPoint.y / height) * 100 - 35)}%`,
            }}
          >
            <div className="border-b border-slate-100 pb-1.5 dark:border-slate-800 flex justify-between items-center">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {hoveredPoint.date}
              </span>
              {hoveredPoint.isProjected ? (
                <span className="text-[10px] text-blue-600 font-medium dark:text-blue-400">
                  Projected
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">Recorded</span>
              )}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Expense:</span>
                <span className="font-mono font-semibold text-blue-600 tabular-nums dark:text-blue-400">
                  {formatCurrency(hoveredPoint.expense, currency)}
                </span>
              </div>
              {hoveredPoint.income > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Income:</span>
                  <span className="font-mono font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                    +{formatCurrency(hoveredPoint.income, currency)}
                  </span>
                </div>
              )}
              {(granularity === 'cumulative' || granularity === 'projected') && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <span>Net Balance:</span>
                  <span
                    className={`font-mono tabular-nums font-semibold ${
                      hoveredPoint.net >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {hoveredPoint.net >= 0 ? '+' : ''}
                    {formatCurrency(hoveredPoint.net, currency)}
                  </span>
                </div>
              )}
              {hoveredPoint.recurringDetail && (
                <div className="mt-1 rounded bg-slate-100 p-1.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {hoveredPoint.recurringDetail}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-5 rounded-full bg-blue-600" />
            <span>Expenditure</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-5 border-t-2 border-dashed border-emerald-500" />
            <span>Income Inflow</span>
          </div>
          {granularity === 'daily' && (
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-5 border-t border-dashed border-slate-400" />
              <span>Daily Average</span>
            </div>
          )}
        </div>

        {onOpenRecurringModal && (
          <button
            onClick={onOpenRecurringModal}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Manage Recurring Transactions</span>
          </button>
        )}
      </div>
    </div>
  );
};
