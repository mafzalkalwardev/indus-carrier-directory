export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

export const CANADA = new Set(["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]);
export const MEXICO = new Set(["MX", "AG", "BN", "BS", "CH", "CI", "CL", "CP", "CS", "DF", "DG", "GJ", "GT", "HD", "JA", "MC", "MR", "NA", "OA", "PU", "QE", "QI", "SI", "SL", "SO", "TA", "TB", "TL", "YU", "ZA"]);
export const USA_EXTRA = new Set(["PR", "GU", "VI", "AS", "MP"]);

export function stateName(code: string) {
  return STATE_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

export function countryOf(code: string) {
  const key = code.toUpperCase();
  if (STATE_NAMES[key] || USA_EXTRA.has(key)) return "United States";
  if (CANADA.has(key)) return "Canada";
  if (MEXICO.has(key)) return "Mexico";
  return "Other";
}
