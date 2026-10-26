/**
 * Safe color utilities for cross-platform compatibility (including older Android WebViews)
 * where CSS color-mix() may not be supported.
 */

const isColorMixSupported = (() => {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
  try {
    return CSS.supports('color', 'color-mix(in srgb, red, blue)');
  } catch {
    return false;
  }
})();

/**
 * Converts a hex color (#RGB, #RRGGBB) to rgba(r, g, b, alpha).
 * If the color is not a valid hex, returns a safe fallback.
 */
export function safeAlphaColor(color: string, alpha: number, fallback = 'rgba(0, 0, 0, 0.08)'): string {
  if (!color) return fallback;

  if (color.startsWith('#')) {
    const raw = color.slice(1).trim();
    let fullHex = '';
    if (raw.length === 3) {
      fullHex = raw.split('').map((c) => c + c).join('');
    } else if (raw.length === 6) {
      fullHex = raw;
    } else if (raw.length === 8) {
      // already has alpha
      return color;
    }

    if (fullHex) {
      const r = parseInt(fullHex.substring(0, 2), 16);
      const g = parseInt(fullHex.substring(2, 4), 16);
      const b = parseInt(fullHex.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
  }

  if (isColorMixSupported) {
    return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
  }

  return fallback;
}

/**
 * Safely blends a color with a surface container background.
 * Falls back to rgba() over the background if color-mix() is unsupported.
 */
export function safeMixWithSurface(
  color: string,
  colorPercent: number,
  surfaceVar = 'var(--surface-container-lowest)'
): string {
  if (isColorMixSupported) {
    return `color-mix(in srgb, ${color} ${colorPercent}%, ${surfaceVar})`;
  }

  if (color && color.startsWith('#')) {
    return safeAlphaColor(color, Math.max(0.08, colorPercent / 100));
  }

  return surfaceVar;
}
