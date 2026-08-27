-- Anyone can view avatars (bucket is public, but Storage still needs an
-- explicit SELECT policy — "public bucket" controls URL accessibility,
-- not read permission at the RLS layer).
create policy "avatars: anyone can view"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

-- Users can only upload/update/delete their own avatar — filename must
-- match their own user id, enforced via the storage path.
create policy "avatars: users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: users can update own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);