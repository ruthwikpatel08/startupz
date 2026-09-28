import React, { useState } from 'react';
import { Rocket } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showDefaultLogo?: boolean;
}

const sizeClasses = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-11 h-11 text-xs',
  xl: 'w-14 h-14 text-sm',
  '2xl': 'w-24 h-24 sm:w-28 sm:h-28 text-2xl sm:text-3xl',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
  showDefaultLogo = false,
}) => {
  const [imgError, setImgError] = useState(false);

  const hasValidPhoto = Boolean(
    !imgError &&
    src &&
    typeof src === 'string' &&
    src.trim() !== '' &&
    !src.includes('dicebear.com') &&
    !src.includes('avataaars')
  );

  const cleanName = (name || 'Startup Builder').trim();
  const initials = cleanName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'SZ';

  const sizeCls = sizeClasses[size] || sizeClasses.md;

  if (hasValidPhoto) {
    return (
      <img
        src={src!}
        alt={cleanName}
        onError={() => setImgError(true)}
        className={`${sizeCls} rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-white ${className}`}
      />
    );
  }

  // Default logo badge / clean initials (No cartoon avatars)
  return (
    <div
      className={`${sizeCls} rounded-full bg-brand-600 text-white font-bold flex items-center justify-center shrink-0 border border-brand-500/30 select-none shadow-xs ${className}`}
      title={cleanName}
    >
      {showDefaultLogo && size === '2xl' ? (
        <div className="flex flex-col items-center justify-center">
          <Rocket className="w-8 h-8 mb-1 text-white" />
          <span className="text-xs font-semibold tracking-wider">{initials}</span>
        </div>
      ) : (
        initials
      )}
    </div>
  );
};
