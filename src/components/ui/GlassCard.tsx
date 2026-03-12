import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

// Responsive padding — slightly tighter on mobile, full spacing on sm+
const paddingMap = {
  none: '',
  sm:   'p-4',
  md:   'p-4 sm:p-5',
  lg:   'p-5 sm:p-6',
};

export function GlassCard({
  children,
  className = '',
  onClick,
  hover = false,
  padding = 'md',
}: GlassCardProps) {
  return (
    <div
      className={`
        glass rounded-2xl
        ${paddingMap[padding]}
        ${hover || onClick ? 'hover:bg-white/[0.07] active:bg-white/[0.09] active:scale-[0.99] transition-all duration-150 cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}