import React, { useState } from 'react';
import { Target, Plus, Check, Edit2, ShieldCheck, DollarSign } from 'lucide-react';
import { CategoryInfo, CurrencyConfig, SavingsGoal, Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface BudgetsViewProps {
  categories: CategoryInfo[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  currency: CurrencyConfig;
  onUpdateCategoryBudget: (categoryId: string, newBudget: number) => void;
  onUpdateGoalAmount: (goalId: string, addedAmount: number) => void;
  onAddSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  categories,
  transactions,
  savingsGoals,
  currency,
  onUpdateCategoryBudget,
  onUpdateGoalAmount,
  onAddSavingsGoal,
}) => {
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editBudgetValue, setEditBudgetValue] = useState<string>('');
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('2027-06-30');

  // Compute expenses for current month
  const spentThisMonth = (categoryId: string) => {
    return transactions
      .filter((t) => t.type === 'expense' && t.category === categoryId && t.date.startsWith('2026-11'))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const totalMonthlyBudget = categories.reduce((sum, c) => sum + c.monthlyBudget, 0);
  const totalSpentNov = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith('2026-11'))
    .reduce((sum, t) => sum + t.amount, 0);

  const startEdit = (cat: CategoryInfo) => {
    setEditingCategoryId(cat.id);
    setEditBudgetValue(cat.monthlyBudget.toString());
  };

  const saveEdit = (catId: string) => {
    const val = parseFloat(editBudgetValue);
    if (!isNaN(val) && val >= 0) {
      onUpdateCategoryBudget(catId, val);
    }
    setEditingCategoryId(null);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(newGoalTarget);
    if (newGoalName.trim() && !isNaN(target) && target > 0) {
      onAddSavingsGoal({
        name: newGoalName.trim(),
        targetAmount: target,
        currentAmount: 0,
        targetDate: newGoalDate,
        color: '#3B82F6',
      });
      setShowNewGoalModal(false);
      setNewGoalName('');
      setNewGoalTarget('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Budget Summary Card */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Monthly Budget Framework
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Establish category-specific caps and track monthly utilization
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Total Monthly Allocation</span>
            <div className="font-mono text-xl font-bold text-slate-900 tabular-nums dark:text-slate-100">
              {formatCurrency(totalMonthlyBudget, currency)}
            </div>
          </div>
        </div>

        {/* Global Progress */}
        <div className="mt-4 rounded-lg bg-slate-50 p-3.5 dark:bg-slate-800/40">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              November Utilization
            </span>
            <span className="font-mono text-slate-900 tabular-nums dark:text-slate-100">
              {formatCurrency(totalSpentNov, currency)} of {formatCurrency(totalMonthlyBudget, currency)} (
              {((totalSpentNov / totalMonthlyBudget) * 100).toFixed(1)}%)
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (totalSpentNov / totalMonthlyBudget) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Categories Budget Grid */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Category Budget Limits & Current Spend
          </h4>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto dark:divide-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Spent (Nov)</th>
                <th className="px-4 py-3 font-medium">Monthly Target</th>
                <th className="px-4 py-3 font-medium">Progress Bar</th>
                <th className="px-4 py-3 font-medium">Headroom</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {categories.map((cat) => {
                const spent = spentThisMonth(cat.id);
                const ratio = cat.monthlyBudget > 0 ? (spent / cat.monthlyBudget) * 100 : 0;
                const remaining = cat.monthlyBudget - spent;
                const isEditing = editingCategoryId === cat.id;

                return (
                  <tr key={cat.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {cat.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-700 tabular-nums dark:text-slate-300">
                      {formatCurrency(spent, currency)}
                    </td>

                    <td className="px-4 py-3 font-mono tabular-nums">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={editBudgetValue}
                            onChange={(e) => setEditBudgetValue(e.target.value)}
                            className="w-24 rounded border border-blue-500 bg-white px-2 py-1 text-xs text-slate-900 focus:outline-hidden dark:bg-slate-800 dark:text-slate-100"
                          />
                          <button
                            onClick={() => saveEdit(cat.id)}
                            className="rounded bg-blue-600 p-1 text-white hover:bg-blue-700"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {formatCurrency(cat.monthlyBudget, currency)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 w-44">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full ${
                            ratio > 100 ? 'bg-rose-500' : ratio > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, ratio)}%` }}
                        />
                      </div>
                      <span className="mt-1 block text-[10px] text-slate-400">
                        {ratio.toFixed(0)}% consumed
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono text-xs tabular-nums">
                      {remaining >= 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(remaining, currency)}
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400">
                          -{formatCurrency(Math.abs(remaining), currency)} over
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {!isEditing && (
                        <button
                          onClick={() => startEdit(cat)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Savings Goals Suite */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Savings Targets & Capital Reserves
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Accumulate savings towards milestone objectives
            </p>
          </div>
          <button
            onClick={() => setShowNewGoalModal(true)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Goal</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {savingsGoals.map((goal) => {
            const pct = (goal.currentAmount / goal.targetAmount) * 100;
            const remaining = goal.targetAmount - goal.currentAmount;

            return (
              <div
                key={goal.id}
                className="rounded-lg border border-slate-100 p-4 dark:border-slate-800"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {goal.name}
                  </span>
                  <span className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {pct.toFixed(0)}%
                  </span>
                </div>

                <div className="mt-2 font-mono text-lg font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  {formatCurrency(goal.currentAmount, currency)}
                  <span className="text-xs font-normal text-slate-400">
                    {' '}/ {formatCurrency(goal.targetAmount, currency)}
                  </span>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      backgroundColor: goal.color,
                    }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Target: {formatDate(goal.targetDate)}</span>
                  <span>{formatCurrency(remaining, currency)} to go</span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => onUpdateGoalAmount(goal.id, 100)}
                    className="flex-1 rounded border border-slate-200 py-1 text-center text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    + {formatCurrency(100, currency)}
                  </button>
                  <button
                    onClick={() => onUpdateGoalAmount(goal.id, 500)}
                    className="flex-1 rounded border border-slate-200 py-1 text-center text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    + {formatCurrency(500, currency)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for new goal */}
      {showNewGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Create Savings Target
            </h4>
            <form onSubmit={handleCreateGoal} className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Target Name
                </label>
                <input
                  type="text"
                  required
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  placeholder="e.g. Home Downpayment"
                  className="mt-1 block w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Target Amount ({currency.symbol})
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                  placeholder="5000"
                  className="mt-1 block w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Target Milestone Date
                </label>
                <input
                  type="date"
                  required
                  value={newGoalDate}
                  onChange={(e) => setNewGoalDate(e.target.value)}
                  className="mt-1 block w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewGoalModal(false)}
                  className="rounded px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
