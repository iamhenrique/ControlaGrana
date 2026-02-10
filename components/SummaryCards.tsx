
import React from 'react';
import { formatCurrency } from '../utils';

interface ResumoCardProps {
  title: string;
  totalValue: number;
  subValues?: { label: string; value: number }[];
  accentColor?: string;
}

const ResumoCard: React.FC<ResumoCardProps> = ({ title, totalValue, subValues, accentColor }) => {
  return (
    <div className="bg-[#EEEEEE] p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-md transition-shadow">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{title}</span>
      <div className={`text-2xl md:text-3xl font-bold mb-4 ${accentColor || 'text-slate-800'}`}>
        {formatCurrency(totalValue)}
      </div>
      
      {subValues && subValues.length > 0 && (
        <>
          <div className="h-px bg-slate-300 w-full mb-4 opacity-50"></div>
          <div className="grid grid-cols-2 gap-4">
            {subValues.map((sub, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">{sub.label}</span>
                <span className="text-sm font-semibold text-slate-700">{formatCurrency(sub.value)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ResumoCard;
