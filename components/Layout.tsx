
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
    { id: 'debts', label: 'Parcelamentos', icon: '🗓️' },
  ];

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-64 flex flex-col bg-[#F5F5F5]">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 flex-col p-6 z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">C</div>
          <h1 className="text-xl font-bold text-slate-800">ControlaGrana</h1>
        </div>
        
        <nav className="flex-1 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                activeTab === tab.id 
                ? 'bg-indigo-50 text-indigo-700' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Dynamic Header */}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${headerClassName || 'bg-white/80 backdrop-blur-md border-b border-slate-200'}`}>
        {headerContent ? headerContent : (
          <div className="p-4 md:px-8 flex items-center justify-between">
            <div className="md:hidden flex items-center gap-2">
               <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">C</div>
               <span className="font-bold text-slate-800">ControlaGrana</span>
            </div>
            <h2 className="hidden md:block text-lg font-semibold text-slate-700">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-medium text-slate-600">JD</div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 z-40">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center p-2 rounded-lg ${
              activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[10px] font-medium uppercase mt-0.5">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
