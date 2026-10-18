import * as ds from '@/lib/dataService';
import { formatCurrency } from '@/lib/currency';
import type { PrefilledData } from '@/types';

export async function saveProposalToOmnia(data: PrefilledData): Promise<{
  confirmationText: string;
  savedAmount: number;
}> {
  let confirmationText = '';
  let savedAmount = 0;

  if (data.type === 'event') {
    const savedEvent = await ds.createEvent({
      title: data.title.trim(),
      date: data.date,
      type: data.eventType || 'personal',
      startTime: data.startTime || undefined,
      endTime: data.endTime || undefined,
      location: data.location?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      courseId: data.courseId,
    });
    const dateLabel = new Date(`${savedEvent.date}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    confirmationText = `Added **${savedEvent.title}** to your schedule for ${dateLabel}${savedEvent.startTime ? ` at ${savedEvent.startTime}${savedEvent.endTime ? `–${savedEvent.endTime}` : ''}` : ''}.`;
  } else if (data.type === 'task') {
    const dueTime = data.dueTime || (data.startTime ? data.startTime : '23:59');
    const savedTask = await ds.addAssignment({
      title: data.title.trim(),
      dueDate: `${data.date}T${dueTime}`,
      courseId: data.courseId,
      priority: data.priority || 'medium',
      status: 'not-started',
      notes: data.notes?.trim() || undefined,
    });
    confirmationText = `Added assignment **${savedTask.title}** due on ${data.date}${dueTime ? ` at ${dueTime}` : ''}.`;
  } else if (data.type === 'expense') {
    const amt = Number(data.amount) || 0;
    savedAmount = amt;
    const savedTxn = ds.addTransaction({
      merchant: data.title.trim() || 'Campus Expense',
      amount: amt,
      type: 'expense',
      category: data.category || 'Other Discretionary',
      date: data.date,
      paymentMethod: data.paymentMethod || 'QRIS',
      notes: data.notes?.trim() || undefined,
    });
    const currency = ds.getSettings()?.currency || 'IDR';
    confirmationText = `Logged expense **${formatCurrency(savedTxn.amount, currency)}** for "${savedTxn.merchant}" under ${savedTxn.category} on ${savedTxn.date}.`;
  }

  return { confirmationText, savedAmount };
}
