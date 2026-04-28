
-- 1. Normalize all existing phones to digits only
UPDATE public.chat_clients SET phone = regexp_replace(phone, '\D', '', 'g')
WHERE phone IS NOT NULL AND phone <> regexp_replace(phone, '\D', '', 'g');

-- 2. Merge duplicates (same user_id + same normalized phone)
DO $$
DECLARE
  dup RECORD;
  keep_id uuid;
BEGIN
  FOR dup IN
    SELECT user_id, phone, array_agg(id ORDER BY created_at ASC) AS ids
    FROM public.chat_clients
    WHERE phone IS NOT NULL AND phone <> ''
    GROUP BY user_id, phone
    HAVING COUNT(*) > 1
  LOOP
    keep_id := dup.ids[1];
    -- Repoint child rows to keeper
    UPDATE public.messages SET client_id = keep_id WHERE client_id = ANY(dup.ids[2:]);
    UPDATE public.conversation_state SET client_id = keep_id WHERE client_id = ANY(dup.ids[2:]);
    UPDATE public.conversation_flow_sessions SET client_id = keep_id WHERE client_id = ANY(dup.ids[2:]);
    UPDATE public.campaign_contacts SET client_id = keep_id WHERE client_id = ANY(dup.ids[2:]);
    -- Delete duplicates
    DELETE FROM public.chat_clients WHERE id = ANY(dup.ids[2:]);
  END LOOP;
END $$;

-- 3. Trigger: always normalize phone before insert/update
CREATE OR REPLACE FUNCTION public.normalize_chat_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := regexp_replace(NEW.phone, '\D', '', 'g');
    IF NEW.phone = '' THEN NEW.phone := NULL; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_clients_normalize_phone ON public.chat_clients;
CREATE TRIGGER chat_clients_normalize_phone
BEFORE INSERT OR UPDATE OF phone ON public.chat_clients
FOR EACH ROW EXECUTE FUNCTION public.normalize_chat_phone();
