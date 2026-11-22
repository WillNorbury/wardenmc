CREATE TABLE public.plugin_download_entitlements (
 plugin_id uuid NOT NULL REFERENCES public.plugins(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 approved_by uuid NOT NULL REFERENCES public.profiles(id),
 approved_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz,
 PRIMARY KEY (plugin_id, user_id)
);
GRANT ALL ON public.plugin_download_entitlements TO service_role;
REVOKE ALL ON public.plugin_download_entitlements FROM anon, authenticated;
ALTER TABLE public.plugin_download_entitlements ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.plugin_download_entitlements IS 'Service-only verified buyer approvals; never derive entitlement from client input or download counts. No automatic purchase confirmation.';
CREATE OR REPLACE FUNCTION public.validate_plugin_download_approval() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.approved_by AND role IN ('admin','owner','founder','star')) THEN
  RAISE EXCEPTION 'Approval requires a staff approver';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER validate_plugin_download_approval BEFORE INSERT OR UPDATE ON public.plugin_download_entitlements FOR EACH ROW EXECUTE FUNCTION public.validate_plugin_download_approval();