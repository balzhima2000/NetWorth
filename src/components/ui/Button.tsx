import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  // Primary — lime green accent
  primary:
    'bg-[#D6F377] hover:bg-[#C6E363] active:bg-[#B8DC4A] text-[#1f1f1f] border-transparent ' +
    'shadow-none',
  // Secondary — slightly elevated surface, refined border
  secondary:
    'bg-white/[0.07] hover:bg-white/[0.11] active:bg-white/[0.15] text-white border-white/[0.10]',
  // Ghost — transparent, low-key
  ghost:
    'bg-transparent hover:bg-white/[0.07] active:bg-white/[0.11] text-white/60 hover:text-white border-transparent',
  // Danger — muted orange tint
  danger:
    'bg-[#F39377]/15 hover:bg-[#F39377]/25 active:bg-[#F39377]/35 text-[#F39377] border-[#F39377]/25',
  // Success — positive lime tint
  success:
    'bg-[#D6F377]/15 hover:bg-[#D6F377]/25 active:bg-[#D6F377]/35 text-[#D6F377] border-[#D6F377]/25',
};

const sizeStyles: Record<ButtonSize, string> = {
  // sm — compact, for toolbars and inline contexts
  sm: 'px-3 py-2 text-xs gap-1.5 min-h-[36px]',
  // md + lg — 44px touch target (WCAG 2.5.5)
  md: 'px-4 py-2.5 text-sm gap-2 min-h-[44px]',
  lg: 'px-6 py-3 text-base gap-2.5 min-h-[44px]',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium rounded-xl border
        transition-all duration-150 select-none
        active:scale-[0.96]
        disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6F377]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#000000]
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <>
          {icon && iconPosition === 'left'  && <span className="flex-shrink-0">{icon}</span>}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
}
