import React from 'react';
import { ShieldCheck, Crown, Sparkles } from 'lucide-react';

interface VerificationBadgeProps {
  badge?: string | null;
  type?: string | null;
  isVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const GoldenBadge: React.FC<{
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ label = 'HookZ Founder', size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-sm px-3 py-1 gap-1.5',
  };
  const iconSizes = { sm: 11, md: 13, lg: 15 };

  return (
    <span
      className={`inline-flex items-center font-bold tracking-wide rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-xs border border-amber-300 dark:border-yellow-300 ring-1 ring-amber-400/40 select-none ${sizeClasses[size]} ${className}`}
      title={label}
    >
      <Crown size={iconSizes[size]} className="text-amber-950 fill-amber-900/30 shrink-0" />
      <span>{label}</span>
    </span>
  );
};

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
  const isGolden = text.toLowerCase().includes('founder') && text.toLowerCase().includes('hookz');
  if (isGolden) {
    return <GoldenBadge label={text} size={size} className={className} />;
  }

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
      className={`inline-flex items-center font-medium rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-900 ${sizeClasses[size]} ${className}`}
      title={text}
    >
      <ShieldCheck size={iconSizes[size]} className="text-brand-600 dark:text-brand-400 shrink-0" />
      <span>{text}</span>
    </span>
  );
};

export const RoleBadge: React.FC<{ role: string; className?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  role,
  className = '',
  size = 'md',
}) => {
  const getBadgeStyle = (r: string) => {
    const upper = (r || '').toUpperCase().trim();
    if (upper === 'FOUNDER') return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700';
    if (upper.includes('COFOUNDER') || upper.includes('CO-FOUNDER')) return 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border-brand-200 dark:border-brand-900';
    if (upper.includes('INVESTOR') || upper.includes('INVESTING')) return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    if (upper.includes('MENTOR') || upper.includes('ADVISOR')) return 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    if (upper.includes('DEVELOPER') || upper.includes('ENGINEER')) return 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800';
    if (upper.includes('DESIGNER')) return 'bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    if (upper.includes('MARKETER') || upper.includes('MARKETING') || upper.includes('GROWTH')) return 'bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    if (upper.includes('STUDENT')) return 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    if (upper.includes('OTHER')) return 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800';
    if (upper === 'ADMIN') return 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    return 'bg-slate-50 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded border ${sizeClasses[size]} ${getBadgeStyle(
        role
      )} ${className}`}
    >
      {role}
    </span>
  );
};
