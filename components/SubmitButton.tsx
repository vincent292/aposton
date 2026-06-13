'use client';

import { useFormStatus } from 'react-dom';

type SubmitButtonProps = {
  label: string;
  pendingLabel: string;
  className?: string;
  disabled?: boolean;
};

export function SubmitButton({
  label,
  pendingLabel,
  className = 'primary-btn',
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button type="submit" className={className} disabled={isDisabled}>
      {pending ? pendingLabel : label}
    </button>
  );
}
