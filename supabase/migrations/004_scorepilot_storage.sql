-- ScorePilot AI media storage.
-- Stored in GitHub first; apply after the Supabase project is active and reviewed.

insert into storage.buckets (id, name, public)
values ('scorepilot-media', 'scorepilot-media', true)
on conflict (id) do update set public = excluded.public;

-- Authenticated users can upload/update/delete media.
drop policy if exists scorepilot_media_select on storage.objects;
create policy scorepilot_media_select
on storage.objects for select to authenticated
using (bucket_id = 'scorepilot-media');

drop policy if exists scorepilot_media_insert on storage.objects;
create policy scorepilot_media_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'scorepilot-media');

drop policy if exists scorepilot_media_update on storage.objects;
create policy scorepilot_media_update
on storage.objects for update to authenticated
using (bucket_id = 'scorepilot-media')
with check (bucket_id = 'scorepilot-media');

drop policy if exists scorepilot_media_delete on storage.objects;
create policy scorepilot_media_delete
on storage.objects for delete to authenticated
using (bucket_id = 'scorepilot-media');
