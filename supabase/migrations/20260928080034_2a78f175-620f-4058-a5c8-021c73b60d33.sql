ALTER TABLE public.profiles ADD COLUMN account_type TEXT NOT NULL DEFAULT 'personal';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_type_check CHECK (account_type IN ('personal', 'business'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, display_name, avatar_url, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    case when new.raw_user_meta_data->>'account_type' = 'business' then 'business' else 'personal' end
  );
  insert into public.user_roles (user_id, role) values (new.id, 'default');
  return new;
end;
$function$;