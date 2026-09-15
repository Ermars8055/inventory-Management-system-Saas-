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
const TIP_H = 220; // generous estimate so clamp always works

export function TutorialOverlay({ step, stepIndex, totalSteps, onNext, onBack, onSkip }: Props) {
  const navigate = useNavigate();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [win, setWin] = useState({ w: window.innerWidth, h: window.innerHeight });

  // Navigate to the step's page, then measure after a brief render delay
  useEffect(() => {
    if (step.navigateTo) {
      navigate(step.navigateTo);
    }

    const measureAfterRender = () => {
      setWin({ w: window.innerWidth, h: window.innerHeight });
      if (!step.target) { setRect(null); return; }
      const el = document.querySelector(`[data-tutorial="${step.target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };

    // Small delay so the navigated page has time to mount
    const t = setTimeout(measureAfterRender, 120);

    function onResizeOrScroll() {
      setWin({ w: window.innerWidth, h: window.innerHeight });
      if (!step.target) return;
      const el = document.querySelector(`[data-tutorial="${step.target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    }
    window.addEventListener('resize', onResizeOrScroll);
    window.addEventListener('scroll', onResizeOrScroll, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResizeOrScroll);
      window.removeEventListener('scroll', onResizeOrScroll, true);
    };
  }, [step, navigate]);

  const isCentered = !rect;
  const spotX = rect ? rect.left - PAD : 0;
  const spotY = rect ? rect.top - PAD : 0;
  const spotW = rect ? rect.width + PAD * 2 : 0;
  const spotH = rect ? rect.height + PAD * 2 : 0;

  // Tooltip positioning:
  // • Sidebar elements (rect.right < 280) → pop to the RIGHT of the element
  // • Everything else → below or above, hard-clamped to viewport
  let tipLeft = 0;
  let tipTop = 0;

  if (!isCentered && rect) {
    const isSidebarItem = rect.right < 280;

    if (isSidebarItem) {
      // Appear to the right of the sidebar link, vertically centred on it
      tipLeft = rect.right + 20;
      tipTop = rect.top + rect.height / 2 - TIP_H / 2;
    } else {
      // Below if room, else above
      const belowRoom = win.h - (spotY + spotH);
      tipTop = belowRoom >= TIP_H + 16
        ? spotY + spotH + 12
        : spotY - TIP_H - 12;
      tipLeft = spotX + spotW / 2 - TIP_W / 2;
    }

    // Hard-clamp so it never overflows the viewport
    tipLeft = Math.max(16, Math.min(tipLeft, win.w - TIP_W - 16));
    tipTop = Math.max(16, Math.min(tipTop, win.h - TIP_H - 16));
  }

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  function handleFinish() {
    navigate('/dashboard');
    onNext(); // marks tutorial done via the hook
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
      {/* Dimmed backdrop with cutout */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'all' }}>
        <defs>
          <mask id="tut-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && <rect x={spotX} y={spotY} width={spotW} height={spotH} rx={8} fill="black" />}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#tut-mask)" />
      </svg>

      {/* Blue highlight ring around target */}
      {rect && (
        <div
          style={{
            position: 'absolute',
            left: spotX,
            top: spotY,
            width: spotW,
            height: spotH,
            borderRadius: 8,
            border: '2px solid hsl(221 83% 53%)',
            boxShadow: '0 0 0 3px hsla(221,83%,53%,0.2)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        style={
          isCentered
            ? { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: TIP_W, pointerEvents: 'all' }
            : { position: 'absolute', left: tipLeft, top: tipTop, width: TIP_W, pointerEvents: 'all' }
        }
        className="bg-white rounded-xl shadow-2xl border border-border p-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Step counter + close */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">{stepIndex + 1} of {totalSteps}</span>
          <button onClick={onSkip} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="text-sm font-semibold mb-1">{step.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">{step.description}</p>

        {/* Progress dots */}
        <div className="flex items-center gap-1 mb-3">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-200"
              style={{
                width: i === stepIndex ? 16 : 6,
                background: i === stepIndex ? 'hsl(221 83% 53%)' : 'hsl(214 20% 85%)',
              }}
            />
          ))}
        </div>

        {/* Buttons */}
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
