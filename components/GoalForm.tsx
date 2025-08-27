
import React, { useState, type FormEvent, type ChangeEvent } from 'react';
import type { Goal } from '../types';
import { GoalType } from '../types';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';

interface GoalFormProps {
    onSubmit: (goal: Goal) => void;
    onCancel: () => void;
    initialData?: Goal;
}

const GoalForm = ({ onSubmit, onCancel, initialData }: GoalFormProps) => {
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        type: initialData?.type || GoalType.REVENUE_TARGET,
        targetValue: initialData?.targetValue || 0,
        targetDate: initialData?.targetDate.split('T')[0] || new Date().toISOString().split('T')[0],
        description: initialData?.description || ''
    });
    
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'targetValue' ? parseFloat(value) : value }));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.targetDate) {
            alert("Please fill in at least the title and target date.");
            return;
        }

        const goal: Goal = {
            id: initialData?.id || crypto.randomUUID(),
            ...formData,
        };

        onSubmit(goal);
    };

    const goalTypeOptions = Object.values(GoalType).map(type => ({ value: type, label: type }));

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input
                label="Goal Title"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Increase Q3 Revenue"
                required
            />
            <Select
                label="Goal Type"
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                options={goalTypeOptions}
                required
            />
            {formData.type !== GoalType.CUSTOM && (
                 <Input
                    label="Target Value (GHS)"
                    id="targetValue"
                    name="targetValue"
                    type="number"
                    step="100"
                    value={String(formData.targetValue)}
                    onChange={handleChange}
                    required
                />
            )}
            <Input
                label="Target Date"
                id="targetDate"
                name="targetDate"
                type="date"
                value={formData.targetDate}
                onChange={handleChange}
                required
            />
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                    id="description"
                    name="description"
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-gray-900 placeholder:text-gray-500"
                    placeholder="Add more details about this goal."
                    value={formData.description}
                    onChange={handleChange}
                />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button type="submit" variant="primary">{initialData ? 'Save Changes' : 'Set Goal'}</Button>
            </div>
        </form>
    );
};

export default GoalForm;
