
import React from 'react';
import { formatCurrency } from '../utils';

interface CardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
}

const SummaryCards: React.FC<CardProps> = ({ title, value, icon, color }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${color}`}>{icon}</span>
      </div>
      <div className="text-2xl md:text-3xl font-bold text-slate-800">
        {formatCurrency(value)}
      </div>
    </div>
  );
};

export default SummaryCards;
