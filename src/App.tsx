import React, { useState } from 'react';
import TransactionItem from './components/TransactionItem';
import { Transaction, TransactionType, TransactionStatus } from './types';

const initialTransactions: Transaction[] = [
  {
    id: '1',
    description: 'GILVAN',
    category: 'EMPRÉSTIMO',
    amount: 300.00,
    date: '2026-02-07',
    type: TransactionType.REVENUE,
    status: TransactionStatus.RECEIVED,
    isToggled: true,
  },
  {
    id: '2',
    description: 'KARINE',
    category: 'EMPRÉSTIMO',
    amount: 150.00,
    date: '2026-02-15',
    type: TransactionType.REVENUE,
    status: TransactionStatus.RECEIVED,
    isToggled: true,
  },
  {
    id: '3',
    description: 'RATEIO',
    category: 'NEGÓCIO 1',
    amount: 500.00,
    date: '2026-02-25',
    type: TransactionType.REVENUE,
    status: TransactionStatus.RECEIVED,
    isToggled: true,
  },
  {
    id: '4',
    description: 'BLING',
    category: 'AMAZON',
    amount: 50.00,
    date: '2026-02-15',
    type: TransactionType.EXPENSE,
    status: TransactionStatus.PAID,
    isToggled: false,
  },
  {
    id: '5',
    description: 'ALUGUEL',
    category: 'CASA',
    amount: 1200.00,
    date: '2026-02-20',
    type: TransactionType.EXPENSE,
    status: TransactionStatus.PAID,
    isToggled: true,
  },
  {
    id: '6',
    description: 'ENERGIA',
    category: 'CASA',
    amount: 180.00,
    date: '2026-02-10',
    type: TransactionType.EXPENSE,
    status: TransactionStatus.PAID,
    isToggled: false,
  },
  {
    id: '7',
    description: 'ÁGUA',
    category: 'CASA',
    amount: 70.00,
    date: '2026-02-05',
    type: TransactionType.EXPENSE,
    status: TransactionStatus.PAID,
    isToggled: true,
  },
  {
    id: '8',
    description: 'INTERNET',
    category: 'CASA',
    amount: 100.00,
    date: '2026-02-12',
    type: TransactionType.EXPENSE,
    status: TransactionStatus.PAID,
    isToggled: true,
  },
  {
    id: '9',
    description: 'New Subscription',
    category: 'SOFTWARE',
    amount: 25.00,
    date: '2026-03-30',
    type: TransactionType.EXPENSE,
    status: TransactionStatus.PAID,
    isToggled: false,
  },
  {
    id: '10',
    description: 'Future Income',
    category: 'INVESTMENT',
    amount: 1000.00,
    date: '2026-04-01',
    type: TransactionType.REVENUE,
    status: TransactionStatus.RECEIVED,
    isToggled: true,
  },
];

const App: React.FC = () => {
  const cutoffDate = new Date('2026-03-30T00:00:00'); // March 30, 2026
  const [transactions, setTransactions] = useState<Transaction[]>(
    initialTransactions.filter((t) => new Date(t.date).getTime() < cutoffDate.getTime())
  );

  const filteredAndSortedTransactions = transactions
    .filter(
      (transaction) =>
        transaction.status === TransactionStatus.PAID ||
        transaction.status === TransactionStatus.RECEIVED
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const revenues = filteredAndSortedTransactions.filter(
    (t) => t.type === TransactionType.REVENUE
  );
  const expenses = filteredAndSortedTransactions.filter(
    (t) => t.type === TransactionType.EXPENSE
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex justify-center">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-gray-800">FLUXO DE CAIXA</h1>
          <button className="ml-4 px-3 py-1 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">Filters</button>
          <span className="text-sm text-gray-500 bg-gray-200 px-3 py-1 rounded-full">{filteredAndSortedTransactions.length} ITENS</span>
        </div>

        {/* Aguardando Section */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-600 mb-2">• AGUARDANDO (7)</h2>
          <div className="bg-yellow-100 rounded-lg p-4 text-sm text-yellow-800">
            {/* Placeholder for awaiting items */}
            Nenhum item aguardando no momento.
          </div>
        </div>

        {/* Receitas Section */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-green-600 mb-2">• RECEITAS ({revenues.length})</h2>
          <div className="divide-y divide-gray-200">
            {revenues.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </div>
        </div>

        {/* Despesas Section */}
        <div>
          <h2 className="text-sm font-semibold text-red-600 mb-2">• DESPESAS ({expenses.length})</h2>
          <div className="divide-y divide-gray-200">
            {expenses.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
