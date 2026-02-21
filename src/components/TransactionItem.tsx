import React from 'react';
import { Transaction, TransactionType } from '../types';

interface TransactionItemProps {
  transaction: Transaction;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const date = new Date(transaction.date);
  const month = date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
  const day = date.getDate();

  const amountColorClass =
    transaction.type === TransactionType.EXPENSE ? 'text-red-600' : 'text-green-600';

  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(transaction.amount);

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-200 last:border-b-0">
      <div className="flex items-center">
        <div className="flex flex-col items-center justify-center bg-gray-200 rounded-lg p-2 w-16 h-16 mr-4">
          <span className="text-xs font-semibold text-gray-600">{month}</span>
          <span className="text-2xl font-bold text-gray-800">{day}</span>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-800">{transaction.description}</p>
          {transaction.category && (
            <p className="text-sm text-gray-500">{transaction.category}</p>
          )}
        </div>
      </div>
      <div className="flex items-center">
        <p className={`text-lg font-semibold ${amountColorClass} mr-4`}>
          {transaction.type === TransactionType.EXPENSE ? '-' : ''}{formattedAmount}
        </p>
        {/* Toggle Switch Placeholder */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" value="" className="sr-only peer" defaultChecked={transaction.isToggled} />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>
  );
};

export default TransactionItem;
