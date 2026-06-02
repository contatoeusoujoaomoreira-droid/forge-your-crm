
-- 1) Attribution conversions
CREATE TABLE public.attribution_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  touchpoint_id UUID,
  lead_id UUID,
  order_id UUID,
  appointment_id UUID,
  conversion_type TEXT NOT NULL DEFAULT 'order',
  value NUMERIC NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  converted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attr_conv_user ON public.attribution_conversions(user_id, converted_at DESC);
CREATE INDEX idx_attr_conv_touch ON public.attribution_conversions(touchpoint_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attribution_conversions TO authenticated;
GRANT ALL ON public.attribution_conversions TO service_role;
ALTER TABLE public.attribution_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own conversions" ON public.attribution_conversions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2) Ad campaign spend (used by Rastreador + Meta Ads sync)
CREATE TABLE public.ad_campaign_spend (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign TEXT NOT NULL,
  spend_date DATE NOT NULL DEFAULT CURRENT_DATE,
  spend NUMERIC NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, campaign, spend_date, source)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_campaign_spend TO authenticated;
GRANT ALL ON public.ad_campaign_spend TO service_role;
ALTER TABLE public.ad_campaign_spend ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ad_spend" ON public.ad_campaign_spend
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3) Meta Ads configs
CREATE TABLE public.meta_ads_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT,
  ad_account_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_ads_configs TO authenticated;
GRANT ALL ON public.meta_ads_configs TO service_role;
ALTER TABLE public.meta_ads_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own meta_ads_configs" ON public.meta_ads_configs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4) Helper: find latest touchpoint by phone/email/lead_id and create conversion
CREATE OR REPLACE FUNCTION public.link_order_to_attribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_phone text;
  v_email text;
  v_touch record;
BEGIN
  SELECT user_id INTO v_user_id FROM public.checkouts WHERE id = NEW.checkout_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  v_phone := regexp_replace(COALESCE(NEW.customer_phone,''), '\D', '', 'g');
  v_email := lower(COALESCE(NEW.customer_email,''));

  SELECT t.* INTO v_touch FROM public.attribution_touchpoints t
   WHERE t.user_id = v_user_id
     AND t.captured_at >= now() - interval '30 days'
     AND (
       (NEW.lead_id IS NOT NULL AND t.lead_id = NEW.lead_id)
       OR (v_phone <> '' AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = t.lead_id AND regexp_replace(COALESCE(l.phone,''),'\D','','g') = v_phone))
       OR (v_email <> '' AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = t.lead_id AND lower(COALESCE(l.email,'')) = v_email))
     )
   ORDER BY t.captured_at DESC
   LIMIT 1;

  IF v_touch.id IS NOT NULL THEN
    INSERT INTO public.attribution_conversions (user_id, touchpoint_id, lead_id, order_id, conversion_type, value, meta)
      VALUES (v_user_id, v_touch.id, v_touch.lead_id, NEW.id, 'order', NEW.total, jsonb_build_object('checkout_id', NEW.checkout_id));
    UPDATE public.attribution_touchpoints
      SET conversion_value = conversion_value + NEW.total
      WHERE id = v_touch.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_order_attribution ON public.orders;
CREATE TRIGGER trg_link_order_attribution
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.link_order_to_attribution();
