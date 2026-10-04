CREATE TABLE IF NOT EXISTS census_dockets (
  dot_number text NOT NULL,
  slot smallint NOT NULL,
  prefix text,
  docket_number text NOT NULL,
  status_code text,
  PRIMARY KEY (dot_number, slot)
);

CREATE INDEX IF NOT EXISTS census_dockets_digits
  ON census_dockets (ltrim(regexp_replace(docket_number, '[^0-9]', '', 'g'), '0'));

CREATE TABLE IF NOT EXISTS motus_authorities (
  dot_number text NOT NULL,
  docket_number text NOT NULL,
  authority_type text NOT NULL DEFAULT '',
  status text,
  PRIMARY KEY (dot_number, docket_number, authority_type)
);

ALTER TABLE carriers ADD COLUMN IF NOT EXISTS motus_authorities_at timestamptz;

CREATE INDEX IF NOT EXISTS authority_history_date ON authority_history (status_change_date);
