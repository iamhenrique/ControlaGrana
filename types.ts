
export enum TransactionType {
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export enum Frequency {
  DAILY = 'DAILY',
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

export interface User {
  id: string;
  nome: string;
  email: string;
  criado_em: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  limitValue: number;
  month: number;
  year: number;
}

export interface Revenue {
  id: string;
  userId?: string;
  description: string;
  value: number;
  date: string;
  categoryId: string;
  status: Status;
  isRecurrent: boolean;
  frequency?: Frequency;
  created_at?: string;
  paidAt?: string;
}

export interface SimpleExpense {
  id: string;
  userId?: string;
  description: string;
  value: number;
  dueDate: string;
  categoryId: string;
  paymentMethod: string;
  status: Status;
  isRecurrent: boolean;
  frequency?: Frequency;
  created_at?: string;
  paidAt?: string;
}

export interface Installment {
  id: string;
  debtId: string;
  installmentNumber: number;
  value: number;
  dueDate: string;
  status: Status;
  paidAt?: string;
}

export interface InstallmentDebt {
  id: string;
  userId?: string;
  description: string;
  totalValue: number;
  startDate: string;
  frequency: Frequency;
  installmentsCount: number;
  installmentValue: number;
  status: DebtStatus;
  categoryId?: string;
  created_at?: string;
}

export interface InactiveTransaction {
  id: string;
  originalId?: string;
  userId: string;
  tipoOriginal: 'RECEITA' | 'DESPESA' | 'PARCELA';
  description: string;
  value: number;
  dataReferencia: string;
  categoryId?: string;
  statusNoMomento?: string;
  isRecurrent?: boolean;
  frequency?: string;
  paymentMethod?: string;
  motivoInativacao?: string;
  criadoEmOriginal?: string;
  inativadoEm: string;
}
