BEGIN;

CREATE TABLE IF NOT EXISTS public.evidence_records (
  record_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agreement_id numeric NOT NULL CHECK (
    agreement_id = trunc(agreement_id) AND agreement_id BETWEEN 1 AND
      115792089237316195423570985008687907853269984665640564039457584007913129639935
  ),
  claim_id numeric NOT NULL CHECK (
    claim_id = trunc(claim_id) AND claim_id BETWEEN 1 AND
      115792089237316195423570985008687907853269984665640564039457584007913129639935
  ),
  evidence_hash text NOT NULL CHECK (evidence_hash ~ '^0x[0-9a-fA-F]{64}$'),
  source text NOT NULL CHECK (source = 'DEMO_FIXTURE'),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 4000),
  external_url text CHECK (external_url LIKE 'https://%')
);

CREATE INDEX IF NOT EXISTS evidence_records_agreement_page_idx
  ON public.evidence_records (agreement_id, record_id);

COMMIT;
