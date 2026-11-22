CREATE OR REPLACE FUNCTION public.get_plugin_download_counts(_plugin_ids uuid[] DEFAULT NULL::uuid[])
RETURNS TABLE(plugin_id uuid, total bigint, last_7d bigint, last_30d bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT d.plugin_id, count(*)::bigint, count(*) FILTER (WHERE d.created_at >= now() - interval '7 days')::bigint, count(*) FILTER (WHERE d.created_at >= now() - interval '30 days')::bigint FROM public.plugin_downloads d JOIN public.plugins p ON p.id=d.plugin_id WHERE p.published AND (_plugin_ids IS NULL OR d.plugin_id=ANY(_plugin_ids)) GROUP BY d.plugin_id; $$;
CREATE OR REPLACE FUNCTION public.get_mod_like_counts(_mod_ids uuid[])
RETURNS TABLE(mod_id uuid, likes bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT l.mod_id, count(*)::bigint FROM public.mod_likes l JOIN public.mods m ON m.id=l.mod_id WHERE m.published AND l.mod_id=ANY(_mod_ids) GROUP BY l.mod_id; $$;
CREATE OR REPLACE FUNCTION public.plugin_file_uploader_matches(_plugin_id uuid, _path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM storage.objects o JOIN public.plugins p ON p.id=_plugin_id WHERE o.bucket_id='plugin-jars' AND o.name=_path AND (COALESCE(o.owner_id, o.owner::text)=p.user_id::text OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id::text=COALESCE(o.owner_id, o.owner::text) AND r.role IN ('admin','owner','founder','star')))); $$;
REVOKE ALL ON FUNCTION public.plugin_file_uploader_matches(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.plugin_file_uploader_matches(uuid,text) TO service_role;