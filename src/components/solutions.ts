/**
 * Agrismart's solution areas (marketing copy, not catalogue data). Products and prices always
 * come from ERPNext; these pages link into the live catalogue and the inquiry form.
 * Each solution has a page at /solutions/<id>; the homepage keeps #<id> anchors for its cards.
 *
 * `range` describes what the business stocks, summarised from the sub-groups of Agrismart's own
 * ERPNext Item Group tree ("Item Group.csv"). No specifications, certifications or results are
 * claimed. Images: public-domain USDA/NRCS photographs, see Frontend/IMAGE-CREDITS.md.
 */
export interface Solution {
  id: string;
  title: string;
  summary: string;
  /** What is in the range (from the Item Group tree). */
  range: string;
  image: string;
  widths: number[];
  alt: string;
  search: string;
  /**
   * Related top-level ERPNext Item Groups (exact names). Links are shown only for groups that
   * exist in the live catalogue; otherwise the page falls back to a product search.
   */
  categories: string[];
}

export const SOLUTIONS: Solution[] = [
  {
    id: 'irrigation',
    title: 'Irrigation & water management',
    summary: 'Drip and sprinkler components that put water where the roots are and cut waste in every season.',
    range:
      'Drip lines, drip tapes, emitters and drip kits; micro, mini and conventional sprinklers; filters, valves and fertigation equipment; PVC and HDPE pipes and fittings; irrigation controllers and sensors; and submersible and surface pumps to feed the system.',
    image: 'solution-irrigation',
    widths: [480, 800, 1600],
    alt: 'Irrigation sprinkler watering a green field',
    search: 'irrigation',
    categories: ['IRRIGATION', 'WATER PUMPS & MOTORS'],
  },
  {
    id: 'crop-nutrition',
    title: 'Soil health & crop nutrition',
    summary: 'Fertilisers and soil inputs matched to your crop stage, so nutrients reach the plant, not the drain.',
    range:
      'Straight, complex, water-soluble, micronutrient and speciality fertilizers; organic inputs such as vermicompost, seaweed extract, humic and amino acid products; bio-fertilizers; and plant growth regulators.',
    image: 'solution-soil',
    widths: [480, 800, 1600],
    alt: 'Hands holding healthy soil next to a spade',
    search: 'fertilizer',
    categories: ['CROP NUTRITION'],
  },
  {
    id: 'crop-protection',
    title: 'Crop protection',
    summary: 'Biological and chemical crop protection products, traps and lures, with help choosing what fits your crop.',
    range:
      'Biological products such as Trichoderma, Beauveria, Bacillus, Pseudomonas, NPV and neem-based formulations; insecticides, fungicides and herbicides; acaricides, nematicides and other speciality products; and sticky traps and lures. Always read and follow the product label.',
    image: 'cat-protection',
    widths: [480, 960, 1600],
    alt: 'A boom sprayer working a row crop',
    search: 'pesticide',
    categories: ['CROP PROTECTION'],
  },
  {
    id: 'seeds-nursery',
    title: 'Seeds & planting material',
    summary: 'Quality seeds and planting material for strong, uniform germination and healthy young plants.',
    range:
      'Vegetable, field crop, oilseed, pulse, cereal, fodder, fruit, flower and lawn seeds, together with tissue culture plants, vegetable and fruit seedlings, grafted fruit plants, and ornamental, forestry and medicinal plants.',
    image: 'solution-seedlings',
    widths: [480, 800, 1600],
    alt: 'Young seedlings growing in a greenhouse',
    search: 'seed',
    categories: ['SEEDS', 'PLANTING MATERIAL'],
  },
  {
    id: 'protected-agriculture',
    title: 'Greenhouse & protected agriculture',
    summary: 'Mulch, nets, films and covers for growing under protection and keeping crops sheltered.',
    range:
      'Mulch film and weed mats, crop and fruit covers, shade, insect, bird and hail nets, greenhouse film, pond liners, grow bags and spares.',
    image: 'cat-protected',
    widths: [480, 960, 1600],
    alt: 'Vegetables growing in a high tunnel with drip lines',
    search: 'net',
    categories: ['PROTECTED AGRICULTURE'],
  },
  {
    id: 'farm-equipment',
    title: 'Farm equipment & supplies',
    summary: 'Sprayers, tools and machines, with the hardware and electrical supplies that keep a farm running.',
    range:
      'Manual, battery and power sprayers with spares; weeders, cutters, harvesting tools, tillers and hand tools; safety gear; G.I., brass and M.S. fittings and fasteners; cables, motor starters and control panels; solar products; and garden pots and watering cans.',
    image: 'cat-equipment',
    widths: [480, 960, 1600],
    alt: 'A tractor with a row planter in a green field',
    search: 'sprayer',
    categories: ['EQUIPMENTS', 'HARDWARE', 'ELECTRICAL & CONTROL', 'SOLAR', 'GARDENING & LANDSCAPING'],
  },
  {
    id: 'agronomy-support',
    title: 'Agronomy support',
    summary: 'Talk to our team about crop plans, input selection and bulk requirements before you order.',
    range:
      'Tell us your crop, acreage and timeline in an inquiry and our team will help you choose inputs across the whole range. We usually reply within one working day.',
    image: 'solution-advisory',
    widths: [480, 800, 1600],
    alt: 'Agronomists inspecting a maize crop in the field',
    search: '',
    categories: [],
  },
];

export const solutionUrl = (id: string) => `/solutions/${id}`;
export const findSolution = (id: string | undefined) => SOLUTIONS.find((s) => s.id === id);

/** srcset helper for the bundled responsive images in /public/images. */
export const srcSet = (name: string, widths: number[]) => widths.map((w) => `/images/${name}-${w}.webp ${w}w`).join(', ');
