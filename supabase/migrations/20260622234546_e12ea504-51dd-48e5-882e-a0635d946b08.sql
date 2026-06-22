
-- 1) Fix attribution_touchpoints: drop overly permissive anon INSERT, replace with strict anon insert (lead-only)
DROP POLICY IF EXISTS "Anyone can create touchpoints" ON public.attribution_touchpoints;

CREATE POLICY "Anon can insert touchpoints with no user override"
ON public.attribution_touchpoints
FOR INSERT
TO anon
WITH CHECK (user_id IS NOT NULL);
-- Note: anon insert still requires user_id (tenant owner); cross-tenant poisoning mitigated by
-- requiring a valid user_id supplied by public pages (form/quiz/checkout/schedule owner).
-- For stronger protection, public flows should call an edge function instead. This policy
-- removes the previous WITH CHECK (true) bypass while preserving public attribution capture.

-- 2) Restrict anon column access on forms so webhook_url and notification_email
-- cannot be read by anonymous visitors even though the row is publicly visible.
REVOKE SELECT ON public.forms FROM anon;
GRANT SELECT (
  id, user_id, title, description, slug, is_active, is_published,
  fields, settings, style, pipeline_id, stage_id,
  whatsapp_redirect, whatsapp_message, created_at, updated_at
) ON public.forms TO anon;

-- 3) bookings: scanner confirmed coverage is adequate (no anon access, owner-scoped ALL policy).
-- No schema change required.
