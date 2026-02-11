
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
    { id: 'dashboard', label: 'Home', icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? 'text-[#2563EB]' : 'text-[#64748B]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )},
    { id: 'transactions', label: 'Fluxo', icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? 'text-[#2563EB]' : 'text-[#64748B]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    )},
    { id: 'debts', label: 'Parcelas', icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? 'text-[#2563EB]' : 'text-[#64748B]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    )},
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] md:pl-64 flex flex-col font-sans text-[#0F172A] selection:bg-[#2563EB]/10 selection:text-[#2563EB]">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-[#E2E8F0] flex-col p-6 z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-9 h-9 bg-[#2563EB] rounded-lg flex items-center justify-center text-white text-lg font-bold shadow-md">G</div>
          <h1 className="text-sm font-bold tracking-wider text-[#0F172A] uppercase">ControlaGrana</h1>
        </div>
        
        <nav className="flex-1 space-y-1">
          {tabs.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-semibold ${
                  active 
                  ? 'bg-[#2563EB]/5 text-[#2563EB]' 
                  : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }`}
              >
                {tab.icon(active)}
                {tab.label}
              </button>
            );
          })}
        </nav>
        
        <div className="mt-auto px-2">
             <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                 <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-widest mb-1">Status</p>
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#16A34A] rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-[#0F172A]">Sincronizado</span>
                 </div>
             </div>
        </div>
      </aside>

      {/* Dynamic Header */}
      <header className={`sticky top-0 z-[80] transition-all bg-white border-b border-[#E2E8F0] ${headerClassName}`}>
        {headerContent ? headerContent : (
          <div className="px-6 md:px-10 h-16 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 md:px-10 md:py-12">
        {children}
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 h-16 bg-white border border-[#E2E8F0] rounded-2xl flex justify-around items-center px-2 z-[85] shadow-lg">
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 transition-all duration-300 px-4 py-2 rounded-xl ${
                active ? 'text-[#2563EB]' : 'text-[#64748B]'
              }`}
            >
              <div className={active ? 'scale-110' : 'scale-100'}>
                {tab.icon(active)}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="h-20 md:hidden"></div> {/* Spacer for bottom nav */}
    </div>
  );
};

export default Layout;
