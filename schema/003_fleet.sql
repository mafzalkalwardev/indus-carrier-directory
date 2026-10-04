ALTER TABLE carriers ADD COLUMN IF NOT EXISTS interstate_drivers integer;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS intrastate_drivers integer;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS insurance_cancel_pending boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS carrier_fleet (
  dot_number text NOT NULL,
  ownership text NOT NULL,
  vehicle_group text NOT NULL,
  vehicle_type text NOT NULL,
  units integer NOT NULL,
  PRIMARY KEY (dot_number, ownership, vehicle_type)
);

CREATE INDEX IF NOT EXISTS carrier_fleet_group ON carrier_fleet (vehicle_group, dot_number);
CREATE INDEX IF NOT EXISTS carriers_cancel_pending ON carriers (dot_number) WHERE insurance_cancel_pending;
