import type { ChatMessage } from '@/types';
import type { PrefilledData } from './aiIntentParser';

export type Message = ChatMessage;

export interface ImageAttachment {
  dataUrl: string;
  imageBase64: string;
  mimeType: string;
  name: string;
}

export type { PrefilledData };
