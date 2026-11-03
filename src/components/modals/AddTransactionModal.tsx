import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Receipt, Tag, Calendar, DollarSign, Building2, Sparkles, Loader2, Check } from 'lucide-react';
import { CategoryInfo, CurrencyConfig, PaymentMethod, RecurringTransaction, Transaction, TransactionType } from '../../types';
import { suggestCategoryForTransaction, CategorySuggestion } from '../../utils/categorySuggester';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onAddRecurring?: (rule: Omit<RecurringTransaction, 'id'>) => void;
  categories: CategoryInfo[];
  currency: CurrencyConfig;
  existingTransactions?: Transaction[];
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction,
  onAddRecurring,
  categories,
  currency,
  existingTransactions = [],
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [category, setCategory] = useState<string>(categories[0]?.id || 'other');
  const [date, setDate] = useState<string>('2026-11-01');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [notes, setNotes] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [saveAsRecurringRule, setSaveAsRecurringRule] = useState<boolean>(true);
  const [recurringInterval, setRecurringInterval] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [attachedReceiptName, setAttachedReceiptName] = useState<string | null>(null);

  // Gemini Smart Category Suggester states
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
  const [userSelectedManually, setUserSelectedManually] = useState<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Derive frequently used tags from existing transactions
  const frequentTags = useMemo(() => {
    const tagCounts = new Map<string, number>();

    if (Array.isArray(existingTransactions)) {
      for (const tx of existingTransactions) {
        if (Array.isArray(tx.tags)) {
          for (const rawTag of tx.tags) {
            const clean = rawTag.trim().toLowerCase();
            if (clean && clean.length > 1) {
              tagCounts.set(clean, (tagCounts.get(clean) || 0) + 1);
            }
          }
        }
      }
    }

    // Default suggestions if user has few or no tags yet
    const defaults = ['groceries', 'dining', 'bills', 'subscription', 'work', 'travel', 'health', 'entertainment'];
    for (const def of defaults) {
      if (!tagCounts.has(def)) {
        tagCounts.set(def, 0);
      }
    }

    // Sort by frequency count descending, then alphabetically
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
  }, [existingTransactions]);

  // Current active tags parsed from input
  const activeTagsList = useMemo(() => {
    return tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);
  }, [tagsInput]);

  const activeTagsSet = useMemo(() => new Set(activeTagsList), [activeTagsList]);

  // One-click toggle tag selection
  const handleToggleTag = (tagToToggle: string) => {
    const normalized = tagToToggle.trim().toLowerCase();
    if (activeTagsSet.has(normalized)) {
      // Remove tag
      const updated = activeTagsList.filter((t) => t !== normalized);
      setTagsInput(updated.join(', '));
    } else {
      // Add tag
      const updated = [...activeTagsList, normalized];
      setTagsInput(updated.join(', '));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const transactionName = title.trim() || merchant.trim() || (type === 'expense' ? 'Expense' : 'Income');

    onAddTransaction({
      type,
      amount: parsedAmount,
      title: transactionName,
      merchant: merchant.trim() || 'General Payee',
      category,
      date,
      paymentMethod,
      notes: notes.trim() || undefined,
      tags,
      isRecurring,
      recurringInterval: isRecurring ? recurringInterval : undefined,
      receiptName: attachedReceiptName || undefined,
    });

    if (isRecurring && saveAsRecurringRule && onAddRecurring) {
      const parsedDay = date ? new Date(date).getDate() : 1;
      onAddRecurring({
        name: transactionName,
        type,
        amount: parsedAmount,
        category,
        frequency: recurringInterval === 'weekly' ? 'weekly' : recurringInterval === 'yearly' ? 'yearly' : 'monthly',
        dayOfMonth: parsedDay,
        startDate: date,
        active: true,
        notes: notes.trim() || undefined,
      });
    }

    onClose();
  };

  // Debounced auto-suggestion when merchant or title is entered
  useEffect(() => {
    const cleanMerchant = merchant.trim();
    const cleanTitle = title.trim();

    if (!cleanMerchant && !cleanTitle) {
      setSuggestion(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const res = await suggestCategoryForTransaction({
          merchant: cleanMerchant,
          description: cleanTitle,
          transactionType: type,
          amount: amount ? parseFloat(amount) : undefined,
          categories,
        });
        setSuggestion(res);

        // If user hasn't explicitly clicked a manual category and confidence is high, auto-apply!
        if (!userSelectedManually && res.suggestedCategoryId && res.confidence >= 0.7) {
          setCategory(res.suggestedCategoryId);
        }
      } catch (err) {
        console.error('Failed to suggest category:', err);
      } finally {
        setIsSuggesting(false);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [merchant, title, type, categories, userSelectedManually, amount]);

  const handleManualSuggest = async () => {
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
      setUserSelectedManually(true);
    } catch (err) {
      console.error('Manual suggest failed:', err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleReceiptSimulate = () => {
    // Simulated instant receipt OCR upload
    setAttachedReceiptName('Receipt_Market_Nov2026.pdf');
    if (!amount) setAmount('64.80');
    if (!merchant) setMerchant('Whole Foods Market');
    if (!title) setTitle('Fresh Produce & Organics');
    setCategory('groceries');
    setUserSelectedManually(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Log Transaction
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Record new ledger entry with financial classification
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
          {/* Transaction Type Segmented Toggle */}
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
              Expense Outflow
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
              Income Inflow
            </button>
          </div>

          {/* Amount and Currency */}
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
                placeholder="0.00"
                className="block w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 font-mono text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Title & Payee / Merchant */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Description / Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Grocery Restock"
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Merchant / Entity
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="e.g. Trader Joe's"
                  className="block w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                    <span>Gemini analyzing...</span>
                  </span>
                ) : suggestion ? (
                  <button
                    type="button"
                    onClick={handleManualSuggest}
                    title="Re-analyze with Gemini"
                    className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                  >
                    <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span>{suggestion.source === 'gemini' ? 'Gemini 3.8' : 'Smart Suggest'}</span>
                  </button>
                ) : (merchant.trim() || title.trim()) ? (
                  <button
                    type="button"
                    onClick={handleManualSuggest}
                    className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Suggest with Gemini</span>
                  </button>
                ) : null}
              </div>

              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setUserSelectedManually(true);
                }}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Gemini Quick Suggestion Chips */}
              {suggestion && (
                <div className="mt-2 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCategory(suggestion.suggestedCategoryId);
                        setUserSelectedManually(true);
                      }}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-all ${
                        category === suggestion.suggestedCategoryId
                          ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-400/50 dark:bg-indigo-950/80 dark:text-indigo-200 dark:ring-indigo-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
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
                          onClick={() => {
                            setCategory(altCat.id);
                            setUserSelectedManually(true);
                          }}
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium transition-all ${
                            isSelected
                              ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-400/50 dark:bg-indigo-950/80 dark:text-indigo-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
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
                Transaction Date
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
                  className="block w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="bank_transfer">Bank Transfer (ACH / Wire)</option>
                <option value="digital_wallet">Digital Wallet (Apple/Google Pay)</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Tags (comma separated)
                </label>
                {activeTagsList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTagsInput('')}
                    className="text-[10px] text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                  >
                    Clear ({activeTagsList.length})
                  </button>
                )}
              </div>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Tag className="h-3.5 w-3.5" />
                </div>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. groceries, dinner, work"
                  className="block w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Frequently Used Tags Suggestion Section */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <Tag className="h-3.5 w-3.5 text-blue-500" />
                <span>Frequently Used Tags</span>
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                1-click to select or remove
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {frequentTags.map(({ tag, count }) => {
                const isSelected = activeTagsSet.has(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-2xs font-semibold hover:bg-blue-700'
                        : 'bg-white border border-slate-200/90 text-slate-700 hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-600 dark:hover:bg-slate-700/60 dark:hover:text-blue-300'
                    }`}
                    title={isSelected ? `Click to remove "${tag}"` : `Click to add "${tag}"`}
                  >
                    {isSelected ? (
                      <Check className="h-3 w-3 stroke-[2.5]" />
                    ) : (
                      <span className="text-slate-400 text-xs font-bold leading-none">+</span>
                    )}
                    <span>#{tag}</span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] ml-0.5 px-1.5 py-0.2 rounded-full font-mono ${
                          isSelected
                            ? 'bg-blue-700/80 text-blue-100'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Notes / Memo (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional ledger notes or receipt context..."
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Recurring Option & Receipt Simulation */}
          <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
                />
                <span>Recurring schedule</span>
              </label>

              {isRecurring && (
                <select
                  value={recurringInterval}
                  onChange={(e) => setRecurringInterval(e.target.value as any)}
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}

              <button
                type="button"
                onClick={handleReceiptSimulate}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>{attachedReceiptName ? 'Receipt Attached ✓' : 'Simulate Receipt Scan'}</span>
              </button>
            </div>

            {isRecurring && (
              <label className="flex items-center gap-2 cursor-pointer text-[11px] text-blue-700 dark:text-blue-300 border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
                <input
                  type="checkbox"
                  checked={saveAsRecurringRule}
                  onChange={(e) => setSaveAsRecurringRule(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
                />
                <span>Also project into monthly cash flow forecasting model</span>
              </label>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              Record Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
