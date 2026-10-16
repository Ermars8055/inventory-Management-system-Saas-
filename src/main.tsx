import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';

Sentry.init({
  dsn: "https://e14bc55913ac44d98833a4425292c2a9@app.glitchtip.com/28791",
  tracesSampleRate: 1.0, // 100% of transactions so GlitchTip Performance tab gets data
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.consoleLoggingIntegration({ levels: ['log', 'info', 'warn', 'error'] }),
  ],
  ...({ autoSessionTracking: false, enableLogs: true } as Record<string, unknown>), // GlitchTip settings
});

// Helpers available in window console for manual testing
if (typeof window !== 'undefined') {
  const win = window as unknown as {
    testGlitchTip: () => void;
    testGlitchTipPerformance: () => void;
    testGlitchTipLog: () => void;
  };
  win.testGlitchTip = () => {
    Sentry.captureException(new Error("Test GlitchTip error from StockPilot Frontend"));
  };
  win.testGlitchTipPerformance = () => {
    Sentry.startSpan({ name: "Manual Test Transaction", op: "test.manual" }, (span) => {
      span.setAttribute("test.category", "observability");
      span.setAttribute("timestamp", new Date().toISOString());
    });
  };
  win.testGlitchTipLog = () => {
    Sentry.logger.info(`StockPilot Test Log [${new Date().toLocaleTimeString()}]`, {
      module: "Observability",
      action: "Test Log",
    });
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<div className="p-8 text-center text-red-600 font-medium">An unexpected error occurred. The team has been notified.</div>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
