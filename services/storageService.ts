
import type { Entrepreneur, Transaction } from '../types';

const ENTREPRENEURS_KEY = 'aes_jac_entrepreneurs';
const TRANSACTIONS_KEY = 'aes_jac_transactions';

export const getEntrepreneurs = (): Entrepreneur[] => {
  const data = localStorage.getItem(ENTREPRENEURS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveEntrepreneurs = (entrepreneurs: Entrepreneur[]): void => {
  localStorage.setItem(ENTREPRENEURS_KEY, JSON.stringify(entrepreneurs));
};

export const getTransactions = (): Transaction[] => {
  const data = localStorage.getItem(TRANSACTIONS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveTransactions = (transactions: Transaction[]): void => {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
};
