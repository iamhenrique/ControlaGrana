
import React, { useState, useMemo } from 'react';
import Layout from './components/Layout';
import { useFinanceStore } from './store';
import ResumoCard from './components/SummaryCards';
import { formatCurrency, getMonthYear } from './utils';
import { Status, TransactionType, Frequency } from './types';
import { GoogleGenAI } from "@google/genai";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">{title}</h3>
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
    revenues, expenses, debts, installments, categories, budgets, isLoaded, isSyncing,
    users, currentUser, setCurrentUser, addUser, setBudget,
    addRevenue, addExpense, addDebt, toggleExpenseStatus, toggleRevenueStatus,
    updateInstallmentStatus, deleteRevenue, deleteExpense, deleteDebt
  } = useFinanceStore();

  const [showRevForm, setShowRevForm] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [confirmDeleteState, setConfirmDeleteState] = useState<{ id: string, type: 'revenue' | 'expense' | 'debt' } | null>(null);

  const [isRevRecurrent, setIsRevRecurrent] = useState(false);
  const [isExpRecurrent, setIsExpRecurrent] = useState(false);
  const [isExpInstallment, setIsExpInstallment] = useState(false);

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const filteredData = useMemo(() => {
    const monthStr = `${selectedMonth + 1}-${selectedYear}`;
    const userRevenues = revenues.filter(r => r.userId === currentUser?.id);
    const userExpenses = expenses.filter(e => e.userId === currentUser?.id);
    const userDebts = debts.filter(d => d.userId === currentUser?.id);
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

    // Category distribution + Budget analysis
    const categoryDataMap: Record<string, { current: number, budget: number, categoryId: string }> = {};
    
    categories.forEach(cat => {
        if (cat.type === TransactionType.EXPENSE) {
            const budget = userBudgets.find(b => b.categoryId === cat.id)?.limitValue || 0;
            categoryDataMap[cat.name] = { current: 0, budget, categoryId: cat.id };
        }
    });

    monthlyExpenses.forEach(e => {
        const cat = categories.find(c => c.id === e.categoryId);
        if (cat) categoryDataMap[cat.name].current += e.value;
    });
    monthlyInstallments.forEach(i => {
        const debt = debts.find(d => d.id === i.debtId);
        const cat = categories.find(c => c.id === debt?.categoryId);
        if (cat) categoryDataMap[cat.name].current += i.value;
    });

    const categoryStats = Object.entries(categoryDataMap)
        .map(([name, data]) => ({ name, ...data }))
        .filter(d => d.current > 0 || d.budget > 0);

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
      
      const prompt = `Usuário: ${currentUser?.nome || 'Membro'}
      Mês: ${months[selectedMonth]}/${selectedYear}
      Resumo: Receitas ${formatCurrency(filteredData.totalRevenue)}, Despesas ${formatCurrency(filteredData.totalExpense)}.
      Categorias Estouradas: ${overBudgets.map(c => `${c.name} (Gasto ${formatCurrency(c.current)} / Meta ${formatCurrency(c.budget)})`).join(', ') || 'Nenhuma'}.
      
      Atue como um Mentor Financeiro doméstico de elite. Dê um diagnóstico estratégico e motivador em até 160 caracteres. Seja direto e prático.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAiInsight(response.text || "Seu fluxo está saudável, continue monitorando!");
    } catch (error) {
      setAiInsight("Planeje seus gastos com antecedência para evitar surpresas no fim do mês.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const VisaoGeralHeader = (
    <div className="bg-[#2196F3] text-white p-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button onClick={() => { if(selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y-1); } else setSelectedMonth(m => m-1); setAiInsight(null); }} className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-all text-xl">‹</button>
        <h2 className="text-sm font-black uppercase tracking-[0.2em]">{months[selectedMonth]} {selectedYear}</h2>
        <button onClick={() => { if(selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y+1); } else setSelectedMonth(m => m+1); setAiInsight(null); }} className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-all text-xl">›</button>
      </div>
      <button onClick={() => setShowUserForm(true)} className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl hover:bg-white/20 transition-all border border-white/20">
          <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-[9px] font-black opacity-60 uppercase">Perfil</span>
              <span className="text-xs font-bold truncate max-w-[80px]">{currentUser?.nome || 'Nenhum'}</span>
          </div>
          <div className="w-8 h-8 bg-white text-indigo-600 rounded-full flex items-center justify-center font-black text-[10px] uppercase shadow-lg shadow-black/10">
              {currentUser?.nome?.[0] || '?'}
          </div>
      </button>
    </div>
  );

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Sincronizando Módulos...</span>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} headerContent={VisaoGeralHeader} headerClassName="bg-[#2196F3]">
      {activeTab === 'dashboard' && (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ResumoCard title="Receitas" totalValue={filteredData.totalRevenue} subValues={[{ label: 'Recebido', value: filteredData.receivedRevenue }, { label: 'Pendente', value: filteredData.totalRevenue - filteredData.receivedRevenue }]} accentColor="text-emerald-500" headerAction={<button onClick={() => setShowRevForm(true)} className="w-8 h-8 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-100 hover:scale-110 transition-all font-bold text-xl flex items-center justify-center">+</button>} />
            <ResumoCard title="Despesas" totalValue={filteredData.totalExpense} subValues={[{ label: 'Pago', value: filteredData.totalPaid }, { label: 'Aberto', value: filteredData.totalExpense - filteredData.totalPaid }]} accentColor="text-rose-500" headerAction={<button onClick={() => { setIsExpInstallment(false); setShowExpForm(true); }} className="w-8 h-8 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-100 hover:scale-110 transition-all font-bold text-xl flex items-center justify-center">+</button>} />
            <ResumoCard title="Saldo Final" totalValue={filteredData.finalBalance} subValues={[{ label: 'Fluxo', value: filteredData.totalRevenue - filteredData.totalExpense }]} accentColor="text-indigo-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Metas vs Realizado</h3>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">Top Gastos</span>
                </div>
                <div className="space-y-6">
                    {filteredData.categoryStats.slice(0, 5).map(cat => {
                        const percent = cat.budget > 0 ? Math.min((cat.current / cat.budget) * 100, 100) : 0;
                        const isOver = cat.budget > 0 && cat.current > cat.budget;
                        return (
                            <div key={cat.categoryId} className="group">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{cat.name}</span>
                                        <span className="text-[10px] font-medium text-slate-400 uppercase">{formatCurrency(cat.current)} de {cat.budget > 0 ? formatCurrency(cat.budget) : 'Sem limite'}</span>
                                    </div>
                                    <span className={`text-xs font-black ${isOver ? 'text-rose-500' : 'text-slate-400'}`}>{percent.toFixed(0)}%</span>
                                </div>
                                <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${percent}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredData.categoryStats.length === 0 && (
                        <div className="py-12 text-center">
                            <span className="text-4xl grayscale opacity-20 block mb-4">📭</span>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhum dado registrado este mês</span>
                        </div>
                    )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100 text-white flex flex-col justify-between h-full min-h-[400px]">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-2xl">🤖</span>
                            <h3 className="text-xs font-black uppercase tracking-[0.2em]">Smart Advisor</h3>
                        </div>
                        {isAnalyzing ? (
                            <div className="space-y-4 animate-pulse">
                                <div className="h-3 bg-white/20 rounded-full w-full"></div>
                                <div className="h-3 bg-white/20 rounded-full w-4/5"></div>
                                <div className="h-3 bg-white/20 rounded-full w-2/3"></div>
                            </div>
                        ) : aiInsight ? (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                <p className="text-sm leading-relaxed font-bold italic opacity-90 mb-4">"{aiInsight}"</p>
                                <div className="w-10 h-1 bg-white/20 rounded-full"></div>
                            </div>
                        ) : (
                            <p className="text-xs font-medium text-indigo-100 leading-relaxed uppercase opacity-80">Pronto para analisar seus gastos de {months[selectedMonth]}. Clique abaixo para um diagnóstico completo.</p>
                        )}
                    </div>
                    <button 
                        onClick={generateAIInsight}
                        disabled={isAnalyzing}
                        className="w-full bg-white text-indigo-700 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isAnalyzing ? 'Analisando...' : 'Pedir Conselho'}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'budgets' && (
        <div className="p-6 md:p-8 animate-in slide-in-from-right-8 duration-500">
          <div className="flex items-center justify-between mb-8">
              <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Metas de Gastos</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Controle o que você gasta por categoria</p>
              </div>
              <button onClick={() => setShowBudgetForm(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 transition-all">Definir Metas</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.filter(c => c.type === TransactionType.EXPENSE).map(cat => {
                  const budget = filteredData.userBudgets.find(b => b.categoryId === cat.id);
                  return (
                      <div key={cat.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors flex flex-col justify-between">
                          <div className="flex justify-between items-start mb-4">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat.name}</span>
                              <span className="text-2xl">🎯</span>
                          </div>
                          <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">Limite Mensal</span>
                              <span className="text-xl font-black text-slate-800">{budget ? formatCurrency(budget.limitValue) : 'Não definido'}</span>
                          </div>
                      </div>
                  );
              })}
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="p-6 md:p-8 space-y-6 animate-in slide-in-from-bottom-4">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Movimentações do Mês</h2>
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        {filteredData.monthlyRevenues.map(r => (
                            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-8 py-4">{new Date(r.date).toLocaleDateString('pt-BR')}</td>
                                <td className="px-8 py-4 text-slate-800 font-black">{r.description}</td>
                                <td className="px-8 py-4 text-emerald-500">{formatCurrency(r.value)}</td>
                                <td className="px-8 py-4 text-right">
                                    <button onClick={() => toggleRevenueStatus(r.id)} className={`px-3 py-1 rounded-lg ${r.status === Status.PAID ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{r.status === Status.PAID ? '✓' : '...'}</button>
                                </td>
                            </tr>
                        ))}
                        {filteredData.monthlyExpenses.map(e => (
                            <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-8 py-4">{new Date(e.dueDate).toLocaleDateString('pt-BR')}</td>
                                <td className="px-8 py-4 text-slate-800 font-black">{e.description}</td>
                                <td className="px-8 py-4 text-rose-500">{formatCurrency(e.value)}</td>
                                <td className="px-8 py-4 text-right">
                                    <button onClick={() => toggleExpenseStatus(e.id)} className={`px-3 py-1 rounded-lg ${e.status === Status.PAID ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>{e.status === Status.PAID ? '✓' : '...'}</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* MODALS */}
      <Modal isOpen={showUserForm} onClose={() => setShowUserForm(false)} title="Membros da Família">
          <div className="space-y-6">
              <div className="space-y-3">
                  {users.map(u => (
                      <button 
                        key={u.id} 
                        onClick={() => { setCurrentUser(u); setShowUserForm(false); }}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${currentUser?.id === u.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-50 bg-slate-50 hover:border-slate-200'}`}
                      >
                          <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-black text-xs">{u.nome[0]}</div>
                              <div className="flex flex-col text-left">
                                  <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{u.nome}</span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">{u.email}</span>
                              </div>
                          </div>
                          {currentUser?.id === u.id && <span className="text-indigo-600 text-xl font-black">✓</span>}
                      </button>
                  ))}
              </div>
              <div className="pt-6 border-t border-slate-100 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center">Novo Membro</h4>
                  <form onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      addUser(String(fd.get('nome')).toUpperCase(), String(fd.get('email')).toLowerCase());
                      e.currentTarget.reset();
                  }} className="space-y-3">
                      <input name="nome" placeholder="NOME" required className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-bold text-xs uppercase" />
                      <input name="email" type="email" placeholder="E-MAIL" required className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-bold text-xs" />
                      <button type="submit" className="w-full bg-slate-800 text-white p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 transition-colors">Cadastrar</button>
                  </form>
              </div>
          </div>
      </Modal>

      <Modal isOpen={showBudgetForm} onClose={() => setShowBudgetForm(false)} title="Planejar Metas">
          <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setBudget(String(fd.get('category')), Number(fd.get('limit')), selectedMonth, selectedYear);
              setShowBudgetForm(false);
          }} className="space-y-6">
              <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Categoria</label>
                  <select name="category" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-bold text-xs uppercase">
                      {categories.filter(c => c.type === TransactionType.EXPENSE).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
              </div>
              <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Limite Mensal</label>
                  <input name="limit" type="number" step="0.01" required className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-bold text-xs uppercase" placeholder="R$ 0,00" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-colors">Salvar Meta</button>
          </form>
      </Modal>

      <Modal isOpen={showRevForm} onClose={() => setShowRevForm(false)} title="Nova Receita">
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
          <input name="desc" type="text" required className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-bold text-xs uppercase" placeholder="Descrição (ex: Salário)" />
          <input name="value" type="number" step="0.01" required className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-bold text-xs uppercase" placeholder="Valor (R$)" />
          <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-bold text-xs uppercase" />
          <select name="category" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-bold text-xs uppercase">
                {categories.filter(c => c.type === TransactionType.REVENUE).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
          </select>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Recorrente</span>
            <Toggle enabled={isRevRecurrent} onChange={setIsRevRecurrent} activeColorClass="bg-emerald-500" />
          </div>
          <button type="submit" className="w-full bg-emerald-500 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-50 transition-colors">Confirmar Receita</button>
        </form>
      </Modal>

      <Modal isOpen={showExpForm} onClose={() => setShowExpForm(false)} title="Nova Despesa">
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
              paymentMethod: 'Outro',
              status: Status.PENDING,
              isRecurrent: isExpRecurrent,
              frequency: isExpRecurrent ? Frequency.MONTHLY : undefined
            }, isExpRecurrent ? Number(fd.get('reps')) : 1);
          }
          setShowExpForm(false);
          setIsExpRecurrent(false);
          setIsExpInstallment(false);
        }} className="space-y-6">
          <input name="desc" type="text" required className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-bold text-xs uppercase" placeholder="O que você comprou?" />
          <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-600 uppercase">Parcelado</span>
                  <Toggle enabled={isExpInstallment} onChange={(val) => { setIsExpInstallment(val); if(val) setIsExpRecurrent(false); }} activeColorClass="bg-indigo-500" />
              </div>
              {!isExpInstallment && (
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[9px] font-black text-slate-600 uppercase">Fixo</span>
                      <Toggle enabled={isExpRecurrent} onChange={setIsExpRecurrent} activeColorClass="bg-rose-500" />
                  </div>
              )}
          </div>
          {isExpInstallment ? (
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <input name="totalValue" type="number" step="0.01" required placeholder="Valor Total" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-bold text-xs uppercase" />
                    <input name="installmentsCount" type="number" required placeholder="Nº Parcelas" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-bold text-xs uppercase" />
                </div>
                <input name="startDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-bold text-xs uppercase" />
            </div>
          ) : (
            <div className="space-y-6">
                <input name="value" type="number" step="0.01" required placeholder="Valor (R$)" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-bold text-xs uppercase" />
                <input name="dueDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-bold text-xs uppercase" />
            </div>
          )}
          <select name="category" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-bold text-xs uppercase">
                {categories.filter(c => c.type === TransactionType.EXPENSE).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
          </select>
          <button type="submit" className="w-full bg-rose-500 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-100 transition-colors">Confirmar Gasto</button>
        </form>
      </Modal>
    </Layout>
  );
};

export default App;
