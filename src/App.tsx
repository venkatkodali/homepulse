/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import {
  CategoryInfo,
  CurrencyConfig,
  DateFilter,
  DebtItem,
  RecurringTransaction,
  SavingsGoal,
  Subscription,
  Transaction,
  ViewTab,
} from './types';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_DEBTS,
  DEFAULT_RECURRING_TRANSACTIONS,
  DEFAULT_SAVINGS_GOALS,
  DEFAULT_SUBSCRIPTIONS,
  INITIAL_TRANSACTIONS,
  SUPPORTED_CURRENCIES,
} from './data/initialData';
import { TopBar } from './components/layout/TopBar';
import { DashboardView } from './components/views/DashboardView';
import { TransactionsView } from './components/views/TransactionsView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { BudgetsView } from './components/views/BudgetsView';
import { SubscriptionsView } from './components/views/SubscriptionsView';
import { DebtsView } from './components/views/DebtsView';
import { SqliteView } from './components/views/SqliteView';
import { AddTransactionModal } from './components/modals/AddTransactionModal';
import { EditTransactionModal } from './components/modals/EditTransactionModal';
import { ExportImportModal } from './components/modals/ExportImportModal';
import { MonthlyReportModal } from './components/modals/MonthlyReportModal';
import { RecurringTransactionsModal } from './components/recurring/RecurringTransactionsModal';
import { filterTransactionsByDate } from './utils/formatters';

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    return (
      (localStorage.getItem('homepulse_theme') || localStorage.getItem('ledgerpulse_theme')) === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('homepulse_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('homepulse_theme', 'light');
    }
  }, [isDark]);

  // Currency State
  const [currency, setCurrency] = useState<CurrencyConfig>(() => {
    const saved = localStorage.getItem('homepulse_currency') || localStorage.getItem('ledgerpulse_currency');
    if (saved) {
      const found = SUPPORTED_CURRENCIES.find((c) => c.code === saved);
      if (found) return found;
    }
    return SUPPORTED_CURRENCIES[0];
  });

  const handleSelectCurrency = (newCurrency: CurrencyConfig) => {
    setCurrency(newCurrency);
    localStorage.setItem('homepulse_currency', newCurrency.code);
  };

  // Ledger state
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const isCleared = localStorage.getItem('homepulse_data_cleared') === 'true';
    const saved = localStorage.getItem('homepulse_transactions') || localStorage.getItem('ledgerpulse_transactions');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          if (parsed.length === 0) return [];
          // Ensure all IDs are strictly unique in case old cached data exists
          const seen = new Set<string>();
          return parsed.map((t: Transaction, idx: number) => {
            if (!t.id || seen.has(t.id)) {
              const uniqueId = `${t.id || 'tx'}-${idx}-${Date.now().toString(36)}`;
              seen.add(uniqueId);
              return { ...t, id: uniqueId };
            }
            seen.add(t.id);
            return t;
          });
        }
      } catch (e) {
        // Fallback to default
      }
    }
    return isCleared ? [] : INITIAL_TRANSACTIONS;
  });

  useEffect(() => {
    localStorage.setItem('homepulse_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Categories state
  const [categories, setCategories] = useState<CategoryInfo[]>(() => {
    const saved = localStorage.getItem('homepulse_categories') || localStorage.getItem('ledgerpulse_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return DEFAULT_CATEGORIES;
  });

  useEffect(() => {
    localStorage.setItem('homepulse_categories', JSON.stringify(categories));
  }, [categories]);

  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => {
    const isCleared = localStorage.getItem('homepulse_data_cleared') === 'true';
    const saved = localStorage.getItem('homepulse_subscriptions') || localStorage.getItem('ledgerpulse_subscriptions');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return isCleared ? [] : DEFAULT_SUBSCRIPTIONS;
  });

  useEffect(() => {
    localStorage.setItem('homepulse_subscriptions', JSON.stringify(subscriptions));
  }, [subscriptions]);

  // Savings goals state
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => {
    const isCleared = localStorage.getItem('homepulse_data_cleared') === 'true';
    const saved = localStorage.getItem('homepulse_goals') || localStorage.getItem('ledgerpulse_goals');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return isCleared ? [] : DEFAULT_SAVINGS_GOALS;
  });

  useEffect(() => {
    localStorage.setItem('homepulse_goals', JSON.stringify(savingsGoals));
  }, [savingsGoals]);

  // Debts state
  const [debts, setDebts] = useState<DebtItem[]>(() => {
    const isCleared = localStorage.getItem('homepulse_data_cleared') === 'true';
    const saved = localStorage.getItem('homepulse_debts') || localStorage.getItem('ledgerpulse_debts');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return isCleared ? [] : DEFAULT_DEBTS;
  });

  useEffect(() => {
    localStorage.setItem('homepulse_debts', JSON.stringify(debts));
  }, [debts]);

  // Recurring transactions state
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>(() => {
    const isCleared = localStorage.getItem('homepulse_data_cleared') === 'true';
    const saved = localStorage.getItem('homepulse_recurring') || localStorage.getItem('ledgerpulse_recurring');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return isCleared ? [] : DEFAULT_RECURRING_TRANSACTIONS;
  });

  useEffect(() => {
    localStorage.setItem('homepulse_recurring', JSON.stringify(recurringTransactions));
  }, [recurringTransactions]);

  // -------------------------------------------------------------
  // Multi-Device Real-Time Sync Engine
  // -------------------------------------------------------------
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const lastSyncedVersionRef = useRef<number>(0);
  const isPullingFromServerRef = useRef<boolean>(false);
  const pendingSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Push local changes to central SQLite database
  const triggerPushToServer = useCallback(
    (overrideData?: {
      transactions?: Transaction[];
      categories?: CategoryInfo[];
      subscriptions?: Subscription[];
      debts?: DebtItem[];
      recurringTransactions?: RecurringTransaction[];
      savingsGoals?: SavingsGoal[];
    }) => {
      if (isPullingFromServerRef.current) return;
      if (pendingSyncTimerRef.current) {
        clearTimeout(pendingSyncTimerRef.current);
      }
      setSyncStatus('syncing');

      pendingSyncTimerRef.current = setTimeout(async () => {
        try {
          const payload = {
            transactions: overrideData?.transactions ?? transactions,
            categories: overrideData?.categories ?? categories,
            subscriptions: overrideData?.subscriptions ?? subscriptions,
            debts: overrideData?.debts ?? debts,
            recurringTransactions: overrideData?.recurringTransactions ?? recurringTransactions,
            savingsGoals: overrideData?.savingsGoals ?? savingsGoals,
          };
          const res = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const json = await res.json();
          if (json.success) {
            if (json.version) {
              lastSyncedVersionRef.current = json.version;
            }
            setSyncStatus('synced');
          } else {
            setSyncStatus('error');
          }
        } catch {
          setSyncStatus('error');
        }
      }, 250);
    },
    [transactions, categories, subscriptions, debts, recurringTransactions, savingsGoals]
  );

  // Pull latest data from central SQLite database
  const handleRefreshDataFromDb = useCallback(async (showIndicator = true) => {
    try {
      if (showIndicator) setSyncStatus('syncing');
      isPullingFromServerRef.current = true;
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const {
            transactions: dbTx,
            categories: dbCat,
            subscriptions: dbSub,
            debts: dbDebts,
            recurringTransactions: dbRec,
            savingsGoals: dbGoals,
          } = json.data;

          if (Array.isArray(dbTx)) {
            setTransactions(dbTx);
            localStorage.setItem('homepulse_transactions', JSON.stringify(dbTx));
          }
          if (Array.isArray(dbCat) && dbCat.length > 0) {
            setCategories(dbCat);
            localStorage.setItem('homepulse_categories', JSON.stringify(dbCat));
          }
          if (Array.isArray(dbSub)) {
            setSubscriptions(dbSub);
            localStorage.setItem('homepulse_subscriptions', JSON.stringify(dbSub));
          }
          if (Array.isArray(dbDebts)) {
            setDebts(dbDebts);
            localStorage.setItem('homepulse_debts', JSON.stringify(dbDebts));
          }
          if (Array.isArray(dbRec)) {
            setRecurringTransactions(dbRec);
            localStorage.setItem('homepulse_recurring', JSON.stringify(dbRec));
          }
          if (Array.isArray(dbGoals)) {
            setSavingsGoals(dbGoals);
            localStorage.setItem('homepulse_goals', JSON.stringify(dbGoals));
          }

          if (json.version) {
            lastSyncedVersionRef.current = json.version;
          }
          if (showIndicator) setSyncStatus('synced');
        }
      }
    } catch {
      if (showIndicator) setSyncStatus('error');
    } finally {
      setTimeout(() => {
        isPullingFromServerRef.current = false;
      }, 150);
    }
  }, []);

  // Hydrate on initial mount from authoritative server database
  useEffect(() => {
    handleRefreshDataFromDb(true);
  }, [handleRefreshDataFromDb]);

  // Real-time cross-device poller & tab focus listener
  useEffect(() => {
    const checkServerVersion = async () => {
      if (document.hidden || isPullingFromServerRef.current) return;
      try {
        const res = await fetch('/api/sync/version');
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.version && json.version > lastSyncedVersionRef.current) {
          // Newer data exists on server from another device
          await handleRefreshDataFromDb(false);
        }
      } catch {
        // Silently handle transient offline state
      }
    };

    // Lightweight version check every 3.5 seconds
    const interval = setInterval(checkServerVersion, 3500);

    // Immediate check when window regains focus or becomes visible (e.g. mobile unlock or tab switch)
    const onFocus = () => {
      checkServerVersion();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkServerVersion();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [handleRefreshDataFromDb]);

  // Manual atomic sync for SqliteView
  const handleSyncLocalStateToDb = async () => {
    triggerPushToServer();
  };

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');

  // Filter state
  const [dateFilter, setDateFilter] = useState<DateFilter>({ preset: 'this_month' });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isExportImportModalOpen, setIsExportImportModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Global search state (merchant, title, or tags)
  const [searchQuery, setSearchQuery] = useState('');

  // Globally filter transactions by merchant, title, or tags
  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return transactions;
    return transactions.filter((t) => {
      const merchantMatch = t.merchant?.toLowerCase().includes(query);
      const titleMatch = t.title?.toLowerCase().includes(query);
      const tagsMatch = Array.isArray(t.tags) && t.tags.some((tag) => tag.toLowerCase().includes(query));
      const notesMatch = t.notes?.toLowerCase().includes(query);
      return merchantMatch || titleMatch || tagsMatch || notesMatch;
    });
  }, [transactions, searchQuery]);

  // Filtered transactions for active view (scoped by date and search)
  const scopedTransactions = useMemo(() => {
    return filterTransactionsByDate(filteredTransactions, dateFilter);
  }, [filteredTransactions, dateFilter]);

  // Recurring transaction handlers
  const handleAddRecurring = (newRule: Omit<RecurringTransaction, 'id'>) => {
    const created: RecurringTransaction = {
      ...newRule,
      id: `rec-${Date.now()}`,
    };
    const next = [created, ...recurringTransactions];
    setRecurringTransactions(next);
    triggerPushToServer({ recurringTransactions: next });
  };

  const handleUpdateRecurring = (updated: RecurringTransaction) => {
    const next = recurringTransactions.map((r) => (r.id === updated.id ? updated : r));
    setRecurringTransactions(next);
    triggerPushToServer({ recurringTransactions: next });
  };

  const handleDeleteRecurring = (id: string) => {
    const next = recurringTransactions.filter((r) => r.id !== id);
    setRecurringTransactions(next);
    triggerPushToServer({ recurringTransactions: next });
  };

  const handleToggleRecurringActive = (id: string) => {
    const next = recurringTransactions.map((r) => (r.id === id ? { ...r, active: !r.active } : r));
    setRecurringTransactions(next);
    triggerPushToServer({ recurringTransactions: next });
  };

  const handlePostRecurringToLedger = (rule: RecurringTransaction, date: string) => {
    const newTx: Transaction = {
      id: `tx-rec-${Date.now()}`,
      type: rule.type,
      amount: rule.amount,
      title: rule.name,
      merchant: rule.type === 'income' ? 'Direct Deposit / Employer' : rule.name,
      category: rule.category,
      date,
      paymentMethod: 'bank_transfer',
      tags: ['recurring', rule.frequency],
      notes: `Recurring transaction occurrence: ${rule.notes || rule.name}`,
    };
    const next = [newTx, ...transactions];
    setTransactions(next);
    triggerPushToServer({ transactions: next });
  };

  // Handlers
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const created: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}`,
    };
    const next = [created, ...transactions];
    setTransactions(next);
    triggerPushToServer({ transactions: next });
  };

  const handleSaveEditedTransaction = (updated: Transaction) => {
    const next = transactions.map((t) => (t.id === updated.id ? updated : t));
    setTransactions(next);
    triggerPushToServer({ transactions: next });
  };

  const handleDeleteTransaction = (id: string) => {
    const next = transactions.filter((t) => t.id !== id);
    setTransactions(next);
    triggerPushToServer({ transactions: next });
  };

  const handleBatchDeleteTransactions = (ids: string[]) => {
    const idSet = new Set(ids);
    const next = transactions.filter((t) => !idSet.has(t.id));
    setTransactions(next);
    triggerPushToServer({ transactions: next });
  };

  const handleUpdateCategoryBudget = (categoryId: string, newBudget: number) => {
    const next = categories.map((c) => (c.id === categoryId ? { ...c, monthlyBudget: newBudget } : c));
    setCategories(next);
    triggerPushToServer({ categories: next });
  };

  const handleUpdateGoalAmount = (goalId: string, added: number) => {
    const next = savingsGoals.map((g) => (g.id === goalId ? { ...g, currentAmount: g.currentAmount + added } : g));
    setSavingsGoals(next);
    triggerPushToServer({ savingsGoals: next });
  };

  const handleAddSavingsGoal = (goal: Omit<SavingsGoal, 'id'>) => {
    const created: SavingsGoal = {
      ...goal,
      id: `goal-${Date.now()}`,
    };
    const next = [...savingsGoals, created];
    setSavingsGoals(next);
    triggerPushToServer({ savingsGoals: next });
  };

  const handleToggleSubscription = (id: string) => {
    const next = subscriptions.map((s) => (s.id === id ? { ...s, active: !s.active } : s));
    setSubscriptions(next);
    triggerPushToServer({ subscriptions: next });
  };

  const handleDeleteSubscription = (id: string) => {
    const next = subscriptions.filter((s) => s.id !== id);
    setSubscriptions(next);
    triggerPushToServer({ subscriptions: next });
  };

  const handleAddSubscription = (sub: Omit<Subscription, 'id'>) => {
    const created: Subscription = {
      ...sub,
      id: `sub-${Date.now()}`,
    };
    const next = [...subscriptions, created];
    setSubscriptions(next);
    triggerPushToServer({ subscriptions: next });
  };

  const handleImportTransactions = (imported: Transaction[], replace = false) => {
    const next = replace ? imported : [...imported, ...transactions];
    setTransactions(next);
    triggerPushToServer({ transactions: next });
  };

  const handleAddDebt = (debt: Omit<DebtItem, 'id'>) => {
    const created: DebtItem = {
      ...debt,
      id: `debt-${Date.now()}`,
    };
    const next = [...debts, created];
    setDebts(next);
    triggerPushToServer({ debts: next });
  };

  const handleUpdateDebt = (updated: DebtItem) => {
    const next = debts.map((d) => (d.id === updated.id ? updated : d));
    setDebts(next);
    triggerPushToServer({ debts: next });
  };

  const handleDeleteDebt = (id: string) => {
    const next = debts.filter((d) => d.id !== id);
    setDebts(next);
    triggerPushToServer({ debts: next });
  };

  const handleMakeDebtPayment = (
    debtId: string,
    amount: number,
    recordExpense: boolean,
    debtName: string
  ) => {
    const nextDebts = debts.map((d) => {
      if (d.id === debtId) {
        const newBalance = Math.max(0, d.balance - amount);
        return { ...d, balance: newBalance };
      }
      return d;
    });
    setDebts(nextDebts);

    let nextTx = transactions;
    if (recordExpense) {
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        type: 'expense',
        amount,
        title: `Debt Payment - ${debtName}`,
        merchant: debtName,
        category: 'utilities',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'bank_transfer',
        tags: ['debt', 'payoff'],
        notes: `Logged payment towards ${debtName}`,
      };
      nextTx = [newTx, ...transactions];
      setTransactions(nextTx);
    }

    triggerPushToServer({ debts: nextDebts, transactions: nextTx });
  };

  const handleClearAllData = async (options?: { clearAllEntities?: boolean }) => {
    // 1. Mark clean slate in localStorage
    localStorage.setItem('homepulse_data_cleared', 'true');

    // 2. Clear state & localStorage
    setTransactions([]);
    localStorage.setItem('homepulse_transactions', JSON.stringify([]));

    if (options?.clearAllEntities) {
      setSubscriptions([]);
      setDebts([]);
      setRecurringTransactions([]);
      setSavingsGoals([]);
      localStorage.setItem('homepulse_subscriptions', JSON.stringify([]));
      localStorage.setItem('homepulse_debts', JSON.stringify([]));
      localStorage.setItem('homepulse_recurring', JSON.stringify([]));
      localStorage.setItem('homepulse_goals', JSON.stringify([]));
    }

    // 3. Sync cleared state to central SQLite database
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/sqlite/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearEntities: !!options?.clearAllEntities }),
      });
      const json = await res.json();
      if (json.version) {
        lastSyncedVersionRef.current = json.version;
      }
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
    }
  };

  const handleResetDemoData = async () => {
    localStorage.removeItem('homepulse_data_cleared');
    setTransactions(INITIAL_TRANSACTIONS);
    setCategories(DEFAULT_CATEGORIES);
    setSubscriptions(DEFAULT_SUBSCRIPTIONS);
    setRecurringTransactions(DEFAULT_RECURRING_TRANSACTIONS);
    setSavingsGoals(DEFAULT_SAVINGS_GOALS);
    setDebts(DEFAULT_DEBTS);
    setDateFilter({ preset: 'this_month' });
    setSelectedCategory(null);

    localStorage.setItem('homepulse_transactions', JSON.stringify(INITIAL_TRANSACTIONS));
    localStorage.setItem('homepulse_categories', JSON.stringify(DEFAULT_CATEGORIES));
    localStorage.setItem('homepulse_subscriptions', JSON.stringify(DEFAULT_SUBSCRIPTIONS));
    localStorage.setItem('homepulse_recurring', JSON.stringify(DEFAULT_RECURRING_TRANSACTIONS));
    localStorage.setItem('homepulse_goals', JSON.stringify(DEFAULT_SAVINGS_GOALS));
    localStorage.setItem('homepulse_debts', JSON.stringify(DEFAULT_DEBTS));

    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/sqlite/reset', { method: 'POST' });
      const json = await res.json();
      if (json.version) {
        lastSyncedVersionRef.current = json.version;
      }
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {/* 1. Universal Top Navigation Bar adhering to Top Bar Contract */}
      <TopBar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currency={currency}
        onSelectCurrency={handleSelectCurrency}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenDataModal={() => setIsExportImportModalOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        syncStatus={syncStatus}
        onTriggerSync={() => handleRefreshDataFromDb(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        matchingCount={filteredTransactions.length}
      />

      {/* 2. Main Viewport Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Global Search Active Filter Banner */}
        {searchQuery.trim() && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/90 px-4 py-2.5 text-xs text-blue-900 dark:border-blue-800/80 dark:bg-blue-950/40 dark:text-blue-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
              <span>
                Filtered by global search: <strong className="font-semibold underline decoration-blue-400">"{searchQuery.trim()}"</strong> (merchant, title, or tags)
              </span>
              <span className="rounded-md bg-blue-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {filteredTransactions.length} {filteredTransactions.length === 1 ? 'match' : 'matches'}
              </span>
            </div>
            <button
              onClick={() => setSearchQuery('')}
              className="flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100 transition-colors cursor-pointer"
            >
              <span>Clear search</span>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {currentTab === 'dashboard' && (
          <DashboardView
            transactions={scopedTransactions}
            categories={categories}
            subscriptions={subscriptions}
            recurringTransactions={recurringTransactions}
            currency={currency}
            dateFilter={dateFilter}
            onSetDateFilter={setDateFilter}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onOpenRecurringModal={() => setIsRecurringModalOpen(true)}
            onSelectCategoryFilter={setSelectedCategory}
            selectedCategory={selectedCategory}
            onViewAllTransactions={() => setCurrentTab('transactions')}
            onEditTransaction={(tx) => setEditingTransaction(tx)}
            onNavigateToSubscriptions={() => setCurrentTab('subscriptions')}
            onNavigateToBudgets={() => setCurrentTab('budgets')}
            onUpdateCategoryBudget={handleUpdateCategoryBudget}
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionsView
            transactions={filteredTransactions}
            categories={categories}
            currency={currency}
            recurringTransactions={recurringTransactions}
            onOpenRecurringModal={() => setIsRecurringModalOpen(true)}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onEditTransaction={(tx) => setEditingTransaction(tx)}
            onDeleteTransaction={handleDeleteTransaction}
            onBatchDeleteTransactions={handleBatchDeleteTransactions}
            dateFilter={dateFilter}
            onSetDateFilter={setDateFilter}
            selectedCategory={selectedCategory}
            onSelectCategoryFilter={setSelectedCategory}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsView
            transactions={filteredTransactions}
            categories={categories}
            subscriptions={subscriptions}
            recurringTransactions={recurringTransactions}
            currency={currency}
            onEditCategoryBudget={(catId) => {
              setCurrentTab('budgets');
            }}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onOpenRecurringModal={() => setIsRecurringModalOpen(true)}
          />
        )}

        {currentTab === 'budgets' && (
          <BudgetsView
            categories={categories}
            transactions={filteredTransactions}
            savingsGoals={savingsGoals}
            currency={currency}
            onUpdateCategoryBudget={handleUpdateCategoryBudget}
            onUpdateGoalAmount={handleUpdateGoalAmount}
            onAddSavingsGoal={handleAddSavingsGoal}
          />
        )}

        {currentTab === 'subscriptions' && (
          <SubscriptionsView
            subscriptions={subscriptions}
            categories={categories}
            currency={currency}
            onToggleSubscription={handleToggleSubscription}
            onDeleteSubscription={handleDeleteSubscription}
            onAddSubscription={handleAddSubscription}
          />
        )}

        {currentTab === 'debts' && (
          <DebtsView
            debts={debts}
            savingsGoals={savingsGoals}
            transactions={filteredTransactions}
            currency={currency}
            onAddDebt={handleAddDebt}
            onUpdateDebt={handleUpdateDebt}
            onDeleteDebt={handleDeleteDebt}
            onMakePayment={handleMakeDebtPayment}
          />
        )}

        {currentTab === 'sqlite' && (
          <SqliteView
            transactions={filteredTransactions}
            categories={categories}
            subscriptions={subscriptions}
            debts={debts}
            recurringTransactions={recurringTransactions}
            savingsGoals={savingsGoals}
            currency={currency}
            onRefreshDataFromDb={handleRefreshDataFromDb}
            onSyncLocalStateToDb={handleSyncLocalStateToDb}
          />
        )}
      </main>

      {/* 3. Global Modals */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTransaction={handleAddTransaction}
        onAddRecurring={handleAddRecurring}
        categories={categories}
        currency={currency}
        existingTransactions={transactions}
      />

      <RecurringTransactionsModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        recurringTransactions={recurringTransactions}
        categories={categories}
        currency={currency}
        onAddRecurring={handleAddRecurring}
        onUpdateRecurring={handleUpdateRecurring}
        onDeleteRecurring={handleDeleteRecurring}
        onToggleActive={handleToggleRecurringActive}
        onPostToLedger={handlePostRecurringToLedger}
      />

      <EditTransactionModal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
        onSave={handleSaveEditedTransaction}
        onDelete={handleDeleteTransaction}
        categories={categories}
        currency={currency}
      />

      <ExportImportModal
        isOpen={isExportImportModalOpen}
        onClose={() => setIsExportImportModalOpen(false)}
        transactions={transactions}
        categories={categories}
        subscriptions={subscriptions}
        currency={currency}
        onImportTransactions={handleImportTransactions}
        onResetDemoData={handleResetDemoData}
        onClearAllData={handleClearAllData}
      />

      <MonthlyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        transactions={transactions}
        categories={categories}
        subscriptions={subscriptions}
        currency={currency}
      />
    </div>
  );
}
