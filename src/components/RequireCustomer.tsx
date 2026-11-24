import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { signInUrlFor } from '../lib/redirect';
import { Loading } from './Status';

/**
 * Sends signed-out visitors to /signin and back afterwards. This is navigation only:
 * the API enforces authentication and ownership on every request.
 */
export function RequireCustomer({ children }: { children: ReactNode }) {
  const { status, customer, signedOut } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Loading />;
  // After a deliberate sign-out the visitor goes home, even if the sign-out finished before the
  // navigation to "/" did (it runs as a transition and can be slower on small devices).
  if (!customer && signedOut) return <Navigate to="/" replace />;
  if (!customer) return <Navigate to={signInUrlFor(`${location.pathname}${location.search}`)} replace />;
  return <>{children}</>;
}
