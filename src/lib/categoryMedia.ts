/**
 * Presentation data for Agrismart's top-level ERPNext Item Groups: a photograph, a one-line
 * description and the mega-menu column. Category names, counts and products always come from the
 * live API; this file only decorates groups that exist there (unknown groups get a fallback).
 *
 * The descriptions summarise the sub-groups in Agrismart's own Item Group tree (exported as
 * "Item Group.csv"), so they describe the range the business stocks, not product claims.
 * Photos: public-domain USDA images, see Frontend/IMAGE-CREDITS.md.
 */

export interface CategoryMedia {
  /** Base name of the responsive images in /public/images (`<image>-480.webp`, ...). */
  image: string;
  widths: number[];
  alt: string;
  blurb: string;
  /** Mega-menu column. */
  group: 'crop' | 'water' | 'farm';
}

const MEDIA: Record<string, CategoryMedia> = {
  'CROP NUTRITION': {
    image: 'solution-soil',
    widths: [480, 800, 1600],
    alt: 'Hands holding healthy soil next to a spade',
    blurb: 'Chemical, organic and bio-fertilizers, micronutrients and plant growth regulators.',
    group: 'crop',
  },
  'CROP PROTECTION': {
    image: 'cat-protection',
    widths: [480, 960, 1600],
    alt: 'A boom sprayer working a row crop',
    blurb: 'Bio-pesticides, chemical pesticides, traps and lures, and speciality products.',
    group: 'crop',
  },
  SEEDS: {
    image: 'cat-seeds',
    widths: [480, 960, 1600],
    alt: 'Ripe wheat ears in a field',
    blurb: 'Vegetable, field crop, oilseed, pulse, cereal, fodder, fruit and flower seeds.',
    group: 'crop',
  },
  'PLANTING MATERIAL': {
    image: 'solution-seedlings',
    widths: [480, 800, 1600],
    alt: 'Young seedlings growing in a greenhouse',
    blurb: 'Tissue culture plants, seedlings, grafted fruit plants and ornamental plants.',
    group: 'crop',
  },
  IRRIGATION: {
    image: 'solution-irrigation',
    widths: [480, 800, 1600],
    alt: 'Sprinklers watering a green field',
    blurb: 'Drip and sprinkler irrigation, PVC and HDPE piping, plumbing and irrigation automation.',
    group: 'water',
  },
  'WATER PUMPS & MOTORS': {
    image: 'cat-pumps',
    widths: [480, 960, 1600],
    alt: 'An irrigation pump and pipeline over a canal',
    blurb: 'Submersible and surface motor pumps, with spares and accessories.',
    group: 'water',
  },
  SOLAR: {
    image: 'cat-solar',
    widths: [480, 960, 1600],
    alt: 'Rows of solar panels on a farm',
    blurb: 'Solar products for the farm, including solar lighting.',
    group: 'water',
  },
  'PROTECTED AGRICULTURE': {
    image: 'cat-protected',
    widths: [480, 960, 1600],
    alt: 'Vegetables growing in a high tunnel with drip lines',
    blurb: 'Mulch, shade, insect, bird and hail nets, greenhouse film, crop covers and grow bags.',
    group: 'farm',
  },
  EQUIPMENTS: {
    image: 'cat-equipment',
    widths: [480, 960, 1600],
    alt: 'A tractor with a row planter in a green field',
    blurb: 'Sprayers, weeders, cutting, harvesting and cultivation machines, safety gear and hand tools.',
    group: 'farm',
  },
  HARDWARE: {
    image: 'cat-hardware',
    widths: [480, 960, 1600],
    alt: 'A pipeline valve and fittings in an orchard',
    blurb: 'G.I., stainless steel, brass, C.I. and M.S. fittings, fasteners and tools.',
    group: 'farm',
  },
  'ELECTRICAL & CONTROL': {
    image: 'cat-electrical',
    widths: [480, 960, 1600],
    alt: 'Electrical control units mounted in a farm building',
    blurb: 'Cables and wires, motor starters and controllers, components and control panels.',
    group: 'farm',
  },
  'GARDENING & LANDSCAPING': {
    image: 'cat-garden',
    widths: [480, 960, 1600],
    alt: 'A raised garden bed with lettuce and a drip line',
    blurb: 'Pots, watering cans and garden showers.',
    group: 'farm',
  },
};

const FALLBACK: CategoryMedia = {
  image: 'band-field',
  widths: [960],
  alt: 'A green wheat field',
  blurb: '',
  group: 'farm',
};

/** Media for a top-level group (matched case-insensitively by its exact ERPNext name). */
export function categoryMedia(name: string): CategoryMedia & { known: boolean } {
  const m = MEDIA[name.trim().toUpperCase()];
  return m ? { ...m, known: true } : { ...FALLBACK, known: false };
}

export const NAV_GROUPS: { id: CategoryMedia['group']; title: string }[] = [
  { id: 'crop', title: 'Crop care' },
  { id: 'water', title: 'Water & energy' },
  { id: 'farm', title: 'Farm infrastructure' },
];

/** srcset for a category image. */
export const mediaSrcSet = (m: Pick<CategoryMedia, 'image' | 'widths'>) =>
  m.widths.map((w) => `/images/${m.image}-${w}.webp ${w}w`).join(', ');
export const mediaSrc = (m: Pick<CategoryMedia, 'image' | 'widths'>) => `/images/${m.image}-${m.widths[0]}.webp`;
