import React from 'react';
import { Plus, Sun, Moon, Database, ChevronDown, FileText } from 'lucide-react';
import { CurrencyConfig, ViewTab } from '../../types';
import { SUPPORTED_CURRENCIES } from '../../data/initialData';

interface TopBarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  currency: CurrencyConfig;
  onSelectCurrency: (currency: CurrencyConfig) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenAddModal: () => void;
  onOpenDataModal: () => void;
  onOpenReportModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onSelectTab,
  currency,
  onSelectCurrency,
  isDark,
  onToggleTheme,
  onOpenAddModal,
  onOpenDataModal,
  onOpenReportModal,
}) => {
  const navTabs: { id: ViewTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'transactions', label: 'Ledger' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'budgets', label: 'Budgets' },
    { id: 'subscriptions', label: 'Subscriptions' },
    { id: 'debts', label: 'Debts' },
    { id: 'sqlite', label: 'SQLite DB' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6">
        {/* Zone 1: Brand wordmark with official logo */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2.5 shrink-0 text-left focus:outline-hidden group cursor-pointer"
          title="HomePulse Dashboard"
        >
          <div className="relative flex h-8.5 items-center justify-center overflow-hidden rounded-lg bg-[#071026] px-1.5 py-0.5 shadow-xs ring-1 ring-slate-800/80 transition-transform group-hover:scale-102">
            <img
              src="/assets/aistudio/image_806b5b1b.png"
              alt="HomePulse Logo"
              className="h-7 w-auto object-contain"
            />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 dark:text-slate-100 flex items-center gap-1.5 leading-none">
              HomePulse
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
              Household Finance
            </span>
          </div>
        </button>

        {/* Zone 2: 4-5 clean single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-400">
          {navTabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
                  isActive
                    ? 'font-semibold text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Utilities + 1 Primary Action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Currency dropdown */}
          <div className="relative">
            <select
              value={currency.code}
              onChange={(e) => {
                const found = SUPPORTED_CURRENCIES.find((c) => c.code === e.target.value);
                if (found) onSelectCurrency(found);
              }}
              className="appearance-none rounded-md border border-slate-200 bg-slate-50 py-1 pl-2 pr-6 font-mono text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle color theme"
            className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

          {/* Data Portability */}
          <button
            onClick={onOpenDataModal}
            aria-label="Data Portability"
            title="Import/Export Data"
            className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Database className="h-3.5 w-3.5" />
          </button>

          {/* Monthly Summary Report Trigger */}
          <button
            onClick={onOpenReportModal}
            aria-label="Monthly Performance Report"
            title="Generate Monthly Summary Report"
            className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <FileText className="h-3.5 w-3.5" />
          </button>

          {/* Primary Action Button */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="flex md:hidden items-center justify-around border-t border-slate-100 px-2 py-1.5 dark:border-slate-800">
        {navTabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`text-xs py-1 px-2 whitespace-nowrap ${
                isActive
                  ? 'font-semibold text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
