/**
 * Dark mode preference storage — user-specific (not family-shared).
 * Stored per member name so switching members restores their preferred mode.
 */

const DARK_MODE_PREFIX = 'gyummy_ui_dark_';

function makeKey(memberName: string): string {
  return DARK_MODE_PREFIX + memberName.toLowerCase().replace(/\s+/g, '_');
}

/** Persist this member's dark mode preference */
export function saveDarkModePreference(memberName: string, isDark: boolean): void {
  try {
    localStorage.setItem(makeKey(memberName), isDark ? '1' : '0');
  } catch {
    // ignore storage errors silently
  }
}

/** Load this member's dark mode preference (defaults to false = light) */
export function loadDarkModePreference(memberName: string): boolean {
  try {
    return localStorage.getItem(makeKey(memberName)) === '1';
  } catch {
    return false;
  }
}

/** Apply or remove .dark on <html> */
export function applyDarkMode(isDark: boolean): void {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
