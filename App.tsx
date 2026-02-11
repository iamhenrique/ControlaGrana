
import React, { useState, useMemo } from 'react';
import Layout from './components/Layout';
import { useFinanceStore } from './store';
import ResumoCard from './components/SummaryCards';
import { formatCurrency, getMonthYear } from './utils';
import { Status, TransactionType, Frequency } from './types';

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
          <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wider">{title}</h3>
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
      onClick={() => onChange(!enabled)}
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
    revenues, expenses, debts, installments, categories, isLoaded, 
    users, currentUser, setCurrentUser, addUser,
    addRevenue, addExpense, addDebt,
    toggleExpenseStatus, toggleRevenueStatus
  } = useFinanceStore();

  const [showUserForm, setShowUserForm] = useState(false);
  const [showRevForm, setShowRevForm] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);

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
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const totalRevenue = monthlyRevenues.reduce((acc, r) => acc + r.value, 0);
    const receivedRevenue = monthlyRevenues.filter(r => r.status === Status.PAID).reduce((acc, r) => acc + r.value, 0);
    const totalExpense = monthlyExpenses.reduce((acc, e) => acc + e.value, 0) + monthlyInstallments.reduce((acc, i) => acc + i.value, 0);
    const totalPaid = monthlyExpenses.filter(e => e.status === Status.PAID).reduce((acc, e) => acc + e.value, 0) + monthlyInstallments.filter(i => i.status === Status.PAID).reduce((acc, i) => acc + i.value, 0);

    const recent = [
        ...monthlyRevenues.map(r => ({ ...r, type: 'revenue', sortDate: r.date })),
        ...monthlyExpenses.map(e => ({ ...e, type: 'expense', sortDate: e.dueDate })),
        ...monthlyInstallments.map(i => ({ ...i, description: debts.find(d => d.id === i.debtId)?.description || 'Parcela', type: 'expense', sortDate: i.dueDate }))
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
            <span className="text-[14px] font-semibold text-[#0F172A] tracking-wide">
              {months[selectedMonth]} {selectedYear}
            </span>
        </div>
        <button 
          onClick={() => { if(selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y+1); } else setSelectedMonth(m => m+1); }} 
          className="w-8 h-8 flex items-center justify-center text-[#64748B] hover:text-[#0F172A] transition-colors text-xl"
        >›</button>
      </div>
      <button onClick={() => setShowUserForm(true)} className="flex items-center gap-2 group">
          <span className="hidden sm:inline text-xs font-medium text-[#64748B] group-hover:text-[#0F172A] transition-colors">
            {currentUser?.nome || 'Entrar'}
          </span>
          <div className="w-8 h-8 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-xs font-bold text-[#64748B] group-hover:bg-[#2563EB]/10 group-hover:text-[#2563EB] transition-all">
              {currentUser?.nome?.[0] || '?'}
          </div>
      </button>
    </div>
  );

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E2E8F0] border-t-[#2563EB] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} headerContent={MinimalHeader} headerClassName="bg-white border-b border-[#E2E8F0]">
      
      {/* FAB - BOTÃO FLUTUANTE */}
      {currentUser && (
        <div className="fixed bottom-24 md:bottom-12 right-6 md:right-12 z-[90]">
           {showFabMenu && (
             <div className="absolute bottom-20 right-0 flex flex-col items-end gap-3 animate-in slide-in-from-bottom-4 duration-200">
                <button 
                    onClick={() => { setShowRevForm(true); setShowFabMenu(false); }}
                    className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl shadow-lg border border-[#E2E8F0] text-[#16A34A] font-semibold text-sm hover:bg-[#F8FAFC] transition-all"
                >
                    Receita <span>+</span>
                </button>
                <button 
                    onClick={() => { setIsExpInstallment(false); setShowExpForm(true); setShowFabMenu(false); }}
                    className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl shadow-lg border border-[#E2E8F0] text-[#DC2626] font-semibold text-sm hover:bg-[#F8FAFC] transition-all"
                >
                    Despesa <span>-</span>
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
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
          {!currentUser && (
            <div className="bg-white p-10 rounded-2xl border border-[#E2E8F0] text-center">
               <p className="text-sm font-medium text-[#64748B]">Selecione um perfil para visualizar seus dados.</p>
            </div>
          )}
          
          <ResumoCard 
            title="Saldo Total" 
            isHero
            totalValue={filteredData.finalBalance} 
            subValues={[
                { label: 'Total Receitas', value: filteredData.totalRevenue },
                { label: 'Total Despesas', value: filteredData.totalExpense }
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ResumoCard 
              title="Já Recebido" 
              totalValue={filteredData.receivedRevenue} 
              accentColor="text-[#16A34A]" 
            />
            <ResumoCard 
              title="Já Pago" 
              totalValue={filteredData.totalPaid} 
              accentColor="text-[#DC2626]" 
            />
          </div>

          <div className="pt-4">
             <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wider">Últimas Transações</h3>
                <button onClick={() => setActiveTab('transactions')} className="text-xs font-semibold text-[#2563EB] hover:underline">Ver todas</button>
             </div>
             
             <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
                {filteredData.recent.length === 0 ? (
                    <div className="p-10 text-center text-sm font-medium text-[#64748B]">Nenhuma transação recente.</div>
                ) : (
                    <div className="divide-y divide-[#E2E8F0]">
                        {filteredData.recent.map((item: any, idx) => (
                            <div key={idx} className="flex items-center justify-between p-5 hover:bg-[#F8FAFC] transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${item.type === 'revenue' ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-[#DC2626]/10 text-[#DC2626]'}`}>
                                        {item.type === 'revenue' ? '↑' : '↓'}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-[#0F172A]">{item.description}</span>
                                        <span className="text-xs font-normal text-[#64748B]">{new Date(item.sortDate).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                </div>
                                <span className={`text-sm font-semibold ${item.type === 'revenue' ? 'text-[#16A34A]' : 'text-[#0F172A]'}`}>
                                    {item.type === 'revenue' ? '+' : '-'}{formatCurrency(item.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-10 animate-in slide-in-from-right-4 max-w-4xl mx-auto">
          <div className="space-y-4">
             <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wider px-1">Receitas</h3>
             <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm divide-y divide-[#E2E8F0]">
                 {filteredData.monthlyRevenues.map(rev => (
                   <div key={rev.id} className="p-5 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors">
                      <div className="flex items-center gap-4">
                         <span className="text-xs font-medium text-[#64748B] w-10">{new Date(rev.date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</span>
                         <div className="flex flex-col">
                            <span className="text-sm font-medium text-[#0F172A]">{rev.description}</span>
                         </div>
                      </div>
                      <div className="flex items-center gap-6">
                         <span className="text-sm font-semibold text-[#16A34A]">{formatCurrency(rev.value)}</span>
                         <button 
                            onClick={() => toggleRevenueStatus(rev.id)}
                            className={`w-9 h-5 rounded-full transition-all border ${rev.status === Status.PAID ? 'bg-[#16A34A] border-[#16A34A]' : 'bg-[#E2E8F0] border-[#E2E8F0]'}`}
                         ></button>
                      </div>
                   </div>
                 ))}
                 {filteredData.monthlyRevenues.length === 0 && <div className="p-10 text-center text-sm font-medium text-[#64748B]">Sem receitas este mês.</div>}
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wider px-1">Despesas</h3>
             <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm divide-y divide-[#E2E8F0]">
                 {filteredData.monthlyExpenses.map(exp => (
                   <div key={exp.id} className="p-5 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors">
                      <div className="flex items-center gap-4">
                         <span className="text-xs font-medium text-[#64748B] w-10">{new Date(exp.dueDate).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</span>
                         <div className="flex flex-col">
                            <span className="text-sm font-medium text-[#0F172A]">{exp.description}</span>
                         </div>
                      </div>
                      <div className="flex items-center gap-6">
                         <span className="text-sm font-semibold text-[#0F172A]">{formatCurrency(exp.value)}</span>
                         <button 
                            onClick={() => toggleExpenseStatus(exp.id)}
                            className={`w-9 h-5 rounded-full transition-all border ${exp.status === Status.PAID ? 'bg-[#DC2626] border-[#DC2626]' : 'bg-[#E2E8F0] border-[#E2E8F0]'}`}
                         ></button>
                      </div>
                   </div>
                 ))}
                 {filteredData.monthlyExpenses.length === 0 && <div className="p-10 text-center text-sm font-medium text-[#64748B]">Sem despesas este mês.</div>}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'debts' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in slide-in-from-right-4 max-w-4xl mx-auto">
             {filteredData.monthlyInstallments.map(inst => {
               const debt = debts.find(d => d.id === inst.debtId);
               return (
                 <div key={inst.id} className="p-6 rounded-2xl border border-[#E2E8F0] bg-white flex flex-col justify-between hover:border-[#2563EB] transition-all shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                       <div className="flex flex-col">
                          <span className="text-[12px] font-normal text-[#64748B] mb-1">{new Date(inst.dueDate).toLocaleDateString('pt-BR')}</span>
                          <span className="text-sm font-semibold text-[#0F172A]">{debt?.description}</span>
                          <span className="text-[12px] font-medium text-[#2563EB] mt-2 bg-[#2563EB]/5 px-2 py-0.5 rounded-full w-fit">Parc. {inst.installmentNumber}/{debt?.installmentsCount}</span>
                       </div>
                       <span className="text-sm font-semibold text-[#0F172A]">{formatCurrency(inst.value)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-[#F8FAFC]">
                       <span className={`text-[12px] font-semibold tracking-wide ${inst.status === Status.PAID ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                          {inst.status === Status.PAID ? 'LIQUIDADO' : 'PENDENTE'}
                       </span>
                    </div>
                 </div>
               );
             })}
             {filteredData.monthlyInstallments.length === 0 && (
               <div className="sm:col-span-2 py-16 text-center text-sm font-medium text-[#64748B] bg-white rounded-2xl border border-dashed border-[#E2E8F0]">Nenhum parcelamento ativo.</div>
             )}
        </div>
      )}

      {/* MODAL RECEITA */}
      <Modal isOpen={showRevForm} onClose={() => setShowRevForm(false)} title="Nova Receita">
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const catId = String(fd.get('category'));
          if (!catId) return;
          addRevenue({
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
            <label className="text-xs font-semibold text-[#64748B] uppercase px-0.5">Descrição</label>
            <input name="desc" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" placeholder="Salário, Venda, etc." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#64748B] uppercase px-0.5">Valor (R$)</label>
                <input name="value" type="number" step="0.01" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#64748B] uppercase px-0.5">Data</label>
                <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#64748B] uppercase px-0.5">Categoria</label>
            <select name="category" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all">
                <option value="">Selecione...</option>
                {categories.filter(c => c.type === TransactionType.REVENUE).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </div>
          <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
            <div className="flex flex-col">
                <span className="text-sm font-semibold text-[#0F172A]">Recorrência</span>
                <span className="text-[11px] font-normal text-[#64748B]">Lançar mensalmente por 1 ano</span>
            </div>
            <Toggle enabled={isRevRecurrent} onChange={setIsRevRecurrent} activeColorClass="bg-[#16A34A]" />
          </div>
          <button type="submit" className="w-full bg-[#2563EB] text-white p-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-md hover:bg-[#1d4ed8] transition-all active:scale-[0.98]">Salvar Receita</button>
        </form>
      </Modal>

      {/* MODAL DESPESA */}
      <Modal isOpen={showExpForm} onClose={() => setShowExpForm(false)} title="Nova Despesa">
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const categoryId = String(fd.get('category'));
          if (!categoryId) return;

          if (isExpInstallment) {
            addDebt({
              description: String(fd.get('desc')),
              totalValue: Number(fd.get('totalValue')),
              startDate: String(fd.get('startDate')),
              frequency: Frequency.MONTHLY,
              installmentsCount: Number(fd.get('installmentsCount')),
              categoryId
            });
          } else {
            addExpense({
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
            <label className="text-xs font-semibold text-[#64748B] uppercase px-0.5">Descrição</label>
            <input name="desc" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" placeholder="Mercado, Aluguel, etc." />
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <span className="text-sm font-semibold text-[#0F172A]">Parcelar</span>
                  <Toggle enabled={isExpInstallment} onChange={(val) => { setIsExpInstallment(val); if(val) setIsExpRecurrent(false); }} activeColorClass="bg-[#2563EB]" />
              </div>
              {!isExpInstallment && (
                  <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-sm font-semibold text-[#0F172A]">Fixo</span>
                      <Toggle enabled={isExpRecurrent} onChange={setIsExpRecurrent} activeColorClass="bg-[#DC2626]" />
                  </div>
              )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#64748B] uppercase px-0.5">{isExpInstallment ? "Total" : "Valor"}</label>
                <input name={isExpInstallment ? "totalValue" : "value"} type="number" step="0.01" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" placeholder="0,00" />
            </div>
            {isExpInstallment ? (
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#64748B] uppercase px-0.5">Parcelas</label>
                    <input name="installmentsCount" type="number" required placeholder="Ex: 12" className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" />
                </div>
            ) : (
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#64748B] uppercase px-0.5">Vencimento</label>
                    <input name="dueDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" />
                </div>
            )}
          </div>
          {isExpInstallment && (
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#64748B] uppercase px-0.5">Primeira Parcela</label>
                <input name="startDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all" />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#64748B] uppercase px-0.5">Categoria</label>
            <select name="category" required className="w-full bg-[#F8FAFC] p-3 rounded-xl outline-none text-sm border border-[#E2E8F0] focus:border-[#2563EB] transition-all">
                <option value="">Selecione...</option>
                {categories.filter(c => c.type === TransactionType.EXPENSE).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </div>
          <button type="submit" className="w-full bg-[#0F172A] text-white p-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-md hover:bg-black transition-all active:scale-[0.98]">Salvar Despesa</button>
        </form>
      </Modal>

      {/* MODAL PERFIS */}
      <Modal isOpen={showUserForm} onClose={() => setShowUserForm(false)} title="Perfis Familiares">
          <div className="space-y-4">
              {users.map(u => (
                  <button 
                    key={u.id} 
                    onClick={() => { setCurrentUser(u); setShowUserForm(false); }}
                    className={`w-full flex items-center justify-between p-5 rounded-xl border transition-all ${currentUser?.id === u.id ? 'border-[#2563EB] bg-[#2563EB]/5 shadow-sm' : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'}`}
                  >
                      <div className="flex items-center gap-4 text-left">
                          <div className="w-10 h-10 bg-white border border-[#E2E8F0] rounded-full flex items-center justify-center font-bold text-sm text-[#64748B]">{u.nome[0]}</div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-[#0F172A]">{u.nome}</span>
                            <span className="text-[12px] font-normal text-[#64748B]">{u.email}</span>
                          </div>
                      </div>
                      {currentUser?.id === u.id && <div className="w-2.5 h-2.5 bg-[#2563EB] rounded-full"></div>}
                  </button>
              ))}
              <div className="pt-6 border-t border-[#E2E8F0]">
                  <form onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      addUser(String(fd.get('nome')), String(fd.get('email')));
                      e.currentTarget.reset();
                  }} className="space-y-3">
                      <input name="nome" placeholder="NOME DO MEMBRO" required className="w-full bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl outline-none text-sm" />
                      <input name="email" type="email" placeholder="E-MAIL" required className="w-full bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl outline-none text-sm" />
                      <button type="submit" className="w-full bg-[#2563EB] text-white p-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#1d4ed8] transition-all">Novo Perfil</button>
                  </form>
              </div>
          </div>
      </Modal>
    </Layout>
  );
};

export default App;
