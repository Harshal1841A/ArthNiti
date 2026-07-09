import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'gold' | 'outline' | 'ghost' | 'danger' | 'glow';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      default: 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 shadow-sm font-semibold',
      gold: 'bg-[#C9A961] text-black hover:bg-[#b89750] font-bold shadow-sm',
      outline: 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--text-secondary)] font-medium',
      ghost: 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] font-medium',
      danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm font-semibold',
      glow: 'bg-[#10B981] text-white hover:bg-[#10B981]/90 shadow-md shadow-[#10B981]/20 font-semibold',
    };

    const sizes = {
      default: 'h-10 px-4 py-2 text-sm rounded-lg',
      sm: 'h-8 px-3 text-xs rounded-md',
      lg: 'h-12 px-6 text-base rounded-lg',
      icon: 'h-9 w-9 rounded-lg flex items-center justify-center',
    };

    return (
      <button
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';
export { Button };
