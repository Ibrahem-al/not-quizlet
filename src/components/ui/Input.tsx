import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    const base =
      'w-full rounded-[var(--radius-button)] border border-[var(--color-text-secondary)]/30 bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent';

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-[var(--color-text)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`${base} ${error ? 'border-[var(--color-danger)]' : ''} ${className}`}
          {...props}
        />
        {error && (
          <span className="text-sm text-[var(--color-danger)]">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
