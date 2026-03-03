import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import {
  validatePassword,
  getStrengthLabel,
  calculateStrengthPercentage,
  type PasswordValidationResult,
} from '../../lib/passwordValidation';

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

export function PasswordStrength({ password, showRequirements = true }: PasswordStrengthProps) {
  const { t } = useTranslation();

  if (!password) {
    return (
      <div className="space-y-2">
        <div className="h-2 w-full bg-[var(--color-surface-muted)] rounded-full overflow-hidden">
          <div className="h-full w-0 bg-[var(--color-danger)]" />
        </div>
        <p className="text-sm text-[var(--color-text-tertiary)]">
          Enter a password to see strength
        </p>
      </div>
    );
  }

  const validation = validatePassword(password);
  const percentage = calculateStrengthPercentage(password);
  const strengthLabel = getStrengthLabel(validation.strength);

  const getStrengthColor = () => {
    switch (validation.strength) {
      case 'strong':
        return 'var(--color-success)';
      case 'medium':
        return 'var(--color-warning)';
      case 'weak':
      default:
        return 'var(--color-danger)';
    }
  };

  const requirementLabels: Record<string, string> = {
    min_length: t('passwordMinLength'),
    uppercase: t('passwordNeedsUppercase'),
    lowercase: t('passwordNeedsLowercase'),
    number: t('passwordNeedsNumber'),
    special: t('passwordNeedsSpecial'),
  };

  return (
    <div className="space-y-3">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--color-text)]">
            {t('passwordRequirements')}
          </span>
          <span
            className="text-sm font-medium"
            style={{ color: getStrengthColor() }}
          >
            {strengthLabel}
          </span>
        </div>
        <div className="h-2 w-full bg-[var(--color-surface-muted)] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: getStrengthColor() }}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <ul className="space-y-1.5">
          {validation.requirements.map((req) => (
            <li
              key={req.requirement}
              className="flex items-center gap-2 text-sm"
            >
              {req.met ? (
                <Check className="w-4 h-4 text-[var(--color-success)]" />
              ) : (
                <X className="w-4 h-4 text-[var(--color-danger)]" />
              )}
              <span
                className={
                  req.met
                    ? 'text-[var(--color-text-secondary)]'
                    : 'text-[var(--color-text-tertiary)]'
                }
              >
                {requirementLabels[req.requirement] || req.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface PasswordMatchIndicatorProps {
  password: string;
  confirmPassword: string;
}

export function PasswordMatchIndicator({
  password,
  confirmPassword,
}: PasswordMatchIndicatorProps) {
  const { t } = useTranslation();

  if (!confirmPassword) return null;

  const matches = password === confirmPassword;

  return (
    <div className="flex items-center gap-2 text-sm">
      {matches ? (
        <>
          <Check className="w-4 h-4 text-[var(--color-success)]" />
          <span className="text-[var(--color-success)]">
            {t('passwordsMatch') || 'Passwords match'}
          </span>
        </>
      ) : (
        <>
          <X className="w-4 h-4 text-[var(--color-danger)]" />
          <span className="text-[var(--color-danger)]">
            {t('passwordsDontMatch')}
          </span>
        </>
      )}
    </div>
  );
}

export { validatePassword, type PasswordValidationResult };
