import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Zap,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import {
  CategoryInfo,
  CurrencyConfig,
  RecurringTransaction,
  Subscription,
  Transaction,
} from '../../types';
import { formatCurrency, formatShortDate } from '../../utils/formatters';
import { getMonthlyEquivalent } from '../recurring/RecurringTransactionsModal';

interface FutureSpendingProjectionChartProps {
  transactions: Transaction[];
  categories: CategoryInfo[];
  subscriptions: Subscription[];
  recurringTransactions: RecurringTransaction[];
  currency: CurrencyConfig;
  onOpenRecurringModal?: () => void;
}

type ProjectionHorizon = '30d' | '60d' | '90d';
type ProjectionViewMode = 'cashflow' | 'outflow';

export const FutureSpendingProjectionChart: React.FC<FutureSpendingProjectionChartProps> = ({
  transactions,
  categories,
  subscriptions,
  recurringTransactions,
  currency,
  onOpenRecurringModal,
}) => {
  const [horizon, setHorizon] = useState<ProjectionHorizon>('30d');
  const [scenario, setScenario] = useState<'standard' | 'frugal' | 'elevated'>('standard');
  const [viewMode, setViewMode] = useState<ProjectionViewMode>('cashflow');

  // Compute total monthly budget target
  const monthlyBudgetTarget = useMemo(() => {
    return categories.reduce((sum, c) => sum + c.monthlyBudget, 0);
  }, [categories]);

  // Analyze active recurring transactions and historical daily burn velocity
  const analysis = useMemo(() => {
    const novExpenses = transactions.filter((t) => t.type === 'expense' && t.date.startsWith('2026-11'));
    const novIncomes = transactions.filter((t) => t.type === 'income' && t.date.startsWith('2026-11'));

    const totalNovSpent = novExpenses.reduce((sum, t) => sum + t.amount, 0);
    const totalNovIncome = novIncomes.reduce((sum, t) => sum + t.amount, 0);

    // Active subscriptions
    const activeSubs = subscriptions.filter((s) => s.active);
    const monthlySubTotal = activeSubs.reduce((sum, s) => {
      return sum + (s.billingCycle === 'monthly' ? s.amount : s.amount / 12);
    }, 0);

    // Active recurring rules (Salary, Retainer, Rent, Insurance, Utilities)
    const activeRecurring = recurringTransactions.filter((r) => r.active);
    const monthlyRecurringIncome = activeRecurring
      .filter((r) => r.type === 'income')
      .reduce((sum, r) => sum + getMonthlyEquivalent(r.amount, r.frequency), 0);
    const monthlyRecurringExpense = activeRecurring
      .filter((r) => r.type === 'expense')
      .reduce((sum, r) => sum + getMonthlyEquivalent(r.amount, r.frequency), 0);

    // Variable discretionary spend burn rate from October (baseline excluding fixed housing/recurring)
    const octExpenses = transactions.filter((t) => t.type === 'expense' && t.date.startsWith('2026-10'));
    const octDiscretionary = octExpenses
      .filter((t) => !t.isRecurring && t.category !== 'housing')
      .reduce((sum, t) => sum + t.amount, 0);
    const octDailyVariable = octDiscretionary / 31; // ~$45/day
    const estimatedDailyVariable = octDailyVariable > 0 ? octDailyVariable : 42.5;

    return {
      totalNovSpent,
      totalNovIncome,
      activeSubs,
      monthlySubTotal,
      activeRecurring,
      monthlyRecurringIncome,
      monthlyRecurringExpense,
      estimatedDailyVariable,
    };
  }, [transactions, subscriptions, recurringTransactions]);

  // Build projected day-by-day cash flow series
  const projectionData = useMemo(() => {
    const daysCount = horizon === '30d' ? 30 : horizon === '60d' ? 60 : 90;
    const startDate = new Date(2026, 10, 1); // Nov 1, 2026

    // Scenario multipliers on discretionary spend
    const variableMultiplier = scenario === 'frugal' ? 0.75 : scenario === 'elevated' ? 1.25 : 1.0;
    const dailyVariableSpend = analysis.estimatedDailyVariable * variableMultiplier;

    const data: {
      date: string;
      displayDate: string;
      actualSpend?: number;
      actualIncome?: number;
      projectedSpend: number;
      projectedIncome: number;
      netCashFlow: number;
      projectedLowerBand: number;
      projectedUpperBand: number;
      recurringOutflowAdded: number;
      recurringInflowAdded: number;
      recurringEventNames?: string;
      budgetThreshold: number;
      dayIndex: number;
    }[] = [];

    let runningProjectedExpense = 0;
    let runningProjectedIncome = 0;
    let runningLower = 0;
    let runningUpper = 0;

    for (let i = 0; i < daysCount; i++) {
      const curDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayOfMonth = curDate.getDate();
      const monthIndex = curDate.getMonth();
      const year = curDate.getFullYear();
      const dateString = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;

      let dayRecurringOutflow = 0;
      let dayRecurringInflow = 0;
      const dayEventNames: string[] = [];

      // Check recurring transactions
      analysis.activeRecurring.forEach((rule) => {
        let isMatch = false;
        if (rule.frequency === 'monthly') {
          const ruleDay = rule.dayOfMonth || 1;
          if (ruleDay === dayOfMonth) isMatch = true;
        } else if (rule.frequency === 'weekly') {
          // Weekly match day of week (e.g. Friday)
          if (curDate.getDay() === 5) isMatch = true;
        } else if (rule.frequency === 'biweekly') {
          if (dayOfMonth === 1 || dayOfMonth === 15) isMatch = true;
        }

        if (isMatch) {
          if (rule.type === 'income') {
            dayRecurringInflow += rule.amount;
            dayEventNames.push(`+${rule.name}`);
          } else {
            dayRecurringOutflow += rule.amount;
            dayEventNames.push(`-${rule.name}`);
          }
        }
      });

      // Check active subscriptions renewal
      analysis.activeSubs.forEach((sub) => {
        const subDate = new Date(sub.nextBillingDate);
        if (subDate.getDate() === dayOfMonth) {
          dayRecurringOutflow += sub.amount;
          dayEventNames.push(`-${sub.name}`);
        }
      });

      // Daily spend calculations
      const daySpendStandard = dailyVariableSpend + dayRecurringOutflow;
      const daySpendLower = dailyVariableSpend * 0.8 + dayRecurringOutflow;
      const daySpendUpper = dailyVariableSpend * 1.25 + dayRecurringOutflow;

      runningProjectedExpense += daySpendStandard;
      runningProjectedIncome += dayRecurringInflow;
      runningLower += daySpendLower;
      runningUpper += daySpendUpper;

      const isActualDay = i === 0;

      data.push({
        date: dateString,
        displayDate: formatShortDate(dateString),
        actualSpend: isActualDay ? analysis.totalNovSpent : undefined,
        actualIncome: isActualDay ? analysis.totalNovIncome : undefined,
        projectedSpend: Math.round(runningProjectedExpense),
        projectedIncome: Math.round(runningProjectedIncome),
        netCashFlow: Math.round(runningProjectedIncome - runningProjectedExpense),
        projectedLowerBand: Math.round(runningLower),
        projectedUpperBand: Math.round(runningUpper),
        recurringOutflowAdded: Math.round(dayRecurringOutflow),
        recurringInflowAdded: Math.round(dayRecurringInflow),
        recurringEventNames: dayEventNames.length > 0 ? dayEventNames.join(', ') : undefined,
        budgetThreshold: Math.round(monthlyBudgetTarget * (1 + i / 30)),
        dayIndex: i,
      });
    }

    return data;
  }, [horizon, scenario, analysis, monthlyBudgetTarget]);

  // Projected totals at horizon end
  const finalDay = projectionData[projectionData.length - 1];
  const projected30DaySpend = projectionData[Math.min(29, projectionData.length - 1)]?.projectedSpend || 0;
  const projected30DayIncome = projectionData[Math.min(29, projectionData.length - 1)]?.projectedIncome || 0;
  const projected30DayNet = projected30DayIncome - projected30DaySpend;
  const varianceVsBudget = monthlyBudgetTarget - projected30DaySpend;

  // Upcoming scheduled recurring events table in the next 30 days
  const upcomingEvents = useMemo(() => {
    return projectionData
      .slice(0, 30)
      .filter((d) => d.recurringOutflowAdded > 0 || d.recurringInflowAdded > 0)
      .map((d) => ({
        date: d.date,
        displayDate: d.displayDate,
        inflow: d.recurringInflowAdded,
        outflow: d.recurringOutflowAdded,
        description: d.recurringEventNames || 'Scheduled Recurring Event',
      }));
  }, [projectionData]);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Future Cash Flow & Runway Projections
            </h4>
            <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              Auto-Projected
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Forecasting monthly income, recurring commitments (salary, rent, insurance, subscriptions) and variable burn
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switch: Cash Flow vs Outflow */}
          <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('cashflow')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                viewMode === 'cashflow'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Cash Flow Runway
            </button>
            <button
              onClick={() => setViewMode('outflow')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                viewMode === 'outflow'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Cumulative Outflow
            </button>
          </div>

          {/* Horizon Selector */}
          <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            <button
              onClick={() => setHorizon('30d')}
              className={`rounded px-2 py-1 text-xs font-medium transition-all ${
                horizon === '30d'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setHorizon('60d')}
              className={`rounded px-2 py-1 text-xs font-medium transition-all ${
                horizon === '60d'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              60 Days
            </button>
            <button
              onClick={() => setHorizon('90d')}
              className={`rounded px-2 py-1 text-xs font-medium transition-all ${
                horizon === '90d'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              90 Days
            </button>
          </div>

          {/* Manage Recurring Rules Shortcut */}
          {onOpenRecurringModal && (
            <button
              onClick={onOpenRecurringModal}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <span>Define Rules ({analysis.activeRecurring.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Metric 1: Projected 30-Day Inflow */}
        <div className="rounded-lg bg-emerald-50/50 p-3 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-400">
            <span>Projected Monthly Inflow</span>
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <div className="mt-1 font-mono text-base font-bold text-emerald-700 tabular-nums dark:text-emerald-300">
            +{formatCurrency(projected30DayIncome, currency)}
          </div>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/70">
            Salary + Retainers ({analysis.activeRecurring.filter((r) => r.type === 'income').length} sources)
          </span>
        </div>

        {/* Metric 2: Projected 30-Day Outflow */}
        <div className="rounded-lg bg-rose-50/50 p-3 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
          <div className="flex items-center justify-between text-[11px] text-rose-800 dark:text-rose-400">
            <span>Projected Monthly Outflow</span>
            <TrendingDown className="h-3.5 w-3.5" />
          </div>
          <div className="mt-1 font-mono text-base font-bold text-rose-700 tabular-nums dark:text-rose-300">
            -{formatCurrency(projected30DaySpend, currency)}
          </div>
          <span className="text-[10px] text-rose-600/80 dark:text-rose-400/70">
            Rent, bills, subs & daily burn
          </span>
        </div>

        {/* Metric 3: Projected Net Cash Surplus */}
        <div className="rounded-lg bg-blue-50/50 p-3 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
          <div className="flex items-center justify-between text-[11px] text-blue-800 dark:text-blue-400">
            <span>Projected Net Surplus</span>
            <Wallet className="h-3.5 w-3.5" />
          </div>
          <div
            className={`mt-1 font-mono text-base font-bold tabular-nums ${
              projected30DayNet >= 0
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-rose-700 dark:text-rose-300'
            }`}
          >
            {projected30DayNet >= 0 ? '+' : ''}
            {formatCurrency(projected30DayNet, currency)}
          </div>
          <span className="text-[10px] text-blue-600/80 dark:text-blue-400/70">
            End-of-month cash surplus
          </span>
        </div>

        {/* Metric 4: Recurring Predictability Ratio */}
        <div className="rounded-lg bg-slate-50/70 p-3 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Budget Cap Headroom</span>
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div
            className={`mt-1 font-mono text-base font-bold tabular-nums ${
              varianceVsBudget >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {varianceVsBudget >= 0 ? '+' : ''}
            {formatCurrency(varianceVsBudget, currency)}
          </div>
          <span className="text-[10px] text-slate-400">
            vs {formatCurrency(monthlyBudgetTarget, currency)} ceiling
          </span>
        </div>
      </div>

      {/* Recharts Visualization */}
      <div className="mt-5 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={projectionData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="outflowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.2} vertical={false} />

            <XAxis
              dataKey="displayDate"
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1', strokeWidth: 1 }}
              interval={Math.floor(projectionData.length / 6)}
            />

            <YAxis
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => formatCurrency(val, currency, true)}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const point = payload[0]?.payload;
                if (!point) return null;

                return (
                  <div className="rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 max-w-xs">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 pb-1.5 dark:border-slate-800 flex justify-between">
                      <span>{point.date}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{point.displayDate}</span>
                    </div>

                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Projected Inflow:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          +{formatCurrency(point.projectedIncome, currency)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">Projected Outflow:</span>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                          -{formatCurrency(point.projectedSpend, currency)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1 dark:border-slate-800">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Net Balance:</span>
                        <span
                          className={`font-mono font-bold tabular-nums ${
                            point.netCashFlow >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {point.netCashFlow >= 0 ? '+' : ''}
                          {formatCurrency(point.netCashFlow, currency)}
                        </span>
                      </div>

                      {/* Scheduled recurring events details on this day */}
                      {(point.recurringInflowAdded > 0 || point.recurringOutflowAdded > 0) && (
                        <div className="mt-1 rounded bg-slate-100/90 p-2 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">Scheduled Recurring:</span>
                          <div className="mt-0.5 font-medium">{point.recurringEventNames}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />

            {viewMode === 'cashflow' ? (
              <>
                {/* Projected Inflow Area */}
                <Area
                  type="monotone"
                  dataKey="projectedIncome"
                  name="Projected Inflow (Salary/Income)"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#incomeGradient)"
                />

                {/* Projected Outflow Area */}
                <Area
                  type="monotone"
                  dataKey="projectedSpend"
                  name="Projected Outflow (Rent/Bills)"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={0.6}
                  fill="url(#outflowGradient)"
                />

                {/* Net Cash Flow Line */}
                <Line
                  type="monotone"
                  dataKey="netCashFlow"
                  name="Net Balance Runway"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  dot={false}
                />
              </>
            ) : (
              <>
                {/* Outflow Mode */}
                <Area
                  type="monotone"
                  dataKey="projectedSpend"
                  name="Projected Outflow"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#outflowGradient)"
                />

                <Line
                  type="monotone"
                  dataKey="projectedUpperBand"
                  name="Upper Burn (+25%)"
                  stroke="#94A3B8"
                  strokeDasharray="3 3"
                  strokeWidth={1.2}
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="projectedLowerBand"
                  name="Frugal Burn (-20%)"
                  stroke="#10B981"
                  strokeDasharray="2 2"
                  strokeWidth={1.2}
                  dot={false}
                />

                <ReferenceLine
                  y={monthlyBudgetTarget}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Budget Cap: ${formatCurrency(monthlyBudgetTarget, currency, true)}`,
                    position: 'insideTopLeft',
                    fill: '#EF4444',
                    fontSize: 11,
                  }}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          {viewMode === 'cashflow' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-4 rounded-full bg-emerald-500" />
                <span>Projected Inflow (Salary & Retainers)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-4 rounded-full bg-blue-500" />
                <span>Projected Outflow (Rent & Bills)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-purple-500" />
                <span>Net Cash Surplus Runway</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-4 rounded-full bg-blue-600" />
                <span>Expected Outflow</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 border-t border-dashed border-emerald-500" />
                <span>Strict Frugal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 border-t border-dashed border-red-500" />
                <span>Budget Cap</span>
              </div>
            </>
          )}
        </div>

        <div className="text-[11px] text-slate-400">
          Incorporates {analysis.activeRecurring.length} recurring rules and {analysis.activeSubs.length} active subscriptions
        </div>
      </div>

      {/* Scheduled Recurring Cash Flow Horizon Table */}
      {upcomingEvents.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2.5">
            <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Upcoming Scheduled Cash Flow Events (Next 30 Days)</span>
            </h5>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {upcomingEvents.length} scheduled occurrences
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.slice(0, 6).map((ev, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {ev.date} ({ev.displayDate})
                  </div>
                  <div className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                    {ev.description}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {ev.inflow > 0 && (
                    <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +{formatCurrency(ev.inflow, currency)}
                    </div>
                  )}
                  {ev.outflow > 0 && (
                    <div className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      -{formatCurrency(ev.outflow, currency)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
