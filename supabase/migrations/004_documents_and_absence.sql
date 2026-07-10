-- مستندات الأعضاء (جدول المراقبة / جدول الدراسة)
create table if not exists instructor_documents (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references profiles(id) on delete cascade,
  document_type text not null check (document_type in ('supervision', 'study')),
  file_path text not null,
  file_name text not null,
  uploaded_by uuid references profiles(id),
  created_at timestamptz default now()
);

create index if not exists idx_instructor_documents_instructor
  on instructor_documents(instructor_id, document_type);

-- طلبات الاعتذار عن المحاضرة
create table if not exists absence_requests (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references profiles(id) on delete cascade,
  college text default 'الكلية التطبيقية (رفحاء)',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists absence_request_lectures (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references absence_requests(id) on delete cascade,
  row_order int not null default 1,
  course_name text not null,
  section_number text,
  course_code text,
  lecture_date date not null,
  lecture_time text not null,
  lecture_mode text not null check (lecture_mode in ('in_person', 'remote')),
  apology_type text not null check (apology_type in ('remote_delivery', 'full_absence')),
  created_at timestamptz default now()
);

create index if not exists idx_absence_requests_instructor on absence_requests(instructor_id);
create index if not exists idx_absence_requests_status on absence_requests(status);

-- RLS
alter table instructor_documents enable row level security;
alter table absence_requests enable row level security;
alter table absence_request_lectures enable row level security;

-- instructor_documents
drop policy if exists "documents_select" on instructor_documents;
create policy "documents_select"
  on instructor_documents for select
  using (instructor_id = auth.uid() or is_admin());

drop policy if exists "documents_insert_admin" on instructor_documents;
create policy "documents_insert_admin"
  on instructor_documents for insert
  with check (is_admin());

drop policy if exists "documents_delete_admin" on instructor_documents;
create policy "documents_delete_admin"
  on instructor_documents for delete
  using (is_admin());

-- absence_requests
drop policy if exists "absence_requests_select" on absence_requests;
create policy "absence_requests_select"
  on absence_requests for select
  using (instructor_id = auth.uid() or is_admin());

drop policy if exists "absence_requests_insert_instructor" on absence_requests;
create policy "absence_requests_insert_instructor"
  on absence_requests for insert
  with check (instructor_id = auth.uid());

drop policy if exists "absence_requests_update_admin" on absence_requests;
create policy "absence_requests_update_admin"
  on absence_requests for update
  using (is_admin());

-- absence_request_lectures
drop policy if exists "absence_lectures_select" on absence_request_lectures;
create policy "absence_lectures_select"
  on absence_request_lectures for select
  using (
    exists (
      select 1 from absence_requests r
      where r.id = absence_request_lectures.request_id
        and (r.instructor_id = auth.uid() or is_admin())
    )
  );

drop policy if exists "absence_lectures_insert_instructor" on absence_request_lectures;
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

-- Storage bucket (run once in Supabase SQL Editor)
insert into storage.buckets (id, name, public)
values ('instructor-documents', 'instructor-documents', false)
on conflict (id) do nothing;

drop policy if exists "storage_documents_select" on storage.objects;
create policy "storage_documents_select"
  on storage.objects for select
  using (
    bucket_id = 'instructor-documents'
    and (
      is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists "storage_documents_insert_admin" on storage.objects;
create policy "storage_documents_insert_admin"
  on storage.objects for insert
  with check (
    bucket_id = 'instructor-documents'
    and is_admin()
  );

drop policy if exists "storage_documents_delete_admin" on storage.objects;
create policy "storage_documents_delete_admin"
  on storage.objects for delete
  using (
    bucket_id = 'instructor-documents'
    and is_admin()
  );
