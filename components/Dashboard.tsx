
import React, { type ReactNode } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { Entrepreneur, Transaction } from '../types';
import { AppView, TransactionType } from '../constants';
import Button from './ui/Button';
import AiInsights from './AiInsights';

interface DashboardProps {
  entrepreneurs: Entrepreneur[];
  transactions: Transaction[];
  navigateTo: (view: AppView) => void;
}

const COLORS = ['#004AAD', '#28a745', '#D4A017', '#00B8D9', '#E57373', '#F06292'];

const Dashboard = ({ entrepreneurs, transactions, navigateTo }: DashboardProps) => {
  const totalEntrepreneurs = entrepreneurs.length;
  const totalTransactions = transactions.length;

  const totalIncome = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const netIncome = totalIncome - totalExpenses;

  const incomeByEntrepreneur = entrepreneurs.map(e => {
    const income = transactions
      .filter(t => t.entrepreneurId === e.id && t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    return { name: e.businessName, income };
  }).filter(e => e.income > 0).sort((a,b) => b.income - a.income).slice(0,5);

  const transactionTypeData = [
    { name: 'Income', value: transactions.filter(t => t.type === TransactionType.INCOME).length },
    { name: 'Expenses', value: transactions.filter(t => t.type === TransactionType.EXPENSE).length },
  ];
  
  const StatCard = ({ title, value, color, icon }: {title: string, value: string | number, color: string, icon?: ReactNode}) => (
    <div className={`bg-white p-6 rounded-lg shadow-lg border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-semibold text-gray-900">{value}</p>
        </div>
        {icon && <div className="text-3xl opacity-70">{icon}</div>}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Entrepreneurs" value={totalEntrepreneurs} color="border-primary" icon={<span>👥</span>} />
        <StatCard title="Total Transactions" value={totalTransactions} color="border-info" icon={<span>🔄</span>} />
        <StatCard title="Total Net Income (GHS)" value={netIncome.toFixed(2)} color={netIncome >= 0 ? "border-success" : "border-danger"} icon={<span>💰</span>}/>
      </div>

      <AiInsights entrepreneurs={entrepreneurs} transactions={transactions} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Top 5 Entrepreneurs by Income</h2>
          {incomeByEntrepreneur.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incomeByEntrepreneur} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `GHS ${value.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="income" fill="#004AAD" name="Total Income" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500">No income data available.</p>}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Transaction Types</h2>
          {transactions.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={transactionTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {transactionTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value} transactions`}/>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          ) : <p className="text-gray-500">No transaction data available.</p>}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary" onClick={() => navigateTo(AppView.ADD_ENTREPRENEUR)}>Add New Entrepreneur</Button>
          <Button variant="success" onClick={() => navigateTo(AppView.TRANSACTIONS)}>Log New Transaction</Button>
          <Button variant="info" onClick={() => navigateTo(AppView.REPORTS)}>Generate Report</Button>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;