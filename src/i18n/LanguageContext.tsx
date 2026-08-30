import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { translations } from './translations';
import type { Language } from '../services/languageService';
import { loadMemberLanguage, saveMemberLanguage } from '../services/languageService';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  formatCategory: (category: string) => string;
  formatDate: (dateStr: string, options?: Intl.DateTimeFormatOptions) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

interface LanguageProviderProps {
  children: React.ReactNode;
  activeMemberName?: string;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
  activeMemberName
}) => {
  const [language, setLanguageState] = useState<Language>(() => loadMemberLanguage(activeMemberName));

  // Sync language when active member profile switches
  useEffect(() => {
    const memberLang = loadMemberLanguage(activeMemberName);
    setLanguageState(memberLang);
  }, [activeMemberName]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    saveMemberLanguage(activeMemberName, lang);
  };

  const t = useMemo(() => {
    return (path: string, params?: Record<string, string | number>): string => {
      const keys = path.split('.');
      const dict = translations[language] as any;
      let current: any = dict;

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          // Fallback to english
          let fallback: any = translations['en'];
          for (const fbKey of keys) {
            if (fallback && typeof fallback === 'object' && fbKey in fallback) {
              fallback = fallback[fbKey];
            } else {
              fallback = null;
              break;
            }
          }
          current = fallback || path;
          break;
        }
      }

      let result = typeof current === 'string' ? current : path;
      if (params) {
        Object.entries(params).forEach(([paramKey, val]) => {
          result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
        });
      }

      return result;
    };
  }, [language]);

  const formatCategory = (category: string): string => {
    if (language === 'en') return category;
    const catMap: Record<string, string> = {
      'Produce': '生鲜果蔬',
      'Meat & Seafood': '肉类海鲜',
      'Dairy & Eggs': '蛋奶乳品',
      'Pantry & Spices': '粮油调味',
      'Bakery': '烘焙面包',
      'Frozen': '冷冻食品',
      'Canned Goods': '罐头干货',
      'Other': '其他食材'
    };
    return catMap[category] || category;
  };

  const formatDate = (dateStr: string, options?: Intl.DateTimeFormatOptions): string => {
    try {
      const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
      const locale = language === 'zh-CN' ? 'zh-CN' : 'en-US';
      return d.toLocaleDateString(locale, options || {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      formatCategory,
      formatDate
    }),
    [language, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
