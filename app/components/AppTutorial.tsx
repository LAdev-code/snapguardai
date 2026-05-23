'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from 'react';

type Step = {
  title: string;
  description: string;
  targetSelector: string;
};

type AppTutorialProps = {
  steps: Step[];
  storageKey: string;
  enabled: boolean;
};

export type AppTutorialHandle = {
  restart: () => void;
};

const AppTutorial = forwardRef<AppTutorialHandle, AppTutorialProps>(function AppTutorial({ steps, storageKey, enabled }, ref) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const [animDir, setAnimDir] = useState<'next' | 'prev'>('next');
  const tooltipRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    restart() {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`${storageKey}_completed`);
      }
      setCurrentStep(0);
      setVisible(true);
    },
  }), [storageKey]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !enabled) return;
    const completed = localStorage.getItem(`${storageKey}_completed`);
    if (completed === 'true') return;
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, [mounted, enabled, storageKey]);

  useEffect(() => {
    if (!visible) return;

    const updateRect = () => {
      const target = document.querySelector(steps[currentStep].targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    const timer = setTimeout(updateRect, 400);

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [visible, currentStep, steps]);

  const complete = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${storageKey}_completed`, 'true');
    }
    setVisible(false);
  }, [storageKey]);

  const goNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setAnimDir('next');
      setCurrentStep((prev) => prev + 1);
    } else {
      complete();
    }
  }, [currentStep, steps.length, complete]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setAnimDir('prev');
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const skip = useCallback(() => {
    complete();
  }, [complete]);

  if (!visible) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  let tooltipStyle: React.CSSProperties = {};
  let arrowStyle: React.CSSProperties = {};

  if (targetRect) {
    const gap = 12;
    const tooltipW = 320;
    const tooltipH = 260;
    const margin = 16;

    const spaceBottom = window.innerHeight - targetRect.bottom;
    const spaceTop = targetRect.top;
    const spaceRight = window.innerWidth - targetRect.right;
    const spaceLeft = targetRect.left;

    const placeBottom = spaceBottom >= tooltipH + gap;
    const placeTop = spaceTop >= tooltipH + gap;
    const placeRight = spaceRight >= tooltipW + gap;
    const placeLeft = spaceLeft >= tooltipW + gap;

    if (placeBottom || (!placeTop && targetRect.bottom + tooltipH + gap + margin <= window.innerHeight)) {
      tooltipStyle.top = targetRect.bottom + gap;
      tooltipStyle.left = Math.max(margin, Math.min(targetRect.left + targetRect.width / 2 - tooltipW / 2, window.innerWidth - tooltipW - margin));
      arrowStyle = {
        top: targetRect.bottom,
        left: Math.min(targetRect.left + targetRect.width / 2, window.innerWidth - margin - 12),
        borderWidth: '8px',
        borderStyle: 'solid',
        borderColor: 'transparent transparent rgba(15,23,42,0.95) transparent',
      };
    } else if (placeTop) {
      tooltipStyle.top = Math.max(margin, targetRect.top - tooltipH - gap);
      tooltipStyle.left = Math.max(margin, Math.min(targetRect.left + targetRect.width / 2 - tooltipW / 2, window.innerWidth - tooltipW - margin));
      arrowStyle = {
        top: targetRect.top - gap,
        left: Math.min(targetRect.left + targetRect.width / 2, window.innerWidth - margin - 12),
        borderWidth: '8px',
        borderStyle: 'solid',
        borderColor: 'rgba(15,23,42,0.95) transparent transparent transparent',
      };
    } else if (placeRight) {
      tooltipStyle.top = Math.max(margin, Math.min(targetRect.top + targetRect.height / 2 - tooltipH / 2, window.innerHeight - tooltipH - margin));
      tooltipStyle.left = targetRect.right + gap;
      arrowStyle = {
        top: Math.min(targetRect.top + targetRect.height / 2, window.innerHeight - margin - 12),
        left: targetRect.right,
        borderWidth: '8px',
        borderStyle: 'solid',
        borderColor: 'transparent rgba(15,23,42,0.95) transparent transparent',
      };
    } else {
      tooltipStyle.top = Math.max(margin, Math.min(targetRect.top + targetRect.height / 2 - tooltipH / 2, window.innerHeight - tooltipH - margin));
      tooltipStyle.left = Math.max(margin, targetRect.left - tooltipW - gap);
      arrowStyle = {
        top: Math.min(targetRect.top + targetRect.height / 2, window.innerHeight - margin - 12),
        left: targetRect.left - gap,
        borderWidth: '8px',
        borderStyle: 'solid',
        borderColor: 'transparent transparent transparent rgba(15,23,42,0.95)',
      };
    }
  }

  return (
    <>
      {targetRect && (
        <>
          <div
            className="fixed z-[1000] pointer-events-none rounded-xl border-2 border-sky-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] shadow-sky-400/20 transition-all duration-500"
            style={{
              top: targetRect.top - 6,
              left: targetRect.left - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
            }}
          />
          <div
            className="fixed z-[1000] pointer-events-none rounded-xl animate-pulse"
            style={{
              top: targetRect.top - 6,
              left: targetRect.left - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
              boxShadow: '0 0 18px 4px rgba(56,189,248,0.3)',
            }}
          />
        </>
      )}

      {targetRect && (
        <div
          className="fixed z-[1001]"
          style={arrowStyle}
        />
      )}

      <div
        ref={tooltipRef}
        className={`fixed z-[1002] w-[320px] rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl transition-all duration-400 ${
          targetRect ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        style={tooltipStyle}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.3em] text-sky-300/70">
            Step {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={skip}
            className="rounded-full px-3 py-1 text-xs text-white/50 hover:text-white/80 transition"
          >
            Skip all
          </button>
        </div>
        <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
        <p className="mt-2 text-sm leading-6 text-white/70">{step.description}</p>

        <div className="mt-4 flex items-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep ? 'w-6 bg-sky-400' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentStep === 0}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            onClick={goNext}
            className="rounded-full bg-sky-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-300 transition"
          >
            {isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
});

export default AppTutorial;
