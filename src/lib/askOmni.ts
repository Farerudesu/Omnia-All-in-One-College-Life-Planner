import { supabase } from './supabase.js';
import type { ExpenseCategory } from './categories';

export interface AskOmniRequest {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  imageBase64?: string;
  mimeType?: string;
  scheduleContext?: {
    currentDate: string;
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

export interface AskOmniResponse {
  reply: string;
  proposedAction?: ProposedAction;
  proposedActions?: ProposedAction[];  // receipt queue: array of items from a single receipt
  receiptTotal?: number;               // declared total from receipt for validation
  proposedEvent?: ProposedCalendarEvent;
}

export async function askOmni(request: AskOmniRequest): Promise<AskOmniResponse> {
  if (!supabase) {
    throw new Error('Add VITE_SUPABASE_ANON_KEY to your .env file to connect to Supabase.');
  }

  const isId = localStorage.getItem('omnia_language') === 'id';
  const timeoutMs = 25000;

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
    if (/having trouble replying|unable to reach|failed to send request|try again in a moment/i.test(data.reply)) {
      throw new Error(`${isId ? 'Omni sedang bermasalah. Tekan Coba lagi.' : 'Omni is having trouble. Press Try again.'} [Edge Function returned fallback response]`);
    }
    return data;
  } catch (err: any) {
    if (err?.message?.includes('Omni lagi lambat')) {
      throw err;
    }
    throw new Error(err?.message || (isId ? 'Omni lagi lambat, coba lagi ya' : 'Unable to reach Omni. Try again.'));
  }
}
