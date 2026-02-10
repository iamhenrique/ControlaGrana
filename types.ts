
export enum TransactionType {
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export enum Frequency {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

export enum Status {
  PENDING = 'PENDING',
  PAID = 'PAID'
}

export enum DebtStatus {
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED'
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
}

export interface Revenue {
  id: string;
  value: number;
  date: string;
  categoryId: string;
  isRecurrent: boolean;
  frequency?: Frequency;
}

export interface SimpleExpense {
  id: string;
  value: number;
  dueDate: string;
  categoryId: string;
  paymentMethod: string;
  status: Status;
}

export interface Installment {
  id: string;
  debtId: string;
  installmentNumber: number;
  value: number;
  dueDate: string;
  status: Status;
}

export interface InstallmentDebt {
  id: string;
  description: string;
  totalValue: number;
  startDate: string;
  frequency: Frequency;
  installmentsCount: number;
  installmentValue: number;
  status: DebtStatus;
}
