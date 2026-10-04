export type Place = { label: string; value: string };

const CITIES = [
  "Austin, TX", "Houston, TX", "Dallas, TX", "San Antonio, TX", "El Paso, TX",
  "Los Angeles, CA", "San Diego, CA", "Fresno, CA", "Chicago, IL", "Atlanta, GA",
  "Miami, FL", "Orlando, FL", "Jacksonville, FL", "Phoenix, AZ", "Denver, CO",
  "Seattle, WA", "Portland, OR", "Las Vegas, NV", "New York, NY", "Newark, NJ",
  "Philadelphia, PA", "Charlotte, NC", "Nashville, TN", "Memphis, TN", "Indianapolis, IN",
  "Columbus, OH", "Cincinnati, OH", "Detroit, MI", "Minneapolis, MN", "Kansas City, MO",
  "St Louis, MO", "Oklahoma City, OK", "Tulsa, OK", "Louisville, KY", "Baltimore, MD",
  "Laredo, TX", "McAllen, TX", "Calgary, AB", "Toronto, ON", "Montreal, QC",
  "Monterrey, NL", "Mexico City, MX",
];

const REGIONS: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick", NL: "Newfoundland",
  NS: "Nova Scotia", NT: "Northwest Territories", ON: "Ontario", PE: "Prince Edward Island",
  QC: "Quebec", SK: "Saskatchewan", YT: "Yukon",
  MX: "Mexico", JA: "Jalisco", PU: "Puebla", DF: "Mexico City", NL2: "Nuevo Leon",
};

export function suggestPlaces(raw: string): Place[] {
  const q = raw.trim().toLowerCase();
  if (q.length < 1) return [];
  const states = Object.entries(REGIONS)
    .filter(([code, name]) => code !== "NL2" && (code.toLowerCase().startsWith(q) || name.toLowerCase().includes(q)))
    .slice(0, 6)
    .map(([code, name]) => ({ label: `${name} (${code === "NL2" ? "NL" : code})`, value: code === "NL2" ? "NL" : code }));
  const cities = CITIES
    .filter((city) => city.toLowerCase().includes(q))
    .slice(0, 8)
    .map((city) => ({ label: city, value: city }));
  return [...cities, ...states].slice(0, 8);
}
