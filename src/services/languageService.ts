export type Language = 'en' | 'zh-CN';

const DEFAULT_LANG: Language = 'en';

export function getMemberLanguageKey(memberName: string): string {
  return `gyummy_ui_lang_${memberName.trim().toLowerCase()}`;
}

export function loadMemberLanguage(memberName?: string | null): Language {
  if (!memberName) {
    try {
      const fallback = localStorage.getItem('gyummy_ui_lang_default') as Language;
      return fallback === 'zh-CN' || fallback === 'en' ? fallback : DEFAULT_LANG;
    } catch {
      return DEFAULT_LANG;
    }
  }

  try {
    const key = getMemberLanguageKey(memberName);
    const saved = localStorage.getItem(key) as Language;
    if (saved === 'zh-CN' || saved === 'en') {
      return saved;
    }
    const globalDefault = localStorage.getItem('gyummy_ui_lang_default') as Language;
    return globalDefault === 'zh-CN' || globalDefault === 'en' ? globalDefault : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export function saveMemberLanguage(memberName: string | undefined | null, lang: Language): void {
  try {
    if (memberName) {
      const key = getMemberLanguageKey(memberName);
      localStorage.setItem(key, lang);
    }
    localStorage.setItem('gyummy_ui_lang_default', lang);
  } catch {
    // Ignore in restricted storage environments
  }
}
