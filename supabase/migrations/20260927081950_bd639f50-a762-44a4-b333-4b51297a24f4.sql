CREATE OR REPLACE FUNCTION public.get_plugin_rating_summaries(_plugin_ids uuid[])
RETURNS TABLE(plugin_id uuid, avg_rating numeric, review_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT target_id, AVG(rating)::numeric, COUNT(*)
  FROM public.item_reviews
  WHERE target_type = 'plugin' AND target_id = ANY(_plugin_ids)
  GROUP BY target_id
$$;
GRANT EXECUTE ON FUNCTION public.get_plugin_rating_summaries(uuid[]) TO anon, authenticated;