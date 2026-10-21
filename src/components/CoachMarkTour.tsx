import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ArrowRight, ArrowLeft, X, Check } from 'lucide-react';
import { useLanguage } from '../lib/useLanguage';

export const TOUR_STORAGE_KEY = 'omnia_tour_completed';

interface TourStep {
  id: string;
  selector: string;
  targetPath?: string;
  titleId: string;
  titleEn: string;
  descId: string;
  descEn: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'schedule',
    selector: '[data-tour="nav-schedule"]',
    targetPath: '/schedule',
    titleId: 'Jadwal Kuliah',
    titleEn: 'Class Schedule',
    descId: 'Pantau kelas aktif, ruangan, dan jadwal semestermu di sini.',
    descEn: 'Track your classes, lecture rooms, and semester schedule.',
  },
  {
    id: 'assignments',
    selector: '[data-tour="nav-assignments"]',
    targetPath: '/assignments',
    titleId: 'Tugas & Deadline',
    titleEn: 'Assignments',
    descId: 'Kelola tugas kuliah dan pantau tenggat waktu agar tidak terlewat.',
    descEn: 'Manage coursework and keep track of upcoming deadlines.',
  },
  {
    id: 'finance',
    selector: '[data-tour="nav-finance"]',
    targetPath: '/finance',
    titleId: 'Keuangan Mahasiswa',
    titleEn: 'Student Finance',
    descId: 'Default batas anggaran adalah Rp 0. Kamu bisa mengaturnya kapan saja lewat kartu anggaran.',
    descEn: 'Default budget cap is 0. Adjust your monthly limits anytime directly on the finance card.',
  },
  {
    id: 'omni',
    selector: '[data-tour="omni-bubble"], [data-tour="nav-ask-omni"]',
    titleId: 'Asisten Omni AI',
    titleEn: 'Omni AI Assistant',
    descId: 'Tap bubble ini kapan saja untuk bertanya seputar jadwal dan kuliahmu.',
    descEn: 'Tap this floating bubble anytime for smart college assistance.',
  },
];

export function CoachMarkTour() {
  const lang = useLanguage();
  const isId = lang === 'id';
  const location = useLocation();
  const navigate = useNavigate();

  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[currentStepIndex];
  const retryCountRef = useRef(0);

  // Check storage on mount: mark as seen so refresh never opens it again!
  useEffect(() => {
    try {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      const sessionSeen = sessionStorage.getItem('omnia_tour_session_seen');

      // Only auto-trigger once EVER for new users
      if (!completed && !sessionSeen) {
        sessionStorage.setItem('omnia_tour_session_seen', 'true');
        // Mark completed right away so subsequent reloads never pop it up again
        localStorage.setItem(TOUR_STORAGE_KEY, 'true');

        const timer = setTimeout(() => {
          setIsActive(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, []);

  // Listen for custom trigger event to restart tour anytime from settings
  useEffect(() => {
    const handleStartTour = () => {
      setCurrentStepIndex(0);
      setIsActive(true);
    };
    window.addEventListener('start-coach-tour', handleStartTour);
    return () => window.removeEventListener('start-coach-tour', handleStartTour);
  }, []);

  const handleComplete = useCallback(() => {
    setIsActive(false);
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
      sessionStorage.setItem('omnia_tour_session_seen', 'true');
    } catch {
      // ignore
    }
  }, []);

  // Update target rect based on current step
  const updateRect = useCallback(() => {
    if (!isActive || !step) return;

    if (step.targetPath && location.pathname !== step.targetPath) {
      navigate(step.targetPath);
      return;
    }

    const selectors = step.selector.split(',').map((s) => s.trim());
    let element: HTMLElement | null = null;
    for (const sel of selectors) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el && el.offsetParent !== null) {
        element = el;
        break;
      }
    }

    if (element) {
      retryCountRef.current = 0;
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else if (retryCountRef.current < 15) {
      retryCountRef.current += 1;
      requestAnimationFrame(updateRect);
    } else {
      setTargetRect(null);
    }
  }, [isActive, step, location.pathname, navigate]);

  useEffect(() => {
    retryCountRef.current = 0;
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [updateRect, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleComplete();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStepIndex, handleComplete]);

  if (!isActive || !step) return null;

  const padding = 6;
  const hasRect = targetRect && targetRect.width > 0 && targetRect.height > 0;

  // Ultra-compact card geometry
  const cardWidth = 280;
  const cardHeight = 150;
  let cardTop = (window.innerHeight - cardHeight) / 2;
  let cardLeft = (window.innerWidth - cardWidth) / 2;

  if (hasRect) {
    const isMobile = window.innerWidth <= 768;
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceRight = window.innerWidth - targetRect.right;

    if (isMobile) {
      if (spaceBelow >= cardHeight + 20) {
        cardTop = targetRect.bottom + 12;
      } else {
        cardTop = Math.max(12, targetRect.top - cardHeight - 12);
      }
      cardLeft = Math.max(12, (window.innerWidth - cardWidth) / 2);
    } else {
      if (spaceRight >= cardWidth + 24) {
        cardLeft = targetRect.right + 16;
        cardTop = Math.max(16, Math.min(targetRect.top - 10, window.innerHeight - cardHeight - 16));
      } else if (spaceBelow >= cardHeight + 20) {
        cardTop = targetRect.bottom + 12;
        cardLeft = Math.max(16, Math.min(targetRect.left, window.innerWidth - cardWidth - 16));
      } else {
        cardTop = Math.max(16, targetRect.top - cardHeight - 12);
        cardLeft = Math.max(16, Math.min(targetRect.left, window.innerWidth - cardWidth - 16));
      }
    }
  }

  cardLeft = Math.max(12, Math.min(cardLeft, window.innerWidth - cardWidth - 12));
  cardTop = Math.max(12, Math.min(cardTop, window.innerHeight - cardHeight - 12));

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9990,
        pointerEvents: 'auto',
      }}
      aria-label="Coach marks tour"
      role="dialog"
    >
      {/* Light subtle backdrop with SVG spotlight mask */}
      <svg
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9991,
          pointerEvents: 'none',
        }}
      >
        <defs>
          <mask id="coachmark-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {hasRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="10"
                ry="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.45)"
          mask="url(#coachmark-spotlight-mask)"
        />
      </svg>

      {/* Target Focus Ring */}
      {hasRect && (
        <div
          style={{
            position: 'fixed',
            left: targetRect.left - padding,
            top: targetRect.top - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            borderRadius: '10px',
            border: '2px solid var(--primary)',
            boxShadow: '0 0 16px rgba(var(--primary-rgb, 27, 67, 50), 0.4)',
            pointerEvents: 'none',
            zIndex: 9992,
            transition: 'all 0.25s ease',
          }}
        />
      )}

      {/* Compact Minimal Card */}
      <div
        style={{
          position: 'fixed',
          left: cardLeft,
          top: cardTop,
          width: cardWidth,
          maxWidth: 'calc(100vw - 24px)',
          background: 'var(--surface-container-lowest)',
          border: '1px solid var(--outline-variant)',
          borderRadius: '12px',
          padding: '0.875rem 1rem',
          boxShadow: '0 8px 24px -2px rgba(0, 0, 0, 0.2)',
          zIndex: 9995,
          color: 'var(--on-surface)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        {/* Top: step indicator & close button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--primary)',
              letterSpacing: '0.04em',
            }}
          >
            {currentStepIndex + 1} / {TOUR_STEPS.length}
          </span>
          <button
            type="button"
            onClick={handleComplete}
            title={isId ? 'Tutup' : 'Close'}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--on-surface-variant)',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div>
          <h4
            style={{
              margin: '0 0 0.25rem 0',
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: 'var(--on-surface)',
            }}
          >
            {isId ? step.titleId : step.titleEn}
          </h4>
          <p
            style={{
              margin: 0,
              fontSize: '0.75rem',
              color: 'var(--on-surface-variant)',
              lineHeight: 1.45,
            }}
          >
            {isId ? step.descId : step.descEn}
          </p>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '0.375rem',
            borderTop: '1px solid var(--outline-variant)',
            marginTop: '0.125rem',
          }}
        >
          <button
            type="button"
            onClick={handleComplete}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '0.6875rem',
              color: 'var(--on-surface-variant)',
              cursor: 'pointer',
              padding: '0.2rem 0.35rem',
            }}
          >
            {isId ? 'Lewati' : 'Skip'}
          </button>

          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {currentStepIndex > 0 && (
              <button
                type="button"
                className="btn-outline min-touch-target"
                onClick={handlePrev}
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.2rem 0.45rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
              >
                <ArrowLeft size={11} />
                <span>{isId ? 'Kembali' : 'Back'}</span>
              </button>
            )}

            <button
              type="button"
              className="btn-primary min-touch-target"
              onClick={handleNext}
              style={{
                fontSize: '0.6875rem',
                padding: '0.2rem 0.6rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span>
                {currentStepIndex === TOUR_STEPS.length - 1
                  ? isId
                    ? 'Selesai'
                    : 'Done'
                  : isId
                  ? 'Lanjut'
                  : 'Next'}
              </span>
              {currentStepIndex === TOUR_STEPS.length - 1 ? (
                <Check size={11} />
              ) : (
                <ArrowRight size={11} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
