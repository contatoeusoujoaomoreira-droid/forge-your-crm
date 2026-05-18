-- Remove duplicate WhatsApp messages before enforcing uniqueness
WITH ranked_messages AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, external_message_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.messages
  WHERE external_message_id IS NOT NULL
    AND btrim(external_message_id) <> ''
)
DELETE FROM public.messages m
USING ranked_messages r
WHERE m.id = r.id
  AND r.rn > 1;

-- Ensure duplicated provider callbacks cannot create duplicate chat messages
CREATE UNIQUE INDEX IF NOT EXISTS messages_user_external_message_id_unique
ON public.messages (user_id, external_message_id)
WHERE external_message_id IS NOT NULL
  AND btrim(external_message_id) <> '';

-- Clean up duplicated chat clients with the same normalized phone/user before enforcing uniqueness
WITH ranked_clients AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, phone
      ORDER BY updated_at DESC NULLS LAST, created_at DESC, id DESC
    ) AS rn,
    first_value(id) OVER (
      PARTITION BY user_id, phone
      ORDER BY updated_at DESC NULLS LAST, created_at DESC, id DESC
    ) AS keep_id
  FROM public.chat_clients
  WHERE phone IS NOT NULL
    AND btrim(phone) <> ''
), moved_messages AS (
  UPDATE public.messages m
  SET client_id = r.keep_id
  FROM ranked_clients r
  WHERE m.client_id = r.id
    AND r.rn > 1
  RETURNING m.id
), moved_states AS (
  UPDATE public.conversation_state cs
  SET client_id = r.keep_id
  FROM ranked_clients r
  WHERE cs.client_id = r.id
    AND r.rn > 1
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_state existing
      WHERE existing.client_id = r.keep_id
    )
  RETURNING cs.id
)
DELETE FROM public.chat_clients c
USING ranked_clients r
WHERE c.id = r.id
  AND r.rn > 1;

-- Keep one conversation per normalized phone/user
CREATE UNIQUE INDEX IF NOT EXISTS chat_clients_user_phone_unique
ON public.chat_clients (user_id, phone)
WHERE phone IS NOT NULL
  AND btrim(phone) <> '';

-- Ensure one state row per chat client so upserts do not fan out
CREATE UNIQUE INDEX IF NOT EXISTS conversation_state_client_id_unique
ON public.conversation_state (client_id);