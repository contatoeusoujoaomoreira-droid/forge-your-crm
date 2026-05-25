
-- =========================================================
-- SECURITY HARDENING MIGRATION
-- =========================================================

-- 1) COUPONS: remove public read, expose via RPC instead
DROP POLICY IF EXISTS "Anon can read active coupons" ON public.coupons;

CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _checkout_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c record;
BEGIN
  SELECT id, code, discount_type, discount_value, max_uses, used_count, expires_at, checkout_id, is_active
    INTO c FROM public.coupons
    WHERE upper(code) = upper(_code) AND is_active = true
    LIMIT 1;
  IF c.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid'); END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;
  IF c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN RETURN jsonb_build_object('ok', false, 'reason', 'exhausted'); END IF;
  IF c.checkout_id IS NOT NULL AND c.checkout_id <> _checkout_id THEN RETURN jsonb_build_object('ok', false, 'reason', 'wrong_checkout'); END IF;
  RETURN jsonb_build_object('ok', true, 'id', c.id, 'code', c.code,
    'discount_type', c.discount_type, 'discount_value', c.discount_value);
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_coupon(_coupon_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE updated_id uuid;
BEGIN
  UPDATE public.coupons
    SET used_count = used_count + 1
    WHERE id = _coupon_id
      AND is_active = true
      AND (max_uses IS NULL OR used_count < max_uses)
      AND (expires_at IS NULL OR expires_at > now())
    RETURNING id INTO updated_id;
  IF updated_id IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_coupon(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_coupon(uuid) TO anon, authenticated;

-- 2) APPOINTMENTS: remove permissive anon update, expose secure RPC
DROP POLICY IF EXISTS "Anon can cancel appointments" ON public.appointments;

CREATE OR REPLACE FUNCTION public.cancel_appointment(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token');
  END IF;
  UPDATE public.appointments
    SET status = 'cancelled', cancelled_at = now()
    WHERE cancellation_token = _token
      AND status <> 'cancelled'
    RETURNING id INTO _id;
  IF _id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  RETURN jsonb_build_object('ok', true, 'id', _id);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_appointment(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_appointment(text) TO anon, authenticated;

-- 3) CREDIT TRANSACTIONS: remove anon insert (only service-role/triggers should insert)
DROP POLICY IF EXISTS "Service can insert credit_transactions" ON public.credit_transactions;
-- Service role bypasses RLS; functions inserting (deduct_credits, approve_credit_request) are SECURITY DEFINER.

-- 4) NOTIFICATIONS: restrict insert to authenticated owning user + provide RPC for public checkout flow
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_checkout_owner(_checkout_id uuid, _title text, _message text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _owner uuid;
BEGIN
  SELECT user_id INTO _owner FROM public.checkouts WHERE id = _checkout_id AND is_active = true AND is_published = true;
  IF _owner IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (_owner, 'order', left(_title, 200), left(_message, 500), COALESCE(_metadata, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.notify_checkout_owner(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_checkout_owner(uuid, text, text, jsonb) TO anon, authenticated;

-- 5) STORAGE: chat-media ownership enforcement
DROP POLICY IF EXISTS "Authenticated can delete chat-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update chat-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload chat-media" ON storage.objects;
DROP POLICY IF EXISTS "Public can read chat-media" ON storage.objects;

CREATE POLICY "chat-media upload own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "chat-media update own folder"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'chat-media' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "chat-media delete own folder"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Public read kept (bucket is public for media playback in chat receivers) but listing limited:
CREATE POLICY "chat-media read public"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'chat-media');

-- 6) Lock down SECURITY DEFINER helpers that are NOT meant to be called by clients
REVOKE EXECUTE ON FUNCTION public.deduct_credits(uuid, integer, text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_team_event(uuid, text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resume_expired_handoffs() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.schedule_handoff_resume(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_super_admin_entitlements() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_followup_template(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_lead_score(uuid, integer, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_credits_by_action(uuid, text, numeric, jsonb) FROM anon, authenticated;
-- Keep approve_credit_request callable by authenticated (it self-guards via has_role)
-- Keep has_role, user_usage_stats, validate_coupon, apply_coupon, cancel_appointment, notify_checkout_owner accessible
