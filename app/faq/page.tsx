import Link from "next/link";

const QUESTIONS = [
  {
    id: "dot-vs-mc",
    q: "What is the difference between a USDOT and an MC number?",
    a: "A USDOT number identifies the company for safety. An MC number is the operating authority to haul for hire across state lines. A for-hire interstate carrier needs both. Search either one here. If a number is both a DOT and someone else’s MC, both carriers are shown.",
  },
  {
    id: "verify",
    q: "How do I verify a carrier before I book?",
    a: "Open the profile and read the snapshot: authority, insurance on file, a pending cancellation, and inspections in the last 24 months. Then confirm the same DOT on MOTUS or SAFER before you send a rate confirmation.",
  },
  {
    id: "score",
    q: "What is the score on a profile?",
    a: "It is INDUS reading the public file: active authority, how long it has been active, current BIPD insurance, revocation history, and a small safety bonus. It is not an official CSA percentile.",
  },
  {
    id: "dispatch",
    q: "What does dispatch cost?",
    a: "Consistent dispatch is 5–10% of the load. The dispatcher books freight, checks the broker, and keeps the next load ready. You keep the rest.",
  },
  {
    id: "fuel",
    q: "How does the fuel card work?",
    a: "It is $6 a month. You can fuel as much as the truck needs, at 50 cents a gallon under the pump price, so the truck can keep rolling when there is no cash for fuel.",
  },
  {
    id: "lane",
    q: "Can you cover one lane, or a shipper on a schedule?",
    a: "Yes. A carrier can ask us to keep a truck on a lane and to look for direct shippers. A shipper can ask for capacity on a daily, weekly, monthly, or yearly contract.",
  },
  {
    id: "new-mc",
    q: "Can you start my company and MC?",
    a: "Yes. We form the company and the LLC, file the USDOT and the MC, and can lease a truck or rent a trailer for power only.",
  },
  {
    id: "data",
    q: "Where do the records come from?",
    a: "Public FMCSA files on data.transportation.gov, refreshed on a daily job. They are a copy of a government database, not a legal authority decision, and INDUS is not part of the U.S. Department of Transportation.",
  },
];

export const metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <main>
      <p className="kicker">Answers</p>
      <h1>Questions we get before a truck rolls</h1>
      <p className="lede">DOT and MC, the score, dispatch, the fuel card, and how a shipper books a schedule.</p>
      <div className="faq-list">
        {QUESTIONS.map((item) => (
          <details key={item.id} id={item.id} className="faq">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
      <p className="hint">Still need a person? <Link href="/services/dispatch">Send the form</Link> or call sales.</p>
    </main>
  );
}
