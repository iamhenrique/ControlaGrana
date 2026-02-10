
import React, { useState, useMemo } from 'react';
import Layout from './components/Layout';
import { useFinanceStore } from './store';
import ResumoCard from './components/SummaryCards';
import { formatCurrency, getMonthYear } from './utils';
import { Status, TransactionType, Frequency } from './types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode }) => {
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

  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Filter logic
  const filteredData = useMemo(() => {
    const monthStr = `${selectedMonth + 1}-${selectedYear}`;
    const today = new Date();
    
    // Monthly datasets
    const monthlyRevenues = revenues.filter(r => getMonthYear(r.date) === monthStr);
    const monthlyExpenses = expenses.filter(e => getMonthYear(e.dueDate) === monthStr);
    const monthlyInstallments = installments.filter(i => getMonthYear(i.dueDate) === monthStr);

    // Revenue Subdivisions
    const totalRevenue = monthlyRevenues.reduce((acc, r) => acc + r.value, 0);
    const receivedRevenue = monthlyRevenues
      .filter(r => new Date(r.date) <= today)
      .reduce((acc, r) => acc + r.value, 0);
    const pendingRevenue = totalRevenue - receivedRevenue;

    // Expense Subdivisions
    const totalSimpleExpenses = monthlyExpenses.reduce((acc, e) => acc + e.value, 0);
    const totalInstallments = monthlyInstallments.reduce((acc, i) => acc + i.value, 0);
    const totalExpense = totalSimpleExpenses + totalInstallments;
    
    const paidExpenses = monthlyExpenses.filter(e => e.status === Status.PAID).reduce((acc, e) => acc + e.value, 0);
    const paidInstallments = monthlyInstallments.filter(i => i.status === Status.PAID).reduce((acc, i) => acc + i.value, 0);
    const totalPaid = paidExpenses + paidInstallments;
    const totalPending = totalExpense - totalPaid;

    // Balances
    const currentBalance = receivedRevenue - totalPaid;
    const finalBalance = totalRevenue - totalExpense;

    return {
      totalRevenue, receivedRevenue, pendingRevenue,
      totalExpense, totalPaid, totalPending,
      currentBalance, finalBalance,
      monthlyRevenues, monthlyExpenses, monthlyInstallments
    };
  }, [revenues, expenses, installments, selectedMonth, selectedYear]);

  const renderDashboard = () => {
    return (
      <div className="animate-in fade-in duration-500">
        {/* Period Selector Component */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-center gap-6">
          <button 
            onClick={handlePrevMonth}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
          >
            ‹
          </button>
          <div className="flex items-center gap-2 bg-slate-50 px-6 py-2 rounded-full border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
            <span className="text-xl">📅</span>
            <span className="text-sm font-bold text-slate-700 capitalize">
              {months[selectedMonth]}, {selectedYear}
            </span>
          </div>
          <button 
            onClick={handleNextMonth}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
          >
            ›
          </button>
        </div>

        {/* Resumo Grid */}
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ResumoCard 
              title="Receitas" 
              totalValue={filteredData.totalRevenue} 
              subValues={[
                { label: 'Recebido', value: filteredData.receivedRevenue },
                { label: 'A Receber', value: filteredData.pendingRevenue }
              ]}
              accentColor="text-emerald-600"
            />
            <ResumoCard 
              title="Despesas" 
              totalValue={filteredData.totalExpense} 
              subValues={[
                { label: 'Pagas', value: filteredData.totalPaid },
                { label: 'A Pagar', value: filteredData.totalPending }
              ]}
              accentColor="text-rose-600"
            />
            <ResumoCard 
              title="Saldos" 
              totalValue={filteredData.finalBalance} 
              subValues={[
                { label: 'Atual', value: filteredData.currentBalance },
                { label: 'Final', value: filteredData.finalBalance }
              ]}
              accentColor="text-indigo-600"
            />
            <ResumoCard 
              title="Contas Bancárias" 
              totalValue={filteredData.currentBalance} // Placeholder for bank accounts total
            />
          </div>

          {/* Quick Actions / Chart Section */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6 px-2">Evolução Mensal</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Receitas', value: filteredData.totalRevenue, color: '#10b981' },
                    { name: 'Despesas', value: filteredData.totalExpense, color: '#f43f5e' },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                      {[
                        { color: '#10b981' },
                        { color: '#f43f5e' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center gap-6">
               <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-3xl">🚀</div>
               <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Novo Registro</h3>
                  <p className="text-sm text-slate-500 mb-6">Mantenha seu controle grana sempre atualizado.</p>
                  <div className="flex flex-col gap-3 w-full">
                    <button onClick={() => setShowRevForm(true)} className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-bold shadow-lg shadow-emerald-100">Adicionar Receita</button>
                    <button onClick={() => setShowExpForm(true)} className="w-full bg-rose-600 text-white py-3 rounded-2xl font-bold shadow-lg shadow-rose-100">Adicionar Despesa</button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTransactions = () => {
    return (
      <div className="p-6 md:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-800">Histórico do Mês</h2>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.monthlyRevenues.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(r.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase rounded-md">Receita</span></td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(r.value)}</td>
                    <td className="px-6 py-4"><span className="text-xs text-slate-400">—</span></td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => deleteRevenue(r.id)} className="text-slate-300 hover:text-rose-500 transition-colors">🗑️</button>
                    </td>
                  </tr>
                ))}
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
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => deleteExpense(e.id)} className="text-slate-300 hover:text-rose-500 transition-colors">🗑️</button>
                    </td>
                  </tr>
                ))}
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
                    <td className="px-6 py-4 text-right">
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
      <div className="p-6 md:p-8 space-y-6 animate-in slide-in-from-right-4 duration-500">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Débitos Parcelados</h2>
          <button 
            onClick={() => setShowDebtForm(true)} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
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
              <div key={debt.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4 group hover:border-indigo-200 transition-colors">
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

                <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Total</span>
                    <span className="text-lg font-bold text-indigo-600">{formatCurrency(debt.totalValue)}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                    debt.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {debt.status === 'ACTIVE' ? 'Ativo' : 'Finalizado'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const ResumoHeaderContent = (
    <div className="bg-[#2196F3] text-white p-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button className="text-2xl hover:bg-white/10 w-10 h-10 flex items-center justify-center rounded-full transition-colors">‹</button>
        <h2 className="text-xl font-bold tracking-tight">Resumo</h2>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-2xl hover:bg-white/10 w-10 h-10 flex items-center justify-center rounded-full transition-colors">⋮</button>
      </div>
    </div>
  );

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      headerContent={activeTab === 'dashboard' ? ResumoHeaderContent : undefined}
      headerClassName={activeTab === 'dashboard' ? 'bg-[#2196F3]' : undefined}
    >
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
