
import React from 'react';
import type { Transaction, Entrepreneur } from '../types';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';

interface TransactionManagerProps {
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  entrepreneurs: Entrepreneur[];
  onEditTransaction: (transaction: Transaction) => void;
}

const TransactionManager = ({ transactions, setTransactions, entrepreneurs, onEditTransaction }: TransactionManagerProps) => {
  const handleAddTransaction = (transaction: Transaction) => {
    setTransactions([...transactions, transaction]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Manage Transactions</h1>
      {entrepreneurs.length > 0 ? (
        <TransactionForm onSubmit={handleAddTransaction} entrepreneurs={entrepreneurs} />
      ) : (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md shadow" role="alert">
          <p className="font-bold">No Entrepreneurs Found</p>
          <p>Please add an entrepreneur first before logging transactions.</p>
        </div>
      )}
      <TransactionList 
        transactions={transactions} 
        entrepreneurs={entrepreneurs} 
        onDeleteTransaction={handleDeleteTransaction} 
        onEditTransaction={onEditTransaction}
      />
    </div>
  );
};

export default TransactionManager;
