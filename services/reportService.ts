import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Entrepreneur, Transaction, ReportData } from '../types';
import { TransactionType, PaidStatus } from '../constants';

export const generateReportData = (
  entrepreneurId: string,
  period: string, // YYYY-MM or YYYY
  allTransactions: Transaction[]
): ReportData => {
  const transactions = allTransactions.filter(
    t => t.entrepreneurId === entrepreneurId && t.date.startsWith(period)
  );

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalBilled = 0; // Total amount for all income transactions this period
  const incomeTransactions: Transaction[] = [];
  const expenseTransactions: Transaction[] = [];
  
  const incomeByCategoryMap: Record<string, number> = {};
  const expenseByCategoryMap: Record<string, number> = {};

  transactions.forEach(t => {
    const category = t.productServiceCategory || 'Uncategorized';
    if (t.type === TransactionType.INCOME) {
      totalIncome += t.amount; // This assumes amount is what was actually received or fully paid value
      totalBilled += t.amount; // For simplicity, assume amount is the billed amount
      incomeTransactions.push(t);
      incomeByCategoryMap[category] = (incomeByCategoryMap[category] || 0) + t.amount;
    } else {
      totalExpenses += t.amount;
      expenseTransactions.push(t);
      expenseByCategoryMap[category] = (expenseByCategoryMap[category] || 0) + t.amount;
    }
  });

  const netIncome = totalIncome - totalExpenses;

  // Receivables: sum of amounts for transactions not fully paid
  const outstandingReceivables = incomeTransactions
    .filter(t => t.paidStatus === PaidStatus.PENDING || t.paidStatus === PaidStatus.PARTIAL)
    .reduce((sum, t) => {
        // A more complex model would track original billed vs amount paid for partials.
        // For now, if partial, the transaction.amount is considered outstanding.
        return sum + t.amount;
    }, 0);

  const receivablesSummary = {
    total: outstandingReceivables,
    count: incomeTransactions.filter(t => t.paidStatus === PaidStatus.PENDING || t.paidStatus === PaidStatus.PARTIAL).length,
  };
  
  // Collection Rate: (Total Billed - Outstanding Receivables) / Total Billed
  // This is an approximation. A more accurate calculation would need to sum actual cash received.
  // For now, totalIncome represents cash collected or value of fully paid services.
  // Let's define totalBilled as sum of all income transaction amounts.
  // And totalCollected as totalBilled - outstandingReceivables
  const totalCollected = totalBilled - outstandingReceivables;
  const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;


  const transactionCount = {
    income: incomeTransactions.length,
    expense: expenseTransactions.length,
  };

  const incomeByCategory = Object.entries(incomeByCategoryMap)
    .map(([category, amount]) => ({ category, amount, percentage: totalBilled > 0 ? (amount / totalBilled) * 100 : 0 }))
    .sort((a,b) => b.amount - a.amount);
    
  const expenseByCategory = Object.entries(expenseByCategoryMap)
    .map(([category, amount]) => ({ category, amount, percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0 }))
    .sort((a,b) => b.amount - a.amount);

  const fullyPaidIncomeTransactions = incomeTransactions.filter(t => t.paidStatus === PaidStatus.FULL).length;
  const fullPaymentRate = incomeTransactions.length > 0 ? (fullyPaidIncomeTransactions / incomeTransactions.length) * 100 : 0;

  const topSellingItems = [...incomeByCategory].slice(0, 5);

  return {
    totalIncome, // This effectively becomes 'total collected or fully settled income value'
    totalExpenses,
    netIncome,
    receivablesSummary,
    transactionCount,
    incomeByCategory,
    expenseByCategory,
    fullPaymentRate,
    collectionRate,
    totalBilled,
    topSellingItems,
  };
};

export const exportReportToCSV = (
    reportData: ReportData, 
    allTransactions: Transaction[],
    entrepreneurId: string,
    period: string,
    entrepreneurName: string // Full entrepreneur object could be passed too
  ): void => {
  const transactionsForReport = allTransactions.filter(
    t => t.entrepreneurId === entrepreneurId && t.date.startsWith(period)
  );

  let csvContent = "data:text/csv;charset=utf-8,";
  
  const reportPeriod = period.length === 7 
    ? new Date(period + "-02").toLocaleString('default', { month: 'long', year: 'numeric' })
    : `Year ${period}`;

  csvContent += "AES Just A Call (JAC) Financial Performance Report\n";
  csvContent += `Entrepreneur,"${entrepreneurName}"\n`;
  csvContent += `Period,"${reportPeriod}"\n\n`;
  
  csvContent += "Financial Summary\n";
  csvContent += `Total Income (GHS),"${reportData.totalIncome.toFixed(2)}"\n`;
  csvContent += `Total Billed This Period (GHS),"${reportData.totalBilled?.toFixed(2) ?? 'N/A'}"\n`;
  csvContent += `Total Expenses (GHS),"${reportData.totalExpenses.toFixed(2)}"\n`;
  csvContent += `Net Income (GHS),"${reportData.netIncome.toFixed(2)}"\n`;
  csvContent += `Outstanding Receivables (GHS),"${reportData.receivablesSummary.total.toFixed(2)}"\n`;
  csvContent += `Outstanding Receivables Count,"${reportData.receivablesSummary.count}"\n`;
  csvContent += `Collection Rate (%),"${reportData.collectionRate?.toFixed(1) ?? 'N/A'}"\n`;
  csvContent += `Full Payment Rate (Income Transactions) (%),"${reportData.fullPaymentRate.toFixed(1)}"\n\n`;

  csvContent += "Income by Category\n";
  csvContent += "Category,Amount (GHS),Percentage of Total Billed\n";
  reportData.incomeByCategory.forEach(item => {
    csvContent += `"${item.category}",${item.amount.toFixed(2)},${item.percentage.toFixed(1)}\n`;
  });
  csvContent += "\n";

  csvContent += "Expense by Category\n";
  csvContent += "Category,Amount (GHS),Percentage of Total Expenses\n";
  reportData.expenseByCategory.forEach(item => {
    csvContent += `"${item.category}",${item.amount.toFixed(2)},${item.percentage.toFixed(1)}\n`;
  });
  csvContent += "\n";

  csvContent += "All Transactions for Period\n";
  const headers = ["Date", "Type", "Description", "Amount (GHS)", "Payment Method", "Paid Status", "Customer Name", "Product/Service Category"];
  csvContent += headers.join(",") + "\n";

  transactionsForReport.forEach(t => {
    const row = [
      t.date,
      t.type,
      `"${t.description.replace(/"/g, '""')}"`, 
      t.amount.toFixed(2),
      t.paymentMethod,
      t.type === TransactionType.INCOME ? t.paidStatus : '',
      `"${t.customerName?.replace(/"/g, '""') || ''}"`,
      `"${t.productServiceCategory?.replace(/"/g, '""') || ''}"`
    ];
    csvContent += row.join(",") + "\n";
  });
  
  if(reportData.geminiInsights) {
    csvContent += "\nStrategic Insights & Recommendations\n";
    csvContent += `"${reportData.geminiInsights.replace(/"/g, '""').replace(/\n/g, ' ')}"\n`; // Flatten for CSV
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Report_Data_${entrepreneurName.replace(/\s/g, '_')}_${period}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};