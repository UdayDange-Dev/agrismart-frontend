import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, type Quote } from '../api/client';
import { ErrorNotice, Loading } from '../components/Status';
import { useAuth } from '../lib/auth';
import { MAX_QTY, useCart } from '../lib/cart';
import { formatMoney } from '../lib/format';
import { rememberReturnPath, signInUrlFor, signUpUrlFor } from '../lib/redirect';

interface Problem {
  itemCode: string;
  reason: string;
}

const REASONS: Record<string, string> = {
  not_available: 'This product is no longer available.',
  price_unavailable: 'This product has no current price. Please send an inquiry instead.',
  quantity_too_large: 'Quantity is too large for an online order.',
};

/** Server-priced quote for the current cart lines. */
interface QuoteResult {
  key: string;
  quote: Quote | null;
  problems: Problem[];
  error: ApiError | null;
}

export function useQuote() {
  const { lines } = useCart();
  const key = JSON.stringify(lines);
  const [result, setResult] = useState<QuoteResult | null>(null);

  useEffect(() => {
    if (lines.length === 0) return;
    let active = true;
    const timer = setTimeout(() => {
      api.quote(lines).then(
        (quote) => {
          if (active) setResult({ key, quote, problems: [], error: null });
        },
        (err: unknown) => {
          if (!active) return;
          const apiErr = err instanceof ApiError ? err : new ApiError(0, 'unknown', 'Could not price your cart.');
          const items = (apiErr.details as { items?: Problem[] } | undefined)?.items;
          setResult({
            key,
            quote: null,
            problems: apiErr.status === 422 && Array.isArray(items) ? items : [],
            error: apiErr.status === 422 ? null : apiErr,
          });
        },
      );
    }, 250); // debounce quantity edits
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // `lines` is fully represented by `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = lines.length > 0 && result?.key === key ? result : null;
  return {
    lines,
    quote: current?.quote ?? null,
    problems: current?.problems ?? [],
    error: current?.error ?? null,
    loading: lines.length > 0 && !current,
  };
}

export function CartPage() {
  const { setQty, remove } = useCart();
  const { customer } = useAuth();
  const { lines, quote, problems, error, loading } = useQuote();

  if (lines.length === 0) {
    return (
      <div className="empty card">
        <h1>Your cart is empty</h1>
        <p>
          <Link to="/products" className="btn">
            Browse products
          </Link>
        </p>
      </div>
    );
  }

  const byCode = new Map(quote?.lines.map((l) => [l.itemCode, l]));
  const problemByCode = new Map(problems.map((p) => [p.itemCode, p.reason]));

  return (
    <div>
      <h1>Your cart</h1>
      {error ? <ErrorNotice error={error} /> : null}
      {problems.length > 0 ? (
        <div className="notice notice-warning" role="alert">
          Some items can’t be ordered online right now. Remove them to continue.
        </div>
      ) : null}
      <div className="cart-layout">
        <ul className="cart-lines">
          {lines.map((line) => {
            const priced = byCode.get(line.itemCode);
            const reason = problemByCode.get(line.itemCode);
            return (
              <li key={line.itemCode} className="card cart-line">
                <div>
                  <Link to={`/products/${encodeURIComponent(line.itemCode)}`}>
                    <strong>{priced?.name ?? line.itemCode}</strong>
                  </Link>
                  {priced ? (
                    <p className="muted small">
                      {formatMoney(priced.unitPrice, quote!.currency)} per {priced.uom}
                    </p>
                  ) : null}
                  {reason ? <p className="field-error">{REASONS[reason] ?? 'This item cannot be ordered.'}</p> : null}
                </div>
                <div className="cart-line-controls">
                  <label htmlFor={`qty-${line.itemCode}`} className="visually-hidden">
                    Quantity
                  </label>
                  <input
                    id={`qty-${line.itemCode}`}
                    type="number"
                    min={1}
                    max={MAX_QTY}
                    value={line.qty}
                    onChange={(e) => setQty(line.itemCode, Number(e.target.value))}
                  />
                  <span className="line-total">{priced ? formatMoney(priced.lineTotal, quote!.currency) : '—'}</span>
                  <button className="link-button" onClick={() => remove(line.itemCode)}>
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <aside className="card summary" aria-live="polite">
          <h2>Summary</h2>
          {loading ? <Loading label="Updating prices…" /> : null}
          {quote ? (
            <>
              <p className="summary-row">
                <span>Items</span>
                <span>{quote.itemCount}</span>
              </p>
              <p className="summary-row total">
                <span>Subtotal (MRP)</span>
                <span>{formatMoney(quote.subtotal, quote.currency)}</span>
              </p>
              <p className="muted small">Taxes and delivery are confirmed by our team before payment.</p>
              {customer ? (
                <Link to="/checkout" className="btn btn-block">
                  Proceed to checkout
                </Link>
              ) : (
                <>
                  <Link to={signInUrlFor('/checkout')} className="btn btn-block">
                    Sign in to check out
                  </Link>
                  <Link to={signUpUrlFor('/checkout')} className="btn btn-outline btn-block" onClick={() => rememberReturnPath('/checkout')}>
                    Create account
                  </Link>
                  <p className="muted small">Your cart stays saved on this device while you sign in.</p>
                </>
              )}
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
