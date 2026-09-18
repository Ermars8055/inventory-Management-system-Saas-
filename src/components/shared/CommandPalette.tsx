import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Store, Users2, ArrowLeftRight, X } from 'lucide-react';
import { api } from '@/lib/api';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Package; label: string; color: string }> = {
  item:        { icon: Package,        label: 'Inventory',    color: '#6366f1' },
  vendor:      { icon: Store,          label: 'Vendors',      color: '#0891b2' },
  recipient:   { icon: Users2,         label: 'Recipients',   color: '#059669' },
  transaction: { icon: ArrowLeftRight, label: 'Transactions', color: '#d97706' },
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Ctrl+K to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSelected(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(() => {
      setLoading(true);
      api.get<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback((result: SearchResult) => {
    setOpen(false);
    navigate(result.url);
  }, [navigate]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selected]) {
      handleSelect(results[selected]);
    }
  }

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] = acc[r.type] || []).push(r);
    return acc;
  }, {});

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 h-14 border-b">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search inventory, vendors, recipients..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
          <button onClick={() => setOpen(false)} className="sm:hidden">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {loading && query && (
            <div className="p-4 text-sm text-muted-foreground text-center">Searching...</div>
          )}
          {!loading && query && results.length === 0 && (
            <div className="p-8 text-sm text-muted-foreground text-center">No results for "{query}"</div>
          )}
          {!query && (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">Start typing to search across all your data</p>
              <p className="text-xs text-muted-foreground mt-2">
                <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">Ctrl+K</kbd> to open anytime
              </p>
            </div>
          )}
          {Object.entries(grouped).map(([type, items]) => {
            const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.item;
            return (
              <div key={type}>
                <p className="px-4 pt-3 pb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {config.label}
                </p>
                {items.map(result => {
                  flatIndex++;
                  const idx = flatIndex;
                  const Icon = config.icon;
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelected(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        selected === idx ? 'bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: config.color + '15' }}>
                        <Icon className="h-4 w-4" style={{ color: config.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
