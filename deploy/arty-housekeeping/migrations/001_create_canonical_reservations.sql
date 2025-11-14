-- Migration: create canonical_reservations table and RLS policies
-- Run this in Supabase SQL editor or via psql using DATABASE_URL

CREATE TABLE IF NOT EXISTS public.canonical_reservations (
  id bigserial PRIMARY KEY,
  reservation_id text,
  room_number text,
  status text,
  guest_name text,
  raw_json jsonb,
  received_at timestamptz DEFAULT now()
);

-- Grant minimal privileges
GRANT SELECT, INSERT ON public.canonical_reservations TO postgres;

-- Enable Row Level Security and policies
ALTER TABLE public.canonical_reservations ENABLE ROW LEVEL SECURITY;

-- Policy: allow service role to insert and select (service role bypasses RLS by default in Supabase, but keep for clarity)
-- No policy needed for service-role, but for named roles you can add policies like below.

-- Example policy to allow authenticated users with app_metadata.role = 'admin' to select/insert
CREATE POLICY "allow_admins_select" ON public.canonical_reservations
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      (current_setting('jwt.claims.role', true) = 'admin')
      OR (current_setting('jwt.claims.email', true) IN (SELECT unnest(string_to_array(coalesce(current_setting('app.admin_emails', ''), ''), ','))))
    )
  );

CREATE POLICY "allow_admins_insert" ON public.canonical_reservations
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      (current_setting('jwt.claims.role', true) = 'admin')
      OR (current_setting('jwt.claims.email', true) IN (SELECT unnest(string_to_array(coalesce(current_setting('app.admin_emails', ''), ''), ','))))
    )
  );

-- Note: The above policies reference Postgres runtime settings and jwt.claims. In Supabase, JWT claims are exposed as postgres settings.
-- Adjust policies to your project's auth model. Service role key bypasses RLS and can be used by server processes.
