import type { SearchFilters } from "@/lib/search";
import { WhereField } from "@/components/WhereField";

export function SearchForm({ filters }: { filters: SearchFilters }) {
  return (
    <form className="search" action="/" method="get">
      <div className="search-row">
        <label className="search-detect">
          <span>Find by</span>
          <select name="find" defaultValue={filters.find} aria-label="What to search">
            <option value="auto">Auto-detect</option>
            <option value="dot">DOT number</option>
            <option value="mc">MC number</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
          </select>
        </label>
        <label className="search-field">
          <span>Carrier</span>
          <input
            id="q"
            name="q"
            defaultValue={filters.q}
            placeholder="USDOT, MC, company, phone, or email"
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>
        <WhereField defaultValue={filters.location} />
        <button type="submit">Search</button>
      </div>
      <p className="hint">Auto-detect reads a DOT, an MC, an email, or a phone. Pick one if you want that kind only. Where still limits the city or state.</p>
    </form>
  );
}
