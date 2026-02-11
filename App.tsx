
import React, { useState, useMemo } from 'react';
import Layout from './components/Layout';
import { useFinanceStore } from './store';
import ResumoCard from './components/SummaryCards';
import { formatCurrency, getMonthYear } from './utils';
import { Status, TransactionType, Frequency, Revenue, SimpleExpense } from './types';

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
    addDebt, deleteDebt, toggleExpenseStatus, toggleRevenueStatus
  } = useFinanceStore();

  const [showUserForm, setShowUserForm] = useState(false);
  const [showRevForm, setShowRevForm] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState(false);

  const [isRevRecurrent, setIsRevRecurrent] = useState(false);
  const [isExpRecurrent, setIsExpRecurrent] = useState(false);
  const [isExpInstallment, setIsExpInstallment] = useState(false);

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

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
    ].sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()).slice(0, 10);

    return {
      totalRevenue, receivedRevenue, totalExpense, totalPaid,
      finalBalance: totalRevenue - totalExpense,
      monthlyRevenues, monthlyExpenses, monthlyInstallments, recent
    };
  }, [revenues, expenses, installments, categories, debts, currentUser, selectedMonth, selectedYear]);

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
      <button onClick={() => setShowUserForm(true)} className="flex items-center gap-2 group">
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
      console.error("ERRO AO EXCLUIR:", err);
      alert(`Falha ao excluir registro: ${err.message || 'Verifique sua conexão.'}`);
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
                    onClick={() => { setShowRevForm(true); setShowFabMenu(false); }}
                    className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl shadow-lg border border-[#E2E8F0] text-[#16A34A] font-bold text-sm hover:bg-[#F8FAFC] transition-all uppercase"
                >
                    RECEITA <span>+</span>
                </button>
                <button 
                    onClick={() => { setIsExpInstallment(false); setShowExpForm(true); setShowFabMenu(false); }}
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
                  onClick={() => setShowRevForm(true)}
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
                  onClick={() => setShowExpForm(true)}
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
          <div className="space-y-4">
             <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest">RECEITAS</h3>
                <span className="text-[9px] font-bold text-[#16A34A] bg-[#16A34A]/10 px-2.5 py-1 rounded-full tracking-widest uppercase">{filteredData.monthlyRevenues.length} LANÇAMENTOS</span>
             </div>
             <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm divide-y divide-[#E2E8F0]">
                 {filteredData.monthlyRevenues.map(rev => (
                   <div key={rev.id} onClick={() => openEdit({...rev, type: 'revenue'})} className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors cursor-pointer group border-l-4 border-transparent hover:border-l-[#16A34A]">
                      <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                         <div className="flex flex-col items-center justify-center min-w-[42px] h-[42px] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                            <span className="text-[10px] font-bold text-[#64748B] uppercase leading-none mb-0.5">{new Date(rev.date).toLocaleDateString('pt-BR', {month: 'short'}).replace('.', '')}</span>
                            <span className="text-sm font-bold text-[#0F172A] leading-none">{new Date(rev.date).getDate()}</span>
                         </div>
                         <div className="flex flex-col truncate pr-2">
                            <span className="text-sm font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors uppercase truncate">{rev.description}</span>
                            <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest">
                                {categories.find(c => c.id === rev.categoryId)?.name || 'OUTROS'}
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
                 {filteredData.monthlyRevenues.length === 0 && <div className="p-12 text-center text-xs font-bold text-[#64748B] uppercase tracking-widest">SEM RECEITAS NESTE PERÍODO.</div>}
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest">DESPESAS</h3>
                <span className="text-[9px] font-bold text-[#DC2626] bg-[#DC2626]/10 px-2.5 py-1 rounded-full tracking-widest uppercase">{filteredData.monthlyExpenses.length + filteredData.monthlyInstallments.length} LANÇAMENTOS</span>
             </div>
             <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm divide-y divide-[#E2E8F0]">
                 {filteredData.monthlyExpenses.map(exp => (
                   <div key={exp.id} onClick={() => openEdit({...exp, type: 'expense'})} className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors cursor-pointer group border-l-4 border-transparent hover:border-l-[#DC2626]">
                      <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                         <div className="flex flex-col items-center justify-center min-w-[42px] h-[42px] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                            <span className="text-[10px] font-bold text-[#64748B] uppercase leading-none mb-0.5">{new Date(exp.dueDate).toLocaleDateString('pt-BR', {month: 'short'}).replace('.', '')}</span>
                            <span className="text-sm font-bold text-[#0F172A] leading-none">{new Date(exp.dueDate).getDate()}</span>
                         </div>
                         <div className="flex flex-col truncate pr-2">
                            <span className="text-sm font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors uppercase truncate">{exp.description}</span>
                            <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest">
                                {categories.find(c => c.id === exp.categoryId)?.name || 'DESPESA'}
                            </span>
                         </div>
                      </div>
                      <div className="flex items-center gap-4 sm:gap-6 ml-2 shrink-0">
                         <span className="text-sm font-bold text-[#0F172A] whitespace-nowrap">{formatCurrency(exp.value)}</span>
                         <button 
                            onClick={(e) => { e.stopPropagation(); toggleExpenseStatus(exp.id); }}
                            className={`relative w-10 h-6 rounded-full transition-all duration-300 flex items-center px-1 shadow-inner ${exp.status === Status.PAID ? 'bg-[#DC2626]' : 'bg-[#E2E8F0]'}`}
                         >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${exp.status === Status.PAID ? 'translate-x-4' : 'translate-x-0'}`}></div>
                         </button>
                      </div>
                   </div>
                 ))}

                 {filteredData.monthlyInstallments.map(inst => (
                    <div key={inst.id} onClick={() => openEdit({...inst, type: 'installment'})} className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors cursor-pointer group border-l-4 border-transparent hover:border-l-[#2563EB]">
                        <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                            <div className="flex flex-col items-center justify-center min-w-[42px] h-[42px] bg-white rounded-xl border border-[#E2E8F0]">
                                <span className="text-[10px] font-bold text-[#64748B] uppercase leading-none mb-0.5">{new Date(inst.dueDate).toLocaleDateString('pt-BR', {month: 'short'}).replace('.', '')}</span>
                                <span className="text-sm font-bold text-[#0F172A] leading-none">{new Date(inst.dueDate).getDate()}</span>
                            </div>
                            <div className="flex flex-col truncate pr-2">
                                <span className="text-sm font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors uppercase truncate">{inst.description}</span>
                                <span className="text-[9px] font-bold text-[#2563EB] uppercase tracking-widest">PARCELA {inst.installmentNumber}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 sm:gap-6 ml-2 shrink-0">
                            <span className="text-sm font-bold text-[#0F172A] whitespace-nowrap">{formatCurrency(inst.value)}</span>
                            <div className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${inst.status === Status.PAID ? 'bg-[#64748B]' : 'bg-[#E2E8F0]'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${inst.status === Status.PAID ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </div>
                        </div>
                    </div>
                 ))}

                 {filteredData.monthlyExpenses.length === 0 && filteredData.monthlyInstallments.length === 0 && 
                    <div className="p-12 text-center text-xs font-bold text-[#64748B] uppercase tracking-widest">SEM DESPESAS NESTE PERÍODO.</div>
                 }
             </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO E EXCLUSÃO */}
      <Modal 
        isOpen={showEditModal} 
        onClose={() => { if(!isSyncing && !isDeleting) setShowEditModal(false); }} 
        title={`EDITAR ${editingItem?.type === 'revenue' ? 'RECEITA' : editingItem?.type === 'debt' ? 'PARCELAMENTO' : 'DESPESA'}`}
      >
        <form onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          if (editingItem?.type === 'debt') {
              setShowEditModal(false);
              return;
          }
          const updateData = {
            description: String(fd.get('desc')),
            value: Number(fd.get('value')),
            [editingItem?.type === 'revenue' ? 'date' : 'dueDate']: String(fd.get('date')),
            categoryId: String(fd.get('category')),
            status: editingItem?.status
          };
          if (editingItem?.type === 'revenue') {
            await updateRevenue(editingItem.id, updateData as Partial<Revenue>);
          } else {
            await updateExpense(editingItem.id, updateData as Partial<SimpleExpense>);
          }
          setShowEditModal(false);
        }} className="space-y-6">
          {editingItem?.type === 'debt' ? (
              <div className="p-5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] text-[#64748B] text-xs font-bold uppercase tracking-wide leading-relaxed">
                  ESTE É UM PLANO DE PARCELAMENTO. PARA ALTERAR VALORES OU DATAS, RECOMENDAMOS EXCLUIR ESTE PLANO E CRIAR UM NOVO COM OS DADOS ATUALIZADOS.
              </div>
          ) : (
            <>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">DESCRIÇÃO</label>
                    <input name="desc" defaultValue={editingItem?.description} required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all uppercase" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">VALOR (R$)</label>
                        <input name="value" type="number" step="0.01" defaultValue={editingItem?.value} required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">DATA</label>
                        <input name="date" type="date" defaultValue={editingItem?.type === 'revenue' ? editingItem?.date : editingItem?.dueDate} required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">CATEGORIA</label>
                    <select name="category" defaultValue={editingItem?.categoryId} required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all uppercase">
                        {categories.filter(c => c.type === (editingItem?.type === 'revenue' ? TransactionType.REVENUE : TransactionType.EXPENSE)).map(c => (
                            <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                        ))}
                    </select>
                </div>
            </>
          )}
          <div className="flex flex-col gap-3 pt-4 border-t border-[#E2E8F0]">
            {!isConfirmingDelete ? (
              <>
                {editingItem?.type !== 'debt' && (
                  <button type="submit" className="w-full bg-[#2563EB] text-white p-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-md hover:bg-[#1d4ed8] transition-all disabled:opacity-50" disabled={isSyncing || isDeleting}>
                    {isSyncing ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => setIsConfirmingDelete(true)}
                  className="w-full bg-white text-[#DC2626] border border-[#DC2626] p-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#DC2626]/5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {editingItem?.type === 'debt' ? 'EXCLUIR PLANO COMPLETO' : 'EXCLUIR REGISTRO'}
                </button>
              </>
            ) : (
              <div className="bg-[#DC2626]/5 p-5 rounded-2xl border border-[#DC2626]/20 animate-in zoom-in-95 duration-200">
                <p className="text-[11px] font-bold text-[#DC2626] uppercase tracking-widest text-center mb-4 leading-relaxed">
                  Confirma a exclusão definitiva {editingItem?.type === 'debt' ? 'de todo o plano' : 'deste registro'}?
                </p>
                <div className="flex flex-col gap-2">
                  <button 
                    type="button"
                    disabled={isDeleting}
                    onClick={handleFinalDelete}
                    className="w-full bg-[#DC2626] text-white p-3 rounded-xl font-bold text-xs uppercase hover:bg-[#B91C1C] transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : 'SIM, EXCLUIR AGORA'}
                  </button>
                  <button 
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setIsConfirmingDelete(false)}
                    className="w-full bg-white text-[#64748B] border border-[#E2E8F0] p-3 rounded-xl font-bold text-xs uppercase hover:bg-[#F8FAFC] transition-all"
                  >
                    NÃO, CANCELAR
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </Modal>

      <Modal isOpen={showRevForm} onClose={() => setShowRevForm(false)} title="NOVA RECEITA">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const catId = String(fd.get('category'));
          if (!catId) return;
          await addRevenue({
            description: String(fd.get('desc')),
            value: Number(fd.get('value')),
            date: String(fd.get('date')),
            categoryId: catId,
            status: Status.PENDING,
            isRecurrent: isRevRecurrent,
            frequency: isRevRecurrent ? Frequency.MONTHLY : undefined
          }, isRevRecurrent ? 12 : 1);
          setShowRevForm(false);
        }} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">DESCRIÇÃO</label>
            <input name="desc" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all uppercase" placeholder="SALÁRIO, VENDA, ETC." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">VALOR (R$)</label>
                <input name="value" type="number" step="0.01" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">DATA</label>
                <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">CATEGORIA</label>
            <select name="category" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all uppercase">
                <option value="">SELECIONE...</option>
                {categories.filter(c => c.type === TransactionType.REVENUE).map(c => (
                    <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                ))}
            </select>
          </div>
          <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
            <div className="flex flex-col">
                <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">RECORRÊNCIA MENSAL</span>
                <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest">LANÇAR AUTOMATICAMENTE POR 1 ANO</span>
            </div>
            <Toggle enabled={isRevRecurrent} onChange={setIsRevRecurrent} activeColorClass="bg-[#16A34A]" />
          </div>
          <button type="submit" className="w-full bg-[#2563EB] text-white p-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-md hover:bg-[#1d4ed8] transition-all active:scale-[0.98]">SALVAR RECEITA</button>
        </form>
      </Modal>

      <Modal isOpen={showExpForm} onClose={() => setShowExpForm(false)} title="NOVA DESPESA">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const categoryId = String(fd.get('category'));
          if (!categoryId) return;
          if (isExpInstallment) {
            await addDebt({
              description: String(fd.get('desc')),
              totalValue: Number(fd.get('totalValue')),
              startDate: String(fd.get('startDate')),
              frequency: Frequency.MONTHLY,
              installmentsCount: Number(fd.get('installmentsCount')),
              categoryId
            });
          } else {
            await addExpense({
              description: String(fd.get('desc')),
              value: Number(fd.get('value')),
              dueDate: String(fd.get('dueDate')),
              categoryId,
              paymentMethod: 'PIX',
              status: Status.PENDING,
              isRecurrent: isExpRecurrent,
              frequency: isExpRecurrent ? Frequency.MONTHLY : undefined
            }, isExpRecurrent ? 12 : 1);
          }
          setShowExpForm(false);
        }} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">DESCRIÇÃO</label>
            <input name="desc" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all uppercase" placeholder="MERCADO, ALUGUEL, ETC." />
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">PARCELAR</span>
                  <Toggle enabled={isExpInstallment} onChange={(val) => { setIsExpInstallment(val); if(val) setIsExpRecurrent(false); }} activeColorClass="bg-[#2563EB]" />
              </div>
              {!isExpInstallment && (
                  <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">FIXO</span>
                      <Toggle enabled={isExpRecurrent} onChange={setIsExpRecurrent} activeColorClass="bg-[#DC2626]" />
                  </div>
              )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">{isExpInstallment ? "VALOR TOTAL" : "VALOR"}</label>
                <input name={isExpInstallment ? "totalValue" : "value"} type="number" step="0.01" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" placeholder="0,00" />
            </div>
            {isExpInstallment ? (
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">PARCELAS</label>
                    <input name="installmentsCount" type="number" required placeholder="EX: 12" className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" />
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
            <label className="text-xs font-bold text-[#64748B] uppercase px-0.5">CATEGORIA</label>
            <select name="category" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all uppercase">
                <option value="">SELECIONE...</option>
                {categories.filter(c => c.type === TransactionType.EXPENSE).map(c => (
                    <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                ))}
            </select>
          </div>
          <button type="submit" className="w-full bg-[#0F172A] text-white p-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-md hover:bg-black transition-all active:scale-[0.98]">SALVAR DESPESA</button>
        </form>
      </Modal>

      <Modal isOpen={showUserForm} onClose={() => setShowUserForm(false)} title="PERFIS FAMILIARES">
          <div className="space-y-4">
              {users.map(u => (
                  <button 
                    key={u.id} 
                    onClick={() => { setCurrentUser(u); setShowUserForm(false); }}
                    className={`w-full flex items-center justify-between p-5 rounded-xl border transition-all ${currentUser?.id === u.id ? 'border-[#2563EB] bg-[#2563EB]/5 shadow-sm' : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'}`}
                  >
                      <div className="flex items-center gap-4 text-left">
                          <div className="w-10 h-10 bg-white border border-[#E2E8F0] rounded-full flex items-center justify-center font-bold text-sm text-[#64748B]">{u.nome?.[0]?.toUpperCase()}</div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-[#0F172A] uppercase">{u.nome}</span>
                            <span className="text-[12px] font-normal text-[#64748B]">{u.email}</span>
                          </div>
                      </div>
                      {currentUser?.id === u.id && <div className="w-2.5 h-2.5 bg-[#2563EB] rounded-full"></div>}
                  </button>
              ))}
              <div className="pt-6 border-t border-[#E2E8F0]">
                  <form onSubmit={async (e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      await addUser(String(fd.get('nome')), String(fd.get('email')));
                      e.currentTarget.reset();
                  }} className="space-y-3">
                      <input name="nome" placeholder="NOME DO MEMBRO" required className="w-full bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl outline-none text-sm uppercase" />
                      <input name="email" type="email" placeholder="E-MAIL" required className="w-full bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl outline-none text-sm uppercase" />
                      <button type="submit" className="w-full bg-[#2563EB] text-white p-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#1d4ed8] transition-all">NOVO PERFIL</button>
                  </form>
              </div>
          </div>
      </Modal>
    </Layout>
  );
};

export default App;
