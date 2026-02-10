
import { useState, useEffect } from 'react';
import { 
  Revenue, SimpleExpense, InstallmentDebt, Installment, 
  Category, TransactionType, Status, DebtStatus 
} from './types';
import { generateInstallments } from './utils';

const STORAGE_KEY = 'finans_db_v1';

const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'Salário', type: TransactionType.REVENUE },
  { id: '2', name: 'Aluguel', type: TransactionType.EXPENSE },
  { id: '3', name: 'Mercado', type: TransactionType.EXPENSE },
  { id: '4', name: 'Freelance', type: TransactionType.REVENUE },
];

export const useFinanceStore = () => {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [expenses, setExpenses] = useState<SimpleExpense[]>([]);
  const [debts, setDebts] = useState<InstallmentDebt[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [categories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      setRevenues(data.revenues || []);
      setExpenses(data.expenses || []);
      setDebts(data.debts || []);
      setInstallments(data.installments || []);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ revenues, expenses, debts, installments }));
    }
  }, [revenues, expenses, debts, installments, isLoaded]);

  const addRevenue = (rev: Omit<Revenue, 'id'>) => {
    const newRev = { ...rev, id: crypto.randomUUID() };
    setRevenues(prev => [...prev, newRev]);
  };

  const addExpense = (exp: Omit<SimpleExpense, 'id'>) => {
    const newExp = { ...exp, id: crypto.randomUUID() };
    setExpenses(prev => [...prev, newExp]);
  };

  const addDebt = (debt: Omit<InstallmentDebt, 'id' | 'status' | 'installmentValue'>) => {
    const id = crypto.randomUUID();
    const installmentValue = debt.totalValue / debt.installmentsCount;
    const newDebt: InstallmentDebt = { ...debt, id, status: DebtStatus.ACTIVE, installmentValue };
    
    const newInstallments = generateInstallments(
      id, 
      debt.totalValue, 
      debt.installmentsCount, 
      debt.startDate, 
      debt.frequency
    );

    setDebts(prev => [...prev, newDebt]);
    setInstallments(prev => [...prev, ...newInstallments]);
  };

  const updateInstallmentStatus = (id: string, status: Status) => {
    setInstallments(prev => {
      const updated = prev.map(inst => inst.id === id ? { ...inst, status } : inst);
      
      // Check if all installments for this debt are paid
      const inst = prev.find(i => i.id === id);
      if (inst) {
        const debtId = inst.debtId;
        const related = updated.filter(i => i.debtId === debtId);
        const allPaid = related.every(i => i.status === Status.PAID);
        
        if (allPaid) {
          setDebts(dPrev => dPrev.map(d => d.id === debtId ? { ...d, status: DebtStatus.FINISHED } : d));
        } else {
          setDebts(dPrev => dPrev.map(d => d.id === debtId ? { ...d, status: DebtStatus.ACTIVE } : d));
        }
      }
      return updated;
    });
  };

  const deleteRevenue = (id: string) => setRevenues(prev => prev.filter(r => r.id !== id));
  const deleteExpense = (id: string) => setExpenses(prev => prev.filter(e => e.id !== id));
  const deleteDebt = (id: string) => {
    setDebts(prev => prev.filter(d => d.id !== id));
    setInstallments(prev => prev.filter(i => i.debtId !== id));
  };

  const toggleExpenseStatus = (id: string) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: e.status === Status.PAID ? Status.PENDING : Status.PAID } : e));
  };

  return {
    revenues, expenses, debts, installments, categories,
    addRevenue, addExpense, addDebt, 
    updateInstallmentStatus, deleteRevenue, deleteExpense, deleteDebt,
    toggleExpenseStatus
  };
};
