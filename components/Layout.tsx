
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  headerContent?: React.ReactNode;
  headerClassName?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, headerContent, headerClassName }) => {
  const tabs = [
    { id: 'dashboard', label: 'Início', icon: '📊' },
    { id: 'transactions', label: 'Transações', icon: '💸' },
    { id: 'budgets', label: 'Metas', icon: '🎯' },
    { id: 'debts', label: 'Parcelas', icon: '🗓️' },
  ];

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-64 flex flex-col bg-[#F8FAFC]">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-100 flex-col p-6 z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-100">C</div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">ControlaGrana</h1>
        </div>
        
        <nav className="flex-1 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${
                activeTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        
        <div className="mt-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold uppercase">CG</div>
                 <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-slate-400 uppercase">Versão</span>
                     <span className="text-xs font-bold text-slate-600 uppercase">2.5 PRO</span>
                 </div>
             </div>
        </div>
      </aside>

      {/* Dynamic Header */}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${headerClassName || 'bg-white/80 backdrop-blur-md border-b border-slate-100'}`}>
        {headerContent ? headerContent : (
          <div className="p-4 md:px-8 flex items-center justify-between h-16">
            <div className="md:hidden flex items-center gap-2">
               <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-100">C</div>
            </div>
            <h2 className="hidden md:block text-sm font-bold text-slate-500 uppercase tracking-widest">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">User</div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around p-3 z-40 pb-6 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center p-2 rounded-2xl transition-all ${
              activeTab === tab.id ? 'text-indigo-600 scale-110' : 'text-slate-300'
            }`}
          >
            <span className="text-2xl">{tab.icon}</span>
            <span className="text-[9px] font-black uppercase mt-1">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
