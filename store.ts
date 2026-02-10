
import { useState, useEffect } from 'react';
import { 
  Revenue, SimpleExpense, InstallmentDebt, Installment, 
  Category, TransactionType, Status, DebtStatus, Frequency
} from './types';
import { generateInstallments } from './utils';

const STORAGE_KEY = 'finans_db_v1';

const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'SALÁRIO', type: TransactionType.REVENUE },
  { id: '2', name: 'ALUGUEL', type: TransactionType.EXPENSE },
  { id: '3', name: 'MERCADO', type: TransactionType.EXPENSE },
  { id: '4', name: 'FREELANCE', type: TransactionType.REVENUE },
];

export const useFinanceStore = () => {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [expenses, setExpenses] = useState<SimpleExpense[]>([]);
  const [debts, setDebts] = useState<InstallmentDebt[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      // Migration: Add status to old revenues if they don't have it
      const migRevenues = (data.revenues || []).map((r: any) => ({
        ...r,
        status: r.status || (new Date(r.date) <= new Date() ? Status.PAID : Status.PENDING)
      }));
      setRevenues(migRevenues);
      setExpenses(data.expenses || []);
      setDebts(data.debts || []);
      setInstallments(data.installments || []);
      if (data.categories) setCategories(data.categories);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        revenues, expenses, debts, installments, categories 
      }));
    }
  }, [revenues, expenses, debts, installments, categories, isLoaded]);

  const addCategory = (name: string, type: TransactionType) => {
    const newCat = { id: crypto.randomUUID(), name: name.toUpperCase(), type };
    setCategories(prev => [...prev, newCat]);
    return newCat;
  };

  const calculateNextDate = (baseDate: Date, index: number, freq: Frequency) => {
    const d = new Date(baseDate);
    if (freq === Frequency.DAILY) d.setDate(baseDate.getDate() + index);
    if (freq === Frequency.WEEKLY) d.setDate(baseDate.getDate() + index * 7);
    if (freq === Frequency.BIWEEKLY) d.setDate(baseDate.getDate() + index * 15);
    if (freq === Frequency.MONTHLY) d.setMonth(baseDate.getMonth() + index);
    if (freq === Frequency.YEARLY) d.setFullYear(baseDate.getFullYear() + index);
    return d.toISOString().split('T')[0];
  };

  const addRevenue = (rev: Omit<Revenue, 'id'>, repetitions: number = 1) => {
    if (rev.isRecurrent && repetitions > 1 && rev.frequency) {
      const newRevs: Revenue[] = [];
      const baseDate = new Date(rev.date);
      for (let i = 0; i < repetitions; i++) {
        newRevs.push({
          ...rev,
          id: crypto.randomUUID(),
          date: calculateNextDate(baseDate, i, rev.frequency)
        });
      }
      setRevenues(prev => [...prev, ...newRevs]);
    } else {
      setRevenues(prev => [...prev, { ...rev, id: crypto.randomUUID() }]);
    }
  };

  const addExpense = (exp: Omit<SimpleExpense, 'id'>, repetitions: number = 1) => {
    if (exp.isRecurrent && repetitions > 1 && exp.frequency) {
      const newExps: SimpleExpense[] = [];
      const baseDate = new Date(exp.dueDate);
      for (let i = 0; i < repetitions; i++) {
        newExps.push({
          ...exp,
          id: crypto.randomUUID(),
          dueDate: calculateNextDate(baseDate, i, exp.frequency)
        });
      }
      setExpenses(prev => [...prev, ...newExps]);
    } else {
      setExpenses(prev => [...prev, { ...exp, id: crypto.randomUUID() }]);
    }
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

  const toggleRevenueStatus = (id: string) => {
    setRevenues(prev => prev.map(r => r.id === id ? { ...r, status: r.status === Status.PAID ? Status.PENDING : Status.PAID } : r));
  };

  return {
    revenues, expenses, debts, installments, categories,
    addRevenue, addExpense, addDebt, addCategory,
    updateInstallmentStatus, deleteRevenue, deleteExpense, deleteDebt,
    toggleExpenseStatus, toggleRevenueStatus
  };
};
