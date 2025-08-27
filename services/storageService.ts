import { ref, onValue, set, type Unsubscribe } from "firebase/database";
import { db } from './firebaseService';
import type { Entrepreneur, Transaction, User } from '../types';

const ENTREPRENEURS_KEY = 'entrepreneurs';
const TRANSACTIONS_KEY = 'transactions';
const USERS_KEY = 'users';

const entrepreneursRef = ref(db, ENTREPRENEURS_KEY);
const transactionsRef = ref(db, TRANSACTIONS_KEY);
const usersRef = ref(db, USERS_KEY);

export const listenToEntrepreneurs = (callback: (data: Entrepreneur[]) => void): Unsubscribe => {
  return onValue(entrepreneursRef, (snapshot) => {
    const data = snapshot.val();
    callback(data ? data : []);
  });
};

export const listenToTransactions = (callback: (data: Transaction[]) => void): Unsubscribe => {
  return onValue(transactionsRef, (snapshot) => {
    const data = snapshot.val();
    callback(data ? data : []);
  });
};

export const listenToUsers = (callback: (data: User[]) => void): Unsubscribe => {
    return onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        callback(data ? data : []);
    });
};

export const saveEntrepreneurs = async (entrepreneurs: Entrepreneur[]): Promise<void> => {
  await set(entrepreneursRef, entrepreneurs);
};

export const saveTransactions = async (transactions: Transaction[]): Promise<void> => {
  await set(transactionsRef, transactions);
};

export const saveUsers = async (users: User[]): Promise<void> => {
    await set(usersRef, users);
};