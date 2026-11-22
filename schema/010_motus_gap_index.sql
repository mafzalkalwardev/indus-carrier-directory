-- Speeds Motus enrich gap selection (active carriers missing phone+email).
CREATE INDEX CONCURRENTLY IF NOT EXISTS carriers_motus_contact_gap
  ON carriers (dot_number)
  WHERE authority_status = 'Active'
    AND (phone IS NULL OR btrim(phone) = '')
    AND (email IS NULL OR btrim(email) = '');
