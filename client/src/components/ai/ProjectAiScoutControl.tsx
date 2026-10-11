import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, GripVertical } from 'lucide-react';

export type ScoutSnapPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

interface ProjectAiScoutControlProps {
  onTriggerMention: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  userId?: string;
  isAnalyzing?: boolean;
}

export const ProjectAiScoutControl: React.FC<ProjectAiScoutControlProps> = ({
  onTriggerMention,
  containerRef,
  userId = 'default',
  isAnalyzing = false,
}) => {
  const storageKey = `hookz_project_scout_pos_${userId}`;
  const [position, setPosition] = useState<ScoutSnapPosition>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && ['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(saved)) {
        return saved as ScoutSnapPosition;
      }
    } catch {}
    return 'bottom-right';
  });

  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const hasMovedRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Synchronize persisted position
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, position);
    } catch {}
  }, [position, storageKey]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Only primary button
    if (e.button !== 0) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    hasMovedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pointerStartRef.current || !containerRef.current || !buttonRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;

    if (!hasMovedRef.current && Math.hypot(dx, dy) > 6) {
      hasMovedRef.current = true;
      setIsDragging(true);
    }

    if (hasMovedRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const btnRect = buttonRef.current.getBoundingClientRect();

      // Clamp coordinates strictly within the chat area
      const minX = 12;
      const maxX = containerRect.width - btnRect.width - 12;
      const minY = 56; // Below chat header
      const maxY = containerRect.height - btnRect.height - 68; // Above composer input

      const currentX = e.clientX - containerRect.left - btnRect.width / 2;
      const currentY = e.clientY - containerRect.top - btnRect.height / 2;

      setDragOffset({
        x: Math.max(minX, Math.min(maxX, currentX)),
        y: Math.max(minY, Math.min(maxY, currentY)),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pointerStartRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const hadMoved = hasMovedRef.current;
    setIsDragging(false);

    if (hadMoved && containerRef.current && dragOffset) {
      const containerRect = containerRef.current.getBoundingClientRect();
      // Snap to nearest quadrant
      const isRight = dragOffset.x > containerRect.width / 2 - 40;
      const isBottom = dragOffset.y > containerRect.height / 2;

      const newSnap: ScoutSnapPosition = `${isBottom ? 'bottom' : 'top'}-${
        isRight ? 'right' : 'left'
      }` as ScoutSnapPosition;

      setPosition(newSnap);
      setDragOffset(null);
    } else if (!hadMoved) {
      // Clean click: Trigger @AI Scout mention
      setDragOffset(null);
      onTriggerMention();
    }

    pointerStartRef.current = null;
    hasMovedRef.current = false;
  };

  // Pre-calculated snap coordinates relative to the chat window
  const snapClasses: Record<ScoutSnapPosition, string> = {
    'bottom-right': 'bottom-18 right-3 sm:right-4',
    'bottom-left': 'bottom-18 left-3 sm:left-4',
    'top-right': 'top-16 right-3 sm:right-4',
    'top-left': 'top-16 left-3 sm:left-4',
  };

  const style = dragOffset
    ? {
        left: `${dragOffset.x}px`,
        top: `${dragOffset.y}px`,
        position: 'absolute' as const,
        touchAction: 'none' as const,
      }
    : undefined;

  return (
    <button
      ref={buttonRef}
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTriggerMention();
        }
      }}
      style={style}
      className={`${
        dragOffset ? '' : `absolute ${snapClasses[position]}`
      } z-20 select-none touch-none inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg border transition-all duration-150 cursor-grab active:cursor-grabbing ${
        isDragging ? 'scale-105 shadow-xl opacity-90 ring-2 ring-brand-400' : 'hover:scale-[1.03]'
      } ${
        isAnalyzing
          ? 'bg-indigo-900/90 border-indigo-400 text-white animate-pulse'
          : 'bg-slate-900/90 dark:bg-dark-850/95 border-brand-500/40 text-white hover:border-brand-400'
      } backdrop-blur-md`}
      title="Click to mention @AI Scout in project chat (Drag to reposition)"
      aria-label="HookZ AI Scout Assistant. Click to insert @AI Scout mention into message composer, or drag to reposition."
    >
      <GripVertical size={11} className="text-slate-400 shrink-0 opacity-60" />
      <span className="p-1 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center">
        {isAnalyzing ? (
          <Sparkles size={12} className="text-amber-300 animate-spin" />
        ) : (
          <Bot size={13} className="text-brand-400" />
        )}
      </span>
      <span className="text-xs font-bold tracking-tight text-white flex items-center gap-1">
        AI Scout
        <span className="text-[10px] font-semibold text-brand-300 bg-brand-500/20 px-1.5 py-0.2 rounded-full border border-brand-500/30">
          @mention
        </span>
      </span>
    </button>
  );
};
