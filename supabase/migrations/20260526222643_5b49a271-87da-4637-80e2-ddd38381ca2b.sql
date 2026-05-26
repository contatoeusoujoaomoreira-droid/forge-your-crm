DROP POLICY IF EXISTS "Service can insert chat_clients" ON public.chat_clients;
DROP POLICY IF EXISTS "Service can manage conversation_state" ON public.conversation_state;
DROP POLICY IF EXISTS "Service can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Service inserts webhook_logs" ON public.webhook_logs;

REVOKE INSERT ON public.chat_clients FROM anon;
REVOKE INSERT ON public.conversation_state FROM anon;
REVOKE INSERT ON public.messages FROM anon;
REVOKE INSERT ON public.webhook_logs FROM anon;