import React, { useMemo } from 'react';
import { Calendar, AlertCircle, ArrowUpRight, Clock, CheckCircle2 } from 'lucide-react';
import { CategoryInfo, CurrencyConfig, Subscription } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface UpcomingMonthlyBillsProps {
  subscriptions: Subscription[];
  categories: CategoryInfo[];
  currency: CurrencyConfig;
  onNavigateToSubscriptions?: () => void;
}

export const UpcomingMonthlyBills: React.FC<UpcomingMonthlyBillsProps> = ({
  subscriptions,
  categories,
  currency,
  onNavigateToSubscriptions,
}) => {
  // Current anchor date (November 1, 2026)
  const today = useMemo(() => new Date(2026, 10, 1), []);

  const { billsDueNext7Days, billsLaterThisMonth, totalDueNext7Days, totalDueRestOfMonth } = useMemo(() => {
    const activeSubs = subscriptions.filter((s) => s.active);

    const mapped = activeSubs.map((sub) => {
      const [y, m, d] = sub.nextBillingDate.split('-').map(Number);
      const dueDate = new Date(y, m - 1, d);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      return {
        ...sub,
        dueDate,
        diffDays,
        isNext7Days: diffDays >= 0 && diffDays <= 7,
      };
    }).sort((a, b) => a.diffDays - b.diffDays);

    const dueNext7 = mapped.filter((b) => b.isNext7Days);
    const later = mapped.filter((b) => !b.isNext7Days && b.diffDays > 7);

    const sumNext7 = dueNext7.reduce((sum, b) => sum + b.amount, 0);
    const sumLater = later.reduce((sum, b) => sum + b.amount, 0);

    return {
      billsDueNext7Days: dueNext7,
      billsLaterThisMonth: later,
      totalDueNext7Days: sumNext7,
      totalDueRestOfMonth: sumLater,
    };
  }, [subscriptions, today]);

  const getUrgencyText = (diffDays: number) => {
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Upcoming Monthly Bills & Renewals
            </h4>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Active scheduled services and subscriptions with due date proximity
          </p>
        </div>

        {onNavigateToSubscriptions && (
          <button
            onClick={onNavigateToSubscriptions}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <span>All Subscriptions</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Summary Highlight Strip: Next 7 Days */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200/70 bg-amber-50/60 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500 text-white shadow-xs">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-amber-950 dark:text-amber-200">
              Next 7 Days Obligation: {formatCurrency(totalDueNext7Days, currency)}
            </div>
            <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
              {billsDueNext7Days.length} active service charges approaching this week
            </div>
          </div>
        </div>

        <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
          <span>Rest of month: </span>
          <span className="font-mono font-semibold text-slate-800 tabular-nums dark:text-slate-200">
            {formatCurrency(totalDueRestOfMonth, currency)}
          </span>
        </div>
      </div>

      {/* Bills List */}
      <div className="mt-4 space-y-4">
        {/* Section 1: Highlighted Due Within Next 7 Days */}
        {billsDueNext7Days.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              <span>Due in Next 7 Days ({billsDueNext7Days.length})</span>
              <span>Amount</span>
            </div>

            <div className="space-y-2">
              {billsDueNext7Days.map((bill) => {
                const cat = categories.find((c) => c.id === bill.category);
                const isDueToday = bill.diffDays === 0;

                return (
                  <div
                    key={bill.id}
                    className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                      isDueToday
                        ? 'border-amber-300 bg-amber-50/80 dark:border-amber-800/70 dark:bg-amber-950/30'
                        : 'border-slate-200/70 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: cat?.color || '#F59E0B' }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {bill.name}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{cat?.name || bill.category}</span>
                          <span className="mx-1" aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{formatDate(bill.nextBillingDate)}</span>
                          <span className="mx-1" aria-hidden="true">·</span>
                          <span className={isDueToday ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-amber-600 dark:text-amber-400'}>
                            {getUrgencyText(bill.diffDays)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-bold text-slate-900 tabular-nums dark:text-slate-100">
                        {formatCurrency(bill.amount, currency)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {bill.billingCycle}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 2: Later This Month */}
        {billsLaterThisMonth.length > 0 && (
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Later This Month ({billsLaterThisMonth.length})
            </div>

            <div className="space-y-1.5">
              {billsLaterThisMonth.map((bill) => {
                const cat = categories.find((c) => c.id === bill.category);

                return (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-2 w-2 rounded-xs shrink-0"
                        style={{ backgroundColor: cat?.color || '#94A3B8' }}
                      />
                      <div className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                        {bill.name}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        ({formatDate(bill.nextBillingDate)})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-400">
                        In {bill.diffDays} days
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-800 tabular-nums dark:text-slate-200">
                        {formatCurrency(bill.amount, currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
