from pathlib import Path

from fmcsa_ingest.datasets import CARGO, SAFETY_FEEDS
from fmcsa_ingest.db import SAFETY_TABLESPACE, split_sql
from fmcsa_ingest.download import read_header


def qi(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def has(columns: set[str], name: str) -> bool:
    return name in columns


def text_col(columns: set[str], name: str) -> str:
    if name not in columns:
        return "NULL::text"
    quoted = qi(name)
    return f"NULLIF(btrim({quoted}), '')"


def norm_dot(columns: set[str], name: str) -> str:
    if name not in columns:
        return "NULL::text"
    digits = f"regexp_replace(btrim({qi(name)}), '[^0-9]', '', 'g')"
    return f"NULLIF(ltrim({digits}, '0'), '')"


def ymd(columns: set[str], name: str) -> str:
    if name not in columns:
        return "NULL::date"
    quoted = qi(name)
    trimmed = f"btrim({quoted})"
    return (
        f"CASE WHEN {trimmed} ~ '^[0-9]{{8}}$' THEN to_date({trimmed}, 'YYYYMMDD') "
        f"WHEN {trimmed} ~ '^[0-9]{{4}}-[0-9]{{2}}-[0-9]{{2}}' THEN left({trimmed}, 10)::date "
        f"ELSE NULL END"
    )


def _plain_number(quoted: str) -> str:
    return f"replace(btrim({quoted}), ',', '')"


def as_int(columns: set[str], name: str) -> str:
    if name not in columns:
        return "NULL::integer"
    trimmed = _plain_number(qi(name))
    return f"CASE WHEN {trimmed} ~ '^-?[0-9]+$' THEN {trimmed}::integer ELSE NULL END"


def as_bigint(columns: set[str], name: str) -> str:
    if name not in columns:
        return "NULL::bigint"
    trimmed = _plain_number(qi(name))
    return f"CASE WHEN {trimmed} ~ '^-?[0-9]+$' THEN {trimmed}::bigint ELSE NULL END"


def as_numeric(columns: set[str], name: str) -> str:
    if name not in columns:
        return "NULL::numeric"
    trimmed = _plain_number(qi(name))
    return f"CASE WHEN {trimmed} ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN {trimmed}::numeric ELSE NULL END"


def phone_digits(expr: str) -> str:
    digits = f"regexp_replace(COALESCE({expr}, ''), '[^0-9]', '', 'g')"
    return (
        f"CASE WHEN length({digits}) = 11 AND left({digits}, 1) = '1' THEN right({digits}, 10) "
        f"WHEN {digits} = '' THEN NULL ELSE {digits} END"
    )


def cargo_expr(columns: set[str]) -> str:
    parts = []
    for column, label in CARGO.items():
        if column not in columns:
            continue
        literal = label.replace("'", "''")
        parts.append(f"CASE WHEN {qi(column)} IN ('X', 'x', 'Y', 'y') THEN '{literal}' END")
    if "crgo_cargoothr_desc" in columns:
        parts.append(f"NULLIF(btrim({qi('crgo_cargoothr_desc')}), '')")
    if not parts:
        return "ARRAY[]::text[]"
    joined = ", ".join(parts)
    return f"ARRAY(SELECT v FROM unnest(ARRAY[{joined}]) AS t(v) WHERE v IS NOT NULL)"


def create_staging(cur, table: str, columns: list[str], tablespace: str | None = None) -> None:
    column_sql = ", ".join(f"{qi(column)} text" for column in columns)
    cur.execute(f"DROP TABLE IF EXISTS {qi(table)}")
    space = f" TABLESPACE {tablespace}" if tablespace else ""
    cur.execute(f"CREATE UNLOGGED TABLE {qi(table)} ({column_sql}){space}")


def copy_csv(cur, table: str, path: Path) -> None:
    sql = f"COPY {qi(table)} FROM STDIN WITH (FORMAT csv, HEADER true, NULL '', ENCODING 'UTF8')"
    with path.open("rb") as handle:
        with cur.copy(sql) as copy:
            while True:
                chunk = handle.read(8 * 1024 * 1024)
                if not chunk:
                    break
                copy.write(chunk)


def staging_count(cur, table: str) -> int:
    cur.execute(f"SELECT count(*) FROM {qi(table)}")
    return int(cur.fetchone()[0])


def load_csv(conn, feed_key: str, path: Path) -> tuple[list[str], str, int]:
    columns = read_header(path)
    table = f"stg_{feed_key}"
    tablespace = SAFETY_TABLESPACE if feed_key in SAFETY_FEEDS or feed_key == "census" else None
    with conn.cursor() as cur:
        if tablespace:
            cur.execute(f"SET temp_tablespaces = {tablespace}")
            cur.execute("SET work_mem = '512MB'")
        create_staging(cur, table, columns, tablespace)
        print(f"  copying {feed_key} into {table}", flush=True)
        copy_csv(cur, table, path)
        count = staging_count(cur, table)
    print(f"  {feed_key}: {count:,} rows", flush=True)
    if count == 0:
        raise RuntimeError(f"{feed_key} CSV produced zero rows; refusing to replace stored data")
    return columns, table, count


def drop_staging(conn, table: str) -> None:
    with conn.cursor() as cur:
        cur.execute(f"DROP TABLE IF EXISTS {qi(table)}")


CARRIER_INDEXES = (
    "carriers_name_trgm",
    "carriers_dba_trgm",
    "carriers_score",
    "carriers_phone_digits",
    "carriers_email",
    "carriers_state_city",
    "carriers_state_active",
    "carriers_operation",
    "carriers_authority",
    "carriers_insurance",
    "carriers_cancel_pending",
)


def drop_carrier_indexes(cur) -> None:
    for index in CARRIER_INDEXES:
        cur.execute(f"DROP INDEX IF EXISTS {index}")


def rebuild_carrier_indexes(conn) -> None:
    print("  rebuilding search indexes", flush=True)
    previous = conn.autocommit
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute("SET max_parallel_maintenance_workers = 0")
            cur.execute("SET maintenance_work_mem = '256MB'")
            cur.execute("CREATE INDEX IF NOT EXISTS carriers_phone_digits ON carriers (phone_digits)")
            cur.execute("CREATE INDEX IF NOT EXISTS carriers_email ON carriers (lower(email))")
            cur.execute("CREATE INDEX IF NOT EXISTS carriers_state_city ON carriers (phy_state, lower(phy_city))")
            cur.execute("CREATE INDEX IF NOT EXISTS carriers_state_active ON carriers (phy_state, authority_status, dot_number)")
            cur.execute("CREATE INDEX IF NOT EXISTS carriers_operation ON carriers (carrier_operation)")
            cur.execute("CREATE INDEX IF NOT EXISTS carriers_authority ON carriers (authority_status)")
            cur.execute("CREATE INDEX IF NOT EXISTS carriers_insurance ON carriers (insurance_current)")
            cur.execute("CREATE INDEX IF NOT EXISTS carriers_cancel_pending ON carriers (dot_number) WHERE insurance_cancel_pending")
            cur.execute("CREATE INDEX IF NOT EXISTS carriers_score ON carriers (trust_score DESC NULLS LAST)")
            cur.execute("CREATE INDEX IF NOT EXISTS carriers_name_trgm ON carriers USING gin (legal_name gin_trgm_ops)")
            cur.execute("CREATE INDEX IF NOT EXISTS carriers_dba_trgm ON carriers USING gin (dba_name gin_trgm_ops)")
            cur.execute("ANALYZE carriers")
    finally:
        conn.autocommit = previous


def refresh_insurance_cancellations(cur) -> None:
    cur.execute("UPDATE carriers SET insurance_cancel_pending = false WHERE insurance_cancel_pending")
    cur.execute(
        """
        UPDATE carriers c SET insurance_cancel_pending = true
        FROM (
          SELECT DISTINCT dot_number
          FROM insurance_history
          WHERE cancl_effective_date >= current_date
        ) pending
        WHERE c.dot_number = pending.dot_number
        """
    )


def transform(conn, kind: str, table: str, columns: list[str]) -> None:
    present = set(columns)
    sql = TRANSFORMS[kind](table, present)
    statements = split_sql(sql)
    batch_column = {
        "inspections": "inspection_id",
        "units": "inspection_id",
        "violations": "inspection_id",
        "crashes": "crash_id",
    }.get(kind)
    with conn.cursor() as cur:
        if kind in SAFETY_FEEDS or kind == "census":
            cur.execute(f"SET temp_tablespaces = {SAFETY_TABLESPACE}")
            cur.execute("SET work_mem = '256MB'")
        if kind == "census":
            print("  dropping carrier search indexes for the census update", flush=True)
            drop_carrier_indexes(cur)
        if batch_column is None:
            for statement in statements:
                cur.execute(statement)
            if kind == "census":
                conn.commit()
                rebuild_carrier_indexes(conn)
            return
        if not statements:
            return
        cur.execute(statements[0])
        insert = statements[-1]
        needle = f"FROM {qi(table)}"
        batches = 16
        quoted = qi(batch_column)
        for batch in range(batches):
            filtered = insert.replace(
                needle,
                f"FROM {qi(table)} WHERE ((hashtext({quoted}) % {batches}) + {batches}) % {batches} = {batch}",
                1,
            )
            print(f"  {kind} batch {batch + 1}/{batches}", flush=True)
            cur.execute(filtered)
            conn.commit()
            previous = conn.autocommit
            conn.autocommit = True
            try:
                cur.execute("CHECKPOINT")
            finally:
                conn.autocommit = previous


FLEET_SPECS = [
    (prefix + suffix, ownership, group, label)
    for prefix, ownership in (("own", "Owned"), ("trm", "Term leased"), ("trp", "Trip leased"))
    for suffix, group, label in (
        ("truck", "truck", "Straight truck"),
        ("tract", "tractor", "Truck tractor"),
        ("trail", "trailer", "Trailer"),
        ("coach", "coach", "Coach"),
        ("school_1_8", "school_bus", "School bus, 1-8"),
        ("school_9_15", "school_bus", "School bus, 9-15"),
        ("school_16", "school_bus", "School bus, 16+"),
        ("bus_16", "bus", "Bus, 16+"),
        ("van_1_8", "van", "Van, 1-8"),
        ("van_9_15", "van", "Van, 9-15"),
        ("limo_1_8", "limo", "Limousine, 1-8"),
        ("limo_9_15", "limo", "Limousine, 9-15"),
        ("limo_16", "limo", "Limousine, 16+"),
    )
]


def _fleet_sql(table: str, columns: set[str]) -> str:
    dot = norm_dot(columns, "dot_number")
    selected = ",\n".join(
        f"        {as_int(columns, column)} AS {qi(column)}" for column, _ownership, _group, _label in FLEET_SPECS
    )
    values = ",\n".join(
        "('{ownership}', '{group}', '{label}', {column})".format(
            ownership=ownership.replace("'", "''"),
            group=group,
            label=label.replace("'", "''"),
            column=qi(column),
        )
        for column, ownership, group, label in FLEET_SPECS
    )
    return f""";
    TRUNCATE carrier_fleet;
    INSERT INTO carrier_fleet (dot_number, ownership, vehicle_group, vehicle_type, units)
    SELECT dot_number, ownership, vehicle_group, vehicle_type, units
    FROM (
      SELECT DISTINCT ON ({dot})
        {dot} AS dot_number,
        {selected}
      FROM {qi(table)}
      WHERE {dot} IS NOT NULL
      ORDER BY {dot}, {ymd(columns, "mcs150_date")} DESC NULLS LAST
    ) src
    CROSS JOIN LATERAL (
      VALUES
        {values}
    ) AS v(ownership, vehicle_group, vehicle_type, units)
    WHERE units > 0
    """


def _census_dockets_sql(table: str, columns: set[str]) -> str:
    dot = norm_dot(columns, "dot_number")
    ordered = ymd(columns, "mcs150_date")
    branches = []
    for slot in (1, 2, 3):
        number = text_col(columns, f"docket{slot}")
        branches.append(
            f"""
            (
            SELECT DISTINCT ON ({dot})
              {dot} AS dot_number,
              {slot}::smallint AS slot,
              {text_col(columns, f"docket{slot}prefix")} AS prefix,
              {number} AS docket_number,
              {text_col(columns, f"docket{slot}_status_code")} AS status_code
            FROM {qi(table)}
            WHERE {dot} IS NOT NULL AND {number} IS NOT NULL
            ORDER BY {dot}, {ordered} DESC NULLS LAST
            )
            """
        )
    union = " UNION ALL ".join(branches)
    return f"""
    TRUNCATE census_dockets;
    INSERT INTO census_dockets (dot_number, slot, prefix, docket_number, status_code)
    SELECT dot_number, slot, prefix, docket_number, status_code
    FROM ({union}) src
    """


def load_census_dockets(conn, table: str, columns: list[str]) -> None:
    sql = _census_dockets_sql(table, set(columns))
    with conn.cursor() as cur:
        cur.execute("SET work_mem = '256MB'")
        for statement in split_sql(sql):
            cur.execute(statement)


def _census(table: str, columns: set[str]) -> str:
    dot = norm_dot(columns, "dot_number")
    phone = text_col(columns, "phone")
    return f"""
    INSERT INTO carriers (
      dot_number, legal_name, dba_name, status_code, phone, fax, cell_phone, phone_digits, email,
      phy_street, phy_city, phy_state, phy_zip, phy_country, phy_county,
      mail_street, mail_city, mail_state, mail_zip, mail_country,
      officer_1, officer_2, business_org_desc,
      power_units, truck_units, bus_units, total_drivers, total_cdl, interstate_drivers, intrastate_drivers, fleetsize,
      carrier_operation, classdef, carship, hm_ind,
      add_date, mcs150_date, mcs150_mileage, mcs150_mileage_year, recordable_crash_rate,
      cargo, docket1prefix, docket1, docket1_status_code, prior_revoke_flag, updated_at
    )
    SELECT DISTINCT ON (dot_number)
      dot_number, legal_name, dba_name, status_code, phone, fax, cell_phone, phone_digits, email,
      phy_street, phy_city, phy_state, phy_zip, phy_country, phy_county,
      mail_street, mail_city, mail_state, mail_zip, mail_country,
      officer_1, officer_2, business_org_desc,
      power_units, truck_units, bus_units, total_drivers, total_cdl, interstate_drivers, intrastate_drivers, fleetsize,
      carrier_operation, classdef, carship, hm_ind,
      add_date, mcs150_date, mcs150_mileage, mcs150_mileage_year, recordable_crash_rate,
      cargo, docket1prefix, docket1, docket1_status_code, prior_revoke_flag, now()
    FROM (
      SELECT
        {dot} AS dot_number,
        {text_col(columns, "legal_name")} AS legal_name,
        {text_col(columns, "dba_name")} AS dba_name,
        {text_col(columns, "status_code")} AS status_code,
        {phone} AS phone,
        {text_col(columns, "fax")} AS fax,
        {text_col(columns, "cell_phone")} AS cell_phone,
        {phone_digits(phone)} AS phone_digits,
        lower({text_col(columns, "email_address")}) AS email,
        {text_col(columns, "phy_street")} AS phy_street,
        {text_col(columns, "phy_city")} AS phy_city,
        {text_col(columns, "phy_state")} AS phy_state,
        {text_col(columns, "phy_zip")} AS phy_zip,
        {text_col(columns, "phy_country")} AS phy_country,
        {text_col(columns, "phy_cnty")} AS phy_county,
        {text_col(columns, "carrier_mailing_street")} AS mail_street,
        {text_col(columns, "carrier_mailing_city")} AS mail_city,
        {text_col(columns, "carrier_mailing_state")} AS mail_state,
        {text_col(columns, "carrier_mailing_zip")} AS mail_zip,
        {text_col(columns, "carrier_mailing_country")} AS mail_country,
        {text_col(columns, "company_officer_1")} AS officer_1,
        {text_col(columns, "company_officer_2")} AS officer_2,
        {text_col(columns, "business_org_desc")} AS business_org_desc,
        {as_int(columns, "power_units")} AS power_units,
        {as_int(columns, "truck_units")} AS truck_units,
        {as_int(columns, "bus_units")} AS bus_units,
        {as_int(columns, "total_drivers")} AS total_drivers,
        {as_int(columns, "total_cdl")} AS total_cdl,
        {as_int(columns, "driver_inter_total")} AS interstate_drivers,
        {as_int(columns, "total_intrastate_drivers")} AS intrastate_drivers,
        {text_col(columns, "fleetsize")} AS fleetsize,
        {text_col(columns, "carrier_operation")} AS carrier_operation,
        {text_col(columns, "classdef")} AS classdef,
        {text_col(columns, "carship")} AS carship,
        {text_col(columns, "hm_ind")} AS hm_ind,
        {ymd(columns, "add_date")} AS add_date,
        {ymd(columns, "mcs150_date")} AS mcs150_date,
        {as_bigint(columns, "mcs150_mileage")} AS mcs150_mileage,
        {as_int(columns, "mcs150_mileage_year")} AS mcs150_mileage_year,
        {as_numeric(columns, "recordable_crash_rate")} AS recordable_crash_rate,
        {cargo_expr(columns)} AS cargo,
        {text_col(columns, "docket1prefix")} AS docket1prefix,
        {text_col(columns, "docket1")} AS docket1,
        {text_col(columns, "docket1_status_code")} AS docket1_status_code,
        {text_col(columns, "prior_revoke_flag")} AS prior_revoke_flag
      FROM {qi(table)}
    ) src
    WHERE dot_number IS NOT NULL
    ORDER BY dot_number, mcs150_date DESC NULLS LAST
    ON CONFLICT (dot_number) DO UPDATE SET
      legal_name = EXCLUDED.legal_name,
      dba_name = EXCLUDED.dba_name,
      status_code = EXCLUDED.status_code,
      phone = EXCLUDED.phone,
      fax = EXCLUDED.fax,
      cell_phone = EXCLUDED.cell_phone,
      phone_digits = EXCLUDED.phone_digits,
      email = EXCLUDED.email,
      phy_street = EXCLUDED.phy_street,
      phy_city = EXCLUDED.phy_city,
      phy_state = EXCLUDED.phy_state,
      phy_zip = EXCLUDED.phy_zip,
      phy_country = EXCLUDED.phy_country,
      phy_county = EXCLUDED.phy_county,
      mail_street = EXCLUDED.mail_street,
      mail_city = EXCLUDED.mail_city,
      mail_state = EXCLUDED.mail_state,
      mail_zip = EXCLUDED.mail_zip,
      mail_country = EXCLUDED.mail_country,
      officer_1 = EXCLUDED.officer_1,
      officer_2 = EXCLUDED.officer_2,
      business_org_desc = EXCLUDED.business_org_desc,
      power_units = EXCLUDED.power_units,
      truck_units = EXCLUDED.truck_units,
      bus_units = EXCLUDED.bus_units,
      total_drivers = EXCLUDED.total_drivers,
      total_cdl = EXCLUDED.total_cdl,
      interstate_drivers = EXCLUDED.interstate_drivers,
      intrastate_drivers = EXCLUDED.intrastate_drivers,
      fleetsize = EXCLUDED.fleetsize,
      carrier_operation = EXCLUDED.carrier_operation,
      classdef = EXCLUDED.classdef,
      carship = EXCLUDED.carship,
      hm_ind = EXCLUDED.hm_ind,
      add_date = EXCLUDED.add_date,
      mcs150_date = EXCLUDED.mcs150_date,
      mcs150_mileage = EXCLUDED.mcs150_mileage,
      mcs150_mileage_year = EXCLUDED.mcs150_mileage_year,
      recordable_crash_rate = EXCLUDED.recordable_crash_rate,
      cargo = EXCLUDED.cargo,
      docket1prefix = EXCLUDED.docket1prefix,
      docket1 = EXCLUDED.docket1,
      docket1_status_code = EXCLUDED.docket1_status_code,
      prior_revoke_flag = EXCLUDED.prior_revoke_flag,
      updated_at = now()
    """ + _fleet_sql(table, columns) + _census_dockets_sql(table, columns)


def _carrier(table: str, columns: set[str]) -> str:
    dot = norm_dot(columns, "usdot_number")
    auth_type = text_col(columns, "op_auth_type")
    return f"""
    TRUNCATE dockets;
    INSERT INTO dockets (
      docket_number, dot_number, op_auth_type, op_auth_status, min_cov_amount,
      cargo_req, bond_req, bipd_file, cargo_file, bond_file,
      legal_name, dba_name, bus_street, bus_city, bus_state, bus_zip, bus_phone
    )
    SELECT DISTINCT ON (docket_number, op_auth_type)
      docket_number, dot_number, op_auth_type, op_auth_status, min_cov_amount,
      cargo_req, bond_req, bipd_file, cargo_file, bond_file,
      legal_name, dba_name, bus_street, bus_city, bus_state, bus_zip, bus_phone
    FROM (
      SELECT
        {text_col(columns, "docket_number")} AS docket_number,
        {dot} AS dot_number,
        COALESCE({auth_type}, '') AS op_auth_type,
        {text_col(columns, "op_auth_status")} AS op_auth_status,
        {as_numeric(columns, "min_cov_amount")} AS min_cov_amount,
        {text_col(columns, "cargo_req")} AS cargo_req,
        {text_col(columns, "bond_req")} AS bond_req,
        {as_numeric(columns, "bipd_file")} AS bipd_file,
        {text_col(columns, "cargo_file")} AS cargo_file,
        {text_col(columns, "bond_file")} AS bond_file,
        {text_col(columns, "legal_name")} AS legal_name,
        {text_col(columns, "dba_name")} AS dba_name,
        {text_col(columns, "bus_street_po")} AS bus_street,
        {text_col(columns, "bus_city")} AS bus_city,
        {text_col(columns, "bus_state_code")} AS bus_state,
        {text_col(columns, "bus_zip_code")} AS bus_zip,
        {text_col(columns, "bus_telno")} AS bus_phone
      FROM {qi(table)}
    ) src
    WHERE docket_number IS NOT NULL AND dot_number IS NOT NULL
    ORDER BY docket_number, op_auth_type;

    INSERT INTO carriers (dot_number, legal_name, dba_name, phy_street, phy_city, phy_state, phy_zip, phone, phone_digits, updated_at)
    SELECT DISTINCT ON (dot_number)
      dot_number, legal_name, dba_name, bus_street, bus_city, bus_state, bus_zip, bus_phone,
      {phone_digits("bus_phone")}, now()
    FROM dockets
    WHERE dot_number IS NOT NULL
    ORDER BY dot_number, (op_auth_status ILIKE 'active') DESC
    ON CONFLICT (dot_number) DO UPDATE SET
      legal_name = COALESCE(carriers.legal_name, EXCLUDED.legal_name),
      dba_name = COALESCE(carriers.dba_name, EXCLUDED.dba_name),
      phy_street = COALESCE(carriers.phy_street, EXCLUDED.phy_street),
      phy_city = COALESCE(carriers.phy_city, EXCLUDED.phy_city),
      phy_state = COALESCE(carriers.phy_state, EXCLUDED.phy_state),
      phy_zip = COALESCE(carriers.phy_zip, EXCLUDED.phy_zip),
      phone = COALESCE(carriers.phone, EXCLUDED.phone),
      phone_digits = COALESCE(carriers.phone_digits, EXCLUDED.phone_digits)
    """


def _insur(table: str, columns: set[str]) -> str:
    return f"""
    TRUNCATE insurance_policies;
    INSERT INTO insurance_policies (
      docket_number, dot_number, ins_form_code, ins_type_code, ins_class_code,
      max_cov_amount, underl_lim_amount, policy_no, effective_date, insurance_company_name, trans_date
    )
    SELECT
      {text_col(columns, "docket_number")},
      {norm_dot(columns, "usdot_number")},
      {text_col(columns, "ins_form_code")},
      {text_col(columns, "ins_type_code")},
      {text_col(columns, "ins_class_code")},
      {as_numeric(columns, "max_cov_amount")},
      {as_numeric(columns, "underl_lim_amount")},
      {text_col(columns, "policy_no")},
      {ymd(columns, "effective_date")},
      {text_col(columns, "insurance_company_name")},
      {ymd(columns, "trans_date")}
    FROM {qi(table)}
    WHERE {norm_dot(columns, "usdot_number")} IS NOT NULL
    """


def _authhist(table: str, columns: set[str]) -> str:
    return f"""
    TRUNCATE authority_history;
    INSERT INTO authority_history (docket_number, dot_number, op_auth_type, op_auth_status, reason, status_change_date)
    SELECT
      {text_col(columns, "docket_number")},
      {norm_dot(columns, "usdot_number")},
      {text_col(columns, "op_auth_type")},
      {text_col(columns, "op_auth_status")},
      {text_col(columns, "reason")},
      {ymd(columns, "status_change_date")}
    FROM {qi(table)}
    WHERE {norm_dot(columns, "usdot_number")} IS NOT NULL
    """


def _inshist(table: str, columns: set[str]) -> str:
    return f"""
    TRUNCATE insurance_history;
    INSERT INTO insurance_history (
      docket_number, dot_number, ins_form_code, filing_status_reason, ins_type_code, ins_type_desc,
      policy_no, min_cov_amount, ins_class_code, effective_date, underl_lim_amount, max_cov_amount,
      cancl_effective_date, insurance_company_name
    )
    SELECT
      {text_col(columns, "docket_number")},
      {norm_dot(columns, "usdot_number")},
      {text_col(columns, "ins_form_code")},
      {text_col(columns, "filing_status_reason")},
      {text_col(columns, "ins_type_code")},
      {text_col(columns, "ins_type_desc")},
      {text_col(columns, "policy_no")},
      {as_numeric(columns, "min_cov_amount")},
      {text_col(columns, "ins_class_code")},
      {ymd(columns, "effective_date")},
      {as_numeric(columns, "underl_lim_amount")},
      {as_numeric(columns, "max_cov_amount")},
      {ymd(columns, "cancl_effective_date")},
      {text_col(columns, "insurance_company_name")}
    FROM {qi(table)}
    WHERE {norm_dot(columns, "usdot_number")} IS NOT NULL
    """


def _revoke(table: str, columns: set[str]) -> str:
    return f"""
    TRUNCATE revocations;
    INSERT INTO revocations (docket_number, dot_number, op_auth_type, order_serve_date, order_type, order_effective_date)
    SELECT
      {text_col(columns, "docket_number")},
      {norm_dot(columns, "usdot_number")},
      {text_col(columns, "op_auth_type")},
      {ymd(columns, "order1_serve_date")},
      {text_col(columns, "order1_type_desc")},
      {ymd(columns, "order1_effective_date")}
    FROM {qi(table)}
    WHERE {norm_dot(columns, "usdot_number")} IS NOT NULL
    """


def _boc3(table: str, columns: set[str]) -> str:
    return f"""
    TRUNCATE process_agents;
    INSERT INTO process_agents (docket_number, dot_number, co_name, street, city, state_code, zip_code, country)
    SELECT
      {text_col(columns, "docket_number")},
      {norm_dot(columns, "usdot_number")},
      {text_col(columns, "co_name")},
      {text_col(columns, "street_po")},
      {text_col(columns, "city")},
      {text_col(columns, "state_code")},
      {text_col(columns, "zip_code")},
      {text_col(columns, "ctry_code")}
    FROM {qi(table)}
    WHERE {norm_dot(columns, "usdot_number")} IS NOT NULL
    """


def _inspections(table: str, columns: set[str]) -> str:
    insp_date = ymd(columns, "insp_date")
    return f"""
    TRUNCATE inspections;
    INSERT INTO inspections (
      inspection_id, dot_number, insp_date, report_state, report_number, location, location_desc,
      insp_level_id, viol_total, oos_total, driver_viol_total, driver_oos_total, vehicle_viol_total,
      vehicle_oos_total, hazmat_viol_total, hazmat_oos_total, post_acc_ind, insp_carrier_name,
      insp_carrier_state, docket_number
    )
    SELECT DISTINCT ON (inspection_id)
      inspection_id, dot_number, insp_date, report_state, report_number, location, location_desc,
      insp_level_id, viol_total, oos_total, driver_viol_total, driver_oos_total, vehicle_viol_total,
      vehicle_oos_total, hazmat_viol_total, hazmat_oos_total, post_acc_ind, insp_carrier_name,
      insp_carrier_state, docket_number
    FROM (
      SELECT
        {text_col(columns, "inspection_id")} AS inspection_id,
        {norm_dot(columns, "dot_number")} AS dot_number,
        COALESCE({insp_date}, DATE '1900-01-01') AS insp_date,
        {text_col(columns, "report_state")} AS report_state,
        {text_col(columns, "report_number")} AS report_number,
        {text_col(columns, "location")} AS location,
        {text_col(columns, "location_desc")} AS location_desc,
        {text_col(columns, "insp_level_id")} AS insp_level_id,
        {as_int(columns, "viol_total")} AS viol_total,
        {as_int(columns, "oos_total")} AS oos_total,
        {as_int(columns, "driver_viol_total")} AS driver_viol_total,
        {as_int(columns, "driver_oos_total")} AS driver_oos_total,
        {as_int(columns, "vehicle_viol_total")} AS vehicle_viol_total,
        {as_int(columns, "vehicle_oos_total")} AS vehicle_oos_total,
        {as_int(columns, "hazmat_viol_total")} AS hazmat_viol_total,
        {as_int(columns, "hazmat_oos_total")} AS hazmat_oos_total,
        {text_col(columns, "post_acc_ind")} AS post_acc_ind,
        {text_col(columns, "insp_carrier_name")} AS insp_carrier_name,
        {text_col(columns, "insp_carrier_state")} AS insp_carrier_state,
        {text_col(columns, "docket_number")} AS docket_number
      FROM {qi(table)}
    ) src
    WHERE inspection_id IS NOT NULL AND dot_number IS NOT NULL
    ORDER BY inspection_id, insp_date DESC
    """


def _units(table: str, columns: set[str]) -> str:
    unit_id = text_col(columns, "insp_unit_id")
    vin = text_col(columns, "insp_unit_vehicle_id_number")
    number = text_col(columns, "insp_unit_number")
    return f"""
    TRUNCATE inspection_units;
    INSERT INTO inspection_units (
      inspection_id, insp_unit_id, unit_type, unit_number, unit_make, unit_company,
      license_plate, license_state, vin, decal
    )
    SELECT DISTINCT ON (inspection_id, insp_unit_id)
      inspection_id, insp_unit_id, unit_type, unit_number, unit_make, unit_company,
      license_plate, license_state, vin, decal
    FROM (
      SELECT
        {text_col(columns, "inspection_id")} AS inspection_id,
        COALESCE({unit_id}, md5(COALESCE({text_col(columns, "inspection_id")}, '') || COALESCE({vin}, '') || COALESCE({number}, ''))) AS insp_unit_id,
        {text_col(columns, "insp_unit_type_id")} AS unit_type,
        {number} AS unit_number,
        {text_col(columns, "insp_unit_make")} AS unit_make,
        {text_col(columns, "insp_unit_company")} AS unit_company,
        {text_col(columns, "insp_unit_license")} AS license_plate,
        {text_col(columns, "insp_unit_license_state")} AS license_state,
        {vin} AS vin,
        {text_col(columns, "insp_unit_decal_number")} AS decal
      FROM {qi(table)}
    ) src
    WHERE inspection_id IS NOT NULL AND insp_unit_id IS NOT NULL
    ORDER BY inspection_id, insp_unit_id
    """


def _violations(table: str, columns: set[str]) -> str:
    violation_id = text_col(columns, "insp_violation_id")
    seq_no = text_col(columns, "seq_no")
    code = text_col(columns, "viol_code")
    return f"""
    TRUNCATE inspection_violations;
    INSERT INTO inspection_violations (
      inspection_id, insp_violation_id, seq_no, viol_code, viol_desc, out_of_service, part_no, part_no_section
    )
    SELECT DISTINCT ON (inspection_id, insp_violation_id)
      inspection_id, insp_violation_id, seq_no, viol_code, viol_desc, out_of_service, part_no, part_no_section
    FROM (
      SELECT
        {text_col(columns, "inspection_id")} AS inspection_id,
        COALESCE({violation_id}, md5(COALESCE({text_col(columns, "inspection_id")}, '') || COALESCE({seq_no}, '') || COALESCE({code}, ''))) AS insp_violation_id,
        {seq_no} AS seq_no,
        {code} AS viol_code,
        {text_col(columns, "viol_desc")} AS viol_desc,
        {text_col(columns, "out_of_service_indicator")} AS out_of_service,
        {text_col(columns, "part_no")} AS part_no,
        {text_col(columns, "part_no_section")} AS part_no_section
      FROM {qi(table)}
    ) src
    WHERE inspection_id IS NOT NULL AND insp_violation_id IS NOT NULL
    ORDER BY inspection_id, insp_violation_id
    """


def _crashes(table: str, columns: set[str]) -> str:
    report_date = ymd(columns, "report_date")
    return f"""
    TRUNCATE crashes;
    INSERT INTO crashes (
      crash_id, dot_number, report_date, report_state, report_number, city, state,
      fatalities, injuries, tow_away, federal_recordable, vehicle_configuration_id, vin, agency
    )
    SELECT DISTINCT ON (crash_id)
      crash_id, dot_number, report_date, report_state, report_number, city, state,
      fatalities, injuries, tow_away, federal_recordable, vehicle_configuration_id, vin, agency
    FROM (
      SELECT
        {text_col(columns, "crash_id")} AS crash_id,
        {norm_dot(columns, "dot_number")} AS dot_number,
        COALESCE({report_date}, DATE '1900-01-01') AS report_date,
        {text_col(columns, "report_state")} AS report_state,
        {text_col(columns, "report_number")} AS report_number,
        {text_col(columns, "city")} AS city,
        {text_col(columns, "state")} AS state,
        {as_int(columns, "fatalities")} AS fatalities,
        {as_int(columns, "injuries")} AS injuries,
        {text_col(columns, "tow_away")} AS tow_away,
        {text_col(columns, "federal_recordable")} AS federal_recordable,
        {text_col(columns, "vehicle_configuration_id")} AS vehicle_configuration_id,
        {text_col(columns, "vehicle_identification_number")} AS vin,
        {text_col(columns, "agency")} AS agency
      FROM {qi(table)}
    ) src
    WHERE crash_id IS NOT NULL AND dot_number IS NOT NULL
    ORDER BY crash_id, report_date DESC
    """


def _sms(table: str, columns: set[str]) -> str:
    return f"""
    TRUNCATE sms_measures;
    INSERT INTO sms_measures (
      dot_number, insp_total, driver_insp_total, driver_oos_insp_total, vehicle_insp_total,
      vehicle_oos_insp_total, unsafe_driv_measure, unsafe_driv_ac, hos_driv_measure, hos_driv_ac,
      driv_fit_measure, driv_fit_ac, contr_subst_measure, contr_subst_ac, veh_maint_measure, veh_maint_ac
    )
    SELECT DISTINCT ON (dot_number)
      {norm_dot(columns, "dot_number")} AS dot_number,
      {as_int(columns, "insp_total")},
      {as_int(columns, "driver_insp_total")},
      {as_int(columns, "driver_oos_insp_total")},
      {as_int(columns, "vehicle_insp_total")},
      {as_int(columns, "vehicle_oos_insp_total")},
      {as_numeric(columns, "unsafe_driv_measure")},
      {text_col(columns, "unsafe_driv_ac")},
      {as_numeric(columns, "hos_driv_measure")},
      {text_col(columns, "hos_driv_ac")},
      {as_numeric(columns, "driv_fit_measure")},
      {text_col(columns, "driv_fit_ac")},
      {as_numeric(columns, "contr_subst_measure")},
      {text_col(columns, "contr_subst_ac")},
      {as_numeric(columns, "veh_maint_measure")},
      {text_col(columns, "veh_maint_ac")}
    FROM {qi(table)}
    WHERE {norm_dot(columns, "dot_number")} IS NOT NULL
    ORDER BY dot_number
    """


def _oos(table: str, columns: set[str]) -> str:
    return f"""
    TRUNCATE oos_orders;
    INSERT INTO oos_orders (dot_number, legal_name, dba_name, oos_date, oos_reason, status, rescind_date)
    SELECT
      {norm_dot(columns, "dot_number")},
      {text_col(columns, "legal_name")},
      {text_col(columns, "dba_name")},
      {ymd(columns, "oos_date")},
      {text_col(columns, "oos_reason")},
      {text_col(columns, "status")},
      {ymd(columns, "rescind_date")}
    FROM {qi(table)}
    WHERE {norm_dot(columns, "dot_number")} IS NOT NULL
    """


TRANSFORMS = {
    "census": _census,
    "carrier": _carrier,
    "insur": _insur,
    "authhist": _authhist,
    "inshist": _inshist,
    "revoke": _revoke,
    "boc3": _boc3,
    "inspections": _inspections,
    "units": _units,
    "violations": _violations,
    "crashes": _crashes,
    "sms": _sms,
    "oos": _oos,
}


def recompute(conn) -> None:
    print("  vacuuming carriers", flush=True)
    conn.commit()
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("VACUUM carriers")
    conn.autocommit = False
    print("  aggregating 24-month safety and directory scores", flush=True)
    with conn.cursor() as cur:
        cur.execute("SET work_mem = '256MB'")
        drop_carrier_indexes(cur)
        cur.execute("SELECT recompute_safety_aggregates(NULL)")
        cur.execute("SELECT recompute_carrier_scores(NULL)")
        refresh_insurance_cancellations(cur)
    conn.commit()
    print("  scores saved", flush=True)
    rebuild_carrier_indexes(conn)
