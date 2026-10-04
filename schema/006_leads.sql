CREATE TABLE IF NOT EXISTS service_leads (
  id bigserial PRIMARY KEY,
  service text NOT NULL,
  contact_name text NOT NULL,
  phone text,
  email text,
  dot_number text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_leads_created ON service_leads (created_at DESC);
