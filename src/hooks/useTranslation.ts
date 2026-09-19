import { useState, useEffect, useCallback, useRef } from 'react';
import { useOrgConfig } from './useOrgConfig';
import { api } from '@/lib/api';

// Global translation cache — persists across re-renders
const translationCache: Record<string, Record<string, string>> = {};
// Pending batch — collect keys to translate in one request
let pendingKeys: Record<string, string> = {};
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let batchResolvers: Array<() => void> = [];

function flushBatch(lang: string) {
  if (Object.keys(pendingKeys).length === 0) return;

  const keysToTranslate = { ...pendingKeys };
  const resolvers = [...batchResolvers];
  pendingKeys = {};
  batchResolvers = [];
  batchTimer = null;

  api.post<{ translations: Record<string, string> }>('/translate/batch', {
    texts: keysToTranslate,
    target: lang,
    source: 'en',
  }).then(res => {
    if (!translationCache[lang]) translationCache[lang] = {};
    Object.entries(res.translations).forEach(([key, val]) => {
      translationCache[lang][key] = val;
    });
    resolvers.forEach(r => r());
  }).catch(() => {
    resolvers.forEach(r => r());
  });
}

export function useTranslation() {
  const config = useOrgConfig();
  const lang = config.language || 'en';
  const [, forceUpdate] = useState(0);
  const langRef = useRef(lang);
  langRef.current = lang;

  const t = useCallback((englishText: string): string => {
    if (langRef.current === 'en') return englishText;

    const cached = translationCache[langRef.current]?.[englishText];
    if (cached) return cached;

    // Queue for batch translation
    pendingKeys[englishText] = englishText;
    if (!batchTimer) {
      batchTimer = setTimeout(() => {
        flushBatch(langRef.current);
      }, 100);
    }

    // Add a resolver that triggers re-render when translation arrives
    const promise = new Promise<void>(resolve => {
      batchResolvers.push(resolve);
    });
    promise.then(() => forceUpdate(n => n + 1));

    return englishText; // Show English until translation arrives
  }, []);

  // When language changes, trigger re-render to pick up cached translations
  useEffect(() => {
    forceUpdate(n => n + 1);
  }, [lang]);

  return { t, lang };
}
