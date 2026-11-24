import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="empty card">
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/" className="btn">
        Go to home page
      </Link>
    </div>
  );
}
