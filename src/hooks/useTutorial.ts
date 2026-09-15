import { useState, useCallback } from 'react';

const STORAGE_KEY = 'stockpilot_tutorial_done';

export interface TutorialStep {
  id: string;
  target: string | null; // data-tutorial attribute value, null = centred card
  title: string;
  description: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    target: null,
    title: 'Welcome to StockPilot!',
    description: "Let's take a quick tour so you know where everything is. It only takes a minute — or skip anytime.",
  },
  {
    id: 'kpi-cards',
    target: 'kpi-cards',
    title: 'Live KPI Cards',
    description: 'These cards show your real-time stock health — total items, low-stock alerts, out-of-stock counts, and how many items have been issued.',
  },
  {
    id: 'charts',
    target: 'charts',
    title: 'Inventory Overview',
    description: 'Charts break your stock down by category so you can spot imbalances at a glance. The pie chart shows relative distribution.',
  },
  {
    id: 'nav-inventory',
    target: 'nav-inventory',
    title: 'Inventory',
    description: 'Add and manage every item your organisation owns — quantities, categories, SKUs, supplier links, and reorder thresholds.',
  },
  {
    id: 'nav-recipients',
    target: 'nav-recipients',
    title: 'Recipients',
    description: 'Manage the students, patients, or employees who receive items. Group them by class, ward, or department.',
  },
  {
    id: 'nav-assignments',
    target: 'nav-assignments',
    title: 'Assignments',
    description: 'Issue an item to one person and track its return — including condition check, damage notes, and fines.',
  },
  {
    id: 'nav-bulk-issue',
    target: 'nav-bulk-issue',
    title: 'Bulk Issue',
    description: 'Issue a full set of items to an entire class in one shot using a template. Perfect for term openings.',
  },
  {
    id: 'nav-class-report',
    target: 'nav-class-report',
    title: 'Class Report',
    description: 'Print a signed A4 register showing exactly what each student received — ready for filing or audits.',
  },
  {
    id: 'nav-settings',
    target: 'nav-settings',
    title: 'Settings',
    description: 'Configure your organisation, receipt templates, class material templates, and which modules are active.',
  },
  {
    id: 'done',
    target: null,
    title: "You're all set!",
    description: "You can relaunch this tour anytime by clicking the ? button in the top bar. Good luck!",
  },
];

export function useTutorial() {
  const [isActive, setIsActive] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) !== '1',
  );
  const [stepIndex, setStepIndex] = useState(0);

  const start = useCallback(() => {
    setStepIndex(0);
    setIsActive(true);
  }, []);

  const next = useCallback(() => {
    setStepIndex(prev => {
      const next = prev + 1;
      if (next >= TUTORIAL_STEPS.length) {
        localStorage.setItem(STORAGE_KEY, '1');
        setIsActive(false);
        return 0;
      }
      return next;
    });
  }, []);

  const back = useCallback(() => {
    setStepIndex(prev => Math.max(0, prev - 1));
  }, []);

  const skip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1');
    setIsActive(false);
    setStepIndex(0);
  }, []);

  return {
    isActive,
    stepIndex,
    currentStep: TUTORIAL_STEPS[stepIndex],
    totalSteps: TUTORIAL_STEPS.length,
    start,
    next,
    back,
    skip,
  };
}
