import { useState, useEffect } from 'react';
import { getLanguage, type Language } from './i18n';

export function useLanguage(): Language {
  const [lang, setLang] = useState<Language>(getLanguage());

  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<Language>;
      if (customEvent.detail) {
        setLang(customEvent.detail);
      } else {
        setLang(getLanguage());
      }
    };

    window.addEventListener('omnia-language-changed', handleLangChange);
    window.addEventListener('storage', handleLangChange);
    return () => {
      window.removeEventListener('omnia-language-changed', handleLangChange);
      window.removeEventListener('storage', handleLangChange);
    };
  }, []);

  return lang;
}
