import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, icon, className = '', ...props }, ref) => {
    const base =
      'w-full rounded-[var(--radius-button)] border bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-[3px] focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all duration-[var(--duration-fast)]';
    
    const sizeClasses = icon ? 'pl-10 pr-3 py-2.5' : 'px-3 py-2.5';
    
    const stateClasses = error
      ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]/20 focus:border-[var(--color-danger)]'
      : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]';

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-[var(--color-text)]">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`${base} ${sizeClasses} ${stateClasses} ${className}`}
            {...props}
          />
        </div>
        {error ? (
          <span className="text-sm text-[var(--color-danger)] font-medium">{error}</span>
        ) : helper ? (
          <span className="text-sm text-[var(--color-text-secondary)]">{helper}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
