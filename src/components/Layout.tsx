import React from 'react';
import { Home, Repeat } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-6">
        <div className="flex items-center mb-8">
          <div className="bg-blue-600 rounded-lg p-2 mr-3">
            <span className="text-white font-bold text-xl">G</span>
          </div>
          <span className="text-xl font-bold text-gray-800">CONTROLAGRANA</span>
        </div>

        <nav>
          <ul>
            <li className="mb-2">
              <a href="#" className="flex items-center p-3 rounded-lg text-gray-700 hover:bg-gray-200">
                <Home className="mr-3" size={20} />
                HOME
              </a>
            </li>
            <li className="mb-2">
              <a href="#" className="flex items-center p-3 rounded-lg bg-blue-100 text-blue-700 font-semibold">
                <Repeat className="mr-3" size={20} />
                EXTRATO
              </a>
            </li>
          </ul>
        </nav>

        <div className="absolute bottom-6 left-6">
          <p className="text-xs text-gray-500 uppercase">STATUS</p>
          <div className="flex items-center mt-1">
            <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
            <span className="text-sm text-gray-700">SINCRONIZADO</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
