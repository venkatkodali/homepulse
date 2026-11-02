import React, { useMemo, useState } from 'react';
import { CurrencyConfig, Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface SpendingPatternsChartProps {
  transactions: Transaction[];
  currency: CurrencyConfig;
}

export const SpendingPatternsChart: React.FC<SpendingPatternsChartProps> = ({
  transactions,
  currency,
}) => {
  const [activeTab, setActiveTab] = useState<'weekday' | 'payment_method' | 'merchants'>('weekday');

  // Expenses only
  const expenses = useMemo(() => transactions.filter((t) => t.type === 'expense'), [transactions]);

  // 1. Day of week distribution
  const dayOfWeekData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const sums = new Array(7).fill(0);
    const counts = new Array(7).fill(0);

    expenses.forEach((t) => {
      const [y, m, d] = t.date.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const dayIdx = dt.getDay();
      sums[dayIdx] += t.amount;
      counts[dayIdx] += 1;
    });

    const maxDayVal = Math.max(...sums, 1);

    // Reorder Mon -> Sun
    const orderedIndices = [1, 2, 3, 4, 5, 6, 0];
    return orderedIndices.map((i) => ({
      name: days[i],
      total: sums[i],
      count: counts[i],
      ratio: (sums[i] / maxDayVal) * 100,
      isWeekend: i === 0 || i === 6,
    }));
  }, [expenses]);

  // 2. Payment methods distribution
  const paymentMethodData = useMemo(() => {
    const labels: Record<string, string> = {
      credit_card: 'Credit Card',
      debit_card: 'Debit Card',
      bank_transfer: 'Bank Transfer',
      digital_wallet: 'Digital Wallet',
      cash: 'Cash',
    };

    const map = new Map<string, { total: number; count: number }>();
    expenses.forEach((t) => {
      const cur = map.get(t.paymentMethod) || { total: 0, count: 0 };
      cur.total += t.amount;
      cur.count += 1;
      map.set(t.paymentMethod, cur);
    });

    const totalSpent = expenses.reduce((s, t) => s + t.amount, 0);

    return Array.from(map.entries())
      .map(([method, data]) => ({
        method,
        label: labels[method] || method,
        total: data.total,
        count: data.count,
        percent: totalSpent > 0 ? (data.total / totalSpent) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  // 3. Merchant Leaderboard
  const merchantLeaderboard = useMemo(() => {
    const map = new Map<string, { total: number; count: number; category: string }>();

    expenses.forEach((t) => {
      const merchantName = t.merchant || 'Unknown Merchant';
      const cur = map.get(merchantName) || { total: 0, count: 0, category: t.category };
      cur.total += t.amount;
      cur.count += 1;
      map.set(merchantName, cur);
    });

    const totalSpent = expenses.reduce((s, t) => s + t.amount, 0);

    return Array.from(map.entries())
      .map(([merchant, data]) => ({
        merchant,
        total: data.total,
        count: data.count,
        category: data.category,
        percent: totalSpent > 0 ? (data.total / totalSpent) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [expenses]);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Spending Patterns & Outflow Anatomy
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Analyze behavioral distribution across time, methods, and vendors
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setActiveTab('weekday')}
            className={`rounded px-3 py-1 text-xs font-medium transition-all ${
              activeTab === 'weekday'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Day of Week
          </button>
          <button
            onClick={() => setActiveTab('merchants')}
            className={`rounded px-3 py-1 text-xs font-medium transition-all ${
              activeTab === 'merchants'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Top Payees
          </button>
          <button
            onClick={() => setActiveTab('payment_method')}
            className={`rounded px-3 py-1 text-xs font-medium transition-all ${
              activeTab === 'payment_method'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Payment Types
          </button>
        </div>
      </div>

      <div className="pt-4">
        {/* Tab 1: Day of Week Bar Visualization */}
        {activeTab === 'weekday' && (
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-2 pt-6">
              {dayOfWeekData.map((d) => (
                <div key={d.name} className="flex flex-col items-center">
                  {/* Amount above bar */}
                  <span className="mb-1 text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {formatCurrency(d.total, currency, true)}
                  </span>

                  {/* Vertical bar column */}
                  <div className="relative flex h-32 w-full max-w-[40px] items-end justify-center rounded bg-slate-100 p-0.5 dark:bg-slate-800">
                    <div
                      className={`w-full rounded transition-all duration-300 ${
                        d.isWeekend ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ height: `${Math.max(4, d.ratio)}%` }}
                    />
                  </div>

                  {/* Day label */}
                  <span
                    className={`mt-2 text-xs font-medium ${
                      d.isWeekend
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {d.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {d.count} tx
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-xs bg-blue-600" /> Weekday
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-xs bg-amber-500" /> Weekend
                </span>
              </div>
              <span>Higher weekend transactions may reflect leisure and dining activities</span>
            </div>
          </div>
        )}

        {/* Tab 2: Top Merchants */}
        {activeTab === 'merchants' && (
          <div className="space-y-2.5">
            {merchantLeaderboard.map((item, idx) => (
              <div
                key={item.merchant}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-2.5 dark:border-slate-800"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-slate-100 font-mono text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {item.merchant}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {item.count} transactions · {item.percent.toFixed(1)}% of expenses
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono text-xs font-bold text-slate-900 tabular-nums dark:text-slate-100">
                    {formatCurrency(item.total, currency)}
                  </div>
                  <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Payment Method Distribution */}
        {activeTab === 'payment_method' && (
          <div className="space-y-3">
            {paymentMethodData.map((item) => (
              <div key={item.method} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {item.label}
                  </span>
                  <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    {formatCurrency(item.total, currency)}{' '}
                    <span className="text-slate-400">({item.percent.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-400">
                  {item.count} logged payment transactions
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
