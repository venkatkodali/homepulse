import { jsPDF } from 'jspdf';
import { CategoryInfo, CurrencyConfig, Subscription, Transaction } from '../types';
import { formatCurrency } from './formatters';

export interface MonthlyReportData {
  monthName: string;
  monthKey: string;
  txCount: number;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  totalBudget: number;
  budgetUtilization: number;
  categoryBreakdown: {
    id: string;
    name: string;
    color: string;
    spent: number;
    count: number;
    monthlyBudget: number;
    percentOfSpend: number;
    budgetRatio: number;
    variance: number;
  }[];
  topMerchants: {
    name: string;
    total: number;
    count: number;
    percent: number;
  }[];
  subsCount: number;
  subsMonthlyCost: number;
  observations: string[];
}

export function computeMonthlyReportData(
  transactions: Transaction[],
  categories: CategoryInfo[],
  subscriptions: Subscription[],
  currency: CurrencyConfig
): MonthlyReportData {
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
        id: cat.id,
        name: cat.name,
        color: cat.color,
        spent: data.total,
        count: data.count,
        monthlyBudget: cat.monthlyBudget,
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
    monthKey: currentMonthKey,
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
}

export function generateMonthlyReportPDF(
  transactions: Transaction[],
  categories: CategoryInfo[],
  subscriptions: Subscription[],
  currency: CurrencyConfig
): void {
  const data = computeMonthlyReportData(transactions, categories, subscriptions, currency);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - 2 * margin;

  let y = margin;

  // 1. Header & Brand Banner
  doc.setFillColor(37, 99, 235); // Blue 600
  doc.rect(margin, y, 7, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('H', margin + 2.2, y + 5);

  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('HomePulse', margin + 11, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate 500
  const dateStr = `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`;
  doc.text(dateStr, pageWidth - margin, y + 5, { align: 'right' });

  y += 11;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`Monthly Financial Performance Summary: ${data.monthName}`, margin, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Comprehensive cash flow analysis, category variance, and recurring obligation audit`, margin, y);

  y += 4;
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  y += 7;

  // 2. Executive Cash Flow KPI Boxes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('1. Executive Cash Flow Summary', margin, y);

  y += 4;

  const boxWidth = (contentWidth - 9) / 4;
  const boxHeight = 16;

  const kpis = [
    { label: 'Total Inflow', val: `+${formatCurrency(data.totalIncome, currency)}`, color: [16, 185, 129] },
    { label: 'Total Outflow', val: `-${formatCurrency(data.totalExpense, currency)}`, color: [15, 23, 42] },
    {
      label: 'Net Surplus',
      val: formatCurrency(data.netSavings, currency),
      color: data.netSavings >= 0 ? [16, 185, 129] : [225, 29, 72],
    },
    { label: 'Savings Efficiency', val: `${data.savingsRate.toFixed(1)}%`, color: [37, 99, 235] },
  ];

  kpis.forEach((kpi, idx) => {
    const bx = margin + idx * (boxWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(bx, y, boxWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, bx + 3, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, bx + 3, y + 12);
  });

  y += boxHeight + 7;

  // 3. Category Outflow & Budget Variance Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('2. Category Breakdown & Budget Variance', margin, y);

  y += 4;

  // Table Header Row
  const rowHeight = 6.2;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, rowHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Category', margin + 3, y + 4.2);
  doc.text('Spent', margin + 65, y + 4.2, { align: 'right' });
  doc.text('Monthly Budget', margin + 105, y + 4.2, { align: 'right' });
  doc.text('Utilized', margin + 135, y + 4.2, { align: 'right' });
  doc.text('Headroom / Variance', pageWidth - margin - 3, y + 4.2, { align: 'right' });

  y += rowHeight;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const topCats = data.categoryBreakdown.slice(0, 8);
  topCats.forEach((cat, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    doc.setTextColor(30, 41, 59);
    doc.text(cat.name, margin + 3, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(cat.spent, currency), margin + 65, y + 4.2, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(formatCurrency(cat.monthlyBudget, currency), margin + 105, y + 4.2, { align: 'right' });

    doc.setTextColor(71, 85, 105);
    doc.text(`${cat.budgetRatio.toFixed(0)}%`, margin + 135, y + 4.2, { align: 'right' });

    if (cat.variance >= 0) {
      doc.setTextColor(16, 185, 129);
      doc.text(`+${formatCurrency(cat.variance, currency)}`, pageWidth - margin - 3, y + 4.2, { align: 'right' });
    } else {
      doc.setTextColor(225, 29, 72);
      doc.text(`-${formatCurrency(Math.abs(cat.variance), currency)}`, pageWidth - margin - 3, y + 4.2, { align: 'right' });
    }

    y += rowHeight;
  });

  y += 5;

  // 4. Two Columns: Top Merchants & Recurring Obligations
  const colWidth = (contentWidth - 6) / 2;

  // Column 1: Top Merchants
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('3. Top Merchant Outflows', margin, y);

  // Column 2: Recurring Obligations
  doc.text('4. Recurring Obligations', margin + colWidth + 6, y);

  y += 4;

  const colYStart = y;

  // Render Merchants
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  data.topMerchants.forEach((m, idx) => {
    doc.setTextColor(71, 85, 105);
    doc.text(`${idx + 1}. ${m.name}`, margin + 2, y + 3.8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(m.total, currency), margin + colWidth - 2, y + 3.8, { align: 'right' });
    y += 5.5;
  });

  // Render Subscriptions in Column 2
  let subY = colYStart;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Active Tracked Subscriptions:`, margin + colWidth + 8, subY + 3.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.subsCount} services`, pageWidth - margin - 2, subY + 3.8, { align: 'right' });

  subY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Monthly Recurring Burn-Rate:`, margin + colWidth + 8, subY + 3.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text(formatCurrency(data.subsMonthlyCost, currency), pageWidth - margin - 2, subY + 3.8, { align: 'right' });

  subY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Annualized Obligation:`, margin + colWidth + 8, subY + 3.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(data.subsMonthlyCost * 12, currency), pageWidth - margin - 2, subY + 3.8, { align: 'right' });

  y = Math.max(y, subY + 8) + 3;

  // 5. Performance Audit & Observations
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('5. Financial Health Verdict & Performance Notes', margin, y);

  y += 4;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  const obsBoxHeight = data.observations.length * 6 + 6;
  doc.roundedRect(margin, y, contentWidth, obsBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  data.observations.forEach((obs, idx) => {
    doc.text(`•  ${obs}`, margin + 4, y + 5 + idx * 6);
  });

  // Footer Signature
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('HomePulse Financial Platform • Official Monthly Summary Document • Page 1 of 1', pageWidth / 2, pageHeight - 10, {
    align: 'center',
  });

  // Download PDF
  doc.save(`homepulse_summary_report_${data.monthKey}.pdf`);
}
