
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  ENTREPRENEURS = 'ENTREPRENEURS',
  ADD_ENTREPRENEUR = 'ADD_ENTREPRENEUR',
  EDIT_ENTREPRENEUR = 'EDIT_ENTREPRENEUR',
  ENTREPRENEUR_DASHBOARD = 'ENTREPRENEUR_DASHBOARD',
  TRANSACTIONS = 'TRANSACTIONS', // Combined view for adding and listing
  REPORTS = 'REPORTS',
  GROWTH_HUB = 'GROWTH_HUB',
}

export enum TransactionType {
  INCOME = 'Income',
  EXPENSE = 'Expense',
}

export enum PaymentMethod {
  CASH = 'Cash',
  MOMO = 'MoMo',
  BANK = 'Bank Transfer',
  CREDIT = 'Credit',
}

export enum PaidStatus {
  FULL = 'Full',
  PARTIAL = 'Partial',
  PENDING = 'Pending',
}

export const GENAI_MODEL_NAME = 'gemini-2.5-flash';