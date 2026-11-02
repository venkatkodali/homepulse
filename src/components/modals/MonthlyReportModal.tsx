import React, { useState, useMemo } from 'react';
import { X, Copy, Download, Check, FileText, AlignLeft, Eye, FileDown } from 'lucide-react';
import { CategoryInfo, CurrencyConfig, Subscription, Transaction } from '../../types';
import { formatCurrency, downloadFile } from '../../utils/formatters';
import { generateMonthlyReportPDF } from '../../utils/monthlyReportGenerator';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: CategoryInfo[];
  subscriptions: Subscription[];
  currency: CurrencyConfig;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  categories,
  subscriptions,
  currency,
}) => {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [copied, setCopied] = useState(false);

  // Focus on current month: November 2026 (or latest month present)
  const reportData = useMemo(() => {
    const currentMonthKey = '2026-11';
    const monthName = 'November 2026';

    const monthTxs = transactions.filter((t) => t.date.startsWith(currentMonthKey));
    
    let totalExpense = 0;
    let totalIncome = 0;
    const catMap = new Map<string, { total: number; count: number }>();
    const merchantMap = new Map<string, { total: number; count: number; category: string }>();

    monthTxs.forEach((t) => {
      if (t.type === 'expense') {
        totalExpense += t.amount;
        const curCat = catMap.get(t.category) || { total: 0, count: 0 };
        curCat.total += t.amount;
        curCat.count += 1;
        catMap.set(t.category, curCat);

        const curMerchant = merchantMap.get(t.merchant) || { total: 0, count: 0, category: t.category };
        curMerchant.total += t.amount;
        curMerchant.count += 1;
        merchantMap.set(t.merchant, curMerchant);
      } else {
        totalIncome += t.amount;
      }
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
    const totalBudget = categories.reduce((sum, c) => sum + c.monthlyBudget, 0);
    const budgetUtilization = totalBudget > 0 ? (totalExpense / totalBudget) * 100 : 0;

    const categoryBreakdown = categories
      .map((cat) => {
        const data = catMap.get(cat.id) || { total: 0, count: 0 };
        const percentOfSpend = totalExpense > 0 ? (data.total / totalExpense) * 100 : 0;
        const budgetRatio = cat.monthlyBudget > 0 ? (data.total / cat.monthlyBudget) * 100 : 0;
        const variance = cat.monthlyBudget - data.total;
        return {
          ...cat,
          spent: data.total,
          count: data.count,
          percentOfSpend,
          budgetRatio,
          variance,
        };
      })
      .filter((c) => c.spent > 0 || c.monthlyBudget > 0)
      .sort((a, b) => b.spent - a.spent);

    const topMerchants = Array.from(merchantMap.entries())
      .map(([name, d]) => ({
        name,
        total: d.total,
        count: d.count,
        percent: totalExpense > 0 ? (d.total / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const activeSubs = subscriptions.filter((s) => s.active);
    const subsMonthlyCost = activeSubs.reduce(
      (sum, s) => sum + (s.billingCycle === 'monthly' ? s.amount : s.amount / 12),
      0
    );

    // Performance assessment summary
    const observations: string[] = [];
    if (savingsRate >= 30) {
      observations.push(`Excellent capital retention: Net savings rate currently stands at ${savingsRate.toFixed(1)}%.`);
    } else if (savingsRate >= 15) {
      observations.push(`Moderate savings rate of ${savingsRate.toFixed(1)}% aligns with healthy maintenance targets.`);
    } else if (savingsRate > 0) {
      observations.push(`Low surplus buffer of ${savingsRate.toFixed(1)}%; recommend trimming discretionary categories.`);
    } else {
      observations.push(`Outflow currently outpaces incoming revenue by ${formatCurrency(Math.abs(netSavings), currency)}.`);
    }

    if (budgetUtilization <= 85) {
      observations.push(`Monthly spending is well controlled at ${budgetUtilization.toFixed(1)}% of total allocated budget.`);
    } else if (budgetUtilization <= 100) {
      observations.push(`Expenditure has reached ${budgetUtilization.toFixed(1)}% of total monthly ceiling.`);
    } else {
      observations.push(`Budget ceiling exceeded by ${(budgetUtilization - 100).toFixed(1)}% (${formatCurrency(totalExpense - totalBudget, currency)} overage).`);
    }

    if (categoryBreakdown.length > 0) {
      const topCat = categoryBreakdown[0];
      observations.push(
        `Top outflow driver is ${topCat.name} at ${formatCurrency(topCat.spent, currency)} (${topCat.percentOfSpend.toFixed(1)}% of total expenditure).`
      );
    }

    return {
      monthName,
      txCount: monthTxs.length,
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      totalBudget,
      budgetUtilization,
      categoryBreakdown,
      topMerchants,
      subsCount: activeSubs.length,
      subsMonthlyCost,
      observations,
    };
  }, [transactions, categories, subscriptions, currency]);

  // Generate plain text report string
  const plainTextReport = useMemo(() => {
    const divider = '============================================================';
    const subDivider = '------------------------------------------------------------';
    const lines: string[] = [];

    lines.push(divider);
    lines.push(` HOMEPULSE MONTHLY FINANCIAL PERFORMANCE REPORT`);
    lines.push(` Period: ${reportData.monthName} | Generated: ${new Date().toLocaleDateString('en-US')}`);
    lines.push(divider);
    lines.push('');

    lines.push('1. EXECUTIVE CASH FLOW SUMMARY');
    lines.push(subDivider);
    lines.push(`  Total Inflow (Income)       : ${formatCurrency(reportData.totalIncome, currency)}`);
    lines.push(`  Total Outflow (Expenses)    : ${formatCurrency(reportData.totalExpense, currency)}`);
    lines.push(`  Net Capital Surplus         : ${formatCurrency(reportData.netSavings, currency)}`);
    lines.push(`  Savings Efficiency Rate     : ${reportData.savingsRate.toFixed(1)}%`);
    lines.push(`  Monthly Budget Allocated    : ${formatCurrency(reportData.totalBudget, currency)}`);
    lines.push(`  Budget Consumption Rate     : ${reportData.budgetUtilization.toFixed(1)}%`);
    lines.push('');

    lines.push('2. CATEGORY OUTFLOW & BUDGET VARIANCE');
    lines.push(subDivider);
    lines.push('  Category                 Spent         Budget      Utilized   Headroom');
    lines.push('  ----------------------------------------------------------------------');
    reportData.categoryBreakdown.forEach((cat) => {
      const catName = cat.name.padEnd(24, ' ');
      const spentStr = formatCurrency(cat.spent, currency).padStart(12, ' ');
      const budgetStr = formatCurrency(cat.monthlyBudget, currency).padStart(12, ' ');
      const utilStr = `${cat.budgetRatio.toFixed(0)}%`.padStart(10, ' ');
      const varianceSign = cat.variance >= 0 ? '+' : '-';
      const varianceStr = `${varianceSign}${formatCurrency(Math.abs(cat.variance), currency)}`.padStart(12, ' ');
      lines.push(`  ${catName}${spentStr}${budgetStr}${utilStr} ${varianceStr}`);
    });
    lines.push('');

    lines.push('3. TOP MERCHANT CONCENTRATIONS');
    lines.push(subDivider);
    reportData.topMerchants.forEach((m, idx) => {
      const rank = `${idx + 1}.`.padEnd(4, ' ');
      const mName = m.name.padEnd(28, ' ');
      const amountStr = formatCurrency(m.total, currency).padStart(12, ' ');
      const shareStr = `(${m.percent.toFixed(1)}% of total, ${m.count} tx)`.padStart(22, ' ');
      lines.push(`  ${rank}${mName}${amountStr} ${shareStr}`);
    });
    lines.push('');

    lines.push('4. RECURRING OBLIGATIONS & RUN-RATE');
    lines.push(subDivider);
    lines.push(`  Active Fixed Services       : ${reportData.subsCount} subscriptions`);
    lines.push(`  Monthly Recurring Burn-Rate : ${formatCurrency(reportData.subsMonthlyCost, currency)}`);
    lines.push('');

    lines.push('5. PERFORMANCE EVALUATION & AUDIT NOTES');
    lines.push(subDivider);
    reportData.observations.forEach((obs, idx) => {
      lines.push(`  • ${obs}`);
    });
    lines.push('');
    lines.push(divider);
    lines.push(' End of HomePulse Financial Summary Report');

    return lines.join('\n');
  }, [reportData, currency]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(plainTextReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    downloadFile(plainTextReport, `monthly_summary_${reportData.monthName.toLowerCase().replace(' ', '_')}.txt`, 'text/plain');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#071026] p-1 shadow-xs ring-1 ring-slate-800">
              <img
                src="/assets/aistudio/image_806b5b1b.png"
                alt="HomePulse Logo"
                className="h-full w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Monthly Performance Summary Report
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Text-based executive audit for {reportData.monthName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
              <button
                onClick={() => setViewMode('formatted')}
                className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-all ${
                  viewMode === 'formatted'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Structured</span>
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-all ${
                  viewMode === 'raw'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                <AlignLeft className="h-3.5 w-3.5" />
                <span>Plaintext</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Report Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {viewMode === 'formatted' ? (
            <div className="space-y-6 text-xs text-slate-700 dark:text-slate-300">
              {/* 1. Cash Flow Summary Cards */}
              <div>
                <h4 className="mb-2 font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  1. Executive Cash Flow Summary
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Inflow</span>
                    <div className="mt-1 font-mono text-base font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                      +{formatCurrency(reportData.totalIncome, currency)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Outflow</span>
                    <div className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums dark:text-slate-100">
                      {formatCurrency(reportData.totalExpense, currency)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Net Surplus</span>
                    <div
                      className={`mt-1 font-mono text-base font-bold tabular-nums ${
                        reportData.netSavings >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatCurrency(reportData.netSavings, currency)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Savings Rate</span>
                    <div className="mt-1 font-mono text-base font-bold text-blue-600 tabular-nums dark:text-blue-400">
                      {reportData.savingsRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Category Outflow & Budget Variance */}
              <div>
                <h4 className="mb-2 font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  2. Category Breakdown & Variance
                </h4>
                <div className="overflow-hidden rounded-lg border border-slate-200/70 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                        <th className="px-3 py-2 font-medium">Category</th>
                        <th className="px-3 py-2 text-right font-medium">Spent</th>
                        <th className="px-3 py-2 text-right font-medium">Budget</th>
                        <th className="px-3 py-2 text-right font-medium">Used</th>
                        <th className="px-3 py-2 text-right font-medium">Headroom</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reportData.categoryBreakdown.map((cat) => (
                        <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                              <span
                                className="h-2 w-2 rounded-xs shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span>{cat.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                            {formatCurrency(cat.spent, currency)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {formatCurrency(cat.monthlyBudget, currency)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">
                            {cat.budgetRatio.toFixed(0)}%
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">
                            {cat.variance >= 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                +{formatCurrency(cat.variance, currency)}
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400">
                                -{formatCurrency(Math.abs(cat.variance), currency)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Top Payees & Subscriptions Strip */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="mb-2 font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    3. Top Merchant Outflows
                  </h4>
                  <div className="space-y-1.5 rounded-lg border border-slate-200/70 p-3 dark:border-slate-800">
                    {reportData.topMerchants.map((m, idx) => (
                      <div key={m.name} className="flex items-center justify-between text-xs">
                        <span className="text-slate-700 dark:text-slate-300">
                          {idx + 1}. {m.name}
                        </span>
                        <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                          {formatCurrency(m.total, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    4. Recurring Obligations
                  </h4>
                  <div className="space-y-2 rounded-lg border border-slate-200/70 p-3 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Active Subscriptions:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {reportData.subsCount} services
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Monthly Run-Rate:</span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums dark:text-slate-100">
                        {formatCurrency(reportData.subsMonthlyCost, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Observations & Insights */}
              <div>
                <h4 className="mb-2 font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  5. Performance Observations
                </h4>
                <div className="space-y-1.5 rounded-lg border border-slate-200/70 bg-slate-50/50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/30">
                  {reportData.observations.map((obs, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>{obs}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <pre className="font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-all">
                {plainTextReport}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="text-[11px] text-slate-400">
            Formatted for clipboard export and documentation
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Report</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download (.txt)</span>
            </button>

            <button
              onClick={() => generateMonthlyReportPDF(transactions, categories, subscriptions, currency)}
              className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/70 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 transition-colors"
            >
              <FileDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              <span>Download PDF (.pdf)</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
