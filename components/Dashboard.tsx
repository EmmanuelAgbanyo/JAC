import React, { useState, useMemo, useCallback } from 'react';
import type { Entrepreneur, Transaction } from '../types';
import { TransactionType } from '../constants';
import StatCard from './Dashboard/StatCard';
import PerformanceChart from './Dashboard/PerformanceChart';
import RecentActivity from './Dashboard/RecentActivity';

interface DashboardProps {
  entrepreneurs: Entrepreneur[];
  transactions: Transaction[];
}

type DateRange = '7d' | '30d' | '90d' | 'all';

const DATE_RANGE_OPTIONS: { key: DateRange; label: string }[] = [
    { key: '7d', label: 'Last 7 Days' },
    { key: '30d', label: 'Last 30 Days' },
    { key: '90d', label: 'Last 90 Days' },
    { key: 'all', label: 'All Time' },
];

const getPeriodDates = (range: DateRange) => {
    const end = new Date();
    const start = new Date();
    end.setHours(23, 59, 59, 999);

    switch(range) {
        case '7d':
            start.setDate(end.getDate() - 6);
            break;
        case '30d':
            start.setDate(end.getDate() - 29);
            break;
        case '90d':
            start.setDate(end.getDate() - 89);
            break;
        case 'all':
            return { start: new Date(0), end };
    }
    start.setHours(0, 0, 0, 0);
    return { start, end };
};

const getPreviousPeriodDates = (range: DateRange, currentStart: Date) => {
    if (range === 'all') return { start: new Date(0), end: new Date(0) };
    
    const diff = (new Date()).getTime() - currentStart.getTime();
    const end = new Date(currentStart.getTime() - 1);
    const start = new Date(end.getTime() - diff);
    return { start, end };
};

const Dashboard = ({ entrepreneurs, transactions }: DashboardProps) => {
    const [dateRange, setDateRange] = useState<DateRange>('30d');
    
    const { 
        currentStats, 
        previousStats,
        chartData,
        recentActivities,
        topEntrepreneurs
    } = useMemo(() => {
        const { start, end } = getPeriodDates(dateRange);
        const { start: prevStart, end: prevEnd } = getPreviousPeriodDates(dateRange, start);

        const filterItemsByDate = <T extends Transaction | Entrepreneur>(items: T[], s: Date, e: Date, dateKey: 'date' | 'startDate'): T[] => {
            return items.filter(item => {
                const itemDate = new Date(item[dateKey]);
                return itemDate >= s && itemDate <= e;
            });
        };

        const filteredTransactions = filterItemsByDate(transactions, start, end, 'date');
        const previousTransactions = filterItemsByDate(transactions, prevStart, prevEnd, 'date');
        const newEntrepreneursInPeriod = filterItemsByDate(entrepreneurs, start, end, 'startDate');

        const calculateStats = (trans: Transaction[], entr: Entrepreneur[]) => {
            const totalIncome = trans.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
            const totalExpenses = trans.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
            return {
                totalIncome,
                totalExpenses,
                netIncome: totalIncome - totalExpenses,
                newEntrepreneurs: entr.length,
            };
        };

        const cStats = calculateStats(filteredTransactions, newEntrepreneursInPeriod);
        const pStats = calculateStats(previousTransactions, []); // Not comparing new entrepreneurs for simplicity

        // Chart Data Aggregation
        const daysInRange = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
        const aggregateBy = daysInRange > 45 ? 'month' : 'day';

        const dataMap = new Map<string, { income: number, expense: number }>();
        filteredTransactions.forEach(t => {
            const key = aggregateBy === 'day' ? t.date : t.date.slice(0, 7);
            if (!dataMap.has(key)) dataMap.set(key, { income: 0, expense: 0 });
            const entry = dataMap.get(key)!;
            if (t.type === TransactionType.INCOME) entry.income += t.amount;
            else entry.expense += t.amount;
        });
        
        const cData = Array.from(dataMap.entries())
            .sort((a,b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
            .map(([dateKey, values]) => ({
                name: aggregateBy === 'day' 
                    ? new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : new Date(dateKey + '-02').toLocaleString('default', { month: 'short', year: 'numeric' }),
                Income: values.income,
                Expenses: values.expense,
                'Net Income': values.income - values.expense
            }));

        const rActivities = [
            ...filteredTransactions.map(t => ({ date: t.date, type: 'transaction' as const, data: t })),
            ...newEntrepreneursInPeriod.map(e => ({ date: e.startDate, type: 'entrepreneur' as const, data: e }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 7);

        const tEntrepreneurs = entrepreneurs.map(e => {
            const income = filteredTransactions
                .filter(t => t.entrepreneurId === e.id && t.type === TransactionType.INCOME)
                .reduce((sum, t) => sum + t.amount, 0);
            return { name: e.businessName, income };
        }).filter(e => e.income > 0).sort((a,b) => b.income - a.income).slice(0, 5);

        return {
            currentStats: cStats,
            previousStats: pStats,
            chartData: cData,
            recentActivities: rActivities,
            topEntrepreneurs: tEntrepreneurs,
        };
    }, [dateRange, transactions, entrepreneurs]);
    
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-dark-text">Admin Dashboard</h1>
        <div className="bg-white dark:bg-dark-secondary p-1 rounded-lg shadow-sm border dark:border-dark-border flex items-center">
            {DATE_RANGE_OPTIONS.map(opt => (
                <button 
                    key={opt.key}
                    onClick={() => setDateRange(opt.key)}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 ${
                        dateRange === opt.key 
                        ? 'bg-primary text-white shadow' 
                        : 'text-gray-600 dark:text-dark-textSecondary hover:bg-gray-100 dark:hover:bg-dark-primary'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Income" value={currentStats.totalIncome} previousValue={previousStats.totalIncome} formatAs="currency" />
        <StatCard title="Total Expenses" value={currentStats.totalExpenses} previousValue={previousStats.totalExpenses} formatAs="currency" isExpense />
        <StatCard title="Net Income" value={currentStats.netIncome} previousValue={previousStats.netIncome} formatAs="currency" />
        <StatCard title="New Entrepreneurs" value={currentStats.newEntrepreneurs} previousValue={previousStats.newEntrepreneurs} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-dark-secondary p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-dark-text mb-4">Performance Overview</h3>
            <PerformanceChart data={chartData} />
        </div>
        <div className="space-y-6">
            <RecentActivity activities={recentActivities} entrepreneurs={entrepreneurs} />
            <div className="bg-white dark:bg-dark-secondary p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-dark-text mb-4">Top Entrepreneurs by Income</h3>
                {topEntrepreneurs.length > 0 ? (
                    <ul className="space-y-3">
                        {topEntrepreneurs.map((e, index) => (
                            <li key={index} className="flex justify-between items-center text-sm">
                                <span className="font-medium text-gray-800 dark:text-dark-text">{e.name}</span>
                                <span className="font-semibold text-green-600">GHS {e.income.toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-center text-gray-500 dark:text-dark-textSecondary py-4">No income recorded in this period.</p>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;