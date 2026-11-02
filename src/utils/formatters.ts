import { CategoryInfo, CurrencyConfig, DateFilter, Transaction } from '../types';
import { DEFAULT_CATEGORIES, SUPPORTED_CURRENCIES } from '../data/initialData';

export function formatCurrency(
  amount: number,
  currency: CurrencyConfig = SUPPORTED_CURRENCIES[0],
  compact = false
): string {
  const converted = amount * currency.exchangeRate;

  if (compact && Math.abs(converted) >= 1000) {
    if (Math.abs(converted) >= 1000000) {
      return `${currency.symbol}${(converted / 1000000).toFixed(1)}M`;
    }
    return `${currency.symbol}${(converted / 1000).toFixed(1)}k`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(converted);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function getCategoryById(categories: CategoryInfo[], id: string): CategoryInfo {
  const found = categories.find((c) => c.id === id);
  if (found) return found;
  return (
    DEFAULT_CATEGORIES.find((c) => c.id === 'other') || {
      id: 'other',
      name: 'Miscellaneous',
      color: '#64748B',
      monthlyBudget: 150,
      iconName: 'MoreHorizontal',
    }
  );
}

export function filterTransactionsByDate(transactions: Transaction[], filter: DateFilter): Transaction[] {
  if (filter.preset === 'all') return transactions;

  // Reference date: current execution context or latest transaction
  const refDate = new Date(2026, 10, 1); // Nov 1, 2026
  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth(); // 10 is Nov (0-indexed)

  return transactions.filter((t) => {
    const [y, m, d] = t.date.split('-').map(Number);
    const txDate = new Date(y, m - 1, d);

    if (filter.preset === 'this_month') {
      return y === currentYear && m - 1 === currentMonth;
    }
    if (filter.preset === 'last_month') {
      const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      return y === prevMonthYear && m - 1 === prevMonth;
    }
    if (filter.preset === 'last_30_days') {
      const diffTime = refDate.getTime() - txDate.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 30;
    }
    if (filter.preset === 'last_90_days') {
      const diffTime = refDate.getTime() - txDate.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 90;
    }
    if (filter.preset === 'this_year') {
      return y === currentYear;
    }
    if (filter.preset === 'custom') {
      if (filter.startDate && t.date < filter.startDate) return false;
      if (filter.endDate && t.date > filter.endDate) return false;
      return true;
    }
    return true;
  });
}

export function exportTransactionsToCSV(transactions: Transaction[]): string {
  const headers = ['ID', 'Date', 'Type', 'Title', 'Merchant', 'Category', 'Amount', 'Payment Method', 'Tags', 'Notes'];
  const rows = transactions.map((t) => [
    t.id,
    t.date,
    t.type,
    `"${(t.title || '').replace(/"/g, '""')}"`,
    `"${(t.merchant || '').replace(/"/g, '""')}"`,
    t.category,
    t.amount.toFixed(2),
    t.paymentMethod,
    `"${(t.tags || []).join(';')}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function downloadFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
