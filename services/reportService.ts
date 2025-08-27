
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
