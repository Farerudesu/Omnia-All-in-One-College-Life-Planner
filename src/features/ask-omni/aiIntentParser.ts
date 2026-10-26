import type { Course, PrefilledData } from '@/types';
import { toDateString } from '@/lib/dateUtils';
import type { ExpenseCategory } from '@/lib/categories';
import type { AskOmniResponse } from './askOmni';
import {
  mapProposedActionToPrefilled,
  validateProposal,
  isConfirmationIntent,
  formatPrefilledSummary,
} from './proposalValidator';

export type { PrefilledData };
export {
  validateProposal,
  isConfirmationIntent,
  formatPrefilledSummary,
  mapProposedActionToPrefilled,
};

const ID_MONTH_MAP: Record<string, string> = {
  januari: 'January',
  februari: 'February',
  maret: 'March',
  april: 'April',
  mei: 'May',
  juni: 'June',
  juli: 'July',
  agustus: 'August',
  september: 'September',
  oktober: 'October',
  november: 'November',
  desember: 'December',
  jan: 'Jan',
  feb: 'Feb',
  mar: 'Mar',
  apr: 'Apr',
  jun: 'Jun',
  jul: 'Jul',
  agu: 'Aug',
  sep: 'Sep',
  okt: 'Oct',
  nov: 'Nov',
  des: 'Dec',
};

/**
 * Parses structured calendar event proposals from assistant plain-text messages
 * such as:
 * "Proposal calendar event: Title: Fgd fllstack Date: Tuesday, October 6, 2026 Start: 17:00 End: 17:00"
 */
export function parseProposalFromText(text: string): PrefilledData | null {
  if (!text) return null;
  const isProposal =
    /\b(proposal\s+calendar\s+event|proposal\s+event|jadwal\s+diusulkan)\b/i.test(text) ||
    (/\b(Title|Judul):/i.test(text) &&
      /\b(Date|Tanggal):/i.test(text) &&
      /\b(Start|Waktu|Jam):/i.test(text));

  if (!isProposal) return null;

  // Extract Title
  const titleMatch = text.match(
    /(?:Title|Judul):\s*([^\n\r]+?)(?=(?:\s+(?:Date|Tanggal)|[\r\n]|$))/i
  );
  let title = titleMatch ? titleMatch[1].trim() : '';

  // Extract Date
  const dateMatch = text.match(
    /(?:Date|Tanggal):\s*([^\n\r]+?)(?=(?:\s+(?:Start|Time|Waktu|Jam)|[\r\n]|$))/i
  );
  let dateStr = toDateString(new Date());
  if (dateMatch) {
    const rawDate = dateMatch[1].trim();
    const isoMatch = rawDate.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoMatch) {
      dateStr = isoMatch[1];
    } else {
      let cleanedDate = rawDate.replace(/^[A-Za-z'’]+,\s*/, '');
      for (const [idMonth, enMonth] of Object.entries(ID_MONTH_MAP)) {
        const regex = new RegExp(`\\b${idMonth}\\b`, 'i');
        if (regex.test(cleanedDate)) {
          cleanedDate = cleanedDate.replace(regex, enMonth);
          break;
        }
      }
      const parsed = Date.parse(cleanedDate);
      if (!isNaN(parsed)) {
        dateStr = toDateString(new Date(parsed));
      }
    }
  }

  // Extract Start Time
  let startTime = '10:00';
  const startMatch = text.match(/(?:Start|Mulai|Jam|Time):\s*(\d{1,2}:\d{2})/i);
  if (startMatch) {
    startTime = startMatch[1];
  }

  // Extract End Time
  let endTime = '11:00';
  const endMatch = text.match(/(?:End|Selesai):\s*(\d{1,2}:\d{2})/i);
  if (endMatch) {
    endTime = endMatch[1];
  } else {
    const [h, m] = startTime.split(':').map(Number);
    endTime = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Extract Location
  let location: string | undefined = undefined;
  const locMatch = text.match(
    /(?:Location|Lokasi|Tempat):\s*([^\n\r]+?)(?=(?:\s+(?:Note|Catatan|Kind)|[\r\n]|$))/i
  );
  if (locMatch && locMatch[1].trim() && !/^\(?none\)?$/i.test(locMatch[1].trim())) {
    location = locMatch[1].trim();
  }

  // Extract Notes
  let notes: string | undefined = undefined;
  const noteMatch = text.match(/(?:Note|Catatan):\s*([^\n\r]+?)(?=(?:\s+(?:Kind)|[\r\n]|$))/i);
  if (noteMatch && noteMatch[1].trim() && !/^\(?none\)?$/i.test(noteMatch[1].trim())) {
    notes = noteMatch[1].trim();
  }

  if (!title) {
    title = 'Upcoming Event';
  }

  return {
    type: 'event',
    title,
    date: dateStr,
    startTime,
    endTime,
    location: location || 'Campus',
    notes,
    eventType: 'personal',
  };
}

/**
 * Primary flow: extracts proposal from AskOmniResponse using structured objects first.
 * parseProposalFromText is only invoked as the last fallback when NO structured action/event exists.
 */
export function extractProposalFromResponse(response: AskOmniResponse): PrefilledData | null {
  if (response.proposedActions && response.proposedActions.length > 0) {
    return mapProposedActionToPrefilled(response.proposedActions[0]);
  }
  if (response.proposedAction) {
    return mapProposedActionToPrefilled(response.proposedAction);
  }
  if (response.proposedEvent) {
    return {
      type: 'event',
      title: response.proposedEvent.title,
      date: response.proposedEvent.date,
      startTime: response.proposedEvent.startTime,
      endTime: response.proposedEvent.endTime,
      location: response.proposedEvent.location,
      notes: response.proposedEvent.notes,
      eventType: 'personal',
    };
  }

  let rawCalls: unknown;
  try {
    rawCalls = JSON.parse(response.reply);
  } catch {
    rawCalls = null;
  }
  const calls = Array.isArray(rawCalls) ? rawCalls : rawCalls && typeof rawCalls === 'object' ? [rawCalls] : [];
  for (const call of calls) {
    if (!call || typeof call !== 'object') continue;
    const entry = call as { name?: unknown; arguments?: unknown };
    const name = typeof entry.name === 'string' ? entry.name : '';
    let args: Record<string, unknown> = {};
    if (typeof entry.arguments === 'string') {
      try { args = JSON.parse(entry.arguments) as Record<string, unknown>; } catch { continue; }
    } else if (entry.arguments && typeof entry.arguments === 'object') {
      args = entry.arguments as Record<string, unknown>;
    }
    if (name === 'propose_note' && typeof args.title === 'string' && typeof args.content === 'string') {
      return {
        type: 'note',
        title: args.title.trim(),
        content: args.content.replace(/\\n/g, '\n').trim(),
        tags: Array.isArray(args.tags) ? args.tags.filter((tag): tag is string => typeof tag === 'string') : [],
        mode: args.mode === 'append' ? 'append' : 'create',
        noteId: typeof args.noteId === 'string' ? args.noteId : undefined,
      };
    }
    if (name === 'propose_expense' && typeof args.title === 'string' && typeof args.amount === 'number') {
      return {
        type: 'expense', title: args.title.trim(), amount: args.amount,
        date: typeof args.date === 'string' ? args.date : undefined,
        category: typeof args.category === 'string' ? args.category : 'Food & Groceries',
        paymentMethod: typeof args.paymentMethod === 'string' ? args.paymentMethod : 'QRIS',
      };
    }
    if (name === 'propose_task' && typeof args.title === 'string') {
      return {
        type: 'task', title: args.title.trim(),
        date: typeof args.dueDate === 'string' ? args.dueDate : typeof args.date === 'string' ? args.date : undefined,
        dueTime: typeof args.dueTime === 'string' ? args.dueTime : undefined,
        courseId: typeof args.courseId === 'string' ? args.courseId : undefined,
        priority: args.priority === 'low' || args.priority === 'high' ? args.priority : 'medium',
        notes: typeof args.notes === 'string' ? args.notes : undefined,
      };
    }
  }

  const expenseDetailMatch = response.reply.match(
    /(?:transaksi|transaction):\s*([^\n]+)[\s\S]*?(?:nominal|amount):\s*(?:Rp\s*)?([\d.,]+)[\s\S]*?(?:metode pembayaran|payment method):\s*([^\n]+)/i
  );
  if (expenseDetailMatch) {
    const amount = Number(expenseDetailMatch[2].replace(/\./g, '').replace(',', '.'));
    if (Number.isFinite(amount) && amount > 0) {
      return {
        type: 'expense',
        title: expenseDetailMatch[1].trim(),
        amount,
        date: new Date().toISOString().split('T')[0],
        category: response.reply.match(/kategori:\s*([^\n]+)/i)?.[1]?.trim() || 'Other Discretionary',
        paymentMethod: expenseDetailMatch[3].trim(),
      };
    }
  }

  const taskTextMatch = response.reply.match(
    /(?:catatan dan tugas untuk|tugas untuk)\s+\*{0,2}([^*\n]+?)\*{0,2}\s+dengan deadline\s+\*{0,2}([^*\n(]+?)\*{0,2}/i
  );
  const taskDetailMatch = response.reply.match(
    /(?:tugas|task):\s*([^\n]+)[\s\S]*?(?:tenggat waktu \(deadline\)|deadline):\s*([^,\n]+)(?:,\s*pukul\s*(\d{1,2}:\d{2}))?/i
  );
  const taskMatch = taskTextMatch || taskDetailMatch;
  if (taskMatch) {
    const parsedDate = Date.parse(taskMatch[2].trim());
    if (!Number.isNaN(parsedDate)) {
      return {
        type: 'task',
        title: taskMatch[1].trim().replace(/^\*+|\*+$/g, ''),
        date: toDateString(new Date(parsedDate)),
        dueTime: taskMatch[3] || '23:59',
        priority: /prioritas:\s*(tinggi|high)/i.test(response.reply) ? 'high' : 'medium',
        notes: response.reply.match(/catatan:\s*([^\n]+)/i)?.[1]?.trim(),
      };
    }
  }

  const noteMatch = response.reply.match(/\[propose_note\s+title="([\s\S]*?)"\s+content="([\s\S]*?)"(?:\s+tanggal:\s*([^"\]]+))?(?:\s+tags=\[([^\]]*)\])?\s+mode="(create|append)"\s*\]/i);
  if (noteMatch) {
    return {
      type: 'note',
      title: noteMatch[1].trim(),
      content: noteMatch[2].replace(/\\n/g, '\n').trim(),
      date: noteMatch[3]?.trim(),
      tags: noteMatch[4]?.split(',').map((tag) => tag.replace(/["']/g, '').trim()).filter(Boolean),
      mode: noteMatch[5].toLowerCase() as 'create' | 'append',
    };
  }

  return parseProposalFromText(response.reply);
}

/**
 * Parses user prompt into structured prefilled data for Events, Tasks, or Expenses.
 * Fully supports English & Indonesian.
 */
export function parseUserPromptToData(
  prompt: string,
  courses: Course[] = []
): PrefilledData | null {
  const text = prompt.trim();
  if (!text) return null;
  const lower = text.toLowerCase();

  const isTask =
    /\b(task|assignment|homework|hw|problem\s*set|pset|deliverable|essay|paper|reading|due|project|tugas|pr|pekerjaan\s*rumah|laporan|makalah|kumpulkan|deadline)\b/i.test(
      lower
    );
  const isExpense =
    (/\b(expense|spent|spend|bought|buy|purchased|paid|cost|ledger|\$|\bdollars?|lunch|dinner|coffee|groceries|snack|cafe|food|pengeluaran|catat\s+pengeluaran|bayar|beli|jajan|makan|habis|rp|rupiah)\b/i.test(
      lower
    ) &&
      (/\d+/.test(lower) || /\b(log|add|catat|tambah)\b/i.test(lower))) ||
    /^\s*(?:log\s+expense|catat\s+pengeluaran|pengeluaran)\b/i.test(lower);
  const hasTimeRange =
    /(?:sampai|hingga|sampe|s\/d|s\.d\.|to|-)\s*(?:(pagi|siang|sore|malam)\s+)?(?:jam|pukul\s*)?\d{1,2}/i.test(lower)
    || /\bdari\s+jam\s*\d/i.test(lower);
  const isEvent =
    hasTimeRange ||
    /\b(schedule|meeting|event|appointment|workout|practice|gym|class|exam|party|call|interview|session|hangout|flight|doctor|jadwal|jadwalkan|tambah|tambahin|tambahkan|agendakan|rapat|fgd|kuliah|kelas|ujian|latihan|senam|acara|kegiatan|janji|pertemuan|instalasi)\b/i.test(
      lower
    ) ||
    (/\b(at|on|tomorrow|today|besok|hari\s+ini|lusa|senin|selasa|rabu|kamis|jumat|sabtu|minggu)\b/i.test(
      lower
    ) &&
      /\b(am|pm|jam|\d{1,2}:\d{2})\b/i.test(lower));

  if (!isTask && !isExpense && !isEvent) {
    return null;
  }

  let type: 'event' | 'task' | 'expense' = 'event';
  if (isExpense) {
    type = 'expense';
  } else if (isTask && !hasTimeRange) {
    type = 'task';
  } else {
    type = 'event';
  }

  const now = new Date();
  const targetDate = new Date(now);

  if (/\b(tomorrow|besok)\b/i.test(lower)) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (/\b(lusa)\b/i.test(lower)) {
    targetDate.setDate(targetDate.getDate() + 2);
  } else if (/\b(yesterday|kemarin)\b/i.test(lower)) {
    targetDate.setDate(targetDate.getDate() - 1);
  } else if (/\b(today|hari\s+ini)\b/i.test(lower)) {
    // keep today
  } else {
    const dayMap: Record<string, number> = {
      sunday: 0,
      minggu: 0,
      ahad: 0,
      monday: 1,
      senin: 1,
      tuesday: 2,
      selasa: 2,
      wednesday: 3,
      rabu: 3,
      thursday: 4,
      kamis: 4,
      friday: 5,
      jumat: 5,
      "jum'at": 5,
      saturday: 6,
      sabtu: 6,
    };

    let matchedDay = false;
    for (const [dayName, targetDayNum] of Object.entries(dayMap)) {
      const regex = new RegExp(`\\b(?:hari\\s+)?${dayName}\\b`, 'i');
      if (regex.test(lower)) {
        const currentDay = now.getDay();
        let diff = targetDayNum - currentDay;
        if (diff <= 0) diff += 7;
        targetDate.setDate(targetDate.getDate() + diff);
        matchedDay = true;
        break;
      }
    }

    if (!matchedDay) {
      const specificDateMatch = lower.match(
        /\b(\d{1,2})\s+(jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec)\b/i
      );
      if (specificDateMatch) {
        const monthMap: Record<string, number> = {
          jan: 0,
          feb: 1,
          mar: 2,
          apr: 3,
          mei: 4,
          may: 4,
          jun: 5,
          jul: 6,
          agu: 7,
          aug: 7,
          sep: 8,
          okt: 9,
          oct: 9,
          nov: 10,
          des: 11,
          dec: 11,
        };
        const day = parseInt(specificDateMatch[1], 10);
        const month = monthMap[specificDateMatch[2].slice(0, 3).toLowerCase()];
        if (month !== undefined) {
          targetDate.setMonth(month, day);
          if (targetDate < now) {
            targetDate.setFullYear(now.getFullYear() + 1);
          }
        }
      }
    }
  }
  const dateStr = toDateString(targetDate);

  let startTime = '10:00';
  let endTime = '11:00';

  // Helper to parse hour + minute + period into HH:mm
  const toTimeString = (
    hourStr: string,
    minStr?: string,
    period1?: string,
    period2?: string
  ): string | null => {
    let h = parseInt(hourStr, 10);
    const m = minStr ? parseInt(minStr, 10) : 0;
    if (isNaN(h) || h < 0 || h > 24) return null;

    const period = (period1 || period2 || '').toLowerCase();
    if (period === 'malam' || period === 'sore' || period === 'pm') {
      if (h < 12) h += 12;
    } else if (period === 'siang') {
      if (h < 11) h += 12;
    } else if (period === 'pagi' || period === 'am') {
      if (h === 12) h = 0;
    } else {
      if (h >= 1 && h <= 6) h += 12;
    }
    return `${String(h % 24).padStart(2, '0')}:${String(Math.min(59, Math.max(0, m))).padStart(2, '0')}`;
  };

  // 1. Check for time range (e.g. "dari jam 8 pagi sampai malam jam 8", "jam 9 sampai jam 11", "08:00 - 20:00")
  const rangeMatch = lower.match(
    /(?:dari\s+)?(?:(pagi|siang|sore|malam)\s+)?\b(?:jam|pukul)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(pagi|siang|sore|malam|am|pm)?\s*(?:sampai|hingga|sampe|s\/d|s\.d\.|to|-)\s*(?:(pagi|siang|sore|malam)\s+)?(?:\b(?:jam|pukul)\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(pagi|siang|sore|malam|am|pm)?/i
  ) || lower.match(
    /\b(\d{1,2})[:.](\d{2})\s*(pagi|siang|sore|malam|am|pm)?\s*(?:sampai|hingga|sampe|s\/d|s\.d\.|to|-)\s*(?:(pagi|siang|sore|malam)\s+)?(?:\b(?:jam|pukul)\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(pagi|siang|sore|malam|am|pm)?/i
  );

  if (rangeMatch) {
    const parsedStart = toTimeString(rangeMatch[2], rangeMatch[3], rangeMatch[1], rangeMatch[4]);
    const parsedEnd = toTimeString(rangeMatch[6], rangeMatch[7], rangeMatch[5], rangeMatch[8]);
    if (parsedStart) startTime = parsedStart;
    if (parsedEnd) endTime = parsedEnd;
    else {
      const [h, m] = startTime.split(':').map(Number);
      endTime = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  } else {
    // 2. Single time extraction fallback
    const indoTimeMatch = lower.match(
      /(?:(pagi|siang|sore|malam)\s+)?(?:jam|pukul)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(pagi|siang|sore|malam)?/i
    );
    const engTimeMatch = lower.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);

    if (indoTimeMatch) {
      const parsed = toTimeString(indoTimeMatch[2], indoTimeMatch[3], indoTimeMatch[1], indoTimeMatch[4]);
      if (parsed) {
        startTime = parsed;
        const [h, m] = startTime.split(':').map(Number);
        endTime = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    } else if (engTimeMatch) {
      const parsed = toTimeString(engTimeMatch[1], engTimeMatch[2], undefined, engTimeMatch[3]);
      if (parsed) {
        startTime = parsed;
        const [h, m] = startTime.split(':').map(Number);
        endTime = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }
  }

  let amount = 10;
  const amountMatch = lower.match(
    /(?:rp\.?|idr|\$|usd\s*|spent\s*|cost\s*|paid\s*|bayar\s*|sebesar\s*)?\s*(\d+(?:[.,]\d+)?)\s*(?:dollars?|usd|\$|ribu|k|rb|rupiah|rp)?/i
  );
  if (amountMatch) {
    let parsed = parseFloat(amountMatch[1].replace(',', '.'));
    if (/(?:\b(?:ribu|rb|k)\b|\d\s*(?:rb|k|ribu))/i.test(lower)) {
      parsed *= 1000;
    }
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  let expenseCategory: ExpenseCategory = 'Other Discretionary';
  if (
    /\b(lunch|dinner|breakfast|food|coffee|cafe|groceries|snack|drink|meal|restaurant|pizza|burger|makan|minum|kopi|kafe|sarapan|siang|malam|kantin|jajan|qris)\b/i.test(
      lower
    )
  ) {
    expenseCategory = 'Food & Groceries';
  } else if (
    /\b(book|textbook|supplies|stationery|pen|paper|notebook|buku|alat\s+tulis|fotokopi|print)\b/i.test(
      lower
    )
  ) {
    expenseCategory = 'Books & Supplies';
  } else if (/\b(rent|utilities|housing|kost|kos|sewa|listrik|air|wifi)\b/i.test(lower)) {
    expenseCategory = 'Rent & Utilities';
  } else if (
    /\b(transport|bus|train|uber|lyft|taxi|subway|gas|fuel|fare|bensin|ojol|gojek|grab|kereta|angkot|parkir)\b/i.test(
      lower
    )
  ) {
    expenseCategory = 'Transport';
  } else if (
    /\b(movie|cinema|game|concert|party|entertainment|netflix|spotify|bioskop|nonton|tiket|hiburan)\b/i.test(
      lower
    )
  ) {
    expenseCategory = 'Entertainment';
  } else if (/\b(health|medicine|doctor|pharmacy|obat|dokter|klinik|kesehatan)\b/i.test(lower)) {
    expenseCategory = 'Health';
  }

  let location = 'Campus';
  const locMatch = text.match(
    /\b(?:di|in|at)\s+([A-Za-z0-9\s]+?)(?=(?:\s+(?:jam|hari|tanggal|pukul|pada)|[\r\n,.]|$))/i
  );
  if (locMatch && locMatch[1].trim()) {
    const locClean = locMatch[1]
      .trim()
      .replace(/\b(rumah)\b/i, 'Rumah')
      .replace(/\b(kampus)\b/i, 'Kampus')
      .replace(/\b(perpus|perpustakaan)\b/i, 'Perpustakaan');
    if (
      locClean.length <= 40 &&
      !/^(senin|selasa|rabu|kamis|jumat|sabtu|minggu|today|tomorrow)$/i.test(locClean)
    ) {
      location = locClean.charAt(0).toUpperCase() + locClean.slice(1);
    }
  }

  let matchedCourseId = courses[0]?.id;
  for (const c of courses) {
    if (lower.includes(c.code.toLowerCase()) || lower.includes(c.name.toLowerCase())) {
      matchedCourseId = c.id;
      break;
    }
  }

  let cleanTitle = text;
  if (type === 'expense') {
    cleanTitle = cleanTitle
      .replace(
        /\b(log\s+expense|catat\s+pengeluaran|pengeluaran|tambah\s+pengeluaran|spent|spend|paid|bayar|beli)\b[:\s-]*/gi,
        ''
      )
      .replace(/(?:\$|rp\.?|idr)\s*\d+(?:[.,]\d+)?(?:\s*(?:dollars?|usd|rupiah|ribu|rb|k))?/gi, '')
      .replace(/\b\d+(?:[.,]\d+)?\s*(?:dollars?|usd|\$|rupiah|rp|ribu|rb|k)\b/gi, '')
      .replace(/\b(for|on|buat|untuk|sebesar|di)\b/gi, '')
      .replace(/\b(today|tomorrow|yesterday|hari\s+ini|besok|kemarin)\b/gi, '')
      .trim();
  } else {
    cleanTitle = cleanTitle
      .replace(
        /\b(add|schedule|create|log|remind me to|please|put|can you|jadwal|jadwalkan|tambahakn|tambahkan|tambahin|tambah|agendakan|buat|tolong|baru)\b[:\s-]*/gi,
        ''
      )
      .replace(
        /(?:dari\s+)?(?:(?:pagi|siang|sore|malam)\s+)?\b(?:jam|pukul)\s*\d{1,2}(?:[:.]\d{2})?\s*(?:pagi|siang|sore|malam|am|pm)?\s*(?:sampai|hingga|sampe|s\/d|s\.d\.|to|-)\s*(?:(?:pagi|siang|sore|malam)\s+)?(?:\b(?:jam|pukul)\s*)?\d{1,2}(?:[:.]\d{2})?\s*(?:pagi|siang|sore|malam|am|pm)?/gi,
        ''
      )
      .replace(
        /\b\d{1,2}[:.]\d{2}\s*(?:pagi|siang|sore|malam|am|pm)?\s*(?:sampai|hingga|sampe|s\/d|s\.d\.|to|-)\s*(?:(?:pagi|siang|sore|malam)\s+)?(?:\b(?:jam|pukul)\s*)?\d{1,2}(?:[:.]\d{2})?\s*(?:pagi|siang|sore|malam|am|pm)?/gi,
        ''
      )
      .replace(/\b(dari\s+jam|jam|pukul)\s*\d{1,2}(?:[:.]\d{2})?\s*(pagi|siang|sore|malam)?\b/gi, '')
      .replace(/\b(?:at\s+\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?|\d{1,2}:\d{2}(?:\s*(?:am|pm))?|\d{1,2}\s*(?:am|pm))\b/gi, '')
      .replace(/\b(tomorrow|today|yesterday|besok|lusa|kemarin|hari\s+ini)\b/gi, '')
      .replace(
        /\b(hari\s+)?(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi,
        ''
      )
      .replace(/\bdari\b/gi, '')
      .replace(/\b(di|in|at)\s+[A-Za-z0-9\s]+$/gi, '')
      .replace(
        /\b(task|assignment|event|jadwal|tugas|acara|kegiatan|pr|homework|hw|expense|pengeluaran)\b/gi,
        ''
      )
      .trim();
  }

  cleanTitle = cleanTitle.replace(/^[\s,–—:-]+|[\s,–—:-]+$/g, '').trim();

  if (!cleanTitle || cleanTitle.length <= 2) {
    return null;
  }

  cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

  return {
    type,
    title: cleanTitle,
    date: dateStr,
    startTime,
    endTime,
    location,
    notes: text,
    eventType: /\bexam|ujian\b/i.test(lower)
      ? 'exam'
      : /\bdeadline|kumpulkan\b/i.test(lower)
        ? 'deadline'
        : 'personal',
    courseId: matchedCourseId,
    dueTime: startTime,
    priority: /\b(urgent|high|asap|penting)\b/i.test(lower) ? 'high' : 'medium',
    amount,
    category: expenseCategory,
  };
}
