CREATE UNIQUE INDEX IF NOT EXISTS messages_user_external_message_unique
ON public.messages (user_id, external_message_id)
WHERE external_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS chat_clients_user_phone_unique
ON public.chat_clients (user_id, phone)
WHERE phone IS NOT NULL;