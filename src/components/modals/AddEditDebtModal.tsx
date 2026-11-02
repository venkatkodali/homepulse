import React, { useState, useEffect } from 'react';
import { X, Landmark, Trash2 } from 'lucide-react';
import { CurrencyConfig, DebtItem, DebtType } from '../../types';

interface AddEditDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtToEdit?: DebtItem | null;
  currency: CurrencyConfig;
  onSave: (debt: DebtItem | Omit<DebtItem, 'id'>) => void;
  onDelete?: (id: string) => void;
}

const DEBT_TYPES: { id: DebtType; label: string }[] = [
  { id: 'credit_card', label: 'Credit Card' },
  { id: 'auto_loan', label: 'Auto Loan' },
  { id: 'student_loan', label: 'Student Loan' },
  { id: 'mortgage', label: 'Mortgage / Home Equity' },
  { id: 'personal_loan', label: 'Personal Loan' },
  { id: 'medical', label: 'Medical Debt' },
  { id: 'other', label: 'Other Liability' },
];

export const AddEditDebtModal: React.FC<AddEditDebtModalProps> = ({
  isOpen,
  onClose,
  debtToEdit,
  currency,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<DebtType>('credit_card');
  const [lender, setLender] = useState('');
  const [balance, setBalance] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [minPayment, setMinPayment] = useState('');
  const [dueDate, setDueDate] = useState('15th of month');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (debtToEdit) {
      setName(debtToEdit.name);
      setType(debtToEdit.type);
      setLender(debtToEdit.lender);
      setBalance(debtToEdit.balance.toString());
      setOriginalAmount(debtToEdit.originalAmount.toString());
      setInterestRate(debtToEdit.interestRate.toString());
      setMinPayment(debtToEdit.minPayment.toString());
      setDueDate(debtToEdit.dueDate || '15th of month');
      setNotes(debtToEdit.notes || '');
    } else {
      setName('');
      setType('credit_card');
      setLender('');
      setBalance('');
      setOriginalAmount('');
      setInterestRate('');
      setMinPayment('');
      setDueDate('15th of month');
      setNotes('');
    }
    setError(null);
  }, [debtToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Account or debt name is required.');
      return;
    }

    const parsedBalance = parseFloat(balance);
    if (isNaN(parsedBalance) || parsedBalance < 0) {
      setError('Please provide a valid current balance (0 or greater).');
      return;
    }

    const parsedOriginal = parseFloat(originalAmount);
    const validOriginal = !isNaN(parsedOriginal) && parsedOriginal >= parsedBalance ? parsedOriginal : parsedBalance;

    const parsedRate = parseFloat(interestRate);
    if (isNaN(parsedRate) || parsedRate < 0) {
      setError('Please provide a valid interest rate (APR %).');
      return;
    }

    const parsedMinPay = parseFloat(minPayment);
    if (isNaN(parsedMinPay) || parsedMinPay < 0) {
      setError('Please provide a valid minimum monthly payment.');
      return;
    }

    if (debtToEdit) {
      onSave({
        ...debtToEdit,
        name: name.trim(),
        type,
        lender: lender.trim() || 'Direct Issuer',
        balance: parsedBalance,
        originalAmount: validOriginal,
        interestRate: parsedRate,
        minPayment: parsedMinPay,
        dueDate: dueDate.trim() || '15th of month',
        notes: notes.trim(),
      });
    } else {
      onSave({
        name: name.trim(),
        type,
        lender: lender.trim() || 'Direct Issuer',
        balance: parsedBalance,
        originalAmount: validOriginal,
        interestRate: parsedRate,
        minPayment: parsedMinPay,
        dueDate: dueDate.trim() || '15th of month',
        notes: notes.trim(),
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Landmark className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {debtToEdit ? 'Edit Debt Account' : 'Add New Debt or Loan'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Record balances, interest rates, and minimum commitments.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Account / Debt Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sapphire Preferred, Subaru Auto Loan"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Debt Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DebtType)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {DEBT_TYPES.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Lender / Institution
              </label>
              <input
                type="text"
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                placeholder="e.g. Chase Bank, Nelnet, Ally"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Current Balance ({currency.symbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                className="mt-1 w-full font-mono tabular-nums rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Original Principal / Limit ({currency.symbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={originalAmount}
                onChange={(e) => setOriginalAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="mt-1 w-full font-mono tabular-nums rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Interest Rate (APR %)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="e.g. 19.99"
                className="mt-1 w-full font-mono tabular-nums rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Min Monthly Payment ({currency.symbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={minPayment}
                onChange={(e) => setMinPayment(e.target.value)}
                placeholder="e.g. 75.00"
                className="mt-1 w-full font-mono tabular-nums rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Payment Due Cycle
              </label>
              <input
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder="e.g. 18th of month, or 1st of month"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Notes & Terms (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Promotional 0% APR expiration, payoff target notes, etc."
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            {debtToEdit && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(debtToEdit.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Account</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
              >
                {debtToEdit ? 'Save Changes' : 'Add Debt'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
