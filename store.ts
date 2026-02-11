
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  Revenue, SimpleExpense, InstallmentDebt, Installment, 
  Category, TransactionType, Status, DebtStatus, Frequency, User, Budget
} from './types';
import { generateInstallments } from './utils';

export const useFinanceStore = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [expenses, setExpenses] = useState<SimpleExpense[]>([]);
  const [debts, setDebts] = useState<InstallmentDebt[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchData = async () => {
    setIsSyncing(true);
    try {
      const [
        { data: usrList },
        { data: revs },
        { data: exps },
        { data: dbtList },
        { data: instList },
        { data: cats },
        { data: budList }
      ] = await Promise.all([
        supabase.from('usuarios').select('*'),
        supabase.from('revenues').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('debts').select('*'),
        supabase.from('installments').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('budgets').select('*')
      ]);

      if (usrList) {
        setUsers(usrList);
        const storedUserId = localStorage.getItem('lastUserId');
        const found = usrList.find(u => u.id === storedUserId);
        setCurrentUser(found || usrList[0] || null);
      }
      if (revs) setRevenues(revs);
      if (exps) {
          setExpenses(exps.map(e => ({
              ...e,
              dueDate: e.due_date,
              categoryId: e.category_id,
              paymentMethod: e.payment_method,
              isRecurrent: e.is_recurrent
          })));
      }
      if (dbtList) {
          setDebts(dbtList.map(d => ({
              ...d,
              totalValue: d.total_value,
              startDate: d.start_date,
              installmentsCount: d.installments_count,
              installmentValue: d.installment_value,
              categoryId: d.category_id
          })));
      }
      if (instList) {
          setInstallments(instList.map(i => ({
              ...i,
              debtId: i.debt_id,
              installmentNumber: i.installment_number,
              dueDate: i.due_date
          })));
      }
      if (cats) setCategories(cats);
      if (budList) {
          setBudgets(budList.map(b => ({
              ...b,
              userId: b.user_id,
              categoryId: b.category_id,
              limitValue: b.limit_value
          })));
      }
    } catch (e) {
      console.error("Erro ao carregar do Supabase", e);
    } finally {
      setIsLoaded(true);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (currentUser) localStorage.setItem('lastUserId', currentUser.id);
  }, [currentUser]);

  const addUser = async (nome: string, email: string) => {
    const { data } = await supabase.from('usuarios').insert([{ nome, email }]).select();
    if (data) setUsers(prev => [...prev, data[0]]);
  };

  const setBudget = async (categoryId: string, limitValue: number, month: number, year: number) => {
    if (!currentUser) return;
    setIsSyncing(true);
    
    const existing = budgets.find(b => b.categoryId === categoryId && b.month === month && b.year === year && b.userId === currentUser.id);
    
    if (existing) {
        const { data } = await supabase.from('budgets').update({ limit_value: limitValue }).eq('id', existing.id).select();
        if (data) setBudgets(prev => prev.map(b => b.id === existing.id ? { ...b, limitValue } : b));
    } else {
        const { data } = await supabase.from('budgets').insert([{
            user_id: currentUser.id,
            category_id: categoryId,
            limit_value: limitValue,
            month,
            year
        }]).select();
        if (data) setBudgets(prev => [...prev, { ...data[0], userId: data[0].user_id, categoryId: data[0].category_id, limitValue: data[0].limit_value }]);
    }
    setIsSyncing(false);
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

  const addRevenue = async (rev: Omit<Revenue, 'id'>, repetitions: number = 1) => {
    if (!currentUser) return;
    setIsSyncing(true);
    const newRevs = [];
    const baseDate = new Date(rev.date);
    
    for (let i = 0; i < (rev.isRecurrent ? repetitions : 1); i++) {
      newRevs.push({
        user_id: currentUser.id,
        description: rev.description,
        value: rev.value,
        date: calculateNextDate(baseDate, i, rev.frequency || Frequency.MONTHLY),
        category_id: rev.categoryId,
        status: rev.status,
        is_recurrent: rev.isRecurrent,
        frequency: rev.frequency
      });
    }

    const { data } = await supabase.from('revenues').insert(newRevs).select();
    if (data) setRevenues(prev => [...prev, ...data]);
    setIsSyncing(false);
  };

  const addExpense = async (exp: Omit<SimpleExpense, 'id'>, repetitions: number = 1) => {
    if (!currentUser) return;
    setIsSyncing(true);
    const newExps = [];
    const baseDate = new Date(exp.dueDate);

    for (let i = 0; i < (exp.isRecurrent ? repetitions : 1); i++) {
      newExps.push({
        user_id: currentUser.id,
        description: exp.description,
        value: exp.value,
        due_date: calculateNextDate(baseDate, i, exp.frequency || Frequency.MONTHLY),
        category_id: exp.categoryId,
        payment_method: exp.paymentMethod,
        status: exp.status,
        is_recurrent: exp.isRecurrent,
        frequency: exp.frequency
      });
    }

    const { data } = await supabase.from('expenses').insert(newExps).select();
    if (data) {
        const mapped = data.map(e => ({ ...e, dueDate: e.due_date, categoryId: e.category_id, isRecurrent: e.is_recurrent }));
        setExpenses(prev => [...prev, ...mapped]);
    }
    setIsSyncing(false);
  };

  const addDebt = async (debt: Omit<InstallmentDebt, 'id' | 'status' | 'installmentValue'>) => {
    if (!currentUser) return;
    setIsSyncing(true);
    const installmentValue = debt.totalValue / debt.installmentsCount;
    
    const { data: debtData } = await supabase.from('debts').insert([{
        user_id: currentUser.id,
        description: debt.description,
        total_value: debt.totalValue,
        start_date: debt.startDate,
        frequency: debt.frequency,
        installments_count: debt.installmentsCount,
        installment_value: installmentValue,
        status: DebtStatus.ACTIVE,
        category_id: debt.categoryId
    }]).select();

    if (debtData) {
        const newDebt = debtData[0];
        const insts = generateInstallments(
            newDebt.id, 
            debt.totalValue, 
            debt.installmentsCount, 
            debt.startDate, 
            debt.frequency
        ).map(i => ({
            id: i.id,
            debt_id: i.debtId,
            installment_number: i.installmentNumber,
            value: i.value,
            due_date: i.dueDate,
            status: i.status
        }));

        const { data: instData } = await supabase.from('installments').insert(insts).select();
        
        setDebts(prev => [...prev, { ...newDebt, totalValue: newDebt.total_value, startDate: newDebt.start_date, installmentsCount: newDebt.installments_count, installmentValue: newDebt.installment_value }]);
        if (instData) {
            setInstallments(prev => [...prev, ...instData.map(i => ({ ...i, debtId: i.debt_id, installmentNumber: i.installment_number, dueDate: i.due_date }))]);
        }
    }
    setIsSyncing(false);
  };

  const updateInstallmentStatus = async (id: string, status: Status) => {
    await supabase.from('installments').update({ status }).eq('id', id);
    setInstallments(prev => prev.map(inst => inst.id === id ? { ...inst, status } : inst));
  };

  const deleteRevenue = async (id: string) => {
    await supabase.from('revenues').delete().eq('id', id);
    setRevenues(prev => prev.filter(r => r.id !== id));
  };

  const deleteExpense = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const deleteDebt = async (id: string) => {
    await supabase.from('debts').delete().eq('id', id);
    setDebts(prev => prev.filter(d => d.id !== id));
    setInstallments(prev => prev.filter(i => i.debtId !== id));
  };

  const toggleExpenseStatus = async (id: string) => {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    const newStatus = exp.status === Status.PAID ? Status.PENDING : Status.PAID;
    await supabase.from('expenses').update({ status: newStatus }).eq('id', id);
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
  };

  const toggleRevenueStatus = async (id: string) => {
    const rev = revenues.find(r => r.id === id);
    if (!rev) return;
    const newStatus = rev.status === Status.PAID ? Status.PENDING : Status.PAID;
    await supabase.from('revenues').update({ status: newStatus }).eq('id', id);
    setRevenues(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  return {
    users, currentUser, setCurrentUser, addUser,
    revenues, expenses, debts, installments, categories, budgets,
    isLoaded, isSyncing, setBudget,
    addRevenue, addExpense, addDebt, 
    updateInstallmentStatus, deleteRevenue, deleteExpense, deleteDebt,
    toggleExpenseStatus, toggleRevenueStatus, refresh: fetchData
  };
};
