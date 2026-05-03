
-- Team alerts config (per-user)
CREATE TABLE IF NOT EXISTS public.team_alerts_config (
  user_id uuid PRIMARY KEY,
  phones jsonb NOT NULL DEFAULT '[]'::jsonb,
  events jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_alerts_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own team_alerts_config"
  ON public.team_alerts_config FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_team_alerts_updated
  BEFORE UPDATE ON public.team_alerts_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Generic event dispatch
CREATE OR REPLACE FUNCTION public.notify_team_event(_user_id uuid, _event text, _payload jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://jdsomjwynxetccrcdszt.supabase.co/functions/v1/cron-worker',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('event', _event, 'user_id', _user_id, 'payload', _payload)
  );
END; $$;

-- Appointments: created / cancelled
CREATE OR REPLACE FUNCTION public.trg_appointment_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid; _event text;
BEGIN
  SELECT user_id INTO _uid FROM public.schedules WHERE id = NEW.schedule_id;
  IF _uid IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN _event := 'appointment_created';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN _event := 'appointment_cancelled';
  ELSE RETURN NEW;
  END IF;
  PERFORM public.notify_team_event(_uid, _event, jsonb_build_object(
    'appointment_id', NEW.id, 'guest_name', NEW.guest_name, 'guest_phone', NEW.guest_phone,
    'date', NEW.date, 'time', NEW.time, 'schedule_id', NEW.schedule_id
  ));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_appointment_notify ON public.appointments;
CREATE TRIGGER trg_appointment_notify
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.trg_appointment_event();

-- Orders: created
CREATE OR REPLACE FUNCTION public.trg_order_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  SELECT user_id INTO _uid FROM public.checkouts WHERE id = NEW.checkout_id;
  IF _uid IS NULL THEN RETURN NEW; END IF;
  PERFORM public.notify_team_event(_uid, 'order_created', jsonb_build_object(
    'order_id', NEW.id, 'customer', NEW.customer_name, 'phone', NEW.customer_phone,
    'total', NEW.total, 'status', NEW.status
  ));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_order_notify ON public.orders;
CREATE TRIGGER trg_order_notify AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_order_event();

-- Forms responses
CREATE OR REPLACE FUNCTION public.trg_form_response_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid; _title text;
BEGIN
  SELECT user_id, title INTO _uid, _title FROM public.forms WHERE id = NEW.form_id;
  IF _uid IS NULL THEN RETURN NEW; END IF;
  PERFORM public.notify_team_event(_uid, 'form_submitted', jsonb_build_object(
    'form_id', NEW.form_id, 'form_title', _title, 'response_id', NEW.id
  ));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_form_response_notify ON public.form_responses;
CREATE TRIGGER trg_form_response_notify AFTER INSERT ON public.form_responses
  FOR EACH ROW EXECUTE FUNCTION public.trg_form_response_event();

-- Lead won
CREATE OR REPLACE FUNCTION public.trg_lead_won_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'won' AND OLD.status IS DISTINCT FROM 'won' THEN
    PERFORM public.notify_team_event(NEW.user_id, 'lead_won', jsonb_build_object(
      'lead_id', NEW.id, 'name', NEW.name, 'value', NEW.value
    ));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_lead_won_notify ON public.leads;
CREATE TRIGGER trg_lead_won_notify AFTER UPDATE OF status ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.trg_lead_won_event();
