import React from 'react';
import { cn } from './cn';

/** Chip — Style {Neutral / Outline / Inverse}. */
type ChipStyle = 'neutral' | 'outline' | 'inverse';

const styles: Record<ChipStyle, string> = {
  neutral: 'bg-raised text-ink',
  outline: 'border border-line text-ink',
  inverse: 'bg-ink text-canvas',
};

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipStyle;
}

export function Chip({ variant = 'neutral', children, className, ...rest }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-[13px] font-medium',
        styles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
