import React, { useState } from 'react';
import type { Transaction, Entrepreneur } from '../types';
import { TransactionType } from '../constants';
import Button from './ui/Button';
import Modal from './ui/Modal';

interface TransactionListProps {
  transactions: Transaction[];
  entrepreneurs: Entrepreneur[];
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
}

const TransactionList = ({ transactions, entrepreneurs, onDeleteTransaction, onEditTransaction }: TransactionListProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  
  const getEntrepreneurName = (id: string) => {
    const entrepreneur = entrepreneurs.find(e => e.id === id);
    return entrepreneur ? entrepreneur.businessName : 'N/A';
  };

  const openDeleteModal = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setTransactionToDelete(null);
    setShowDeleteModal(false);
  };

  const handleDeleteConfirm = () => {
    if (!transactionToDelete) return;

    setDeletingId(transactionToDelete.id);
    closeDeleteModal();

    // Wait for animation to complete before removing from state
    setTimeout(() => {
      onDeleteTransaction(transactionToDelete.id);
      setDeletingId(null);
    }, 300); // Duration should match the transition duration
  };

  if (transactions.length === 0) {
    return <p className="text-center text-gray-500 dark:text-dark-textSecondary py-8">No transactions recorded yet.</p>;
  }

  // Sort transactions by date, most recent first
  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


  return (
    <div className="bg-white dark:bg-dark-secondary p-6 rounded-lg shadow-md mt-8">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-text mb-6">Recent Transactions</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
          <thead className="bg-gray-50 dark:bg-dark-primary">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Entrepreneur</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Description</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Amount (GHS)</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Payment Method</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-secondary divide-y divide-gray-200 dark:divide-dark-border animate-fadeIn">
            {sortedTransactions.map((t) => (
              <tr 
                key={t.id} 
                className={`transition-opacity duration-300 ${deletingId === t.id ? 'opacity-0' : 'hover:bg-gray-50 dark:hover:bg-dark-primary'} ${t.type === TransactionType.INCOME ? 'text-green-500' : 'text-red-500'}`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-dark-textSecondary">{new Date(t.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-text">{getEntrepreneurName(t.entrepreneurId)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{t.type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-text max-w-xs truncate" title={t.description}>{t.description}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold`}>{t.amount.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-textSecondary">{t.paymentMethod}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-textSecondary">{t.type === TransactionType.INCOME ? t.paidStatus : 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button variant="info" size="sm" onClick={() => onEditTransaction(t)} className="mr-2">Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => openDeleteModal(t)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        title="Confirm Deletion"
      >
        <p className="text-gray-700 dark:text-dark-textSecondary mb-4">Are you sure you want to delete this transaction? This action cannot be undone.</p>
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
};

export default TransactionList;