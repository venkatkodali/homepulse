import { CategoryInfo, PaymentMethod, Transaction, TransactionType } from '../types';

export interface CSVParseResult {
  success: boolean;
  transactions: Transaction[];
  errors: string[];
  warnings: string[];
  totalRows: number;
}

/**
 * Robust RFC 4180 compliant CSV line tokenizer.
 * Properly handles quotes, commas inside quotes, escaped double-quotes (""), and whitespace.
 */
export function tokenizeCSV(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  // Normalize line breaks
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped double-quote inside quotes: "" -> "
        currentField += '"';
        i++; // skip following quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !inQuotes) {
      // End of row
      currentRow.push(currentField.trim());
      // Only push non-empty rows
      if (currentRow.some((field) => field.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Final row if not ended in newline
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * Parse various date formats into standardized YYYY-MM-DD
 */
export function normalizeDate(rawDate: string): string {
  const clean = rawDate.replace(/["']/g, '').trim();
  if (!clean) return new Date().toISOString().split('T')[0];

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // YYYY/MM/DD
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(clean)) {
    const [y, m, d] = clean.split('/').map(Number);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // MM/DD/YYYY or M/D/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [m, d, y] = clean.split('/').map(Number);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // DD-MM-YYYY or DD.MM.YYYY
  if (/^\d{1,2}[.-]\d{1,2}[.-]\d{4}$/.test(clean)) {
    const parts = clean.split(/[.-]/).map(Number);
    // Assume D/M/Y if first is > 12
    if (parts[0] > 12) {
      const [d, m, y] = parts;
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    const [m, d, y] = parts;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // Attempt standard Date parsing
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Clean amount string (handles currency symbols, accounting negatives like "(120.50)", and commas)
 */
export function parseAmount(raw: string): { amount: number; isNegative: boolean } {
  if (!raw) return { amount: 0, isNegative: false };

  let val = raw.trim();
  let isNegative = false;

  // Accounting format: (120.00) or -$120.00
  if (val.startsWith('(') && val.endsWith(')')) {
    isNegative = true;
    val = val.slice(1, -1);
  } else if (val.includes('-')) {
    isNegative = true;
  }

  // Remove everything except digits and decimal point
  val = val.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(val);

  return {
    amount: isNaN(parsed) ? 0 : Math.abs(parsed),
    isNegative,
  };
}

/**
 * Find matching category from list or default to 'other'
 */
export function matchCategory(input: string, categories: CategoryInfo[]): string {
  if (!input) return 'other';
  const clean = input.toLowerCase().trim();

  // Direct ID match
  const byId = categories.find((c) => c.id.toLowerCase() === clean);
  if (byId) return byId.id;

  // Direct Name match
  const byName = categories.find((c) => c.name.toLowerCase() === clean || c.name.toLowerCase().includes(clean));
  if (byName) return byName.id;

  // Keyword heuristics
  if (clean.includes('grocer') || clean.includes('market') || clean.includes('supermarket')) return 'groceries';
  if (clean.includes('restaurant') || clean.includes('cafe') || clean.includes('coffee') || clean.includes('dinner') || clean.includes('food')) return 'food';
  if (clean.includes('rent') || clean.includes('mortgage') || clean.includes('home')) return 'housing';
  if (clean.includes('uber') || clean.includes('lyft') || clean.includes('gas') || clean.includes('transit') || clean.includes('fuel')) return 'transport';
  if (clean.includes('electric') || clean.includes('water') || clean.includes('utility') || clean.includes('internet') || clean.includes('wifi')) return 'utilities';
  if (clean.includes('stream') || clean.includes('movie') || clean.includes('game') || clean.includes('spotify') || clean.includes('netflix')) return 'entertainment';
  if (clean.includes('pharmacy') || clean.includes('gym') || clean.includes('fitness') || clean.includes('health') || clean.includes('doctor')) return 'health';
  if (clean.includes('amazon') || clean.includes('store') || clean.includes('shop') || clean.includes('clothing')) return 'shopping';
  if (clean.includes('software') || clean.includes('host') || clean.includes('domain') || clean.includes('cloud') || clean.includes('tech')) return 'tech';
  if (clean.includes('flight') || clean.includes('hotel') || clean.includes('airbnb') || clean.includes('travel')) return 'travel';

  return 'other';
}

/**
 * Normalize payment method string
 */
export function normalizePaymentMethod(input: string): PaymentMethod {
  if (!input) return 'credit_card';
  const clean = input.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.includes('debit')) return 'debit_card';
  if (clean.includes('credit')) return 'credit_card';
  if (clean.includes('bank') || clean.includes('transfer') || clean.includes('wire') || clean.includes('ach')) return 'bank_transfer';
  if (clean.includes('cash')) return 'cash';
  if (clean.includes('apple') || clean.includes('google') || clean.includes('paypal') || clean.includes('wallet')) return 'digital_wallet';
  return 'credit_card';
}

/**
 * Parses CSV raw string and maps it into validated Transaction records.
 */
export function parseCSVToTransactions(
  csvText: string,
  availableCategories: CategoryInfo[]
): CSVParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows = tokenizeCSV(csvText);

  if (rows.length < 2) {
    return {
      success: false,
      transactions: [],
      errors: ['The CSV file is empty or does not contain header and data rows.'],
      warnings: [],
      totalRows: 0,
    };
  }

  // Parse header
  const headerRow = rows[0].map((h) => h.toLowerCase().trim().replace(/['"]/g, ''));

  // Detect column indexes
  const colIndex = {
    id: headerRow.findIndex((h) => h === 'id' || h === 'txid' || h.includes('reference')),
    date: headerRow.findIndex((h) => h.includes('date') || h === 'day' || h === 'time'),
    type: headerRow.findIndex((h) => h === 'type' || h === 'transaction type' || h === 'tx type'),
    title: headerRow.findIndex((h) => h === 'title' || h === 'description' || h === 'name' || h === 'memo' || h === 'narrative' || h === 'details'),
    merchant: headerRow.findIndex((h) => h.includes('merchant') || h.includes('payee') || h.includes('vendor') || h.includes('store')),
    category: headerRow.findIndex((h) => h.includes('category') || h.includes('cat')),
    amount: headerRow.findIndex((h) => h === 'amount' || h === 'total' || h === 'value' || h === 'net'),
    debit: headerRow.findIndex((h) => h.includes('debit')),
    credit: headerRow.findIndex((h) => h.includes('credit')),
    paymentMethod: headerRow.findIndex((h) => h.includes('payment') || h.includes('method') || h.includes('account')),
    tags: headerRow.findIndex((h) => h.includes('tag') || h.includes('label')),
    notes: headerRow.findIndex((h) => h.includes('note') || h.includes('comment')),
  };

  // If no date or amount can be detected, fallback or error
  if (colIndex.date === -1 && colIndex.amount === -1 && colIndex.debit === -1) {
    // If exact HomePulse order is assumed: ID, Date, Type, Title, Merchant, Category, Amount
    if (headerRow.length >= 6) {
      colIndex.date = 1;
      colIndex.type = 2;
      colIndex.title = 3;
      colIndex.merchant = 4;
      colIndex.category = 5;
      colIndex.amount = 6;
      warnings.push('Header labels not standard; falling back to default positional columns.');
    } else {
      return {
        success: false,
        transactions: [],
        errors: [
          'Could not find required columns ("Date" and "Amount" or "Description"). Please ensure headers exist.',
        ],
        warnings,
        totalRows: rows.length - 1,
      };
    }
  }

  const transactions: Transaction[] = [];
  const dataRows = rows.slice(1);
  let skippedRows = 0;

  dataRows.forEach((row, rowIndex) => {
    try {
      // Skip empty row
      if (row.every((f) => f.length === 0)) return;

      const rawDate = colIndex.date !== -1 ? row[colIndex.date] || '' : '';
      const date = normalizeDate(rawDate);

      // Amount detection
      let amount = 0;
      let transactionType: TransactionType = 'expense';

      if (colIndex.debit !== -1 && row[colIndex.debit]) {
        const d = parseAmount(row[colIndex.debit]);
        if (d.amount > 0) {
          amount = d.amount;
          transactionType = 'expense';
        }
      }

      if (colIndex.credit !== -1 && row[colIndex.credit]) {
        const c = parseAmount(row[colIndex.credit]);
        if (c.amount > 0) {
          amount = c.amount;
          transactionType = 'income';
        }
      }

      if (amount === 0 && colIndex.amount !== -1 && row[colIndex.amount]) {
        const a = parseAmount(row[colIndex.amount]);
        amount = a.amount;
        if (a.isNegative) {
          transactionType = 'expense';
        }
      }

      // Explicit type column
      if (colIndex.type !== -1 && row[colIndex.type]) {
        const tStr = row[colIndex.type].toLowerCase().trim();
        if (tStr.includes('income') || tStr.includes('credit') || tStr.includes('deposit') || tStr.includes('salary')) {
          transactionType = 'income';
        } else if (tStr.includes('expense') || tStr.includes('debit') || tStr.includes('payment') || tStr.includes('withdrawal')) {
          transactionType = 'expense';
        }
      }

      // Title & Merchant
      let title = colIndex.title !== -1 && row[colIndex.title] ? row[colIndex.title].trim() : '';
      let merchant = colIndex.merchant !== -1 && row[colIndex.merchant] ? row[colIndex.merchant].trim() : '';

      if (!title && merchant) title = merchant;
      if (!merchant && title) merchant = title;
      if (!title && !merchant) {
        title = `Transaction ${rowIndex + 1}`;
        merchant = 'Vendor';
      }

      // Category
      const rawCategory = colIndex.category !== -1 ? row[colIndex.category] : '';
      const category = matchCategory(rawCategory || title, availableCategories);

      // Payment method
      const rawMethod = colIndex.paymentMethod !== -1 ? row[colIndex.paymentMethod] : '';
      const paymentMethod = normalizePaymentMethod(rawMethod);

      // Tags
      const rawTags = colIndex.tags !== -1 ? row[colIndex.tags] : '';
      let tags: string[] = ['imported'];
      if (rawTags) {
        const userTags = rawTags.split(/[;,]/).map((t) => t.trim()).filter((t) => t.length > 0);
        if (userTags.length > 0) {
          tags = Array.from(new Set([...tags, ...userTags]));
        }
      }

      // Notes
      const notes = colIndex.notes !== -1 && row[colIndex.notes] ? row[colIndex.notes].trim() : undefined;

      // Provided or synthesized ID
      const explicitId = colIndex.id !== -1 && row[colIndex.id] ? row[colIndex.id].trim() : '';
      const id = explicitId && explicitId.length > 2 ? explicitId : `tx-imp-${Date.now()}-${rowIndex + 1}`;

      // Check minimum validity: amount must be valid number >= 0
      if (isNaN(amount)) {
        skippedRows++;
        return;
      }

      transactions.push({
        id,
        type: transactionType,
        amount,
        title,
        merchant,
        category,
        date,
        paymentMethod,
        tags,
        notes,
      });
    } catch (rowErr) {
      skippedRows++;
    }
  });

  if (transactions.length === 0) {
    return {
      success: false,
      transactions: [],
      errors: ['No valid transaction rows could be parsed from the provided CSV file.'],
      warnings,
      totalRows: dataRows.length,
    };
  }

  if (skippedRows > 0) {
    warnings.push(`${skippedRows} row(s) were skipped due to incomplete or unparseable data.`);
  }

  return {
    success: true,
    transactions,
    errors,
    warnings,
    totalRows: dataRows.length,
  };
}

/**
 * Generates a clean sample CSV string that users can download as a reference template.
 */
export function generateSampleCSV(): string {
  const headers = ['Date', 'Type', 'Title', 'Merchant', 'Category', 'Amount', 'Payment Method', 'Notes', 'Tags'];
  const sampleRows = [
    ['2026-11-02', 'expense', 'Weekly Grocery Stockup', 'Trader Joe\'s', 'groceries', '124.50', 'credit_card', 'Organic produce and pantry items', 'groceries;supplies'],
    ['2026-11-05', 'income', 'Direct Deposit Payroll', 'TechCorp Inc', 'other', '3450.00', 'bank_transfer', 'Bi-weekly base salary', 'payroll;salary'],
    ['2026-11-07', 'expense', 'Electric & Heating Bill', 'City Power & Light', 'utilities', '89.20', 'bank_transfer', 'Monthly energy bill', 'bills;utilities'],
    ['2026-11-10', 'expense', 'Team Dinner & Drinks', 'The Bistro Downtown', 'food', '64.80', 'credit_card', 'Celebration dinner', 'dining;social'],
    ['2026-11-12', 'expense', 'Monthly Metro Pass', 'City Transit Authority', 'transport', '90.00', 'digital_wallet', 'Commuter pass refill', 'commute;transport'],
    ['2026-11-15', 'expense', 'Cloud Storage Annual', 'Google One', 'tech', '19.99', 'credit_card', 'Cloud backup subscription', 'tech;cloud'],
  ];

  return [
    headers.join(','),
    ...sampleRows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
}
