import React from 'react';
import { BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';

interface ChartData {
    name: string;
    Income: number;
    Expenses: number;
    'Net Income': number;
}

interface PerformanceChartProps {
    data: ChartData[];
}

const PerformanceChart = ({ data }: PerformanceChartProps) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <p>No data available for the selected period.</p>
            </div>
        );
    }
    
    const formatCurrency = (value: number) => `GHS ${value.toLocaleString()}`;

    return (
        <ResponsiveContainer width="100%" height={350}>
            <ComposedChart
                data={data}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{fontSize: "14px"}} />
                <Bar dataKey="Income" fill="#28a745" />
                <Bar dataKey="Expenses" fill="#dc3545" />
                <Line type="monotone" dataKey="Net Income" stroke="#0A369D" strokeWidth={2} />
            </ComposedChart>
        </ResponsiveContainer>
    );
};

export default PerformanceChart;