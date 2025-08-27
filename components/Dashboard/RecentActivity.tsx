import React from 'react';
import type { Entrepreneur, Transaction } from '../../types';
import { TransactionType } from '../../constants';

type Activity = 
    | { date: string; type: 'transaction', data: Transaction }
    | { date: string; type: 'entrepreneur', data: Entrepreneur };

interface RecentActivityProps {
    activities: Activity[];
    entrepreneurs: Entrepreneur[];
}

const ActivityIcon = ({ type }: { type: Activity['type'] }) => {
    const iconMap = {
        transaction: '🔄',
        entrepreneur: '✨',
    };
    return <span className="text-lg mr-3">{iconMap[type]}</span>;
};


const RecentActivity = ({ activities, entrepreneurs }: RecentActivityProps) => {
    const getEntrepreneurName = (id: string) => entrepreneurs.find(e => e.id === id)?.businessName || 'N/A';
    
    const renderActivityContent = (activity: Activity) => {
        if (activity.type === 'transaction') {
            const t = activity.data;
            const isIncome = t.type === TransactionType.INCOME;
            return (
                <div className="flex justify-between items-center w-full">
                    <div>
                        <p className="font-medium text-gray-800">
                           {isIncome ? 'Income' : 'Expense'} from {getEntrepreneurName(t.entrepreneurId)}
                        </p>
                        <p className="text-xs text-gray-500">{t.description}</p>
                    </div>
                    <p className={`font-semibold text-sm ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                        {isIncome ? '+' : '-'}GHS {t.amount.toFixed(2)}
                    </p>
                </div>
            );
        }
        if (activity.type === 'entrepreneur') {
            const e = activity.data;
            return (
                <div>
                     <p className="font-medium text-gray-800">New Entrepreneur Joined</p>
                     <p className="text-xs text-gray-500">{e.name} ({e.businessName})</p>
                </div>
            );
        }
        return null;
    }
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Activity</h3>
            {activities.length > 0 ? (
                <ul className="space-y-4">
                    {activities.map((activity, index) => (
                        <li key={index} className="flex items-start text-sm">
                            <ActivityIcon type={activity.type} />
                            {renderActivityContent(activity)}
                        </li>
                    ))}
                </ul>
            ) : <p className="text-center text-gray-500 py-4">No recent activity in this period.</p>}
        </div>
    );
};

export default RecentActivity;
