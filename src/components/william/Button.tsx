import React from 'react';
import { cn } from './cn';
import { Spinner } from './Spinner';

/**
 * Button — ports the Figma Button set.
 * Variants: primary / secondary / ghost.
 * Interactive states (hover / pressed / focus / disabled) are handled
 * via CSS pseudo-classes; `loading` and `disabled` are props.
 *
 * Note: primary fill is mid-grey (color/surface-inverse → neutral/400),
 * which is the intentional design decision. Focus ring uses the neutral
 * accent (ink) rather than orange, since orange is reserved for negatives.
 */
type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl h-[42px] px-5 text-[15px] font-semibold ' +
  'transition-[background-color,filter,color] duration-150 select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ' +
  'disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  primary:
    'bg-inverse text-canvas hover:brightness-95 active:brightness-90 disabled:bg-raised disabled:text-muted',
  secondary:
    'bg-surface text-ink border border-line hover:bg-raised active:brightness-95 disabled:text-muted disabled:bg-surface',
  ghost:
    'bg-transparent text-ink hover:bg-raised active:brightness-95 disabled:text-muted',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', loading = false, disabled, children, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});
