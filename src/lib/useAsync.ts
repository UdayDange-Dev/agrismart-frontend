import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';

export interface AsyncState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

/**
 * Runs an abortable request whenever `deps` (primitives only) change and ignores stale
 * responses. `loading` is derived from whether the stored result matches the current deps.
 */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: unknown[]): AsyncState<T> {
  const key = JSON.stringify(deps);
  const [result, setResult] = useState<{ key: string | null; data: T | null; error: ApiError | null }>({
    key: null,
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    fn(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setResult({ key, data, error: null });
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        const error = err instanceof ApiError ? err : new ApiError(0, 'unknown', 'Something went wrong.');
        setResult({ key, data: null, error });
      },
    );
    return () => controller.abort();
    // `fn` is intentionally excluded: callers pass an inline closure keyed by `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const loading = result.key !== key;
  return { data: loading ? null : result.data, error: loading ? null : result.error, loading };
}
