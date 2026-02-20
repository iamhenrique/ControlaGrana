
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import { useFinanceStore } from './store';
import ResumoCard from './components/SummaryCards';
import { formatCurrency, getMonthYear, getLocalDateString } from './utils';
import { Status, TransactionType, Frequency, Revenue, SimpleExpense } from './types';

// Hook para Lazy Loading
function useLazyList(items: any[], pageSize: number = 20) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  
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
    addDebt, deleteDebt, toggleExpenseStatus, toggleRevenueStatus, toggleInstallmentStatus,
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

  const [isRevRecurrent, setIsRevRecurrent] = useState(false);
  const [revFrequency, setRevFrequency] = useState<Frequency>(Frequency.MONTHLY);
  const [revRecurrenceCount, setRevRecurrenceCount] = useState(12);

  const [isExpRecurrent, setIsExpRecurrent] = useState(false);
  const [expFrequency, setExpFrequency] = useState<Frequency>(Frequency.MONTHLY);
  const [expRecurrenceCount, setRevRecurrenceCountExp] = useState(12);
  const [isExpInstallment, setIsExpInstallment] = useState(false);

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
  }, [currentYear]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const filteredData = useMemo(() => {
    const monthStr = `${selectedMonth + 1}-${selectedYear}`;
    const userRevenues = revenues.filter(r => r.userId === currentUser?.id);
    const userExpenses = expenses.filter(e => e.userId === currentUser?.id);

    const monthlyRevenues = userRevenues
      .filter(r => getMonthYear(r.date) === monthStr);

    const monthlyExpenses = userExpenses
      .filter(e => getMonthYear(e.dueDate) === monthStr);

    const monthlyInstallments = installments
      .filter(i => {
          const d = debts.find(d => d.id === i.debtId);
          return d?.userId === currentUser?.id && getMonthYear(i.dueDate) === monthStr;
      })
      .map(i => ({
          ...i,
          description: debts.find(d => d.id === i.debtId)?.description || 'Parcela'
      }));

    const totalRevenue = monthlyRevenues.reduce((acc, r) => acc + r.value, 0);
    const receivedRevenue = monthlyRevenues.filter(r => r.status === Status.PAID).reduce((acc, r) => acc + r.value, 0);
    const totalExpense = monthlyExpenses.reduce((acc, e) => acc + e.value, 0) + monthlyInstallments.reduce((acc, i) => acc + i.value, 0);
    const totalPaid = monthlyExpenses.filter(e => e.status === Status.PAID).reduce((acc, e) => acc + e.value, 0) + monthlyInstallments.filter(i => i.status === Status.PAID).reduce((acc, i) => acc + i.value, 0);

    const recent = [
        ...monthlyRevenues.map(r => ({ ...r, type: 'revenue', sortDate: r.date })),
        ...monthlyExpenses.map(e => ({ ...e, type: 'expense', sortDate: e.dueDate })),
        ...monthlyInstallments.map(i => ({ ...i, type: 'installment', sortDate: i.dueDate }))
    ].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
    }).slice(0, 15);

    return {
      totalRevenue, receivedRevenue, totalExpense, totalPaid,
      finalBalance: totalRevenue - totalExpense,
      monthlyRevenues, monthlyExpenses, monthlyInstallments, recent
    };
  }, [revenues, expenses, installments, sortedCategories, debts, currentUser, selectedMonth, selectedYear]);

  // UNIFICAÇÃO DO FLUXO: Pendentes (Receitas -> Despesas) primeiro, Pagos depois. Tudo data crescente.
  const unifiedFlow = useMemo(() => {
    const all = [
      ...filteredData.monthlyRevenues.map(r => ({ ...r, transactionType: 'revenue', dateKey: r.date })),
      ...filteredData.monthlyExpenses.map(e => ({ ...e, transactionType: 'expense', dateKey: e.dueDate })),
      ...filteredData.monthlyInstallments.map(i => ({ ...i, transactionType: 'installment', dateKey: i.dueDate }))
    ];

    // 1. Receitas Pendentes (Ordem Crescente)
    const pendingRevenues = all
      .filter(t => t.status === Status.PENDING && t.transactionType === 'revenue')
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    
    // 2. Despesas/Parcelas Pendentes (Ordem Crescente)
    const pendingExpenses = all
      .filter(t => t.status === Status.PENDING && (t.transactionType === 'expense' || t.transactionType === 'installment'))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    // 3. Tudo Pago (Ordem Crescente)
    const paid = all
      .filter(t => t.status === Status.PAID)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    return { 
        pending: [...pendingRevenues, ...pendingExpenses], 
        pendingRevenuesCount: pendingRevenues.length,
        pendingExpensesCount: pendingExpenses.length,
        paid, 
        total: all.length 
    };
  }, [filteredData.monthlyRevenues, filteredData.monthlyExpenses, filteredData.monthlyInstallments]);

  const flowLazy = useLazyList([...unifiedFlow.pending, ...unifiedFlow.paid]);

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
      <div className="flex items-center gap-2">
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs font-bold text-[#0F172A] outline-none focus:border-[#2563EB] transition-all uppercase cursor-pointer hover:bg-white"
        >
          {months.map((m, idx) => (
            <option key={m} value={idx}>{m}</option>
          ))}
        </select>
        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs font-bold text-[#0F172A] outline-none focus:border-[#2563EB] transition-all uppercase cursor-pointer hover:bg-white"
        >
          {yearOptions.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {(isSyncing || isDeleting) && <div className="w-2 h-2 bg-[#2563EB] rounded-full animate-ping ml-1 shrink-0"></div>}
      </div>
      <button onClick={() => setShowSettingsModal(true)} className="flex items-center gap-2 group ml-4">
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
    if (item.transactionType === 'installment') {
        const parentDebt = debts.find(d => d.id === item.debtId);
        if (parentDebt) {
            setEditingItem({ ...parentDebt, type: 'debt' });
            setShowEditModal(true);
        }
        return;
    }
    setEditingItem({ ...item, type: item.transactionType });
    setShowEditModal(true);
  };

  const handleToggle = (item: any) => {
    if (item.transactionType === 'revenue') toggleRevenueStatus(item.id);
    else if (item.transactionType === 'expense') toggleExpenseStatus(item.id);
    else if (item.transactionType === 'installment') toggleInstallmentStatus(item.id);
  };

  const handleFinalDelete = async () => {
    if (!editingItem || !editingItem.id) return;
    setIsDeleting(true);
    try {
      let success = false;
      if (editingItem.type === 'revenue') success = await deleteRevenue(editingItem.id);
      else if (editingItem.type === 'expense') success = await deleteExpense(editingItem.id);
      else if (editingItem.type === 'debt') success = await deleteDebt(editingItem.id);
      if (success) {
        setShowEditModal(false);
        setEditingItem(null);
        setIsConfirmingDelete(false);
      }
    } catch (err: any) {
      alert(`Falha ao excluir: ${err.message}`);
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
    } catch (e: any) { alert(e.message); }
  };

  const handleCategoryDelete = async (id: string) => {
      setIsDeleting(true);
      try {
          await deleteCategory(id);
          setConfirmDeleteCategoryId(null);
      } catch (err) { alert("Erro ao excluir categoria."); }
      finally { setIsDeleting(false); }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center animate-in fade-in duration-700">
        <div className="w-20 h-20 bg-[#2563EB] rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-2xl animate-pulse">G</div>
        <h1 className="text-sm font-bold tracking-[0.2em] text-[#0F172A] uppercase mt-8">CONTROLAGRANA</h1>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} headerContent={MinimalHeader} headerClassName="bg-white border-b border-[#E2E8F0]">
      
      {currentUser && (
        <div className="fixed bottom-24 md:bottom-12 right-6 md:right-12 z-[90]">
           {showFabMenu && (
             <div className="absolute bottom-20 right-0 flex flex-col items-end gap-3 animate-in slide-in-from-bottom-4 duration-200">
                <button onClick={() => handleOpenFabForm('revenue')} className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl shadow-lg border border-[#E2E8F0] text-[#16A34A] font-bold text-sm hover:bg-[#F8FAFC] transition-all uppercase">RECEITA <span>+</span></button>
                <button onClick={() => { setIsExpInstallment(false); handleOpenFabForm('expense'); }} className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl shadow-lg border border-[#E2E8F0] text-[#DC2626] font-bold text-sm hover:bg-[#F8FAFC] transition-all uppercase">DESPESA <span>-</span></button>
             </div>
           )}
           <button onClick={() => setShowFabMenu(!showFabMenu)} className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl text-white shadow-xl transition-all duration-300 ${showFabMenu ? 'bg-[#0F172A] rotate-45' : 'bg-[#2563EB] hover:bg-[#1d4ed8]'}`}>+</button>
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
          
          <ResumoCard title="SALDO TOTAL" isHero totalValue={filteredData.finalBalance} subValues={[{ label: 'RECEITAS', value: filteredData.totalRevenue }, { label: 'DESPESAS', value: filteredData.totalExpense }]} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ResumoCard title="RECEBIDOS" totalValue={filteredData.receivedRevenue} accentColor="text-[#16A34A]" />
            <ResumoCard title="PAGOS" totalValue={filteredData.totalPaid} accentColor="text-[#DC2626]" />
          </div>

          <div className="pt-4">
             <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest mb-4 px-1">LANÇAMENTOS RECENTES</h3>
             <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm divide-y divide-[#E2E8F0]">
                {filteredData.recent.map((item: any, idx) => (
                    <div key={idx} onClick={() => openEdit({...item, transactionType: item.type})} className="flex items-center justify-between p-5 hover:bg-[#F8FAFC] transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${item.type === 'revenue' ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-[#DC2626]/10 text-[#DC2626]'}`}>
                                {item.type === 'revenue' ? '↑' : '↓'}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-[#0F172A] uppercase truncate max-w-[150px] sm:max-w-none">{item.description}</span>
                                <span className="text-[10px] font-medium text-[#64748B] uppercase">{new Date(item.sortDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                            </div>
                        </div>
                        <span className={`text-sm font-bold ${item.type === 'revenue' ? 'text-[#16A34A]' : 'text-[#0F172A]'}`}>
                            {item.type === 'revenue' ? '+' : '-'}{formatCurrency(item.value)}
                        </span>
                    </div>
                ))}
                {filteredData.recent.length === 0 && <div className="p-10 text-center text-xs font-bold text-[#64748B] uppercase">NADA POR AQUI.</div>}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto pb-10">
          <div className="flex items-center justify-between px-1">
             <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">FLUXO DE CAIXA</h3>
             <span className="text-[10px] font-bold text-[#64748B] bg-[#F1F5F9] px-3 py-1 rounded-full uppercase">{unifiedFlow.total} ITENS</span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
             <div className="divide-y divide-[#E2E8F0]">
                {/* CABEÇALHO PENDENTES */}
                {unifiedFlow.pending.length > 0 && (
                  <div className="bg-[#FFFBEB] px-5 py-2 border-b border-[#FEF3C7] flex justify-between items-center">
                    <span className="text-[9px] font-bold text-[#D97706] uppercase tracking-[0.2em]">AGUARDANDO ({unifiedFlow.pending.length})</span>
                  </div>
                )}
                
                {flowLazy.visibleItems.map((item, index) => {
                  const isPaid = item.status === Status.PAID;
                  const isRevenue = item.transactionType === 'revenue';
                  const isInstallment = item.transactionType === 'installment';
                  
                  // Cabeçalho subgrupo RECEITAS (dentro de Aguardando)
                  const showPendingRevenueSubHeader = !isPaid && isRevenue && (index === 0 || flowLazy.visibleItems[index-1].status === Status.PAID || flowLazy.visibleItems[index-1].transactionType !== 'revenue');
                  
                  // Cabeçalho subgrupo DESPESAS (dentro de Aguardando)
                  const showPendingExpenseSubHeader = !isPaid && !isRevenue && (index === 0 || flowLazy.visibleItems[index-1].status === Status.PAID || flowLazy.visibleItems[index-1].transactionType === 'revenue');

                  // Cabeçalho bloco CONCLUÍDOS
                  const showPaidHeader = isPaid && (index === 0 || flowLazy.visibleItems[index-1].status === Status.PENDING);

                  return (
                    <React.Fragment key={item.id}>
                      {showPendingRevenueSubHeader && (
                        <div className="bg-[#FFFBEB]/50 px-5 py-1.5 border-b border-[#FEF3C7]/50 flex items-center gap-2">
                           <div className="w-1 h-1 rounded-full bg-[#16A34A]"></div>
                           <span className="text-[8px] font-black text-[#16A34A] uppercase tracking-widest">RECEITAS ({unifiedFlow.pendingRevenuesCount})</span>
                        </div>
                      )}

                      {showPendingExpenseSubHeader && (
                        <div className="bg-[#FFFBEB]/50 px-5 py-1.5 border-b border-[#FEF3C7]/50 flex items-center gap-2">
                           <div className="w-1 h-1 rounded-full bg-[#DC2626]"></div>
                           <span className="text-[8px] font-black text-[#DC2626] uppercase tracking-widest">DESPESAS ({unifiedFlow.pendingExpensesCount})</span>
                        </div>
                      )}

                      {showPaidHeader && (
                        <div className="bg-[#F8FAFC] px-5 py-2 border-b border-[#E2E8F0]">
                          <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-[0.2em]">CONCLUÍDOS ({unifiedFlow.paid.length})</span>
                        </div>
                      )}

                      <div 
                        onClick={() => openEdit(item)}
                        className={`p-4 sm:p-5 flex items-center justify-between hover:bg-[#F8FAFC] transition-all cursor-pointer group border-l-4 border-transparent ${isPaid ? 'opacity-60 grayscale-[0.3]' : isRevenue ? 'hover:border-l-[#16A34A]' : 'hover:border-l-[#DC2626]'}`}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex flex-col items-center justify-center min-w-[42px] h-[42px] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                             <span className="text-[10px] font-bold text-[#64748B] uppercase leading-none mb-0.5">{new Date(item.dateKey + 'T12:00:00').toLocaleDateString('pt-BR', {month: 'short'}).replace('.', '')}</span>
                             <span className="text-sm font-bold text-[#0F172A] leading-none">{new Date(item.dateKey + 'T12:00:00').getDate()}</span>
                          </div>
                          <div className="flex flex-col truncate pr-2">
                             <span className="text-sm font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors uppercase truncate">{item.description}</span>
                             <div className="flex items-center gap-2">
                               <span className={`text-[9px] font-bold uppercase tracking-widest ${isRevenue ? 'text-[#16A34A]' : isInstallment ? 'text-[#2563EB]' : 'text-[#64748B]'}`}>
                                   {isInstallment ? `PARCELA ${item.installmentNumber}` : (sortedCategories.find(c => c.id === item.categoryId)?.name || 'LANÇAMENTO')}
                               </span>
                               {isPaid && <span className="text-[9px] font-bold text-[#64748B]">✓ OK</span>}
                             </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-5 ml-2 shrink-0">
                           <span className={`text-sm font-bold ${isRevenue ? 'text-[#16A34A]' : 'text-[#0F172A]'}`}>{formatCurrency(item.value)}</span>
                           <button 
                              onClick={(e) => { e.stopPropagation(); handleToggle(item); }}
                              className={`relative w-10 h-6 rounded-full transition-all duration-300 flex items-center px-1 shadow-inner ${isPaid ? (isRevenue ? 'bg-[#16A34A]' : isInstallment ? 'bg-[#2563EB]' : 'bg-[#DC2626]') : 'bg-[#E2E8F0]'}`}
                           >
                              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${isPaid ? 'translate-x-4' : 'translate-x-0'}`}></div>
                           </button>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}

                {flowLazy.hasMore && (
                  <button onClick={flowLazy.loadMore} className="w-full py-4 text-[10px] font-bold text-[#2563EB] uppercase tracking-widest hover:bg-[#F8FAFC]">VER MAIS LANÇAMENTOS ↓</button>
                )}
                {unifiedFlow.total === 0 && <div className="p-16 text-center text-xs font-bold text-[#64748B] uppercase tracking-widest">SEM MOVIMENTAÇÃO NO MÊS.</div>}
             </div>
          </div>
        </div>
      )}

      {/* MODAL NOVA RECEITA */}
      <Modal isOpen={showRevForm} onClose={() => setShowRevForm(false)} title="NOVA RECEITA">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const catId = String(fd.get('category'));
          if (!catId) return alert("Selecione uma categoria.");
          const success = await addRevenue({
            description: String(fd.get('desc')),
            value: Number(fd.get('value')),
            date: String(fd.get('date')),
            categoryId: catId,
            status: Status.PENDING,
            isRecurrent: isRevRecurrent,
            frequency: isRevRecurrent ? revFrequency : undefined
          }, isRevRecurrent ? revRecurrenceCount : 1);
          if (success) setShowRevForm(false);
        }} className="space-y-5">
          <input name="desc" required className="w-full bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-sm uppercase" placeholder="DESCRIÇÃO" />
          <div className="grid grid-cols-2 gap-4">
            <input name="value" type="number" step="0.01" required className="w-full bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-sm" placeholder="VALOR" />
            <input name="date" type="date" required defaultValue={getLocalDateString()} className="w-full bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-sm" />
          </div>
          <select name="category" required className="w-full bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-sm uppercase">
              <option value="">CATEGORIA...</option>
              {sortedCategories.filter(c => c.type === TransactionType.REVENUE).map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
          </select>
          <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between">
            <span className="text-xs font-bold uppercase">RECORRENTE</span>
            <Toggle enabled={isRevRecurrent} onChange={setIsRevRecurrent} activeColorClass="bg-[#16A34A]" />
          </div>
          {isRevRecurrent && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <select value={revFrequency} onChange={(e) => setRevFrequency(e.target.value as Frequency)} className="bg-white p-2 text-xs font-bold rounded-lg border border-[#E2E8F0] uppercase"><option value={Frequency.MONTHLY}>MENSAL</option><option value={Frequency.WEEKLY}>SEMANAL</option></select>
              <input type="number" value={revRecurrenceCount} onChange={(e) => setRevRecurrenceCount(Number(e.target.value))} className="bg-white p-2 text-center text-xs font-bold rounded-lg border border-[#E2E8F0]" placeholder="VEZES" />
            </div>
          )}
          <button type="submit" disabled={isSyncing} className="w-full bg-[#2563EB] text-white p-4 rounded-xl font-bold text-sm uppercase shadow-md active:scale-95 transition-all">SALVAR RECEITA</button>
        </form>
      </Modal>

      {/* MODAL NOVA DESPESA */}
      <Modal isOpen={showExpForm} onClose={() => setShowExpForm(false)} title="NOVA DESPESA">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const catId = String(fd.get('category'));
          if (!catId) return alert("Selecione uma categoria.");
          let success = false;
          if (isExpInstallment) {
            success = await addDebt({ description: String(fd.get('desc')), totalValue: Number(fd.get('totalValue')), startDate: String(fd.get('startDate')), frequency: Frequency.MONTHLY, installmentsCount: Number(fd.get('installmentsCount')), categoryId: catId });
          } else {
            success = await addExpense({ description: String(fd.get('desc')), value: Number(fd.get('value')), dueDate: String(fd.get('dueDate')), categoryId: catId, paymentMethod: 'PIX', status: Status.PENDING, isRecurrent: isExpRecurrent, frequency: isExpRecurrent ? expFrequency : undefined }, isExpRecurrent ? expRecurrenceCount : 1);
          }
          if (success) setShowExpForm(false);
        }} className="space-y-5">
          <input name="desc" required className="w-full bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-sm uppercase" placeholder="DESCRIÇÃO" />
          <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between"><span className="text-[10px] font-bold uppercase">PARCELAR</span><Toggle enabled={isExpInstallment} onChange={(v) => { setIsExpInstallment(v); if(v) setIsExpRecurrent(false); }} activeColorClass="bg-[#2563EB]" /></div>
              {!isExpInstallment && <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between"><span className="text-[10px] font-bold uppercase">RECORRER</span><Toggle enabled={isExpRecurrent} onChange={setIsExpRecurrent} activeColorClass="bg-[#DC2626]" /></div>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input name={isExpInstallment ? "totalValue" : "value"} type="number" step="0.01" required className="w-full bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-sm" placeholder={isExpInstallment ? "TOTAL" : "VALOR"} />
            {isExpInstallment ? <input name="installmentsCount" type="number" required className="w-full bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-sm" placeholder="PARCELAS" /> : <input name="dueDate" type="date" required defaultValue={getLocalDateString()} className="w-full bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-sm" />}
          </div>
          {isExpInstallment && <input name="startDate" type="date" required defaultValue={getLocalDateString()} className="w-full bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-sm" />}
          <select name="category" required className="w-full bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-sm uppercase">
              <option value="">CATEGORIA...</option>
              {sortedCategories.filter(c => c.type === TransactionType.EXPENSE).map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
          </select>
          <button type="submit" disabled={isSyncing} className="w-full bg-[#0F172A] text-white p-4 rounded-xl font-bold text-sm uppercase shadow-md active:scale-95 transition-all">SALVAR DESPESA</button>
        </form>
      </Modal>

      {/* MODAL CONFIGURAÇÕES */}
      <Modal isOpen={showSettingsModal} onClose={() => { setShowSettingsModal(false); setConfirmDeleteCategoryId(null); }} title="CONFIGURAÇÕES">
          <div className="flex border-b border-[#E2E8F0] mb-6">
              <button onClick={() => setSettingsTab('users')} className={`flex-1 py-3 text-[10px] font-bold tracking-widest transition-all ${settingsTab === 'users' ? 'text-[#2563EB] border-b-2 border-[#2563EB]' : 'text-[#64748B]'}`}>PERFIS</button>
              <button onClick={() => setSettingsTab('categories')} className={`flex-1 py-3 text-[10px] font-bold tracking-widest transition-all ${settingsTab === 'categories' ? 'text-[#2563EB] border-b-2 border-[#2563EB]' : 'text-[#64748B]'}`}>CATEGORIAS</button>
          </div>
          {settingsTab === 'users' ? (
              <div className="space-y-4">
                  {users.map(u => (
                      <button key={u.id} onClick={() => { setCurrentUser(u); setShowSettingsModal(false); }} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${currentUser?.id === u.id ? 'border-[#2563EB] bg-[#2563EB]/5' : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'}`}>
                          <div className="flex items-center gap-4">
                              <div className="w-9 h-9 bg-white border border-[#E2E8F0] rounded-full flex items-center justify-center font-bold text-[#64748B]">{u.nome?.[0]?.toUpperCase()}</div>
                              <span className="text-sm font-bold text-[#0F172A] uppercase">{u.nome}</span>
                          </div>
                      </button>
                  ))}
                  <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); await addUser(String(fd.get('nome')), String(fd.get('email'))); e.currentTarget.reset(); }} className="space-y-3 pt-4 border-t">
                      <input name="nome" placeholder="NOME" required className="w-full bg-[#F8FAFC] border p-4 rounded-xl text-sm uppercase" />
                      <input name="email" type="email" placeholder="E-MAIL" required className="w-full bg-[#F8FAFC] border p-4 rounded-xl text-sm uppercase" />
                      <button type="submit" className="w-full bg-[#2563EB] text-white p-4 rounded-xl font-bold text-sm uppercase">NOVO PERFIL</button>
                  </form>
              </div>
          ) : (
              <div className="space-y-4">
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 hide-scrollbar">
                    {sortedCategories.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] group">
                            <span className="text-xs font-bold uppercase">{c.name}</span>
                            <button onClick={() => handleCategoryDelete(c.id)} className="w-7 h-7 flex items-center justify-center text-[#64748B] hover:text-[#DC2626] opacity-0 group-hover:opacity-100 transition-all">✕</button>
                        </div>
                    ))}
                  </div>
                  <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); await addCategory(String(fd.get('name')), fd.get('type') as TransactionType); e.currentTarget.reset(); }} className="space-y-3 pt-4 border-t">
                      <input name="name" placeholder="NOME" required className="w-full bg-[#F8FAFC] border p-4 rounded-xl text-sm uppercase" />
                      <div className="grid grid-cols-2 gap-3">
                          <label className="flex items-center justify-center p-3 rounded-xl border cursor-pointer has-[:checked]:bg-[#2563EB]/5 has-[:checked]:border-[#2563EB]"><input type="radio" name="type" value={TransactionType.REVENUE} required className="sr-only" /><span className="text-[10px] font-bold uppercase">RECEITA</span></label>
                          <label className="flex items-center justify-center p-3 rounded-xl border cursor-pointer has-[:checked]:bg-[#2563EB]/5 has-[:checked]:border-[#2563EB]"><input type="radio" name="type" value={TransactionType.EXPENSE} required className="sr-only" /><span className="text-[10px] font-bold uppercase">DESPESA</span></label>
                      </div>
                      <button type="submit" className="w-full bg-[#0F172A] text-white p-4 rounded-xl font-bold text-sm uppercase">NOVA CATEGORIA</button>
                  </form>
              </div>
          )}
      </Modal>

      {/* MODAL EDIÇÃO */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="EDITAR">
          <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const updateData = { description: String(fd.get('desc')), value: Number(fd.get('value')), [editingItem?.type === 'revenue' ? 'date' : 'dueDate']: String(fd.get('date')), categoryId: String(fd.get('category')) };
              if (editingItem?.type === 'revenue') await updateRevenue(editingItem.id, updateData as Partial<Revenue>);
              else await updateExpense(editingItem.id, updateData as Partial<SimpleExpense>);
              setShowEditModal(false);
          }} className="space-y-6">
              <input name="desc" defaultValue={editingItem?.description} required className="w-full bg-[#F8FAFC] p-3 rounded-xl border text-sm uppercase" />
              <div className="grid grid-cols-2 gap-4">
                  <input name="value" type="number" step="0.01" defaultValue={editingItem?.value} required className="w-full bg-[#F8FAFC] p-3 rounded-xl border text-sm" />
                  <input name="date" type="date" defaultValue={editingItem?.type === 'revenue' ? editingItem?.date : editingItem?.dueDate} required className="w-full bg-[#F8FAFC] p-3 rounded-xl border text-sm" />
              </div>
              <select name="category" defaultValue={editingItem?.categoryId} required className="w-full bg-[#F8FAFC] p-3 rounded-xl border text-sm uppercase">
                  {sortedCategories.filter(c => c.type === (editingItem?.type === 'revenue' ? TransactionType.REVENUE : TransactionType.EXPENSE)).map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
              </select>
              <div className="flex flex-col gap-2 pt-4">
                  <button type="submit" className="w-full bg-[#2563EB] text-white p-4 rounded-xl font-bold text-sm uppercase">SALVAR</button>
                  <button type="button" onClick={() => setIsConfirmingDelete(true)} className="w-full text-[#DC2626] p-4 font-bold text-sm uppercase">EXCLUIR</button>
              </div>
          </form>
      </Modal>

      {/* CONFIRMAÇÃO EXCLUSÃO */}
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

      {/* MODAL CATEGORIA RÁPIDA */}
      <Modal isOpen={showQuickCategoryModal} onClose={() => setShowQuickCategoryModal(false)} title="NOVA CATEGORIA">
          <div className="space-y-4">
              <input value={categoryInput} onChange={e => setCategoryInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddQuickCategory()} className="w-full bg-[#F8FAFC] p-4 rounded-xl border text-sm uppercase" placeholder="NOME" autoFocus />
              <button onClick={handleAddQuickCategory} className="w-full bg-[#2563EB] text-white p-4 rounded-xl font-bold text-sm uppercase">CRIAR</button>
          </div>
      </Modal>
    </Layout>
  );
};

export default App;
