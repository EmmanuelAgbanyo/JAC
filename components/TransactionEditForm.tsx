
import React, { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import type { Transaction } from '../types';
import { TransactionType, PaymentMethod, PaidStatus } from '../constants';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';

interface TransactionEditFormProps {
  onSubmit: (transaction: Transaction) => void;
  onCancel: () => void;
  transaction: Transaction;
}

const TransactionEditForm = ({ onSubmit, onCancel, transaction }: TransactionEditFormProps) => {
  // Use a form state where amount is a string to match the input field
  const [formData, setFormData] = useState({
    ...transaction,
    amount: String(transaction.amount),
  });

  useEffect(() => {
    setFormData({
      ...transaction,
      amount: String(transaction.amount),
    });
  }, [transaction]);

  // A single, unified change handler for all form inputs
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formData.amount);
    if (!formData.description || formData.amount.trim() === '' || isNaN(parsedAmount)) {
      alert("Please fill in a description and a valid amount.");
      return;
    }
    onSubmit({
      ...formData,
      amount: parsedAmount,
    });
  };

  const transactionTypeOptions = Object.values(TransactionType).map(t => ({ value: t, label: t }));
  const paymentMethodOptions = Object.values(PaymentMethod).map(m => ({ value: m, label: m }));
  const paidStatusOptions = Object.values(PaidStatus).map(s => ({ value: s, label: s }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Transaction Type"
        id="type"
        name="type"
        value={formData.type}
        onChange={handleChange}
        options={transactionTypeOptions}
        required
      />
      <Input
        label="Date"
        id="date"
        name="date"
        type="date"
        value={formData.date.split('T')[0]} // Ensure date format is YYYY-MM-DD
        onChange={handleChange}
        required
      />
      <Input
        label="Description"
        id="description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        required
      />
      <Input
        label="Amount (GHS)"
        id="amount"
        name="amount"
        type="number"
        step="0.01"
        value={formData.amount}
        onChange={handleChange}
        required
      />
      <Select
        label="Payment Method"
        id="paymentMethod"
        name="paymentMethod"
        value={formData.paymentMethod}
        onChange={handleChange}
        options={paymentMethodOptions}
        required
      />
      {formData.type === TransactionType.INCOME && (
        <Select
          label="Paid Status"
          id="paidStatus"
          name="paidStatus"
          value={formData.paidStatus}
          onChange={handleChange}
          options={paidStatusOptions}
          required
        />
      )}
      <Input
        label="Customer Name (Optional)"
        id="customerName"
        name="customerName"
        value={formData.customerName || ''}
        onChange={handleChange}
      />
      <Input
        label="Product/Service Category (Optional)"
        id="productServiceCategory"
        name="productServiceCategory"
        value={formData.productServiceCategory || ''}
        onChange={handleChange}
      />
      <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">Save Changes</Button>
      </div>
    </form>
  );
};

export default TransactionEditForm;
