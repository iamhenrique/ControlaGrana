
import { Frequency, Installment, Status } from './types';

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const addYears = (date: Date, years: number): Date => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
};

export const generateInstallments = (
  debtId: string,
  totalValue: number,
  count: number,
  startDate: string,
  frequency: Frequency
): Installment[] => {
  const installments: Installment[] = [];
  const installmentValue = totalValue / count;
  const initialDate = new Date(startDate);

  for (let i = 1; i <= count; i++) {
    let dueDate = new Date(initialDate);
    
    // Apply frequency (skipping the first one if we assume first installment is on startDate)
    const offset = i - 1;
    if (frequency === Frequency.WEEKLY) dueDate = addDays(initialDate, offset * 7);
    if (frequency === Frequency.BIWEEKLY) dueDate = addDays(initialDate, offset * 15);
    if (frequency === Frequency.MONTHLY) dueDate = addMonths(initialDate, offset);
    if (frequency === Frequency.YEARLY) dueDate = addYears(initialDate, offset);

    installments.push({
      id: `inst-${debtId}-${i}`,
      debtId,
      installmentNumber: i,
      value: installmentValue,
      dueDate: dueDate.toISOString().split('T')[0],
      status: Status.PENDING,
    });
  }

  return installments;
};

export const getMonthYear = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}-${date.getFullYear()}`;
};
