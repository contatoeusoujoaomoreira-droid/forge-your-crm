ALTER TABLE public.managed_users DROP CONSTRAINT IF EXISTS managed_users_tier_check;
ALTER TABLE public.managed_users
  ADD CONSTRAINT managed_users_tier_check CHECK (tier IN ('super_admin','unlimited','professional','basic'));

INSERT INTO public.credit_costs (action, label, unit, credits_per_unit, provider_cost_estimate, markup_multiplier, notes)
VALUES
  ('knowledge_ingest', 'Ingestão de conhecimento (PDF/imagem/URL)', 'document', 5, 0.01, 3.0, 'Cobrado uma vez por documento processado'),
  ('flow_button_send', 'Envio de botões interativos no fluxo', 'message', 1, 0.001, 3.0, 'Mensagem do fluxo com botões clicáveis')
ON CONFLICT (action) DO NOTHING;