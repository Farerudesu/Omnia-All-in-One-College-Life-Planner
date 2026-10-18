import { supabase, supabaseUrl, anonKey } from '@/lib/supabase';
import type { ExpenseCategory } from '@/lib/categories';

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
  pageContext?: {
    route: string;
    noteId?: string;
  };
  notesContext?: Array<{
    id: string;
    title: string;
    snippet: string;
    tags: string[];
    updatedAt: string;
    courseId?: string;
  }>;
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
  type: 'event' | 'task' | 'expense' | 'note';
  title: string;
  date?: string;
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
  // Note specific
  content?: string;
  tags?: string[];
  assignmentId?: string;
  noteId?: string;
  mode?: 'create' | 'append';
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
  proposedActions?: ProposedAction[];
  receiptTotal?: number;
  noteSource?: { id: string; title: string };
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
    if (!supabaseUrl) {
      throw new Error(
        'Environment variable VITE_SUPABASE_URL is missing. Please set it in your .env file.'
      );
    }
    throw new Error(
      'Environment variable VITE_SUPABASE_ANON_KEY is missing. Please set it in your .env file.'
    );
  }

  const isId = localStorage.getItem('omnia_language') === 'id';
  const timeoutMs = 45000;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          isId
            ? 'Omni lagi lambat, coba lagi ya'
            : 'Omni is taking too long to respond. Please try again.'
        )
      );
    }, timeoutMs);
  });

  try {
    let result = await Promise.race([
      supabase.functions.invoke<AskOmniResponse>('ask-omni', { body: request }),
      timeoutPromise,
    ]);

    if (
      result.error &&
      /failed to send request|fetch|network|502|503/i.test(result.error.message || '')
    ) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      result = await Promise.race([
        supabase.functions.invoke<AskOmniResponse>('ask-omni', { body: request }),
        timeoutPromise,
      ]);
    }

    const { data, error } = result;
    if (error) {
      const debug = [error.name, error.message].filter(Boolean).join(': ');
      throw new Error(
        `${isId ? 'Omni tidak bisa dihubungi. Tekan Coba lagi.' : 'Omni could not be reached. Press Try again.'} [${debug}]`
      );
    }
    if (!data || typeof data.reply !== 'string')
      throw new Error(
        isId
          ? 'Omni memberikan respons yang tidak terduga.'
          : 'Omni returned an unexpected response.'
      );

    if (
      data.error ||
      /having trouble replying|unable to reach|failed to send request|try again in a moment/i.test(
        data.reply
      )
    ) {
      const detail =
        data.error ||
        data.diagnostics?.attempts
          ?.map((a) => `${a.provider}:${a.model}(${a.status || a.error})`)
          .join('; ') ||
        'Edge Function returned fallback response';
      throw new Error(
        `${isId ? 'Omni sedang bermasalah. Tekan Coba lagi.' : 'Omni is having trouble. Press Try again.'} [${detail}]`
      );
    }
    return data;
  } catch (err: unknown) {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    if (errorObj.message?.includes('Omni lagi lambat')) {
      throw errorObj;
    }
    throw new Error(
      errorObj.message ||
        (isId ? 'Omni lagi lambat, coba lagi ya' : 'Unable to reach Omni. Try again.')
    );
  }
}

function maskHeaderValue(val: string): string {
  if (!val) return '';
  return val.length > 8 ? `${val.slice(0, 8)}…` : `${val}…`;
}

export async function testAskOmniRaw(payload: Record<string, unknown>): Promise<RawApiResult> {
  if (!supabaseUrl) {
    throw new Error(
      'Environment variable VITE_SUPABASE_URL is missing. Please set it in your .env file.'
    );
  }
  const currentAnonKey = anonKey || '';
  const endpoint = `${supabaseUrl}/functions/v1/ask-omni`;

  let token: string | null = null;
  try {
    const session = await supabase?.auth?.getSession();
    if (session?.data?.session?.access_token) {
      token = session.data.session.access_token;
    }
  } catch {
    token = null;
  }

  if (!token) {
    return {
      endpoint,
      status: 401,
      statusText: 'Unauthorized',
      durationMs: 0,
      requestHeaders: {
        'Content-Type': 'application/json',
        apikey: maskHeaderValue(currentAnonKey),
        Authorization: '',
      },
      requestBody: payload,
      responseHeaders: {},
      rawResponseText: '',
      parsedJson: null,
      error: 'Belum login',
    };
  }

  const actualHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: currentAnonKey,
    Authorization: `Bearer ${token}`,
  };

  const maskedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: maskHeaderValue(currentAnonKey),
    Authorization: `Bearer ${maskHeaderValue(token)}`,
  };

  const startTime = Date.now();
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: actualHeaders,
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
      requestHeaders: maskedHeaders,
      requestBody: payload,
      responseHeaders,
      rawResponseText,
      parsedJson,
      error: res.ok ? null : `HTTP ${res.status}: ${res.statusText}`,
    };
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    return {
      endpoint,
      status: 0,
      statusText: 'Network / Client Error',
      durationMs,
      requestHeaders: maskedHeaders,
      requestBody: payload,
      responseHeaders: {},
      rawResponseText: '',
      parsedJson: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
