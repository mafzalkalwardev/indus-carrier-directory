"use client";

import { useEffect, useId, useRef, useState } from "react";

type Suggestion = {
  label: string;
  city: string;
  state: string;
  postal_code?: string;
};

type Props = {
  cityName: string;
  stateName: string;
  defaultCity: string;
  defaultState: string;
  placeholder?: string;
  required?: boolean;
  allowEmpty?: boolean;
};

function formatPlace(city: string, state: string) {
  const c = city.trim();
  const s = state.trim().toUpperCase();
  if (c && s) return `${c}, ${s}`;
  if (c) return c;
  if (s) return s;
  return "";
}

function parseTyped(raw: string): { city: string; state: string } {
  const text = raw.trim();
  if (!text) return { city: "", state: "" };
  const match = text.match(/^(.+?)[,\s]+([A-Za-z]{2})$/);
  if (match) {
    return { city: match[1].trim(), state: match[2].toUpperCase() };
  }
  return { city: text, state: "" };
}

export function LocationSuggest({
  cityName,
  stateName,
  defaultCity,
  defaultState,
  placeholder = "City or ZIP",
  required = false,
  allowEmpty = false,
}: Props) {
  const listId = useId();
  const [display, setDisplay] = useState(formatPlace(defaultCity, defaultState));
  const [city, setCity] = useState(defaultCity);
  const [state, setState] = useState(defaultState);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  function scheduleSuggest(next: string) {
    if (timer.current) clearTimeout(timer.current);
    if (next.trim().length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/loads/locations?q=${encodeURIComponent(next.trim())}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const payload = (await response.json()) as { suggestions?: Suggestion[] };
        setItems(Array.isArray(payload.suggestions) ? payload.suggestions : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 220);
  }

  function pick(item: Suggestion) {
    const nextState = (item.state || "").trim().toUpperCase();
    // State-only suggestions (e.g. "Texas (TX)") keep city empty — don't treat the label as a city.
    const nextCity = (item.city || "").trim();
    setCity(nextCity);
    setState(nextState);
    setDisplay(item.label || formatPlace(nextCity, nextState));
    setOpen(false);
    setItems([]);
  }

  return (
    <div className="dat-location">
      <div className="dat-suggest-wrap">
        <input
          value={display}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open && items.length > 0}
          required={required && !allowEmpty}
          onChange={(event) => {
            const next = event.target.value;
            setDisplay(next);
            const parsed = parseTyped(next);
            setCity(parsed.city);
            setState(parsed.state);
            setOpen(true);
            scheduleSuggest(next);
          }}
          onFocus={() => {
            setOpen(true);
            if (display.trim().length >= 2) scheduleSuggest(display);
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 160);
          }}
        />
        <input type="hidden" name={cityName} value={city} />
        <input type="hidden" name={stateName} value={state} />
        {open && (items.length > 0 || loading) ? (
          <ul id={listId} className="dat-suggest is-open" role="listbox">
            {loading && items.length === 0 ? (
              <li className="dat-suggest-status">Searching places…</li>
            ) : null}
            {items.map((item) => (
              <li key={`${item.label}-${item.postal_code || ""}`}>
                <button
                  type="button"
                  role="option"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    pick(item);
                  }}
                >
                  <strong>{item.label}</strong>
                  {item.postal_code ? <span>{item.postal_code}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
