
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

  // Auxiliar para converter nomes de campos do Banco para o Frontend
  const mapRevenue = (r: any): Revenue => ({
    ...r,
    userId: r.user_id,
    categoryId: r.category_id,
    isRecurrent: r.is_recurrent
  });

  const mapExpense = (e: any): SimpleExpense => ({
    ...e,
    userId: e.user_id,
    dueDate: e.due_date,
    categoryId: e.category_id,
    paymentMethod: e.payment_method,
    isRecurrent: e.is_recurrent
  });

  const mapDebt = (d: any): InstallmentDebt => ({
    ...d,
    userId: d.user_id,
    totalValue: d.total_value,
    startDate: d.start_date,
    installmentsCount: d.installments_count,
    installmentValue: d.installment_value,
    categoryId: d.category_id
  });

  const mapInstallment = (i: any): Installment => ({
    ...i,
    debtId: i.debt_id,
    installmentNumber: i.installment_number,
    dueDate: i.due_date
  });

  const mapBudget = (b: any): Budget => ({
    ...b,
    userId: b.user_id,
    categoryId: b.category_id,
    limitValue: b.limit_value
  });

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
      
      if (revs) setRevenues(revs.map(mapRevenue));
      if (exps) setExpenses(exps.map(mapExpense));
      if (dbtList) setDebts(dbtList.map(mapDebt));
      if (instList) setInstallments(instList.map(mapInstallment));
      if (cats) setCategories(cats);
      if (budList) setBudgets(budList.map(mapBudget));

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
    const { data, error } = await supabase.from('usuarios').insert([{ nome, email }]).select();
    if (error) console.error("Erro ao adicionar usuário:", error);
    if (data) {
      setUsers(prev => [...prev, data[0]]);
      if (!currentUser) setCurrentUser(data[0]);
    }
  };

  const calculateNextDate = (baseDate: Date, index: number, freq: Frequency) => {
    const d = new Date(baseDate);
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset()); // Ajuste de fuso horário
    if (freq === Frequency.DAILY) d.setDate(d.getDate() + index);
    if (freq === Frequency.WEEKLY) d.setDate(d.getDate() + index * 7);
    if (freq === Frequency.BIWEEKLY) d.setDate(d.getDate() + index * 15);
    if (freq === Frequency.MONTHLY) d.setMonth(d.getMonth() + index);
    if (freq === Frequency.YEARLY) d.setFullYear(d.getFullYear() + index);
    return d.toISOString().split('T')[0];
  };

  const addRevenue = async (rev: Omit<Revenue, 'id'>, repetitions: number = 1) => {
    if (!currentUser) { alert("Selecione um membro antes!"); return; }
    setIsSyncing(true);
    const newRevs = [];
    const baseDate = new Date(rev.date);
    
    for (let i = 0; i < repetitions; i++) {
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

    const { data, error } = await supabase.from('revenues').insert(newRevs).select();
    if (error) console.error("Erro ao inserir receita:", error);
    if (data) setRevenues(prev => [...prev, ...data.map(mapRevenue)]);
    setIsSyncing(false);
  };

  const addExpense = async (exp: Omit<SimpleExpense, 'id'>, repetitions: number = 1) => {
    if (!currentUser) { alert("Selecione um membro antes!"); return; }
    setIsSyncing(true);
    const newExps = [];
    const baseDate = new Date(exp.dueDate);

    for (let i = 0; i < repetitions; i++) {
      newExps.push({
        user_id: currentUser.id,
        description: exp.description,
        value: exp.value,
        due_date: calculateNextDate(baseDate, i, exp.frequency || Frequency.MONTHLY),
        category_id: exp.categoryId,
        payment_method: exp.paymentMethod || 'PIX',
        status: exp.status,
        is_recurrent: exp.isRecurrent,
        frequency: exp.frequency
      });
    }

    const { data, error } = await supabase.from('expenses').insert(newExps).select();
    if (error) console.error("Erro ao inserir despesa:", error);
    if (data) setExpenses(prev => [...prev, ...data.map(mapExpense)]);
    setIsSyncing(false);
  };

  const addDebt = async (debt: Omit<InstallmentDebt, 'id' | 'status' | 'installmentValue'>) => {
    if (!currentUser) { alert("Selecione um membro antes!"); return; }
    setIsSyncing(true);
    const installmentValue = debt.totalValue / debt.installmentsCount;
    
    const { data: debtData, error: dError } = await supabase.from('debts').insert([{
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

    if (dError) console.error("Erro ao criar dívida:", dError);

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

        const { data: instData, error: iError } = await supabase.from('installments').insert(insts).select();
        if (iError) console.error("Erro ao criar parcelas:", iError);
        
        setDebts(prev => [...prev, mapDebt(newDebt)]);
        if (instData) {
            setInstallments(prev => [...prev, ...instData.map(mapInstallment)]);
        }
    }
    setIsSyncing(false);
  };

  const setBudget = async (categoryId: string, limitValue: number, month: number, year: number) => {
    if (!currentUser) return;
    setIsSyncing(true);
    
    const existing = budgets.find(b => b.categoryId === categoryId && b.month === month && b.year === year && b.userId === currentUser.id);
    
    if (existing) {
        const { data } = await supabase.from('budgets').update({ limit_value: limitValue }).eq('id', existing.id).select();
        if (data) setBudgets(prev => prev.map(b => b.id === existing.id ? mapBudget(data[0]) : b));
    } else {
        const { data } = await supabase.from('budgets').insert([{
            user_id: currentUser.id,
            category_id: categoryId,
            limit_value: limitValue,
            month,
            year
        }]).select();
        if (data) setBudgets(prev => [...prev, mapBudget(data[0])]);
    }
    setIsSyncing(false);
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
    toggleExpenseStatus, toggleRevenueStatus, refresh: fetchData
  };
};
