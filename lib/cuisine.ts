/** A single cuisine pairing stored on a recipe: a broad region + a specific style. */
export type CuisinePairing = { region: string; style: string };

/** All supported regions with their selectable cooking styles (adjective form). */
export const CUISINE_REGIONS = [
  {
    region: "East Asian",
    styles: ["Chinese", "Japanese", "Korean", "Taiwanese"],
  },
  {
    region: "Southeast Asian",
    styles: ["Thai", "Vietnamese", "Indonesian", "Filipino", "Malaysian"],
  },
  {
    region: "South Asian",
    styles: ["Indian", "Pakistani", "Bangladeshi", "Sri Lankan"],
  },
  {
    region: "Middle Eastern",
    styles: ["Lebanese", "Turkish", "Persian", "Israeli"],
  },
  {
    region: "Mediterranean",
    styles: ["Italian", "Greek", "Spanish", "Southern French"],
  },
  {
    region: "Eastern European",
    styles: ["Polish", "Russian", "Hungarian", "Ukrainian"],
  },
  {
    region: "Western European",
    styles: ["French", "German", "British", "Belgian"],
  },
  {
    region: "Latin American",
    styles: ["Mexican", "Peruvian", "Brazilian", "Argentinian", "Colombian"],
  },
  {
    region: "North American",
    styles: [
      "Southern",
      "Soul Food",
      "Cajun",
      "Creole",
      "Tex-Mex",
      "Southwestern",
      "California",
      "Pacific Northwest",
      "New England",
      "Midwestern",
      "Hawaiian",
      "Canadian",
    ],
  },
  {
    region: "North African",
    styles: ["Moroccan", "Tunisian", "Egyptian", "Algerian"],
  },
  {
    region: "Sub-Saharan African",
    styles: ["Ethiopian", "Nigerian", "Senegalese", "Kenyan"],
  },
  {
    region: "Caribbean",
    styles: ["Jamaican", "Cuban", "Puerto Rican/Dominican", "Trinidadian"],
  },
] as const;

export type CuisineRegionName = (typeof CUISINE_REGIONS)[number]["region"];

/** Region name → array of styles in that region. */
export const regionToStyles: Record<string, readonly string[]> = Object.fromEntries(
  CUISINE_REGIONS.map(({ region, styles }) => [region, styles])
);

/** Style name → parent region name. */
export const styleToRegion: Record<string, string> = Object.fromEntries(
  CUISINE_REGIONS.flatMap(({ region, styles }) =>
    styles.map((style) => [style, region])
  )
);

/**
 * Returns true if any of the recipe's CuisinePairings match the selected filter styles.
 * An empty filterStyles list means "no constraint" — match everything.
 */
export function cuisineMatchesFilter(
  recipeCuisines: CuisinePairing[],
  filterStyles: string[]
): boolean {
  if (filterStyles.length === 0) return true;
  return recipeCuisines.some((p) => filterStyles.includes(p.style));
}
