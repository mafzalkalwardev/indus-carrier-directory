import Link from "next/link";
import { stateIndex } from "@/lib/carriers";
import { countryOf, stateName } from "@/lib/states";

export const metadata = { title: "States" };

const ORDER = ["United States", "Canada", "Mexico", "Other"];

export default async function StatesPage() {
  let states: Awaited<ReturnType<typeof stateIndex>> = [];
  let error: string | null = null;
  try {
    states = await stateIndex();
  } catch {
    error = "The directory database is not reachable.";
  }
  const groups = ORDER.map((name) => ({
    name,
    states: states.filter((state) => countryOf(state.phy_state) === name),
  })).filter((group) => group.states.length > 0);

  return (
    <main>
      <h1>Carriers by country</h1>
      <p className="lede">United States, Canada, and Mexico are listed apart. Open a state to see the carriers there.</p>
      {error ? <p className="error">{error}</p> : null}
      {groups.map((group) => (
        <section key={group.name}>
          <h2 className="section-title">{group.name}</h2>
          <ul className="state-list">
            {group.states.map((state) => (
              <li key={state.phy_state}>
                <Link href={`/states/${state.phy_state}`}>
                  <span>{stateName(state.phy_state)}</span>
                  <span className="muted">{Number(state.count).toLocaleString()}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
