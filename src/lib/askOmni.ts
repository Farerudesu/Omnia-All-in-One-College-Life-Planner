import { supabase } from './supabase.js';
import type { ExpenseCategory } from './categories';

export interface AskOmniRequest {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  imageBase64?: string;
  mimeType?: string;
  scheduleContext?: {
    currentDate: string;
    yesterdayDate?: string;
    throughDate: string;
    timezone: string;
    dates: Array<{ date: string; weekday: string }>;
    items: Array<{
      date: string;
      weekday: string;
      kind: 'class' | 'event';
      title: string;
      startTime?: string;
      endTime?: string;
      location?: string;
      note?: string;
    }>;
    tasks: Array<{
      id: string;
      title: string;
      dueDate: string;
      course?: string;
      priority: string;
      status: string;
      notes?: string;
    }>;
    recentTransactions?: Array<{
      date: string;
      title: string;
      amount: number;
      category: string;
      type: 'expense' | 'income';
      paymentMethod?: string;
      notes?: string;
    }>;
  };
}

export interface ProposedCalendarEvent {
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
}

export interface ProposedAction {
  type: 'event' | 'task' | 'expense';
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
  dueTime?: string;
  courseId?: string;
  priority?: 'low' | 'medium' | 'high';
  amount?: number;
  category?: ExpenseCategory | string;
  paymentMethod?: string;
}

export interface ModelAttempt {
  provider: string;
  model: string;
  status?: number;
  durationMs?: number;
  error?: string;
  withTools?: boolean;
}

export interface AskOmniDiagnostics {
  success?: boolean;
  providerUsed?: string;
  modelUsed?: string;
  durationMs?: number;
  hasGeminiKey?: boolean;
  hasGroqKey?: boolean;
  attempts?: ModelAttempt[];
  toolCount?: number;
  fatalError?: string;
  stack?: string;
}

export interface AskOmniResponse {
  reply: string;
  proposedAction?: ProposedAction;
  proposedActions?: ProposedAction[];  // receipt queue: array of items from a single receipt
  receiptTotal?: number;               // declared total from receipt for validation
  proposedEvent?: ProposedCalendarEvent;
  error?: string;
  diagnostics?: AskOmniDiagnostics;
  debug?: Record<string, unknown>;
}

export interface RawApiResult {
  endpoint: string;
  status: number;
  statusText: string;
  durationMs: number;
  requestHeaders: Record<string, string>;
  requestBody: unknown;
  responseHeaders: Record<string, string>;
  rawResponseText: string;
  parsedJson: AskOmniResponse | null;
  error: string | null;
}

export async function askOmni(request: AskOmniRequest): Promise<AskOmniResponse> {
  if (!supabase) {
    throw new Error('Add VITE_SUPABASE_ANON_KEY to your .env file to connect to Supabase.');
  }

  const isId = localStorage.getItem('omnia_language') === 'id';
  const timeoutMs = 45000;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(isId ? 'Omni lagi lambat, coba lagi ya' : 'Omni is taking too long to respond. Please try again.'));
    }, timeoutMs);
  });

  try {
    let result = await Promise.race([
      supabase.functions.invoke<AskOmniResponse>('ask-omni', { body: request }),
      timeoutPromise,
    ]);

    if (result.error && /failed to send request|fetch|network|502|503/i.test(result.error.message || '')) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      result = await Promise.race([
        supabase.functions.invoke<AskOmniResponse>('ask-omni', { body: request }),
        timeoutPromise,
      ]);
    }

    const { data, error } = result;
    if (error) {
      const debug = [error.name, error.message].filter(Boolean).join(': ');
      throw new Error(`${isId ? 'Omni tidak bisa dihubungi. Tekan Coba lagi.' : 'Omni could not be reached. Press Try again.'} [${debug}]`);
    }
    if (!data || typeof data.reply !== 'string') throw new Error(isId ? 'Omni memberikan respons yang tidak terduga.' : 'Omni returned an unexpected response.');
    
    if (data.error || /having trouble replying|unable to reach|failed to send request|try again in a moment/i.test(data.reply)) {
      const detail = data.error
        || (data.diagnostics?.attempts?.map((a) => `${a.provider}:${a.model}(${a.status || a.error})`).join('; '))
        || 'Edge Function returned fallback response';
      throw new Error(`${isId ? 'Omni sedang bermasalah. Tekan Coba lagi.' : 'Omni is having trouble. Press Try again.'} [${detail}]`);
    }
    return data;
  } catch (err: any) {
    if (err?.message?.includes('Omni lagi lambat')) {
      throw err;
    }
    throw new Error(err?.message || (isId ? 'Omni lagi lambat, coba lagi ya' : 'Unable to reach Omni. Try again.'));
  }
}

export async function testAskOmniRaw(payload: Record<string, unknown>): Promise<RawApiResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://idrraytmjdbcgerdahkj.supabase.co';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const endpoint = `${supabaseUrl}/functions/v1/ask-omni`;

  let token = anonKey;
  try {
    const session = await supabase?.auth?.getSession();
    if (session?.data?.session?.access_token) {
      token = session.data.session.access_token;
    }
  } catch {
    // fallback to anon key
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': anonKey,
    'Authorization': `Bearer ${token}`,
  };

  const startTime = Date.now();
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(payload),
    });

    const durationMs = Date.now() - startTime;
    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      responseHeaders[key] = val;
    });

    const rawResponseText = await res.text();
    let parsedJson: AskOmniResponse | null = null;
    try {
      parsedJson = JSON.parse(rawResponseText);
    } catch {
      parsedJson = null;
    }

    return {
      endpoint,
      status: res.status,
      statusText: res.statusText,
      durationMs,
      requestHeaders,
      requestBody: payload,
      responseHeaders,
      rawResponseText,
      parsedJson,
      error: res.ok ? null : `HTTP ${res.status}: ${res.statusText}`,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    return {
      endpoint,
      status: 0,
      statusText: 'Network / Client Error',
      durationMs,
      requestHeaders,
      requestBody: payload,
      responseHeaders: {},
      rawResponseText: '',
      parsedJson: null,
      error: err?.message || String(err),
    };
  }
}

