import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

function getSystemPreference(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme: Theme) {
  const isDark = theme === 'dark' || (theme === 'system' && getSystemPreference());
  document.documentElement.classList.toggle('dark', isDark);
  return isDark;
}

export function useDarkMode() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'system') return stored;
    return 'light';
  });

  const [isDark, setIsDark] = useState(() => applyTheme(theme));

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem('theme', newTheme);
    setThemeState(newTheme);
  }, []);

  useEffect(() => {
    setIsDark(applyTheme(theme));
  }, [theme]);

  // Listen for system preference changes when using 'system' theme
  useEffect(() => {
    if (theme !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setIsDark(applyTheme('system'));
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme]);

  return { theme, setTheme, isDark };
}
