import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { OmniChat } from '@/features/ask-omni/components/OmniChat';
import { useLanguage } from '@/lib/useLanguage';

import {
  type BubblePreference,
  parseBubblePreference,
  loadBubblePreference,
  BUBBLE_STORAGE_KEY,
  BUBBLE_INTRO_KEY,
} from '@/lib/bubblePreferences';

export type { BubblePreference };
export { parseBubblePreference, loadBubblePreference };

const BUBBLE_SIZE = 52;
const DRAG_THRESHOLD = 6;

export function OmniBubble() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lang = useLanguage();

  const [pref, setPref] = useState<BubblePreference>(loadBubblePreference);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return typeof localStorage !== 'undefined' ? !localStorage.getItem(BUBBLE_INTRO_KEY) : false;
    } catch {
      return false;
    }
  });
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [isDragging, setIsDragging] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  // Drag coordinates ref
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    initialY: 0,
    hasMoved: false,
    pointerId: null as number | null,
  });

  const bubbleRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Monitor screen resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persist preference
  const savePreference = useCallback((next: BubblePreference) => {
    setPref(next);
    try {
      localStorage.setItem(BUBBLE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota
    }
  }, []);

  // Dismiss intro tooltip
  const dismissIntro = () => {
    setShowIntro(false);
    try {
      localStorage.setItem(BUBBLE_INTRO_KEY, 'true');
    } catch {
      // ignore
    }
  };

  // Compute active pageContext
  const pageRoute = location.pathname.replace(/^\//, '') || 'schedule';
  const activeNoteId = pageRoute === 'notes' ? searchParams.get('open') || undefined : undefined;
  const pageContext = {
    route: pageRoute,
    noteId: activeNoteId,
  };

  // Drag Pointer Events
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      initialY: pref.y,
      hasMoved: false,
      pointerId: e.pointerId,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragRef.current.pointerId !== e.pointerId) return;
    const deltaX = Math.abs(e.clientX - dragRef.current.startX);
    const deltaY = Math.abs(e.clientY - dragRef.current.startY);

    if (!dragRef.current.hasMoved && (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD)) {
      dragRef.current.hasMoved = true;
      setIsDragging(true);
    }

    if (dragRef.current.hasMoved) {
      const nextY = dragRef.current.initialY - (e.clientY - dragRef.current.startY);
      // Constrain vertical bounds between top header (70px) and bottom nav (85px)
      const maxY = window.innerHeight - 130;
      const clampedY = Math.max(80, Math.min(maxY, nextY));
      dragRef.current.currentY = clampedY;

      if (bubbleRef.current) {
        bubbleRef.current.style.bottom = `${clampedY}px`;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current.pointerId !== e.pointerId) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (dragRef.current.hasMoved) {
      // Snap to closest horizontal side
      const snapSide: 'left' | 'right' = e.clientX < window.innerWidth / 2 ? 'left' : 'right';
      const finalY = dragRef.current.currentY || pref.y;
      savePreference({
        side: snapSide,
        y: finalY,
        collapsed: pref.collapsed,
      });
      setIsDragging(false);
    } else {
      // It was a tap!
      handleBubbleClick();
    }

    dragRef.current.pointerId = null;
    dragRef.current.hasMoved = false;
  };

  const handleBubbleClick = () => {
    if (showIntro) dismissIntro();
    if (pref.collapsed) {
      savePreference({ ...pref, collapsed: false });
    } else {
      setIsSheetOpen(true);
      setHasNewMessage(false);
    }
  };

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    savePreference({ ...pref, collapsed: !pref.collapsed });
  };

  const handleOpenFullScreen = () => {
    setIsSheetOpen(false);
    navigate('/ask-omni');
  };

  // Conditions where bubble MUST NOT be displayed
  const isHiddenRoute = ['/ask-omni', '/signin', '/reset-password'].includes(location.pathname);
  if (!isMobile || isHiddenRoute) {
    return null;
  }

  const isLeft = pref.side === 'left';

  return (
    <>
      {/* Floating Draggable Bubble */}
      <div
        ref={bubbleRef}
        role="region"
        className="omni-bubble-root"
        aria-label="Omni AI Assistant Bubble"
        style={{
          position: 'fixed',
          bottom: `${pref.y}px`,
          left: isLeft ? (pref.collapsed ? -20 : 16) : 'auto',
          right: !isLeft ? (pref.collapsed ? -20 : 16) : 'auto',
          zIndex: 90,
          touchAction: 'none',
          userSelect: 'none',
          transition: isDragging ? 'none' : 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Intro Tooltip (First visit only) */}
        {showIntro && !pref.collapsed && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 10px)',
              [isLeft ? 'left' : 'right']: 0,
              width: 220,
              padding: '0.625rem 0.75rem',
              background: 'var(--surface-container-highest)',
              color: 'var(--on-surface)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-modal)',
              fontSize: '0.75rem',
              lineHeight: 1.4,
              border: '1px solid var(--outline-variant)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
              animation: 'paletteIn 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Omni AI</span>
              <button
                type="button"
                className="btn-ghost"
                onClick={dismissIntro}
                style={{ padding: 2, height: 'auto' }}
                aria-label="Close intro"
              >
                <X size={12} />
              </button>
            </div>
            <div>
              {lang === 'id'
                ? 'Omni sekarang ada di bubble ini! Tap untuk chat kapan saja.'
                : 'Omni is now here! Tap this floating bubble to ask anything.'}
            </div>
          </div>
        )}

        {/* Bubble Button */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            aria-label={lang === 'id' ? 'Buka asisten Omni AI' : 'Open Omni AI assistant'}
            title="Omni AI"
            style={{
              width: BUBBLE_SIZE,
              height: BUBBLE_SIZE,
              borderRadius: pref.collapsed
                ? isLeft
                  ? '0 26px 26px 0'
                  : '26px 0 0 26px'
                : '50%',
              background: 'linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 70%, #9333ea) 100%)',
              color: 'var(--on-primary)',
              border: '2px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.24)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isDragging ? 'grabbing' : 'grab',
              padding: 0,
              position: 'relative',
              outline: 'none',
              transform: isDragging ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 0.15s ease',
            }}
          >
            <Sparkles size={24} strokeWidth={2} />

            {/* Notification Badge Dot */}
            {hasNewMessage && (
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: 'var(--error)',
                  border: '2px solid var(--surface)',
                }}
                aria-hidden="true"
              />
            )}
          </button>

          {/* Quick Collapse Arrow (when expanded) */}
          {!pref.collapsed && (
            <button
              type="button"
              onClick={handleToggleCollapse}
              aria-label={isLeft ? 'Collapse to left edge' : 'Collapse to right edge'}
              title={lang === 'id' ? 'Ciutkan ke tepi' : 'Collapse to edge'}
              style={{
                position: 'absolute',
                [isLeft ? 'left' : 'right']: -8,
                bottom: -4,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'var(--surface-container-highest)',
                border: '1px solid var(--outline-variant)',
                color: 'var(--on-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              {isLeft ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
            </button>
          )}
        </div>
      </div>

      {/* Bottom Sheet Modal (~80% height) */}
      {isSheetOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9990,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSheetOpen(false);
          }}
        >
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Omni AI Conversation"
            style={{
              width: '100%',
              height: '82vh',
              maxHeight: '88vh',
              background: 'var(--surface-container-low)',
              borderRadius: '20px 20px 0 0',
              boxShadow: 'var(--shadow-modal)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Sheet Handle */}
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: 'var(--outline-variant)',
                margin: '8px auto 4px',
                flexShrink: 0,
              }}
              aria-hidden="true"
            />

            <OmniChat
              isSheet={true}
              pageContext={pageContext}
              onClose={() => setIsSheetOpen(false)}
              onExpandFullScreen={handleOpenFullScreen}
            />
          </div>
        </div>
      )}
    </>
  );
}
