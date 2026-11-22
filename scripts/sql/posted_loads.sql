-- First-party desk loads (Indus / Laneora desk). Also applied at runtime via ensurePostedLoadsTable().
CREATE TABLE IF NOT EXISTS posted_loads (
  id bigserial PRIMARY KEY,
  origin_city text NOT NULL,
  origin_state text NOT NULL,
  destination_city text NOT NULL,
  destination_state text NOT NULL,
  equipment text NOT NULL,
  weight text,
  size text NOT NULL DEFAULT 'Full',
  miles int,
  rate text,
  per_mile text,
  pickup_date text,
  notes text,
  broker_name text,
  broker_phone text,
  broker_email text,
  broker_dot text,
  status text NOT NULL DEFAULT 'open',
  source text NOT NULL DEFAULT 'Indus',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posted_loads_origin_state_idx ON posted_loads (origin_state);
CREATE INDEX IF NOT EXISTS posted_loads_status_idx ON posted_loads (status);
CREATE INDEX IF NOT EXISTS posted_loads_created_at_idx ON posted_loads (created_at DESC);
