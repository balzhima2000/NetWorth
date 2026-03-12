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
  primary:   'bg-[#5865f2] hover:bg-[#4752c4] active:bg-[#3d47b0] text-white border-transparent',
  secondary: 'bg-white/10 hover:bg-white/15 active:bg-white/20 text-white border-white/15',
  ghost:     'bg-transparent hover:bg-white/10 active:bg-white/15 text-white/70 hover:text-white border-transparent',
  danger:    'bg-[#ff4757]/20 hover:bg-[#ff4757]/30 active:bg-[#ff4757]/40 text-[#ff4757] border-[#ff4757]/30',
  success:   'bg-[#00d632]/20 hover:bg-[#00d632]/30 active:bg-[#00d632]/40 text-[#00d632] border-[#00d632]/30',
};

const sizeStyles: Record<ButtonSize, string> = {
  // sm stays compact — used for inline/toolbar contexts where space matters
  sm: 'px-3 py-2 text-xs gap-1.5 min-h-[36px]',
  // md and lg enforce 44px minimum touch target (WCAG 2.5.5)
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
          {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
}