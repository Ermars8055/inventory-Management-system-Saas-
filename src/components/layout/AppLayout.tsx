import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import SessionWarning from '@/components/shared/SessionWarning';
import { TutorialOverlay } from '@/components/shared/TutorialOverlay';
import { useTutorial } from '@/hooks/useTutorial';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const tutorial = useTutorial();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setMobileOpen(true)} onStartTutorial={tutorial.start} />
        <main className="flex-1 overflow-x-hidden p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      <SessionWarning />
      {tutorial.isActive && (
        <TutorialOverlay
          step={tutorial.currentStep}
          stepIndex={tutorial.stepIndex}
          totalSteps={tutorial.totalSteps}
          onNext={tutorial.next}
          onBack={tutorial.back}
          onSkip={tutorial.skip}
        />
      )}
    </div>
  );
}
