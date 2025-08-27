
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Entrepreneur, Transaction, AiReport } from '../types';
import { generateAiPoweredReport } from '../services/geminiService';
import Button from './ui/Button';
import Select from './ui/Select';
import LoadingSpinner from './LoadingSpinner';
import HtmlReportView from './HtmlReportView';
import { TransactionType } from '../constants';

interface ReportGeneratorProps {
  entrepreneurs: Entrepreneur[];
  transactions: Transaction[];
}

interface TransactionSummary {
    count: number;
    income: number;
    expenses: number;
}

const ReportGenerator = ({ entrepreneurs, transactions }: ReportGeneratorProps) => {
  const [selectedEntrepreneurId, setSelectedEntrepreneurId] = useState<string>('');
  const [periodType, setPeriodType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [aiReport, setAiReport] = useState<AiReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reportContext, setReportContext] = useState<{ entrepreneur: Entrepreneur; transactions: Transaction[], period: string} | null>(null);
  const [autoGeneratePdf, setAutoGeneratePdf] = useState<boolean>(true);
  const [shouldAutoExport, setShouldAutoExport] = useState<boolean>(false);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummary | null>(null);


  const entrepreneurOptions = entrepreneurs.map(e => ({ value: e.id, label: `${e.name} (${e.businessName})` }));
  
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => months.add(t.date.slice(0,7)));
    if (months.size === 0) {
        months.add(new Date().toISOString().slice(0,7));
    }
    return Array.from(months).sort().reverse().map(m => ({value: m, label: new Date(m+"-02").toLocaleString('default', { month: 'long', year: 'numeric' })}));
  }, [transactions]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    transactions.forEach(t => years.add(t.date.slice(0, 4)));
    if (years.size === 0) {
        years.add(new Date().getFullYear().toString());
    }
    return Array.from(years).sort().reverse().map(y => ({value: y, label: y}));
  }, [transactions]);
  
  useEffect(() => {
      const period = periodType === 'monthly' ? selectedMonth : selectedYear;
      if (selectedEntrepreneurId && period) {
        const relevantTransactions = transactions.filter(t => 
            t.entrepreneurId === selectedEntrepreneurId && t.date.startsWith(period)
        );
        const summary: TransactionSummary = {
            count: relevantTransactions.length,
            income: relevantTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0),
            expenses: relevantTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0),
        };
        setTransactionSummary(summary);
      } else {
        setTransactionSummary(null);
      }
  }, [selectedEntrepreneurId, periodType, selectedMonth, selectedYear, transactions]);


  const handleGenerateReport = useCallback(async () => {
    const period = periodType === 'monthly' ? selectedMonth : selectedYear;
    const entrepreneur = entrepreneurs.find(e => e.id === selectedEntrepreneurId);

    if (!entrepreneur || !period) {
      setError("Please select an entrepreneur and a period.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setAiReport(null);
    setReportContext(null);

    try {
      const relevantTransactions = transactions.filter(t => t.entrepreneurId === selectedEntrepreneurId && t.date.startsWith(period));
      setShouldAutoExport(autoGeneratePdf && relevantTransactions.length > 0);
      
      if (!process.env.API_KEY) {
        throw new Error("Gemini API key not configured. Strategic insights from AI are unavailable. Please configure the API_KEY environment variable.");
      }

      const report = await generateAiPoweredReport(relevantTransactions, entrepreneur, period, entrepreneur.goals);
      setAiReport(report);
      setReportContext({ entrepreneur, transactions: relevantTransactions, period });

    } catch (err) {
      console.error("Error generating AI report:", err);
      setError((err as Error).message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedEntrepreneurId, periodType, selectedMonth, selectedYear, transactions, entrepreneurs, autoGeneratePdf]);
  
  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center p-10">
            <LoadingSpinner message="Your AI Financial Analyst is preparing the report..." />
        </div>
    );
  }

  if (aiReport && reportContext) {
    return (
      <HtmlReportView 
        aiReport={aiReport} 
        entrepreneur={reportContext.entrepreneur}
        transactionsForPeriod={reportContext.transactions}
        period={reportContext.period}
        onClose={() => {
            setAiReport(null);
            setShouldAutoExport(false);
        }}
        autoExportAs={shouldAutoExport ? 'pdf' : null}
      />
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800">AI-Powered Report Generator</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 items-end">
          <Select
            label="Select Entrepreneur"
            id="selectedEntrepreneurId"
            options={entrepreneurOptions}
            value={selectedEntrepreneurId}
            onChange={(e) => setSelectedEntrepreneurId(e.target.value)}
            required
          />
          <Select
            label="Report Type"
            id="reportType"
            options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]}
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as 'monthly' | 'yearly')}
          />
          {periodType === 'monthly' ? (
            <Select
              label="Select Month"
              id="selectedMonth"
              options={availableMonths}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              required
            />
          ) : (
            <Select
              label="Select Year"
              id="selectedYear"
              options={availableYears}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              required
            />
          )}
        </div>

        {transactionSummary && (
            <div className="my-4 p-4 bg-blue-50 border border-blue-200 rounded-md animate-fadeIn">
                <h4 className="font-semibold text-aesBlue mb-2">Data Preview for Selected Period</h4>
                {transactionSummary.count > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <p><span className="font-medium text-gray-600">Transactions:</span> {transactionSummary.count}</p>
                        <p><span className="font-medium text-gray-600">Total Income:</span> <span className="text-green-600 font-semibold">GHS {transactionSummary.income.toFixed(2)}</span></p>
                        <p><span className="font-medium text-gray-600">Total Expenses:</span> <span className="text-red-600 font-semibold">GHS {transactionSummary.expenses.toFixed(2)}</span></p>
                    </div>
                ) : (
                    <p className="text-gray-600 italic text-sm">No transactions found for this period. An AI summary can still be generated based on the lack of activity.</p>
                )}
            </div>
        )}
        
        <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center">
                    <input 
                        id="auto-pdf-checkbox" 
                        type="checkbox" 
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={autoGeneratePdf}
                        onChange={(e) => setAutoGeneratePdf(e.target.checked)}
                    />
                    <label htmlFor="auto-pdf-checkbox" className="ml-2 block text-sm text-gray-700">
                        Auto-generate PDF
                    </label>
                </div>
                <Button onClick={handleGenerateReport} disabled={!selectedEntrepreneurId}>
                    Generate AI Report
                </Button>
            </div>
        </div>

        {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mt-4">{error}</p>}
      </div>
       <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="font-semibold text-aesBlue">This is the new AI Reporting Engine</p>
          <p className="text-sm text-gray-600">Select an entrepreneur and period, and let our AI Financial Analyst generate a comprehensive, professional report for you.</p>
        </div>
    </div>
  );
};

export default ReportGenerator;
