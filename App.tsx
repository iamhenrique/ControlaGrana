
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
          <h3 className="text-lg font-bold text-slate-800 uppercase">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto hide-scrollbar">{children}</div>
      </div>
    </div>
  );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">⚠️</div>
          <h3 className="text-lg font-bold text-slate-800 uppercase mb-2">{title}</h3>
          <p className="text-sm text-slate-500 uppercase mb-8">{message}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors uppercase text-xs">Cancelar</button>
            <button onClick={onConfirm} className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all uppercase text-xs">Excluir</button>
          </div>
        </div>
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
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const { 
    revenues, expenses, debts, installments, categories,
    addRevenue, addExpense, addDebt, addCategory, toggleExpenseStatus, toggleRevenueStatus,
    updateInstallmentStatus, deleteRevenue, deleteExpense, deleteDebt
  } = useFinanceStore();

  const [showRevForm, setShowRevForm] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);
  const [showDebtForm, setShowDebtForm] = useState(false);

  const [confirmDeleteState, setConfirmDeleteState] = useState<{ id: string, type: 'revenue' | 'expense' | 'debt' } | null>(null);

  const [isRevRecurrent, setIsRevRecurrent] = useState(false);
  const [isExpRecurrent, setIsExpRecurrent] = useState(false);
  const [isExpInstallment, setIsExpInstallment] = useState(false);

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

  const handleConfirmDelete = () => {
    if (!confirmDeleteState) return;
    const { id, type } = confirmDeleteState;
    if (type === 'revenue') deleteRevenue(id);
    if (type === 'expense') deleteExpense(id);
    if (type === 'debt') deleteDebt(id);
    setConfirmDeleteState(null);
  };

  const filteredData = useMemo(() => {
    const monthStr = `${selectedMonth + 1}-${selectedYear}`;
    const monthlyRevenues = revenues.filter(r => getMonthYear(r.date) === monthStr);
    const monthlyExpenses = expenses.filter(e => getMonthYear(e.dueDate) === monthStr);
    const monthlyInstallments = installments.filter(i => getMonthYear(i.dueDate) === monthStr);

    const totalRevenue = monthlyRevenues.reduce((acc, r) => acc + r.value, 0);
    const receivedRevenue = monthlyRevenues.filter(r => r.status === Status.PAID).reduce((acc, r) => acc + r.value, 0);
    const totalSimpleExpenses = monthlyExpenses.reduce((acc, e) => acc + e.value, 0);
    const totalInstallments = monthlyInstallments.reduce((acc, i) => acc + i.value, 0);
    const totalExpense = totalSimpleExpenses + totalInstallments;
    
    const paidExpenses = monthlyExpenses.filter(e => e.status === Status.PAID).reduce((acc, e) => acc + e.value, 0);
    const paidInstallments = monthlyInstallments.filter(i => i.status === Status.PAID).reduce((acc, i) => acc + i.value, 0);
    const totalPaid = paidExpenses + paidInstallments;

    return {
      totalRevenue, receivedRevenue, pendingRevenue: totalRevenue - receivedRevenue,
      totalExpense, totalPaid, totalPending: totalExpense - totalPaid,
      currentBalance: receivedRevenue - totalPaid,
      finalBalance: totalRevenue - totalExpense,
      monthlyRevenues, monthlyExpenses, monthlyInstallments
    };
  }, [revenues, expenses, installments, selectedMonth, selectedYear]);

  const VisaoGeralHeaderContent = (
    <div className="bg-[#2196F3] text-white p-4 md:px-8 flex items-center justify-between uppercase">
      <div className="flex items-center gap-4">
        <button onClick={handlePrevMonth} className="text-2xl hover:bg-white/10 w-10 h-10 flex items-center justify-center rounded-full transition-colors">‹</button>
        <h2 className="text-xl font-bold tracking-tight">Visão Geral</h2>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-2xl hover:bg-white/10 w-10 h-10 flex items-center justify-center rounded-full transition-colors">⋮</button>
      </div>
    </div>
  );

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} headerContent={activeTab === 'dashboard' ? VisaoGeralHeaderContent : undefined} headerClassName={activeTab === 'dashboard' ? 'bg-[#2196F3]' : undefined}>
      {activeTab === 'dashboard' && (
        <div className="animate-in fade-in duration-500">
          <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-center gap-6">
            <button onClick={handlePrevMonth} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all">‹</button>
            <div className="flex items-center gap-2 bg-slate-50 px-6 py-2 rounded-full border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
              <span className="text-xl">📅</span>
              <span className="text-sm font-bold text-slate-700 uppercase">{months[selectedMonth]}, {selectedYear}</span>
            </div>
            <button onClick={handleNextMonth} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all">›</button>
          </div>

          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ResumoCard 
                title="Receitas" 
                totalValue={filteredData.totalRevenue} 
                subValues={[{ label: 'Recebido', value: filteredData.receivedRevenue }, { label: 'A Receber', value: filteredData.pendingRevenue }]}
                accentColor="text-emerald-600"
                headerAction={<button onClick={() => setShowRevForm(true)} className="w-7 h-7 bg-emerald-600 text-white rounded-full text-lg font-bold shadow-md hover:bg-emerald-700 hover:scale-110 transition-all flex items-center justify-center">+</button>}
              />
              <ResumoCard 
                title="Despesas" 
                totalValue={filteredData.totalExpense} 
                subValues={[{ label: 'Pagas', value: filteredData.totalPaid }, { label: 'A Pagar', value: filteredData.totalPending }]}
                accentColor="text-rose-600"
                headerAction={<button onClick={() => { setIsExpInstallment(false); setIsExpRecurrent(false); setShowExpForm(true); }} className="w-7 h-7 bg-rose-600 text-white rounded-full text-lg font-bold shadow-md hover:bg-rose-700 hover:scale-110 transition-all flex items-center justify-center">+</button>}
              />
              <ResumoCard title="Saldos" totalValue={filteredData.finalBalance} subValues={[{ label: 'Atual', value: filteredData.currentBalance }, { label: 'Final', value: filteredData.finalBalance }]} accentColor="text-indigo-600" />
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 px-2 uppercase">Evolução Mensal</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ name: 'RECEITAS', value: filteredData.totalRevenue, color: '#10b981' }, { name: 'DESPESAS', value: filteredData.totalExpense, color: '#f43f5e' }]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', textTransform: 'uppercase' }} />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                        {[{ color: '#10b981' }, { color: '#f43f5e' }].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center gap-6">
                 <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-3xl">🎯</div>
                 <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2 uppercase">Meta Financeira</h3>
                    <p className="text-sm text-slate-500 uppercase">Organize seus débitos parcelados e acompanhe o crescimento do seu patrimônio.</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="p-6 md:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-bold text-slate-800 uppercase">Histórico do Mês</h2>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Descrição</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 uppercase text-[13px]">
                {filteredData.monthlyRevenues.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600">{new Date(r.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 text-slate-800 font-medium">{r.description}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(r.value)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => toggleRevenueStatus(r.id)} className={`mr-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${r.status === Status.PAID ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.status === Status.PAID ? 'Recebida' : 'Pendente'}</button>
                      <button onClick={() => setConfirmDeleteState({ id: r.id, type: 'revenue' })} className="text-slate-300 hover:text-rose-500 transition-colors">🗑️</button>
                    </td>
                  </tr>
                ))}
                {filteredData.monthlyExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600">{new Date(e.dueDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 text-slate-800 font-medium">{e.description}</td>
                    <td className="px-6 py-4 font-bold text-rose-600">{formatCurrency(e.value)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => toggleExpenseStatus(e.id)} className={`mr-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${e.status === Status.PAID ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>{e.status === Status.PAID ? 'Paga' : 'Pendente'}</button>
                      <button onClick={() => setConfirmDeleteState({ id: e.id, type: 'expense' })} className="text-slate-300 hover:text-rose-500 transition-colors">🗑️</button>
                    </td>
                  </tr>
                ))}
                {filteredData.monthlyInstallments.map(i => {
                  const debt = debts.find(d => d.id === i.debtId);
                  return (
                    <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-600">{new Date(i.dueDate).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 text-slate-800 font-medium">{debt?.description} ({i.installmentNumber}/{debt?.installmentsCount})</td>
                      <td className="px-6 py-4 font-bold text-slate-600">{formatCurrency(i.value)}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => updateInstallmentStatus(i.id, i.status === Status.PAID ? Status.PENDING : Status.PAID)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${i.status === Status.PAID ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>{i.status === Status.PAID ? 'Paga' : 'Pendente'}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'debts' && (
        <div className="p-6 md:p-8 space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 uppercase">Débitos Parcelados</h2>
            <button onClick={() => setShowDebtForm(true)} className="w-11 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-2xl font-bold shadow-lg shadow-indigo-100 hover:scale-110 transition-all flex items-center justify-center">+</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {debts.map(debt => (
              <div key={debt.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 uppercase group hover:border-indigo-200 transition-colors">
                <div className="flex justify-between mb-4">
                  <h4 className="font-bold text-slate-800">{debt.description}</h4>
                  <button onClick={() => setConfirmDeleteState({ id: debt.id, type: 'debt' })} className="text-slate-200 hover:text-rose-500 transition-colors">🗑️</button>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-bold">VALOR TOTAL</span>
                  <span className="text-lg font-bold text-indigo-600">{formatCurrency(debt.totalValue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      <Modal isOpen={showRevForm} onClose={() => setShowRevForm(false)} title="NOVA RECEITA">
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
        }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição</label>
            <input name="desc" type="text" required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none uppercase" placeholder="EX: SALÁRIO" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor</label>
            <input name="value" type="number" step="0.01" required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none uppercase" placeholder="0,00" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data</label>
            <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none uppercase" />
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs font-bold text-slate-600 uppercase">RECORRENTE</span>
            <Toggle enabled={isRevRecurrent} onChange={setIsRevRecurrent} activeColorClass="bg-emerald-500" />
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold uppercase">Salvar</button>
        </form>
      </Modal>

      <Modal isOpen={showExpForm} onClose={() => setShowExpForm(false)} title="NOVA DESPESA">
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          if (isExpInstallment) {
            addDebt({
              description: String(fd.get('desc')).toUpperCase(),
              totalValue: Number(fd.get('totalValue')),
              startDate: String(fd.get('startDate')),
              frequency: fd.get('frequency') as Frequency,
              installmentsCount: Number(fd.get('installmentsCount'))
            });
          } else {
            addExpense({
              description: String(fd.get('desc')).toUpperCase(),
              value: Number(fd.get('value')),
              dueDate: String(fd.get('dueDate')),
              categoryId: String(fd.get('category')),
              paymentMethod: 'OUTRO',
              status: Status.PENDING,
              isRecurrent: isExpRecurrent,
              frequency: isExpRecurrent ? (fd.get('freq') as Frequency) : undefined
            }, isExpRecurrent ? Number(fd.get('reps')) : 1);
          }
          setShowExpForm(false);
          setIsExpRecurrent(false);
          setIsExpInstallment(false);
        }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição</label>
            <input name="desc" type="text" required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none uppercase" placeholder="EX: MERCADO" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-600 uppercase">PARCELADO</span>
                <Toggle enabled={isExpInstallment} onChange={(val) => { setIsExpInstallment(val); if(val) setIsExpRecurrent(false); }} activeColorClass="bg-indigo-500" />
            </div>
            {!isExpInstallment && (
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-600 uppercase">RECORRENTE</span>
                    <Toggle enabled={isExpRecurrent} onChange={setIsExpRecurrent} activeColorClass="bg-rose-500" />
                </div>
            )}
          </div>

          {isExpInstallment ? (
            <div className="space-y-4 animate-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor Total</label>
                  <input name="totalValue" type="number" step="0.01" required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Parcelas</label>
                  <input name="installmentsCount" type="number" required min="2" max="120" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none uppercase" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data Inicial</label>
                <input name="startDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none uppercase" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Frequência</label>
                <select name="frequency" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none uppercase">
                  <option value={Frequency.MONTHLY}>MENSAL</option>
                  <option value={Frequency.WEEKLY}>SEMANAL</option>
                  <option value={Frequency.YEARLY}>ANUAL</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor</label>
                    <input name="value" type="number" step="0.01" required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none uppercase" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Vencimento</label>
                    <input name="dueDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none uppercase" />
                </div>
            </div>
          )}

          <button type="submit" className="w-full bg-rose-600 text-white p-3 rounded-xl font-bold uppercase">Salvar</button>
        </form>
      </Modal>

      <ConfirmModal 
        isOpen={!!confirmDeleteState}
        onClose={() => setConfirmDeleteState(null)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message="Deseja realmente excluir este item?"
      />
    </Layout>
  );
};

export default App;
