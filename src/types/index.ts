export type TransactionType = 'expense' | 'income';

export type PaymentMethod = 'credit_card' | 'debit_card' | 'bank_transfer' | 'cash' | 'digital_wallet';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  title: string;
  merchant: string;
  category: string;
  subcategory?: string;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  notes?: string;
  tags: string[];
  isRecurring?: boolean;
  recurringInterval?: 'weekly' | 'monthly' | 'yearly';
  receiptName?: string;
}

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  category: string;
  frequency: RecurringFrequency;
  dayOfMonth?: number; // 1-31
  startDate: string; // YYYY-MM-DD
  active: boolean;
  notes?: string;
}


export interface CategoryInfo {
  id: string;
  name: string;
  color: string;
  monthlyBudget: number;
  iconName: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  category: string;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: string;
  active: boolean;
  notes?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  color: string;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  exchangeRate: number; // relative to USD base (1.0)
}

export type ViewTab = 'dashboard' | 'transactions' | 'analytics' | 'budgets' | 'subscriptions' | 'debts' | 'sqlite';

export interface SqliteStatus {
  engine: string;
  version: string;
  journalMode: string;
  path: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  tableStats: Record<string, number>;
  totalRows: number;
  tablesCount: number;
}

export interface SqliteColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

export interface SqliteTableSchema {
  tableName: string;
  rowCount: number;
  columns: SqliteColumnInfo[];
  sql: string;
}

export interface SqliteQueryResult {
  success: boolean;
  query: string;
  isSelect: boolean;
  columns: string[];
  rows: any[];
  rowCount: number;
  affectedRows: number;
  durationMs: number;
  error?: string;
}

export interface SqlQueryHistoryItem {
  id: number;
  query: string;
  executed_at: string;
  duration_ms: number;
  row_count: number;
  success: number;
}

export type DebtType = 'credit_card' | 'student_loan' | 'auto_loan' | 'mortgage' | 'personal_loan' | 'medical' | 'other';

export interface DebtItem {
  id: string;
  name: string;
  type: DebtType;
  lender: string;
  balance: number;
  originalAmount: number;
  interestRate: number; // Annual Percentage Rate (APR %)
  minPayment: number;
  dueDate: string; // e.g. "18th of month" or "2026-11-18"
  notes?: string;
}

export interface DateFilter {
  preset: 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'this_year' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
}
