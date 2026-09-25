import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface VerificationBadgeProps {
  badge?: string | null;
  type?: string | null;
  isVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  badge,
  type,
  isVerified,
  size = 'md',
  className = '',
}) => {
  const badgeText = badge || type;
  if (!isVerified && !badgeText) return null;

  const text = badgeText || 'Verified';
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-0.5 gap-1.5',
    lg: 'text-sm px-2.5 py-1 gap-1.5',
  };

  const iconSizes = {
    sm: 11,
    md: 13,
    lg: 15,
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 shadow-xs ${sizeClasses[size]} ${className}`}
      title={text}
    >
      <ShieldCheck size={iconSizes[size]} className="text-brand-500 shrink-0" />
      <span>{text}</span>
    </span>
  );
};

export const RoleBadge: React.FC<{ role: string; className?: string }> = ({ role, className = '' }) => {
  const getBadgeStyle = (r: string) => {
    switch (r?.toUpperCase()) {
      case 'FOUNDER':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'COFOUNDER':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'INVESTOR':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'MENTOR':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'DEVELOPER':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'DESIGNER':
        return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20';
      case 'MARKETER':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      case 'ADMIN':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${getBadgeStyle(
        role
      )} ${className}`}
    >
      {role}
    </span>
  );
};
