CREATE OR REPLACE FUNCTION public.validate_application_type()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'owner'::app_role) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.type IS NOT DISTINCT FROM OLD.type THEN RETURN NEW; END IF;
  IF NEW.type::text = 'admin' OR NOT EXISTS (SELECT 1 FROM public.application_types WHERE slug = NEW.type::text) THEN
    RAISE EXCEPTION 'Invalid application type';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS applications_validate_type ON public.applications;
CREATE TRIGGER applications_validate_type BEFORE INSERT OR UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.validate_application_type();

REVOKE EXECUTE ON FUNCTION public.apply_creator_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_creator_code(text) TO service_role;

CREATE OR REPLACE FUNCTION public.mc_server_rotate_secret(_server_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE new_secret TEXT;
BEGIN
  IF NOT private.has_role(auth.uid(), 'owner'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  new_secret := encode(gen_random_bytes(32), 'hex');
  UPDATE public.mc_servers SET ingest_secret = new_secret, updated_at = now()
    WHERE id = _server_id AND created_by = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  RETURN new_secret;
END; $$;