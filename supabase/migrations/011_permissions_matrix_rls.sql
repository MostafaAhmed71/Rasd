-- مواءمة RLS مع مصفوفة الصلاحيات الرسمية

-- 1) المنسق يعدّل درجات أعضاء برنامجه
drop policy if exists "grades_insert" on grades;
create policy "grades_insert"
  on grades for insert
  with check (
    is_executive()
    or exists (
      select 1 from students s
      where s.id = grades.student_id
        and is_section_instructor(s.section_id)
    )
    or exists (
      select 1 from students st
      where st.id = grades.student_id
        and coordinates_section(st.section_id)
    )
  );

drop policy if exists "grades_update" on grades;
create policy "grades_update"
  on grades for update
  using (
    is_executive()
    or exists (
      select 1 from students s
      where s.id = grades.student_id
        and is_section_instructor(s.section_id)
    )
    or exists (
      select 1 from students st
      where st.id = grades.student_id
        and coordinates_section(st.section_id)
    )
  );

-- 2) المنسق يرفع مستندات جداول لأعضاء برنامجه
drop policy if exists "documents_insert_admin" on instructor_documents;
create policy "documents_insert_admin"
  on instructor_documents for insert
  with check (
    is_executive()
    or coordinates_instructor(instructor_id)
  );

drop policy if exists "documents_delete_admin" on instructor_documents;
create policy "documents_delete_admin"
  on instructor_documents for delete
  using (
    is_executive()
    or coordinates_instructor(instructor_id)
  );

drop policy if exists "documents_select" on instructor_documents;
create policy "documents_select"
  on instructor_documents for select
  using (
    instructor_id = auth.uid()
    or is_executive()
    or coordinates_instructor(instructor_id)
  );

-- 3) المنسق يكتب schedule_entries لأعضاء برنامجه
drop policy if exists "schedule_insert_exec" on schedule_entries;
create policy "schedule_insert_exec"
  on schedule_entries for insert
  with check (
    is_executive()
    or coordinates_instructor(instructor_id)
  );

drop policy if exists "schedule_update_exec" on schedule_entries;
create policy "schedule_update_exec"
  on schedule_entries for update
  using (
    is_executive()
    or coordinates_instructor(instructor_id)
  );

drop policy if exists "schedule_delete_exec" on schedule_entries;
create policy "schedule_delete_exec"
  on schedule_entries for delete
  using (
    is_executive()
    or coordinates_instructor(instructor_id)
  );

drop policy if exists "schedule_select" on schedule_entries;
create policy "schedule_select"
  on schedule_entries for select
  using (
    instructor_id = auth.uid()
    or is_executive()
    or coordinates_instructor(instructor_id)
  );

-- 4) Storage: المنسق/المدير يرفعان ملفات أعضاء البرنامج / الكل
create or replace function can_manage_instructor_docs(folder_user text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    folder_user is not null
    and (
      is_executive()
      or coordinates_instructor(folder_user::uuid)
    );
$$;

drop policy if exists "storage_documents_select" on storage.objects;
create policy "storage_documents_select"
  on storage.objects for select
  using (
    bucket_id = 'instructor-documents'
    and (
      can_manage_instructor_docs((storage.foldername(name))[1])
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists "storage_documents_insert_admin" on storage.objects;
create policy "storage_documents_insert_admin"
  on storage.objects for insert
  with check (
    bucket_id = 'instructor-documents'
    and can_manage_instructor_docs((storage.foldername(name))[1])
  );

drop policy if exists "storage_documents_delete_admin" on storage.objects;
create policy "storage_documents_delete_admin"
  on storage.objects for delete
  using (
    bucket_id = 'instructor-documents'
    and can_manage_instructor_docs((storage.foldername(name))[1])
  );
