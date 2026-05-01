
-- Phase 1: Add new columns to ai_agents for routing, handoff, follow-up, and schedule integration
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS notification_phone text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS handoff_mode text NOT NULL DEFAULT 'pause',
  ADD COLUMN IF NOT EXISTS handoff_pause_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS followup_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS followup_max_attempts integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS followup_interval_minutes integer NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS followup_rescue_message text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS linked_schedule_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS schedule_can_query boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS schedule_can_book boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS schedule_keywords text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS intent_routing_rules jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Phase 2: Add reminder fields to schedules
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_minutes_before integer NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS reminder_message text DEFAULT 'Olá {nome}! 👋 Lembrando que você tem um agendamento hoje às {hora}. Nos vemos em breve!';

-- Phase 3: Create stage_triggers table for CRM automation
CREATE TABLE IF NOT EXISTS public.stage_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stage_id uuid NOT NULL,
  trigger_event text NOT NULL DEFAULT 'enter',
  action_type text NOT NULL DEFAULT 'notify_whatsapp',
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.stage_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own stage_triggers"
  ON public.stage_triggers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_stage_triggers_updated_at
  BEFORE UPDATE ON public.stage_triggers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
