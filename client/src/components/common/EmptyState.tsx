import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  actionLabel,
  actionHref,
  onAction,
}) => {
  const label = actionText || actionLabel;

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 shadow-subtle">
      <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-3 border border-slate-200 dark:border-slate-700">
        <Icon size={18} />
      </div>
      <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mb-1">{title}</h4>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-5 leading-relaxed">
        {description}
      </p>
      {label && (
        actionHref ? (
          <Link
            to={actionHref}
            className="btn-primary"
          >
            {label}
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="btn-primary"
          >
            {label}
          </button>
        )
      )}
    </div>
  );
};
