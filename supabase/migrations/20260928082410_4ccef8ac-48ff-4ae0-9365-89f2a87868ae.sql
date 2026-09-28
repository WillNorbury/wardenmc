CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR role IN ('founder'::public.app_role, 'star'::public.app_role))
  )
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','founder','star'))
$$;

CREATE OR REPLACE FUNCTION public.is_staff_user(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid
    AND role IN ('founder','star','owner','manager','developer','sr_admin','admin','sr_mod','mod','sr_helper','helper'))
$$;