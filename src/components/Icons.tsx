import type { SVGProps } from 'react';

/**
 * Original line icons drawn for Agrismart (24×24, 1.75 stroke, currentColor).
 * Decorative by default (aria-hidden); pass `title` for a meaningful standalone icon.
 */
type IconProps = SVGProps<SVGSVGElement> & { title?: string; size?: number };

function Svg({ title, size = 20, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const ChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
export const ArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
export const ArrowUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Svg>
);
export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Svg>
);
export const CartIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.2" />
    <circle cx="9.5" cy="19.5" r="1.3" />
    <circle cx="17" cy="19.5" r="1.3" />
  </Svg>
);
export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
  </Svg>
);
export const MenuIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </Svg>
);
export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const PhoneIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.6 3.5h2.5l1.4 4-2 1.3a11 11 0 0 0 6.7 6.7l1.3-2 4 1.4v2.5a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" />
  </Svg>
);
export const MailIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m4 7 8 6 8-6" />
  </Svg>
);
export const LeafIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z" />
    <path d="M5 19c3-4 6-6.5 9.5-8.5" />
  </Svg>
);
export const DropIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5c3.5 4.2 6 7.6 6 10.6a6 6 0 0 1-12 0c0-3 2.5-6.4 6-10.6Z" />
    <path d="M9.2 14.5a3 3 0 0 0 2.8 2.7" />
  </Svg>
);
export const SproutIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21v-9" />
    <path d="M12 12c0-4-2.5-6.5-7-6.5 0 4.2 2.7 6.5 7 6.5Z" />
    <path d="M12 14c0-3.6 2.4-6 6.5-6 0 3.8-2.5 6-6.5 6Z" />
    <path d="M7 21h10" />
  </Svg>
);
export const FlaskIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 3.5h6M10 3.5v5.2L4.8 17.5A2 2 0 0 0 6.5 20.5h11a2 2 0 0 0 1.7-3L14 8.7V3.5" />
    <path d="M7.5 14.5h9" />
  </Svg>
);
export const ToolIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5Z" />
    <path d="M14.5 6.5 17 4l3 3-2.5 2.5" />
    <path d="M4 20l3-3" />
  </Svg>
);
export const ShieldIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 19 6v5.5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-2.5Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </Svg>
);
export const TagIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.1 6.1a1.5 1.5 0 0 1-2.1 0Z" />
    <circle cx="8" cy="8" r="1.4" />
  </Svg>
);
export const HeadsetIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2" />
    <rect x="3.5" y="13" width="4" height="6" rx="1.5" />
    <rect x="16.5" y="13" width="4" height="6" rx="1.5" />
    <path d="M18.5 19c0 1.4-1.5 2-3.5 2h-2" />
  </Svg>
);
export const ClipboardIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="4.5" width="14" height="16.5" rx="2" />
    <path d="M9 4.5V3h6v1.5M8.5 12l2.3 2.3 4.7-4.6" />
  </Svg>
);
export const TruckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6.5h11v9H3zM14 9.5h4l3 3v3h-7" />
    <circle cx="7" cy="17.5" r="1.7" />
    <circle cx="17.5" cy="17.5" r="1.7" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12.5 4.2 4.2L19 7" />
  </Svg>
);
export const SunIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </Svg>
);
export const BoltIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8Z" />
  </Svg>
);
export const GreenhouseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 20.5V11a9 9 0 0 1 18 0v9.5H3Z" />
    <path d="M12 2.5v18M3 13h18M7.5 4.2V20.5M16.5 4.2V20.5" />
  </Svg>
);
export const WrenchIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.7 6.3a4 4 0 0 0 5 5L21 12.6a6 6 0 0 1-7.7 1.1L6 21l-3-3 7.3-7.3A6 6 0 0 1 11.4 3l1.3 1.3a4 4 0 0 0 2 2Z" />
  </Svg>
);

const CATEGORY_ICONS: [RegExp, (p: IconProps) => React.ReactElement][] = [
  [/crop protect|pestic|fungic|insectic|herbic|trap/i, ShieldIcon],
  [/protected agri|greenhouse|shade net|mulch/i, GreenhouseIcon],
  [/solar/i, SunIcon],
  [/electric|cable|starter|control/i, BoltIcon],
  [/hardware|fitting|valve/i, WrenchIcon],
  [/irrig|drip|sprinkl|pipe|water|pump/i, DropIcon],
  [/seed|plant|nursery|sapling|garden/i, SproutIcon],
  [/fertil|nutri|manure|compost|chemical|bio/i, FlaskIcon],
  [/tool|equip|machin|spray|kit|implement/i, ToolIcon],
];

/** Picks an icon for an ERPNext item group by keyword; falls back to a leaf. */
export function CategoryIcon({ name, ...p }: IconProps & { name: string }) {
  const Icon = CATEGORY_ICONS.find(([re]) => re.test(name))?.[1] ?? LeafIcon;
  return <Icon {...p} />;
}
