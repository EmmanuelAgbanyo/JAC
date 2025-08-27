
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
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  
  const getEntrepreneurName = (id: string) => {
    const entrepreneur = entrepreneurs.find(e => e.id === id);
    return entrepreneur ? entrepreneur.businessName : 'N/A';
  };

  const openDeleteModal = (id: string) => {
    setSelectedTransactionId(id);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setSelectedTransactionId(null);
    setShowDeleteModal(false);
  };

  const handleDeleteConfirm = () => {
    if (selectedTransactionId) {
      onDeleteTransaction(selectedTransactionId);
    }
    closeDeleteModal();
  };

  if (transactions.length === 0) {
    return <p className="text-center text-gray-500 py-8">No transactions recorded yet.</p>;
  }

  // Sort transactions by date, most recent first
  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Recent Transactions</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entrepreneur</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (GHS)</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTransactions.map((t) => (
              <tr key={t.id} className={`hover:bg-gray-50 transition-colors ${t.type === TransactionType.INCOME ? 'text-green-700' : 'text-red-700'}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(t.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{getEntrepreneurName(t.entrepreneurId)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{t.type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 max-w-xs truncate" title={t.description}>{t.description}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold`}>{t.amount.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{t.paymentMethod}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{t.type === TransactionType.INCOME ? t.paidStatus : 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button variant="info" size="sm" onClick={() => onEditTransaction(t)} className="mr-2">Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => openDeleteModal(t.id)}>Delete</Button>
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
        <p className="text-gray-700 mb-4">Are you sure you want to delete this transaction? This action cannot be undone.</p>
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
};

export default TransactionList;
