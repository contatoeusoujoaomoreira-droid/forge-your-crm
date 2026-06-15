CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tenant uuid;
  _entity_id text;
  _diff jsonb;
  _row jsonb;
BEGIN
  _row := to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
  BEGIN
    _tenant := NULLIF(_row->>'user_id','')::uuid;
  EXCEPTION WHEN others THEN
    _tenant := NULL;
  END;
  _entity_id := _row->>'id';

  IF TG_OP = 'UPDATE' THEN
    _diff := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSIF TG_OP = 'INSERT' THEN
    _diff := jsonb_build_object('new', to_jsonb(NEW));
  ELSE
    _diff := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  BEGIN
    INSERT INTO public.audit_log(tenant_id, actor_id, action, entity, entity_id, diff)
    VALUES (_tenant, auth.uid(), TG_OP, TG_TABLE_NAME, _entity_id, _diff);
  EXCEPTION WHEN others THEN
    -- Never block writes because of audit failures
    NULL;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;