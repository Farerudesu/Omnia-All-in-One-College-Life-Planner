import { supabase } from './supabase.js';

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

export interface AskOmniResponse {
  reply: string;
  proposedEvent?: ProposedCalendarEvent;
}

export async function askOmni(request: AskOmniRequest): Promise<AskOmniResponse> {
  if (!supabase) {
    throw new Error('Add VITE_SUPABASE_ANON_KEY to your .env file to connect to Supabase.');
  }

  const { data, error } = await supabase.functions.invoke<AskOmniResponse>('ask-omni', {
    body: request,
  });
  if (error) throw new Error(error.message || 'Unable to reach Omni. Try again.');
  if (!data || typeof data.reply !== 'string') throw new Error('Omni returned an unexpected response.');
  return data;
}
