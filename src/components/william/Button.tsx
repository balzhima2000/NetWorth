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
type Size = 'default' | 'toolbar';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  /** Pill shape (rounded-full) — used by toolbar/action buttons. Default is rounded-xl (Button master). */
  pill?: boolean;
  /**
   * Size. `default` = the generic Button master (42px, px-5, 15px semibold), used by modal CTAs etc.
   * `toolbar` = Portfolio header/action pills, sourced from Figma 358:146 / 372:143:
   * 38px tall, 16px horizontal pad, 6px gap, 14px Inter Medium label (pair with an 18px icon).
   */
  size?: Size;
}

const base =
  'inline-flex items-center justify-center whitespace-nowrap ' +
  'transition-[background-color,filter,color] duration-150 select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ' +
  'disabled:pointer-events-none';

// Size = height + horizontal pad + gap + label type. Toolbar values come straight
// from the Figma Portfolio toolbar instances (height unified to 38px per design call).
const sizes: Record<Size, string> = {
  default: 'h-[42px] px-5 gap-2 text-[15px] font-semibold',
  toolbar: 'h-[38px] px-4 gap-1.5 text-[14px] font-medium',
};

// State fills match the Figma Button masters:
// Primary: hover = surface-inverse-hover, pressed = darker; Secondary/Ghost:
// hover/pressed = surface-raised. Disabled = border fill / muted text.
const variants: Record<Variant, string> = {
  primary:
    'bg-inverse text-on-inverse hover:bg-inverse-hover active:brightness-90 disabled:bg-line disabled:text-muted',
  secondary:
    'bg-surface text-ink border border-line hover:bg-raised active:bg-raised disabled:text-muted disabled:bg-surface',
  ghost:
    'bg-transparent text-ink hover:bg-raised active:bg-raised disabled:text-muted',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', loading = false, pill = false, size = 'default', disabled, children, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, sizes[size], pill ? 'rounded-full' : 'rounded-xl', variants[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});
