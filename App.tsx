
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import { useFinanceStore } from './store';
import ResumoCard from './components/SummaryCards';
import { formatCurrency, getMonthYear } from './utils';
import { Status, TransactionType, Frequency, Revenue, SimpleExpense } from './types';

// Hook para Lazy Loading
function useLazyList(items: any[], pageSize: number = 15) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  
  // Resetar contagem se a lista mudar (ex: mudar de mês)
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items.length]);

  const loadMore = () => {
    if (visibleCount < items.length) {
      setVisibleCount(prev => prev + pageSize);
    }
  };

  return {
    visibleItems: items.slice(0, visibleCount),
    hasMore: visibleCount < items.length,
    loadMore
  };
}

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
          <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-[#64748B] hover:bg-[#F8FAFC] transition-colors">✕</button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto hide-scrollbar">{children}</div>
      </div>
    </div>
  );
};

const Toggle = ({ enabled, onChange, activeColorClass }: { enabled: boolean, onChange: (val: boolean) => void, activeColorClass: string }) => {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(!enabled); }}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enabled ? activeColorClass : 'bg-[#E2E8F0]'}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showFabMenu, setShowFabMenu] = useState(false);
  
  const { 
    revenues, expenses, debts, installments, categories, isLoaded, isSyncing,
    users, currentUser, setCurrentUser, addUser,
    addRevenue, updateRevenue, deleteRevenue,
    addExpense, updateExpense, deleteExpense,
    addDebt, deleteDebt, toggleExpenseStatus, toggleRevenueStatus,
    addCategory, deleteCategory
  } = useFinanceStore();

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'users' | 'categories'>('users');
  const [showRevForm, setShowRevForm] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);
  const [quickCategoryType, setQuickCategoryType] = useState<TransactionType>(TransactionType.REVENUE);
  const [categoryInput, setCategoryInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<string | null>(null);

  // Estados de Recorrência para Receita
  const [isRevRecurrent, setIsRevRecurrent] = useState(false);
  const [revFrequency, setRevFrequency] = useState<Frequency>(Frequency.MONTHLY);
  const [revRecurrenceCount, setRevRecurrenceCount] = useState(12);

  // Estados de Recorrência para Despesa
  const [isExpRecurrent, setIsExpRecurrent] = useState(false);
  const [expFrequency, setExpFrequency] = useState<Frequency>(Frequency.MONTHLY);
  const [expRecurrenceCount, setRevRecurrenceCountExp] = useState(12);
  const [isExpInstallment, setIsExpInstallment] = useState(false);

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const filteredData = useMemo(() => {
    const monthStr = `${selectedMonth + 1}-${selectedYear}`;
    const userRevenues = revenues.filter(r => r.userId === currentUser?.id);
    const userExpenses = expenses.filter(e => e.userId === currentUser?.id);

    const monthlyRevenues = userRevenues
      .filter(r => getMonthYear(r.date) === monthStr)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const monthlyExpenses = userExpenses
      .filter(e => getMonthYear(e.dueDate) === monthStr)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const monthlyInstallments = installments
      .filter(i => {
          const d = debts.find(d => d.id === i.debtId);
          return d?.userId === currentUser?.id && getMonthYear(i.dueDate) === monthStr;
      })
      .map(i => ({
          ...i,
          description: debts.find(d => d.id === i.debtId)?.description || 'Parcela'
      }))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const totalRevenue = monthlyRevenues.reduce((acc, r) => acc + r.value, 0);
    const receivedRevenue = monthlyRevenues.filter(r => r.status === Status.PAID).reduce((acc, r) => acc + r.value, 0);
    const totalExpense = monthlyExpenses.reduce((acc, e) => acc + e.value, 0) + monthlyInstallments.reduce((acc, i) => acc + i.value, 0);
    const totalPaid = monthlyExpenses.filter(e => e.status === Status.PAID).reduce((acc, e) => acc + e.value, 0) + monthlyInstallments.filter(i => i.status === Status.PAID).reduce((acc, i) => acc + i.value, 0);

    const recent = [
        ...monthlyRevenues.map(r => ({ ...r, type: 'revenue', sortDate: r.date })),
        ...monthlyExpenses.map(e => ({ ...e, type: 'expense', sortDate: e.dueDate })),
        ...monthlyInstallments.map(i => ({ ...i, type: 'installment', sortDate: i.dueDate }))
    ].sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()).slice(0, 15);

    return {
      totalRevenue, receivedRevenue, totalExpense, totalPaid,
      finalBalance: totalRevenue - totalExpense,
      monthlyRevenues, monthlyExpenses, monthlyInstallments, recent
    };
  }, [revenues, expenses, installments, sortedCategories, debts, currentUser, selectedMonth, selectedYear]);

  // Lazy Loading Hooks
  const revLazy = useLazyList(filteredData.monthlyRevenues);
  const expLazy = useLazyList([...filteredData.monthlyExpenses, ...filteredData.monthlyInstallments].sort((a, b) => new Date(a.dueDate || a.sortDate).getTime() - new Date(b.dueDate || b.sortDate).getTime()));

  const handleOpenFabForm = (type: 'revenue' | 'expense') => {
      if (!currentUser) {
          alert("Selecione um perfil familiar antes de adicionar lançamentos.");
          setShowSettingsModal(true);
          return;
      }
      if (type === 'revenue') setShowRevForm(true);
      else setShowExpForm(true);
      setShowFabMenu(false);
  };

  const MinimalHeader = (
    <div className="flex-1 flex items-center justify-between px-6 md:px-10 h-16">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => { if(selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y-1); } else setSelectedMonth(m => m-1); }} 
          className="w-8 h-8 flex items-center justify-center text-[#64748B] hover:text-[#0F172A] transition-colors text-xl"
        >‹</button>
        <div className="flex flex-col items-center">
            <span className="text-[14px] font-semibold text-[#0F172A] tracking-wide flex items-center gap-2">
              {months[selectedMonth]} {selectedYear}
              {(isSyncing || isDeleting) && <div className="w-2 h-2 bg-[#2563EB] rounded-full animate-ping"></div>}
            </span>
        </div>
        <button 
          onClick={() => { if(selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y+1); } else setSelectedMonth(m => m+1); }} 
          className="w-8 h-8 flex items-center justify-center text-[#64748B] hover:text-[#0F172A] transition-colors text-xl"
        >›</button>
      </div>
      <button onClick={() => setShowSettingsModal(true)} className="flex items-center gap-2 group">
          <span className="hidden sm:inline text-xs font-bold text-[#64748B] group-hover:text-[#0F172A] transition-colors uppercase">
            {currentUser?.nome || 'ENTRAR'}
          </span>
          <div className="w-8 h-8 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-xs font-bold text-[#64748B] group-hover:bg-[#2563EB]/10 group-hover:text-[#2563EB] transition-all">
              {currentUser?.nome?.[0]?.toUpperCase() || '?'}
          </div>
      </button>
    </div>
  );

  const openEdit = (item: any) => {
    setIsConfirmingDelete(false);
    if (item.type === 'installment') {
        const parentDebt = debts.find(d => d.id === item.debtId);
        if (parentDebt) {
            setEditingItem({ ...parentDebt, type: 'debt' });
            setShowEditModal(true);
        }
        return;
    }
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleFinalDelete = async () => {
    if (!editingItem || !editingItem.id) return;
    setIsDeleting(true);
    try {
      let success = false;
      if (editingItem.type === 'revenue') {
        success = await deleteRevenue(editingItem.id);
      } else if (editingItem.type === 'expense') {
        success = await deleteExpense(editingItem.id);
      } else if (editingItem.type === 'debt') {
        success = await deleteDebt(editingItem.id);
      }
      if (success) {
        setShowEditModal(false);
        setEditingItem(null);
        setIsConfirmingDelete(false);
      }
    } catch (err: any) {
      alert(`Falha ao excluir registro: ${err.message || 'Verifique sua conexão.'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddQuickCategory = async () => {
    if (!categoryInput.trim()) return;
    try {
        await addCategory(categoryInput, quickCategoryType);
        setCategoryInput('');
        setShowQuickCategoryModal(false);
    } catch (e: any) {
        alert(e.message);
    }
  };

  const handleCategoryDelete = async (id: string) => {
      setIsDeleting(true);
      try {
          await deleteCategory(id);
          setConfirmDeleteCategoryId(null);
      } catch (err: any) {
          alert("Não foi possível excluir esta categoria. Verifique se existem transações vinculadas a ela.");
      } finally {
          setIsDeleting(false);
      }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center animate-in fade-in duration-700">
        <div className="relative mb-8">
            <div className="w-20 h-20 bg-[#2563EB] rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-2xl animate-pulse">G</div>
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-[#16A34A] rounded-full border-4 border-white animate-bounce"></div>
        </div>
        <h1 className="text-sm font-bold tracking-[0.2em] text-[#0F172A] uppercase mb-2">CONTROLAGRANA</h1>
        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest animate-pulse">Sincronizando finanças...</p>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} headerContent={MinimalHeader} headerClassName="bg-white border-b border-[#E2E8F0]">
      
      {currentUser && (
        <div className="fixed bottom-24 md:bottom-12 right-6 md:right-12 z-[90]">
           {showFabMenu && (
             <div className="absolute bottom-20 right-0 flex flex-col items-end gap-3 animate-in slide-in-from-bottom-4 duration-200">
                <button 
                    onClick={() => handleOpenFabForm('revenue')}
                    className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl shadow-lg border border-[#E2E8F0] text-[#16A34A] font-bold text-sm hover:bg-[#F8FAFC] transition-all uppercase"
                >
                    RECEITA <span>+</span>
                </button>
                <button 
                    onClick={() => { setIsExpInstallment(false); handleOpenFabForm('expense'); }}
                    className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl shadow-lg border border-[#E2E8F0] text-[#DC2626] font-bold text-sm hover:bg-[#F8FAFC] transition-all uppercase"
                >
                    DESPESA <span>-</span>
                </button>
             </div>
           )}
           <button 
            onClick={() => setShowFabMenu(!showFabMenu)}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl text-white shadow-xl transition-all duration-300 ${showFabMenu ? 'bg-[#0F172A] rotate-45' : 'bg-[#2563EB] hover:bg-[#1d4ed8] active:scale-95'}`}
           >
            +
           </button>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
          {!currentUser && (
            <div className="bg-white p-10 rounded-2xl border border-[#E2E8F0] text-center shadow-sm">
               <p className="text-sm font-bold text-[#64748B] uppercase tracking-wide">SELECIONE UM PERFIL PARA VISUALIZAR SEUS DADOS.</p>
               <button onClick={() => setShowSettingsModal(true)} className="mt-4 bg-[#2563EB] text-white px-6 py-2 rounded-xl font-bold text-xs uppercase">SELECIONAR PERFIL</button>
            </div>
          )}
          
          <ResumoCard 
            title="SALDO TOTAL" 
            isHero
            totalValue={filteredData.finalBalance} 
            subValues={[
                { label: 'TOTAL RECEITAS', value: filteredData.totalRevenue },
                { label: 'TOTAL DESPESAS', value: filteredData.totalExpense }
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ResumoCard 
              title="RECEITAS" 
              totalValue={filteredData.receivedRevenue} 
              accentColor="text-[#16A34A]" 
              headerAction={
                <button 
                  onClick={() => handleOpenFabForm('revenue')}
                  className="w-8 h-8 rounded-lg bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center font-bold text-xl hover:bg-[#16A34A]/20 transition-all active:scale-90"
                >
                  +
                </button>
              }
            />
            <ResumoCard 
              title="DESPESAS" 
              totalValue={filteredData.totalPaid} 
              accentColor="text-[#DC2626]" 
              headerAction={
                <button 
                  onClick={() => handleOpenFabForm('expense')}
                  className="w-8 h-8 rounded-lg bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center font-bold text-xl hover:bg-[#DC2626]/20 transition-all active:scale-90"
                >
                  +
                </button>
              }
            />
          </div>

          <div className="pt-4">
             <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest">ÚLTIMAS TRANSAÇÕES</h3>
                <button onClick={() => setActiveTab('transactions')} className="text-[10px] font-bold text-[#2563EB] hover:underline uppercase tracking-widest">VER TODAS</button>
             </div>
             
             <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
                {filteredData.recent.length === 0 ? (
                    <div className="p-12 text-center text-xs font-bold text-[#64748B] uppercase tracking-widest">NENHUMA TRANSAÇÃO RECENTE.</div>
                ) : (
                    <div className="divide-y divide-[#E2E8F0]">
                        {filteredData.recent.map((item: any, idx) => (
                            <div key={idx} onClick={() => openEdit(item)} className="flex items-center justify-between p-5 hover:bg-[#F8FAFC] transition-colors cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${item.type === 'revenue' ? 'bg-[#16A34A]/10 text-[#16A34A]' : (item.type === 'expense' || item.type === 'installment') ? 'bg-[#DC2626]/10 text-[#DC2626]' : 'bg-[#64748B]/10 text-[#64748B]'}`}>
                                        {item.type === 'revenue' ? '↑' : (item.type === 'expense' || item.type === 'installment') ? '↓' : '≡'}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors uppercase">{item.description}</span>
                                        <span className="text-[10px] font-medium text-[#64748B] uppercase">{new Date(item.sortDate).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`text-sm font-bold ${item.type === 'revenue' ? 'text-[#16A34A]' : 'text-[#0F172A]'}`}>
                                      {item.type === 'revenue' ? '+' : '-'}{formatCurrency(item.value)}
                                  </span>
                                  <span className="text-[#64748B] opacity-0 group-hover:opacity-100 transition-opacity">›</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto pb-10 px-1">
          {/* LISTA DE RECEITAS COM LAZY LOADING */}
          <div className="space-y-4">
             <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest">RECEITAS</h3>
                <span className="text-[9px] font-bold text-[#16A34A] bg-[#16A34A]/10 px-2.5 py-1 rounded-full tracking-widest uppercase">{filteredData.monthlyRevenues.length} LANÇAMENTOS</span>
             </div>
             <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm divide-y divide-[#E2E8F0]">
                 {revLazy.visibleItems.map(rev => (
                   <div key={rev.id} onClick={() => openEdit({...rev, type: 'revenue'})} className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors cursor-pointer group border-l-4 border-transparent hover:border-l-[#16A34A]">
                      <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                         <div className="flex flex-col items-center justify-center min-w-[42px] h-[42px] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                            <span className="text-[10px] font-bold text-[#64748B] uppercase leading-none mb-0.5">{new Date(rev.date).toLocaleDateString('pt-BR', {month: 'short'}).replace('.', '')}</span>
                            <span className="text-sm font-bold text-[#0F172A] leading-none">{new Date(rev.date).getDate()}</span>
                         </div>
                         <div className="flex flex-col truncate pr-2">
                            <span className="text-sm font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors uppercase truncate">{rev.description}</span>
                            <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest">
                                {sortedCategories.find(c => c.id === rev.categoryId)?.name || 'OUTROS'}
                            </span>
                         </div>
                      </div>
                      <div className="flex items-center gap-4 sm:gap-6 ml-2 shrink-0">
                         <span className="text-sm font-bold text-[#16A34A] whitespace-nowrap">{formatCurrency(rev.value)}</span>
                         <button 
                            onClick={(e) => { e.stopPropagation(); toggleRevenueStatus(rev.id); }}
                            className={`relative w-10 h-6 rounded-full transition-all duration-300 flex items-center px-1 shadow-inner ${rev.status === Status.PAID ? 'bg-[#16A34A]' : 'bg-[#E2E8F0]'}`}
                         >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${rev.status === Status.PAID ? 'translate-x-4' : 'translate-x-0'}`}></div>
                         </button>
                      </div>
                   </div>
                 ))}
                 {revLazy.hasMore && (
                   <button onClick={revLazy.loadMore} className="w-full py-4 text-[10px] font-bold text-[#2563EB] uppercase tracking-widest hover:bg-[#F8FAFC] transition-colors">CARREGAR MAIS RECEITAS ↓</button>
                 )}
                 {filteredData.monthlyRevenues.length === 0 && <div className="p-12 text-center text-xs font-bold text-[#64748B] uppercase tracking-widest">SEM RECEITAS NESTE PERÍODO.</div>}
             </div>
          </div>

          {/* LISTA DE DESPESAS COM LAZY LOADING */}
          <div className="space-y-4">
             <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest">DESPESAS</h3>
                <span className="text-[9px] font-bold text-[#DC2626] bg-[#DC2626]/10 px-2.5 py-1 rounded-full tracking-widest uppercase">{filteredData.monthlyExpenses.length + filteredData.monthlyInstallments.length} LANÇAMENTOS</span>
             </div>
             <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm divide-y divide-[#E2E8F0]">
                 {expLazy.visibleItems.map(item => {
                   const isInst = !!item.installmentNumber;
                   return (
                    <div key={item.id} onClick={() => openEdit({...item, type: isInst ? 'installment' : 'expense'})} className={`p-4 sm:p-5 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors cursor-pointer group border-l-4 border-transparent ${isInst ? 'hover:border-l-[#2563EB]' : 'hover:border-l-[#DC2626]'}`}>
                        <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                            <div className="flex flex-col items-center justify-center min-w-[42px] h-[42px] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                                <span className="text-[10px] font-bold text-[#64748B] uppercase leading-none mb-0.5">{new Date(item.dueDate || item.sortDate).toLocaleDateString('pt-BR', {month: 'short'}).replace('.', '')}</span>
                                <span className="text-sm font-bold text-[#0F172A] leading-none">{new Date(item.dueDate || item.sortDate).getDate()}</span>
                            </div>
                            <div className="flex flex-col truncate pr-2">
                                <span className="text-sm font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors uppercase truncate">{item.description}</span>
                                <span className={`text-[9px] font-bold uppercase tracking-widest ${isInst ? 'text-[#2563EB]' : 'text-[#64748B]'}`}>
                                    {isInst ? `PARCELA ${item.installmentNumber}` : (sortedCategories.find(c => c.id === item.categoryId)?.name || 'DESPESA')}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 sm:gap-6 ml-2 shrink-0">
                            <span className="text-sm font-bold text-[#0F172A] whitespace-nowrap">{formatCurrency(item.value)}</span>
                            {isInst ? (
                                <div className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${item.status === Status.PAID ? 'bg-[#64748B]' : 'bg-[#E2E8F0]'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${item.status === Status.PAID ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </div>
                            ) : (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); toggleExpenseStatus(item.id); }}
                                    className={`relative w-10 h-6 rounded-full transition-all duration-300 flex items-center px-1 shadow-inner ${item.status === Status.PAID ? 'bg-[#DC2626]' : 'bg-[#E2E8F0]'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${item.status === Status.PAID ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </button>
                            )}
                        </div>
                    </div>
                 )})}
                 {expLazy.hasMore && (
                   <button onClick={expLazy.loadMore} className="w-full py-4 text-[10px] font-bold text-[#2563EB] uppercase tracking-widest hover:bg-[#F8FAFC] transition-colors">CARREGAR MAIS DESPESAS ↓</button>
                 )}
                 {filteredData.monthlyExpenses.length === 0 && filteredData.monthlyInstallments.length === 0 && 
                    <div className="p-12 text-center text-xs font-bold text-[#64748B] uppercase tracking-widest">SEM DESPESAS NESTE PERÍODO.</div>
                 }
             </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOVA RECEITA COM FREQUÊNCIA E RECORRENTE FLEXÍVEL */}
      <Modal isOpen={showRevForm} onClose={() => setShowRevForm(false)} title="NOVA RECEITA">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const catId = String(fd.get('category'));
          
          if (!catId) {
              alert("Por favor, selecione uma categoria.");
              return;
          }

          const revenueData = {
            description: String(fd.get('desc')),
            value: Number(fd.get('value')),
            date: String(fd.get('date')),
            categoryId: catId,
            status: Status.PENDING,
            isRecurrent: isRevRecurrent,
            frequency: isRevRecurrent ? revFrequency : undefined
          };

          const success = await addRevenue(revenueData, isRevRecurrent ? revRecurrenceCount : 1);
          if (success) setShowRevForm(false);
        }} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">DESCRIÇÃO</label>
            <input name="desc" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all uppercase" placeholder="EX: SALÁRIO" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">VALOR (R$)</label>
                <input name="value" type="number" step="0.01" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">DATA INICIAL</label>
                <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
                <label className="text-xs font-bold text-[#64748B] uppercase">CATEGORIA</label>
                <button type="button" onClick={() => { setQuickCategoryType(TransactionType.REVENUE); setShowQuickCategoryModal(true); }} className="w-5 h-5 rounded-full bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold text-lg leading-none hover:bg-[#2563EB]/20 transition-all">+</button>
            </div>
            <select name="category" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all uppercase">
                <option value="">SELECIONE...</option>
                {sortedCategories.filter(c => c.type === TransactionType.REVENUE).map(c => (
                    <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                ))}
            </select>
          </div>
          
          <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">RECORRENTE</span>
                <Toggle enabled={isRevRecurrent} onChange={setIsRevRecurrent} activeColorClass="bg-[#16A34A]" />
              </div>
              
              {isRevRecurrent && (
                <div className="animate-in slide-in-from-top-2 duration-200 space-y-3">
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-[#64748B] uppercase">FREQUÊNCIA</label>
                            <select 
                                value={revFrequency} 
                                onChange={(e) => setRevFrequency(e.target.value as Frequency)}
                                className="bg-white border border-[#E2E8F0] rounded-lg p-2 text-xs font-bold outline-none focus:border-[#2563EB] uppercase"
                            >
                                <option value={Frequency.DAILY}>DIÁRIA</option>
                                <option value={Frequency.WEEKLY}>SEMANAL</option>
                                <option value={Frequency.BIWEEKLY}>QUINZENAL</option>
                                <option value={Frequency.MONTHLY}>MENSAL</option>
                                <option value={Frequency.YEARLY}>ANUAL</option>
                            </select>
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-[#64748B] uppercase">QUANTIDADE</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="120"
                                value={revRecurrenceCount} 
                                onChange={(e) => setRevRecurrenceCount(Number(e.target.value))}
                                className="w-20 bg-white border border-[#E2E8F0] rounded-lg p-2 text-center text-sm font-bold outline-none focus:border-[#2563EB]" 
                            />
                        </div>
                    </div>
                </div>
              )}
          </div>

          <button type="submit" disabled={isSyncing} className="w-full bg-[#2563EB] text-white p-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-md hover:bg-[#1d4ed8] transition-all active:scale-[0.98] disabled:opacity-50">
              {isSyncing ? "SALVANDO..." : "SALVAR RECEITA"}
          </button>
        </form>
      </Modal>

      {/* MODAL DE NOVA DESPESA COM FREQUÊNCIA E RECORRENTE FLEXÍVEL */}
      <Modal isOpen={showExpForm} onClose={() => setShowExpForm(false)} title="NOVA DESPESA">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const catId = String(fd.get('category'));
          
          if (!catId) {
              alert("Por favor, selecione uma categoria.");
              return;
          }

          let success = false;
          if (isExpInstallment) {
            success = await addDebt({
              description: String(fd.get('desc')),
              totalValue: Number(fd.get('totalValue')),
              startDate: String(fd.get('startDate')),
              frequency: Frequency.MONTHLY,
              installmentsCount: Number(fd.get('installmentsCount')),
              categoryId: catId
            });
          } else {
            success = await addExpense({
              description: String(fd.get('desc')),
              value: Number(fd.get('value')),
              dueDate: String(fd.get('dueDate')),
              categoryId: catId,
              paymentMethod: 'PIX',
              status: Status.PENDING,
              isRecurrent: isExpRecurrent,
              frequency: isExpRecurrent ? expFrequency : undefined
            }, isExpRecurrent ? expRecurrenceCount : 1);
          }
          if (success) setShowExpForm(false);
        }} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">DESCRIÇÃO</label>
            <input name="desc" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all uppercase" />
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">PARCELAR</span>
                  <Toggle enabled={isExpInstallment} onChange={(val) => { setIsExpInstallment(val); if(val) setIsExpRecurrent(false); }} activeColorClass="bg-[#2563EB]" />
              </div>
              {!isExpInstallment && (
                  <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">RECORRENTE</span>
                      <Toggle enabled={isExpRecurrent} onChange={setIsExpRecurrent} activeColorClass="bg-[#DC2626]" />
                  </div>
              )}
          </div>

          {isExpRecurrent && (
            <div className="animate-in slide-in-from-top-2 duration-200 space-y-3">
                <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#64748B] uppercase">FREQUÊNCIA</label>
                        <select 
                            value={expFrequency} 
                            onChange={(e) => setExpFrequency(e.target.value as Frequency)}
                            className="bg-white border border-[#E2E8F0] rounded-lg p-2 text-xs font-bold outline-none focus:border-[#2563EB] uppercase"
                        >
                            <option value={Frequency.DAILY}>DIÁRIA</option>
                            <option value={Frequency.WEEKLY}>SEMANAL</option>
                            <option value={Frequency.BIWEEKLY}>QUINZENAL</option>
                            <option value={Frequency.MONTHLY}>MENSAL</option>
                            <option value={Frequency.YEARLY}>ANUAL</option>
                        </select>
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#64748B] uppercase">QUANTIDADE</label>
                        <input 
                            type="number" 
                            min="1" 
                            max="120"
                            value={expRecurrenceCount} 
                            onChange={(e) => setRevRecurrenceCountExp(Number(e.target.value))}
                            className="w-20 bg-white border border-[#E2E8F0] rounded-lg p-2 text-center text-sm font-bold outline-none focus:border-[#2563EB]" 
                        />
                    </div>
                </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">{isExpInstallment ? "VALOR TOTAL" : "VALOR"}</label>
                <input name={isExpInstallment ? "totalValue" : "value"} type="number" step="0.01" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" />
            </div>
            {isExpInstallment ? (
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">PARCELAS</label>
                    <input name="installmentsCount" type="number" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" />
                </div>
            ) : (
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">VENCIMENTO</label>
                    <input name="dueDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" />
                </div>
            )}
          </div>
          {isExpInstallment && (
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">PRIMEIRA PARCELA</label>
                <input name="startDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" />
            </div>
          )}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
                <label className="text-xs font-bold text-[#64748B] uppercase">CATEGORIA</label>
                <button type="button" onClick={() => { setQuickCategoryType(TransactionType.EXPENSE); setShowQuickCategoryModal(true); }} className="w-5 h-5 rounded-full bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold text-lg leading-none hover:bg-[#2563EB]/20 transition-all">+</button>
            </div>
            <select name="category" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all uppercase">
                <option value="">SELECIONE...</option>
                {sortedCategories.filter(c => c.type === TransactionType.EXPENSE).map(c => (
                    <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                ))}
            </select>
          </div>
          <button type="submit" disabled={isSyncing} className="w-full bg-[#0F172A] text-white p-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-md hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50">
              {isSyncing ? "SALVANDO..." : "SALVAR DESPESA"}
          </button>
        </form>
      </Modal>

      {/* MODAL CONFIGURAÇÕES (MANTIDO) */}
      <Modal isOpen={showSettingsModal} onClose={() => { setShowSettingsModal(false); setConfirmDeleteCategoryId(null); }} title="CONFIGURAÇÕES">
          <div className="flex border-b border-[#E2E8F0] mb-6">
              <button onClick={() => setSettingsTab('users')} className={`flex-1 py-3 text-[10px] font-bold tracking-widest transition-all ${settingsTab === 'users' ? 'text-[#2563EB] border-b-2 border-[#2563EB]' : 'text-[#64748B]'}`}>PERFIS FAMILIARES</button>
              <button onClick={() => setSettingsTab('categories')} className={`flex-1 py-3 text-[10px] font-bold tracking-widest transition-all ${settingsTab === 'categories' ? 'text-[#2563EB] border-b-2 border-[#2563EB]' : 'text-[#64748B]'}`}>CATEGORIAS</button>
          </div>
          {settingsTab === 'users' ? (
              <div className="space-y-4">
                  {users.map(u => (
                      <button key={u.id} onClick={() => { setCurrentUser(u); setShowSettingsModal(false); }} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${currentUser?.id === u.id ? 'border-[#2563EB] bg-[#2563EB]/5 shadow-sm' : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'}`}>
                          <div className="flex items-center gap-4 text-left">
                              <div className="w-9 h-9 bg-white border border-[#E2E8F0] rounded-full flex items-center justify-center font-bold text-sm text-[#64748B]">{u.nome?.[0]?.toUpperCase()}</div>
                              <div className="flex flex-col">
                                  <span className="text-sm font-bold text-[#0F172A] uppercase">{u.nome}</span>
                                  <span className="text-[10px] font-medium text-[#64748B]">{u.email}</span>
                              </div>
                          </div>
                      </button>
                  ))}
                  <form onSubmit={async (e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      await addUser(String(fd.get('nome')), String(fd.get('email')));
                      e.currentTarget.reset();
                  }} className="space-y-3 pt-4 border-t border-[#E2E8F0]">
                      <input name="nome" placeholder="NOME DO MEMBRO" required className="w-full bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl outline-none text-sm uppercase" />
                      <input name="email" type="email" placeholder="E-MAIL" required className="w-full bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl outline-none text-sm uppercase" />
                      <button type="submit" className="w-full bg-[#2563EB] text-white p-4 rounded-xl font-bold text-sm uppercase tracking-wider">NOVO PERFIL</button>
                  </form>
              </div>
          ) : (
              <div className="space-y-4">
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 hide-scrollbar">
                    {sortedCategories.map(c => (
                        <div key={c.id} className="w-full flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] transition-all group overflow-hidden">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-[#0F172A] uppercase">{c.name}</span>
                                <span className={`text-[8px] font-black tracking-widest uppercase ${c.type === TransactionType.REVENUE ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>{c.type === TransactionType.REVENUE ? 'RECEITA' : 'DESPESA'}</span>
                            </div>
                            <button onClick={() => handleCategoryDelete(c.id)} className="w-7 h-7 flex items-center justify-center rounded-full text-[#64748B] hover:text-[#DC2626] hover:bg-[#DC2626]/10 transition-all opacity-0 group-hover:opacity-100">✕</button>
                        </div>
                    ))}
                  </div>
                  <form onSubmit={async (e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      try {
                          await addCategory(String(fd.get('name')), fd.get('type') as TransactionType);
                          e.currentTarget.reset();
                      } catch (err: any) { alert(err.message); }
                  }} className="space-y-3 pt-4 border-t border-[#E2E8F0]">
                      <input name="name" placeholder="NOME DA CATEGORIA" required className="w-full bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl outline-none text-sm uppercase" />
                      <div className="grid grid-cols-2 gap-3">
                          <label className="relative flex items-center justify-center p-3 rounded-xl border border-[#E2E8F0] cursor-pointer has-[:checked]:border-[#2563EB] has-[:checked]:bg-[#2563EB]/5">
                              <input type="radio" name="type" value={TransactionType.REVENUE} required className="sr-only" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">RECEITA</span>
                          </label>
                          <label className="relative flex items-center justify-center p-3 rounded-xl border border-[#E2E8F0] cursor-pointer has-[:checked]:border-[#2563EB] has-[:checked]:bg-[#2563EB]/5">
                              <input type="radio" name="type" value={TransactionType.EXPENSE} required className="sr-only" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">DESPESA</span>
                          </label>
                      </div>
                      <button type="submit" className="w-full bg-[#0F172A] text-white p-4 rounded-xl font-bold text-sm uppercase tracking-wider">NOVA CATEGORIA</button>
                  </form>
              </div>
          )}
      </Modal>

      {/* MODAL EDIÇÃO (MANTIDO) */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="EDITAR REGISTRO">
          <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const updateData = {
                  description: String(fd.get('desc')),
                  value: Number(fd.get('value')),
                  [editingItem?.type === 'revenue' ? 'date' : 'dueDate']: String(fd.get('date')),
                  categoryId: String(fd.get('category')),
              };
              if (editingItem?.type === 'revenue') await updateRevenue(editingItem.id, updateData as Partial<Revenue>);
              else await updateExpense(editingItem.id, updateData as Partial<SimpleExpense>);
              setShowEditModal(false);
          }} className="space-y-6">
              <input name="desc" defaultValue={editingItem?.description} required className="w-full bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-sm uppercase" />
              <div className="grid grid-cols-2 gap-4">
                  <input name="value" type="number" step="0.01" defaultValue={editingItem?.value} required className="w-full bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-sm" />
                  <input name="date" type="date" defaultValue={editingItem?.type === 'revenue' ? editingItem?.date : editingItem?.dueDate} required className="w-full bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-sm" />
              </div>
              <select name="category" defaultValue={editingItem?.categoryId} required className="w-full bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-sm uppercase">
                  {sortedCategories.filter(c => c.type === (editingItem?.type === 'revenue' ? TransactionType.REVENUE : TransactionType.EXPENSE)).map(c => (
                      <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                  ))}
              </select>
              <div className="flex flex-col gap-2 pt-4">
                  <button type="submit" className="w-full bg-[#2563EB] text-white p-4 rounded-xl font-bold text-sm uppercase">SALVAR ALTERAÇÕES</button>
                  <button type="button" onClick={() => setIsConfirmingDelete(true)} className="w-full text-[#DC2626] p-4 font-bold text-sm uppercase">EXCLUIR REGISTRO</button>
              </div>
          </form>
      </Modal>

      {/* CONFIRMAÇÃO DE EXCLUSÃO (MANTIDO) */}
      {isConfirmingDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0F172A]/60 backdrop-blur-sm">
              <div className="bg-white p-8 rounded-2xl max-w-sm w-full text-center space-y-6">
                  <p className="font-bold text-[#0F172A] uppercase tracking-wide">CONFIRMA A EXCLUSÃO DEFINITIVA?</p>
                  <div className="flex flex-col gap-3">
                      <button onClick={handleFinalDelete} disabled={isDeleting} className="w-full bg-[#DC2626] text-white p-4 rounded-xl font-bold text-sm uppercase">{isDeleting ? 'EXCLUINDO...' : 'SIM, EXCLUIR'}</button>
                      <button onClick={() => setIsConfirmingDelete(false)} className="w-full bg-[#F8FAFC] text-[#64748B] p-4 rounded-xl font-bold text-sm uppercase">CANCELAR</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL CATEGORIA RÁPIDA (MANTIDO) */}
      <Modal isOpen={showQuickCategoryModal} onClose={() => setShowQuickCategoryModal(false)} title="NOVA CATEGORIA">
          <div className="space-y-4">
              <input value={categoryInput} onChange={e => setCategoryInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddQuickCategory()} className="w-full bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] text-sm uppercase" placeholder="NOME DA CATEGORIA" autoFocus />
              <button onClick={handleAddQuickCategory} className="w-full bg-[#2563EB] text-white p-4 rounded-xl font-bold text-sm uppercase">CRIAR CATEGORIA</button>
          </div>
      </Modal>
    </Layout>
  );
};

export default App;
