import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * The cart stores ONLY item codes and quantities. Names and prices always come from the
 * server (`/api/cart/quote`), so a tampered localStorage entry cannot change what is charged.
 */
export interface CartLine {
  itemCode: string;
  qty: number;
}

export const CART_KEY = 'agrismart.cart.v1';
export const MAX_QTY = 1000;
export const MAX_LINES = 50;
const ITEM_CODE = /^[\p{L}\p{N}][\p{L}\p{N} ._\-/()&+#]{0,139}$/u;

/** Parse untrusted stored data defensively; anything unexpected is dropped. */
export function sanitizeCart(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const merged = new Map<string, number>();
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const { itemCode, qty } = entry as Record<string, unknown>;
    if (typeof itemCode !== 'string' || !ITEM_CODE.test(itemCode)) continue;
    if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1) continue;
    merged.set(itemCode, Math.min(MAX_QTY, (merged.get(itemCode) ?? 0) + qty));
  }
  return [...merged].slice(0, MAX_LINES).map(([itemCode, qty]) => ({ itemCode, qty }));
}

function readStored(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    return raw ? sanitizeCart(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  add(itemCode: string, qty?: number): void;
  setQty(itemCode: string, qty: number): void;
  remove(itemCode: string): void;
  clear(): void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readStored);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      // storage unavailable (private mode / quota); cart still works for this page view
    }
  }, [lines]);

  const add = useCallback((itemCode: string, qty = 1) => {
    setLines((prev) => sanitizeCart([...prev, { itemCode, qty }]));
  }, []);
  const setQty = useCallback((itemCode: string, qty: number) => {
    setLines((prev) =>
      prev.map((l) => (l.itemCode === itemCode ? { ...l, qty: Math.max(1, Math.min(MAX_QTY, Math.floor(qty) || 1)) } : l)),
    );
  }, []);
  const remove = useCallback((itemCode: string) => setLines((prev) => prev.filter((l) => l.itemCode !== itemCode)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, count: lines.reduce((n, l) => n + l.qty, 0), add, setQty, remove, clear }),
    [lines, add, setQty, remove, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
