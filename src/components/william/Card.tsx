import React from 'react';
import { cn } from './cn';

/** Card — white surface, hairline border, no shadow (elevation = border). */
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-card border border-line bg-surface', className)} {...rest}>
      {children}
    </div>
  );
}
