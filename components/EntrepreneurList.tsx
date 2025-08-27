
import React, { useState } from 'react';
import type { Entrepreneur } from '../types';
import Button from './ui/Button';
import Modal from './ui/Modal';

interface EntrepreneurListProps {
  entrepreneurs: Entrepreneur[];
  onEdit: (entrepreneur: Entrepreneur) => void;
  onDelete: (id: string) => void;
  onViewDashboard: (entrepreneur: Entrepreneur) => void;
}

const EntrepreneurList = ({ entrepreneurs, onEdit, onDelete, onViewDashboard }: EntrepreneurListProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEntrepreneurId, setSelectedEntrepreneurId] = useState<string | null>(null);

  const openDeleteModal = (id: string) => {
    setSelectedEntrepreneurId(id);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setSelectedEntrepreneurId(null);
    setShowDeleteModal(false);
  };

  const handleDeleteConfirm = () => {
    if (selectedEntrepreneurId) {
      onDelete(selectedEntrepreneurId);
    }
    closeDeleteModal();
  };
  
  if (entrepreneurs.length === 0) {
    return <p className="text-center text-gray-500 py-8">No entrepreneurs added yet. Start by adding one!</p>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Entrepreneur Profiles</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preferred Payment</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entrepreneurs.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{e.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{e.businessName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{e.contact}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(e.startDate).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{e.preferredPaymentType}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Button variant="primary" size="sm" onClick={() => onViewDashboard(e)}>Dashboard</Button>
                  <Button variant="info" size="sm" onClick={() => onEdit(e)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => openDeleteModal(e.id)}>Delete</Button>
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
        <p className="text-gray-700 mb-4">Are you sure you want to delete this entrepreneur? This action cannot be undone and will also remove all associated transactions.</p>
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
};

export default EntrepreneurList;