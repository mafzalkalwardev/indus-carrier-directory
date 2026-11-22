export type Place = { label: string; value: string };

const CITIES = [
  "Austin, TX", "Houston, TX", "Dallas, TX", "Fort Worth, TX", "Ft Worth, TX", "San Antonio, TX",
  "El Paso, TX", "Laredo, TX", "McAllen, TX", "Lubbock, TX", "Amarillo, TX", "Waco, TX",
  "Midland, TX", "Odessa, TX", "Corpus Christi, TX", "Beaumont, TX", "Tyler, TX", "Mesquite, TX",
  "Garland, TX", "Irving, TX", "Plano, TX", "Arlington, TX", "Pasadena, TX", "Grand Prairie, TX",
  "Los Angeles, CA", "Long Beach, CA", "Ontario, CA", "Fontana, CA", "San Diego, CA", "Fresno, CA",
  "Sacramento, CA", "San Jose, CA", "Oakland, CA", "Stockton, CA", "Bakersfield, CA",
  "Chicago, IL", "Joliet, IL", "Rockford, IL", "Atlanta, GA", "Savannah, GA", "Macon, GA",
  "Miami, FL", "Orlando, FL", "Jacksonville, FL", "Tampa, FL", "Lakeland, FL",
  "Phoenix, AZ", "Tucson, AZ", "Denver, CO", "Colorado Springs, CO",
  "Seattle, WA", "Tacoma, WA", "Spokane, WA", "Portland, OR", "Las Vegas, NV", "Reno, NV",
  "New York, NY", "Buffalo, NY", "Newark, NJ", "Philadelphia, PA", "Pittsburgh, PA",
  "Charlotte, NC", "Raleigh, NC", "Greensboro, NC", "Nashville, TN", "Memphis, TN", "Knoxville, TN",
  "Indianapolis, IN", "Fort Wayne, IN", "Columbus, OH", "Cincinnati, OH", "Cleveland, OH",
  "Toledo, OH", "Detroit, MI", "Grand Rapids, MI", "Minneapolis, MN", "Kansas City, MO",
  "St Louis, MO", "Springfield, MO", "Oklahoma City, OK", "Tulsa, OK", "Louisville, KY",
  "Baltimore, MD", "Richmond, VA", "Norfolk, VA", "Birmingham, AL", "Mobile, AL",
  "New Orleans, LA", "Baton Rouge, LA", "Shreveport, LA", "Little Rock, AR",
  "Salt Lake City, UT", "Boise, ID", "Albuquerque, NM", "Omaha, NE", "Des Moines, IA",
  "Milwaukee, WI", "Madison, WI", "Calgary, AB", "Toronto, ON", "Montreal, QC",
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
