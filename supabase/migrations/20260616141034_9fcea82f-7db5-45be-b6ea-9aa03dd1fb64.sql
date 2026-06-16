
-- Ensure only one pending debounce row per client
DELETE FROM public.message_debounce_queue a
USING public.message_debounce_queue b
WHERE a.status = 'pending' AND b.status = 'pending'
  AND a.client_id = b.client_id AND a.id < b.id;

CREATE UNIQUE INDEX IF NOT EXISTS message_debounce_queue_pending_client_uniq
  ON public.message_debounce_queue (client_id) WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.enqueue_debounced_message(
  _user_id uuid, _client_id uuid, _agent_id uuid,
  _entry jsonb, _process_after timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _existing record;
BEGIN
  SELECT * INTO _existing FROM public.message_debounce_queue
    WHERE client_id = _client_id AND status = 'pending'
    FOR UPDATE;
  IF _existing.id IS NOT NULL THEN
    UPDATE public.message_debounce_queue
      SET buffered_messages = COALESCE(buffered_messages, '[]'::jsonb) || jsonb_build_array(_entry),
          process_after = _process_after,
          agent_id = COALESCE(_agent_id, agent_id),
          updated_at = now()
      WHERE id = _existing.id
      RETURNING id INTO _id;
    RETURN _id;
  END IF;
  INSERT INTO public.message_debounce_queue (user_id, client_id, agent_id, buffered_messages, process_after, status)
    VALUES (_user_id, _client_id, _agent_id, jsonb_build_array(_entry), _process_after, 'pending')
    ON CONFLICT (client_id) WHERE status = 'pending'
    DO UPDATE SET
      buffered_messages = COALESCE(public.message_debounce_queue.buffered_messages, '[]'::jsonb) || jsonb_build_array(_entry),
      process_after = EXCLUDED.process_after,
      agent_id = COALESCE(EXCLUDED.agent_id, public.message_debounce_queue.agent_id),
      updated_at = now()
    RETURNING id INTO _id;
  RETURN _id;
END;
$$;
