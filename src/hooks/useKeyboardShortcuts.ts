import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ROUTE_NEW_ACTIONS: Record<string, string> = {
  '/inventory': '/inventory?action=new',
  '/vendors': '/vendors?action=new',
  '/recipients': '/recipients?action=new',
  '/procurement': '/procurement?action=new',
  '/maintenance': '/maintenance?action=new',
  '/assets': '/assets?action=new',
  '/users': '/users?action=new',
  '/quotations': '/quotations?action=new',
};

export function useKeyboardShortcuts() {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in input/textarea/contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl+N or Cmd+N: navigate to "new" action for current route
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        const currentPath = location.pathname;
        const newPath = ROUTE_NEW_ACTIONS[currentPath];
        if (newPath) {
          navigate(newPath);
        }
        return;
      }

      // ? key: toggle shortcuts help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location.pathname]);

  return { showShortcuts, setShowShortcuts };
}
