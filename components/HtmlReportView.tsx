import React, { useRef, useState, useCallback, type ReactNode, useEffect } from 'react';
import type { AiReport, AiReportMetric, AiReportActionItem, ChartSuggestion, Entrepreneur, Transaction } from '../types';
import Button from './ui/Button';
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { exportToDocx, exportToXlsx, exportToCsv } from '../services/exportService';
import LoadingSpinner from './LoadingSpinner';

interface HtmlReportViewProps {
  aiReport: AiReport;
  entrepreneur: Entrepreneur;
  transactionsForPeriod: Transaction[];
  period: string;
  onClose: () => void;
  autoExportAs?: 'pdf' | null;
}

declare global {
  interface Window {
    html2pdf: any;
  }
}

const loadHtml2PdfScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.html2pdf) {
      return resolve();
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PDF generation library.'));
    document.head.appendChild(script);
  });
};

const CHART_COLORS = ['#0A369D', '#004D40', '#E1A11A', '#00B8D9', '#dc3545'];

const ReportChart = ({ chart }: { chart: ChartSuggestion }) => {
    const renderChart = () => {
        switch (chart.chart_type) {
            case 'bar':
                return (
                    <BarChart data={chart.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value: number) => `GHS ${value.toFixed(2)}`} />
                        <Bar dataKey="value" fill="#0A369D" name="Amount" />
                    </BarChart>
                );
            case 'pie':
                return (
                    <PieChart>
                        <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                            {chart.data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `GHS ${value.toFixed(2)}`} />
                        <Legend wrapperStyle={{ fontSize: "10px" }}/>
                    </PieChart>
                );
            default:
                return <p>Unsupported chart type</p>;
        }
    };

    return (
        <div className="bg-slate-50 p-4 rounded-md print-bg-white no-break-inside">
            <h4 className="font-semibold text-gray-800 text-base mb-2 text-center">{chart.title}</h4>
            <ResponsiveContainer width="100%" height={250}>
                {renderChart()}
            </ResponsiveContainer>
        </div>
    )
}

const sentimentColor = (sentiment: AiReportMetric['sentiment']) => {
    switch(sentiment) {
        case 'positive': return 'border-green-600';
        case 'negative': return 'border-red-600';
        case 'neutral': return 'border-gray-500';
        default: return 'border-gray-500';
    }
};

const priorityColor = (priority: AiReportActionItem['priority']) => {
    switch(priority) {
        case 'high': return 'bg-red-500';
        case 'medium': return 'bg-yellow-500';
        case 'low': return 'bg-blue-500';
        default: return 'bg-gray-500';
    }
}

const Section = ({ title, children, className }: { title: string, children: ReactNode, className?: string}) => (
    <section className={`mb-6 print-page-break ${className || ''}`}>
        <h3 className="report-h3">{title}</h3>
        {children}
    </section>
);

const SwotCard = ({ title, items, color }: { title: string, items: string[], color: string }) => (
    <div className={`rounded-lg p-4 bg-slate-50 border-t-4 ${color}`}>
        <h4 className={`font-bold text-lg mb-2 text-gray-800 print-text-black`}>{title}</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
    </div>
);


const HtmlReportView = ({ aiReport, entrepreneur, transactionsForPeriod, period, onClose, autoExportAs }: HtmlReportViewProps) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [hasAutoExported, setHasAutoExported] = useState(false);

  const handleExport = useCallback(async (format: 'pdf' | 'docx' | 'xlsx' | 'csv', isAutoExport = false) => {
    setIsExporting(format);
    if (!isAutoExport) setIsExportMenuOpen(false);
    
    try {
        if(format === 'pdf') {
            const element = reportRef.current;
            if (!element) throw new Error("Report element not found.");
            
            await loadHtml2PdfScript();
            
            if (typeof window.html2pdf !== 'function') throw new Error("PDF export library could not be loaded.");
        
            const opt = {
                margin:       [0.5, 0.2, 0.5, 0.2], // [top, left, bottom, right]
                filename:     `Report_${entrepreneur.businessName.replace(/\s/g, '_')}_${period}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, logging: false, letterRendering: true },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
                pagebreak:    { mode: ['css', 'legacy'] }
            };
            
            await window.html2pdf().from(element).set(opt).save();
        } else if (format === 'docx') {
            await exportToDocx(aiReport, entrepreneur, period);
        } else if (format === 'xlsx') {
            await exportToXlsx(aiReport, transactionsForPeriod, entrepreneur, period);
        } else if (format === 'csv') {
            await exportToCsv(transactionsForPeriod, entrepreneur, period);
        }
    } catch (err) {
        console.error(`Export to ${format} failed:`, err);
        alert(`Sorry, there was an error creating the ${format.toUpperCase()} file. Error: ${(err as Error).message}`);
    } finally {
        setIsExporting('');
    }
  }, [aiReport, entrepreneur, transactionsForPeriod, period]);
  
  useEffect(() => {
    if (autoExportAs === 'pdf' && !hasAutoExported && reportRef.current) {
        setHasAutoExported(true);
        const timer = setTimeout(() => handleExport('pdf', true), 1000);
        return () => clearTimeout(timer);
    }
  }, [autoExportAs, hasAutoExported, handleExport]);
  
  const impactColor = (impact: 'High' | 'Medium' | 'Low') => {
      switch (impact) {
          case 'High': return 'bg-red-100 text-red-800';
          case 'Medium': return 'bg-yellow-100 text-yellow-800';
          case 'Low': return 'bg-green-100 text-green-800';
          default: return 'bg-gray-100 text-gray-800';
      }
  };

  return (
    <div className="bg-gray-200 dark:bg-dark-primary p-2 md:p-8 print-bg-white font-lato">
       {isExporting === 'pdf' && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center no-print">
            <LoadingSpinner message="Generating your PDF report, this may take a moment..." />
        </div>
      )}
       <div className="max-w-4xl mx-auto mb-4 flex justify-end items-center gap-2 no-print">
         <Button onClick={onClose} variant="secondary" size="sm">← Back</Button>
         <div className="relative">
            <Button onClick={() => setIsExportMenuOpen(prev => !prev)} variant="primary" size="sm" disabled={!!isExporting} isLoading={!!isExporting}>
             {isExporting ? `Exporting ${isExporting.toUpperCase()}...` : 'Export Report'}
            </Button>
            {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-secondary rounded-md shadow-lg z-10 border border-gray-200 dark:border-dark-border">
                    <button onClick={() => handleExport('pdf')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-primary">as PDF</button>
                    <button onClick={() => handleExport('docx')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-primary">as Word (.docx)</button>
                    <button onClick={() => handleExport('xlsx')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-primary">as Excel (.xlsx)</button>
                    <button onClick={() => handleExport('csv')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-primary">as CSV</button>
                </div>
            )}
         </div>
      </div>

      <div ref={reportRef} className="report-body">
        {/* --- Cover Page --- */}
        <div className="report-page report-cover">
            <div className="aes-logo-text">AES Just A Call (JAC)</div>
            <div className="flex-grow flex flex-col justify-center items-center text-center">
                <h1 className="report-main-title">{aiReport.reportTitle}</h1>
                <p className="report-subtitle">Prepared for</p>
                <p className="report-client-name">{entrepreneur.businessName}</p>
                <p className="report-client-owner">({entrepreneur.name})</p>
            </div>
            <div className="report-date-footer">
                <p><strong>Period Covered:</strong> {period}</p>
                <p><strong>Date of Issue:</strong> {new Date().toLocaleDateString()}</p>
            </div>
        </div>

        {/* --- Report Content Pages --- */}
        <div className="report-page">
            <div className="report-header">
                <span>{aiReport.reportTitle}</span>
                <span>{entrepreneur.businessName}</span>
            </div>
            
            <div className="report-content">
                <Section title="Executive Summary">
                    <p className="report-p bg-slate-50 p-4 rounded-md border-l-4 border-aesBlue">
                        {aiReport.executiveSummary}
                    </p>
                </Section>

                <Section title="Key Performance Indicators">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-break-inside">
                        {aiReport.keyMetrics.map((metric, index) => (
                            <div key={index} className={`p-4 rounded-md bg-slate-50 border-l-4 ${sentimentColor(metric.sentiment)}`}>
                                <p className="font-bold text-gray-600 uppercase text-xs">{metric.metric}</p>
                                <p className="text-2xl font-bold text-gray-900 font-lorin">{metric.value}</p>
                                <p className="text-xs text-gray-700 mt-1 italic">"{metric.insight}"</p>
                            </div>
                        ))}
                    </div>
                </Section>

                {aiReport.incomeStatement && (
                     <Section title={aiReport.incomeStatement.title}>
                        <div className="overflow-x-auto bg-slate-50 p-4 rounded-md no-break-inside professional-table">
                            <table>
                                <tbody>
                                    {aiReport.incomeStatement.lines.map((line, index) => (
                                        <tr key={index}><td>{line.item}</td><td>{line.amount}</td></tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td>{aiReport.incomeStatement.final_net_income.label}</td>
                                        <td className={`${aiReport.incomeStatement.final_net_income.sentiment === 'positive' ? 'text-green-600' : 'text-red-600'}`}>{aiReport.incomeStatement.final_net_income.value}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </Section>
                )}
            </div>
            <div className="report-footer">
                <span>Confidential</span>
                <span>Page 2</span>
            </div>
        </div>
        
        <div className="report-page">
            <div className="report-header">
                <span>{aiReport.reportTitle}</span>
                <span>{entrepreneur.businessName}</span>
            </div>
             <div className="report-content">
                {[aiReport.varianceAnalysis, aiReport.workingCapitalAnalysis, aiReport.cashFlowAnalysis].filter(Boolean).map(section => (
                    section && (
                    <Section key={section.title} title={section.title}>
                        <p className="report-p bg-slate-50 p-4 rounded-md">{section.analysis}</p>
                    </Section>
                    )
                ))}
                
                {aiReport.charts && aiReport.charts.length > 0 && (
                     <Section title="Data Visualizations">
                        <div className="space-y-6">
                            {aiReport.charts.map((chart, index) => <ReportChart key={index} chart={chart} />)}
                        </div>
                    </Section>
                )}
            </div>
            <div className="report-footer">
                <span>Confidential</span>
                <span>Page 3</span>
            </div>
        </div>

        <div className="report-page">
            <div className="report-header">
                <span>{aiReport.reportTitle}</span>
                <span>{entrepreneur.businessName}</span>
            </div>
             <div className="report-content">
                 {aiReport.swotAnalysis && (
                    <Section title="Strategic SWOT Analysis">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-break-inside">
                            <SwotCard title="Strengths" items={aiReport.swotAnalysis.strengths} color="border-green-500" />
                            <SwotCard title="Weaknesses" items={aiReport.swotAnalysis.weaknesses} color="border-red-500" />
                            <SwotCard title="Opportunities" items={aiReport.swotAnalysis.opportunities} color="border-blue-500" />
                            <SwotCard title="Threats" items={aiReport.swotAnalysis.threats} color="border-warning" />
                        </div>
                    </Section>
                 )}
                {aiReport.riskAnalysis && (
                    <Section title={aiReport.riskAnalysis.title}>
                        <div className="overflow-x-auto bg-slate-50 p-4 rounded-md no-break-inside professional-table">
                           <table>
                                <thead>
                                    <tr><th>Identified Risk</th><th>Impact</th><th>Mitigation Strategy</th></tr>
                                </thead>
                                <tbody>
                                    {aiReport.riskAnalysis.risks.map((riskItem, index) => (
                                        <tr key={index}>
                                            <td>{riskItem.risk}</td>
                                            <td className='text-center'>
                                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${impactColor(riskItem.impact)}`}>
                                                    {riskItem.impact}
                                                </span>
                                            </td>
                                            <td>{riskItem.mitigation}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Section>
                )}
            </div>
            <div className="report-footer">
                <span>Confidential</span>
                <span>Page 4</span>
            </div>
        </div>

         <div className="report-page">
            <div className="report-header">
                <span>{aiReport.reportTitle}</span>
                <span>{entrepreneur.businessName}</span>
            </div>
             <div className="report-content">
                <Section title="Strategic Recommendations & Action Plan">
                    <ul className="space-y-3">
                        {aiReport.strategicRecommendations.map((rec, index) => (
                            <li key={index} className="flex items-start p-3 bg-slate-50 rounded-md">
                               <span className={`flex-shrink-0 w-3 h-3 rounded-full mr-4 mt-1.5 ${priorityColor(rec.priority)}`} title={`Priority: ${rec.priority}`}></span>
                               <span className="text-gray-800 text-sm">{rec.recommendation}</span>
                            </li>
                        ))}
                    </ul>
                </Section>
                <Section title="Disclaimer">
                    <p className="text-xs text-gray-500 italic">This report is based on the financial data provided by the client. The analysis and recommendations contained herein are for informational purposes only and do not constitute professional financial or legal advice. All strategic decisions should be made in consultation with qualified professionals. Africa Entrepreneurship School (AES) assumes no liability for any actions taken based on the information contained in this report.</p>
                </Section>
            </div>
            <div className="report-footer">
                <span>Confidential</span>
                <span>Page 5</span>
            </div>
        </div>

      </div>
    </div>
  );
};

export default HtmlReportView;