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
      default: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20',
      gold: 'bg-amber-500 text-slate-900 hover:bg-amber-600 font-semibold shadow-lg shadow-amber-500/20',
      outline: 'border border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700 hover:border-slate-500',
      ghost: 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200',
      danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20',
      glow: 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50',
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
          'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:pointer-events-none disabled:opacity-50',
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
