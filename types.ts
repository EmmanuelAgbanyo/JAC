import { PaymentMethod, PaidStatus, TransactionType } from './constants';

export enum Role {
  SUPER_ADMIN = 'Super Admin',
  ADMIN = 'Admin',
  STAFF = 'Staff',
}

export interface User {
  id: string;
  username: string;
  password?: string; // For simulation; don't store plain text in real apps
  role: Role;
  assignedEntrepreneurIds?: string[];
}

export interface Entrepreneur {
  id: string;
  name: string;
  contact: string;
  businessName: string;
  startDate: string; // ISO date string
  preferredPaymentType: PaymentMethod;
  bio?: string;
  goals?: Goal[];
  assignedStaffId?: string;
}

export type CurrentUser = 
  | { type: 'system', user: User }
  | { type: 'entrepreneur', user: Entrepreneur };


export interface Transaction {
  id:string;
  entrepreneurId: string;
  type: TransactionType;
  date: string; // ISO date string
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paidStatus?: PaidStatus; // Optional, only for income
  customerName?: string;
  productServiceCategory?: string;
}

export interface ReportData {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  receivablesSummary: {
    total: number; // Amount outstanding
    count: number;
  };
  transactionCount: {
    income: number;
    expense: number;
  };
  incomeByCategory: Array<{ category: string; amount: number; percentage: number }>;
  expenseByCategory: Array<{ category: string; amount: number; percentage: number }>;
  fullPaymentRate: number; // Percentage of income transactions fully paid
  collectionRate?: number; // Percentage of billed amount collected
  totalBilled?: number; // Total amount billed for income transactions
  topSellingItems: Array<{ category: string; amount: number }>;
  geminiInsights?: string;
}

// Interfaces for AI-Powered Report
export interface ChartDataItem {
  name: string;
  value: number;
}

export interface AiReportMetric {
  metric: string;
  value: string;
  insight: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface AiReportAnalysisSection {
  title: string;
  analysis: string;
}

export interface AiReportActionItem {
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
}

export interface IncomeStatementLine {
  item: string;
  amount: string;
}

export interface IncomeStatement {
  title: string;
  lines: IncomeStatementLine[];
  final_net_income: {
    label: string;
    value: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  };
}

export interface FinancialRatio {
  ratio_name: string;
  value: string;
  formula: string;
  interpretation: string;
}

export interface ChartSuggestion {
  chart_type: 'bar' | 'pie' | 'line';
  title: string;
  data: ChartDataItem[];
}

export interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface CashFlowAnalysis {
    title: string;
    analysis: string;
}

export interface SalesInsightItem {
    name: string;
    value: string;
    count?: number; // e.g., number of transactions
}

export interface SalesInsights {
    title: string;
    top_customers: SalesInsightItem[];
    top_products: SalesInsightItem[];
}

export interface FutureOutlook {
    title: string;
    forecast: string;
    trends_to_watch: string[];
}

export interface RiskAnalysisItem {
    risk: string;
    impact: 'High' | 'Medium' | 'Low';
    mitigation: string;
}

export interface RiskAnalysis {
    title: string;
    risks: RiskAnalysisItem[];
}

export interface AiReport {
  reportTitle: string;
  executiveSummary: string;
  keyMetrics: AiReportMetric[];
  incomeStatement?: IncomeStatement;
  financialRatios?: FinancialRatio[];
  charts?: ChartSuggestion[];
  swotAnalysis?: SwotAnalysis;
  cashFlowAnalysis?: CashFlowAnalysis;
  varianceAnalysis?: AiReportAnalysisSection;
  workingCapitalAnalysis?: AiReportAnalysisSection;
  salesInsights?: SalesInsights;
  futureOutlook?: FutureOutlook;
  riskAnalysis?: RiskAnalysis;
  detailedAnalysis: AiReportAnalysisSection[];
  strategicRecommendations: AiReportActionItem[];
}

// --- Goal Setting ---
export enum GoalType {
    REVENUE_TARGET = 'Revenue Target',
    PROFIT_TARGET = 'Profit Target',
    EXPENSE_REDUCTION = 'Expense Reduction',
    CUSTOM = 'Custom Milestone',
}

export interface Goal {
    id: string;
    title: string;
    type: GoalType;
    targetValue: number;
    targetDate: string; // ISO date string
    description?: string;
}

// --- Growth Hub ---
export interface Resource {
    id: string;
    title: string;
    description: string;
    type: 'Article' | 'Video' | 'Template';
    url: string;
    tags: string[];
}
export interface SuggestedDocument {
  documentName: string;
  description: string;
  contractType: string;
}

export interface SuggestedResource {
    title: string;
    reason: string;
}

export interface GrowthPlan {
  executiveSummary: string;
  strategicRecommendations: {
    title: string;
    recommendation: string;
    priority: 'High' | 'Medium' | 'Low';
  }[];
  suggestedDocuments: SuggestedDocument[];
  suggestedResources?: SuggestedResource[];
}

export interface ContractData {
  title: string;
  clauses: {
    title: string;
    content: string;
  }[];
}

// --- Dashboard AI Insights ---
export interface DashboardInsight {
  type: 'milestone' | 'warning' | 'opportunity' | 'trend';
  title: string;
  description: string;
  icon: '🎉' | '⚠️' | '💡' | '📉';
  relatedEntrepreneurIds?: string[];
}

// --- Ask AI Chat ---
export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}