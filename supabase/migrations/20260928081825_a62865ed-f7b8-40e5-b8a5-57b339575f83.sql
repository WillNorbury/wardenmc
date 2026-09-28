create policy "Anyone can view staff roles"
on public.user_roles
for select
to anon, authenticated
using (role in ('founder','star','owner','management','discord_manager','sr_manager','manager','dev_team','head_developer','developer','admins','sr_admin','admin','mods','sr_mod','mod','helpers','sr_helper','helper','trainee'));