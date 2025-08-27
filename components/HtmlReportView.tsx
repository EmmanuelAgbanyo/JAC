

import React, { useRef, useState, useCallback, type ReactNode, useEffect } from 'react';
import type { AiReport, AiReportMetric, AiReportActionItem, ChartSuggestion, ChartDataItem, SalesInsightItem, Entrepreneur, Transaction } from '../types';
import Button from './ui/Button';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { exportToDocx, exportToXlsx, exportToCsv } from '../services/exportService';

interface HtmlReportViewProps {
  aiReport: AiReport;
  entrepreneur: Entrepreneur;
  transactionsForPeriod: Transaction[];
  period: string;
  onClose: () => void;
  autoExportAs?: 'pdf' | null;
}

// Extend the global Window interface for the html2pdf library
declare global {
  interface Window {
    html2pdf: any;
  }
}

// Helper to dynamically load the html2pdf script
const loadHtml2PdfScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded and available
    if (window.html2pdf) {
      return resolve();
    }
    
    const script = document.createElement('script');
    // Use a reliable CDN for the library
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PDF generation library.'));
    document.head.appendChild(script);
  });
};

const CHART_COLORS = ['#004AAD', '#28a745', '#D4A017', '#00B8D9', '#dc3545'];

const ReportChart = ({ chart }: { chart: ChartSuggestion }) => {
    const renderChart = () => {
        switch (chart.chart_type) {
            case 'bar':
                return (
                    <BarChart data={chart.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => `GHS ${value.toFixed(2)}`} />
                        <Bar dataKey="value" fill="#004AAD" name="Amount" />
                    </BarChart>
                );
            case 'pie':
                return (
                    <PieChart>
                        <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                            {chart.data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `GHS ${value.toFixed(2)}`} />
                        <Legend />
                    </PieChart>
                );
            case 'line':
                 return (
                    <LineChart data={chart.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => `GHS ${value.toFixed(2)}`} />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#28a745" strokeWidth={2} name="Trend"/>
                    </LineChart>
                );
            default:
                return <p>Unsupported chart type</p>;
        }
    };

    return (
        <div className="bg-gray-50 p-4 rounded-md print-bg-white">
            <h4 className="font-semibold text-gray-800 text-lg mb-2 text-center">{chart.title}</h4>
            <ResponsiveContainer width="100%" height={300}>
                {renderChart()}
            </ResponsiveContainer>
        </div>
    )
}

const sentimentColor = (sentiment: AiReportMetric['sentiment']) => {
    switch(sentiment) {
        case 'positive': return 'border-green-500 bg-green-50';
        case 'negative': return 'border-red-500 bg-red-50';
        case 'neutral': return 'border-gray-400 bg-gray-50';
        default: return 'border-gray-400 bg-gray-50';
    }
};

const priorityColor = (priority: AiReportActionItem['priority']) => {
    switch(priority) {
        case 'high': return 'bg-red-100 text-red-800';
        case 'medium': return 'bg-yellow-100 text-yellow-800';
        case 'low': return 'bg-blue-100 text-blue-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

const Section = ({ title, children, className }: { title: string, children: ReactNode, className?: string}) => (
    <section className={`mb-8 print-page-break ${className || ''}`}>
        <h3 className="text-xl font-semibold text-aesBlue mb-4 border-b-2 border-aesYellow pb-2">{title}</h3>
        {children}
    </section>
);

const SwotCard = ({ title, items, color }: { title: string, items: string[], color: string }) => (
    <div className={`rounded-lg p-4 bg-gray-50 border-t-4 ${color}`}>
        <h4 className={`font-bold text-lg mb-2 text-gray-800 print-text-black`}>{title}</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
    </div>
);

const DataTable = ({ title, data, valueLabel = 'Total Revenue', countLabel = 'Transactions' }: { title: string, data: SalesInsightItem[], valueLabel?: string, countLabel?: string }) => (
    <div className="bg-gray-50 p-4 rounded-md">
      <h4 className="font-semibold text-gray-800 text-lg mb-2">{title}</h4>
      {data && data.length > 0 ? (
         <div className="overflow-x-auto">
            <table className="min-w-full">
                <thead className="bg-gray-200">
                <tr>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-600 uppercase">Name/Category</th>
                    <th className="py-2 px-4 text-right text-xs font-medium text-gray-600 uppercase">{valueLabel}</th>
                    <th className="py-2 px-4 text-right text-xs font-medium text-gray-600 uppercase">{countLabel}</th>
                </tr>
                </thead>
                <tbody>
                {data.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200">
                    <td className="py-2 px-4 text-gray-700">{item.name}</td>
                    <td className="py-2 px-4 text-right text-gray-900 font-mono">{item.value}</td>
                    <td className="py-2 px-4 text-right text-gray-900 font-mono">{item.count ?? 'N/A'}</td>
                    </tr>
                ))}
                </tbody>
            </table>
         </div>
      ) : (
        <p className="text-sm text-gray-500 italic">No data available for this section.</p>
      )}
    </div>
  );


const HtmlReportView = ({ aiReport, entrepreneur, transactionsForPeriod, period, onClose, autoExportAs }: HtmlReportViewProps) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(''); // 'pdf', 'docx', etc.
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [hasAutoExported, setHasAutoExported] = useState(false);

  const handleExport = useCallback(async (format: 'pdf' | 'docx' | 'xlsx' | 'csv', isAutoExport = false) => {
    if (!isAutoExport) {
        setIsExporting(format);
        setIsExportMenuOpen(false); // Close menu on selection
    }
    
    try {
        switch(format) {
            case 'pdf': {
                const element = reportRef.current;
                if (!element) return;
                
                await loadHtml2PdfScript();
                
                if (typeof window.html2pdf !== 'function') {
                    alert("PDF export library could not be loaded. Please check your connection and try again.");
                    console.error("html2pdf.js did not load correctly.");
                    return;
                }
            
                const opt = {
                    margin:       0.2,
                    filename:     `Report_${entrepreneur.businessName.replace(/\s/g, '_')}_${period}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true, logging: false },
                    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
                };
                
                await window.html2pdf().from(element).set(opt).save();
                break;
            }
            case 'docx':
                await exportToDocx(aiReport, entrepreneur, period);
                break;
            case 'xlsx':
                await exportToXlsx(aiReport, transactionsForPeriod, entrepreneur, period);
                break;
            case 'csv':
                await exportToCsv(transactionsForPeriod, entrepreneur, period);
                break;
        }
    } catch (err) {
        console.error(`Export to ${format} failed:`, err);
        alert(`Sorry, there was an error creating the ${format.toUpperCase()} file. Please try again.`);
    } finally {
        if (!isAutoExport) {
            setIsExporting('');
        }
    }
  }, [aiReport, entrepreneur, transactionsForPeriod, period]);
  
  useEffect(() => {
    if (autoExportAs === 'pdf' && !hasAutoExported && reportRef.current) {
        setHasAutoExported(true);
        // Add a small delay to allow charts and other async elements to render completely.
        const timer = setTimeout(() => {
            handleExport('pdf', true);
        }, 1000); // 1-second delay for rendering safety.

        return () => clearTimeout(timer);
    }
  }, [autoExportAs, hasAutoExported, handleExport]);

  const impactColor = (impact: 'High' | 'Medium' | 'Low') => {
      switch (impact) {
          case 'High': return 'bg-red-500 text-white';
          case 'Medium': return 'bg-yellow-500 text-white';
          case 'Low': return 'bg-green-500 text-white';
          default: return 'bg-gray-400 text-white';
      }
  };

  return (
    <div className="bg-gray-100 p-2 md:p-8 print-bg-white">
       <div className="max-w-4xl mx-auto mb-4 flex justify-end items-center gap-2 no-print">
         <Button onClick={onClose} variant="secondary" size="sm">← Back</Button>
         <div className="relative">
            <Button 
                onClick={() => setIsExportMenuOpen(prev => !prev)} 
                variant="primary" 
                size="sm"
                disabled={!!isExporting}
                isLoading={!!isExporting}
            >
             {isExporting ? `Exporting ${isExporting.toUpperCase()}...` : 'Export Report'}
            </Button>
            {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                    <button onClick={() => handleExport('pdf')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">as PDF</button>
                    <button onClick={() => handleExport('docx')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">as Word (.docx)</button>
                    <button onClick={() => handleExport('xlsx')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">as Excel (.xlsx)</button>
                    <button onClick={() => handleExport('csv')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">as CSV</button>
                </div>
            )}
         </div>
      </div>

      <div ref={reportRef} className="bg-white shadow-2xl rounded-lg max-w-4xl mx-auto font-sans">
        <header className="bg-aesBlue text-white p-8 rounded-t-lg">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Financial Performance Report</h1>
                <div className="text-right">
                    <p className="text-aesYellow font-semibold">AES Just A Call (JAC)</p>
                    <p className="text-sm opacity-80">Empowering Entrepreneurs</p>
                </div>
            </div>
        </header>

        <main className="p-8">
            <h2 className="text-2xl font-semibold text-gray-800 text-center mb-2">{aiReport.reportTitle}</h2>
            <p className="text-center text-gray-500 text-sm mb-8">Report Generated: {new Date().toLocaleDateString()}</p>
            
            <Section title="Executive Summary">
                <p className="text-gray-700 leading-relaxed bg-blue-50 p-4 rounded-md border border-blue-200">
                    {aiReport.executiveSummary}
                </p>
            </Section>

            <Section title="Key Metrics">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiReport.keyMetrics.map((metric, index) => (
                        <div key={index} className={`p-4 rounded-lg border-l-4 ${sentimentColor(metric.sentiment)}`}>
                            <p className="text-sm font-medium text-gray-600">{metric.metric}</p>
                            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                            <p className="text-xs text-gray-700 mt-1 italic">"{metric.insight}"</p>
                        </div>
                    ))}
                </div>
            </Section>

            {aiReport.incomeStatement && (
                 <Section title={aiReport.incomeStatement.title}>
                    <div className="overflow-x-auto bg-gray-50 p-4 rounded-md">
                        <table className="min-w-full">
                            <tbody>
                                {aiReport.incomeStatement.lines.map((line, index) => (
                                    <tr key={index} className="border-b border-gray-200">
                                        <td className="py-2 px-4 text-gray-700">{line.item}</td>
                                        <td className="py-2 px-4 text-right text-gray-900 font-mono">{line.amount}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-gray-400">
                                    <td className="py-3 px-4 font-bold text-gray-800 text-lg">{aiReport.incomeStatement.final_net_income.label}</td>
                                    <td className={`py-3 px-4 text-right font-bold text-lg font-mono ${aiReport.incomeStatement.final_net_income.sentiment === 'positive' ? 'text-green-600' : 'text-red-600'}`}>{aiReport.incomeStatement.final_net_income.value}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Section>
            )}
            
            {aiReport.cashFlowAnalysis && (
                 <Section title={aiReport.cashFlowAnalysis.title}>
                    <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-md border border-gray-200 text-sm">
                        {aiReport.cashFlowAnalysis.analysis}
                    </p>
                </Section>
            )}

            {aiReport.charts && aiReport.charts.length > 0 && (
                 <Section title="Data Visualizations">
                    <div className="space-y-8">
                        {aiReport.charts.map((chart, index) => <ReportChart key={index} chart={chart} />)}
                    </div>
                </Section>
            )}
            
            {aiReport.salesInsights && (
                <Section title={aiReport.salesInsights.title}>
                    <div className="space-y-6">
                        <DataTable title="Top Customers by Revenue" data={aiReport.salesInsights.top_customers} />
                        <DataTable title="Top Products/Services by Revenue" data={aiReport.salesInsights.top_products} />
                    </div>
                </Section>
            )}
            
            {aiReport.riskAnalysis && (
                <Section title={aiReport.riskAnalysis.title}>
                    <div className="overflow-x-auto bg-gray-50 p-4 rounded-md">
                        <table className="min-w-full">
                            <thead className="bg-gray-200">
                                <tr>
                                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-600 uppercase">Identified Risk</th>
                                    <th className="py-2 px-4 text-center text-xs font-medium text-gray-600 uppercase">Impact</th>
                                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-600 uppercase">Mitigation Strategy</th>
                                </tr>
                            </thead>
                            <tbody>
                                {aiReport.riskAnalysis.risks.map((riskItem, index) => (
                                    <tr key={index} className="border-b border-gray-200">
                                        <td className="py-3 px-4 text-gray-800 font-medium">{riskItem.risk}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${impactColor(riskItem.impact)}`}>
                                                {riskItem.impact}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 text-sm">{riskItem.mitigation}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {aiReport.financialRatios && (
                 <Section title="Key Financial Ratios">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {aiReport.financialRatios.map((ratio, index) => (
                             <div key={index} className="bg-gray-50 p-4 rounded-md border-l-4 border-aesYellow">
                                <h4 className="font-semibold text-gray-800 text-lg">{ratio.ratio_name}</h4>
                                <p className="text-3xl font-bold text-aesBlue my-2">{ratio.value}</p>
                                <p className="text-xs text-gray-500 font-mono mb-2">Formula: {ratio.formula}</p>
                                <p className="text-sm text-gray-700">{ratio.interpretation}</p>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

             {aiReport.swotAnalysis && (
                <Section title="Strategic SWOT Analysis">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SwotCard title="Strengths" items={aiReport.swotAnalysis.strengths} color="border-green-500" />
                        <SwotCard title="Weaknesses" items={aiReport.swotAnalysis.weaknesses} color="border-red-500" />
                        <SwotCard title="Opportunities" items={aiReport.swotAnalysis.opportunities} color="border-blue-500" />
                        <SwotCard title="Threats" items={aiReport.swotAnalysis.threats} color="border-warning" />
                    </div>
                </Section>
             )}

             {aiReport.futureOutlook && (
                <Section title={aiReport.futureOutlook.title}>
                    <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="font-semibold text-gray-800 text-lg mb-1">Forecast</h4>
                        <p className="text-gray-600 text-sm leading-relaxed mb-4">{aiReport.futureOutlook.forecast}</p>
                        <h4 className="font-semibold text-gray-800 text-lg mb-2">Trends to Watch</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            {aiReport.futureOutlook.trends_to_watch.map((trend, i) => <li key={i}>{trend}</li>)}
                        </ul>
                    </div>
                </Section>
            )}

            <Section title="Detailed Analysis">
                <div className="space-y-6">
                    {aiReport.detailedAnalysis.map((section, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-md">
                            <h4 className="font-semibold text-gray-800 text-lg mb-1">{section.title}</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">{section.analysis}</p>
                        </div>
                    ))}
                </div>
            </Section>
            
            <Section title="Action Plan">
                <ul className="space-y-3">
                    {aiReport.actionableRecommendations.map((rec, index) => (
                        <li key={index} className="flex items-start p-3 bg-gray-50 rounded-md">
                           <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full mr-4 mt-1 ${priorityColor(rec.priority)}`}>{rec.priority}</span>
                           <span className="text-gray-700">{rec.item}</span>
                        </li>
                    ))}
                </ul>
            </Section>

        </main>
        
        <footer className="bg-gray-800 text-white text-xs text-center p-4 rounded-b-lg mt-8">
            <p>© {new Date().getFullYear()} Africa Entrepreneurship School. | AES Just A Call (JAC) Initiative - Empowering Entrepreneurs.</p>
        </footer>
      </div>
    </div>
  );
};

export default HtmlReportView;