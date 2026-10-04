CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS feed_runs (
  id bigserial PRIMARY KEY,
  feed_key text NOT NULL,
  view_id text,
  source_updated_at timestamptz,
  loaded_at timestamptz NOT NULL DEFAULT now(),
  row_count bigint,
  status text NOT NULL,
  note text
);

CREATE TABLE IF NOT EXISTS carriers (
  dot_number text PRIMARY KEY,
  legal_name text,
  dba_name text,
  status_code text,
  phone text,
  fax text,
  cell_phone text,
  phone_digits text,
  email text,
  phy_street text,
  phy_city text,
  phy_state text,
  phy_zip text,
  phy_country text,
  phy_county text,
  mail_street text,
  mail_city text,
  mail_state text,
  mail_zip text,
  mail_country text,
  officer_1 text,
  officer_2 text,
  business_org_desc text,
  power_units integer,
  truck_units integer,
  bus_units integer,
  total_drivers integer,
  total_cdl integer,
  fleetsize text,
  carrier_operation text,
  classdef text,
  carship text,
  hm_ind text,
  add_date date,
  mcs150_date date,
  mcs150_mileage bigint,
  mcs150_mileage_year integer,
  recordable_crash_rate numeric,
  cargo text[],
  docket1prefix text,
  docket1 text,
  docket1_status_code text,
  prior_revoke_flag text,
  authority_status text,
  common_authority_status text,
  contract_authority_status text,
  broker_authority_status text,
  bipd_on_file numeric,
  insurance_current boolean,
  authority_granted_date date,
  revocation_count integer NOT NULL DEFAULT 0,
  out_of_service boolean NOT NULL DEFAULT false,
  oos_date date,
  inspections_24m integer NOT NULL DEFAULT 0,
  vehicle_oos_24m integer NOT NULL DEFAULT 0,
  driver_oos_24m integer NOT NULL DEFAULT 0,
  oos_rate numeric,
  crashes_24m integer NOT NULL DEFAULT 0,
  fatal_crashes_24m integer NOT NULL DEFAULT 0,
  injury_crashes_24m integer NOT NULL DEFAULT 0,
  last_inspection_date date,
  sms_insp_total integer,
  sms_driver_insp_total integer,
  sms_driver_oos_insp_total integer,
  sms_vehicle_insp_total integer,
  sms_vehicle_oos_insp_total integer,
  sms_measures jsonb,
  score_authority integer,
  score_age integer,
  score_insurance integer,
  score_revocation integer,
  score_safety integer,
  trust_score integer,
  trust_grade text,
  live_checked_at timestamptz,
  live_allowed_to_operate text,
  live_bipd_on_file text,
  live_common_authority text,
  live_contract_authority text,
  live_broker_authority text,
  live_oos_date date,
  live_safety_rating text,
  live_safety_rating_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS carriers_name_trgm ON carriers USING gin (legal_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS carriers_dba_trgm ON carriers USING gin (dba_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS carriers_phone_digits ON carriers (phone_digits);
CREATE INDEX IF NOT EXISTS carriers_email ON carriers (lower(email));
CREATE INDEX IF NOT EXISTS carriers_state_city ON carriers (phy_state, lower(phy_city));
CREATE INDEX IF NOT EXISTS carriers_state_active ON carriers (phy_state, authority_status, dot_number);
CREATE INDEX IF NOT EXISTS carriers_score ON carriers (trust_score DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS dockets (
  docket_number text NOT NULL,
  dot_number text NOT NULL,
  op_auth_type text NOT NULL DEFAULT '',
  op_auth_status text,
  min_cov_amount numeric,
  cargo_req text,
  bond_req text,
  bipd_file numeric,
  cargo_file text,
  bond_file text,
  legal_name text,
  dba_name text,
  bus_street text,
  bus_city text,
  bus_state text,
  bus_zip text,
  bus_phone text,
  PRIMARY KEY (docket_number, op_auth_type)
);

CREATE INDEX IF NOT EXISTS dockets_dot ON dockets (dot_number);
CREATE INDEX IF NOT EXISTS dockets_number_digits ON dockets (regexp_replace(docket_number, '[^0-9]', '', 'g'));

CREATE TABLE IF NOT EXISTS insurance_policies (
  id bigserial PRIMARY KEY,
  docket_number text,
  dot_number text,
  ins_form_code text,
  ins_type_code text,
  ins_class_code text,
  max_cov_amount numeric,
  underl_lim_amount numeric,
  policy_no text,
  effective_date date,
  insurance_company_name text,
  trans_date date
);

CREATE INDEX IF NOT EXISTS insurance_policies_dot ON insurance_policies (dot_number);

CREATE TABLE IF NOT EXISTS insurance_history (
  id bigserial PRIMARY KEY,
  docket_number text,
  dot_number text,
  ins_form_code text,
  filing_status_reason text,
  ins_type_code text,
  ins_type_desc text,
  policy_no text,
  min_cov_amount numeric,
  ins_class_code text,
  effective_date date,
  underl_lim_amount numeric,
  max_cov_amount numeric,
  cancl_effective_date date,
  insurance_company_name text
);

CREATE INDEX IF NOT EXISTS insurance_history_dot ON insurance_history (dot_number);

CREATE TABLE IF NOT EXISTS authority_history (
  id bigserial PRIMARY KEY,
  docket_number text,
  dot_number text,
  op_auth_type text,
  op_auth_status text,
  reason text,
  status_change_date date
);

CREATE INDEX IF NOT EXISTS authority_history_dot ON authority_history (dot_number, status_change_date);

CREATE TABLE IF NOT EXISTS revocations (
  id bigserial PRIMARY KEY,
  docket_number text,
  dot_number text,
  op_auth_type text,
  order_serve_date date,
  order_type text,
  order_effective_date date
);

CREATE INDEX IF NOT EXISTS revocations_dot ON revocations (dot_number);

CREATE TABLE IF NOT EXISTS process_agents (
  id bigserial PRIMARY KEY,
  docket_number text,
  dot_number text,
  co_name text,
  street text,
  city text,
  state_code text,
  zip_code text,
  country text
);

CREATE INDEX IF NOT EXISTS process_agents_dot ON process_agents (dot_number);

CREATE TABLE IF NOT EXISTS inspections (
  inspection_id text NOT NULL,
  dot_number text NOT NULL,
  insp_date date NOT NULL,
  report_state text,
  report_number text,
  location text,
  location_desc text,
  insp_level_id text,
  viol_total integer,
  oos_total integer,
  driver_viol_total integer,
  driver_oos_total integer,
  vehicle_viol_total integer,
  vehicle_oos_total integer,
  hazmat_viol_total integer,
  hazmat_oos_total integer,
  post_acc_ind text,
  insp_carrier_name text,
  insp_carrier_state text,
  docket_number text,
  PRIMARY KEY (inspection_id, insp_date)
) PARTITION BY RANGE (insp_date);

CREATE TABLE IF NOT EXISTS inspections_old PARTITION OF inspections
  FOR VALUES FROM ('1900-01-01') TO ('2000-01-01');
CREATE TABLE IF NOT EXISTS inspections_future PARTITION OF inspections
  FOR VALUES FROM ('2029-01-01') TO ('2100-01-01');
CREATE TABLE IF NOT EXISTS inspections_default PARTITION OF inspections DEFAULT;

CREATE TABLE IF NOT EXISTS inspection_units (
  inspection_id text NOT NULL,
  insp_unit_id text NOT NULL,
  unit_type text,
  unit_number text,
  unit_make text,
  unit_company text,
  license_plate text,
  license_state text,
  vin text,
  decal text,
  PRIMARY KEY (inspection_id, insp_unit_id)
);

CREATE INDEX IF NOT EXISTS inspection_units_insp ON inspection_units (inspection_id);

CREATE TABLE IF NOT EXISTS inspection_violations (
  inspection_id text NOT NULL,
  insp_violation_id text NOT NULL,
  seq_no text,
  viol_code text,
  viol_desc text,
  out_of_service text,
  part_no text,
  part_no_section text,
  PRIMARY KEY (inspection_id, insp_violation_id)
);

CREATE INDEX IF NOT EXISTS inspection_violations_insp ON inspection_violations (inspection_id);

CREATE TABLE IF NOT EXISTS crashes (
  crash_id text NOT NULL,
  dot_number text NOT NULL,
  report_date date NOT NULL,
  report_state text,
  report_number text,
  city text,
  state text,
  fatalities integer,
  injuries integer,
  tow_away text,
  federal_recordable text,
  vehicle_configuration_id text,
  vin text,
  agency text,
  PRIMARY KEY (crash_id, report_date)
) PARTITION BY RANGE (report_date);

CREATE TABLE IF NOT EXISTS crashes_old PARTITION OF crashes
  FOR VALUES FROM ('1900-01-01') TO ('2000-01-01');
CREATE TABLE IF NOT EXISTS crashes_future PARTITION OF crashes
  FOR VALUES FROM ('2029-01-01') TO ('2100-01-01');
CREATE TABLE IF NOT EXISTS crashes_default PARTITION OF crashes DEFAULT;

CREATE TABLE IF NOT EXISTS sms_measures (
  dot_number text PRIMARY KEY,
  insp_total integer,
  driver_insp_total integer,
  driver_oos_insp_total integer,
  vehicle_insp_total integer,
  vehicle_oos_insp_total integer,
  unsafe_driv_measure numeric,
  unsafe_driv_ac text,
  hos_driv_measure numeric,
  hos_driv_ac text,
  driv_fit_measure numeric,
  driv_fit_ac text,
  contr_subst_measure numeric,
  contr_subst_ac text,
  veh_maint_measure numeric,
  veh_maint_ac text,
  loaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oos_orders (
  id bigserial PRIMARY KEY,
  dot_number text,
  legal_name text,
  dba_name text,
  oos_date date,
  oos_reason text,
  status text,
  rescind_date date
);

CREATE INDEX IF NOT EXISTS oos_orders_dot ON oos_orders (dot_number);

CREATE INDEX IF NOT EXISTS inspections_dot_date ON inspections (dot_number, insp_date DESC);
CREATE INDEX IF NOT EXISTS crashes_dot_date ON crashes (dot_number, report_date DESC);
