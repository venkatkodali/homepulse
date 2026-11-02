import React, { useState, useMemo } from 'react';
import { RefreshCw, Plus, Calendar, CheckCircle2, PauseCircle, Trash2 } from 'lucide-react';
import { CategoryInfo, CurrencyConfig, Subscription } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface SubscriptionsViewProps {
  subscriptions: Subscription[];
  categories: CategoryInfo[];
  currency: CurrencyConfig;
  onToggleSubscription: (id: string) => void;
  onDeleteSubscription: (id: string) => void;
  onAddSubscription: (sub: Omit<Subscription, 'id'>) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  subscriptions,
  categories,
  currency,
  onToggleSubscription,
  onDeleteSubscription,
  onAddSubscription,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]?.id || 'tech');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [nextBillingDate, setNextBillingDate] = useState('2026-11-15');

  const { monthlyTotal, annualTotal } = useMemo(() => {
    let monthly = 0;
    subscriptions.forEach((sub) => {
      if (!sub.active) return;
      if (sub.billingCycle === 'monthly') {
        monthly += sub.amount;
      } else {
        monthly += sub.amount / 12;
      }
    });
    return {
      monthlyTotal: monthly,
      annualTotal: monthly * 12,
    };
  }, [subscriptions]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (name.trim() && !isNaN(parsedAmount) && parsedAmount > 0) {
      onAddSubscription({
        name: name.trim(),
        amount: parsedAmount,
        category,
        billingCycle,
        nextBillingDate,
        active: true,
      });
      setShowAddModal(false);
      setName('');
      setAmount('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Run Rate Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Monthly Recurring Run-Rate
          </span>
          <div className="mt-2 font-mono text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
            {formatCurrency(monthlyTotal, currency)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Across {subscriptions.filter((s) => s.active).length} active scheduled services
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Projected Annual Obligation
          </span>
          <div className="mt-2 font-mono text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
            {formatCurrency(annualTotal, currency)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Annualized recurring overhead
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Next Charge Approaching
          </span>
          <div className="mt-2 font-mono text-xl font-bold tracking-tight text-blue-600 tabular-nums dark:text-blue-400">
            Nov 5, 2026
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            The New Yorker / NYT ($14.50)
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recurring Subscriptions & Fixed Obligations
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage automatic memberships, cloud services, and utilities
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Subscription</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto dark:divide-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
                <th className="px-4 py-3 font-medium">Service Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Billing Frequency</th>
                <th className="px-4 py-3 font-medium">Next Due Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Cost</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {subscriptions.map((sub) => {
                const cat = categories.find((c) => c.id === sub.category);

                return (
                  <tr
                    key={sub.id}
                    className={`transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30 ${
                      !sub.active ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {sub.name}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <span
                          className="h-2 w-2 rounded-xs"
                          style={{ backgroundColor: cat?.color || '#94A3B8' }}
                        />
                        <span>{cat?.name || sub.category}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 capitalize text-slate-500 dark:text-slate-400">
                      {sub.billingCycle}
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-500 tabular-nums dark:text-slate-400">
                      {formatDate(sub.nextBillingDate)}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => onToggleSubscription(sub.id)}
                        className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
                          sub.active
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {sub.active ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <PauseCircle className="h-3.5 w-3.5" />
                            <span>Paused</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                      {formatCurrency(sub.amount, currency)}
                      <span className="text-[10px] font-normal text-slate-400">
                        /{sub.billingCycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onDeleteSubscription(sub.id)}
                        className="rounded p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Subscription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Track Subscription
            </h4>
            <form onSubmit={handleAdd} className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Service Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Disney+ Bundle"
                  className="mt-1 block w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Amount ({currency.symbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="14.99"
                  className="mt-1 block w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Cycle
                  </label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as any)}
                    className="mt-1 block w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 block w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Next Charge Date
                </label>
                <input
                  type="date"
                  required
                  value={nextBillingDate}
                  onChange={(e) => setNextBillingDate(e.target.value)}
                  className="mt-1 block w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
