
import React, { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import type { Entrepreneur } from '../types';
import { PaymentMethod } from '../constants';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';

interface EntrepreneurFormProps {
  onSubmit: (entrepreneur: Entrepreneur) => void;
  initialData?: Entrepreneur | null;
  onCancel?: () => void;
}

const EntrepreneurForm = ({ onSubmit, initialData, onCancel }: EntrepreneurFormProps) => {
  const [formData, setFormData] = useState<Omit<Entrepreneur, 'id'>>({
    name: '',
    contact: '',
    businessName: '',
    startDate: new Date().toISOString().split('T')[0], // Default to today
    preferredPaymentType: PaymentMethod.CASH,
    bio: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        contact: initialData.contact,
        businessName: initialData.businessName,
        startDate: initialData.startDate.split('T')[0], // Format for date input
        preferredPaymentType: initialData.preferredPaymentType,
        bio: initialData.bio || '',
      });
    }
  }, [initialData]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.businessName || !formData.contact) {
        alert("Please fill in Name, Business Name, and Contact.");
        return;
    }
    onSubmit({ ...formData, id: initialData?.id || crypto.randomUUID() });
    // Reset form if not editing
    if (!initialData) {
        setFormData({
            name: '',
            contact: '',
            businessName: '',
            startDate: new Date().toISOString().split('T')[0],
            preferredPaymentType: PaymentMethod.CASH,
            bio: '',
        });
    }
  };

  const paymentMethodOptions = Object.values(PaymentMethod).map(method => ({ value: method, label: method }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">{initialData ? 'Edit Entrepreneur' : 'Add New Entrepreneur'}</h2>
      <Input
        label="Full Name"
        id="name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        required
      />
      <Input
        label="Contact (Phone/Email)"
        id="contact"
        name="contact"
        value={formData.contact}
        onChange={handleChange}
        required
      />
      <Input
        label="Business Name"
        id="businessName"
        name="businessName"
        value={formData.businessName}
        onChange={handleChange}
        required
      />
       <div className="mb-4">
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio / Profile Description (Optional)</label>
        <textarea
            id="bio"
            name="bio"
            rows={3}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-gray-900 placeholder:text-gray-500"
            placeholder="A short description of the entrepreneur or their business."
            value={formData.bio}
            onChange={handleChange}
        />
    </div>
      <Input
        label="Start Date"
        id="startDate"
        name="startDate"
        type="date"
        value={formData.startDate}
        onChange={handleChange}
        required
      />
      <Select
        label="Preferred Payment Method"
        id="preferredPaymentType"
        name="preferredPaymentType"
        value={formData.preferredPaymentType}
        onChange={handleChange}
        options={paymentMethodOptions}
        required
      />
      <div className="flex justify-end space-x-3 pt-4">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" variant="primary">{initialData ? 'Save Changes' : 'Add Entrepreneur'}</Button>
      </div>
    </form>
  );
};

export default EntrepreneurForm;