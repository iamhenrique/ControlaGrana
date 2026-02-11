
import React, { useState, useMemo } from 'react';
import Layout from './components/Layout';
import { useFinanceStore } from './store';
import ResumoCard from './components/SummaryCards';
import { formatCurrency, getMonthYear } from './utils';
import { Status, TransactionType, Frequency } from './types';
import { GoogleGenAI } from "@google/genai";

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em]">{title}</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors">✕</button>
        </div>
        <div className="p-8 max-h-[80vh] overflow-y-auto hide-scrollbar">{children}</div>
      </div>
    </div>
  );
};

const Toggle = ({ enabled, onChange, activeColorClass }: { enabled: boolean, onChange: (val: boolean) => void, activeColorClass: string }) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enabled ? activeColorClass : 'bg-slate-200'}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const { 
    revenues, expenses, debts, installments, categories, budgets, isLoaded, 
    users, currentUser, setCurrentUser, addUser, setBudget,
    addRevenue, addExpense, addDebt, toggleExpenseStatus, toggleRevenueStatus
  } = useFinanceStore();

  const [showRevForm, setShowRevForm] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);

  const [isRevRecurrent, setIsRevRecurrent] = useState(false);
  const [isExpRecurrent, setIsExpRecurrent] = useState(false);
  const [isExpInstallment, setIsExpInstallment] = useState(false);

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const filteredData = useMemo(() => {
    const monthStr = `${selectedMonth + 1}-${selectedYear}`;
    const userRevenues = revenues.filter(r => r.userId === currentUser?.id);
    const userExpenses = expenses.filter(e => e.userId === currentUser?.id);
    const userBudgets = budgets.filter(b => b.userId === currentUser?.id && b.month === selectedMonth && b.year === selectedYear);

    const monthlyRevenues = userRevenues.filter(r => getMonthYear(r.date) === monthStr);
    const monthlyExpenses = userExpenses.filter(e => getMonthYear(e.dueDate) === monthStr);
    const monthlyInstallments = installments.filter(i => {
        const d = debts.find(d => d.id === i.debtId);
        return d?.userId === currentUser?.id && getMonthYear(i.dueDate) === monthStr;
    });

    const totalRevenue = monthlyRevenues.reduce((acc, r) => acc + r.value, 0);
    const receivedRevenue = monthlyRevenues.filter(r => r.status === Status.PAID).reduce((acc, r) => acc + r.value, 0);
    const totalExpense = monthlyExpenses.reduce((acc, e) => acc + e.value, 0) + monthlyInstallments.reduce((acc, i) => acc + i.value, 0);
    const totalPaid = monthlyExpenses.filter(e => e.status === Status.PAID).reduce((acc, e) => acc + e.value, 0) + monthlyInstallments.filter(i => i.status === Status.PAID).reduce((acc, i) => acc + i.value, 0);

    const categoryStats = categories
        .filter(cat => cat.type === TransactionType.EXPENSE)
        .map(cat => {
            const current = monthlyExpenses.filter(e => e.categoryId === cat.id).reduce((acc, e) => acc + e.value, 0) +
                           monthlyInstallments.filter(i => {
                               const d = debts.find(d => d.id === i.debtId);
                               return d?.categoryId === cat.id;
                           }).reduce((acc, i) => acc + i.value, 0);
            const budget = userBudgets.find(b => b.categoryId === cat.id)?.limitValue || 0;
            return { name: cat.name, current, budget, id: cat.id };
        })
        .filter(s => s.current > 0 || s.budget > 0)
        .sort((a, b) => b.current - a.current);

    return {
      totalRevenue, receivedRevenue, totalExpense, totalPaid,
      finalBalance: totalRevenue - totalExpense,
      monthlyRevenues, monthlyExpenses, monthlyInstallments, categoryStats, userBudgets
    };
  }, [revenues, expenses, installments, categories, budgets, currentUser, selectedMonth, selectedYear]);

  const generateAIInsight = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const overBudgets = filteredData.categoryStats.filter(c => c.budget > 0 && c.current > c.budget);
      
      const prompt = `Analise os dados financeiros de ${currentUser?.nome || 'Membro'}:
      Mês: ${months[selectedMonth]}/${selectedYear}
      Receitas: ${formatCurrency(filteredData.totalRevenue)}
      Despesas: ${formatCurrency(filteredData.totalExpense)}
      Metas Estouradas: ${overBudgets.map(c => `${c.name} (${formatCurrency(c.current)} / Meta: ${formatCurrency(c.budget)})`).join(', ') || 'Nenhuma'}.
      
      Você é um Mentor Financeiro de elite. Dê uma análise sarcástica, porém extremamente útil e motivadora em até 160 caracteres. Foco em disciplina e orçamentos.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });

      setAiInsight(response.text || "Continue monitorando seu fluxo de caixa!");
    } catch (error) {
      setAiInsight("O silêncio é de ouro, mas o controle financeiro é de diamante. Organize-se!");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const VisaoGeralHeader = (
    <div className="bg-[#2196F3] text-white p-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <button onClick={() => { if(selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y-1); } else setSelectedMonth(m => m-1); setAiInsight(null); }} className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-all text-xl font-bold">‹</button>
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em]">{months[selectedMonth]} {selectedYear}</h2>
        <button onClick={() => { if(selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y+1); } else setSelectedMonth(m => m+1); setAiInsight(null); }} className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-all text-xl font-bold">›</button>
      </div>
      <button onClick={() => setShowUserForm(true)} className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl hover:bg-white/20 transition-all border border-white/10">
          <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-[8px] font-black opacity-50 uppercase tracking-tighter">Membro</span>
              <span className="text-xs font-black truncate max-w-[100px] uppercase">{currentUser?.nome || '...'}</span>
          </div>
          <div className="w-8 h-8 bg-white text-indigo-600 rounded-full flex items-center justify-center font-black text-[10px] uppercase">
              {currentUser?.nome?.[0] || 'U'}
          </div>
      </button>
    </div>
  );

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-1 w-32 bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-600 animate-[loading_1.5s_infinite_linear]"></div>
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em]">Carregando ControlaGrana</span>
        </div>
        <style>{`@keyframes loading { 0% { width: 0; margin-left: 0; } 50% { width: 50%; margin-left: 25%; } 100% { width: 0; margin-left: 100%; } }`}</style>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} headerContent={VisaoGeralHeader} headerClassName="bg-[#2196F3]">
      {activeTab === 'dashboard' && (
        <div className="p-6 md:p-10 space-y-10 animate-in fade-in duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ResumoCard title="Receitas" totalValue={filteredData.totalRevenue} subValues={[{ label: 'Entradas', value: filteredData.receivedRevenue }, { label: 'Esperado', value: filteredData.totalRevenue }]} accentColor="text-emerald-500" headerAction={<button onClick={() => setShowRevForm(true)} className="w-8 h-8 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-100 hover:rotate-90 transition-all font-black text-xl flex items-center justify-center">+</button>} />
            <ResumoCard title="Despesas" totalValue={filteredData.totalExpense} subValues={[{ label: 'Liquidados', value: filteredData.totalPaid }, { label: 'Compromissos', value: filteredData.totalExpense }]} accentColor="text-rose-500" headerAction={<button onClick={() => { setIsExpInstallment(false); setShowExpForm(true); }} className="w-8 h-8 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-100 hover:rotate-90 transition-all font-black text-xl flex items-center justify-center">+</button>} />
            <ResumoCard title="Saldo Previsto" totalValue={filteredData.finalBalance} subValues={[{ label: 'Real Hoje', value: filteredData.receivedRevenue - filteredData.totalPaid }]} accentColor="text-indigo-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Performance de Orçamento</h3>
                </div>
                <div className="space-y-8">
                    {filteredData.categoryStats.slice(0, 5).map(cat => {
                        const percent = cat.budget > 0 ? Math.min((cat.current / cat.budget) * 100, 100) : 0;
                        const isOver = cat.budget > 0 && cat.current > cat.budget;
                        return (
                            <div key={cat.id}>
                                <div className="flex justify-between items-end mb-3">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{cat.name}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{formatCurrency(cat.current)} de {cat.budget > 0 ? formatCurrency(cat.budget) : 'ILIMITADO'}</span>
                                    </div>
                                    <span className={`text-[10px] font-black ${isOver ? 'text-rose-500' : 'text-slate-500'}`}>{percent.toFixed(0)}%</span>
                                </div>
                                <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden p-0.5">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-rose-500' : 'bg-indigo-600'}`} style={{ width: `${percent}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredData.categoryStats.length === 0 && (
                        <div className="py-20 text-center opacity-30">
                            <span className="text-sm font-black uppercase tracking-[0.3em]">Nenhuma atividade registrada</span>
                        </div>
                    )}
                </div>
              </div>
            </div>

            <div>
                <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-white flex flex-col justify-between h-full min-h-[450px] relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-600/20 blur-3xl group-hover:bg-indigo-600/40 transition-all duration-700"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-900/50">🧠</div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Smart Insights</h3>
                        </div>
                        {isAnalyzing ? (
                            <div className="space-y-6">
                                <div className="h-2 bg-white/10 rounded-full w-full animate-pulse"></div>
                                <div className="h-2 bg-white/10 rounded-full w-5/6 animate-pulse"></div>
                                <div className="h-2 bg-white/10 rounded-full w-4/6 animate-pulse"></div>
                            </div>
                        ) : aiInsight ? (
                            <div className="animate-in slide-in-from-top-4">
                                <p className="text-sm leading-relaxed font-bold italic text-indigo-100/90">"{aiInsight}"</p>
                                <div className="mt-6 pt-6 border-t border-white/5">
                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Gerado por Gemini Pro</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs font-bold text-slate-400 uppercase leading-relaxed tracking-wider">Clique no botão abaixo para permitir que a IA analise seus hábitos de {months[selectedMonth]}.</p>
                        )}
                    </div>
                    <button 
                        onClick={generateAIInsight}
                        disabled={isAnalyzing}
                        className="w-full bg-white text-slate-900 py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.4em] shadow-2xl hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-20 mt-10"
                    >
                        {isAnalyzing ? 'Processando...' : 'Consultar Oráculo'}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS REUTILIZADOS COM VISUAL PREMIUM */}
      <Modal isOpen={showUserForm} onClose={() => setShowUserForm(false)} title="Membros da Família">
          <div className="space-y-8">
              <div className="space-y-3">
                  {users.map(u => (
                      <button 
                        key={u.id} 
                        onClick={() => { setCurrentUser(u); setShowUserForm(false); }}
                        className={`w-full flex items-center justify-between p-5 rounded-3xl border-2 transition-all ${currentUser?.id === u.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-50 bg-slate-50'}`}
                      >
                          <div className="flex items-center gap-5">
                              <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xs">{u.nome[0]}</div>
                              <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{u.nome}</span>
                          </div>
                          {currentUser?.id === u.id && <span className="text-indigo-600 text-lg font-black">✓</span>}
                      </button>
                  ))}
              </div>
              <div className="pt-8 border-t border-slate-50 space-y-4">
                  <form onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      addUser(String(fd.get('nome')).toUpperCase(), String(fd.get('email')).toLowerCase());
                      e.currentTarget.reset();
                  }} className="space-y-4">
                      <input name="nome" placeholder="NOME COMPLETO" required className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase tracking-widest" />
                      <input name="email" type="email" placeholder="E-MAIL" required className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] tracking-widest" />
                      <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-black transition-all">Cadastrar Membro</button>
                  </form>
              </div>
          </div>
      </Modal>

      {/* BUDGETS, TRANSACTIONS ETC... */}
      {activeTab === 'budgets' && (
        <div className="p-10 animate-in slide-in-from-right-8 duration-500 space-y-10">
          <div className="flex items-center justify-between">
              <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Gestão de Metas</h2>
                  <p className="text-[9px] font-black text-slate-400 uppercase mt-2 tracking-[0.3em]">Limite seus gastos por categoria</p>
              </div>
              <button onClick={() => setShowBudgetForm(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 transition-all">Definir Orçamento</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {categories.filter(c => c.type === TransactionType.EXPENSE).map(cat => {
                  const budget = filteredData.userBudgets.find(b => b.categoryId === cat.id);
                  return (
                      <div key={cat.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-all group">
                          <div className="flex justify-between items-start mb-6">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat.name}</span>
                              <span className="text-xl group-hover:scale-125 transition-transform">🎯</span>
                          </div>
                          <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-300 uppercase mb-2">Teto Mensal</span>
                              <span className="text-xl font-black text-slate-900 tracking-tight">{budget ? formatCurrency(budget.limitValue) : 'NÃO DEFINIDO'}</span>
                          </div>
                      </div>
                  );
              })}
          </div>
        </div>
      )}

      {/* FORMULÁRIO DE BUDGET */}
      <Modal isOpen={showBudgetForm} onClose={() => setShowBudgetForm(false)} title="Planejar Orçamento">
          <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setBudget(String(fd.get('category')), Number(fd.get('limit')), selectedMonth, selectedYear);
              setShowBudgetForm(false);
          }} className="space-y-8">
              <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">Categoria</label>
                  <select name="category" className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase">
                      {categories.filter(c => c.type === TransactionType.EXPENSE).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
              </div>
              <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">Limite de Gasto</label>
                  <input name="limit" type="number" step="0.01" required className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase" placeholder="R$ 0,00" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl hover:bg-indigo-700 transition-all">Confirmar Meta</button>
          </form>
      </Modal>

      {/* MODALS DE TRANSAÇÃO (ADAPTADOS) */}
      <Modal isOpen={showRevForm} onClose={() => setShowRevForm(false)} title="Nova Entrada">
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          addRevenue({
            description: String(fd.get('desc')).toUpperCase(),
            value: Number(fd.get('value')),
            date: String(fd.get('date')),
            categoryId: String(fd.get('category')),
            status: Status.PENDING,
            isRecurrent: isRevRecurrent,
            frequency: isRevRecurrent ? (fd.get('freq') as Frequency) : undefined
          }, isRevRecurrent ? Number(fd.get('reps')) : 1);
          setShowRevForm(false);
          setIsRevRecurrent(false);
        }} className="space-y-6">
          <input name="desc" type="text" required className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase" placeholder="Descrição" />
          <input name="value" type="number" step="0.01" required className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase" placeholder="Valor (R$)" />
          <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase" />
          <select name="category" className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase">
                {categories.filter(c => c.type === TransactionType.REVENUE).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
          </select>
          <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Fixo Mensal</span>
            <Toggle enabled={isRevRecurrent} onChange={setIsRevRecurrent} activeColorClass="bg-emerald-500" />
          </div>
          <button type="submit" className="w-full bg-emerald-500 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl">Salvar Receita</button>
        </form>
      </Modal>

      <Modal isOpen={showExpForm} onClose={() => setShowExpForm(false)} title="Novo Gasto">
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const categoryId = String(fd.get('category'));
          if (isExpInstallment) {
            addDebt({
              description: String(fd.get('desc')).toUpperCase(),
              totalValue: Number(fd.get('totalValue')),
              startDate: String(fd.get('startDate')),
              frequency: Frequency.MONTHLY,
              installmentsCount: Number(fd.get('installmentsCount')),
              categoryId
            });
          } else {
            addExpense({
              description: String(fd.get('desc')).toUpperCase(),
              value: Number(fd.get('value')),
              dueDate: String(fd.get('dueDate')),
              categoryId,
              paymentMethod: 'PIX',
              status: Status.PENDING,
              isRecurrent: isExpRecurrent,
              frequency: isExpRecurrent ? Frequency.MONTHLY : undefined
            }, isExpRecurrent ? Number(fd.get('reps')) : 1);
          }
          setShowExpForm(false);
          setIsExpRecurrent(false);
          setIsExpInstallment(false);
        }} className="space-y-6">
          <input name="desc" type="text" required className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase" placeholder="O que você pagou?" />
          <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-500 uppercase">Parcelado</span>
                  <Toggle enabled={isExpInstallment} onChange={(val) => { setIsExpInstallment(val); if(val) setIsExpRecurrent(false); }} activeColorClass="bg-indigo-600" />
              </div>
              {!isExpInstallment && (
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[9px] font-black text-slate-500 uppercase">Fixo</span>
                      <Toggle enabled={isExpRecurrent} onChange={setIsExpRecurrent} activeColorClass="bg-rose-500" />
                  </div>
              )}
          </div>
          <div className="space-y-4">
              <input name={isExpInstallment ? "totalValue" : "value"} type="number" step="0.01" required placeholder={isExpInstallment ? "VALOR TOTAL" : "VALOR (R$)"} className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase" />
              {isExpInstallment && <input name="installmentsCount" type="number" required placeholder="Nº DE PARCELAS" className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase" />}
              <input name={isExpInstallment ? "startDate" : "dueDate"} type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase" />
          </div>
          <select name="category" className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase">
                {categories.filter(c => c.type === TransactionType.EXPENSE).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
          </select>
          <button type="submit" className="w-full bg-rose-500 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl">Registrar Gasto</button>
        </form>
      </Modal>
    </Layout>
  );
};

export default App;
