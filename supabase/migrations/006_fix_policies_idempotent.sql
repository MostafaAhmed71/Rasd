-- إصلاح سياسات RLS إذا كانت موجودة مسبقاً (آمن لإعادة التشغيل)
drop policy if exists "documents_select" on instructor_documents;
drop policy if exists "documents_insert_admin" on instructor_documents;
drop policy if exists "documents_delete_admin" on instructor_documents;
drop policy if exists "absence_requests_select" on absence_requests;
drop policy if exists "absence_requests_insert_instructor" on absence_requests;
drop policy if exists "absence_requests_update_admin" on absence_requests;
drop policy if exists "absence_lectures_select" on absence_request_lectures;
drop policy if exists "absence_lectures_insert_instructor" on absence_request_lectures;
drop policy if exists "storage_documents_select" on storage.objects;
drop policy if exists "storage_documents_insert_admin" on storage.objects;
drop policy if exists "storage_documents_delete_admin" on storage.objects;

create policy "documents_select"
  on instructor_documents for select
  using (instructor_id = auth.uid() or is_admin());

create policy "documents_insert_admin"
  on instructor_documents for insert
  with check (is_admin());

create policy "documents_delete_admin"
  on instructor_documents for delete
  using (is_admin());

create policy "absence_requests_select"
  on absence_requests for select
  using (instructor_id = auth.uid() or is_admin());

create policy "absence_requests_insert_instructor"
  on absence_requests for insert
  with check (instructor_id = auth.uid());

create policy "absence_requests_update_admin"
  on absence_requests for update
  using (is_admin());

create policy "absence_lectures_select"
  on absence_request_lectures for select
  using (
    exists (
      select 1 from absence_requests r
      where r.id = absence_request_lectures.request_id
        and (r.instructor_id = auth.uid() or is_admin())
    )
  );

create policy "absence_lectures_insert_instructor"
  on absence_request_lectures for insert
  with check (
    exists (
      select 1 from absence_requests r
      where r.id = absence_request_lectures.request_id
        and r.instructor_id = auth.uid()
        and r.status = 'pending'
    )
  );

create policy "storage_documents_select"
  on storage.objects for select
  using (
    bucket_id = 'instructor-documents'
    and (
      is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

create policy "storage_documents_insert_admin"
  on storage.objects for insert
  with check (
    bucket_id = 'instructor-documents'
    and is_admin()
  );

create policy "storage_documents_delete_admin"
  on storage.objects for delete
  using (
    bucket_id = 'instructor-documents'
    and is_admin()
  );
