export interface BubblePreference {
  side: 'left' | 'right';
  y: number;
  collapsed: boolean;
}

export const BUBBLE_STORAGE_KEY = 'omnia_omni_bubble';
export const BUBBLE_INTRO_KEY = 'omnia_omni_bubble_intro_seen';

export function parseBubblePreference(raw: string | null): BubblePreference {
  if (!raw) return { side: 'right', y: 120, collapsed: false };
  try {
    const parsed = JSON.parse(raw);
    const side = parsed.side === 'left' ? 'left' : 'right';
    const y = typeof parsed.y === 'number' && !isNaN(parsed.y) ? Math.max(70, parsed.y) : 120;
    const collapsed = Boolean(parsed.collapsed);
    return { side, y, collapsed };
  } catch {
    return { side: 'right', y: 120, collapsed: false };
  }
}

export function loadBubblePreference(): BubblePreference {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(BUBBLE_STORAGE_KEY) : null;
    return parseBubblePreference(raw);
  } catch {
    return { side: 'right', y: 120, collapsed: false };
  }
}
