
ALTER TABLE public.whatsapp_configs
  ADD COLUMN IF NOT EXISTS hide_group_messages boolean NOT NULL DEFAULT false;

INSERT INTO public.model_credit_costs (provider, model, label, credits_per_message, is_active) VALUES
  ('lovable', 'google/gemini-3-pro-preview', 'Gemini 3 Pro (preview)', 4, true),
  ('lovable', 'google/gemini-3.1-pro-preview', 'Gemini 3.1 Pro (preview)', 4, true),
  ('lovable', 'google/gemini-3.1-flash-lite-preview', 'Gemini 3.1 Flash Lite (preview)', 1, true),
  ('lovable', 'google/gemini-3.5-flash', 'Gemini 3.5 Flash', 2, true),
  ('lovable', 'openai/gpt-5.2', 'GPT-5.2', 5, true),
  ('lovable', 'openai/gpt-5.4-nano', 'GPT-5.4 Nano', 1, true),
  ('lovable', 'openai/gpt-5.4-mini', 'GPT-5.4 Mini', 3, true),
  ('lovable', 'openai/gpt-5.4', 'GPT-5.4', 5, true),
  ('lovable', 'openai/gpt-5.4-pro', 'GPT-5.4 Pro', 7, true),
  ('lovable', 'openai/gpt-5.5', 'GPT-5.5', 6, true),
  ('lovable', 'openai/gpt-5.5-pro', 'GPT-5.5 Pro', 8, true)
ON CONFLICT (provider, model) DO UPDATE
  SET label = EXCLUDED.label,
      credits_per_message = EXCLUDED.credits_per_message,
      is_active = true;
