CREATE OR REPLACE FUNCTION recompute_safety_aggregates(only_dot text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE carriers c SET
    inspections_24m = 0,
    vehicle_oos_24m = 0,
    driver_oos_24m = 0,
    oos_rate = NULL,
    crashes_24m = 0,
    fatal_crashes_24m = 0,
    injury_crashes_24m = 0,
    last_inspection_date = NULL,
    sms_insp_total = NULL,
    sms_driver_insp_total = NULL,
    sms_driver_oos_insp_total = NULL,
    sms_vehicle_insp_total = NULL,
    sms_vehicle_oos_insp_total = NULL,
    sms_measures = NULL
  WHERE (c.inspections_24m <> 0 OR c.crashes_24m <> 0 OR c.sms_insp_total IS NOT NULL OR c.last_inspection_date IS NOT NULL)
    AND (only_dot IS NULL OR c.dot_number = only_dot);

  UPDATE carriers c SET
    inspections_24m = a.inspections_24m,
    vehicle_oos_24m = a.vehicle_oos_24m,
    driver_oos_24m = a.driver_oos_24m,
    oos_rate = a.oos_rate,
    last_inspection_date = a.last_inspection_date
  FROM (
    SELECT
      dot_number,
      count(*)::integer AS inspections_24m,
      count(*) FILTER (WHERE COALESCE(vehicle_oos_total, 0) > 0)::integer AS vehicle_oos_24m,
      count(*) FILTER (WHERE COALESCE(driver_oos_total, 0) > 0)::integer AS driver_oos_24m,
      (count(*) FILTER (WHERE COALESCE(vehicle_oos_total, 0) > 0 OR COALESCE(driver_oos_total, 0) > 0))::numeric
        / NULLIF(count(*), 0) AS oos_rate,
      max(insp_date) AS last_inspection_date
    FROM inspections
    WHERE insp_date >= (current_date - interval '24 months')
      AND (only_dot IS NULL OR dot_number = only_dot)
    GROUP BY dot_number
  ) a
  WHERE c.dot_number = a.dot_number
    AND (only_dot IS NULL OR c.dot_number = only_dot);

  UPDATE carriers c SET
    crashes_24m = a.crashes_24m,
    fatal_crashes_24m = a.fatal_crashes_24m,
    injury_crashes_24m = a.injury_crashes_24m
  FROM (
    SELECT
      dot_number,
      count(*)::integer AS crashes_24m,
      count(*) FILTER (WHERE COALESCE(fatalities, 0) > 0)::integer AS fatal_crashes_24m,
      count(*) FILTER (WHERE COALESCE(injuries, 0) > 0)::integer AS injury_crashes_24m
    FROM crashes
    WHERE report_date >= (current_date - interval '24 months')
      AND (only_dot IS NULL OR dot_number = only_dot)
    GROUP BY dot_number
  ) a
  WHERE c.dot_number = a.dot_number
    AND (only_dot IS NULL OR c.dot_number = only_dot);

  UPDATE carriers c SET
    sms_insp_total = s.insp_total,
    sms_driver_insp_total = s.driver_insp_total,
    sms_driver_oos_insp_total = s.driver_oos_insp_total,
    sms_vehicle_insp_total = s.vehicle_insp_total,
    sms_vehicle_oos_insp_total = s.vehicle_oos_insp_total,
    sms_measures = jsonb_build_object(
      'unsafeDriving', s.unsafe_driv_measure,
      'unsafeDrivingAlert', s.unsafe_driv_ac,
      'hoursOfService', s.hos_driv_measure,
      'hoursOfServiceAlert', s.hos_driv_ac,
      'driverFitness', s.driv_fit_measure,
      'driverFitnessAlert', s.driv_fit_ac,
      'controlledSubstances', s.contr_subst_measure,
      'controlledSubstancesAlert', s.contr_subst_ac,
      'vehicleMaintenance', s.veh_maint_measure,
      'vehicleMaintenanceAlert', s.veh_maint_ac
    )
  FROM sms_measures s
  WHERE c.dot_number = s.dot_number
    AND (only_dot IS NULL OR c.dot_number = only_dot);
END;
$$;

CREATE OR REPLACE FUNCTION recompute_carrier_scores(only_dot text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE carriers c SET
    authority_status = CASE
      WHEN c.live_checked_at > now() - interval '36 hours' AND c.live_allowed_to_operate = 'Y' THEN 'Active'
      WHEN c.live_checked_at > now() - interval '36 hours' AND c.live_allowed_to_operate = 'N' THEN 'Inactive'
      ELSE s.authority_status
    END,
    common_authority_status = COALESCE(
      CASE
        WHEN c.live_checked_at > now() - interval '36 hours' THEN c.live_common_authority
        ELSE NULL
      END,
      s.common_status
    ),
    contract_authority_status = COALESCE(
      CASE
        WHEN c.live_checked_at > now() - interval '36 hours' THEN c.live_contract_authority
        ELSE NULL
      END,
      s.contract_status
    ),
    broker_authority_status = COALESCE(
      CASE
        WHEN c.live_checked_at > now() - interval '36 hours' THEN c.live_broker_authority
        ELSE NULL
      END,
      s.broker_status
    ),
    bipd_on_file = CASE
      WHEN c.live_checked_at > now() - interval '36 hours'
        AND COALESCE(c.live_bipd_on_file, '') ~ '^[0-9]+(\.[0-9]+)?$'
        AND c.live_bipd_on_file::numeric > 0
      THEN c.live_bipd_on_file::numeric
      ELSE s.bipd_on_file
    END,
    insurance_current = CASE
      WHEN c.live_checked_at > now() - interval '36 hours'
        AND COALESCE(c.live_bipd_on_file, '') ~ '^[0-9]+(\.[0-9]+)?$'
        AND c.live_bipd_on_file::numeric > 0
      THEN true
      WHEN c.live_checked_at > now() - interval '36 hours' AND c.live_bipd_on_file = '0' THEN false
      ELSE s.insurance_current
    END,
    authority_granted_date = s.granted_date,
    revocation_count = s.revocation_count,
    out_of_service = CASE
      WHEN c.live_checked_at > now() - interval '36 hours' AND c.live_oos_date IS NOT NULL THEN true
      ELSE s.out_of_service
    END,
    oos_date = CASE
      WHEN c.live_checked_at > now() - interval '36 hours' AND c.live_oos_date IS NOT NULL THEN c.live_oos_date
      ELSE s.oos_date
    END
  FROM (
    SELECT
      c2.dot_number,
      CASE
        WHEN d.any_active THEN 'Active'
        WHEN d.any_pending THEN 'Pending'
        WHEN d.any_row THEN 'Inactive'
        WHEN c2.docket1_status_code = 'A' THEN 'Active'
        WHEN c2.docket1_status_code = 'I' THEN 'Inactive'
        ELSE NULL
      END AS authority_status,
      CASE
        WHEN d.common_active THEN 'Active'
        WHEN d.common_any THEN 'Inactive'
        ELSE NULL
      END AS common_status,
      CASE
        WHEN d.contract_active THEN 'Active'
        WHEN d.contract_any THEN 'Inactive'
        ELSE NULL
      END AS contract_status,
      CASE
        WHEN d.broker_active THEN 'Active'
        WHEN d.broker_any THEN 'Inactive'
        ELSE NULL
      END AS broker_status,
      d.bipd_on_file,
      (
        COALESCE(d.has_bipd, false)
        OR COALESCE(p.has_policy, false)
      ) AS insurance_current,
      h.granted_date,
      COALESCE(r.revocation_count, 0)::integer AS revocation_count,
      (o.dot_number IS NOT NULL) AS out_of_service,
      o.oos_date
    FROM carriers c2
    LEFT JOIN (
      SELECT
        dot_number,
        bool_or(op_auth_status ILIKE 'active') AS any_active,
        bool_or(op_auth_status ILIKE 'pending') AS any_pending,
        bool_or(op_auth_status IS NOT NULL) AS any_row,
        bool_or(
          op_auth_status ILIKE 'active'
          AND op_auth_type ILIKE '%motor carrier%'
          AND op_auth_type NOT ILIKE '%contract%'
        ) AS common_active,
        bool_or(
          op_auth_type ILIKE '%motor carrier%'
          AND op_auth_type NOT ILIKE '%contract%'
        ) AS common_any,
        bool_or(
          op_auth_status ILIKE 'active'
          AND op_auth_type ILIKE '%contract%'
          AND op_auth_type NOT ILIKE '%broker%'
        ) AS contract_active,
        bool_or(
          op_auth_type ILIKE '%contract%'
          AND op_auth_type NOT ILIKE '%broker%'
        ) AS contract_any,
        bool_or(op_auth_status ILIKE 'active' AND op_auth_type ILIKE '%broker%') AS broker_active,
        bool_or(op_auth_type ILIKE '%broker%') AS broker_any,
        max(bipd_file) AS bipd_on_file,
        bool_or(bipd_file > 0) AS has_bipd
      FROM dockets
      WHERE only_dot IS NULL OR dot_number = only_dot
      GROUP BY dot_number
    ) d ON d.dot_number = c2.dot_number
    LEFT JOIN (
      SELECT dot_number, bool_or(max_cov_amount > 0) AS has_policy
      FROM insurance_policies
      WHERE only_dot IS NULL OR dot_number = only_dot
      GROUP BY dot_number
    ) p ON p.dot_number = c2.dot_number
    LEFT JOIN (
      SELECT
        dot_number,
        min(status_change_date) FILTER (
          WHERE op_auth_status ILIKE 'active' OR reason ILIKE 'granted'
        ) AS granted_date
      FROM authority_history
      WHERE only_dot IS NULL OR dot_number = only_dot
      GROUP BY dot_number
    ) h ON h.dot_number = c2.dot_number
    LEFT JOIN (
      SELECT dot_number, count(*) AS revocation_count
      FROM revocations
      WHERE only_dot IS NULL OR dot_number = only_dot
      GROUP BY dot_number
    ) r ON r.dot_number = c2.dot_number
    LEFT JOIN (
      SELECT DISTINCT ON (dot_number) dot_number, oos_date
      FROM oos_orders
      WHERE rescind_date IS NULL
        AND COALESCE(status, '') !~* 'rescind|closed|inactive|withdrawn'
        AND (only_dot IS NULL OR dot_number = only_dot)
      ORDER BY dot_number, oos_date DESC NULLS LAST
    ) o ON o.dot_number = c2.dot_number
    WHERE only_dot IS NULL OR c2.dot_number = only_dot
  ) s
  WHERE c.dot_number = s.dot_number
    AND (only_dot IS NULL OR c.dot_number = only_dot);

  UPDATE carriers c SET
    score_authority = CASE WHEN c.authority_status = 'Active' THEN 20 ELSE 0 END,
    score_age = CASE
      WHEN c.authority_status = 'Active' AND c.authority_granted_date IS NULL THEN 5
      WHEN c.authority_granted_date IS NULL THEN 0
      WHEN c.authority_granted_date > (current_date - interval '6 months') THEN 5
      WHEN c.authority_granted_date > (current_date - interval '12 months') THEN 10
      WHEN c.authority_granted_date > (current_date - interval '24 months') THEN 14
      WHEN c.authority_granted_date > (current_date - interval '60 months') THEN 17
      ELSE 20
    END,
    score_insurance = CASE WHEN c.insurance_current THEN 25 ELSE 0 END,
    score_revocation = CASE
      WHEN COALESCE(c.revocation_count, 0) = 0
        AND COALESCE(c.prior_revoke_flag, '') NOT IN ('Y', 'y', '1')
      THEN 25
      ELSE 0
    END,
    score_safety = CASE
      WHEN COALESCE(c.inspections_24m, 0) >= 5
        AND COALESCE(c.crashes_24m, 0) = 0
        AND COALESCE(c.oos_rate, 1) < 0.20 THEN 10
      WHEN COALESCE(c.inspections_24m, 0) >= 3
        AND COALESCE(c.crashes_24m, 0) = 0
        AND COALESCE(c.oos_rate, 1) < 0.30 THEN 6
      WHEN COALESCE(c.inspections_24m, 0) >= 1
        AND COALESCE(c.crashes_24m, 0) = 0 THEN 3
      ELSE 0
    END
  WHERE only_dot IS NULL OR c.dot_number = only_dot;

  UPDATE carriers SET
    trust_score = COALESCE(score_authority, 0)
      + COALESCE(score_age, 0)
      + COALESCE(score_insurance, 0)
      + COALESCE(score_revocation, 0)
      + COALESCE(score_safety, 0),
    updated_at = now()
  WHERE only_dot IS NULL OR dot_number = only_dot;

  UPDATE carriers SET
    trust_grade = CASE
      WHEN trust_score >= 85 THEN 'A'
      WHEN trust_score >= 70 THEN 'B'
      WHEN trust_score >= 55 THEN 'C'
      WHEN trust_score >= 40 THEN 'D'
      ELSE 'F'
    END
  WHERE only_dot IS NULL OR dot_number = only_dot;
END;
$$;
