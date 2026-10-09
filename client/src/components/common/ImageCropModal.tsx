import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Check, Move, RefreshCw, X } from 'lucide-react';
import { Modal } from './Modal';

export interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  type: 'avatar' | 'cover';
  onConfirm: (adjustedDataUrl: string) => Promise<void> | void;
  isSaving?: boolean;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  type,
  onConfirm,
  isSaving = false,
}) => {
  const isAvatar = type === 'avatar';
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Reset controls when opened or image changes
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setIsDragging(false);
      setImageLoaded(false);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        setImageLoaded(true);
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  // Handle Drag / Pan (Mouse and Touch)
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = { x: clientX, y: clientY };
    panStartRef.current = { ...pan };
  };

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse event listeners
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handlePointerDown(e.clientX, e.clientY);
  };

  // Touch event listeners
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handlePointerDown(touch.clientX, touch.clientY);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handlePointerMove(touch.clientX, touch.clientY);
    }
  };

  // Mouse move and up global listeners while dragging
  useEffect(() => {
    if (!isDragging) return;
    const onWindowMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };
    const onWindowMouseUp = () => {
      handlePointerUp();
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Reset Zoom & Pan
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Render cropped preview to canvas and export
  const handleSaveCropped = () => {
    if (!containerRef.current || !imageRef.current || !imageLoaded) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const Vw = containerRect.width;
    const Vh = containerRect.height;

    // Define output canvas resolution and aperture dimensions in viewport
    const outputWidth = isAvatar ? 600 : 1200;
    const outputHeight = isAvatar ? 600 : 400;

    let apertureWidth: number;
    let apertureHeight: number;

    if (isAvatar) {
      const size = Math.min(Vw - 32, Vh - 32, 260);
      apertureWidth = size;
      apertureHeight = size;
    } else {
      apertureWidth = Math.min(Vw - 24, 520);
      apertureHeight = apertureWidth * (outputHeight / outputWidth);
      if (apertureHeight > Vh - 24) {
        apertureHeight = Vh - 24;
        apertureWidth = apertureHeight * (outputWidth / outputHeight);
      }
    }

    const Ax = (Vw - apertureWidth) / 2;
    const Ay = (Vh - apertureHeight) / 2;

    const Iw = naturalSize.width || 800;
    const Ih = naturalSize.height || 600;

    // Base scale to cover viewport
    const baseScale = Math.max(apertureWidth / Iw, apertureHeight / Ih);
    const Dw = Iw * baseScale;
    const Dh = Ih * baseScale;

    // Scaled dimensions with user zoom
    const finalW = Dw * zoom;
    const finalH = Dh * zoom;

    // Viewport top-left of image
    const imgX = (Vw / 2 + pan.x) - finalW / 2;
    const imgY = (Vh / 2 + pan.y) - finalH / 2;

    // Canvas scaling factor from aperture to export
    const scaleFactor = outputWidth / apertureWidth;

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw image onto canvas transformed
    const drawX = (imgX - Ax) * scaleFactor;
    const drawY = (imgY - Ay) * scaleFactor;
    const drawW = finalW * scaleFactor;
    const drawH = finalH * scaleFactor;

    ctx.drawImage(imageRef.current, drawX, drawY, drawW, drawH);

    // Export high-quality dataUrl
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onConfirm(croppedDataUrl);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSaving) onClose();
      }}
      title={`Adjust & Position ${isAvatar ? 'Profile Photo' : 'Cover Photo'}`}
      maxWidth="md"
    >
      <div className="space-y-4 py-2 font-sans select-none">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 font-medium">
            <Move size={13} className="text-brand-500" />
            <span>Drag image to reposition &bull; Use slider to zoom</span>
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors cursor-pointer"
            title="Reset position and zoom"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>

        {/* Viewport Box */}
        <div
          ref={containerRef}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={handlePointerUp}
          className={`relative w-full h-72 sm:h-80 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing border border-slate-700/80 shadow-inner touch-none`}
        >
          {/* Rendered Image under transform */}
          {imageLoaded ? (
            <img
              src={imageSrc}
              alt="Adjustment preview"
              draggable={false}
              className="max-w-none pointer-events-none transition-transform duration-75 ease-out"
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                maxHeight: isAvatar ? '260px' : '220px',
                objectFit: 'contain',
              }}
            />
          ) : (
            <div className="flex items-center justify-center text-slate-400 text-xs">
              <RefreshCw size={18} className="animate-spin mr-2" />
              <span>Loading image preview...</span>
            </div>
          )}

          {/* Semi-transparent dark mask overlay with cutout guide */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
            {isAvatar ? (
              <div
                className="w-56 h-56 sm:w-64 sm:h-64 rounded-full border-2 border-white/90 ring-[999px] ring-slate-950/70 relative"
              >
                <div className="absolute inset-0 rounded-full border border-dashed border-white/40" />
              </div>
            ) : (
              <div
                className="w-[88%] sm:w-[92%] h-44 sm:h-48 rounded-xl border-2 border-white/90 ring-[999px] ring-slate-950/70 relative"
              >
                <div className="absolute inset-0 rounded-xl border border-dashed border-white/40" />
              </div>
            )}
          </div>
        </div>

        {/* Zoom Slider and Quick Controls */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, Number((z - 0.2).toFixed(2))))}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>

          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 accent-brand-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
          />

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, Number((z + 0.2).toFixed(2))))}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>

          <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 w-10 text-right">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Choose Another
          </button>

          <button
            type="button"
            disabled={isSaving || !imageLoaded}
            onClick={handleSaveCropped}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Saving Photo...</span>
              </>
            ) : (
              <>
                <Check size={15} />
                <span>Save & Keep Photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
