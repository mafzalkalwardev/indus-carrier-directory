CREATE TABLE IF NOT EXISTS carrier_officers (
  dot_number text NOT NULL,
  officer_key text NOT NULL,
  first_name text,
  middle_name text,
  last_name text,
  suffix text,
  title text,
  phone text,
  email text,
  PRIMARY KEY (dot_number, officer_key)
);

CREATE INDEX IF NOT EXISTS carrier_officers_dot ON carrier_officers (dot_number);

ALTER TABLE carriers ADD COLUMN IF NOT EXISTS motus_officers_at timestamptz;

CREATE INDEX IF NOT EXISTS carriers_docket1_digits
  ON carriers (ltrim(regexp_replace(COALESCE(docket1, ''), '[^0-9]', '', 'g'), '0'));
