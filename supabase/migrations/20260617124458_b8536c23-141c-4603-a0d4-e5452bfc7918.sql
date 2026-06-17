
-- 1) attribution_touchpoints: restrict anon insert to require user_id to belong to an existing owner referenced by lead/etc.
-- The safest fix is to require authenticated user with user_id = auth.uid(), and drop anon inserts.
-- Public attribution capture must go through an edge function with service_role.
DROP POLICY IF EXISTS "Anyone can insert touchpoints" ON public.attribution_touchpoints;
DROP POLICY IF EXISTS "Anon insert touchpoints" ON public.attribution_touchpoints;
DROP POLICY IF EXISTS "Public insert attribution_touchpoints" ON public.attribution_touchpoints;
DROP POLICY IF EXISTS "Allow public insert" ON public.attribution_touchpoints;
DROP POLICY IF EXISTS "Insert attribution touchpoints" ON public.attribution_touchpoints;

CREATE POLICY "Authenticated users insert own touchpoints"
ON public.attribution_touchpoints
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 2) chat-media bucket: enforce folder prefix on upload
DROP POLICY IF EXISTS "Authenticated upload to chat-media" ON storage.objects;
CREATE POLICY "Authenticated upload to chat-media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 3) conversation_locks: explicit service-role-only policy (documented intent)
CREATE POLICY "Service role manages conversation_locks"
ON public.conversation_locks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4) processed_messages: explicit service-role-only policy
CREATE POLICY "Service role manages processed_messages"
ON public.processed_messages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
