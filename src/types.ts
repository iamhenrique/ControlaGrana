export enum TransactionType {
  EXPENSE = 'expense',
  REVENUE = 'revenue',
}

export enum TransactionStatus {
  PAID = 'paid',
  RECEIVED = 'received',
  CONCLUDED = 'concluded',
  PENDING = 'pending',
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO date string, e.g., '2026-02-20'
  type: TransactionType;
  status: TransactionStatus;
  category?: string;
  isToggled?: boolean;
}
