import React, { useState, useEffect, useCallback, type ChangeEvent, useRef } from 'react';
import { AppView, TransactionType, PaymentMethod, USERS } from './constants';
import type { Entrepreneur, Transaction, Goal, CurrentUser, User, PartialTransaction } from './types';
import { Role } from './types';
import Navbar from './components/Navbar';
import EntrepreneurManager from './components/EntrepreneurManager';
import TransactionManager from './components/TransactionManager';
import ReportGenerator from './components/ReportGenerator';
import { 
  listenToEntrepreneurs, 
  listenToTransactions, 
  listenToUsers,
  writeEntrepreneur,
  deleteEntrepreneur,
  writeTransaction,
  deleteTransaction,
  writeUser,
  deleteUser,
  overwriteEntrepreneurs,
  overwriteTransactions,
  overwriteUsers
} from './services/storageService';
import { parseTransactionsFromPdf, parseExpenseFromReceipt } from './services/geminiService';
import Dashboard from './components/Dashboard';
import EntrepreneurDashboard from './components/EntrepreneurDashboard';
import GrowthHub from './components/GrowthHub';
import LoadingSpinner from './components/LoadingSpinner';
import * as XLSX from 'xlsx';
import Modal from './components/ui/Modal';
import TransactionForm from './components/TransactionForm';
import AskAiModal from './components/AskAiModal';
import GoalForm from './components/GoalForm';
import FullPageLoader from './components/ui/FullPageLoader';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import SecondaryNav from './components/SecondaryNav';
import { ThemeProvider } from './contexts/ThemeContext';

const AppContent = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [entrepreneurs, setEntrepreneurs] = useState<Entrepreneur[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingEntrepreneur, setEditingEntrepreneur] = useState<Entrepreneur | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [scannedTransaction, setScannedTransaction] = useState<PartialTransaction | null>(null);
  const [selectedDashboardEntrepreneur, setSelectedDashboardEntrepreneur] = useState<Entrepreneur | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isAskAiModalOpen, setIsAskAiModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalModalEntrepreneur, setGoalModalEntrepreneur] = useState<Entrepreneur | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const dataLoaded = useRef({ entrepreneurs: false, transactions: false, users: false });

  const checkAllDataLoaded = () => {
    if (dataLoaded.current.entrepreneurs && dataLoaded.current.transactions && dataLoaded.current.users) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribeUsers = listenToUsers((data) => {
      if (data.length === 0) {
        // First-time setup or data wipe, seed with default users
        overwriteUsers(USERS);
        setUsers(USERS);
      } else {
        setUsers(data);
      }
      dataLoaded.current.users = true;
      checkAllDataLoaded();
    });
    const unsubscribeEntrepreneurs = listenToEntrepreneurs((data) => {
        setEntrepreneurs(data);
        dataLoaded.current.entrepreneurs = true;
        checkAllDataLoaded();
    });
    const unsubscribeTransactions = listenToTransactions((data) => {
        setTransactions(data);
        dataLoaded.current.transactions = true;
        checkAllDataLoaded();
    });

    return () => {
        unsubscribeUsers();
        unsubscribeEntrepreneurs();
        unsubscribeTransactions();
    };
  }, []);
  
  const handleLogin = (user: CurrentUser) => {
    setCurrentUser(user);
    if (user.type === 'system') {
      navigateTo(AppView.DASHBOARD);
    } else {
      setSelectedDashboardEntrepreneur(user.user);
      navigateTo(AppView.ENTREPRENEUR_DASHBOARD);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedDashboardEntrepreneur(null);
    navigateTo(AppView.LOGIN);
  };

  const handleDeleteEntrepreneur = useCallback(async (id: string) => {
    const updatedTransactions = transactions.filter(t => t.entrepreneurId !== id);
    const deletePromises = updatedTransactions.map(t => deleteTransaction(t.id));
    await Promise.all(deletePromises);
    await deleteEntrepreneur(id);
  }, [transactions]);


  const navigateTo = (view: AppView) => {
    setEditingEntrepreneur(null);
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
  
  const handleScanSuccess = (parsedData: PartialTransaction) => {
    setScannedTransaction(parsedData);
  };

  const handleCloseScannedTransaction = () => {
    setScannedTransaction(null);
  };
  
  const handleAddScannedTransaction = async (transaction: Transaction) => {
      await writeTransaction(transaction);
      handleCloseScannedTransaction();
  };

  const handleUpdateTransaction = async (updatedTransaction: Transaction) => {
    await writeTransaction(updatedTransaction);
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
  
  const handleAddOrUpdateGoal = async (goal: Goal) => {
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

    await writeEntrepreneur(updatedEntrepreneur);
    
    if (selectedDashboardEntrepreneur?.id === updatedEntrepreneur.id) {
        setSelectedDashboardEntrepreneur(updatedEntrepreneur);
    }
    if (currentUser?.type === 'entrepreneur' && currentUser.user.id === updatedEntrepreneur.id) {
        setCurrentUser({ ...currentUser, user: updatedEntrepreneur });
    }

    handleCloseGoalModal();
  };

  const handleDataExport = () => {
    const data = { users: users, entrepreneurs: entrepreneurs, transactions: transactions };
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

    const processJson = async (fileContent: string) => {
        try {
            const importedData = JSON.parse(fileContent);
            if (importedData.entrepreneurs && importedData.transactions) {
                if (window.confirm("This will overwrite all existing data with the backup file. Are you sure you want to proceed?")) {
                    await Promise.all([
                      overwriteUsers(importedData.users || USERS), // Handle legacy backups
                      overwriteEntrepreneurs(importedData.entrepreneurs),
                      overwriteTransactions(importedData.transactions)
                    ]);
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

    const processSheetData = async (fileContent: ArrayBuffer) => {
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
                    const entrepreneurPromises = newlyCreatedEntrepreneurs.map(e => writeEntrepreneur(e));
                    const transactionPromises = newTransactions.map(t => writeTransaction(t));
                    await Promise.all([...entrepreneurPromises, ...transactionPromises]);
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
                const entrepreneurPromises = newlyCreatedEntrepreneurs.map(e => writeEntrepreneur(e));
                const transactionPromises = newTransactions.map(t => writeTransaction(t));
                await Promise.all([...entrepreneurPromises, ...transactionPromises]);
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

  // --- Data Scoping ---
  const visibleEntrepreneurs = useCallback(() => {
    if (currentUser?.type === 'system') {
        // Super Admin, Admin, and Staff now see all
        return entrepreneurs;
    }
    return []; // Entrepreneurs don't see lists of other entrepreneurs
  }, [currentUser, entrepreneurs]);

  const visibleTransactions = useCallback(() => {
    if (currentUser?.type === 'system') {
        // Super Admin, Admin, and Staff now see all
        return transactions;
    }
    // For entrepreneur user, their own transactions are filtered inside their dashboard component
    return transactions.filter(t => t.entrepreneurId === (currentUser as { type: 'entrepreneur', user: Entrepreneur }).user.id);
  }, [currentUser, transactions]);


  const renderSystemUserView = () => {
    const scopedEntrepreneurs = visibleEntrepreneurs();
    const scopedTransactions = visibleTransactions();

    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard entrepreneurs={scopedEntrepreneurs} transactions={scopedTransactions} />;
      case AppView.ENTREPRENEURS:
      case AppView.ADD_ENTREPRENEUR:
      case AppView.EDIT_ENTREPRENEUR:
        return (
          <EntrepreneurManager
            entrepreneurs={scopedEntrepreneurs}
            onAddOrUpdateEntrepreneur={writeEntrepreneur}
            editingEntrepreneur={editingEntrepreneur}
            setEditingEntrepreneur={setEditingEntrepreneur}
            currentView={currentView}
            navigateTo={navigateTo}
            onEdit={handleEditEntrepreneur}
            onViewDashboard={handleViewDashboard}
            onDeleteEntrepreneur={handleDeleteEntrepreneur}
            users={users}
            currentUser={currentUser as { type: 'system', user: User }}
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
                userRole='admin' // Represents system user
            />
        );
      case AppView.TRANSACTIONS:
        return (
          <TransactionManager
            transactions={scopedTransactions}
            onAddTransaction={writeTransaction}
            onDeleteTransaction={deleteTransaction}
            entrepreneurs={scopedEntrepreneurs}
            onEditTransaction={handleOpenEditTransaction}
            onScanSuccess={handleScanSuccess}
          />
        );
      case AppView.REPORTS:
        return <ReportGenerator entrepreneurs={scopedEntrepreneurs} transactions={scopedTransactions} />;
      case AppView.GROWTH_HUB:
        return <GrowthHub entrepreneurs={scopedEntrepreneurs} />;
      case AppView.USER_MANAGEMENT:
        return <UserManagement allUsers={users} onSaveUser={writeUser} onDeleteUser={deleteUser} />;
      default:
        return <Dashboard entrepreneurs={scopedEntrepreneurs} transactions={scopedTransactions} />;
    }
  };

  const renderEntrepreneurView = () => {
    if (currentUser?.type !== 'entrepreneur') return null;

    const myTransactions = transactions.filter(t => t.entrepreneurId === currentUser.user.id);

    return (
      <EntrepreneurDashboard
          entrepreneur={currentUser.user}
          transactions={myTransactions}
          navigateTo={navigateTo}
          onEditTransaction={handleOpenEditTransaction}
          onSetGoal={() => handleOpenGoalModal(currentUser.user)}
          userRole='entrepreneur'
          onAddTransaction={writeTransaction}
      />
    );
  };
  
  const renderContent = () => {
    if (isLoading) return <FullPageLoader message="Loading AES JAC Admin Portal..." />;
    if (!currentUser) return <Login onLogin={handleLogin} entrepreneurs={entrepreneurs} users={users} />;

    if (currentUser.type === 'system') {
      return (
        <div className="flex-grow w-full max-w-7xl mx-auto">
          {renderSystemUserView()}
        </div>
      );
    } else {
      return (
         <div className="flex-grow w-full max-w-7xl mx-auto">
          {renderEntrepreneurView()}
        </div>
      );
    }
  }

  return (
    <>
      {isImporting && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center">
            <LoadingSpinner message="AI is processing your document, please wait..." />
        </div>
      )}
      {editingTransaction && (
        <Modal isOpen={true} onClose={handleCloseEditTransaction} title="Edit Transaction">
            <TransactionForm
                initialData={editingTransaction}
                onSubmit={handleUpdateTransaction}
                onCancel={handleCloseEditTransaction}
                entrepreneurs={visibleEntrepreneurs()}
            />
        </Modal>
      )}
      {scannedTransaction && (
         <Modal isOpen={true} onClose={handleCloseScannedTransaction} title="Confirm Scanned Expense">
             <TransactionForm
                 initialData={scannedTransaction}
                 onSubmit={handleAddScannedTransaction}
                 onCancel={handleCloseScannedTransaction}
                 entrepreneurs={visibleEntrepreneurs()}
             />
         </Modal>
      )}
       {isAskAiModalOpen && (
        <AskAiModal
          isOpen={isAskAiModalOpen}
          onClose={() => setIsAskAiModalOpen(false)}
          entrepreneurs={visibleEntrepreneurs()}
          transactions={visibleTransactions()}
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
      
      {currentUser ? (
        <div className="min-h-screen flex flex-col bg-secondary dark:bg-dark-primary transition-colors duration-300">
          <Navbar
            currentUser={currentUser}
            navigateTo={navigateTo}
            onLogout={handleLogout}
            onExport={handleDataExport}
            onImport={handleDataImport}
            onAskAi={() => setIsAskAiModalOpen(true)}
          />
           {currentUser.type === 'system' && (
             <SecondaryNav 
                currentView={currentView}
                navigateTo={navigateTo}
                currentUser={currentUser}
             />
          )}
          <main className="flex-grow flex justify-center main-content">
            {renderContent()}
          </main>
        </div>
      ) : (
        <div className="login-container bg-secondary dark:bg-dark-primary transition-colors duration-300">
          {renderContent()}
        </div>
      )}
    </>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;