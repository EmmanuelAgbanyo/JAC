import React from 'react';

interface StatCardProps {
    title: string;
    value: number;
    previousValue: number;
    formatAs?: 'currency' | 'number';
    isExpense?: boolean;
}

const StatCard = ({ title, value, previousValue, formatAs = 'number', isExpense = false }: StatCardProps) => {
    
    const formatValue = (num: number) => {
        if (formatAs === 'currency') {
            return `GHS ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return num.toLocaleString();
    };

    let percentageChange = 0;
    if (previousValue !== 0) {
        percentageChange = ((value - previousValue) / Math.abs(previousValue)) * 100;
    } else if (value > 0) {
        percentageChange = 100; // Represents infinite growth from zero
    }
    
    const isPositive = percentageChange > 0;
    const isNegative = percentageChange < 0;
    let trendColor = 'text-gray-500';

    if (isExpense) { // For expenses, a decrease is good (green)
        if (isNegative) trendColor = 'text-green-600';
        if (isPositive) trendColor = 'text-red-600';
    } else { // For income/net, an increase is good (green)
        if (isPositive) trendColor = 'text-green-600';
        if (isNegative) trendColor = 'text-red-600';
    }
    
    const TrendArrow = () => {
        if (percentageChange === 0 || isNaN(percentageChange)) return null;
        return isPositive ? <span>▲</span> : <span>▼</span>;
    };
    
    return (
        <div className="bg-white dark:bg-dark-secondary p-5 rounded-lg shadow-md border border-gray-200 dark:border-dark-border">
            <p className="text-sm font-medium text-gray-500 dark:text-dark-textSecondary">{title}</p>
            <div className="mt-2 flex items-baseline space-x-2">
                <p className="text-3xl font-bold text-gray-900 dark:text-dark-text">{formatValue(value)}</p>
                { !isNaN(percentageChange) && Math.abs(percentageChange) > 0 && Math.abs(percentageChange) !== Infinity && (
                    <div className={`flex items-center text-sm font-semibold ${trendColor}`}>
                        <TrendArrow />
                        <span>{Math.abs(percentageChange).toFixed(1)}%</span>
                    </div>
                )}
            </div>
            <p className="text-xs text-gray-400 dark:text-dark-textSecondary mt-1">vs. {formatValue(previousValue)} previous period</p>
        </div>
    );
};

export default React.memo(StatCard);
