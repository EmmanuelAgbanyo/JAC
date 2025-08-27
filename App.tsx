
import React, { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { AppView, TransactionType, PaymentMethod } from './constants';
import type { Entrepreneur, Transaction, Goal } from './types';
import Navbar from './components/Navbar';
import EntrepreneurManager from './components/EntrepreneurManager';
import TransactionManager from './components/TransactionManager';
import ReportGenerator from './components/ReportGenerator';
import { getEntrepreneurs, getTransactions, saveEntrepreneurs, saveTransactions } from './services/storageService';
import { parseTransactionsFromPdf } from './services/geminiService';
import Dashboard from './components/Dashboard';
import EntrepreneurDashboard from './components/EntrepreneurDashboard';
import GrowthHub from './components/GrowthHub';
import LoadingSpinner from './components/LoadingSpinner';
import * as XLSX from 'xlsx';
import Modal from './components/ui/Modal';
import TransactionEditForm from './components/TransactionEditForm';
import AskAiModal from './components/AskAiModal';
import GoalForm from './components/GoalForm';

const App = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [entrepreneurs, setEntrepreneurs] = useState<Entrepreneur[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingEntrepreneur, setEditingEntrepreneur] = useState<Entrepreneur | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedDashboardEntrepreneur, setSelectedDashboardEntrepreneur] = useState<Entrepreneur | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isAskAiModalOpen, setIsAskAiModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalModalEntrepreneur, setGoalModalEntrepreneur] = useState<Entrepreneur | null>(null);


  useEffect(() => {
    setEntrepreneurs(getEntrepreneurs());
    setTransactions(getTransactions());
  }, []);

  const handleSetEntrepreneurs = useCallback((updatedEntrepreneurs: Entrepreneur[]) => {
    setEntrepreneurs(updatedEntrepreneurs);
    saveEntrepreneurs(updatedEntrepreneurs);
  }, []);

  const handleSetTransactions = useCallback((updatedTransactions: Transaction[]) => {
    setTransactions(updatedTransactions);
    saveTransactions(updatedTransactions);
  }, []);

  const handleDeleteEntrepreneur = useCallback((id: string) => {
    // This centralized handler ensures both entrepreneurs and their transactions are removed from the app state.
    const updatedEntrepreneurs = entrepreneurs.filter(e => e.id !== id);
    handleSetEntrepreneurs(updatedEntrepreneurs);

    const updatedTransactions = transactions.filter(t => t.entrepreneurId !== id);
    handleSetTransactions(updatedTransactions);
  }, [entrepreneurs, transactions, handleSetEntrepreneurs, handleSetTransactions]);


  const navigateTo = (view: AppView) => {
    setEditingEntrepreneur(null); // Reset editing state on navigation
    if (view !== AppView.ENTREPRENEUR_DASHBOARD) {
        setSelectedDashboardEntrepreneur(null);
    }
    setCurrentView(view);
  };

  const handleEditEntrepreneur = (entrepreneur: Entrepreneur) => {
    setEditingEntrepreneur(entrepreneur);
    setCurrentView(AppView.EDIT_ENTREPRENEUR);
  };

   const handleViewDashboard = (entrepreneur: Entrepreneur) => {
    setSelectedDashboardEntrepreneur(entrepreneur);
    setCurrentView(AppView.ENTREPRENEUR_DASHBOARD);
  };
  
  const handleOpenEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  const handleCloseEditTransaction = () => {
    setEditingTransaction(null);
  };

  const handleUpdateTransaction = (updatedTransaction: Transaction) => {
    const updatedTransactions = transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t);
    handleSetTransactions(updatedTransactions);
    handleCloseEditTransaction();
  };
  
  const handleOpenGoalModal = (entrepreneur: Entrepreneur) => {
    setGoalModalEntrepreneur(entrepreneur);
    setIsGoalModalOpen(true);
  };

  const handleCloseGoalModal = () => {
    setGoalModalEntrepreneur(null);
    setIsGoalModalOpen(false);
  };
  
  const handleAddOrUpdateGoal = (goal: Goal) => {
    if (!goalModalEntrepreneur) return;
    
    const updatedEntrepreneur = { ...goalModalEntrepreneur };
    
    const existingGoals = updatedEntrepreneur.goals || [];
    const goalIndex = existingGoals.findIndex(g => g.id === goal.id);

    if (goalIndex > -1) {
        existingGoals[goalIndex] = goal;
    } else {
        existingGoals.push(goal);
    }
    updatedEntrepreneur.goals = existingGoals;

    const updatedEntrepreneurs = entrepreneurs.map(e => e.id === updatedEntrepreneur.id ? updatedEntrepreneur : e);
    handleSetEntrepreneurs(updatedEntrepreneurs);
    
    // Also update the selected entrepreneur if they are being viewed
    if (selectedDashboardEntrepreneur?.id === updatedEntrepreneur.id) {
        setSelectedDashboardEntrepreneur(updatedEntrepreneur);
    }

    handleCloseGoalModal();
  };


  const handleDataExport = () => {
    const data = {
      entrepreneurs: getEntrepreneurs(),
      transactions: getTransactions(),
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "aes_jac_admin_data_backup.json";
    link.click();
  };

  const handleDataImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    const processJson = (fileContent: string) => {
        try {
            const importedData = JSON.parse(fileContent);
            if (importedData.entrepreneurs && importedData.transactions) {
                if (window.confirm("This will overwrite all existing data with the backup file. Are you sure you want to proceed?")) {
                    handleSetEntrepreneurs(importedData.entrepreneurs);
                    handleSetTransactions(importedData.transactions);
                    alert("Data restored successfully!");
                    navigateTo(AppView.DASHBOARD);
                }
            } else {
                alert("Invalid JSON backup file format.");
            }
        } catch (error) {
            alert("Error importing JSON data: " + (error as Error).message);
        }
    };

    const processSheetData = (fileContent: ArrayBuffer) => {
        try {
            const workbook = XLSX.read(fileContent, { type: 'buffer', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json<any>(sheet);

            let newTransactions: Transaction[] = [];
            let newlyCreatedEntrepreneurs: Entrepreneur[] = [];
            let sessionEntrepreneurs = [...entrepreneurs];
            let skippedRows = 0;
            const errors: string[] = [];

            const headerMap: { [key: string]: keyof Transaction | 'entrepreneurName' | 'businessName' } = {
                'date': 'date', 'transaction date': 'date',
                'description': 'description', 'desc': 'description',
                'amount': 'amount',
                'type': 'type', 'transaction type': 'type',
                'payment method': 'paymentMethod',
                'paid status': 'paidStatus', 'status': 'paidStatus',
                'customer name': 'customerName', 'customer': 'customerName',
                'product/service category': 'productServiceCategory', 'category': 'productServiceCategory',
                'entrepreneur name': 'entrepreneurName',
                'business name': 'businessName',
                'entrepreneur id': 'entrepreneurId',
            };

            for (const [i, row] of rawData.entries()) {
                const normalizedRow: Partial<Transaction & { entrepreneurName: string; businessName: string }> = {};
                for (const key in row) {
                    const mappedKey = headerMap[key.toLowerCase().trim()];
                    if (mappedKey) {
                        (normalizedRow as any)[mappedKey] = row[key];
                    }
                }

                let entrepreneur: Entrepreneur | undefined = sessionEntrepreneurs.find(e => 
                    (normalizedRow.entrepreneurId && e.id === normalizedRow.entrepreneurId) ||
                    (normalizedRow.entrepreneurName && e.name.toLowerCase() === String(normalizedRow.entrepreneurName).toLowerCase()) ||
                    (normalizedRow.businessName && e.businessName.toLowerCase() === String(normalizedRow.businessName).toLowerCase())
                );

                if (!entrepreneur) {
                    const newName = normalizedRow.entrepreneurName || normalizedRow.businessName;
                    if (newName) {
                        const newEntrepreneur: Entrepreneur = {
                            id: crypto.randomUUID(),
                            name: normalizedRow.entrepreneurName || `Owner of ${normalizedRow.businessName!}`,
                            businessName: normalizedRow.businessName || `${normalizedRow.entrepreneurName!}'s Business`,
                            contact: '',
                            startDate: new Date().toISOString().split('T')[0],
                            preferredPaymentType: PaymentMethod.CASH,
                            bio: 'Profile auto-generated during data import.'
                        };
                        newlyCreatedEntrepreneurs.push(newEntrepreneur);
                        sessionEntrepreneurs.push(newEntrepreneur);
                        entrepreneur = newEntrepreneur;
                    } else {
                        skippedRows++;
                        errors.push(`Row ${i + 2}: Could not identify entrepreneur.`);
                        continue;
                    }
                }

                const { description, amount, type } = normalizedRow;
                if (!description || amount == null || !type) {
                    skippedRows++;
                    errors.push(`Row ${i + 2}: Missing required fields (Description, Amount, Type).`);
                    continue;
                }
                
                const parsedAmount = parseFloat(String(amount));
                if (isNaN(parsedAmount)) {
                    skippedRows++;
                    errors.push(`Row ${i + 2}: Invalid amount: "${amount}".`);
                    continue;
                }
                
                const dateValue = new Date(normalizedRow.date as any);
                const date = !isNaN(dateValue.getTime()) ? dateValue.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

                const newTransaction: Transaction = {
                    id: crypto.randomUUID(),
                    entrepreneurId: entrepreneur.id,
                    description: String(description),
                    amount: parsedAmount,
                    type: String(type).trim().toLowerCase() === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE,
                    date: date,
                    paymentMethod: normalizedRow.paymentMethod || entrepreneur.preferredPaymentType,
                    paidStatus: normalizedRow.paidStatus,
                    customerName: normalizedRow.customerName,
                    productServiceCategory: normalizedRow.productServiceCategory
                };

                newTransactions.push(newTransaction);
            }

            if (errors.length > 0) {
                console.warn("Import errors:", errors);
            }

            let confirmationMessage = `Found ${newTransactions.length} valid transactions to import.`;
            if (newlyCreatedEntrepreneurs.length > 0) {
                const names = newlyCreatedEntrepreneurs.map(e => e.name).join(', ');
                confirmationMessage += `\nThis will also create ${newlyCreatedEntrepreneurs.length} new entrepreneur profile(s): ${names}.`;
            }
            confirmationMessage += `\n\nThis will ADD them to the existing data. Proceed?`;

            if (newTransactions.length > 0) {
                if (window.confirm(confirmationMessage)) {
                    handleSetEntrepreneurs([...entrepreneurs, ...newlyCreatedEntrepreneurs]);
                    handleSetTransactions([...transactions, ...newTransactions]);
                    alert(`Import complete!\n\nAdded: ${newTransactions.length} transactions.\nCreated: ${newlyCreatedEntrepreneurs.length} entrepreneurs.\nSkipped: ${skippedRows} rows.${errors.length > 0 ? ' See console for details.' : ''}`);
                }
            } else {
                alert(`Import finished. No new transactions were added. Found ${skippedRows} rows with errors. Check console for details.`);
            }

        } catch (error) {
            console.error("Error processing sheet:", error);
            alert("Failed to process the file. Ensure it is a valid CSV or XLSX file and the format is correct. Error: " + (error as Error).message);
        }
    };

    const processPdfData = async (base64Pdf: string) => {
      try {
        if (!process.env.API_KEY) {
          throw new Error("Gemini API key is not configured. Cannot process PDF files.");
        }
        const aiData = await parseTransactionsFromPdf(base64Pdf);

        if (!aiData || !aiData.transactions || aiData.transactions.length === 0) {
          alert("The AI could not find any transactions in this PDF.");
          return;
        }

        let newTransactions: Transaction[] = [];
        let newlyCreatedEntrepreneurs: Entrepreneur[] = [];
        let sessionEntrepreneurs = [...entrepreneurs];
        const errors: string[] = [];

        for (const [i, row] of aiData.transactions.entries()) {
          let entrepreneur: Entrepreneur | undefined = sessionEntrepreneurs.find(e => 
              (row.entrepreneurName && e.name.toLowerCase() === String(row.entrepreneurName).toLowerCase()) ||
              (row.businessName && e.businessName.toLowerCase() === String(row.businessName).toLowerCase())
          );

          if (!entrepreneur) {
              const newName = row.entrepreneurName || row.businessName;
              if (newName) {
                  const newEntrepreneur: Entrepreneur = {
                      id: crypto.randomUUID(),
                      name: row.entrepreneurName || `Owner of ${row.businessName!}`,
                      businessName: row.businessName || `${row.entrepreneurName!}'s Business`,
                      contact: '',
                      startDate: new Date().toISOString().split('T')[0],
                      preferredPaymentType: PaymentMethod.CASH,
                      bio: 'Profile auto-generated during PDF import.'
                  };
                  newlyCreatedEntrepreneurs.push(newEntrepreneur);
                  sessionEntrepreneurs.push(newEntrepreneur);
                  entrepreneur = newEntrepreneur;
              } else {
                  errors.push(`Row ${i + 1} from PDF: Skipped. Could not identify entrepreneur.`);
                  continue;
              }
          }

          const { description, amount, type, date } = row;
          if (!description || amount == null || !type || !date) {
              errors.push(`Row ${i + 1} from PDF: Missing required fields (Description, Amount, Type, Date).`);
              continue;
          }

          const newTransaction: Transaction = {
              id: crypto.randomUUID(),
              entrepreneurId: entrepreneur.id,
              description: String(description),
              amount: Number(amount),
              type: String(type).trim().toLowerCase() === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE,
              date: new Date(date).toISOString().split('T')[0],
              paymentMethod: entrepreneur.preferredPaymentType,
          };

          newTransactions.push(newTransaction);
        }

        if (errors.length > 0) {
            console.warn("PDF Import errors:", errors);
        }

        let confirmationMessage = `AI extracted ${newTransactions.length} valid transactions from the PDF.`;
        if (newlyCreatedEntrepreneurs.length > 0) {
            const names = newlyCreatedEntrepreneurs.map(e => e.name).join(', ');
            confirmationMessage += `\nThis will also create ${newlyCreatedEntrepreneurs.length} new entrepreneur profile(s): ${names}.`;
        }
        confirmationMessage += `\n\nThis will ADD them to the existing data. Proceed?`;

        if (newTransactions.length > 0) {
            if (window.confirm(confirmationMessage)) {
                handleSetEntrepreneurs([...entrepreneurs, ...newlyCreatedEntrepreneurs]);
                handleSetTransactions([...transactions, ...newTransactions]);
                alert(`PDF Import complete!\n\nAdded: ${newTransactions.length} transactions.\nCreated: ${newlyCreatedEntrepreneurs.length} entrepreneurs.\nSkipped rows: ${errors.length}.${errors.length > 0 ? ' See console for details.' : ''}`);
            }
        } else {
            alert(`Import finished. No valid transactions were extracted from the PDF.`);
        }

      } catch (error) {
        console.error("Error processing PDF with AI:", error);
        alert("Failed to process PDF file with AI. Error: " + (error as Error).message);
      }
    };
    
    if (fileExtension === 'json') {
        reader.onload = e => {
            if (e.target?.result && typeof e.target.result === 'string') {
                processJson(e.target.result);
            }
        };
        reader.readAsText(file, "UTF-8");
    } else if (fileExtension === 'csv' || fileExtension === 'xlsx' || fileExtension === 'xls') {
        reader.onload = e => {
            if (e.target?.result && e.target.result instanceof ArrayBuffer) {
                processSheetData(e.target.result);
            }
        };
        reader.readAsArrayBuffer(file);
    } else if (fileExtension === 'pdf') {
        setIsImporting(true);
        reader.onload = async (e) => {
            try {
                if (e.target?.result && typeof e.target.result === 'string') {
                    const base64 = e.target.result.split(',')[1];
                    if (base64) {
                        await processPdfData(base64);
                    } else {
                        throw new Error("Could not read PDF as base64.");
                    }
                }
            } catch (error) {
                alert(`Error processing PDF: ${(error as Error).message}`);
            } finally {
                setIsImporting(false);
            }
        };
        reader.readAsDataURL(file);
    } else {
        alert("Unsupported file type. Please select a .json, .csv, .xls, .xlsx or .pdf file.");
    }
    
    if (event.target) {
        event.target.value = "";
    }
  };


  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard entrepreneurs={entrepreneurs} transactions={transactions} navigateTo={navigateTo} />;
      case AppView.ENTREPRENEURS:
      case AppView.ADD_ENTREPRENEUR:
      case AppView.EDIT_ENTREPRENEUR:
        return (
          <EntrepreneurManager
            entrepreneurs={entrepreneurs}
            setEntrepreneurs={handleSetEntrepreneurs}
            editingEntrepreneur={editingEntrepreneur}
            setEditingEntrepreneur={setEditingEntrepreneur}
            currentView={currentView}
            navigateTo={navigateTo}
            onEdit={handleEditEntrepreneur}
            onViewDashboard={handleViewDashboard}
            onDeleteEntrepreneur={handleDeleteEntrepreneur}
          />
        );
      case AppView.ENTREPRENEUR_DASHBOARD:
        return (
            <EntrepreneurDashboard
                entrepreneur={selectedDashboardEntrepreneur}
                transactions={transactions.filter(t => t.entrepreneurId === selectedDashboardEntrepreneur?.id)}
                navigateTo={navigateTo}
                onEditTransaction={handleOpenEditTransaction}
                onSetGoal={handleOpenGoalModal}
            />
        );
      case AppView.TRANSACTIONS:
        return (
          <TransactionManager
            transactions={transactions}
            setTransactions={handleSetTransactions}
            entrepreneurs={entrepreneurs}
            onEditTransaction={handleOpenEditTransaction}
          />
        );
      case AppView.REPORTS:
        return <ReportGenerator entrepreneurs={entrepreneurs} transactions={transactions} />;
      case AppView.GROWTH_HUB:
        return <GrowthHub entrepreneurs={entrepreneurs} />;
      default:
        return <Dashboard entrepreneurs={entrepreneurs} transactions={transactions} navigateTo={navigateTo} />;
    }
  };

  return (
    <>
      {isImporting && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center">
            <LoadingSpinner message="AI is processing your document, please wait..." />
        </div>
      )}
      {editingTransaction && (
        <Modal isOpen={true} onClose={handleCloseEditTransaction} title="Edit Transaction">
            <TransactionEditForm
                transaction={editingTransaction}
                onSubmit={handleUpdateTransaction}
                onCancel={handleCloseEditTransaction}
            />
        </Modal>
      )}
       {isAskAiModalOpen && (
        <AskAiModal
          isOpen={isAskAiModalOpen}
          onClose={() => setIsAskAiModalOpen(false)}
          entrepreneurs={entrepreneurs}
          transactions={transactions}
        />
      )}
      {isGoalModalOpen && goalModalEntrepreneur && (
        <Modal isOpen={true} onClose={handleCloseGoalModal} title={`Set Goal for ${goalModalEntrepreneur.businessName}`}>
            <GoalForm
                onSubmit={handleAddOrUpdateGoal}
                onCancel={handleCloseGoalModal}
            />
        </Modal>
      )}
      <div className="min-h-screen flex flex-col bg-secondary">
        <Navbar 
          navigateTo={navigateTo} 
          onExport={handleDataExport} 
          onImport={handleDataImport}
          onAskAi={() => setIsAskAiModalOpen(true)}
        />
        <main className="flex-grow p-4 md:p-8">
          {renderView()}
        </main>
        <footer className="bg-primary text-white text-center p-4">
          <p>&copy; {new Date().getFullYear()} AES JAC Admin Portal. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
};

export default App;
