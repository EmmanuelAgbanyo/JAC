
import React, { useState, type ChangeEvent, type FormEvent } from 'react';
import type { Entrepreneur, Transaction } from '../types';
import { TransactionType, PaymentMethod, PaidStatus } from '../constants';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';

interface TransactionFormProps {
  onSubmit: (transaction: Transaction) => void;
  entrepreneurs: Entrepreneur[];
}

const TransactionForm = ({ onSubmit, entrepreneurs }: TransactionFormProps) => {
  const initialFormState = {
    entrepreneurId: '',
    type: TransactionType.INCOME,
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    paymentMethod: PaymentMethod.CASH,
    paidStatus: PaidStatus.FULL,
    customerName: '',
    productServiceCategory: '',
  };
  const [formData, setFormData] = useState(initialFormState);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.entrepreneurId || !formData.description || !formData.amount) {
        alert("Please select an entrepreneur, and fill in description and amount.");
        return;
    }
    const newTransaction: Transaction = {
      ...formData,
      id: crypto.randomUUID(),
      amount: parseFloat(formData.amount),
      paidStatus: formData.type === TransactionType.INCOME ? formData.paidStatus : undefined,
    };
    onSubmit(newTransaction);
    setFormData(initialFormState); // Reset form
  };

  const entrepreneurOptions = entrepreneurs.map(e => ({ value: e.id, label: `${e.name} (${e.businessName})` }));
  const transactionTypeOptions = Object.values(TransactionType).map(t => ({ value: t, label: t }));
  const paymentMethodOptions = Object.values(PaymentMethod).map(m => ({ value: m, label: m }));
  const paidStatusOptions = Object.values(PaidStatus).map(s => ({ value: s, label: s }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Add New Transaction</h2>
      <Select
        label="Entrepreneur"
        id="entrepreneurId"
        name="entrepreneurId"
        value={formData.entrepreneurId}
        onChange={handleChange}
        options={entrepreneurOptions}
        required
      />
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
        value={formData.date}
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
        value={formData.customerName}
        onChange={handleChange}
      />
      <Input
        label="Product/Service Category (Optional)"
        id="productServiceCategory"
        name="productServiceCategory"
        value={formData.productServiceCategory}
        onChange={handleChange}
      />
      <div className="flex justify-end pt-4">
        <Button type="submit" variant="primary">Add Transaction</Button>
      </div>
    </form>
  );
};

export default TransactionForm;