CREATE OR REPLACE FUNCTION public.admin_run_sql(_sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  n int;
BEGIN
  -- Locked to a single account (WillNorbury).
  IF auth.uid() IS DISTINCT FROM 'a9ff5e2f-cad4-4805-9acd-095065d18179'::uuid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _sql IS NULL OR length(trim(_sql)) = 0 THEN
    RAISE EXCEPTION 'sql required';
  END IF;
  IF _sql ~* '^\s*(select|with|show|explain|table|values)' THEN
    EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || _sql || ') t' INTO result;
    RETURN jsonb_build_object('kind', 'rows', 'rows', result);
  ELSE
    EXECUTE _sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN jsonb_build_object('kind', 'write', 'affectedRows', n);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_run_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_run_sql(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_run_sql(text) TO authenticated;