import React from 'react';

interface RupeeLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
  sublabel?: string;
}

export const RupeeLoader: React.FC<RupeeLoaderProps> = ({
  size = 'md',
  className = '',
  label,
  sublabel,
}) => {
  const sizeConfig = {
    sm: {
      wrapper: 'h-4 w-4',
      symbol: 'text-[11px]',
      border: 'border',
    },
    md: {
      wrapper: 'h-6 w-6',
      symbol: 'text-xs',
      border: 'border-2',
    },
    lg: {
      wrapper: 'h-10 w-10',
      symbol: 'text-lg',
      border: 'border-2',
    },
    xl: {
      wrapper: 'h-14 w-14',
      symbol: 'text-2xl',
      border: 'border-[2.5px]',
    },
  }[size];

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Outer rotating orbital ring */}
        <div
          className={`absolute inset-0 rounded-full ${sizeConfig.border} border-t-[var(--accent)] border-r-[var(--accent)]/40 border-b-transparent border-l-transparent animate-spin`}
          style={{ animationDuration: '1.2s' }}
        />
        {/* Inner reverse rotating subtle ring for depth on lg/xl sizes */}
        {(size === 'lg' || size === 'xl') && (
          <div
            className="absolute inset-1 rounded-full border border-[var(--accent)]/30 border-b-[var(--accent)] border-t-transparent animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '2s' }}
          />
        )}
        {/* Center glowing ₹ emblem */}
        <div
          className={`${sizeConfig.wrapper} rounded-full flex items-center justify-center bg-[var(--accent)]/10 text-[var(--accent)] font-serif font-bold shadow-[0_0_15px_rgba(212,175,55,0.25)]`}
        >
          <span className={`${sizeConfig.symbol} leading-none select-none font-extrabold animate-pulse`}>
            ₹
          </span>
        </div>
      </div>
      {label && (
        <span className="mt-3 text-sm font-mono uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
          {label}
        </span>
      )}
      {sublabel && (
        <span className="mt-1 text-xs font-sans text-[var(--text-secondary)]/70">
          {sublabel}
        </span>
      )}
    </div>
  );
};
