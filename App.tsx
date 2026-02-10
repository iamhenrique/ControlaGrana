
import React, { useState, useMemo } from 'react';
import Layout from './components/Layout';
import { useFinanceStore } from './store';
import SummaryCards from './components/SummaryCards';
import { formatCurrency, getMonthYear } from './utils';
import { Status, TransactionType, Frequency } from './types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

// Fix: Moved Modal component outside of the main App component. 
// Defining components inside others can cause TypeScript inference issues (like "missing children property")
// and performance penalties due to re-creation on every render.
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const { 
    revenues, expenses, debts, installments, categories,
    addRevenue, addExpense, addDebt, toggleExpenseStatus,
    updateInstallmentStatus, deleteRevenue, deleteExpense, deleteDebt
  } = useFinanceStore();

  const [showRevForm, setShowRevForm] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);
  const [showDebtForm, setShowDebtForm] = useState(false);

  // Filter logic
  const filteredData = useMemo(() => {
    const monthStr = `${selectedMonth + 1}-${selectedYear}`;
    
    const monthlyRevenues = revenues.filter(r => getMonthYear(r.date) === monthStr);
    const monthlyExpenses = expenses.filter(e => getMonthYear(e.dueDate) === monthStr);
    const monthlyInstallments = installments.filter(i => getMonthYear(i.dueDate) === monthStr);

    const totalRevenue = monthlyRevenues.reduce((acc, r) => acc + r.value, 0);
    const totalSimpleExpenses = monthlyExpenses.reduce((acc, e) => acc + e.value, 0);
    const totalInstallments = monthlyInstallments.reduce((acc, i) => acc + i.value, 0);
    const totalExpense = totalSimpleExpenses + totalInstallments;
    const balance = totalRevenue - totalExpense;

    return {
      monthlyRevenues,
      monthlyExpenses,
      monthlyInstallments,
      totalRevenue,
      totalExpense,
      totalInstallments,
      balance
    };
  }, [revenues, expenses, installments, selectedMonth, selectedYear]);

  // Alerts logic
  const alerts = useMemo(() => {
    const today = new Date();
    const list: string[] = [];
    
    expenses.forEach(e => {
      const due = new Date(e.dueDate);
      const diff = (due.getTime() - today.getTime()) / (1000 * 3600 * 24);
      if (e.status === Status.PENDING) {
        if (diff < 0) list.push(`Despesa vencida: R$ ${e.value.toFixed(2)}`);
        else if (diff <= 3) list.push(`Despesa vence em breve (${Math.ceil(diff)} dias)`);
      }
    });

    installments.forEach(i => {
      const due = new Date(i.dueDate);
      const diff = (due.getTime() - today.getTime()) / (1000 * 3600 * 24);
      if (i.status === Status.PENDING) {
        if (diff < 0) list.push(`Parcela vencida: R$ ${i.value.toFixed(2)}`);
        else if (diff <= 3) list.push(`Parcela vence em breve (${Math.ceil(diff)} dias)`);
      }
    });

    return list;
  }, [expenses, installments]);

  const renderDashboard = () => {
    const chartData = [
      { name: 'Receitas', value: filteredData.totalRevenue, color: '#10b981' },
      { name: 'Despesas', value: filteredData.totalExpense, color: '#f43f5e' },
    ];

    const upcoming = [...filteredData.monthlyExpenses, ...filteredData.monthlyInstallments]
      .filter(i => i.status === Status.PENDING)
      .sort((a, b) => new Date('dueDate' in a ? a.dueDate : a.dueDate).getTime() - new Date('dueDate' in b ? b.dueDate : b.dueDate).getTime())
      .slice(0, 5);

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCards title="Saldo Mensal" value={filteredData.balance} icon="💰" color="bg-indigo-100 text-indigo-600" />
          <SummaryCards title="Receitas" value={filteredData.totalRevenue} icon="📈" color="bg-emerald-100 text-emerald-600" />
          <SummaryCards title="Despesas" value={filteredData.totalExpense} icon="📉" color="bg-rose-100 text-rose-600" />
          <SummaryCards title="Comprometido" value={filteredData.totalInstallments} icon="💳" color="bg-blue-100 text-blue-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Comparativo de Fluxo</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alerts & Upcoming Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Próximos Vencimentos</h3>
            {upcoming.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                 <span className="text-4xl mb-2">🎉</span>
                 <p className="text-sm">Nada vencendo em breve!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcoming.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-400 uppercase">
                        {'debtId' in item ? 'Parcela' : 'Despesa'}
                      </span>
                      <span className="text-sm font-medium text-slate-700">
                        {new Date('dueDate' in item ? item.dueDate : item.dueDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-rose-500">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            )}

            {alerts.length > 0 && (
              <div className="mt-6">
                 <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">Alertas</h4>
                 <div className="space-y-2">
                    {alerts.slice(0, 3).map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-2 rounded-lg font-medium">
                        <span>⚠️</span> {a}
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTransactions = () => {
    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-800">Histórico do Mês</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowRevForm(true)} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
            >
              <span>+</span> Receita
            </button>
            <button 
              onClick={() => setShowExpForm(true)} 
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-rose-200 transition-all flex items-center gap-2"
            >
              <span>+</span> Despesa
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {/* Revenues */}
                {filteredData.monthlyRevenues.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(r.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase rounded-md">Receita</span></td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(r.value)}</td>
                    <td className="px-6 py-4"><span className="text-xs text-slate-400">—</span></td>
                    <td className="px-6 py-4">
                      <button onClick={() => deleteRevenue(r.id)} className="text-slate-300 hover:text-rose-500 transition-colors">🗑️</button>
                    </td>
                  </tr>
                ))}
                {/* Expenses */}
                {filteredData.monthlyExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(e.dueDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold uppercase rounded-md">Despesa</span></td>
                    <td className="px-6 py-4 font-bold text-rose-600">{formatCurrency(e.value)}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleExpenseStatus(e.id)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${
                          e.status === Status.PAID ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {e.status === Status.PAID ? 'Paga' : 'Pendente'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => deleteExpense(e.id)} className="text-slate-300 hover:text-rose-500 transition-colors">🗑️</button>
                    </td>
                  </tr>
                ))}
                {/* Installments in table? Optional, usually it's better in the Debts tab but let's show here too for completeness */}
                {filteredData.monthlyInstallments.map(i => (
                  <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(i.dueDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded-md">Parcela</span></td>
                    <td className="px-6 py-4 font-bold text-slate-700">{formatCurrency(i.value)}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => updateInstallmentStatus(i.id, i.status === Status.PAID ? Status.PENDING : Status.PAID)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${
                          i.status === Status.PAID ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {i.status === Status.PAID ? 'Paga' : 'Pendente'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-300">🔒</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(filteredData.monthlyExpenses.length === 0 && filteredData.monthlyRevenues.length === 0 && filteredData.monthlyInstallments.length === 0) && (
            <div className="py-20 text-center text-slate-400">Nenhuma transação registrada neste mês.</div>
          )}
        </div>
      </div>
    );
  };

  const renderDebts = () => {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Débitos Parcelados</h2>
          <button 
            onClick={() => setShowDebtForm(true)} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
          >
            <span>+</span> Novo Parcelamento
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {debts.map(debt => {
            const related = installments.filter(i => i.debtId === debt.id);
            const paidCount = related.filter(i => i.status === Status.PAID).length;
            const progress = (paidCount / debt.installmentsCount) * 100;

            return (
              <div key={debt.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4 group hover:border-indigo-200 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 truncate max-w-[150px]">{debt.description}</h4>
                    <span className="text-xs text-slate-400">{debt.installmentsCount}x de {formatCurrency(debt.installmentValue)}</span>
                  </div>
                  <button onClick={() => deleteDebt(debt.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all">🗑️</button>
                </div>

                <div className="space-y-1.5">
                   <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                      <span>Progresso</span>
                      <span>{paidCount} / {debt.installmentsCount}</span>
                   </div>
                   <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-1000" 
                        style={{ width: `${progress}%` }}
                      ></div>
                   </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Total</span>
                    <span className="text-lg font-bold text-indigo-600">{formatCurrency(debt.totalValue)}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                    debt.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {debt.status === 'ACTIVE' ? 'Ativo' : 'Finalizado'}
                  </span>
                </div>
              </div>
            );
          })}
          {debts.length === 0 && (
            <div className="col-span-full py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
               <span className="text-4xl mb-2">💳</span>
               <p className="text-sm font-medium">Nenhum parcelamento cadastrado ainda.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {/* Month Selector */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <select 
          className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
        >
          {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
        <select 
          className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
        >
          {[2023, 2024, 2025, 2026].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'transactions' && renderTransactions()}
      {activeTab === 'debts' && renderDebts()}

      {/* MODALS */}
      <Modal isOpen={showRevForm} onClose={() => setShowRevForm(false)} title="Nova Receita">
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          addRevenue({
            value: Number(fd.get('value')),
            date: String(fd.get('date')),
            categoryId: String(fd.get('category')),
            isRecurrent: fd.get('recurrent') === 'on'
          });
          setShowRevForm(false);
        }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor</label>
            <input name="value" type="number" step="0.01" required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0,00" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data</label>
            <input name="date" type="date" required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Categoria</label>
            <select name="category" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
              {categories.filter(c => c.type === TransactionType.REVENUE).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all">Salvar Receita</button>
        </form>
      </Modal>

      <Modal isOpen={showExpForm} onClose={() => setShowExpForm(false)} title="Nova Despesa">
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          addExpense({
            value: Number(fd.get('value')),
            dueDate: String(fd.get('dueDate')),
            categoryId: String(fd.get('category')),
            paymentMethod: String(fd.get('method')),
            status: Status.PENDING
          });
          setShowExpForm(false);
        }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor</label>
            <input name="value" type="number" step="0.01" required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none" placeholder="0,00" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Vencimento</label>
            <input name="dueDate" type="date" required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Categoria</label>
            <select name="category" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none">
              {categories.filter(c => c.type === TransactionType.EXPENSE).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full bg-rose-600 text-white p-3 rounded-xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all">Salvar Despesa</button>
        </form>
      </Modal>

      <Modal isOpen={showDebtForm} onClose={() => setShowDebtForm(false)} title="Novo Parcelamento">
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          addDebt({
            description: String(fd.get('desc')),
            totalValue: Number(fd.get('total')),
            startDate: String(fd.get('start')),
            frequency: fd.get('freq') as Frequency,
            installmentsCount: Number(fd.get('count'))
          });
          setShowDebtForm(false);
        }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição</label>
            <input name="desc" type="text" required maxLength={30} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Geladeira" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor Total</label>
              <input name="total" type="number" step="0.01" required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0,00" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Parcelas</label>
              <input name="count" type="number" required min="2" max="120" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="12" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data Inicial</label>
            <input name="start" type="date" required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Frequência</label>
            <select name="freq" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value={Frequency.MONTHLY}>Mensal</option>
              <option value={Frequency.WEEKLY}>Semanal</option>
              <option value={Frequency.BIWEEKLY}>Quinzenal</option>
              <option value={Frequency.YEARLY}>Anual</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">Gerar Parcelas</button>
        </form>
      </Modal>
    </Layout>
  );
};

export default App;
