import type { SearchFilters } from "@/lib/search";

export function DeskForm({ filters }: { filters: SearchFilters }) {
  return (
    <form className="search" action="/desk" method="get">
      <div className="ticks">
        <label><input type="checkbox" name="registered" value="1" defaultChecked={filters.registered} /> Registered</label>
        <label><input type="checkbox" name="activated" value="1" defaultChecked={filters.activated} /> Activated</label>
        <label><input type="checkbox" name="reinstated" value="1" defaultChecked={filters.reinstated} /> Reinstated</label>
        <label>
          From
          <input type="date" name="from" defaultValue={filters.from} aria-label="From date" />
        </label>
        <label>
          To
          <input type="date" name="to" defaultValue={filters.to} aria-label="To date" />
        </label>
        <label>
          Where
          <input name="location" defaultValue={filters.location} placeholder="Austin TX" />
        </label>
      </div>
      <div className="filters" style={{ marginTop: 14 }}>
        <label>
          Operation
          <select name="operation" defaultValue={filters.operation}>
            <option value="">Any operation</option>
            <option value="A">Interstate</option>
            <option value="B">Intrastate hazmat</option>
            <option value="C">Intrastate</option>
          </select>
        </label>
        <label>
          Authority
          <select name="authority" defaultValue={filters.authority}>
            <option value="">Any authority</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Pending">Pending</option>
          </select>
        </label>
        <label>
          Insurance
          <select name="insurance" defaultValue={filters.insurance}>
            <option value="">Any insurance</option>
            <option value="current">BIPD on file</option>
            <option value="missing">No BIPD on file</option>
            <option value="cancel">Cancellation pending</option>
          </select>
        </label>
        <label>
          Vehicle
          <select name="vehicle" defaultValue={filters.vehicle}>
            <option value="">Any vehicle</option>
            <option value="truck">Straight truck</option>
            <option value="tractor">Truck tractor</option>
            <option value="trailer">Trailer</option>
            <option value="van">Van</option>
            <option value="bus">Bus</option>
          </select>
        </label>
      </div>
      <div className="ticks">
        <button type="submit">Show carriers</button>
      </div>
    </form>
  );
}
