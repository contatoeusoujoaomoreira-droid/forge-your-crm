ALTER TABLE public.pipeline_stages
  ADD COLUMN IF NOT EXISTS capi_event_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS capi_event_name text,
  ADD COLUMN IF NOT EXISTS capi_event_value numeric,
  ADD COLUMN IF NOT EXISTS capi_currency text NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS send_advanced_emq boolean NOT NULL DEFAULT true;

ALTER TABLE public.meta_event_log
  ADD COLUMN IF NOT EXISTS stage_id uuid,
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_meta_event_log_user_created ON public.meta_event_log(user_id, created_at DESC);

ALTER TABLE public.meta_event_log REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meta_event_log;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

CREATE OR REPLACE FUNCTION public.trg_lead_stage_capi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  st RECORD;
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id AND NEW.stage_id IS NOT NULL THEN
    SELECT * INTO st FROM public.pipeline_stages WHERE id = NEW.stage_id;
    IF st.id IS NOT NULL AND st.capi_event_active THEN
      PERFORM net.http_post(
        url := 'https://jdsomjwynxetccrcdszt.supabase.co/functions/v1/process-meta-capi',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := jsonb_build_object(
          'user_id', NEW.user_id,
          'lead_id', NEW.id,
          'stage_id', NEW.stage_id,
          'is_test', false
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_lead_stage_capi ON public.leads;
CREATE TRIGGER trg_lead_stage_capi
AFTER UPDATE OF stage_id ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.trg_lead_stage_capi();