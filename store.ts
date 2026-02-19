
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
    totalValue: Number(d.total_value),
    startDate: d.start_date,
    frequency: d.frequency,
    installmentsCount: d.installments_count,
    installmentValue: Number(d.installment_value),
    status: d.status,
    categoryId: d.category_id
  });

  const mapInstallment = (i: any): Installment => ({
    ...i,
    debtId: i.debt_id,
    installmentNumber: i.installment_number,
    dueDate: i.due_date,
    value: Number(i.value)
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
        { data: cats }
      ] = await Promise.all([
        supabase.from('usuarios').select('*'),
        supabase.from('revenues').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('debts').select('*'),
        supabase.from('installments').select('*'),
        supabase.from('categories').select('*').order('name', { ascending: true })
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

    } catch (e) {
      console.error("ERRO CRÍTICO AO CARREGAR DADOS:", e);
    } finally {
      setIsLoaded(true);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addUser = async (nome: string, email: string) => {
    try {
      const { data, error } = await supabase.from('usuarios').insert([{ nome, email }]).select();
      if (error) throw error;
      if (data) setUsers(prev => [...prev, data[0]]);
    } catch (e) {
      console.error("ERRO AO ADICIONAR USUÁRIO:", e);
    }
  };

  const addCategory = async (name: string, type: TransactionType) => {
    const cleanName = name.trim();
    if (!cleanName) return;

    const exists = categories.some(c => c.name.toUpperCase() === cleanName.toUpperCase() && c.type === type);
    if (exists) {
        throw new Error("Categoria já cadastrada.");
    }

    try {
      const { data, error } = await supabase.from('categories').insert([{ name: cleanName, type }]).select();
      if (error) throw error;
      if (data) {
        setCategories(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
        return data[0];
      }
    } catch (e) {
      console.error("ERRO AO ADICIONAR CATEGORIA:", e);
      throw e;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (e) {
      console.error("ERRO AO EXCLUIR CATEGORIA:", e);
      throw e;
    }
  };

  const calculateNextDate = (baseDate: Date, index: number, freq: Frequency) => {
    const d = new Date(baseDate);
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
    if (freq === Frequency.DAILY) d.setDate(d.getDate() + index);
    if (freq === Frequency.WEEKLY) d.setDate(d.getDate() + index * 7);
    if (freq === Frequency.BIWEEKLY) d.setDate(d.getDate() + index * 15);
    if (freq === Frequency.MONTHLY) d.setMonth(d.getMonth() + index);
    if (freq === Frequency.YEARLY) d.setFullYear(d.getFullYear() + index);
    return d.toISOString().split('T')[0];
  };

  const addRevenue = async (rev: Omit<Revenue, 'id'>, repetitions: number = 1): Promise<boolean> => {
    if (!currentUser) return false;
    setIsSyncing(true);
    try {
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
      if (error) throw error;
      if (data) {
        setRevenues(prev => [...prev, ...data.map(mapRevenue)]);
        return true;
      }
      return false;
    } catch (e) {
      console.error("ERRO AO ADICIONAR RECEITA:", e);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const updateRevenue = async (id: string, rev: Partial<Revenue>) => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.from('revenues').update({
        description: rev.description,
        value: rev.value,
        date: rev.date,
        category_id: rev.categoryId,
        status: rev.status
      }).eq('id', id).select();
      
      if (error) throw error;
      if (data && data.length > 0) {
        setRevenues(prev => prev.map(r => r.id === id ? mapRevenue(data[0]) : r));
      }
    } catch (e) {
      console.error("ERRO AO ATUALIZAR RECEITA:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteRevenue = async (id: string) => {
    if (!id) return false;
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('revenues').delete().eq('id', id);
      if (error) throw error;
      setRevenues(prev => prev.filter(r => r.id !== id));
      return true;
    } catch (e) {
      console.error("STORE: FALHA AO EXCLUIR RECEITA:", e);
      throw e;
    } finally {
      setIsSyncing(false);
    }
  };

  const addExpense = async (exp: Omit<SimpleExpense, 'id'>, repetitions: number = 1): Promise<boolean> => {
    if (!currentUser) return false;
    setIsSyncing(true);
    try {
      const newExps = [];
      const baseDate = new Date(exp.dueDate);
      for (let i = 0; i < repetitions; i++) {
        newExps.push({
          user_id: currentUser.id,
          description: exp.description,
          value: exp.value,
          due_date: calculateNextDate(baseDate, i, exp.frequency || Frequency.MONTHLY),
          category_id: exp.categoryId,
          // Fixed: Changed exp.payment_method to exp.paymentMethod to match the interface definition
          payment_method: exp.paymentMethod || 'PIX',
          status: exp.status,
          is_recurrent: exp.isRecurrent,
          frequency: exp.frequency
        });
      }
      const { data, error } = await supabase.from('expenses').insert(newExps).select();
      if (error) throw error;
      if (data) {
        setExpenses(prev => [...prev, ...data.map(mapExpense)]);
        return true;
      }
      return false;
    } catch (e) {
      console.error("ERRO AO ADICIONAR DESPESA:", e);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const updateExpense = async (id: string, exp: Partial<SimpleExpense>) => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.from('expenses').update({
        description: exp.description,
        value: exp.value,
        due_date: exp.dueDate,
        category_id: exp.categoryId,
        status: exp.status
      }).eq('id', id).select();
      
      if (error) throw error;
      if (data && data.length > 0) {
        setExpenses(prev => prev.map(e => e.id === id ? mapExpense(data[0]) : e));
      }
    } catch (e) {
      console.error("ERRO AO ATUALIZAR DESPESA:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!id) return false;
    setIsSyncing(true);
    try {
      const item = expenses.find(e => e.id === id);
      if (item) {
        await supabase.from('transacao_inativas').insert([{
          original_id: item.id,
          user_id: item.userId,
          tipo_original: 'DESPESA',
          description: item.description,
          value: item.value,
          data_referencia: item.dueDate,
          category_id: item.categoryId,
          status_no_momento: item.status,
          is_recurrent: item.isRecurrent,
          frequency: item.frequency,
          payment_method: item.paymentMethod,
          motivo_inativacao: 'Exclusão via App',
          criado_em_original: (item as any).created_at
        }]);
      }
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses(prev => prev.filter(e => e.id !== id));
      return true;
    } catch (e) {
      console.error("STORE: FALHA AO EXCLUIR DESPESA:", e);
      throw e;
    } finally {
      setIsSyncing(false);
    }
  };

  const addDebt = async (debt: Omit<InstallmentDebt, 'id' | 'status' | 'installmentValue'>): Promise<boolean> => {
    if (!currentUser) return false;
    setIsSyncing(true);
    try {
      const installmentValue = debt.totalValue / debt.installmentsCount;
      const { data: debtData, error: debtError } = await supabase.from('debts').insert([{
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

      if (debtError) throw debtError;

      if (debtData) {
          const newDebt = debtData[0];
          // Fix: Use i.installmentNumber instead of i.installment_number since i is of type Installment
          const insts = generateInstallments(newDebt.id, debt.totalValue, debt.installmentsCount, debt.startDate, debt.frequency)
              .map(i => ({ id: i.id, debt_id: i.debtId, installment_number: i.installmentNumber, value: i.value, due_date: i.dueDate, status: i.status }));
          const { data: instData, error: instError } = await supabase.from('installments').insert(insts).select();
          if (instError) throw instError;
          setDebts(prev => [...prev, mapDebt(newDebt)]);
          if (instData) setInstallments(prev => [...prev, ...instData.map(mapInstallment)]);
          return true;
      }
      return false;
    } catch (e) {
      console.error("ERRO AO ATUALIZAR DÍVIDA:", e);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteDebt = async (id: string) => {
    if (!id) return false;
    setIsSyncing(true);
    try {
      const item = debts.find(d => d.id === id);
      if (item) {
        await supabase.from('transacao_inativas').insert([{
          original_id: item.id,
          user_id: item.userId,
          tipo_original: 'PARCELA',
          description: `PLANO: ${item.description}`,
          value: item.totalValue,
          data_referencia: item.startDate,
          category_id: item.categoryId,
          status_no_momento: item.status,
          motivo_inativacao: 'Exclusão de Plano Completo',
          criado_em_original: (item as any).created_at
        }]);
      }
      const { error } = await supabase.from('debts').delete().eq('id', id);
      if (error) throw error;
      setDebts(prev => prev.filter(d => d.id !== id));
      setInstallments(prev => prev.filter(i => i.debtId !== id));
      return true;
    } catch (e) {
      console.error("STORE: FALHA AO EXCLUIR PARCELAMENTO:", e);
      throw e;
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleExpenseStatus = async (id: string) => {
    setIsSyncing(true);
    try {
      const exp = expenses.find(e => e.id === id);
      if (!exp) return;
      const newStatus = exp.status === Status.PAID ? Status.PENDING : Status.PAID;
      const { error } = await supabase.from('expenses').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
    } catch (e) {
      console.error("ERRO AO ALTERNAR STATUS DA DESPESA:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleRevenueStatus = async (id: string) => {
    setIsSyncing(true);
    try {
      const rev = revenues.find(r => r.id === id);
      if (!rev) return;
      const newStatus = rev.status === Status.PAID ? Status.PENDING : Status.PAID;
      const { error } = await supabase.from('revenues').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setRevenues(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    } catch (e) {
      console.error("ERRO AO ALTERNAR STATUS DA RECEITA:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleInstallmentStatus = async (id: string) => {
    setIsSyncing(true);
    try {
      const inst = installments.find(i => i.id === id);
      if (!inst) return;
      const newStatus = inst.status === Status.PAID ? Status.PENDING : Status.PAID;
      const { error } = await supabase.from('installments').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setInstallments(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
    } catch (e) {
      console.error("ERRO AO ALTERNAR STATUS DA PARCELA:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    users, currentUser, setCurrentUser, addUser,
    revenues, expenses, debts, installments, categories, budgets,
    isLoaded, isSyncing,
    addRevenue, updateRevenue, deleteRevenue,
    addExpense, updateExpense, deleteExpense,
    addDebt, deleteDebt, toggleExpenseStatus, toggleRevenueStatus, toggleInstallmentStatus,
    addCategory, deleteCategory, refresh: fetchData
  };
};
