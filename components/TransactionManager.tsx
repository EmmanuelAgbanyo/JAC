import React, { useRef, useState, type ChangeEvent } from 'react';
import type { Transaction, Entrepreneur, PartialTransaction } from '../types';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import Button from './ui/Button';
import { parseExpenseFromReceipt } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';

interface TransactionManagerProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Transaction) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  entrepreneurs: Entrepreneur[];
  onEditTransaction: (transaction: Transaction) => void;
  onScanSuccess: (parsedData: PartialTransaction) => void;
}

const TransactionManager = ({ 
  transactions, 
  onAddTransaction,
  onDeleteTransaction,
  entrepreneurs, 
  onEditTransaction, 
  onScanSuccess 
}: TransactionManagerProps) => {
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            if (!base64String) {
                throw new Error("Could not read file as base64.");
            }
            if (!process.env.API_KEY) {
              throw new Error("Gemini API key is not configured. Cannot parse receipt.");
            }
            const parsedData = await parseExpenseFromReceipt(base64String);
            onScanSuccess(parsedData);
        };
        reader.readAsDataURL(file);

    } catch (error) {
        console.error("Error parsing receipt:", error);
        alert(`Error: ${(error as Error).message}`);
    } finally {
        setIsParsing(false);
        // Reset file input value to allow re-uploading the same file
        if (event.target) {
            event.target.value = "";
        }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-8">
       {isParsing && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center">
            <LoadingSpinner message="AI is reading your receipt..." />
        </div>
      )}
      <h1 className="text-3xl font-bold text-gray-800 dark:text-dark-text">Manage Transactions</h1>
      
      {entrepreneurs.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="bg-white dark:bg-dark-secondary p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-dark-text mb-6">Add New Transaction</h2>
                <TransactionForm 
                  onSubmit={onAddTransaction} 
                  entrepreneurs={entrepreneurs}
                />
            </div>
             <div className="bg-blue-50 dark:bg-dark-primary/50 p-6 rounded-lg shadow-md border-2 border-dashed border-blue-300 dark:border-blue-800">
                <div className="text-center">
                    <div className="text-4xl mb-3">🤖</div>
                    <h3 className="text-xl font-semibold text-aesBlue dark:text-blue-300">AI Assistant</h3>
                    <p className="text-gray-600 dark:text-dark-textSecondary mt-2 mb-4">
                        Save time on data entry. Upload a photo of a receipt, and the AI will automatically fill out the expense details for you.
                    </p>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        capture="environment"
                        onChange={handleFileChange}
                    />
                    <Button 
                        variant="primary" 
                        onClick={triggerFileUpload}
                        isLoading={isParsing}
                    >
                        Scan Expense Receipt
                    </Button>
                </div>
            </div>
        </div>
      ) : (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md shadow" role="alert">
          <p className="font-bold">No Entrepreneurs Found</p>
          <p>Please add an entrepreneur first before logging transactions.</p>
        </div>
      )}

      <TransactionList 
        transactions={transactions} 
        entrepreneurs={entrepreneurs} 
        onDeleteTransaction={onDeleteTransaction} 
        onEditTransaction={onEditTransaction}
      />
    </div>
  );
};

export default TransactionManager;
