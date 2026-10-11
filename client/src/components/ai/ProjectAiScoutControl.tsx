import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Sparkles, GripVertical, Check, AlertCircle, CornerDownRight } from 'lucide-react';

export type ScoutSnapPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

interface ProjectAiScoutControlProps {
  onTriggerMention: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  userId?: string;
  isAnalyzing?: boolean;
}

interface ContainerBounds {
  width: number;
  height: number;
  headerHeight: number;
  composerHeight: number;
}

interface DragState {
  x: number;
  y: number;
  isValid: boolean;
  restrictedReason?: 'header' | 'composer' | 'edge';
  targetCorner: ScoutSnapPosition;
}

export const ProjectAiScoutControl: React.FC<ProjectAiScoutControlProps> = ({
  onTriggerMention,
  containerRef,
  userId = 'default',
  isAnalyzing = false,
}) => {
  const storageKey = `hookz_project_scout_pos_${userId}`;

  // 1. Position state with persistence
  const [position, setPosition] = useState<ScoutSnapPosition>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && ['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(saved)) {
        return saved as ScoutSnapPosition;
      }
    } catch {}
    return 'bottom-right';
  });

  // 2. Measure dynamic container bounds (header, composer, container dimensions)
  const [bounds, setBounds] = useState<ContainerBounds>({
    width: 0,
    height: 0,
    headerHeight: 56,
    composerHeight: 68,
  });

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Gesture tracking refs
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const startBtnPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);

  // Measure bounds dynamically respecting actual header and composer sizes
  const measureBounds = useCallback((): ContainerBounds | null => {
    if (!containerRef.current) return null;
    const containerRect = containerRef.current.getBoundingClientRect();

    // Query actual header element (sticky top)
    const headerEl =
      (containerRef.current.querySelector('.sticky.top-0') as HTMLElement | null) ||
      (containerRef.current.firstElementChild as HTMLElement | null);
    const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 56;

    // Query actual composer element (form or sticky bottom)
    const composerEl =
      (containerRef.current.querySelector('form') as HTMLElement | null) ||
      (containerRef.current.querySelector('.sticky.bottom-0') as HTMLElement | null) ||
      (containerRef.current.lastElementChild as HTMLElement | null);
    const composerHeight = composerEl ? composerEl.getBoundingClientRect().height : 68;

    return {
      width: containerRect.width,
      height: containerRect.height,
      headerHeight: Math.max(headerHeight, 52),
      composerHeight: Math.max(composerHeight, 64),
    };
  }, [containerRef]);

  // Update bounds on mount, resize, and orientation changes
  useEffect(() => {
    const update = () => {
      const measured = measureBounds();
      if (measured) setBounds(measured);
    };

    update();
    window.addEventListener('resize', update);

    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => update());
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', update);
      resizeObserver?.disconnect();
    };
  }, [containerRef, measureBounds]);

  // Synchronize persisted position to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, position);
    } catch {}
  }, [position, storageKey]);

  // Helper: compute corner coordinates based on dynamic bounds
  const getCornerCoords = useCallback(
    (corner: ScoutSnapPosition, btnWidth: number, btnHeight: number, currentBounds: ContainerBounds) => {
      const marginX = 14;
      const marginY = 12;

      const topY = currentBounds.headerHeight + marginY;
      const bottomY = currentBounds.height - currentBounds.composerHeight - marginY - btnHeight;
      const leftX = marginX;
      const rightX = currentBounds.width - marginX - btnWidth;

      switch (corner) {
        case 'top-left':
          return { x: leftX, y: topY };
        case 'top-right':
          return { x: rightX, y: topY };
        case 'bottom-left':
          return { x: leftX, y: bottomY };
        case 'bottom-right':
        default:
          return { x: rightX, y: bottomY };
      }
    },
    []
  );

  // Helper: find nearest valid corner among the 4 corners
  const findNearestCorner = useCallback(
    (currentX: number, currentY: number, btnWidth: number, btnHeight: number, currentBounds: ContainerBounds): ScoutSnapPosition => {
      const corners: ScoutSnapPosition[] = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
      const btnCenterX = currentX + btnWidth / 2;
      const btnCenterY = currentY + btnHeight / 2;

      let bestCorner: ScoutSnapPosition = 'bottom-right';
      let minDistance = Infinity;

      for (const corner of corners) {
        const coords = getCornerCoords(corner, btnWidth, btnHeight, currentBounds);
        const cornerCenterX = coords.x + btnWidth / 2;
        const cornerCenterY = coords.y + btnHeight / 2;
        const dist = Math.hypot(btnCenterX - cornerCenterX, btnCenterY - cornerCenterY);

        if (dist < minDistance) {
          minDistance = dist;
          bestCorner = corner;
        }
      }

      return bestCorner;
    },
    [getCornerCoords]
  );

  // Pointer Down handler
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || !containerRef.current || !buttonRef.current) return;

    const currentBounds = measureBounds() || bounds;
    setBounds(currentBounds);

    const containerRect = containerRef.current.getBoundingClientRect();
    const btnRect = buttonRef.current.getBoundingClientRect();

    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    startBtnPosRef.current = {
      x: btnRect.left - containerRect.left,
      y: btnRect.top - containerRect.top,
    };
    hasMovedRef.current = false;

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Pointer Move handler with live Green / Red preview calculation
  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pointerStartRef.current || !startBtnPosRef.current || !containerRef.current || !buttonRef.current) return;

    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;

    if (!hasMovedRef.current && Math.hypot(dx, dy) > 6) {
      hasMovedRef.current = true;
    }

    if (hasMovedRef.current) {
      const currentBounds = bounds.width > 0 ? bounds : (measureBounds() || bounds);
      const btnRect = buttonRef.current.getBoundingClientRect();
      const btnWidth = btnRect.width || 120;
      const btnHeight = btnRect.height || 36;

      const rawX = startBtnPosRef.current.x + dx;
      const rawY = startBtnPosRef.current.y + dy;

      // Keep button strictly clamped inside chat window viewport
      const clampedX = Math.max(6, Math.min(currentBounds.width - btnWidth - 6, rawX));
      const clampedY = Math.max(6, Math.min(currentBounds.height - btnHeight - 6, rawY));

      // Overlap detection: Check if dragged position overlaps header, composer, or restricted edges
      const overlapsHeader = clampedY < currentBounds.headerHeight + 6;
      const overlapsComposer = clampedY + btnHeight > currentBounds.height - currentBounds.composerHeight - 6;
      const overlapsEdge = clampedX < 6 || clampedX + btnWidth > currentBounds.width - 6;

      const isValid = !overlapsHeader && !overlapsComposer && !overlapsEdge;
      const restrictedReason: DragState['restrictedReason'] = overlapsHeader
        ? 'header'
        : overlapsComposer
        ? 'composer'
        : overlapsEdge
        ? 'edge'
        : undefined;

      const targetCorner = findNearestCorner(clampedX, clampedY, btnWidth, btnHeight, currentBounds);

      setDragState({
        x: clampedX,
        y: clampedY,
        isValid,
        restrictedReason,
        targetCorner,
      });
    }
  };

  // Pointer Up handler: Snap to nearest corner or trigger mention
  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pointerStartRef.current) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const moved = hasMovedRef.current;
    const currentDrag = dragState;

    // Reset drag state
    setDragState(null);
    pointerStartRef.current = null;
    startBtnPosRef.current = null;
    hasMovedRef.current = false;

    if (moved && currentDrag) {
      // Snap to nearest valid corner (never settle in an invalid position)
      setPosition(currentDrag.targetCorner);
    } else if (!moved) {
      // Clean click: Trigger @AI Scout mention in composer
      onTriggerMention();
    }
  };

  // Compute normal settled position style (when not dragging)
  const getSettledStyle = (): React.CSSProperties => {
    const btnWidth = buttonRef.current?.offsetWidth || 120;
    const btnHeight = buttonRef.current?.offsetHeight || 36;
    const currentBounds = bounds.width > 0 ? bounds : (measureBounds() || bounds);

    const marginX = 14;
    const marginY = 12;

    switch (position) {
      case 'top-left':
        return {
          top: `${currentBounds.headerHeight + marginY}px`,
          left: `${marginX}px`,
        };
      case 'top-right':
        return {
          top: `${currentBounds.headerHeight + marginY}px`,
          right: `${marginX}px`,
        };
      case 'bottom-left':
        return {
          bottom: `${currentBounds.composerHeight + marginY}px`,
          left: `${marginX}px`,
        };
      case 'bottom-right':
      default:
        return {
          bottom: `${currentBounds.composerHeight + marginY}px`,
          right: `${marginX}px`,
        };
    }
  };

  // Compute ghost target preview slot coordinates while dragging
  const getGhostPreviewCoords = (target: ScoutSnapPosition) => {
    const btnWidth = buttonRef.current?.offsetWidth || 120;
    const btnHeight = buttonRef.current?.offsetHeight || 36;
    const currentBounds = bounds.width > 0 ? bounds : (measureBounds() || bounds);
    return getCornerCoords(target, btnWidth, btnHeight, currentBounds);
  };

  const isDragging = dragState !== null;
  const ghostCoords = dragState ? getGhostPreviewCoords(dragState.targetCorner) : null;

  return (
    <>
      {/* 1. Ghost Placement Preview Layout at Target Snap Corner */}
      {isDragging && ghostCoords && (
        <div
          style={{
            position: 'absolute',
            left: `${ghostCoords.x}px`,
            top: `${ghostCoords.y}px`,
            width: buttonRef.current ? `${buttonRef.current.offsetWidth}px` : '124px',
            height: buttonRef.current ? `${buttonRef.current.offsetHeight}px` : '36px',
            pointerEvents: 'none',
          }}
          className={`z-15 rounded-full border-2 border-dashed flex items-center justify-center gap-1.5 px-3 py-1.5 transition-all duration-150 backdrop-blur-xs select-none ${
            dragState.isValid
              ? 'border-emerald-500/80 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 shadow-md ring-2 ring-emerald-500/20'
              : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm'
          }`}
        >
          {dragState.isValid ? (
            <>
              <Check size={12} className="text-emerald-500 dark:text-emerald-300 stroke-[3]" />
              <span className="text-[10px] font-bold tracking-tight uppercase">Snap Target</span>
            </>
          ) : (
            <>
              <CornerDownRight size={12} className="text-emerald-500 dark:text-emerald-300 animate-pulse" />
              <span className="text-[10px] font-bold tracking-tight uppercase">Safe Destination</span>
            </>
          )}
        </div>
      )}

      {/* 2. Interactive AI Scout Draggable Button */}
      <button
        ref={buttonRef}
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTriggerMention();
          }
        }}
        style={
          isDragging
            ? {
                position: 'absolute',
                left: `${dragState.x}px`,
                top: `${dragState.y}px`,
                touchAction: 'none',
              }
            : {
                position: 'absolute',
                ...getSettledStyle(),
                touchAction: 'none',
              }
        }
        className={`z-20 select-none touch-none inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg transition-[transform,shadow,border-color,background-color] duration-100 ${
          isDragging ? 'cursor-grabbing scale-105 shadow-2xl' : 'cursor-grab hover:scale-[1.03]'
        } ${
          isDragging
            ? dragState.isValid
              ? /* GREEN LAYOUT: Valid, unobstructed position */
                'bg-emerald-950/95 dark:bg-emerald-950/95 border-2 border-emerald-400 text-white ring-4 ring-emerald-500/30 shadow-emerald-950/50'
              : /* RED LAYOUT: Overlaps header, composer, or restricted zone */
                'bg-rose-950/95 dark:bg-rose-950/95 border-2 border-rose-500 text-white ring-4 ring-rose-500/30 shadow-rose-950/50'
            : isAnalyzing
            ? 'bg-indigo-900/90 border border-indigo-400 text-white animate-pulse'
            : 'bg-slate-900/95 dark:bg-dark-850/95 border border-brand-500/40 text-white hover:border-brand-400'
        } backdrop-blur-md`}
        title="Click to mention @AI Scout in project chat (Drag to reposition)"
        aria-label="HookZ AI Scout Assistant. Click to insert @AI Scout mention into message composer, or drag to reposition."
      >
        <GripVertical
          size={11}
          className={`shrink-0 ${
            isDragging
              ? dragState.isValid
                ? 'text-emerald-300'
                : 'text-rose-300'
              : 'text-slate-400 opacity-60'
          }`}
        />

        <span
          className={`p-1 rounded-full flex items-center justify-center ${
            isDragging
              ? dragState.isValid
                ? 'bg-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/30 text-rose-300'
              : 'bg-brand-500/20 text-brand-400'
          }`}
        >
          {isAnalyzing ? (
            <Sparkles size={12} className="text-amber-300 animate-spin" />
          ) : isDragging && !dragState.isValid ? (
            <AlertCircle size={13} className="text-rose-300 animate-pulse" />
          ) : (
            <Bot size={13} />
          )}
        </span>

        <span className="text-xs font-bold tracking-tight text-white flex items-center gap-1">
          AI Scout
          {isDragging ? (
            dragState.isValid ? (
              /* Green layout pill */
              <span className="text-[9px] font-bold text-emerald-200 bg-emerald-500/30 px-1.5 py-0.5 rounded-full border border-emerald-400/50 flex items-center gap-0.5">
                <Check size={9} className="stroke-[3]" /> Valid
              </span>
            ) : (
              /* Red layout pill */
              <span className="text-[9px] font-bold text-rose-200 bg-rose-500/30 px-1.5 py-0.5 rounded-full border border-rose-400/50 flex items-center gap-0.5">
                <AlertCircle size={9} /> Restricted
              </span>
            )
          ) : (
            <span className="text-[10px] font-semibold text-brand-300 bg-brand-500/20 px-1.5 py-0.2 rounded-full border border-brand-500/30">
              @mention
            </span>
          )}
        </span>

        {/* Warning tooltip pill when user drags into a restricted zone */}
        {isDragging && !dragState.isValid && (
          <div
            className={`absolute ${
              dragState.restrictedReason === 'header' ? 'top-full mt-2' : 'bottom-full mb-2'
            } left-1/2 -translate-x-1/2 bg-rose-950/95 text-rose-100 text-[10px] font-semibold px-2.5 py-1 rounded-md shadow-xl border border-rose-500/60 whitespace-nowrap pointer-events-none flex items-center gap-1 z-30 animate-in fade-in`}
          >
            <AlertCircle size={10} className="text-rose-400 shrink-0" />
            <span>
              {dragState.restrictedReason === 'header'
                ? 'Overlaps project header — will snap to nearest corner'
                : dragState.restrictedReason === 'composer'
                ? 'Overlaps message composer — will snap to nearest corner'
                : 'Restricted area — will snap to nearest corner'}
            </span>
          </div>
        )}
      </button>
    </>
  );
};
