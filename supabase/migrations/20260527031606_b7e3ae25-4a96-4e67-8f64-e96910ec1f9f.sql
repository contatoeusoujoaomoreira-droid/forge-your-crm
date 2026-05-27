
-- 1. Appointments DELETE policy (schedule owner)
CREATE POLICY "Users delete own appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (schedule_id IN (SELECT id FROM public.schedules WHERE user_id = auth.uid()));

-- 2. Remove anon INSERT policy on chat-media bucket
DROP POLICY IF EXISTS "Service can upload chat-media" ON storage.objects;

-- Ensure authenticated users can upload to their own folder in chat-media
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Authenticated upload to chat-media') THEN
    CREATE POLICY "Authenticated upload to chat-media"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'chat-media');
  END IF;
END $$;

-- 3. Realtime channel authorization — restrict subscriptions to topics owned by the authenticated user.
-- Convention: channel topic must equal the user's auth.uid() (or be prefixed with it like "<uid>:...").
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users subscribe to own realtime topics" ON realtime.messages;
CREATE POLICY "Users subscribe to own realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() = auth.uid()::text)
  OR (realtime.topic() LIKE auth.uid()::text || ':%')
  OR (realtime.topic() LIKE 'user:' || auth.uid()::text || '%')
);

DROP POLICY IF EXISTS "Users broadcast to own realtime topics" ON realtime.messages;
CREATE POLICY "Users broadcast to own realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (realtime.topic() = auth.uid()::text)
  OR (realtime.topic() LIKE auth.uid()::text || ':%')
  OR (realtime.topic() LIKE 'user:' || auth.uid()::text || '%')
);
