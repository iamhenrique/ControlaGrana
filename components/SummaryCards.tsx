
import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils';

interface ResumoCardProps {
  title: string;
  totalValue: number;
  subValues?: { label: string; value: number }[];
  accentColor?: string;
  headerAction?: React.ReactNode;
  isHero?: boolean;
}

const ResumoCard: React.FC<ResumoCardProps> = ({ title, totalValue, subValues, accentColor, headerAction, isHero }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  // Trigger animation when totalValue changes
  useEffect(() => {
    setIsUpdating(true);
    const timer = setTimeout(() => setIsUpdating(false), 600);
    return () => clearTimeout(timer);
  }, [totalValue]);

  const mainTextColor = "text-[#0F172A]";
  
  if (isHero) {
    return (
      <div className={`bg-white p-6 md:p-8 rounded-2xl border transition-all duration-500 shadow-sm ${isUpdating ? 'border-[#2563EB]/40 ring-4 ring-[#2563EB]/5' : 'border-[#E2E8F0]'}`}>
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-bold text-[#64748B] uppercase tracking-wide">{title.toUpperCase()}</span>
          {headerAction}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:divide-x divide-[#E2E8F0]">
          <div className="flex flex-col justify-center">
            <div className={`text-[28px] md:text-[32px] font-bold tracking-tight transition-all duration-500 transform ${isUpdating ? 'scale-[1.03] text-[#2563EB]' : 'scale-100 ' + mainTextColor}`}>
              {formatCurrency(totalValue)}
            </div>
          </div>
          {subValues && subValues.length > 0 && (
            <div className="flex flex-col gap-3 sm:pl-8 justify-center">
              {subValues.map((sub, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{sub.label.toUpperCase()}</span>
                  <span className={`text-sm font-bold ${sub.label.toUpperCase() === 'RECEITAS' ? 'text-[#16A34A]' : sub.label.toUpperCase() === 'DESPESAS' ? 'text-[#DC2626]' : 'text-[#0F172A]'}`}>{formatCurrency(sub.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white p-6 rounded-2xl border transition-all duration-500 shadow-sm flex flex-col h-full hover:shadow-md ${isUpdating ? 'border-[#2563EB]/20 bg-[#F8FAFC]' : 'border-[#E2E8F0]'}`}>
      <div className="flex justify-between items-center mb-4">
        <span className="text-[14px] font-bold text-[#64748B] tracking-wide uppercase">{title.toUpperCase()}</span>
        {headerAction}
      </div>
      
      <div className={`text-[18px] md:text-[20px] font-bold tracking-tight transition-all duration-500 ${isUpdating ? 'scale-105' : ''} ${accentColor || mainTextColor}`}>
        {formatCurrency(totalValue)}
      </div>
      
      {subValues && subValues.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#E2E8F0] space-y-1">
          {subValues.map((sub, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <span className="text-[12px] font-bold text-[#64748B] uppercase">{sub.label.toUpperCase()}</span>
              <span className="text-[12px] font-bold text-[#0F172A]">{formatCurrency(sub.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResumoCard;
