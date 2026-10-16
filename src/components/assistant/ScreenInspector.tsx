import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, HelpCircle, ArrowRight, Lightbulb, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { APP_CONCEPTS, PAGE_GUIDES, type ConceptItem } from '@/lib/assistant/assistantKnowledge';
import { matchElementPrecisely } from '@/lib/assistant/pageElementRegistry';
import { useNavigate } from 'react-router-dom';

interface ScreenInspectorProps {
  active: boolean;
  onClose: () => void;
  currentPath: string;
}

interface InspectMatch {
  title: string;
  category: string;
  whatItIs: string;
  whyItMatters?: string;
  howToUse?: string;
  proTip?: string;
  rect: DOMRect;
  actions?: { label: string; path?: string }[];
}

export function ScreenInspector({ active, onClose, currentPath }: ScreenInspectorProps) {
  const navigate = useNavigate();
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const [lockedMatch, setLockedMatch] = useState<InspectMatch | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Get current page guide
  const pageGuide = PAGE_GUIDES[currentPath] || Object.values(PAGE_GUIDES).find(p => currentPath.startsWith(p.path));

  // Find match based on element text / role / context
  function findMatchForElement(el: HTMLElement): InspectMatch | null {
    // 1. Try our precision page-context matcher first on the element itself
    const precise = matchElementPrecisely(currentPath, el);
    if (precise) {
      return {
        title: precise.title,
        category: precise.category,
        whatItIs: precise.whatItIs,
        whyItMatters: precise.whyItMatters,
        howToUse: precise.howToUse,
        proTip: precise.proTip,
        actions: precise.actions,
        rect: el.getBoundingClientRect(),
      };
    }

    // 2. If element is a child inside a card, row, or button, test its parent container
    const container = el.closest('.card, tr, [data-student-card], [data-inventory-card], [data-inventory-row], [data-class-card], button, [role="button"], header, nav') as HTMLElement;
    if (container && container !== el) {
      const containerPrecise = matchElementPrecisely(currentPath, container);
      if (containerPrecise) {
        return {
          title: containerPrecise.title,
          category: containerPrecise.category,
          whatItIs: containerPrecise.whatItIs,
          whyItMatters: containerPrecise.whyItMatters,
          howToUse: containerPrecise.howToUse,
          proTip: containerPrecise.proTip,
          actions: containerPrecise.actions,
          rect: container.getBoundingClientRect(),
        };
      }
    }

    const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder') || '').trim();
    if (!text && el.tagName !== 'BUTTON' && el.tagName !== 'INPUT' && el.tagName !== 'SELECT' && el.tagName !== 'TABLE') {
      return null;
    }

    const tLower = text.toLowerCase();
    const rect = el.getBoundingClientRect();

    // 3. Check page elements in pageGuide
    if (pageGuide) {
      for (const item of pageGuide.keyElements) {
        if (tLower === item.name.toLowerCase() || (item.name.length > 4 && tLower.includes(item.name.toLowerCase()))) {
          return {
            title: item.name,
            category: pageGuide.title,
            whatItIs: item.whatItIs,
            howToUse: item.instructions,
            rect,
          };
        }
      }
    }

    // 4. Exact term matching in APP_CONCEPTS only (no loose substring false-positives!)
    for (const c of APP_CONCEPTS) {
      if (tLower === c.term.toLowerCase() || c.keywords.some(k => tLower === k)) {
        return {
          title: c.term,
          category: c.category.toUpperCase(),
          whatItIs: c.summary,
          whyItMatters: c.whyItMatters,
          howToUse: c.howToUse,
          proTip: c.proTip,
          actions: c.actions,
          rect,
        };
      }
    }

    // 3. Fallback generic match based on element type
    if (el.tagName === 'BUTTON' && text) {
      return {
        title: text,
        category: 'ACTION BUTTON',
        whatItIs: `Triggers the "${text}" action on this screen.`,
        howToUse: 'Click to open its modal, submit the form, or execute this operation.',
        rect,
      };
    }

    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
      const placeholder = el.getAttribute('placeholder') || 'this field';
      return {
        title: text || placeholder,
        category: 'FORM INPUT',
        whatItIs: `Input control for ${text || placeholder}.`,
        howToUse: 'Enter or select the desired value according to your organization policy.',
        rect,
      };
    }

    if (text.length > 2 && text.length < 80) {
      return {
        title: text,
        category: 'UI ELEMENT',
        whatItIs: `Part of ${pageGuide?.title || 'this screen'}.`,
        howToUse: 'Provides information or filters relevant data on this page.',
        rect,
      };
    }

    return null;
  }

  // Handle hover and click
  useEffect(() => {
    if (!active) {
      setHoverRect(null);
      setLockedMatch(null);
      return;
    }

    function handleMouseMove(e: MouseEvent) {
      if (lockedMatch) return; // don't move hover if currently viewing card

      const target = e.target as HTMLElement;
      if (!target || target.closest('[data-inspector-ui="true"]')) return;

      // Find closest interactive or meaningful element
      const el = (target.closest('button, input, select, th, tr, .card, [data-student-card], [data-inventory-card], [data-inventory-row], [data-class-card], [role="button"], h1, h2, h3, [data-tutorial]') || target) as HTMLElement;
      if (el && el !== document.body && el !== document.documentElement) {
        const match = findMatchForElement(el);
        if (match) {
          setHoverRect(match.rect);
        } else {
          setHoverRect(null);
        }
      } else {
        setHoverRect(null);
      }
    }

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest('[data-inspector-ui="true"]')) return;

      e.preventDefault();
      e.stopPropagation();

      const el = (target.closest('button, input, select, th, tr, .card, [data-student-card], [data-inventory-card], [data-inventory-row], [data-class-card], [role="button"], h1, h2, h3, [data-tutorial]') || target) as HTMLElement;
      if (el) {
        const match = findMatchForElement(el);
        if (match) {
          setLockedMatch(match);
        }
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (lockedMatch) {
          setLockedMatch(null);
        } else {
          onClose();
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, lockedMatch, pageGuide]);

  if (!active) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      data-inspector-ui="true"
    >
      {/* Top Banner */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto bg-slate-900/90 text-white backdrop-blur-md px-4 py-2 rounded-full shadow-2xl border border-cyan-500/50 flex items-center gap-3 text-xs animate-in fade-in slide-in-from-top-4">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
        </span>
        <span className="font-semibold text-cyan-300">Screen Inspector Mode:</span>
        <span className="text-slate-200 hidden sm:inline">Hover over anything to highlight • Click to inspect</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="h-6 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-full"
        >
          <X className="h-3.5 w-3.5 mr-1" /> Exit (Esc)
        </Button>
      </div>

      {/* Hover Bounding Box */}
      {hoverRect && !lockedMatch && (
        <div
          className="absolute transition-all duration-75 border-2 border-cyan-400 bg-cyan-400/10 rounded pointer-events-none shadow-[0_0_15px_rgba(34,211,238,0.5)]"
          style={{
            top: hoverRect.top - 3,
            left: hoverRect.left - 3,
            width: hoverRect.width + 6,
            height: hoverRect.height + 6,
          }}
        >
          <span className="absolute -top-5 left-0 bg-cyan-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
            Click to learn what this does
          </span>
        </div>
      )}

      {/* Locked Match Card (Detail Popover) */}
      {lockedMatch && (
        <div className="fixed inset-0 pointer-events-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border border-cyan-500/40 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-950/40 to-slate-900/60 p-4 border-b border-border flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-cyan-600 border-cyan-200 bg-cyan-50 dark:bg-cyan-950/50">
                    {lockedMatch.category}
                  </Badge>
                  <h3 className="font-semibold text-base text-foreground mt-0.5">
                    {lockedMatch.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setLockedMatch(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3.5 text-sm max-h-[70vh] overflow-y-auto">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3 w-3 text-amber-500" /> What is this?
                </p>
                <p className="text-foreground leading-relaxed">
                  {lockedMatch.whatItIs}
                </p>
              </div>

              {lockedMatch.whyItMatters && (
                <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Why it matters
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {lockedMatch.whyItMatters}
                  </p>
                </div>
              )}

              {lockedMatch.howToUse && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
                    <ArrowRight className="h-3 w-3 text-primary" /> How to use it
                  </p>
                  <p className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed">
                    {lockedMatch.howToUse}
                  </p>
                </div>
              )}

              {lockedMatch.proTip && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-xs text-amber-900 dark:text-amber-200">
                  <strong className="font-semibold flex items-center gap-1 mb-0.5">
                    💡 Pro Tip:
                  </strong>
                  {lockedMatch.proTip}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-muted/30 border-t border-border flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                Press <kbd className="px-1 py-0.5 bg-muted rounded border text-[10px]">Esc</kbd> to inspect another item
              </span>
              <div className="flex items-center gap-2">
                {lockedMatch.actions?.map((act) => (
                  <Button
                    key={act.label}
                    size="sm"
                    className="h-7 text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
                    onClick={() => {
                      if (act.path) {
                        navigate(act.path);
                        onClose();
                      }
                    }}
                  >
                    {act.label}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setLockedMatch(null)}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
