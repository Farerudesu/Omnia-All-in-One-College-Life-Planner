import * as ds from '@/lib/dataService';
import { formatCurrency } from '@/lib/currency';
import type { PrefilledData } from '@/types';

export async function saveProposalToOmnia(data: PrefilledData): Promise<{
  confirmationText: string;
  savedAmount: number;
}> {
  let confirmationText = '';
  let savedAmount = 0;

  const targetDate = data.date || new Date().toISOString().split('T')[0];

  if (data.type === 'event') {
    const savedEvent = await ds.createEvent({
      title: data.title.trim(),
      date: targetDate,
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
      dueDate: `${targetDate}T${dueTime}`,
      courseId: data.courseId,
      priority: data.priority || 'medium',
      status: 'not-started',
      notes: data.notes?.trim() || undefined,
    });
    confirmationText = `Added assignment **${savedTask.title}** due on ${targetDate}${dueTime ? ` at ${dueTime}` : ''}.`;
  } else if (data.type === 'expense') {
    const amt = Number(data.amount) || 0;
    savedAmount = amt;
    const savedTxn = ds.addTransaction({
      merchant: data.title.trim() || 'Campus Expense',
      amount: amt,
      type: 'expense',
      category: data.category || 'Other Discretionary',
      date: targetDate,
      paymentMethod: data.paymentMethod || 'QRIS',
      notes: data.notes?.trim() || undefined,
    });
    const currency = ds.getSettings()?.currency || 'IDR';
    confirmationText = `Logged expense **${formatCurrency(savedTxn.amount, currency)}** for "${savedTxn.merchant}" under ${savedTxn.category} on ${savedTxn.date}.`;
  } else if (data.type === 'note') {
    const { createNote, updateNote, getNote, getCachedNotes } = await import('@/lib/notesService');
    if (data.mode === 'append' && data.noteId) {
      const existing = getCachedNotes().find((n) => n.id === data.noteId) || (await getNote(data.noteId));
      const appendText = data.content || data.notes || '';
      const mergedContent = existing?.content ? `${existing.content}\n\n${appendText}` : appendText;
      const mergedTags = Array.from(new Set([...(existing?.tags || []), ...(data.tags || [])])).slice(0, 10);
      const updated = await updateNote(data.noteId, {
        content: mergedContent.slice(0, 50000),
        tags: mergedTags,
      });
      confirmationText = `Berhasil menambahkan catatan ke **${updated.title || 'Catatan'}**.`;
    } else {
      const newNote = await createNote({
        title: data.title.trim().slice(0, 200) || 'Catatan Baru',
        content: (data.content || data.notes || '').slice(0, 20000),
        tags: (data.tags || []).slice(0, 10),
        courseId: data.courseId,
        assignmentId: data.assignmentId,
        source: 'omni',
      });
      confirmationText = `Catatan **${newNote.title}** berhasil disimpan.`;
    }
  }

  return { confirmationText, savedAmount };
}
