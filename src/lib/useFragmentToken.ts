import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

const parse = (hash: string): string | null => {
  const value = new URLSearchParams(hash.replace(/^#/, '')).get('token');
  return value && TOKEN.test(value) ? value : null;
};

/**
 * Reads a one-time token from the URL fragment (`#token=...`) and then removes it from the
 * address bar, so it does not stay in browser history or get copied when the URL is shared.
 * Fragments are never sent to servers, so the token also never reaches access logs.
 *
 * `visit` increases every time a token appears in the fragment, including when a link is
 * opened again in the same tab (same-document navigation keeps the component mounted and
 * may reuse the same history key), so pages can reset their state for each visit.
 */
export function useFragmentToken(): { token: string | null; visit: number } {
  const location = useLocation();
  const navigate = useNavigate();
  const fromHash = parse(location.hash);
  const [state, setState] = useState(() => ({ token: fromHash, visit: 0, inHash: fromHash !== null }));

  if (fromHash && !state.inHash) setState({ token: fromHash, visit: state.visit + 1, inHash: true });
  else if (!fromHash && state.inHash) setState({ ...state, inHash: false });

  useEffect(() => {
    if (location.hash) navigate({ pathname: location.pathname, search: location.search }, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate]);

  return { token: fromHash ?? state.token, visit: fromHash && !state.inHash ? state.visit + 1 : state.visit };
}
