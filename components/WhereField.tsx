"use client";

import { useState } from "react";
import { suggestPlaces } from "@/lib/places";

export function WhereField({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const matches = suggestPlaces(value);

  return (
    <label className="search-field where-field">
      <span>Where</span>
      <input
        name="location"
        value={value}
        placeholder="Austin TX"
        autoComplete="off"
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {matches.length > 0 ? (
        <ul className={`suggest${open ? " is-open" : ""}`} aria-hidden={!open}>
          {matches.map((place) => (
            <li key={place.label}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  setValue(place.value);
                  setOpen(false);
                }}
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </label>
  );
}
