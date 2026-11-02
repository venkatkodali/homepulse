import React, { useState, useMemo } from 'react';
import {
  Landmark,
  CreditCard,
  Plus,
  TrendingDown,
  ShieldCheck,
  Scale,
  Sparkles,
  ArrowRight,
  Sliders,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Calendar,
  PiggyBank,
} from 'lucide-react';
import { CurrencyConfig, DebtItem, DebtType, SavingsGoal, Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { AddEditDebtModal } from '../modals/AddEditDebtModal';

interface DebtsViewProps {
  debts: DebtItem[];
  savingsGoals: SavingsGoal[];
  transactions: Transaction[];
  currency: CurrencyConfig;
  onAddDebt: (debt: Omit<DebtItem, 'id'>) => void;
  onUpdateDebt: (debt: DebtItem) => void;
  onDeleteDebt: (id: string) => void;
  onMakePayment: (debtId: string, amount: number, recordAsExpense: boolean, debtName: string) => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  debts,
  savingsGoals,
  currency,
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt,
  onMakePayment,
}) => {
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);

  // Quick Pay Modal State
  const [quickPayDebt, setQuickPayDebt] = useState<DebtItem | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [recordAsExpense, setRecordAsExpense] = useState<boolean>(true);

  // Filters & Strategy state
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit_card' | 'loans'>('all');
  const [sortBy, setSortBy] = useState<'apr_desc' | 'balance_asc' | 'balance_desc' | 'name'>('apr_desc');
  const [payoffStrategy, setPayoffStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState<number>(200);

  // Core metrics calculation
  const totalDebt = useMemo(() => debts.reduce((sum, d) => sum + d.balance, 0), [debts]);
  const totalOriginal = useMemo(() => debts.reduce((sum, d) => sum + (d.originalAmount || d.balance), 0), [debts]);
  const totalPaidOff = Math.max(0, totalOriginal - totalDebt);
  const overallPaidPercentage = totalOriginal > 0 ? (totalPaidOff / totalOriginal) * 100 : 0;

  const totalMinPayment = useMemo(() => debts.reduce((sum, d) => sum + d.minPayment, 0), [debts]);

  const weightedApr = useMemo(() => {
    if (totalDebt === 0) return 0;
    const weightedSum = debts.reduce((sum, d) => sum + d.balance * d.interestRate, 0);
    return weightedSum / totalDebt;
  }, [debts, totalDebt]);

  // Savings calculation
  const totalSavings = useMemo(() => {
    return savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  }, [savingsGoals]);

  const netWorthPosition = totalSavings - totalDebt;
  const coverageRatio = totalDebt > 0 ? (totalSavings / totalDebt) * 100 : 100;
  const debtToSavingsMultiple = totalSavings > 0 ? totalDebt / totalSavings : totalDebt > 0 ? 999 : 0;

  // Filter and sort debts
  const filteredDebts = useMemo(() => {
    let result = [...debts];

    if (typeFilter === 'credit_card') {
      result = result.filter((d) => d.type === 'credit_card');
    } else if (typeFilter === 'loans') {
      result = result.filter((d) => d.type !== 'credit_card');
    }

    result.sort((a, b) => {
      if (sortBy === 'apr_desc') return b.interestRate - a.interestRate;
      if (sortBy === 'balance_asc') return a.balance - b.balance;
      if (sortBy === 'balance_desc') return b.balance - a.balance;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [debts, typeFilter, sortBy]);

  // Strategy prioritization target
  const prioritizedDebt = useMemo(() => {
    const active = debts.filter((d) => d.balance > 0);
    if (active.length === 0) return null;

    if (payoffStrategy === 'avalanche') {
      // Highest APR first
      return [...active].sort((a, b) => b.interestRate - a.interestRate)[0];
    } else {
      // Lowest balance first (Snowball)
      return [...active].sort((a, b) => a.balance - b.balance)[0];
    }
  }, [debts, payoffStrategy]);

  // Payoff Timeline Estimation (Simplified Amortization Model)
  const simulation = useMemo(() => {
    if (totalDebt <= 0) {
      return {
        baselineMonths: 0,
        acceleratedMonths: 0,
        interestSaved: 0,
        baselineTotalInterest: 0,
        acceleratedTotalInterest: 0,
      };
    }

    const baselineMonthlyTotal = totalMinPayment;
    const acceleratedMonthlyTotal = totalMinPayment + extraMonthlyPayment;

    const simulateSchedule = (monthlyBudget: number) => {
      // Clone debt list
      const accounts = debts
        .filter((d) => d.balance > 0)
        .map((d) => ({
          balance: d.balance,
          rate: d.interestRate / 100 / 12,
          minPayment: d.minPayment,
        }));

      if (accounts.length === 0) return { months: 0, totalInterest: 0 };

      let months = 0;
      let totalInterest = 0;
      const maxMonths = 360; // 30 years safety cap

      while (months < maxMonths) {
        let remainingBalance = 0;
        let accruedInterestThisMonth = 0;

        // Accrue interest and pay minimums
        for (const acc of accounts) {
          if (acc.balance > 0) {
            const interest = acc.balance * acc.rate;
            accruedInterestThisMonth += interest;
            acc.balance += interest;
            remainingBalance += acc.balance;
          }
        }

        totalInterest += accruedInterestThisMonth;
        if (remainingBalance <= 0) break;

        // Apply payments
        let availableCash = monthlyBudget;

        // 1. Pay minimums
        for (const acc of accounts) {
          if (acc.balance > 0) {
            const pay = Math.min(acc.balance, acc.minPayment);
            acc.balance -= pay;
            availableCash -= pay;
          }
        }

        // 2. Direct extra cash to focus account according to strategy
        if (availableCash > 0) {
          // Find priority account
          let target = accounts.find((a) => a.balance > 0);
          if (payoffStrategy === 'avalanche') {
            // highest rate
            target = accounts
              .filter((a) => a.balance > 0)
              .sort((a, b) => b.rate - a.rate)[0];
          } else {
            // lowest balance
            target = accounts
              .filter((a) => a.balance > 0)
              .sort((a, b) => a.balance - b.balance)[0];
          }

          if (target) {
            const extraPay = Math.min(target.balance, availableCash);
            target.balance -= extraPay;
          }
        }

        months++;
        const activeCount = accounts.filter((a) => a.balance > 0.01).length;
        if (activeCount === 0) break;
      }

      return { months, totalInterest };
    };

    const baseline = simulateSchedule(Math.max(totalMinPayment, totalDebt * 0.02));
    const accelerated = simulateSchedule(Math.max(acceleratedMonthlyTotal, totalMinPayment + 10));

    const interestSaved = Math.max(0, baseline.totalInterest - accelerated.totalInterest);

    return {
      baselineMonths: baseline.months,
      acceleratedMonths: accelerated.months,
      interestSaved,
      baselineTotalInterest: baseline.totalInterest,
      acceleratedTotalInterest: accelerated.totalInterest,
    };
  }, [totalDebt, totalMinPayment, extraMonthlyPayment, debts, payoffStrategy]);

  // Quick payment submit handler
  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPayDebt) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) return;

    onMakePayment(quickPayDebt.id, amount, recordAsExpense, quickPayDebt.name);
    setQuickPayDebt(null);
    setPayAmount('');
  };

  const getDebtTypeLabel = (type: DebtType) => {
    switch (type) {
      case 'credit_card':
        return 'Credit Card';
      case 'auto_loan':
        return 'Auto Loan';
      case 'student_loan':
        return 'Student Loan';
      case 'mortgage':
        return 'Mortgage';
      case 'personal_loan':
        return 'Personal Loan';
      case 'medical':
        return 'Medical';
      default:
        return 'Other Loan';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Debts & Liabilities
            </h1>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {debts.length} active
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Track loan balances, credit card APRs, payoff timeline simulations, and your net debt-to-savings position.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingDebt(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Add Debt Account</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {/* Total Debt */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Total Outstanding Debt</span>
            <Landmark className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {formatCurrency(totalDebt, currency)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums">{overallPaidPercentage.toFixed(0)}%</span>
            <span>of original paid down</span>
          </div>
        </div>

        {/* Weighted APR */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Weighted Avg APR</span>
            <TrendingDown className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {weightedApr.toFixed(2)}%
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Across {debts.length} active balances
          </div>
        </div>

        {/* Total Min Payments */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Min Monthly Commitment</span>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {formatCurrency(totalMinPayment, currency)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Mandatory monthly payment
          </div>
        </div>

        {/* Total Savings */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Total Liquid Savings</span>
            <PiggyBank className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalSavings, currency)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Across {savingsGoals.length} savings goals
          </div>
        </div>

        {/* Net Financial Position */}
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-1 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Net Balance (Savings - Debt)</span>
            <Scale className="h-4 w-4 text-indigo-500" />
          </div>
          <div
            className={`mt-2 text-xl font-bold font-mono tabular-nums ${
              netWorthPosition >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {netWorthPosition >= 0 ? '+' : ''}
            {formatCurrency(netWorthPosition, currency)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {coverageRatio >= 100
              ? 'Reserves exceed total debt'
              : `${coverageRatio.toFixed(1)}% liability coverage`}
          </div>
        </div>
      </div>

      {/* 3. VISUAL SUMMARY OF TOTAL DEBT VERSUS SAVINGS */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Visual Summary: Total Debt vs. Savings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comparative solvency overview comparing liquid savings against aggregate outstanding liabilities.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                coverageRatio >= 100
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : coverageRatio >= 50
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>
                {coverageRatio >= 100
                  ? 'Fully Backed by Savings'
                  : `${coverageRatio.toFixed(0)}% Debt Covered by Reserves`}
              </span>
            </span>
          </div>
        </div>

        {/* Comparative Balance Visualization */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Visual Stacked / Proportional Bar Indicator */}
          <div className="space-y-4 md:col-span-7">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Capital Allocation Proportion
                </span>
                <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  Total Exposure: {formatCurrency(totalDebt + totalSavings, currency)}
                </span>
              </div>

              {/* Dual Proportional Gauge Bar */}
              <div className="mt-2.5 flex h-6 w-full overflow-hidden rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                <div
                  style={{
                    width: `${
                      totalDebt + totalSavings > 0
                        ? (totalDebt / (totalDebt + totalSavings)) * 100
                        : 50
                    }%`,
                  }}
                  className="flex items-center justify-start rounded-l-md bg-rose-500 px-2 text-[10px] font-semibold text-white transition-all duration-500 truncate"
                  title={`Debt: ${formatCurrency(totalDebt, currency)}`}
                >
                  {totalDebt > 0 && (
                    <span className="truncate">
                      Debt ({((totalDebt / (totalDebt + totalSavings || 1)) * 100).toFixed(0)}%)
                    </span>
                  )}
                </div>
                <div
                  style={{
                    width: `${
                      totalDebt + totalSavings > 0
                        ? (totalSavings / (totalDebt + totalSavings)) * 100
                        : 50
                    }%`,
                  }}
                  className="flex items-center justify-end rounded-r-md bg-emerald-500 px-2 text-[10px] font-semibold text-white transition-all duration-500 truncate"
                  title={`Savings: ${formatCurrency(totalSavings, currency)}`}
                >
                  {totalSavings > 0 && (
                    <span className="truncate">
                      Savings ({((totalSavings / (totalDebt + totalSavings || 1)) * 100).toFixed(0)}%)
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" />
                  <span>Liabilities ({formatCurrency(totalDebt, currency)})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
                  <span>Liquid Savings ({formatCurrency(totalSavings, currency)})</span>
                </div>
              </div>
            </div>

            {/* Direct Side-by-Side Comparison Columns */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-3 dark:border-rose-900/30 dark:bg-rose-950/20">
                <div className="text-xs font-medium text-rose-800 dark:text-rose-300">
                  Total Outstanding Debt
                </div>
                <div className="mt-1 text-lg font-bold font-mono tabular-nums text-rose-700 dark:text-rose-400">
                  {formatCurrency(totalDebt, currency)}
                </div>
                <div className="mt-1 text-[11px] text-rose-600/80 dark:text-rose-400/80">
                  {debts.filter((d) => d.type === 'credit_card').length} credit cards,{' '}
                  {debts.filter((d) => d.type !== 'credit_card').length} installment loans
                </div>
              </div>

              <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                <div className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  Total Liquid Savings
                </div>
                <div className="mt-1 text-lg font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(totalSavings, currency)}
                </div>
                <div className="mt-1 text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                  Across {savingsGoals.length} dedicated reserve accounts
                </div>
              </div>
            </div>
          </div>

          {/* Ratio & Solvency Diagnostics */}
          <div className="flex flex-col justify-between rounded-lg border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/40 md:col-span-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Solvency Diagnostic
                </span>
                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                  {debtToSavingsMultiple > 50
                    ? '>10x'
                    : `${debtToSavingsMultiple.toFixed(2)}x Debt/Savings`}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                  <span>
                    Your liquid cash reserves cover{' '}
                    <strong className="text-slate-900 dark:text-slate-100 font-mono">
                      {coverageRatio.toFixed(1)}%
                    </strong>{' '}
                    of your current debts.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <DollarSign className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>
                    Monthly interest burden is estimated at approx.{' '}
                    <strong className="text-slate-900 dark:text-slate-100 font-mono">
                      {formatCurrency((totalDebt * (weightedApr / 100)) / 12, currency)}
                    </strong>
                    /month.
                  </span>
                </div>
                {netWorthPosition < 0 ? (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                    <span>
                      Deficit gap of{' '}
                      <strong className="font-mono text-slate-900 dark:text-slate-100">
                        {formatCurrency(Math.abs(netWorthPosition), currency)}
                      </strong>{' '}
                      needed to reach zero net debt.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                    <span>
                      Net positive surplus of{' '}
                      <strong className="font-mono text-slate-900 dark:text-slate-100">
                        {formatCurrency(netWorthPosition, currency)}
                      </strong>{' '}
                      beyond all debts.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] text-slate-500 dark:text-slate-400">
              Tip: Paying down debt with interest rates above 7% typically yields higher effective returns than standard savings accounts.
            </div>
          </div>
        </div>
      </section>

      {/* 4. Payoff Strategy Simulator (Avalanche vs. Snowball) */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Payoff Strategy Simulator
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Simulate Avalanche (minimizes interest) vs Snowball (quickest account closures) with extra monthly paydowns.
            </p>
          </div>

          {/* Strategy segmented buttons */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={() => setPayoffStrategy('avalanche')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                payoffStrategy === 'avalanche'
                  ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Debt Avalanche (Highest APR)
            </button>
            <button
              onClick={() => setPayoffStrategy('snowball')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                payoffStrategy === 'snowball'
                  ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Debt Snowball (Lowest Balance)
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Simulation controls */}
          <div className="space-y-4 lg:col-span-5">
            <div>
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Extra Monthly Payment Above Minimums
                </label>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  +{formatCurrency(extraMonthlyPayment, currency)}/mo
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                step="25"
                value={extraMonthlyPayment}
                onChange={(e) => setExtraMonthlyPayment(Number(e.target.value))}
                className="mt-2 w-full accent-blue-600"
              />
              <div className="mt-1 flex justify-between text-[11px] font-mono text-slate-400">
                <span>$0</span>
                <span>$250</span>
                <span>$500</span>
                <span>$1,000</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 dark:text-slate-400">Quick set:</span>
              {[50, 100, 250, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setExtraMonthlyPayment(amt)}
                  className={`rounded-md border px-2 py-0.5 font-mono text-xs ${
                    extraMonthlyPayment === amt
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  +${amt}
                </button>
              ))}
            </div>

            {/* Active Strategy explanation */}
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
              {payoffStrategy === 'avalanche' ? (
                <p>
                  <strong>Avalanche Strategy:</strong> Directs all extra cash to the account with the highest APR first ({prioritizedDebt?.name} @ {prioritizedDebt?.interestRate}%). This is mathematically optimal, saving the maximum amount of interest.
                </p>
              ) : (
                <p>
                  <strong>Snowball Strategy:</strong> Directs all extra cash to the account with the lowest remaining balance ({prioritizedDebt?.name} @ {formatCurrency(prioritizedDebt?.balance || 0, currency)}). This delivers quick psychological wins by clearing entire accounts sooner.
                </p>
              )}
            </div>
          </div>

          {/* Simulation Outcome Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-7">
            {/* Payoff Timeline acceleration */}
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/30 dark:bg-blue-950/20">
              <div className="text-xs font-medium text-blue-900 dark:text-blue-300">
                Accelerated Debt-Free Timeline
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-blue-700 dark:text-blue-400">
                {simulation.acceleratedMonths} Months
              </div>
              <div className="mt-1 text-xs text-blue-800/80 dark:text-blue-300/80">
                {simulation.baselineMonths > simulation.acceleratedMonths ? (
                  <span>
                    Saves{' '}
                    <strong className="font-semibold">
                      {simulation.baselineMonths - simulation.acceleratedMonths} months
                    </strong>{' '}
                    compared to minimum payments ({simulation.baselineMonths} mo)
                  </span>
                ) : (
                  <span>Based on current minimum payments</span>
                )}
              </div>
            </div>

            {/* Interest Saved */}
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
              <div className="text-xs font-medium text-emerald-900 dark:text-emerald-300">
                Estimated Interest Saved
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                {formatCurrency(simulation.interestSaved, currency)}
              </div>
              <div className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80">
                By contributing +{formatCurrency(extraMonthlyPayment, currency)} extra each month
              </div>
            </div>

            {/* Next Priority Focus Target */}
            {prioritizedDebt && (
              <div className="col-span-1 rounded-lg border border-slate-200 bg-white p-3 sm:col-span-2 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Recommended Primary Target Account
                  </span>
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                    Priority Focus #1
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {prioritizedDebt.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {prioritizedDebt.lender} · {prioritizedDebt.interestRate}% APR · Due {prioritizedDebt.dueDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
                      {formatCurrency(prioritizedDebt.balance, currency)}
                    </div>
                    <button
                      onClick={() => {
                        setQuickPayDebt(prioritizedDebt);
                        setPayAmount((prioritizedDebt.minPayment + extraMonthlyPayment).toString());
                      }}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <span>Pay Priority</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Debts Accounts List & Filter Controls */}
      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          {/* Segmented Filter */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => setTypeFilter('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              All Debts ({debts.length})
            </button>
            <button
              onClick={() => setTypeFilter('credit_card')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === 'credit_card'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Credit Cards ({debts.filter((d) => d.type === 'credit_card').length})
            </button>
            <button
              onClick={() => setTypeFilter('loans')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === 'loans'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Loans & Mortgages ({debts.filter((d) => d.type !== 'credit_card').length})
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="apr_desc">Highest APR %</option>
              <option value="balance_asc">Lowest Balance First</option>
              <option value="balance_desc">Highest Balance First</option>
              <option value="name">Account Name</option>
            </select>
          </div>
        </div>

        {/* Debts Grid */}
        {filteredDebts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
            <Landmark className="h-10 w-10 text-slate-400 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              No debt accounts found
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm dark:text-slate-400">
              {typeFilter !== 'all'
                ? 'No debts match the selected filter category.'
                : 'All liabilities and loans have been paid off or no accounts have been recorded yet.'}
            </p>
            <button
              onClick={() => {
                setEditingDebt(null);
                setIsAddModalOpen(true);
              }}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
            >
              Add First Debt
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredDebts.map((debt) => {
              const paidAmount = Math.max(0, debt.originalAmount - debt.balance);
              const progressPct =
                debt.originalAmount > 0
                  ? Math.min(100, Math.max(0, (paidAmount / debt.originalAmount) * 100))
                  : 0;
              const isHighApr = debt.interestRate >= 15;
              const isZeroApr = debt.interestRate === 0;

              return (
                <div
                  key={debt.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    {/* Top row: Name, Lender & APR */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            {debt.name}
                          </h3>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{debt.lender}</span>
                          <span aria-hidden="true">·</span>
                          <span>{getDebtTypeLabel(debt.type)}</span>
                        </div>
                      </div>

                      {/* Interest Rate Badge */}
                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold ${
                          isZeroApr
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : isHighApr
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        {debt.interestRate.toFixed(2)}% APR
                      </span>
                    </div>

                    {/* Balance & Progress */}
                    <div className="mt-4">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Current Balance
                        </span>
                        <div className="text-right">
                          <span className="font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                            {formatCurrency(debt.balance, currency)}
                          </span>
                          <span className="ml-1 text-xs font-mono text-slate-400">
                            / {formatCurrency(debt.originalAmount, currency)}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar towards payoff */}
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          style={{ width: `${progressPct}%` }}
                          className={`h-full transition-all duration-300 ${
                            progressPct >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}
                        />
                      </div>

                      <div className="mt-1.5 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{progressPct.toFixed(0)}% paid down</span>
                        <span className="font-mono">
                          {formatCurrency(paidAmount, currency)} cleared
                        </span>
                      </div>
                    </div>

                    {/* Metadata details row */}
                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-slate-800/50">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Min Payment</span>
                        <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {formatCurrency(debt.minPayment, currency)}/mo
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Billing Cycle</span>
                        <div className="flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{debt.dueDate || '15th'}</span>
                        </div>
                      </div>
                    </div>

                    {debt.notes && (
                      <p className="mt-2.5 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
                        {debt.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                    <button
                      onClick={() => setEditingDebt(debt)}
                      className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit Account</span>
                    </button>

                    <button
                      onClick={() => {
                        setQuickPayDebt(debt);
                        setPayAmount(debt.minPayment.toString());
                      }}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                    >
                      Make Payment
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add / Edit Debt Modal */}
      <AddEditDebtModal
        isOpen={isAddModalOpen || !!editingDebt}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingDebt(null);
        }}
        debtToEdit={editingDebt}
        currency={currency}
        onSave={(debtData) => {
          if (editingDebt) {
            onUpdateDebt(debtData as DebtItem);
          } else {
            onAddDebt(debtData as Omit<DebtItem, 'id'>);
          }
        }}
        onDelete={onDeleteDebt}
      />

      {/* Quick Paydown Modal */}
      {quickPayDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Log Payment for {quickPayDebt.name}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Current balance: {formatCurrency(quickPayDebt.balance, currency)} · Min:{' '}
              {formatCurrency(quickPayDebt.minPayment, currency)}
            </p>

            <form onSubmit={handleConfirmPayment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Payment Amount ({currency.symbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={quickPayDebt.balance}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="mt-1 w-full font-mono text-sm tabular-nums rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Quick payment options */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPayAmount(quickPayDebt.minPayment.toString())}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Min: {formatCurrency(quickPayDebt.minPayment, currency)}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPayAmount(
                      (quickPayDebt.minPayment + extraMonthlyPayment).toString()
                    )
                  }
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Min + Extra: {formatCurrency(quickPayDebt.minPayment + extraMonthlyPayment, currency)}
                </button>
                <button
                  type="button"
                  onClick={() => setPayAmount(quickPayDebt.balance.toString())}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Full Balance
                </button>
              </div>

              {/* Record in Ledger Toggle */}
              <label className="flex items-center gap-2 pt-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordAsExpense}
                  onChange={(e) => setRecordAsExpense(e.target.checked)}
                  className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Also record this payment as an expense in your Ledger</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickPayDebt(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Submit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
