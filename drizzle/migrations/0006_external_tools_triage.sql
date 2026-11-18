CREATE TABLE IF NOT EXISTS public.external_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'search',
  method text NOT NULL DEFAULT 'GET',
  url text NOT NULL,
  headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  params jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  last_test_at timestamptz,
  last_test_status int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS external_tools_user_idx ON public.external_tools(user_id);
--> statement-breakpoint
ALTER TABLE public.external_tools ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "own external tools" ON public.external_tools FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_tools TO authenticated;
--> statement-breakpoint
GRANT ALL ON public.external_tools TO service_role;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.ai_triage_settings (
  user_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  keywords text NOT NULL DEFAULT 'imóvel, imovel, apartamento, casa, flat, aluguel, alugar, comprar, venda, terreno, studio, quarto',
  ignore_known_clients boolean NOT NULL DEFAULT true,
  triage_message text NOT NULL DEFAULT 'Olá! Para te atender melhor, me diga: 1 - Procuro imóvel (comprar ou alugar) | 2 - Coworking | 3 - Já sou cliente ou proprietário',
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE public.ai_triage_settings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "own triage" ON public.ai_triage_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_triage_settings TO authenticated;
--> statement-breakpoint
GRANT ALL ON public.ai_triage_settings TO service_role;
