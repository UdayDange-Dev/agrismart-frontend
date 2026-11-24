import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const LINKS = [
  { to: '/account', label: 'Profile' },
  { to: '/account/orders', label: 'Orders' },
  { to: '/account/inquiries', label: 'Inquiries & quotes' },
  { to: '/account/addresses', label: 'Addresses' },
];

/** Section navigation shared by the customer account pages. */
export function AccountNav() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <nav className="account-nav" aria-label="My account">
      <ul>
        {LINKS.map((l) => (
          <li key={l.to}>
            <NavLink to={l.to} end>
              {l.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-outline btn-small"
        onClick={async () => {
          navigate('/', { replace: true }); // before the route guard sees the signed-out state
          await signOut().catch(() => undefined);
        }}
      >
        Sign out
      </button>
    </nav>
  );
}
