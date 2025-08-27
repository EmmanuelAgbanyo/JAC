
import React from 'react';
import type { Entrepreneur } from '../types';
import { AppView } from '../constants';
import EntrepreneurForm from './EntrepreneurForm';
import EntrepreneurList from './EntrepreneurList';
import Button from './ui/Button';

interface EntrepreneurManagerProps {
  entrepreneurs: Entrepreneur[];
  setEntrepreneurs: (entrepreneurs: Entrepreneur[]) => void;
  editingEntrepreneur: Entrepreneur | null;
  setEditingEntrepreneur: (entrepreneur: Entrepreneur | null) => void;
  currentView: AppView;
  navigateTo: (view: AppView) => void;
  onEdit: (entrepreneur: Entrepreneur) => void;
  onViewDashboard: (entrepreneur: Entrepreneur) => void;
  onDeleteEntrepreneur: (id: string) => void;
}

const EntrepreneurManager = ({
  entrepreneurs,
  setEntrepreneurs,
  editingEntrepreneur,
  setEditingEntrepreneur,
  currentView,
  navigateTo,
  onEdit,
  onViewDashboard,
  onDeleteEntrepreneur
}: EntrepreneurManagerProps) => {
  const handleAddOrUpdateEntrepreneur = (entrepreneur: Entrepreneur) => {
    const isEditing = entrepreneurs.some(e => e.id === entrepreneur.id);
    const updatedEntrepreneurs = isEditing
      ? entrepreneurs.map(e => e.id === entrepreneur.id ? entrepreneur : e)
      : [...entrepreneurs, entrepreneur];
    setEntrepreneurs(updatedEntrepreneurs);
    setEditingEntrepreneur(null);
    navigateTo(AppView.ENTREPRENEURS); // Navigate to list view after save
  };

  const handleCancelEdit = () => {
    setEditingEntrepreneur(null);
    navigateTo(AppView.ENTREPRENEURS);
  };

  return (
    <div className="space-y-8">
      {currentView === AppView.ADD_ENTREPRENEUR && (
        <EntrepreneurForm onSubmit={handleAddOrUpdateEntrepreneur} onCancel={() => navigateTo(AppView.ENTREPRENEURS)} />
      )}
      {currentView === AppView.EDIT_ENTREPRENEUR && editingEntrepreneur && (
        <EntrepreneurForm 
          onSubmit={handleAddOrUpdateEntrepreneur} 
          initialData={editingEntrepreneur}
          onCancel={handleCancelEdit} 
        />
      )}
      {currentView === AppView.ENTREPRENEURS && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Manage Entrepreneurs</h1>
            <Button variant="primary" onClick={() => navigateTo(AppView.ADD_ENTREPRENEUR)}>
              Add New Entrepreneur
            </Button>
          </div>
          <EntrepreneurList
            entrepreneurs={entrepreneurs}
            onEdit={onEdit}
            onDelete={onDeleteEntrepreneur}
            onViewDashboard={onViewDashboard}
          />
        </>
      )}
    </div>
  );
};

export default EntrepreneurManager;