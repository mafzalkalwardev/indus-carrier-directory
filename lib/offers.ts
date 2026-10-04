export type ServiceField = {
  name: string;
  label: string;
  kind?: "text" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  options?: string[];
  wide?: boolean;
};

export const offers = [
  {
    id: "dispatch",
    href: "/services#dispatch",
    label: "Dispatch",
    note: "5–10%",
    title: "Dedicated dispatch for your truck",
    text: "A dispatcher books the freight, checks the broker, and keeps the next load ready.",
    detail: "The fee is 5–10% of the load. You keep the rest. The dispatcher stays on the truck every day.",
  },
  {
    id: "authority",
    href: "/services#authority",
    label: "Start your MC",
    note: "LLC + DOT",
    title: "Register your own company",
    text: "We form the LLC, file the USDOT and the MC, and finish the setup.",
    detail: "If you want your own authority, we do the company, the LLC, the USDOT, and the MC. You do not have to piece it together.",
  },
  {
    id: "mc-lease",
    href: "/services#mc-lease",
    label: "Lease an MC",
    note: "Keep moving",
    title: "An MC on lease",
    text: "No MC yet, or the one you have is inactive. Lease one and keep the truck moving.",
    detail: "If you do not have your own MC, or your MC is inactive, we put the truck on a leased authority so it does not sit.",
  },
  {
    id: "truck-lease",
    href: "/services#truck-lease",
    label: "Lease a truck",
    note: "Trucks",
    title: "A truck on lease",
    text: "Need equipment, we can put a truck on lease.",
    detail: "When you are ready to run and you do not own a truck yet, we can lease you one.",
  },
  {
    id: "trailer-rental",
    href: "/services#trailer-rental",
    label: "Rent a trailer",
    note: "Power only",
    title: "Rented trailers for your power only",
    text: "Running power only, we rent the trailer.",
    detail: "Power-only carriers can rent a trailer from us instead of buying one before the first load.",
  },
  {
    id: "fuel-cards",
    href: "/services#fuel-cards",
    label: "Fuel card",
    note: "$6 / month",
    title: "Fuel when cash is short",
    text: "$6 a month. Fuel as much as you need. Fifty cents off every gallon.",
    detail: "The card is $6 a month. You can fuel as much as the truck needs, and the price is 50 cents a gallon under the pump. It is there so the truck keeps rolling when there is no cash for fuel.",
  },
  {
    id: "factoring",
    href: "/services#factoring",
    label: "Factoring",
    note: "RTS",
    title: "Get paid through RTS factoring",
    text: "We set up RTS so the invoice does not sit with the broker.",
    detail: "We open the RTS account and connect it to the carrier so invoices can pay without waiting out broker terms.",
  },
  {
    id: "eld",
    href: "/services#eld",
    label: "ELD",
    note: "Logs",
    title: "ELD devices",
    text: "We help you choose an ELD and get it installed.",
    detail: "We pick an electronic logging device that fits the fleet and get it in the truck before the first inspection.",
  },
  {
    id: "insurance",
    href: "/services#insurance",
    label: "Insurance",
    note: "Filing",
    title: "Setup cheapest insurance",
    text: "New authority or a renewal, we help get the policy filed.",
    detail: "A new MC, or a policy about to lapse, we help get liability coverage filed so the authority can stay active.",
  },
  {
    id: "lane",
    href: "/lanes",
    label: "Dedicated lane",
    note: "Your truck",
    title: "Dedicated lane for your truck",
    text: "Tell us origin, destination, and equipment. We look for freight that fits.",
    detail: "Give us the lane you want to run. We look for loads and direct shippers that match the truck.",
  },
  {
    id: "shipper-contract",
    href: "/lanes#shippers",
    label: "Shipper contract",
    note: "Daily to yearly",
    title: "Move freight on a contract",
    text: "Shippers can book capacity by the day, week, month, or year.",
    detail: "If you ship on a schedule, we cover the lane on a daily, weekly, monthly, or yearly contract.",
  },
  {
    id: "buy-truck",
    href: "/services#buy-truck",
    label: "Buy a truck",
    note: "Purchase",
    title: "Help buying a truck",
    text: "We help you find and buy the truck, then get it on the authority.",
    detail: "If you want to buy a truck, we help with the purchase and the paperwork so it can run under your company.",
  },
  {
    id: "drivers",
    href: "/services#drivers",
    label: "Onboard drivers",
    note: "Drivers",
    title: "Onboarding drivers",
    text: "We onboard drivers onto your trucks.",
    detail: "We help put drivers on your trucks: paperwork, qualification, and getting them ready to roll.",
  },
  {
    id: "dispatch-portal",
    href: "/services#dispatch-portal",
    label: "Dispatch portal",
    note: "Web app",
    title: "A portal for your dispatch",
    text: "We build the website your office uses to run trucks, loads, and drivers.",
    detail: "This is custom web development. We build a portal for your company so dispatch can assign loads, follow each truck, keep driver and broker records, and see what is booked, rolling, and delivered, all in one login.",
  },
  {
    id: "social",
    href: "/services#social",
    label: "Social media",
    note: "Pages",
    title: "Social media for your company",
    text: "We run the pages and the posts, replies, and updates that go with them.",
    detail: "We manage the company social pages and the work around them: posts, replies, and keeping the profiles current so the business stays visible.",
  },
  {
    id: "fmcsa-portal",
    href: "/services#fmcsa-portal",
    label: "FMCSA portal",
    note: "Portal",
    title: "FMCSA carrier portal",
    text: "We handle the FMCSA carrier portal for you.",
    detail: "Updates, MCS-150, and the FMCSA carrier portal can stay with us so you are not chasing the government site.",
  },
];

export function serviceById(id: string) {
  return offers.find((offer) => offer.id === id) ?? null;
}

const message = (placeholder: string): ServiceField => ({
  name: "message",
  label: "What you need",
  kind: "textarea",
  required: true,
  wide: true,
  placeholder,
});

export const serviceDetails: Record<string, { includes: string[]; fields: ServiceField[] }> = {
  dispatch: {
    includes: [
      "A dispatcher on the truck every day",
      "The broker checked before the load is booked",
      "The next load lined up so the truck does not sit",
      "A fee of 5–10% of the load. You keep the rest",
    ],
    fields: [
      { name: "trucks", label: "Trucks", placeholder: "How many" },
      { name: "dot", label: "USDOT", placeholder: "If you have one" },
      { name: "equipment", label: "Equipment", placeholder: "Van, reefer, flatbed" },
      { name: "lane", label: "Lanes", placeholder: "Dallas TX to Atlanta GA", wide: true },
      message("Where the truck runs, and when you want dispatch to start."),
    ],
  },
  authority: {
    includes: [
      "The company and the LLC",
      "The USDOT filing",
      "The MC authority filing",
      "The setup finished in one place, instead of you piecing it together",
    ],
    fields: [
      { name: "state", label: "State", placeholder: "Where to form the company" },
      { name: "dot", label: "USDOT", placeholder: "Only if you already have one" },
      message("The company name you want, and whether this is a new authority."),
    ],
  },
  "mc-lease": {
    includes: [
      "An active MC when you do not have your own",
      "A leased authority when your MC is inactive",
      "The truck keeps moving instead of waiting on paperwork",
    ],
    fields: [
      { name: "situation", label: "Your MC", kind: "select", options: ["I do not have an MC", "My MC is inactive"] },
      { name: "trucks", label: "Trucks", placeholder: "How many need the lease" },
      { name: "equipment", label: "Equipment", placeholder: "Van, reefer, flatbed" },
      { name: "dot", label: "USDOT", placeholder: "Only if you already have one" },
      message("Where the truck runs, and when you need the leased MC."),
    ],
  },
  "truck-lease": {
    includes: [
      "A truck when you do not own one yet",
      "A lease so you can start running",
      "Paperwork tied to your company",
    ],
    fields: [
      { name: "equipment", label: "Truck", placeholder: "Sleeper, day cab, year if you care" },
      { name: "trucks", label: "How many" },
      { name: "city", label: "City" },
      { name: "state", label: "State", placeholder: "TX" },
      message("When you need the truck, and where it will run."),
    ],
  },
  "trailer-rental": {
    includes: [
      "A trailer for a power-only truck",
      "Rent it instead of buying one before the first load",
      "Matched to the freight you pull",
    ],
    fields: [
      { name: "equipment", label: "Trailer", placeholder: "Van, reefer, flatbed" },
      { name: "trucks", label: "How many" },
      { name: "city", label: "City" },
      { name: "state", label: "State", placeholder: "TX" },
      message("When you need it, and which lanes it will run."),
    ],
  },
  "fuel-cards": {
    includes: [
      "$6 a month",
      "Fuel as much as the truck needs",
      "50 cents off every gallon",
      "The truck keeps rolling when there is no cash for fuel",
    ],
    fields: [
      { name: "trucks", label: "Trucks", placeholder: "How many will use the card" },
      { name: "dot", label: "USDOT" },
      { name: "city", label: "City" },
      { name: "state", label: "State", placeholder: "TX" },
      message("When you want the card active."),
    ],
  },
  factoring: {
    includes: [
      "An RTS factoring account opened for you",
      "The account connected to your carrier",
      "Invoices paid without waiting out broker terms",
    ],
    fields: [
      { name: "dot", label: "USDOT" },
      { name: "mc", label: "MC number" },
      message("About how many invoices a week, and when you want RTS started."),
    ],
  },
  eld: {
    includes: [
      "An ELD chosen for the fleet",
      "The device installed in the truck",
      "Logs ready before the first inspection",
    ],
    fields: [
      { name: "trucks", label: "Trucks", placeholder: "How many need a device" },
      { name: "dot", label: "USDOT" },
      message("The trucks that need logs, and when they go out."),
    ],
  },
  insurance: {
    includes: [
      "Coverage for a new MC or a renewal",
      "The policy filed so the authority can stay active",
      "Help getting the cheapest filing that still meets the requirement",
    ],
    fields: [
      { name: "dot", label: "USDOT" },
      { name: "coverage", label: "This is", kind: "select", options: ["New authority", "Renewal"] },
      { name: "equipment", label: "Equipment", placeholder: "Van, reefer, flatbed" },
      message("When the policy needs to be on file."),
    ],
  },
  lane: {
    includes: [
      "The origin and destination you want to run",
      "Freight that fits the trailer",
      "A look for a direct shipper on that lane",
    ],
    fields: [
      { name: "origin", label: "Origin", placeholder: "Dallas TX" },
      { name: "destination", label: "Destination", placeholder: "Atlanta GA" },
      { name: "equipment", label: "Equipment", placeholder: "Van, reefer, flatbed" },
      { name: "cadence", label: "How often", kind: "select", options: ["When a load is there", "Daily", "Weekly", "Monthly"] },
      message("Anything the truck cannot haul, and when you can start."),
    ],
  },
  "shipper-contract": {
    includes: [
      "Trucks on a daily, weekly, monthly, or yearly rhythm",
      "One lane covered on that schedule",
      "One desk for the freight",
    ],
    fields: [
      { name: "lane", label: "Lane", placeholder: "Dallas TX to Atlanta GA", wide: true },
      { name: "equipment", label: "Equipment", placeholder: "Van, reefer, flatbed" },
      { name: "cadence", label: "Rhythm", kind: "select", options: ["Daily", "Weekly", "Monthly", "Yearly"] },
      { name: "trucks", label: "Trucks needed" },
      message("Volume, pickup times, and when the contract should start."),
    ],
  },
  "buy-truck": {
    includes: [
      "Help finding the truck",
      "Help with the purchase",
      "Paperwork so it can run under your company",
    ],
    fields: [
      { name: "equipment", label: "Truck you want", placeholder: "Sleeper, day cab, box truck" },
      { name: "city", label: "City" },
      { name: "state", label: "State", placeholder: "TX" },
      message("Budget, timing, and whether it goes on a new or existing authority."),
    ],
  },
  drivers: {
    includes: [
      "Driver paperwork",
      "Qualification before they take a truck",
      "Drivers ready to roll",
    ],
    fields: [
      { name: "trucks", label: "Drivers", placeholder: "How many" },
      { name: "equipment", label: "Equipment they will run" },
      { name: "dot", label: "USDOT" },
      message("Home base, and when you need them."),
    ],
  },
  "dispatch-portal": {
    includes: [
      "A website your office logs into",
      "Loads assigned and each truck followed",
      "Driver and broker records in one place",
      "A view of what is booked, rolling, and delivered",
    ],
    fields: [
      { name: "trucks", label: "Trucks on the portal" },
      { name: "dot", label: "USDOT", placeholder: "If the company already has one" },
      message("What dispatch should manage in the portal: loads, drivers, brokers, documents."),
    ],
  },
  social: {
    includes: [
      "Company pages managed for you",
      "Posts, replies, and updates",
      "Profiles kept current so the business stays visible",
    ],
    fields: [
      { name: "platforms", label: "Pages", placeholder: "Facebook, Instagram, TikTok", wide: true },
      message("What you want posted, and who should approve it."),
    ],
  },
  "fmcsa-portal": {
    includes: [
      "The FMCSA carrier portal handled for you",
      "MCS-150 and other updates",
      "You are not chasing the government site",
    ],
    fields: [
      { name: "dot", label: "USDOT", required: true },
      { name: "mc", label: "MC number" },
      message("What needs updating: address, officers, MCS-150, or something else."),
    ],
  },
};
