import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from './Icons';

const OPEN_DELAY = 80; // hover intent: avoid flicker when the pointer passes over
const CLOSE_DELAY = 220; // grace period to move the pointer from trigger into the panel

/**
 * Disclosure-style navigation dropdown / mega menu (WAI-ARIA disclosure pattern).
 *  - Mouse: opens on hover with small intent delays.
 *  - Touch/click: toggles on tap (hover alone is never required).
 *  - Keyboard: Enter/Space/ArrowDown open; ArrowUp/ArrowDown/Home/End move between links;
 *    Escape closes and returns focus to the trigger; moving focus out of the menu closes it.
 *  - Closes on outside click and on navigation.
 *  - With `to`, the label is a real link to that page (active-state highlight, works on tap and
 *    Enter) and a separate chevron button toggles the menu for touch and keyboard users.
 */
export function NavDropdown({
  label,
  to,
  icon,
  variant = 'menu',
  align = 'start',
  className,
  children,
}: {
  label: string;
  /** Page the label links to (split trigger). Without it the whole trigger is a toggle button. */
  to?: string;
  icon?: ReactNode;
  variant?: 'menu' | 'mega';
  align?: 'start' | 'end';
  className?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);
  // Set when hover opened the menu: the click that usually follows must not close it again.
  const hoverOpened = useRef(false);
  const location = useLocation();

  const clearTimer = () => window.clearTimeout(timer.current);
  const close = useCallback(() => {
    clearTimer();
    setOpen(false);
  }, []);
  // Passed to menu content (used only in click handlers); does not touch refs during render.
  const closeFromItem = useCallback(() => setOpen(false), []);
  /** Click/tap/Enter on the trigger. A menu just opened by hover stays open (pinned) instead of closing. */
  const toggle = () => {
    clearTimer();
    if (hoverOpened.current && open) {
      hoverOpened.current = false;
      return;
    }
    hoverOpened.current = false;
    setOpen((o) => !o);
  };
  const later = (fn: () => void, ms: number) => {
    clearTimer();
    timer.current = window.setTimeout(fn, ms);
  };

  // Close on navigation.
  const [lastPath, setLastPath] = useState(location.pathname + location.search);
  if (lastPath !== location.pathname + location.search) {
    setLastPath(location.pathname + location.search);
    if (open) setOpen(false);
  }

  // Close on outside pointer down.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  useEffect(() => () => clearTimer(), []);

  const links = () => Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-menu-item]') ?? []);
  const focusItem = (index: number) => {
    const items = links();
    if (items.length === 0) return;
    items[(index + items.length) % items.length]!.focus();
  };

  const onTriggerKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => focusItem(0));
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      close();
    }
  };

  const onPanelKey = (e: KeyboardEvent) => {
    const items = links();
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusItem(i + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusItem(i - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusItem(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusItem(items.length - 1);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`nav-dropdown nav-dropdown--${variant}${to ? ' nav-dropdown--split' : ''}${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse')
          later(() => {
            hoverOpened.current = true;
            setOpen(true);
          }, OPEN_DELAY);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') later(() => setOpen(false), CLOSE_DELAY);
      }}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      {to ? (
        <>
          <NavLink to={to} className="nav-link nav-dropdown__link" onKeyDown={onTriggerKey}>
            {icon}
            <span>{label}</span>
          </NavLink>
          <button
            ref={triggerRef}
            type="button"
            className="nav-dropdown__toggle"
            aria-label={`${label} menu`}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={toggle}
            onKeyDown={onTriggerKey}
          >
            <ChevronDown className="nav-dropdown__chevron" size={16} />
          </button>
        </>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          className="nav-link nav-dropdown__trigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
          onKeyDown={onTriggerKey}
        >
          {icon}
          <span>{label}</span>
          <ChevronDown className="nav-dropdown__chevron" size={16} />
        </button>
      )}
      <div id={panelId} className={`nav-dropdown__panel align-${align}`} onKeyDown={onPanelKey} data-open={open}>
        {children(closeFromItem)}
      </div>
    </div>
  );
}
