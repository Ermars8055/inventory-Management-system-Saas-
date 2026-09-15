import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TutorialStep } from '@/hooks/useTutorial';

interface Props {
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const PAD = 10;
const TIP_W = 304;
// Generous overestimate — actual card is ~200px, so clamp(win.h - TIP_H - 16) always works
const TIP_H = 300;

export function TutorialOverlay({ step, stepIndex, totalSteps, onNext, onBack, onSkip }: Props) {
  const navigate = useNavigate();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [win, setWin] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    setRect(null);
    if (step.navigateTo) navigate(step.navigateTo);

    const t = setTimeout(() => {
      setWin({ w: window.innerWidth, h: window.innerHeight });
      if (!step.target) { setRect(null); return; }
      const el = document.querySelector(`[data-tutorial="${step.target}"]`);
      if (!el) { setRect(null); return; }
      // Bring the nav item into view if the sidebar is scrolled past it
      el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      // Allow one frame for layout to settle after scrollIntoView
      requestAnimationFrame(() => setRect(el.getBoundingClientRect()));
    }, 160);

    function onUpdate() {
      setWin({ w: window.innerWidth, h: window.innerHeight });
      if (!step.target) return;
      const el = document.querySelector(`[data-tutorial="${step.target}"]`);
      if (el) setRect(el.getBoundingClientRect());
    }
    window.addEventListener('resize', onUpdate);
    window.addEventListener('scroll', onUpdate, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onUpdate);
      window.removeEventListener('scroll', onUpdate, true);
    };
  }, [step, navigate]);

  // Three display states:
  // 1. No target → centred card
  // 2. Has target but not found yet → hidden (during navigation delay)
  // 3. Has target and found → positioned spotlight + card
  const hastarget = Boolean(step.target);
  const isCentered = !hastarget;
  const isHidden   = hastarget && !rect;

  const spotX = rect ? rect.left - PAD : 0;
  const spotY = rect ? rect.top  - PAD : 0;
  const spotW = rect ? rect.width  + PAD * 2 : 0;
  const spotH = rect ? rect.height + PAD * 2 : 0;

  let tipLeft = 0;
  let tipTop  = 0;
  if (rect) {
    const isSidebar = rect.right < 280;
    if (isSidebar) {
      tipLeft = rect.right + 20;
      tipTop  = rect.top + rect.height / 2 - TIP_H / 2;
    } else {
      const spotBottom = rect.bottom + PAD;
      tipTop  = (win.h - spotBottom - 12) >= TIP_H
        ? spotBottom + 12
        : rect.top - PAD - 12 - TIP_H;
      tipLeft = rect.left + rect.width / 2 - TIP_W / 2;
    }
    tipLeft = Math.max(16, Math.min(tipLeft, win.w - TIP_W - 16));
    tipTop  = Math.max(16, Math.min(tipTop,  win.h - TIP_H - 16));
  }

  const tooltipStyle: React.CSSProperties = isHidden
    ? { position: 'absolute', left: -9999, top: -9999, width: TIP_W, pointerEvents: 'all', visibility: 'hidden' }
    : isCentered
    ? { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: TIP_W, pointerEvents: 'all' }
    : { position: 'absolute', left: tipLeft, top: tipTop, width: TIP_W, pointerEvents: 'all' };

  const isFirst = stepIndex === 0;
  const isLast  = stepIndex === totalSteps - 1;

  function handleFinish() {
    navigate('/dashboard');
    onNext();
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
      {/* Dimmed backdrop with spotlight cutout */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'all' }}>
        <defs>
          <mask id="tut-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && <rect x={spotX} y={spotY} width={spotW} height={spotH} rx={8} fill="black" />}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#tut-mask)" />
      </svg>

      {/* Blue highlight ring */}
      {rect && (
        <div style={{
          position: 'absolute',
          left: spotX, top: spotY, width: spotW, height: spotH,
          borderRadius: 8,
          border: '2px solid hsl(221 83% 53%)',
          boxShadow: '0 0 0 3px hsla(221,83%,53%,0.2)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Tooltip card */}
      <div
        style={tooltipStyle}
        className="bg-white rounded-xl shadow-2xl border border-border p-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">{stepIndex + 1} of {totalSteps}</span>
          <button onClick={onSkip} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="text-sm font-semibold mb-1">{step.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">{step.description}</p>

        <div className="flex items-center gap-1 mb-3">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all duration-200" style={{
              width: i === stepIndex ? 16 : 6,
              background: i === stepIndex ? 'hsl(221 83% 53%)' : 'hsl(214 20% 85%)',
            }} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {!isFirst && (
            <Button variant="outline" size="sm" onClick={onBack} className="h-7 px-2.5 text-xs">
              <ChevronLeft className="h-3 w-3 mr-0.5" /> Back
            </Button>
          )}
          {isLast ? (
            <Button size="sm" onClick={handleFinish} className="h-7 px-3 text-xs ml-auto">
              Get Started →
            </Button>
          ) : (
            <Button size="sm" onClick={onNext} className="h-7 px-3 text-xs ml-auto">
              Next <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
