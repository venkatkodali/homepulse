import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Building2, Tag, Sparkles, Loader2, Check } from 'lucide-react';
import { CategoryInfo, CurrencyConfig, PaymentMethod, Transaction, TransactionType } from '../../types';
import { suggestCategoryForTransaction, CategorySuggestion } from '../../utils/categorySuggester';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSave: (updated: Transaction) => void;
  onDelete: (id: string) => void;
  categories: CategoryInfo[];
  currency: CurrencyConfig;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onSave,
  onDelete,
  categories,
  currency,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [notes, setNotes] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');

  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setTitle(transaction.title);
      setMerchant(transaction.merchant || '');
      setCategory(transaction.category);
      setDate(transaction.date);
      setPaymentMethod(transaction.paymentMethod);
      setNotes(transaction.notes || '');
      setTagsInput(transaction.tags ? transaction.tags.join(', ') : '');
      setSuggestion(null);
    }
  }, [transaction]);

  const handleSuggestCategory = async () => {
    setIsSuggesting(true);
    try {
      const res = await suggestCategoryForTransaction({
        merchant: merchant.trim(),
        description: title.trim(),
        transactionType: type,
        amount: amount ? parseFloat(amount) : undefined,
        categories,
      });
      setSuggestion(res);
      setCategory(res.suggestedCategoryId);
    } catch (err) {
      console.error('Suggest category error in edit modal:', err);
    } finally {
      setIsSuggesting(false);
    }
  };

  if (!isOpen || !transaction) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    onSave({
      ...transaction,
      type,
      amount: parsedAmount,
      title: title.trim(),
      merchant: merchant.trim(),
      category,
      date,
      paymentMethod,
      notes: notes.trim() || undefined,
      tags,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Edit Ledger Record
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ID: <span className="font-mono text-slate-600 dark:text-slate-300">{transaction.id}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Type */}
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                type === 'expense'
                  ? 'bg-rose-50 text-rose-700 shadow-xs dark:bg-rose-950/60 dark:text-rose-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                type === 'income'
                  ? 'bg-emerald-50 text-emerald-700 shadow-xs dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Income
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Amount ({currency.symbol})
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <DollarSign className="h-4 w-4" />
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 font-mono text-base font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Title & Merchant */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Merchant
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Category
                </label>
                {isSuggesting ? (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Analyzing...</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSuggestCategory}
                    className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                    title="Ask Gemini to re-classify category based on title and merchant"
                  >
                    <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span>Gemini Suggest</span>
                  </button>
                )}
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {suggestion && (
                <div className="mt-2 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCategory(suggestion.suggestedCategoryId)}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-all ${
                        category === suggestion.suggestedCategoryId
                          ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-400/50 dark:bg-indigo-950/80 dark:text-indigo-200'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <Sparkles className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                      <span>{suggestion.suggestedCategoryName}</span>
                      <span className="text-[10px] opacity-75 font-mono">
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                      {category === suggestion.suggestedCategoryId && (
                        <Check className="h-2.5 w-2.5 ml-0.5 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </button>
                    {suggestion.alternativeCategoryIds.map((altId) => {
                      const altCat = categories.find((c) => c.id === altId);
                      if (!altCat || altCat.id === suggestion.suggestedCategoryId) return null;
                      const isSelected = category === altCat.id;
                      return (
                        <button
                          key={altCat.id}
                          type="button"
                          onClick={() => setCategory(altCat.id)}
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium transition-all ${
                            isSelected
                              ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-400/50 dark:bg-indigo-950/80 dark:text-indigo-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          <span>{altCat.name}</span>
                          {isSelected && <Check className="h-2.5 w-2.5 ml-1 text-indigo-600 dark:text-indigo-400" />}
                        </button>
                      );
                    })}
                  </div>
                  {suggestion.reasoning && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic line-clamp-1">
                      💡 {suggestion.reasoning}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Date
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Payment Method & Tags */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Payment Channel
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="digital_wallet">Digital Wallet</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Tags
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Tag className="h-3.5 w-3.5" />
                </div>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete this transaction permanently?')) {
                  onDelete(transaction.id);
                  onClose();
                }
              }}
              className="text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400"
            >
              Delete Record
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
