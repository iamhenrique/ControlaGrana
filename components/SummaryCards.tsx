
import React from 'react';
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
  // Cores conforme a especificação
  const mainTextColor = "text-[#0F172A]";
  const secondaryTextColor = "text-[#64748B]";
  
  if (isHero) {
    return (
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-[#E2E8F0] shadow-sm transition-all duration-300">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-semibold text-[#64748B] uppercase tracking-wide">{title}</span>
          {headerAction}
        </div>
        <div className={`text-[28px] md:text-[32px] font-bold ${mainTextColor} tracking-tight mb-6`}>
          {formatCurrency(totalValue)}
        </div>
        {subValues && subValues.length > 0 && (
          <div className="flex gap-8 pt-4 border-t border-[#E2E8F0]">
            {subValues.map((sub, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-xs font-normal text-[#64748B] mb-1">{sub.label}</span>
                <span className="text-base font-semibold text-[#0F172A]">{formatCurrency(sub.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col h-full hover:shadow-md transition-shadow duration-300">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[14px] font-semibold text-[#64748B] tracking-wide">{title}</span>
        {headerAction}
      </div>
      
      <div className={`text-[18px] md:text-[20px] font-semibold tracking-tight ${accentColor || mainTextColor}`}>
        {formatCurrency(totalValue)}
      </div>
      
      {subValues && subValues.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#E2E8F0] space-y-1">
          {subValues.map((sub, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <span className="text-[12px] font-normal text-[#64748B]">{sub.label}</span>
              <span className="text-[12px] font-semibold text-[#0F172A]">{formatCurrency(sub.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResumoCard;
