import type { Course, PrefilledData } from '../types';
import { normalizeTransactionCategory, type ExpenseCategory } from './categories';
import { toDateString } from './dateUtils';
import { getCurrencySymbol } from './currency';
import { translations, type Language } from './i18n';
import type { ProposedAction, AskOmniResponse } from './askOmni';

export type { PrefilledData };

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

export function formatPrefilledSummary(data: PrefilledData): string {
  if (data.type === 'expense') {
    const currencySymbol = getCurrencySymbol(undefined);
    const formatted = data.amount
      ? `${currencySymbol}${data.amount.toLocaleString()}`
      : '(no amount)';
    return `Log Expense: ${formatted} for "${data.title}" (${data.category || 'other'}) on ${data.date}`;
  }
  if (data.type === 'task') {
    return `Add Task: "${data.title}" due ${data.date}${data.dueTime ? ` at ${data.dueTime}` : ''}`;
  }
  return `Schedule Event: "${data.title}" on ${data.date}${data.startTime ? ` at ${data.startTime}${data.endTime ? `–${data.endTime}` : ''}` : ''}${data.location && data.location !== 'Campus' ? ` • ${data.location}` : ''}`;
}

/**
 * Checks if the user is confirming a pending proposal (e.g. "tambahkan", "add", "oke", "ya").
 */
export function isConfirmationIntent(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(tambahkan|tambah|add|oke|ok|yes|ya|simpan|save|confirm|deal|lanjut|gas|yep|iya|setuju|bisa)$/i.test(t)
    || /^(tambahkan\s+(ini|itu|jadwal|acara|event)|add\s+(this|it|event))$/i.test(t);
}

/**
 * Validates a proposal before client-side saving.
 * Rejects invalid proposals with clear i18n messages.
 */
export function validateProposal(
  data: PrefilledData,
  lang: Language = 'id'
): { valid: boolean; error?: string } {
  const t = translations[lang].proposalValidation;

  // 1. Title is non-empty
  if (!data.title || !data.title.trim()) {
    return { valid: false, error: t.titleRequired };
  }

  // 2. Date format YYYY-MM-DD valid
  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return { valid: false, error: t.invalidDateFormat };
  }
  const [y, m, d] = data.date.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  if (
    dateObj.getFullYear() !== y ||
    dateObj.getMonth() !== m - 1 ||
    dateObj.getDate() !== d
  ) {
    return { valid: false, error: t.invalidDateFormat };
  }

  // 3. Start time format HH:mm if provided
  if (data.startTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(data.startTime)) {
    return { valid: false, error: t.invalidStartTimeFormat };
  }

  // 4. End time format HH:mm and endTime >= startTime
  if (data.endTime) {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(data.endTime)) {
      return { valid: false, error: t.invalidEndTimeFormat };
    }
    if (data.startTime && data.endTime < data.startTime) {
      return { valid: false, error: t.endTimeBeforeStartTime };
    }
  }

  // 5. Positive integer amount for expenses
  if (data.type === 'expense') {
    if (
      typeof data.amount !== 'number' ||
      !Number.isInteger(data.amount) ||
      data.amount <= 0
    ) {
      return { valid: false, error: t.invalidExpenseAmount };
    }
  }

  return { valid: true };
}

/**
 * Maps a structured ProposedAction from AskOmniResponse to PrefilledData.
 */
export function mapProposedActionToPrefilled(action: ProposedAction): PrefilledData {
  if (action.type === 'event') {
    return {
      type: 'event',
      title: action.title,
      date: action.date,
      startTime: action.startTime,
      endTime: action.endTime,
      location: action.location,
      notes: action.notes,
      eventType: 'personal',
    };
  }
  if (action.type === 'task') {
    return {
      type: 'task',
      title: action.title,
      date: action.date,
      dueTime: action.dueTime,
      courseId: action.courseId,
      priority: action.priority,
      notes: action.notes,
    };
  }
  return {
    type: 'expense',
    title: action.title,
    date: action.date,
    amount: action.amount,
    category: (action.category ? normalizeTransactionCategory(action.category) : 'Food & Groceries') as ExpenseCategory,
    paymentMethod: action.paymentMethod || 'QRIS',
    notes: action.notes,
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
  // Fallback terakhir: hanya aktif jika respons TIDAK punya proposal terstruktur
  return parseProposalFromText(response.reply);
}

/**
 * Parses structured calendar event proposals from assistant plain-text messages
 * such as:
 * "Proposal calendar event: Title: Fgd fllstack Date: Tuesday, October 6, 2026 Start: 17:00 End: 17:00"
 */
export function parseProposalFromText(text: string): PrefilledData | null {
  if (!text) return null;
  const isProposal = /\b(proposal\s+calendar\s+event|proposal\s+event|jadwal\s+diusulkan)\b/i.test(text)
    || (/\b(Title|Judul):/i.test(text) && /\b(Date|Tanggal):/i.test(text) && /\b(Start|Waktu|Jam):/i.test(text));

  if (!isProposal) return null;

  // Extract Title
  const titleMatch = text.match(/(?:Title|Judul):\s*([^\n\r]+?)(?=(?:\s+(?:Date|Tanggal)|[\r\n]|$))/i);
  let title = titleMatch ? titleMatch[1].trim() : '';

  // Extract Date
  const dateMatch = text.match(/(?:Date|Tanggal):\s*([^\n\r]+?)(?=(?:\s+(?:Start|Time|Waktu|Jam)|[\r\n]|$))/i);
  let dateStr = toDateString(new Date());
  if (dateMatch) {
    const rawDate = dateMatch[1].trim();
    // Try YYYY-MM-DD
    const isoMatch = rawDate.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoMatch) {
      dateStr = isoMatch[1];
    } else {
      // Try parsing English or Indonesian dates
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
    // default to 1 hour after start
    const [h, m] = startTime.split(':').map(Number);
    endTime = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Extract Location
  let location: string | undefined = undefined;
  const locMatch = text.match(/(?:Location|Lokasi|Tempat):\s*([^\n\r]+?)(?=(?:\s+(?:Note|Catatan|Kind)|[\r\n]|$))/i);
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
 * Parses user prompt into structured prefilled data for Events, Tasks, or Expenses.
 * Fully supports English & Indonesian.
 */
export function parseUserPromptToData(prompt: string, courses: Course[] = []): PrefilledData | null {
  const text = prompt.trim();
  if (!text) return null;
  const lower = text.toLowerCase();

  // 1. Intent Detection (English & Indonesian)
  const isTask = /\b(task|assignment|homework|hw|problem\s*set|pset|deliverable|essay|paper|reading|due|project|tugas|pr|pekerjaan\s*rumah|laporan|makalah|kumpulkan|deadline)\b/i.test(lower);
  const isExpense = (/\b(expense|spent|spend|bought|buy|purchased|paid|cost|ledger|\$|\bdollars?|lunch|dinner|coffee|groceries|snack|cafe|food|pengeluaran|catat\s+pengeluaran|bayar|beli|jajan|makan|habis|rp|rupiah)\b/i.test(lower)
    && (/\d+/.test(lower) || /\b(log|add|catat|tambah)\b/i.test(lower)))
    || /^\s*(?:log\s+expense|catat\s+pengeluaran|pengeluaran)\b/i.test(lower);
  const isEvent = /\b(schedule|meeting|event|appointment|workout|practice|gym|class|exam|party|call|interview|session|hangout|flight|doctor|jadwal|jadwalkan|tambah|tambahkan|agendakan|rapat|fgd|kuliah|kelas|ujian|latihan|senam|acara|kegiatan|janji|pertemuan)\b/i.test(lower)
    || (/\b(at|on|tomorrow|today|besok|hari\s+ini|lusa|senin|selasa|rabu|kamis|jumat|sabtu|minggu)\b/i.test(lower) && /\b(am|pm|jam|\d{1,2}:\d{2})\b/i.test(lower));

  if (!isTask && !isExpense && !isEvent) {
    return null;
  }

  // Determine Type
  let type: 'event' | 'task' | 'expense' = 'event';
  if (isExpense) {
    type = 'expense';
  } else if (isTask) {
    type = 'task';
  } else {
    type = 'event';
  }

  // 2. Date Parsing (English & Indonesian)
  const now = new Date();
  const targetDate = new Date(now);

  if (/\b(tomorrow|besok)\b/i.test(lower)) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (/\b(lusa)\b/i.test(lower)) {
    targetDate.setDate(targetDate.getDate() + 2);
  } else if (/\b(yesterday|kemarin)\b/i.test(lower)) {
    targetDate.setDate(targetDate.getDate() - 1);
  } else if (/\b(today|hari\s+ini)\b/i.test(lower)) {
    // today: keep now
  } else {
    // English & Indonesian Days of Week
    // Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6
    const dayMap: Record<string, number> = {
      sunday: 0, minggu: 0, ahad: 0,
      monday: 1, senin: 1,
      tuesday: 2, selasa: 2,
      wednesday: 3, rabu: 3,
      thursday: 4, kamis: 4,
      friday: 5, jumat: 5, "jum'at": 5,
      saturday: 6, sabtu: 6,
    };

    let matchedDay = false;
    for (const [dayName, targetDayNum] of Object.entries(dayMap)) {
      const regex = new RegExp(`\\b(?:hari\\s+)?${dayName}\\b`, 'i');
      if (regex.test(lower)) {
        const currentDay = now.getDay();
        let diff = targetDayNum - currentDay;
        if (diff <= 0) diff += 7; // next occurrence
        targetDate.setDate(targetDate.getDate() + diff);
        matchedDay = true;
        break;
      }
    }

    if (!matchedDay) {
      // Check for specific date pattern (e.g. 2026-10-06 or 6 okt or 6 oct)
      const specificDateMatch = lower.match(/\b(\d{1,2})\s+(jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec)\b/i);
      if (specificDateMatch) {
        const monthMap: Record<string, number> = {
          jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6,
          agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11,
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

  // 3. Time Parsing (English & Indonesian)
  let startTime = '10:00';
  let endTime = '11:00';

  // Indonesian "jam 5 sore", "jam 5", "pukul 17:00", "jam 16:10", "16.10"
  const indoTimeMatch = lower.match(/\b(?:jam|pukul)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(pagi|siang|sore|malam)?\b/i);
  const engTimeMatch = lower.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);

  if (indoTimeMatch) {
    let hours = parseInt(indoTimeMatch[1], 10);
    const mins = indoTimeMatch[2] ? parseInt(indoTimeMatch[2], 10) : 0;
    const period = indoTimeMatch[3]?.toLowerCase();

    if (period === 'sore' || period === 'malam') {
      if (hours < 12) hours += 12;
    } else if (period === 'siang') {
      if (hours < 11) hours += 12;
    } else if (period === 'pagi') {
      if (hours === 12) hours = 0;
    } else {
      // No period specified: e.g. "jam 5". If 1 <= hours <= 6 in a schedule context, likely afternoon (13:00-18:00)
      if (hours >= 1 && hours <= 6) {
        hours += 12;
      }
    }

    if (hours >= 0 && hours < 24) {
      startTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      const endHours = (hours + 1) % 24;
      endTime = `${String(endHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }
  } else if (engTimeMatch) {
    let hours = parseInt(engTimeMatch[1], 10);
    const mins = engTimeMatch[2] ? parseInt(engTimeMatch[2], 10) : 0;
    const meridian = engTimeMatch[3]?.toLowerCase();

    if (meridian === 'pm' && hours < 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;

    if (hours >= 0 && hours < 24) {
      startTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      const endHours = (hours + 1) % 24;
      endTime = `${String(endHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }
  }

  // 4. Amount Parsing for expenses
  let amount = 10;
  const amountMatch = lower.match(/(?:rp\.?|idr|\$|usd\s*|spent\s*|cost\s*|paid\s*|bayar\s*|sebesar\s*)?\s*(\d+(?:[.,]\d+)?)\s*(?:dollars?|usd|\$|ribu|k|rb|rupiah|rp)?/i);
  if (amountMatch) {
    let parsed = parseFloat(amountMatch[1].replace(',', '.'));
    if (/\b(ribu|rb|k)\b/i.test(lower)) {
      parsed *= 1000;
    }
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  // 5. Expense Category Detection
  let expenseCategory: ExpenseCategory = 'Other Discretionary';
  if (/\b(lunch|dinner|breakfast|food|coffee|cafe|groceries|snack|drink|meal|restaurant|pizza|burger|makan|minum|kopi|kafe|sarapan|siang|malam|kantin|jajan|qris)\b/i.test(lower)) {
    expenseCategory = 'Food & Groceries';
  } else if (/\b(book|textbook|supplies|stationery|pen|paper|notebook|buku|alat\s+tulis|fotokopi|print)\b/i.test(lower)) {
    expenseCategory = 'Books & Supplies';
  } else if (/\b(rent|utilities|housing|kost|kos|sewa|listrik|air|wifi)\b/i.test(lower)) {
    expenseCategory = 'Rent & Utilities';
  } else if (/\b(transport|bus|train|uber|lyft|taxi|subway|gas|fuel|fare|bensin|ojol|gojek|grab|kereta|angkot|parkir)\b/i.test(lower)) {
    expenseCategory = 'Transport';
  } else if (/\b(movie|cinema|game|concert|party|entertainment|netflix|spotify|bioskop|nonton|tiket|hiburan)\b/i.test(lower)) {
    expenseCategory = 'Entertainment';
  } else if (/\b(health|medicine|doctor|pharmacy|obat|dokter|klinik|kesehatan)\b/i.test(lower)) {
    expenseCategory = 'Health';
  }

  // 6. Location Detection (di rumah, di kampus, at library...)
  let location = 'Campus';
  const locMatch = text.match(/\b(?:di|in|at)\s+([A-Za-z0-9\s]+?)(?=(?:\s+(?:jam|hari|tanggal|pukul|pada)|[\r\n,.]|$))/i);
  if (locMatch && locMatch[1].trim()) {
    const locClean = locMatch[1].trim().replace(/\b(rumah)\b/i, 'Rumah').replace(/\b(kampus)\b/i, 'Kampus').replace(/\b(perpus|perpustakaan)\b/i, 'Perpustakaan');
    if (locClean.length <= 40 && !/^(senin|selasa|rabu|kamis|jumat|sabtu|minggu|today|tomorrow)$/i.test(locClean)) {
      location = locClean.charAt(0).toUpperCase() + locClean.slice(1);
    }
  }

  // 7. Match Course
  let matchedCourseId = courses[0]?.id;
  for (const c of courses) {
    if (lower.includes(c.code.toLowerCase()) || lower.includes(c.name.toLowerCase())) {
      matchedCourseId = c.id;
      break;
    }
  }

  // 8. Clean Title Extraction
  let cleanTitle = text;

  if (type === 'expense') {
    cleanTitle = cleanTitle
      .replace(/\b(log\s+expense|catat\s+pengeluaran|pengeluaran|tambah\s+pengeluaran|spent|spend|paid|bayar|beli)\b[:\s-]*/gi, '')
      .replace(/(?:\$|rp\.?|idr)\s*\d+(?:[.,]\d+)?(?:\s*(?:dollars?|usd|rupiah|ribu|rb|k))?/gi, '')
      .replace(/\b\d+(?:[.,]\d+)?\s*(?:dollars?|usd|\$|rupiah|rp|ribu|rb|k)\b/gi, '')
      .replace(/\b(for|on|buat|untuk|sebesar|di)\b/gi, '')
      .replace(/\b(today|tomorrow|yesterday|hari\s+ini|besok|kemarin)\b/gi, '')
      .trim();
  } else {
    cleanTitle = cleanTitle
      .replace(/\b(add|schedule|create|log|remind me to|please|put|can you|jadwal|jadwalkan|tambahakn|tambahkan|tambah|agendakan|buat|tolong|baru)\b[:\s-]*/gi, '')
      .replace(/\b(tomorrow|today|yesterday|besok|lusa|kemarin|hari\s+ini)\b/gi, '')
      .replace(/\b(hari\s+)?(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, '')
      .replace(/\b(jam|pukul)\s*\d{1,2}(?:[:.]\d{2})?\s*(pagi|siang|sore|malam)?\b/gi, '')
      .replace(/\b(?:at\s*)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi, '')
      .replace(/\b(di|in|at)\s+[A-Za-z0-9\s]+$/gi, '') // trailing location
      .replace(/\b(task|assignment|event|jadwal|tugas|acara|kegiatan|pr|homework|hw|expense|pengeluaran)\b/gi, '')
      .trim();
  }

  // Remove leading/trailing punctuation or prepositions
  cleanTitle = cleanTitle.replace(/^[\s,–—:-]+|[\s,–—:-]+$/g, '').trim();

  if (!cleanTitle || cleanTitle.length <= 2) {
    return null; // Return null if there's no descriptive title left, letting AI handle the chat
  }

  // Capitalize first letter
  cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

  return {
    type,
    title: cleanTitle,
    date: dateStr,
    startTime,
    endTime,
    location,
    notes: text,
    eventType: /\bexam|ujian\b/i.test(lower) ? 'exam' : /\bdeadline|kumpulkan\b/i.test(lower) ? 'deadline' : 'personal',
    courseId: matchedCourseId,
    dueTime: startTime,
    priority: /\b(urgent|high|asap|penting)\b/i.test(lower) ? 'high' : 'medium',
    amount,
    category: expenseCategory,
  };
}
