import React, { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (isOpen) {
      const dialog = dialogRef.current;
      const previousFocus = document.activeElement as HTMLElement | null;
      dialog?.showModal();
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        dialog?.close();
        document.body.style.overflow = previousOverflow;
        if (previousFocus?.isConnected) previousFocus.focus();
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  const modalElement = (
    <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="m-auto p-4 sm:p-6 bg-transparent text-inherit border-0 w-full max-w-none max-h-none backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm">

      {/* Modal Dialog */}
      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-white dark:bg-dark-900 rounded-2xl shadow-modal border border-slate-200 dark:border-slate-800 p-6 z-10 animate-fade-in mx-auto max-h-[85dvh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200 dark:border-slate-800">
          <h3 id={titleId} className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </dialog>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalElement, document.body)
    : modalElement;
};
