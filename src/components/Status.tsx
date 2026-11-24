import type { ReactNode } from 'react';
import type { ApiError } from '../api/client';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="status" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorNotice({ error, children }: { error: ApiError | Error; children?: ReactNode }) {
  const requestId = (error as ApiError).requestId;
  return (
    <div className="notice notice-error" role="alert">
      <p>{error.message}</p>
      {requestId ? <p className="muted small">Reference: {requestId}</p> : null}
      {children}
    </div>
  );
}

export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className={error ? 'field has-error' : 'field'}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error ? (
        <small id={`${id}-hint`} className="muted">
          {hint}
        </small>
      ) : null}
      {error ? (
        <small id={`${id}-error`} className="field-error" role="alert">
          {error}
        </small>
      ) : null}
    </div>
  );
}
