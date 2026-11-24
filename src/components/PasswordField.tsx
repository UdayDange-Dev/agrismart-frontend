import { useId, useState } from 'react';
import { Field } from './Status';

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  hint?: string;
  autoComplete: 'current-password' | 'new-password';
}

/** Password input with an accessible show/hide toggle. */
export function PasswordField({ id, label, value, onChange, error, hint, autoComplete }: Props) {
  const [visible, setVisible] = useState(false);
  const toggleId = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <div className="password-field">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          maxLength={128}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          spellCheck={false}
          autoCapitalize="off"
        />
        <button
          id={toggleId}
          type="button"
          className="password-toggle"
          aria-controls={id}
          aria-pressed={visible}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </Field>
  );
}
