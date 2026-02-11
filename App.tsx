
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
      
      const prompt = `Mentor Financeiro ControlaGrana
      Usuário: ${currentUser?.nome || 'Usuário'}
      Snapshot: Receitas ${formatCurrency(filteredData.totalRevenue)} | Despesas ${formatCurrency(filteredData.totalExpense)}
      Status de Metas: ${overBudgets.length > 0 ? `Estourou em ${overBudgets.map(c => c.name).join(', ')}` : 'Todas as metas dentro do limite'}.
      
      Instrução: Dê um diagnóstico financeiro curto (máx 140 chars), seja direto, use um tom de CFO experiente.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });

      setAiInsight(response.text || "Continue monitorando seus orçamentos mensalmente.");
    } catch (error) {
      setAiInsight("Mantenha o foco nos seus objetivos financeiros. A disciplina é a chave.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const VisaoGeralHeader = (
    <div className="bg-[#2196F3] text-white p-4 md:px-8 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-6">
        <button onClick={() => { if(selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y-1); } else setSelectedMonth(m => m-1); setAiInsight(null); }} className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-all text-xl font-black">‹</button>
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em]">{months[selectedMonth]} {selectedYear}</h2>
        <button onClick={() => { if(selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y+1); } else setSelectedMonth(m => m+1); setAiInsight(null); }} className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-all text-xl font-black">›</button>
      </div>
      <button onClick={() => setShowUserForm(true)} className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl hover:bg-white/20 transition-all border border-white/10 group">
          <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-[8px] font-black opacity-50 uppercase tracking-tighter">Membro Família</span>
              <span className="text-xs font-black truncate max-w-[120px] uppercase tracking-wider">{currentUser?.nome || 'SELECIONAR'}</span>
          </div>
          <div className="w-9 h-9 bg-white text-indigo-600 rounded-2xl flex items-center justify-center font-black text-sm uppercase group-hover:rotate-6 transition-transform">
              {currentUser?.nome?.[0] || '?'}
          </div>
      </button>
    </div>
  );

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-1 w-48 bg-slate-200 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-600 animate-[loading_1s_infinite_linear]"></div>
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.6em] animate-pulse">Sincronizando Sistema Financeiro</span>
        </div>
        <style>{`@keyframes loading { 0% { width: 0; margin-left: 0; } 50% { width: 70%; margin-left: 15%; } 100% { width: 0; margin-left: 100%; } }`}</style>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} headerContent={VisaoGeralHeader} headerClassName="bg-[#2196F3]">
      {activeTab === 'dashboard' && (
        <div className="p-6 md:p-10 space-y-10 animate-in fade-in duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ResumoCard title="Receitas" totalValue={filteredData.totalRevenue} subValues={[{ label: 'Garantido', value: filteredData.receivedRevenue }, { label: 'Estimado', value: filteredData.totalRevenue }]} accentColor="text-emerald-500" headerAction={<button onClick={() => setShowRevForm(true)} className="w-8 h-8 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-100 hover:rotate-90 transition-all font-black text-xl flex items-center justify-center">+</button>} />
            <ResumoCard title="Despesas" totalValue={filteredData.totalExpense} subValues={[{ label: 'Efetuado', value: filteredData.totalPaid }, { label: 'Provisionado', value: filteredData.totalExpense }]} accentColor="text-rose-500" headerAction={<button onClick={() => { setIsExpInstallment(false); setShowExpForm(true); }} className="w-8 h-8 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-100 hover:rotate-90 transition-all font-black text-xl flex items-center justify-center">+</button>} />
            <ResumoCard title="Saldo Projetado" totalValue={filteredData.finalBalance} subValues={[{ label: 'Saldo Real', value: filteredData.receivedRevenue - filteredData.totalPaid }]} accentColor="text-indigo-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Saúde do Orçamento</h3>
                </div>
                <div className="space-y-8">
                    {filteredData.categoryStats.slice(0, 6).map(cat => {
                        const percent = cat.budget > 0 ? Math.min((cat.current / cat.budget) * 100, 100) : 0;
                        const isOver = cat.budget > 0 && cat.current > cat.budget;
                        return (
                            <div key={cat.id}>
                                <div className="flex justify-between items-end mb-3">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{cat.name}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{formatCurrency(cat.current)} de {cat.budget > 0 ? formatCurrency(cat.budget) : 'META LIVRE'}</span>
                                    </div>
                                    <span className={`text-[10px] font-black ${isOver ? 'text-rose-500' : 'text-slate-500'}`}>{percent.toFixed(0)}%</span>
                                </div>
                                <div className="h-3 bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-rose-500' : 'bg-indigo-600'}`} style={{ width: `${percent}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredData.categoryStats.length === 0 && (
                        <div className="py-20 text-center">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Nenhum registro para exibir</span>
                        </div>
                    )}
                </div>
              </div>
            </div>

            <div>
                <div className="bg-[#1A1A1A] p-10 rounded-[3rem] shadow-2xl text-white flex flex-col justify-between h-full min-h-[480px] relative overflow-hidden group border border-white/5">
                    <div className="absolute -top-10 -right-10 w-48 h-48 bg-indigo-500/10 blur-[80px] group-hover:bg-indigo-500/20 transition-all duration-1000"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 bg-indigo-600 rounded-[1.2rem] flex items-center justify-center shadow-2xl shadow-indigo-900/40 text-2xl">⚡</div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Smart CFO AI</h3>
                        </div>
                        {isAnalyzing ? (
                            <div className="space-y-6">
                                <div className="h-2.5 bg-white/5 rounded-full w-full animate-pulse"></div>
                                <div className="h-2.5 bg-white/5 rounded-full w-4/5 animate-pulse"></div>
                                <div className="h-2.5 bg-white/5 rounded-full w-3/5 animate-pulse"></div>
                            </div>
                        ) : aiInsight ? (
                            <div className="animate-in slide-in-from-top-4 duration-500">
                                <p className="text-base leading-relaxed font-bold italic text-white/90">"{aiInsight}"</p>
                                <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></div>
                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Análise em tempo real: Gemini Pro</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs font-bold text-slate-500 uppercase leading-relaxed tracking-widest">Solicite uma auditoria completa baseada em seus gastos e metas do mês atual.</p>
                        )}
                    </div>
                    <button 
                        onClick={generateAIInsight}
                        disabled={isAnalyzing}
                        className="w-full bg-white text-black py-5 rounded-[1.8rem] font-black uppercase text-[10px] tracking-[0.4em] shadow-2xl hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-20 mt-12"
                    >
                        {isAnalyzing ? 'Processando Dados...' : 'Gerar Insight'}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'budgets' && (
        <div className="p-10 animate-in slide-in-from-right-8 duration-500 space-y-12">
          <div className="flex items-center justify-between">
              <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Metas de Consumo</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-3 tracking-[0.3em]">Planeje limites mensais para cada categoria</p>
              </div>
              <button onClick={() => setShowBudgetForm(true)} className="bg-indigo-600 text-white px-10 py-5 rounded-[1.8rem] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-indigo-100 hover:scale-105 transition-all">Definir Orçamento</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {categories.filter(c => c.type === TransactionType.EXPENSE).map(cat => {
                  const budget = filteredData.userBudgets.find(b => b.categoryId === cat.id);
                  return (
                      <div key={cat.id} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:border-indigo-400 transition-all group relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 -mr-12 -mt-12 rounded-full group-hover:bg-indigo-50 transition-colors"></div>
                          <div className="flex justify-between items-start mb-8 relative z-10">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat.name}</span>
                              <span className="text-2xl opacity-40 group-hover:opacity-100 transition-opacity">📈</span>
                          </div>
                          <div className="flex flex-col relative z-10">
                              <span className="text-[9px] font-black text-slate-300 uppercase mb-3 tracking-tighter">Teto Autorizado</span>
                              <span className="text-2xl font-black text-slate-900 tracking-tight">{budget ? formatCurrency(budget.limitValue) : 'NÃO CONFIGURADO'}</span>
                          </div>
                      </div>
                  );
              })}
          </div>
        </div>
      )}

      {/* FORMULÁRIO DE ORÇAMENTO */}
      <Modal isOpen={showBudgetForm} onClose={() => setShowBudgetForm(false)} title="Planejamento de Categoria">
          <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setBudget(String(fd.get('category')), Number(fd.get('limit')), selectedMonth, selectedYear);
              setShowBudgetForm(false);
          }} className="space-y-8">
              <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em]">Selecione a Categoria</label>
                  <select name="category" className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase cursor-pointer">
                      {categories.filter(c => c.type === TransactionType.EXPENSE).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
              </div>
              <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em]">Teto Mensal (R$)</label>
                  <input name="limit" type="number" step="0.01" required className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase" placeholder="0.00" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white p-6 rounded-2xl font-black uppercase text-[10px] tracking-[0.4em] shadow-2xl hover:bg-indigo-700 transition-all">Salvar Meta</button>
          </form>
      </Modal>

      {/* GESTÃO DE USUÁRIO */}
      <Modal isOpen={showUserForm} onClose={() => setShowUserForm(false)} title="Membros ControlaGrana">
          <div className="space-y-8">
              <div className="space-y-4">
                  {users.map(u => (
                      <button 
                        key={u.id} 
                        onClick={() => { setCurrentUser(u); setShowUserForm(false); }}
                        className={`w-full flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all ${currentUser?.id === u.id ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-50 bg-slate-50'}`}
                      >
                          <div className="flex items-center gap-5">
                              <div className="w-12 h-12 bg-indigo-600 text-white rounded-[1.2rem] flex items-center justify-center font-black text-sm shadow-lg">{u.nome[0]}</div>
                              <div className="flex flex-col text-left">
                                  <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{u.nome}</span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">{u.email}</span>
                              </div>
                          </div>
                          {currentUser?.id === u.id && <span className="text-indigo-600 text-xl font-black">✓</span>}
                      </button>
                  ))}
              </div>
              <div className="pt-8 border-t border-slate-100">
                  <form onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      addUser(String(fd.get('nome')).toUpperCase(), String(fd.get('email')).toLowerCase());
                      e.currentTarget.reset();
                  }} className="space-y-4">
                      <input name="nome" placeholder="NOME DO MEMBRO" required className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase tracking-widest" />
                      <input name="email" type="email" placeholder="E-MAIL" required className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] tracking-widest" />
                      <button type="submit" className="w-full bg-black text-white p-6 rounded-2xl font-black uppercase text-[10px] tracking-[0.4em] hover:bg-slate-800 transition-all">Adicionar</button>
                  </form>
              </div>
          </div>
      </Modal>

      {/* FORMULÁRIO DE RECEITA */}
      <Modal isOpen={showRevForm} onClose={() => setShowRevForm(false)} title="Nova Entrada Financeira">
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
            frequency: isRevRecurrent ? Frequency.MONTHLY : undefined
          }, isRevRecurrent ? 12 : 1);
          setShowRevForm(false);
        }} className="space-y-6">
          <input name="desc" required className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase" placeholder="DESCRIÇÃO (EX: SALÁRIO)" />
          <input name="value" type="number" step="0.01" required className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase" placeholder="VALOR R$" />
          <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase" />
          <select name="category" className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase">
                {categories.filter(c => c.type === TransactionType.REVENUE).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
          </select>
          <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Fixo Mensal (12 Meses)</span>
            <Toggle enabled={isRevRecurrent} onChange={setIsRevRecurrent} activeColorClass="bg-emerald-500" />
          </div>
          <button type="submit" className="w-full bg-emerald-500 text-white p-6 rounded-2xl font-black uppercase text-[10px] tracking-[0.4em] shadow-2xl">Confirmar Entrada</button>
        </form>
      </Modal>

      {/* FORMULÁRIO DE GASTO */}
      <Modal isOpen={showExpForm} onClose={() => setShowExpForm(false)} title="Registrar Saída">
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
            }, isExpRecurrent ? 12 : 1);
          }
          setShowExpForm(false);
        }} className="space-y-6">
          <input name="desc" required className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase" placeholder="DESCRIÇÃO DO GASTO" />
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
              <input name={isExpInstallment ? "totalValue" : "value"} type="number" step="0.01" required placeholder={isExpInstallment ? "VALOR TOTAL DA COMPRA" : "VALOR R$"} className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase" />
              {isExpInstallment && <input name="installmentsCount" type="number" required placeholder="QTD DE PARCELAS" className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase" />}
              <input name={isExpInstallment ? "startDate" : "dueDate"} type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase" />
          </div>
          <select name="category" className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-black text-[10px] uppercase">
                {categories.filter(c => c.type === TransactionType.EXPENSE).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
          </select>
          <button type="submit" className="w-full bg-rose-500 text-white p-6 rounded-2xl font-black uppercase text-[10px] tracking-[0.4em] shadow-2xl">Lançar Despesa</button>
        </form>
      </Modal>
    </Layout>
  );
};

export default App;
