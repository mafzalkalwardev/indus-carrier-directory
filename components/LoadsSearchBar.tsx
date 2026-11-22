"use client";

import { useMemo, useState } from "react";
import { LocationSuggest } from "@/components/LocationSuggest";

const EQUIPMENT_PILLS: [string, string][] = [
  ["V", "Van"],
  ["R", "Reefer"],
  ["F", "Flatbed"],
  ["SB", "Box"],
  ["PO", "Power"],
  ["VP", "VP"],
  ["VG", "VG"],
  ["VM", "VM"],
  ["MV", "MV"],
];

const DH = [25, 50, 75, 100, 150, 200, 250, 300, 400, 500];

export type LoadsSearchBarValues = {
  originCity: string;
  originState: string;
  originDeadhead: number;
  destinationCity: string;
  destinationState: string;
  destinationDeadhead: number;
  equipment: string;
  capacity: string;
  earliest: string;
  latest: string;
  maxAge: number;
  limit: number;
  orderBy: string;
  bookableOnly: boolean;
  tracking: string;
  includeLoadBoard: boolean;
  includePrivateNetwork: boolean;
  lengthFt: string;
  weightLbs: string;
};

export function LoadsSearchBar({ values }: { values: LoadsSearchBarValues }) {
  const [equipment, setEquipment] = useState(values.equipment || "V");
  const [advanced, setAdvanced] = useState(false);
  const ageHours = useMemo(() => {
    const hours = Math.round((values.maxAge || 1440) / 60);
    return String(Math.max(1, hours));
  }, [values.maxAge]);

  return (
    <form className="dat-criteria" action="/loads" method="get" aria-label="Search loads">
      <div className="dat-criteria-main">
        <label className="dat-field dat-field-grow">
          <span>Origin</span>
          <LocationSuggest
            cityName="origin_city"
            stateName="origin_state"
            defaultCity={values.originCity}
            defaultState={values.originState}
            placeholder="City, ST or ZIP"
            required
          />
        </label>

        <label className="dat-field dat-field-sm">
          <span>DH-O</span>
          <select name="origin_deadhead" defaultValue={String(values.originDeadhead)}>
            {DH.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>

        <label className="dat-field dat-field-grow">
          <span>Destination</span>
          <LocationSuggest
            cityName="destination_city"
            stateName="destination_state"
            defaultCity={values.destinationCity}
            defaultState={values.destinationState}
            placeholder="Anywhere"
            allowEmpty
          />
        </label>

        <label className="dat-field dat-field-sm">
          <span>DH-D</span>
          <select name="destination_deadhead" defaultValue={String(values.destinationDeadhead)}>
            {DH.map((n) => <option key={`d${n}`} value={n}>{n}</option>)}
          </select>
        </label>

        <div className="dat-field dat-equip">
          <span>Equipment</span>
          <div className="dat-pills" role="group" aria-label="Equipment type">
            {EQUIPMENT_PILLS.map(([code, label]) => (
              <button
                key={code}
                type="button"
                className={equipment === code ? "is-on" : undefined}
                onClick={() => setEquipment(code)}
              >
                {label}
              </button>
            ))}
          </div>
          <input type="hidden" name="equipment" value={equipment} />
        </div>

        <label className="dat-field dat-field-sm">
          <span>Type</span>
          <select name="capacity" defaultValue={values.capacity}>
            <option value="BOTH">Both</option>
            <option value="FULL">Full</option>
            <option value="PARTIAL">Partial</option>
          </select>
        </label>

        <label className="dat-field dat-field-sm">
          <span>Length</span>
          <input name="length_ft" type="number" min={1} max={80} defaultValue={values.lengthFt} placeholder="53" />
        </label>

        <label className="dat-field dat-field-sm">
          <span>Weight</span>
          <input name="weight_lbs" type="number" min={1000} max={80000} step={500} defaultValue={values.weightLbs} placeholder="45000" />
        </label>

        <label className="dat-field dat-field-sm">
          <span>Search back</span>
          <div className="dat-age">
            <input name="max_age_hours" type="number" min={1} max={168} defaultValue={ageHours} />
            <span>hrs</span>
          </div>
        </label>

        <button type="submit" className="dat-search-btn">Search</button>
      </div>

      <div className="dat-criteria-tools">
        <button type="button" className="dat-linkish" onClick={() => setAdvanced((v) => !v)}>
          {advanced ? "Hide filters" : "Load requirements"}
        </button>
        <label className="dat-toggle">
          <input type="checkbox" name="bookable_only" value="1" defaultChecked={values.bookableOnly} />
          <span>Book / Bid only</span>
        </label>
        <label className="dat-toggle">
          <input type="checkbox" name="include_private_network" value="1" defaultChecked={values.includePrivateNetwork} />
          <span>Private network</span>
        </label>
        <label className="dat-toggle">
          <input type="checkbox" name="include_load_board" value="1" defaultChecked={values.includeLoadBoard} />
          <span>Load board</span>
        </label>
      </div>

      {advanced ? (
        <div className="dat-advanced">
          <label>
            <span>Earliest pickup</span>
            <input name="earliest" type="date" defaultValue={values.earliest} />
          </label>
          <label>
            <span>Latest pickup</span>
            <input name="latest" type="date" defaultValue={values.latest} />
          </label>
          <label>
            <span>Tracking</span>
            <select name="tracking" defaultValue={values.tracking}>
              <option value="ALL">Both</option>
              <option value="TRACKING">Required</option>
              <option value="NO_TRACKING">Not required</option>
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select name="order_by" defaultValue={values.orderBy}>
              <option value="AGE_ASC">Age (newest)</option>
              <option value="AGE_DESC">Age (oldest)</option>
              <option value="RATE_DESC">Rate (high)</option>
              <option value="RATE_ASC">Rate (low)</option>
              <option value="DISTANCE_ASC">Trip (short)</option>
              <option value="DISTANCE_DESC">Trip (long)</option>
            </select>
          </label>
          <label>
            <span>Limit</span>
            <select name="limit" defaultValue={String(values.limit)}>
              {[25, 50, 100, 150, 200].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <>
          <input type="hidden" name="tracking" value={values.tracking} />
          <input type="hidden" name="order_by" value={values.orderBy} />
          <input type="hidden" name="limit" value={String(values.limit)} />
          {values.earliest ? <input type="hidden" name="earliest" value={values.earliest} /> : null}
          {values.latest ? <input type="hidden" name="latest" value={values.latest} /> : null}
        </>
      )}
    </form>
  );
}
