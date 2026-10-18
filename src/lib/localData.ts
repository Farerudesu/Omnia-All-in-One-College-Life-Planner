const PRESERVED_KEYS = new Set([
  'omnia_theme',
  'omnia_language',
  'omnia_sidebar_collapsed',
  'omnia_omni_bubble',
  'omnia_omni_bubble_intro_seen',
]);

/**
 * Clears all user-specific data from localStorage with prefix `omnia_`,
 * while preserving interface preferences (theme, language, sidebar state).
 */
export function clearUserLocalData(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('omnia_') && !PRESERVED_KEYS.has(key)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.error('Failed to clear user local data:', err);
  }
}
