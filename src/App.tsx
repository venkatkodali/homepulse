/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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

  // Hydrate from SQLite database on initial load if available
  const handleRefreshDataFromDb = async () => {
    const isCleared = localStorage.getItem('homepulse_data_cleared') === 'true';
    if (isCleared) {
      return;
    }
    try {
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

          if (Array.isArray(dbTx) && dbTx.length > 0) setTransactions(dbTx);
          if (Array.isArray(dbCat) && dbCat.length > 0) setCategories(dbCat);
          if (Array.isArray(dbSub) && dbSub.length > 0) setSubscriptions(dbSub);
          if (Array.isArray(dbDebts) && dbDebts.length > 0) setDebts(dbDebts);
          if (Array.isArray(dbRec) && dbRec.length > 0) setRecurringTransactions(dbRec);
          if (Array.isArray(dbGoals) && dbGoals.length > 0) setSavingsGoals(dbGoals);
        }
      }
    } catch (err) {
      // Backend might be offline or standalone, falls back safely to state
    }
  };

  useEffect(() => {
    handleRefreshDataFromDb();
  }, []);

  // Atomic sync to SQLite database
  const handleSyncLocalStateToDb = async () => {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactions,
        categories,
        subscriptions,
        debts,
        recurringTransactions,
        savingsGoals,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to sync with SQLite');
    }
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

  // Filtered transactions for active view
  const scopedTransactions = filterTransactionsByDate(transactions, dateFilter);

  // Recurring transaction handlers
  const handleAddRecurring = (newRule: Omit<RecurringTransaction, 'id'>) => {
    const created: RecurringTransaction = {
      ...newRule,
      id: `rec-${Date.now()}`,
    };
    setRecurringTransactions((prev) => [created, ...prev]);
  };

  const handleUpdateRecurring = (updated: RecurringTransaction) => {
    setRecurringTransactions((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleDeleteRecurring = (id: string) => {
    setRecurringTransactions((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleRecurringActive = (id: string) => {
    setRecurringTransactions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
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
    setTransactions((prev) => [newTx, ...prev]);
  };

  // Handlers
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const created: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}`,
    };
    setTransactions((prev) => [created, ...prev]);
  };

  const handleSaveEditedTransaction = (updated: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleBatchDeleteTransactions = (ids: string[]) => {
    const idSet = new Set(ids);
    setTransactions((prev) => prev.filter((t) => !idSet.has(t.id)));
  };

  const handleUpdateCategoryBudget = (categoryId: string, newBudget: number) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, monthlyBudget: newBudget } : c))
    );
  };

  const handleUpdateGoalAmount = (goalId: string, added: number) => {
    setSavingsGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, currentAmount: g.currentAmount + added } : g))
    );
  };

  const handleAddSavingsGoal = (goal: Omit<SavingsGoal, 'id'>) => {
    const created: SavingsGoal = {
      ...goal,
      id: `goal-${Date.now()}`,
    };
    setSavingsGoals((prev) => [...prev, created]);
  };

  const handleToggleSubscription = (id: string) => {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  };

  const handleDeleteSubscription = (id: string) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddSubscription = (sub: Omit<Subscription, 'id'>) => {
    const created: Subscription = {
      ...sub,
      id: `sub-${Date.now()}`,
    };
    setSubscriptions((prev) => [...prev, created]);
  };

  const handleImportTransactions = (imported: Transaction[], replace = false) => {
    if (replace) {
      setTransactions(imported);
    } else {
      setTransactions((prev) => [...imported, ...prev]);
    }
  };

  const handleAddDebt = (debt: Omit<DebtItem, 'id'>) => {
    const created: DebtItem = {
      ...debt,
      id: `debt-${Date.now()}`,
    };
    setDebts((prev) => [...prev, created]);
  };

  const handleUpdateDebt = (updated: DebtItem) => {
    setDebts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const handleDeleteDebt = (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  };

  const handleMakeDebtPayment = (
    debtId: string,
    amount: number,
    recordExpense: boolean,
    debtName: string
  ) => {
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id === debtId) {
          const newBalance = Math.max(0, d.balance - amount);
          return { ...d, balance: newBalance };
        }
        return d;
      })
    );

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
      setTransactions((prev) => [newTx, ...prev]);
    }
  };

  const handleClearAllData = (options?: { clearAllEntities?: boolean }) => {
    // 1. Mark clean slate in localStorage
    localStorage.setItem('homepulse_data_cleared', 'true');

    // 2. Clear transactions state & localStorage
    setTransactions([]);
    localStorage.setItem('homepulse_transactions', JSON.stringify([]));

    // 3. Clear other sample entities if requested
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

    // 4. Sync cleared state to SQLite database
    fetch('/api/sqlite/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearEntities: !!options?.clearAllEntities }),
    }).catch(() => {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: [],
          categories,
          subscriptions: options?.clearAllEntities ? [] : subscriptions,
          debts: options?.clearAllEntities ? [] : debts,
          recurringTransactions: options?.clearAllEntities ? [] : recurringTransactions,
          savingsGoals: options?.clearAllEntities ? [] : savingsGoals,
        }),
      }).catch(() => {});
    });
  };

  const handleResetDemoData = () => {
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

    fetch('/api/sqlite/reset', { method: 'POST' }).catch(() => {});
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
      />

      {/* 2. Main Viewport Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
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
            transactions={transactions}
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
            transactions={transactions}
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
            transactions={transactions}
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
            transactions={transactions}
            currency={currency}
            onAddDebt={handleAddDebt}
            onUpdateDebt={handleUpdateDebt}
            onDeleteDebt={handleDeleteDebt}
            onMakePayment={handleMakeDebtPayment}
          />
        )}

        {currentTab === 'sqlite' && (
          <SqliteView
            transactions={transactions}
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
