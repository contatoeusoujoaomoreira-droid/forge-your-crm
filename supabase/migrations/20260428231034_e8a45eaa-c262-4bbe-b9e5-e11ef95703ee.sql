-- Aggressively clean up any prior partial state from failed migrations
DROP INDEX IF EXISTS public.chat_clients_user_phone_uidx;
ALTER TABLE public.chat_clients DROP CONSTRAINT IF EXISTS chat_clients_user_phone_unique;
DROP INDEX IF EXISTS public.chat_clients_user_phone_unique;

-- De-dupe by (user_id, phone) keeping the most recent row
DELETE FROM public.chat_clients a USING public.chat_clients b
WHERE a.user_id = b.user_id AND a.phone = b.phone AND a.created_at < b.created_at;

-- Create the unique constraint
ALTER TABLE public.chat_clients
  ADD CONSTRAINT chat_clients_uphone_uniq UNIQUE (user_id, phone);

-- Backfill avatars from webhook_logs
UPDATE public.chat_clients cc
SET avatar_url = sub.avatar_url,
    metadata = COALESCE(cc.metadata, '{}'::jsonb) || jsonb_build_object('profile_pic_url', sub.avatar_url, 'avatar_source', 'backfill_webhook'),
    updated_at = now()
FROM (
  SELECT DISTINCT ON (wl.user_id, regexp_replace(COALESCE(wl.payload->>'phone', wl.payload->>'from', wl.payload->>'sender', ''), '\D', '', 'g'))
    wl.user_id,
    regexp_replace(COALESCE(wl.payload->>'phone', wl.payload->>'from', wl.payload->>'sender', ''), '\D', '', 'g') AS phone,
    COALESCE(wl.payload->>'photo', wl.payload->>'senderPhoto', wl.payload->>'profilePicUrl', wl.payload->>'profilePicture', wl.payload->>'avatarUrl', wl.payload->>'picture') AS avatar_url
  FROM public.webhook_logs wl
  WHERE wl.source = 'whatsapp'
    AND COALESCE(wl.payload->>'photo', wl.payload->>'senderPhoto', wl.payload->>'profilePicUrl', wl.payload->>'profilePicture', wl.payload->>'avatarUrl', wl.payload->>'picture') IS NOT NULL
  ORDER BY wl.user_id, regexp_replace(COALESCE(wl.payload->>'phone', wl.payload->>'from', wl.payload->>'sender', ''), '\D', '', 'g'), wl.created_at DESC
) sub
WHERE cc.user_id = sub.user_id
  AND regexp_replace(cc.phone, '\D', '', 'g') = sub.phone
  AND sub.phone <> ''
  AND sub.avatar_url IS NOT NULL
  AND (cc.avatar_url IS NULL OR cc.avatar_url = '');