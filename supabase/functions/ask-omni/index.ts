const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── MODEL CONFIGURATION ───
// Change GEMINI_MODEL or GROQ_MODEL here:
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash';
const GROQ_MODEL = Deno.env.get('GROQ_MODEL') || 'llama-3.3-70b-versatile';

const FRIENDLY_FALLBACK = 'Omni is having trouble replying right now. Please try again in a moment.';

const SYSTEM_PROMPT = `You are Omni, the AI student assistant in the Omnia college life planner app.
When interacting in Indonesian, use a polite, natural, semi-formal college Indonesian tone (bahasa Indonesia semi-formal yang ramah dan solutif, gunakan kata ganti "kamu" dan "saya", jangan kaku seperti birokrasi, tapi jangan alay).

CORE INSTRUCTIONS:
1. You have direct access to the user's data context containing:
   - Schedules, classes, timetable, and calendar events (items)
   - Assignments and deliverables (tasks)
   - Financial transactions, expenses, and income records (recentTransactions)
   NEVER say "saya belum memiliki akses ke riwayat/catatan pengeluaran" or "I don't have access to your data", and do NOT ask them to open another screen to check. The data is already in your context!
2. ANSWERING QUESTIONS:
   - For schedule/timetable queries: inspect the date requested (e.g. today, tomorrow, yesterday/kemarin, specific date) and present the sessions/events clearly in chronological order with time, course/title, and room.
   - For task/deliverable queries: list their pending assignments with due dates and priority clearly.
   - For finance/expense queries (e.g. "keuangan ku kemarin", "kemarin keluar berapa", "pengeluaran hari ini", "rekap pengeluaran minggu ini"):
     * Look up recentTransactions in the Omnia data context for the target date (e.g., yesterdayDate for "kemarin", currentDate for "hari ini") or requested category/timeframe.
     * If transactions are found for that date, list each one clearly with title/merchant, amount in Rupiah (Rp), category, and payment method, then summarize the total expense or income.
     * If NO transactions are found in recentTransactions for that specific date/period, state clearly and politely: e.g. "Kemarin (Rabu, 14 Oktober 2026) belum ada catatan pengeluaran yang tersimpan di Omnia. Kalau kemarin ada pengeluaran yang belum sempat dicatat, beri tahu rinciannya agar saya bantu catatkan ya!"
3. ACTION PROPOSALS (Events, Tasks, Expenses):
   - You have 3 proposal tools: propose_calendar_event, propose_task, propose_expense (plus propose_receipt for receipts).
   - Calling these tools opens a convenient pre-filled review pop-up for the user to confirm with a single click.
   - ONLY call proposal tools when the user expresses an intent to ADD, LOG, RECORD, SCHEDULE, or CREATE a NEW event, task, or expense (e.g., "catat pengeluaran 15rb", "beli makan siang", "tambah tugas...").
   - DO NOT call proposal tools when the user is simply asking/querying about their existing data (e.g., "keuangan ku kemarin", "ada jadwal apa", "berapa tugas"). Answer queries directly with friendly text.
   - If the user provides a shorthand amount (e.g., "7k" = 7000, "15rb" = 15000, "200k" = 200000), interpret it accurately.
   - If a specific field is omitted (like an exact category or start time), choose a sensible default based on context (e.g., category: "Food & Groceries" for food/meals/QRIS, date: currentDate, time: current or next hour) and call the tool.
   - When calling propose_expense:
     * category MUST strictly be one of: 'Food & Groceries', 'Books & Supplies', 'Rent & Utilities', 'Transport', 'Entertainment', 'Health', 'Other Discretionary'. For meals, food, snacks, groceries, coffee, or QRIS food purchases, always use 'Food & Groceries'.
     * paymentMethod MUST strictly be one of: 'QRIS', 'Debit', 'Cash', 'Transfer'. When the user mentions "qris", "debit", "cash", "tunai", "transfer", ALWAYS put it in paymentMethod (e.g. paymentMethod: "QRIS"), NEVER in notes.
   - RECEIPT SCANNING: When the user shares a shopping receipt (struk belanja) — recognized by a list of items with prices and a grand total — ALWAYS call propose_receipt immediately. Extract EVERY line item. Do NOT ask "maksud kamu X atau Y". "Masukkan" (with double-k) = record/log = use propose_receipt. "Masukan" (single-k) = suggestion/feedback. Map payment: Tunai → Cash, Debit → Debit, QRIS → QRIS, Transfer → Transfer.
4. DATE HANDLING:
   - Always refer to currentDate and yesterdayDate provided in the Omnia context.
   - "hari ini" / "today" / "malam ini" = currentDate.
   - "kemarin" / "yesterday" = yesterdayDate.
   - "besok" / "tomorrow" = day after currentDate.
5. STYLE:
   - Friendly, concise, helpful college companion.
   - No markdown tables or raw HTML. Bulleted lists or short paragraphs are preferred.`;

const EVENT_PROPOSAL_TOOL = {
  type: 'function',
  function: {
    name: 'propose_calendar_event',
    description: 'Prepare a calendar event proposal for the user to review in a confirmation pop-up.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string', description: 'Short event title.' },
        date: { type: 'string', description: 'Local date in YYYY-MM-DD format.' },
        startTime: { type: 'string', description: 'Local start time in HH:mm format (e.g. "10:00").' },
        endTime: { type: 'string', description: 'Optional local end time in HH:mm format.' },
        location: { type: 'string', description: 'Optional event location.' },
        notes: { type: 'string', description: 'Optional event note.' },
      },
      required: ['title', 'date', 'startTime'],
    },
  },
} as const;

const TASK_PROPOSAL_TOOL = {
  type: 'function',
  function: {
    name: 'propose_task',
    description: 'Prepare a task/assignment proposal for the user to review in a confirmation pop-up.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string', description: 'Task or assignment title.' },
        dueDate: { type: 'string', description: 'Due date in YYYY-MM-DD format.' },
        dueTime: { type: 'string', description: 'Optional due time in HH:mm format (e.g., "23:59").' },
        courseId: { type: 'string', description: 'Optional course code or ID.' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Task priority.' },
        notes: { type: 'string', description: 'Optional task description or notes.' },
      },
      required: ['title', 'dueDate'],
    },
  },
} as const;

const EXPENSE_CATEGORIES = [
  'Food & Groceries',
  'Books & Supplies',
  'Rent & Utilities',
  'Transport',
  'Entertainment',
  'Health',
  'Other Discretionary',
] as const;

const EXPENSE_PROPOSAL_TOOL = {
  type: 'function',
  function: {
    name: 'propose_expense',
    description: 'Prepare an expense proposal for the user to review in a confirmation pop-up.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string', description: 'Expense description (e.g. "Crispy chicken", "Kopi", "Makan siang").' },
        amount: { type: 'number', description: 'Amount spent in numbers (e.g. 7000 for 7k).' },
        date: { type: 'string', description: 'Date of expense in YYYY-MM-DD format.' },
        category: {
          type: 'string',
          enum: [
            'Food & Groceries',
            'Books & Supplies',
            'Rent & Utilities',
            'Transport',
            'Entertainment',
            'Health',
            'Other Discretionary',
          ],
          description: 'Expense category strictly from the allowed vocabulary.',
        },
        paymentMethod: {
          type: 'string',
          enum: ['QRIS', 'Debit', 'Cash', 'Transfer'],
          description: 'Payment method used: strictly one of "QRIS", "Debit", "Cash", "Transfer".',
        },
        notes: { type: 'string', description: 'Optional extra note (do NOT put payment method here).' },
      },
      required: ['title', 'amount', 'date', 'category'],
    },
  },
} as const;

const RECEIPT_PROPOSAL_TOOL = {
  type: 'function',
  function: {
    name: 'propose_receipt',
    description: 'Extract all line items from a shopping receipt and propose them as a batch of expenses. Use this when the user shares a receipt/struk with multiple items.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        items: {
          type: 'array',
          description: 'Each line item from the receipt as an expense proposal.',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              title: { type: 'string', description: 'Item name from the receipt.' },
              amount: { type: 'number', description: 'Price of this item (qty × unit price).' },
              date: { type: 'string', description: 'Receipt date in YYYY-MM-DD format.' },
              category: {
                type: 'string',
                enum: [
                  'Food & Groceries', 'Books & Supplies', 'Rent & Utilities',
                  'Transport', 'Entertainment', 'Health', 'Other Discretionary',
                ],
              },
              paymentMethod: {
                type: 'string',
                enum: ['QRIS', 'Debit', 'Cash', 'Transfer'],
              },
              notes: { type: 'string' },
            },
            required: ['title', 'amount', 'date', 'category'],
          },
        },
        receiptTotal: { type: 'number', description: 'Grand total shown on the receipt.' },
        storeName: { type: 'string', description: 'Store or merchant name if visible.' },
      },
      required: ['items'],
    },
  },
} as const;

interface ProposedEvent {
  type: 'event';
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
}

interface ProposedTask {
  type: 'task';
  title: string;
  date: string;
  dueTime?: string;
  courseId?: string;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
}

interface ProposedExpense {
  type: 'expense';
  title: string;
  date: string;
  amount: number;
  category: typeof EXPENSE_CATEGORIES[number];
  paymentMethod?: string;
  notes?: string;
}

type ProposedAction = ProposedEvent | ProposedTask | ProposedExpense;

interface ReceiptResponse {
  reply: string;
  proposedAction?: ProposedAction;
  proposedEvent?: ProposedEvent;
  proposedActions?: ProposedExpense[];
  receiptTotal?: number;
}

function jsonResponse(body: ReceiptResponse, status = 200) {
  if (body.proposedAction?.type === 'event' && !body.proposedEvent) {
    body.proposedEvent = body.proposedAction as ProposedEvent;
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeProposedEvent(value: unknown): ProposedEvent | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const date = typeof candidate.date === 'string' ? candidate.date : '';
  if (!title || title.length > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const startTime = typeof candidate.startTime === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(candidate.startTime)
    ? candidate.startTime
    : '09:00';
  const endTime = typeof candidate.endTime === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(candidate.endTime)
    ? candidate.endTime
    : undefined;

  const optionalText = (key: 'location' | 'notes', maxLength: number) => {
    const item = candidate[key];
    if (typeof item !== 'string' || !item.trim()) return undefined;
    return item.trim().slice(0, maxLength);
  };
  return {
    type: 'event',
    title,
    date,
    startTime,
    endTime,
    location: optionalText('location', 160),
    notes: optionalText('notes', 500),
  };
}

function normalizeProposedTask(value: unknown): ProposedTask | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const date = typeof candidate.dueDate === 'string' ? candidate.dueDate : typeof candidate.date === 'string' ? candidate.date : '';
  if (!title || title.length > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const dueTime = typeof candidate.dueTime === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(candidate.dueTime)
    ? candidate.dueTime
    : undefined;

  const priority = candidate.priority === 'low' || candidate.priority === 'high' ? candidate.priority : 'medium';
  const notes = typeof candidate.notes === 'string' && candidate.notes.trim() ? candidate.notes.trim().slice(0, 500) : undefined;
  const courseId = typeof candidate.courseId === 'string' && candidate.courseId.trim() ? candidate.courseId.trim() : undefined;

  return {
    type: 'task',
    title,
    date,
    dueTime,
    courseId,
    priority,
    notes,
  };
}

function mapExpenseCategory(raw?: unknown): typeof EXPENSE_CATEGORIES[number] {
  if (typeof raw !== 'string') return 'Other Discretionary';
  const trimmed = raw.trim();
  if ((EXPENSE_CATEGORIES as readonly string[]).includes(trimmed)) {
    return trimmed as typeof EXPENSE_CATEGORIES[number];
  }
  const lower = trimmed.toLowerCase();
  if (/food|grocer|dining|coffee|makan|minum|kopi|kafe|snack|meal|lunch|dinner|sarapan|jajan/i.test(lower)) {
    return 'Food & Groceries';
  }
  if (/book|suppl|course|pack|print|stationery|buku|alat\s*tulis/i.test(lower)) {
    return 'Books & Supplies';
  }
  if (/rent|utilit|hous|kost|kos|sewa|listrik|air|wifi/i.test(lower)) {
    return 'Rent & Utilities';
  }
  if (/transport|travel|bus|train|taxi|uber|grab|gojek|ojol|bensin|fuel|parkir/i.test(lower)) {
    return 'Transport';
  }
  if (/entertain|movie|game|subscript|netflix|spotify|bioskop|nonton|tiket|hiburan/i.test(lower)) {
    return 'Entertainment';
  }
  if (/health|medic|doctor|obat|dokter|klinik|kesehatan/i.test(lower)) {
    return 'Health';
  }
  return 'Other Discretionary';
}

function normalizeProposedExpense(value: unknown): ProposedExpense | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const date = typeof candidate.date === 'string' ? candidate.date : '';
  let amount = typeof candidate.amount === 'number' ? candidate.amount : Number(candidate.amount);
  if (isNaN(amount) || amount <= 0) return null;

  const category = mapExpenseCategory(candidate.category);

  let paymentMethod = typeof candidate.paymentMethod === 'string' && candidate.paymentMethod.trim()
    ? candidate.paymentMethod.trim()
    : undefined;

  let notes = typeof candidate.notes === 'string' && candidate.notes.trim() ? candidate.notes.trim().slice(0, 500) : undefined;

  // Extract payment method from notes if present
  if (notes) {
    if (/\bqris\b/i.test(notes)) {
      if (!paymentMethod) paymentMethod = 'QRIS';
      notes = notes.replace(/\bqris\b/gi, '').trim() || undefined;
    } else if (/\bdebit\b/i.test(notes)) {
      if (!paymentMethod) paymentMethod = 'Debit';
      notes = notes.replace(/\bdebit\b/gi, '').trim() || undefined;
    } else if (/\b(cash|tunai)\b/i.test(notes)) {
      if (!paymentMethod) paymentMethod = 'Cash';
      notes = notes.replace(/\b(cash|tunai)\b/gi, '').trim() || undefined;
    } else if (/\b(transfer|tf)\b/i.test(notes)) {
      if (!paymentMethod) paymentMethod = 'Transfer';
      notes = notes.replace(/\b(transfer|tf)\b/gi, '').trim() || undefined;
    }
  }

  // Also check title if payment method was mentioned there
  if (!paymentMethod && title) {
    if (/\bqris\b/i.test(title)) paymentMethod = 'QRIS';
    else if (/\bdebit\b/i.test(title)) paymentMethod = 'Debit';
    else if (/\b(cash|tunai)\b/i.test(title)) paymentMethod = 'Cash';
    else if (/\b(transfer|tf)\b/i.test(title)) paymentMethod = 'Transfer';
  }

  // Normalize payment method to allowed defaults
  if (paymentMethod) {
    const pmLower = paymentMethod.toLowerCase();
    if (pmLower.includes('qris')) paymentMethod = 'QRIS';
    else if (pmLower.includes('debit')) paymentMethod = 'Debit';
    else if (pmLower.includes('cash') || pmLower.includes('tunai')) paymentMethod = 'Cash';
    else if (pmLower.includes('transfer') || pmLower.includes('tf')) paymentMethod = 'Transfer';
  } else {
    paymentMethod = 'QRIS';
  }

  return {
    type: 'expense',
    title: title || 'Expense',
    date: date || new Date().toISOString().slice(0, 10),
    amount,
    category,
    paymentMethod,
    notes,
  };
}

function normalizeProposedReceipt(args: Record<string, unknown>): { items: ProposedExpense[]; receiptTotal?: number } | null {
  if (!Array.isArray(args.items) || args.items.length === 0) return null;
  const items: ProposedExpense[] = [];
  for (const raw of args.items) {
    const normalized = normalizeProposedExpense(raw);
    if (normalized) items.push(normalized);
  }
  if (items.length === 0) return null;
  const receiptTotal = typeof args.receiptTotal === 'number' && args.receiptTotal > 0 ? args.receiptTotal : undefined;
  return { items, receiptTotal };
}

// Model invocation helpers
interface ModelMessage {
  role: 'system' | 'user' | 'assistant';
  content: any;
}

interface ModelAttempt {
  provider: 'gemini' | 'groq';
  model: string;
  status?: number;
  durationMs: number;
  error?: string;
  withTools?: boolean;
}

interface CompletionResult {
  content: string;
  toolCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
  modelUsed?: string;
  providerUsed?: string;
  attempts?: ModelAttempt[];
}

async function callGemini(
  apiKey: string,
  chatMessages: ModelMessage[],
  tools?: any[]
): Promise<CompletionResult> {
  const modelsToTry = [
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash-lite',
    GEMINI_MODEL,
    'gemini-pro-latest',
    'gemini-2.5-pro',
  ].filter((v, i, a) => !!v && a.indexOf(v) === i);

  const attempts: ModelAttempt[] = [];
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    const attemptStart = Date.now();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: chatMessages,
          ...(tools ? { tools, tool_choice: 'auto' } : {}),
          temperature: 0.2,
          max_tokens: 2048,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      const durationMs = Date.now() - attemptStart;
      if (!response.ok) {
        const errorText = await response.text();
        attempts.push({
          provider: 'gemini',
          model,
          status: response.status,
          durationMs,
          error: errorText.slice(0, 500),
          withTools: !!tools,
        });
        console.warn(`Gemini model ${model} failed (${response.status}): ${errorText.slice(0, 150)}`);
        continue;
      }

      const result = await response.json();
      const choice = result.choices?.[0]?.message;
      const toolCall = choice?.tool_calls?.[0];

      let parsedArgs: Record<string, unknown> = {};
      if (toolCall) {
        try {
          parsedArgs = JSON.parse(toolCall.function?.arguments || '{}');
        } catch {
          parsedArgs = {};
        }
      }

      attempts.push({
        provider: 'gemini',
        model,
        status: 200,
        durationMs,
        withTools: !!tools,
      });

      return {
        content: choice?.content || '',
        toolCall: toolCall
          ? {
            name: toolCall.function?.name,
            arguments: parsedArgs,
          }
          : undefined,
        modelUsed: model,
        providerUsed: 'gemini',
        attempts,
      };
    } catch (err: any) {
      const durationMs = Date.now() - attemptStart;
      lastError = err instanceof Error ? err : new Error(String(err));
      attempts.push({
        provider: 'gemini',
        model,
        durationMs,
        error: lastError.message,
        withTools: !!tools,
      });
      // Do not abort loop on timeout, fail over to the next available backup model
      continue;
    }
  }

  const err = lastError || new Error('All Gemini model candidates failed');
  (err as any).attempts = attempts;
  throw err;
}

async function callGroq(
  apiKey: string,
  chatMessages: ModelMessage[],
  tools?: any[]
): Promise<CompletionResult> {
  const attempts: ModelAttempt[] = [];
  const modelsToTry = [
    GROQ_MODEL,
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
    'allam-2-7b',
  ].filter((v, i, a) => !!v && a.indexOf(v) === i);
  const modes = tools ? [true, false] : [false];

  for (const withTools of modes) {
    for (const model of modelsToTry) {
      const attemptStart = Date.now();
      try {
        const payload: Record<string, unknown> = {
          model,
          messages: chatMessages,
          temperature: 0.2,
          max_tokens: 2048,
        };
        if (withTools && tools) {
          payload.tools = tools;
          payload.tool_choice = 'auto';
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(8_000),
        });

        const durationMs = Date.now() - attemptStart;
        if (!response.ok) {
          const errorText = await response.text();
          attempts.push({
            provider: 'groq',
            model,
            status: response.status,
            durationMs,
            error: errorText.slice(0, 500),
            withTools,
          });
          if (response.status === 400 && withTools) break; // fallback to mode without tools
          continue;
        }

        const result = await response.json();
        const choice = result.choices?.[0]?.message;
        const toolCall = choice?.tool_calls?.[0];

        let parsedArgs: Record<string, unknown> = {};
        if (toolCall) {
          try {
            parsedArgs = JSON.parse(toolCall.function?.arguments || '{}');
          } catch {
            parsedArgs = {};
          }
        }

        attempts.push({
          provider: 'groq',
          model,
          status: 200,
          durationMs,
          withTools,
        });

        return {
          content: choice?.content || '',
          toolCall: toolCall
            ? {
              name: toolCall.function?.name,
              arguments: parsedArgs,
            }
            : undefined,
          modelUsed: model,
          providerUsed: 'groq',
          attempts,
        };
      } catch (err: any) {
        const durationMs = Date.now() - attemptStart;
        attempts.push({
          provider: 'groq',
          model,
          durationMs,
          error: err instanceof Error ? err.message : String(err),
          withTools,
        });
        // Do not abort on timeout, continue to next backup model
        continue;
      }
    }
  }

  const err = new Error('All Groq model attempts failed');
  (err as any).attempts = attempts;
  throw err;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ reply: 'Send a message with a POST request.' }, 405);
  }
  if (!request.headers.get('Authorization')) {
    return jsonResponse({ reply: 'Sign in before asking Omni a question.' }, 401);
  }

  const startTime = Date.now();
  let payload: { message?: unknown; history?: unknown; imageBase64?: unknown; mimeType?: unknown; scheduleContext?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ reply: 'I could not read that message. Please try again.' }, 400);
  }

  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  const imageBase64 = typeof payload.imageBase64 === 'string' ? payload.imageBase64 : '';
  const mimeType = typeof payload.mimeType === 'string' ? payload.mimeType : 'image/jpeg';
  if (!message && !imageBase64) {
    return jsonResponse({ reply: 'Write a message or attach an image to get started.' }, 400);
  }
  if (imageBase64 && !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)) {
    return jsonResponse({ reply: 'Attach a JPEG, PNG, WebP, or GIF image.' }, 400);
  }
  if (imageBase64.length > 7_000_000) {
    return jsonResponse({ reply: 'That image is too large. Choose an image under 5 MB.' }, 413);
  }

  const history = Array.isArray(payload.history)
    ? payload.history.slice(-12).flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const item = entry as { role?: unknown; content?: unknown };
      if (item.role !== 'user' && item.role !== 'assistant') return [];
      if (typeof item.content !== 'string' || !item.content.trim()) return [];
      return [{ role: item.role, content: item.content.trim().slice(0, 4000) }];
    })
    : [];
  if (history.reduce((total, item) => total + item.content.length, 0) > 16_000) {
    return jsonResponse({ reply: 'This conversation is too long to continue. Start a new chat to keep going.' }, 413);
  }

  const scheduleContext = payload.scheduleContext && typeof payload.scheduleContext === 'object'
    ? JSON.stringify(payload.scheduleContext)
    : '';
  if (scheduleContext.length > 16_000) {
    return jsonResponse({ reply: 'The schedule context is too large. Please try again.' }, 413);
  }

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  const groqApiKey = Deno.env.get('GROQ_API_KEY');

  if (payload.debug === true) {
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      hasGeminiKey: !!geminiApiKey,
      hasGroqKey: !!groqApiKey,
      geminiModelConfig: GEMINI_MODEL,
      groqModelConfig: GROQ_MODEL,
      geminiModels: [] as string[],
      groqModels: [] as string[],
      errors: [] as string[],
    };

    if (geminiApiKey) {
      try {
        const gemRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
        const gemData = await gemRes.json();
        if (gemData.models && Array.isArray(gemData.models)) {
          debugInfo.geminiModels = gemData.models
            .map((m: any) => m.name.replace(/^models\//, ''))
            .filter((name: string) => name.includes('flash') || name.includes('pro') || name.includes('gemini'));
        } else {
          debugInfo.errors.push(`Gemini list error: ${JSON.stringify(gemData)}`);
        }
      } catch (e: any) {
        debugInfo.errors.push(`Gemini fetch error: ${e.message}`);
      }
    }

    if (groqApiKey) {
      try {
        const groqRes = await fetch(`https://api.groq.com/openai/v1/models`, {
          headers: { Authorization: `Bearer ${groqApiKey}` }
        });
        const groqData = await groqRes.json();
        if (groqData.data && Array.isArray(groqData.data)) {
          debugInfo.groqModels = groqData.data.map((m: any) => m.id);
        } else {
          debugInfo.errors.push(`Groq list error: ${JSON.stringify(groqData)}`);
        }
      } catch (e: any) {
        debugInfo.errors.push(`Groq fetch error: ${e.message}`);
      }
    }

    return jsonResponse({
      reply: 'Debug query successful.',
      debug: debugInfo,
    } as any);
  }

  if (!geminiApiKey && !groqApiKey) {
    return jsonResponse({
      reply: 'Omni is not configured yet. Please configure GEMINI_API_KEY or GROQ_API_KEY in Supabase secrets.',
      error: 'Missing GEMINI_API_KEY and GROQ_API_KEY secrets.',
      diagnostics: {
        success: false,
        hasGeminiKey: false,
        hasGroqKey: false,
        durationMs: Date.now() - startTime,
      }
    }, 503);
  }

  try {
    const userContent = imageBase64
      ? [
        { type: 'text', text: message || 'Describe the visible contents of this image.' },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
      ]
      : message;

    const chatMessages: ModelMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(scheduleContext ? [{
        role: 'system' as const,
        content: `Current local date, yesterday date, and Omnia data reference: ${scheduleContext}. Answer questions about schedules, tasks, and recent financial transactions (expenses/income) directly from this data. Never say you don't have access to their transactions or data. When asked to schedule, add, or log a new item, use the tools.`,
      }] : []),
      ...history,
      { role: 'user', content: userContent },
    ];

    const conversationText = [...history.filter((item) => item.role === 'user').map((item) => item.content), message].join('\n');
    // "masukkan" = imperative "enter/record" (double-k); "masukan" = noun "suggestion" (single-k)
    const isReceiptIntent = /\b(struk|strook|receipt|scan struk|nota belanja)\b/i.test(conversationText)
      || /\b(total|qty|pcs|pack)\b.*\b(rp|idr|\d+\.\d{3})\b/i.test(conversationText);

    // Queries asking about existing data should be answered with text, NOT by opening an action modal
    const isQueryIntent = /\b(apa|berapa|cek|lihat|tampilkan|riwayat|rekap|ada apa|apakah)\b/i.test(message)
      || /\?$/.test(message.trim())
      || /\b(keuangan|pengeluaran|tugas|jadwal)\b.*\b(kemarin|hari ini|besok|minggu ini|bulan ini)\b/i.test(message);

    const isActionIntent = /\b(add|create|schedule|save|plan|book|tambah|tambahkan|buat|jadwalkan|agendakan|masukkan|catat|log|beli|bayar)\b/i.test(message);

    const wantsActionTool = isReceiptIntent || (!isQueryIntent && isActionIntent);
    const tools = wantsActionTool
      ? (isReceiptIntent
        ? [RECEIPT_PROPOSAL_TOOL, EXPENSE_PROPOSAL_TOOL, EVENT_PROPOSAL_TOOL, TASK_PROPOSAL_TOOL]
        : [EVENT_PROPOSAL_TOOL, TASK_PROPOSAL_TOOL, EXPENSE_PROPOSAL_TOOL])
      : undefined;

    let completion: CompletionResult | null = null;
    let providerUsed = '';
    const allAttempts: ModelAttempt[] = [];

    // Primary: Gemini
    if (geminiApiKey) {
      try {
        completion = await callGemini(geminiApiKey, chatMessages, tools);
        providerUsed = 'gemini';
        if (completion.attempts) allAttempts.push(...completion.attempts);
      } catch (geminiError: any) {
        if (geminiError?.attempts) allAttempts.push(...geminiError.attempts);
        console.warn('Gemini request failed, trying fallback to Groq:', geminiError?.message || geminiError);
      }
    }

    // Fallback: Groq
    if (!completion && groqApiKey) {
      try {
        completion = await callGroq(groqApiKey, chatMessages, tools);
        providerUsed = 'groq';
        if (completion.attempts) allAttempts.push(...completion.attempts);
      } catch (groqError: any) {
        if (groqError?.attempts) allAttempts.push(...groqError.attempts);
        console.error('Groq fallback also failed:', groqError?.message || groqError);
      }
    }

    const durationMs = Date.now() - startTime;
    const diagnostics = {
      success: !!completion,
      providerUsed: providerUsed || 'none',
      modelUsed: completion?.modelUsed || 'none',
      durationMs,
      hasGeminiKey: !!geminiApiKey,
      hasGroqKey: !!groqApiKey,
      attempts: allAttempts,
      toolCount: tools ? tools.length : 0,
    };

    if (!completion) {
      const summaryMsg = allAttempts.map((a) => `[${a.provider}:${a.model} ${a.status ? `HTTP ${a.status}` : a.error}]`).join('; ') || 'No providers completed';
      return jsonResponse({
        reply: FRIENDLY_FALLBACK,
        error: `Omni LLM providers failed: ${summaryMsg}`,
        diagnostics,
      }, 200);
    }

    // Handle tool call result
    if (completion.toolCall) {
      const fnName = completion.toolCall.name;
      const args = completion.toolCall.arguments;

      if (fnName === 'propose_receipt') {
        const receipt = normalizeProposedReceipt(args);
        if (receipt) {
          const n = receipt.items.length;
          const totalStr = receipt.receiptTotal ? ` (total Rp${receipt.receiptTotal.toLocaleString('id-ID')})` : '';
          return jsonResponse({
            reply: completion.content.trim() || `Saya temukan ${n} item dari struk${totalStr}. Silakan konfirmasi satu per satu:`,
            proposedActions: receipt.items,
            receiptTotal: receipt.receiptTotal,
            diagnostics,
          });
        }
      } else if (fnName === 'propose_calendar_event') {
        const proposedEvent = normalizeProposedEvent(args);
        if (proposedEvent) {
          return jsonResponse({
            reply: completion.content.trim() || 'Saya siapkan jadwalnya. Silakan tinjau dan klik konfirmasi di bawah:',
            proposedAction: proposedEvent,
            diagnostics,
          });
        }
      } else if (fnName === 'propose_task') {
        const proposedTask = normalizeProposedTask(args);
        if (proposedTask) {
          return jsonResponse({
            reply: completion.content.trim() || 'Saya siapkan tugasnya. Silakan tinjau dan klik konfirmasi di bawah:',
            proposedAction: proposedTask,
            diagnostics,
          });
        }
      } else if (fnName === 'propose_expense') {
        const proposedExpense = normalizeProposedExpense(args);
        if (proposedExpense) {
          return jsonResponse({
            reply: completion.content.trim() || 'Saya siapkan catatan pengeluarannya. Silakan tinjau dan klik konfirmasi di bawah:',
            proposedAction: proposedExpense,
            diagnostics,
          });
        }
      }
    }

    const replyText = completion.content?.trim() || FRIENDLY_FALLBACK;
    return jsonResponse({ reply: replyText, diagnostics });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ask Omni execution failed:', errorMsg);
    return jsonResponse({
      reply: FRIENDLY_FALLBACK,
      error: errorMsg,
      diagnostics: {
        success: false,
        fatalError: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
      }
    }, 500);
  }
});
