
import React from 'react';
import { formatCurrency } from '../utils';

interface ResumoCardProps {
  title: string;
  totalValue: number;
  subValues?: { label: string; value: number }[];
  accentColor?: string;
  headerAction?: React.ReactNode;
  children?: React.ReactNode;
}

const ResumoCard: React.FC<ResumoCardProps> = ({ title, totalValue, subValues, accentColor, headerAction, children }) => {
  return (
    <div className="bg-[#EEEEEE] p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</span>
        {headerAction}
      </div>
      
      <div className={`text-2xl md:text-3xl font-bold mb-4 ${accentColor || 'text-slate-800'}`}>
        {formatCurrency(totalValue)}
      </div>
      
      {subValues && subValues.length > 0 && (
        <div className="mt-auto">
          <div className="h-px bg-slate-300 w-full mb-4 opacity-50"></div>
          <div className="grid grid-cols-2 gap-4">
            {subValues.map((sub, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">{sub.label}</span>
                <span className="text-sm font-semibold text-slate-700">{formatCurrency(sub.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {children && (
        <div className="mt-4 pt-4 border-t border-slate-300/50">
          {children}
        </div>
      )}
    </div>
  );
};

export default ResumoCard;
