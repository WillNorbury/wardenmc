DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.admin_get_application_notes(uuid[])','public.admin_get_report_notes(uuid[])','public.admin_get_user_email(uuid)',
    'public.apply_creator_code(text)','public.can_access_ticket(uuid)','public.get_my_organizations()','public.get_my_private_profile()',
    'public.get_my_recent_plugin_downloads(integer)','public.grant_membership_rank(text)','public.is_current_user_admin()',
    'public.is_org_member(uuid,uuid)','public.is_org_owner(uuid)','public.is_organization_owner(uuid)','public.is_staff_user(uuid)',
    'public.mc_server_get_ingest_secret(uuid)','public.mc_server_rotate_secret(uuid)','public.record_login_streak()',
    'public.record_vote_streak()','public.set_my_preferences(jsonb)','public.submit_quiz_attempt(uuid,jsonb,integer)',
    'public.toggle_plugin_favorite(uuid)','public.get_quiz_explanations(uuid[])',
    'public.add_owner_as_org_member()','public.handle_new_user()','public.log_profile_deletion()',
    'public.notify_ban_appeal_event()','public.notify_new_user_report()','public.set_updated_at()'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY['public.add_owner_as_org_member()','public.handle_new_user()','public.log_profile_deletion()',
    'public.notify_ban_appeal_event()','public.notify_new_user_report()','public.set_updated_at()'] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', f);
  END LOOP;
END $$;