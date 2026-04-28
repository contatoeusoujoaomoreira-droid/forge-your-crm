
-- 1) Desativar duplicatas de instance_id, mantendo a mais recente ativa por instance_id
WITH ranked AS (
  SELECT id, instance_id,
         ROW_NUMBER() OVER (PARTITION BY instance_id ORDER BY updated_at DESC, created_at DESC) AS rn
  FROM public.whatsapp_configs
  WHERE instance_id IS NOT NULL AND instance_id <> ''
)
UPDATE public.whatsapp_configs c
SET is_active = false
FROM ranked r
WHERE c.id = r.id AND r.rn > 1;

-- 2) Índice único parcial: cada instance_id ATIVO só pode existir uma vez globalmente
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_configs_instance_active_uniq
  ON public.whatsapp_configs(instance_id)
  WHERE is_active = true AND instance_id IS NOT NULL AND instance_id <> '';
