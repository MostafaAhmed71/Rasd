-- ============================================================
-- أدوار جديدة + برامج + نوع المقرر + مهام عامة + جداول منظمة
-- ============================================================

-- 1) الأدوار: ترحيل admin → executive_director
alter table profiles drop constraint if exists profiles_role_check;

update profiles set role = 'executive_director' where role = 'admin';

alter table profiles
  add constraint profiles_role_check
  check (role in ('executive_director', 'program_coordinator', 'instructor'));

-- 2) البرامج
create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  coordinator_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_programs_coordinator on programs(coordinator_id);

-- 3) ربط الشعب بالبرنامج + نوع المقرر
alter table sections add column if not exists program_id uuid references programs(id) on delete set null;
alter table sections add column if not exists course_type text;

update sections set course_type = 'regular' where course_type is null;

alter table sections drop constraint if exists sections_course_type_check;
alter table sections
  add constraint sections_course_type_check
  check (course_type in ('regular', 'field_training'));

alter table sections alter column course_type set default 'regular';

-- 4) إعادة أعمدة درجات التدريب الميداني بجانب درجات المقرر العادي
alter table grades drop column if exists total_score;

alter table grades add column if not exists field_supervisor_score numeric;
alter table grades add column if not exists academic_supervisor_score numeric;
alter table grades add column if not exists platform_course_1 numeric;
alter table grades add column if not exists platform_course_2 numeric;
alter table grades add column if not exists platform_course_3 numeric;
alter table grades add column if not exists platform_course_4 numeric;
alter table grades add column if not exists report_writing_score numeric;
alter table grades add column if not exists report_discussion_score numeric;

-- قيود النطاق (إسقاط القديمة إن وُجدت ثم إعادة)
do $$ begin
  alter table grades drop constraint if exists grades_field_supervisor_score_check;
  alter table grades drop constraint if exists grades_academic_supervisor_score_check;
  alter table grades drop constraint if exists grades_platform_course_1_check;
  alter table grades drop constraint if exists grades_platform_course_2_check;
  alter table grades drop constraint if exists grades_platform_course_3_check;
  alter table grades drop constraint if exists grades_platform_course_4_check;
  alter table grades drop constraint if exists grades_report_writing_score_check;
  alter table grades drop constraint if exists grades_report_discussion_score_check;
exception when others then null;
end $$;

alter table grades
  add constraint grades_field_supervisor_score_check
    check (field_supervisor_score is null or (field_supervisor_score >= 0 and field_supervisor_score <= 40)),
  add constraint grades_academic_supervisor_score_check
    check (academic_supervisor_score is null or (academic_supervisor_score >= 0 and academic_supervisor_score <= 10)),
  add constraint grades_platform_course_1_check
    check (platform_course_1 is null or (platform_course_1 >= 0 and platform_course_1 <= 5)),
  add constraint grades_platform_course_2_check
    check (platform_course_2 is null or (platform_course_2 >= 0 and platform_course_2 <= 5)),
  add constraint grades_platform_course_3_check
    check (platform_course_3 is null or (platform_course_3 >= 0 and platform_course_3 <= 5)),
  add constraint grades_platform_course_4_check
    check (platform_course_4 is null or (platform_course_4 <= 5 and platform_course_4 >= 0)),
  add constraint grades_report_writing_score_check
    check (report_writing_score is null or (report_writing_score >= 0 and report_writing_score <= 20)),
  add constraint grades_report_discussion_score_check
    check (report_discussion_score is null or (report_discussion_score >= 0 and report_discussion_score <= 10));

alter table grades
  add column total_score numeric generated always as (
    coalesce(coursework_score, 0) +
    coalesce(midterm_score, 0) +
    coalesce(final_exam_score, 0) +
    coalesce(field_supervisor_score, 0) +
    coalesce(academic_supervisor_score, 0) +
    coalesce(platform_course_1, 0) +
    coalesce(platform_course_2, 0) +
    coalesce(platform_course_3, 0) +
    coalesce(platform_course_4, 0) +
    coalesce(report_writing_score, 0) +
    coalesce(report_discussion_score, 0)
  ) stored;

-- 5) مهام عامة
create table if not exists general_tasks (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists idx_general_tasks_instructor on general_tasks(instructor_id);

-- 6) جداول دراسية/مراقبة منظمة
create table if not exists schedule_entries (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references profiles(id) on delete cascade,
  schedule_type text not null check (schedule_type in ('study', 'supervision')),
  day_label text,
  entry_date date,
  time_label text,
  room text,
  course_code text,
  course_title text,
  section_number text,
  units text,
  workload text,
  first_proctor text,
  second_proctor text,
  source_file_name text,
  uploaded_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_schedule_entries_instructor
  on schedule_entries(instructor_id, schedule_type);

-- 7) دوال الصلاحيات
create or replace function is_executive()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role in ('executive_director', 'admin')
  );
$$;

-- توافق خلفي: is_admin = المدير التنفيذي
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select is_executive();
$$;

create or replace function is_program_coordinator()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'program_coordinator'
  );
$$;

create or replace function coordinates_instructor(target_instructor uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from programs p
    join sections s on s.program_id = p.id
    where p.coordinator_id = auth.uid()
      and s.instructor_id = target_instructor
  );
$$;

-- دوال تقطع حلقة RLS بين programs و sections
create or replace function teaches_in_program(program_uuid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from sections
    where program_id = program_uuid
      and instructor_id = auth.uid()
  );
$$;

create or replace function coordinates_program(program_uuid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from programs
    where id = program_uuid
      and coordinator_id = auth.uid()
  );
$$;

create or replace function coordinates_section(section_uuid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from sections s
    join programs p on p.id = s.program_id
    where s.id = section_uuid
      and p.coordinator_id = auth.uid()
  );
$$;

-- 8) RLS للبرامج
alter table programs enable row level security;

drop policy if exists "programs_select" on programs;
create policy "programs_select"
  on programs for select
  using (
    is_executive()
    or coordinator_id = auth.uid()
    or teaches_in_program(id)
  );

drop policy if exists "programs_insert_exec" on programs;
create policy "programs_insert_exec"
  on programs for insert
  with check (is_executive());

drop policy if exists "programs_update_exec" on programs;
create policy "programs_update_exec"
  on programs for update
  using (is_executive());

drop policy if exists "programs_delete_exec" on programs;
create policy "programs_delete_exec"
  on programs for delete
  using (is_executive());

-- 9) تحديث سياسات profiles للاختيار للمنسق
drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin"
  on profiles for select
  using (
    id = auth.uid()
    or is_executive()
    or coordinates_instructor(id)
  );

-- 10) تحديث sections للمنسق
drop policy if exists "sections_select" on sections;
create policy "sections_select"
  on sections for select
  using (
    instructor_id = auth.uid()
    or is_executive()
    or coordinates_program(program_id)
  );

-- 11) طلاب ودرجات للمنسق (قراءة)
drop policy if exists "students_select" on students;
create policy "students_select"
  on students for select
  using (
    is_executive()
    or is_section_instructor(section_id)
    or coordinates_section(section_id)
  );

drop policy if exists "grades_select" on grades;
create policy "grades_select"
  on grades for select
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

-- 12) طلبات الاعتذار: المنسق يحدّث (قبول/رفض)
drop policy if exists "absence_requests_select" on absence_requests;
create policy "absence_requests_select"
  on absence_requests for select
  using (
    instructor_id = auth.uid()
    or is_executive()
    or coordinates_instructor(instructor_id)
  );

drop policy if exists "absence_requests_update_admin" on absence_requests;
create policy "absence_requests_update_admin"
  on absence_requests for update
  using (
    is_executive()
    or coordinates_instructor(instructor_id)
  );

drop policy if exists "absence_lectures_select" on absence_request_lectures;
create policy "absence_lectures_select"
  on absence_request_lectures for select
  using (
    exists (
      select 1 from absence_requests r
      where r.id = absence_request_lectures.request_id
        and (
          r.instructor_id = auth.uid()
          or is_executive()
          or coordinates_instructor(r.instructor_id)
        )
    )
  );

-- 13) general_tasks RLS
alter table general_tasks enable row level security;

drop policy if exists "tasks_select" on general_tasks;
create policy "tasks_select"
  on general_tasks for select
  using (instructor_id = auth.uid() or is_executive());

drop policy if exists "tasks_insert" on general_tasks;
create policy "tasks_insert"
  on general_tasks for insert
  with check (instructor_id = auth.uid() or is_executive());

drop policy if exists "tasks_update" on general_tasks;
create policy "tasks_update"
  on general_tasks for update
  using (instructor_id = auth.uid() or is_executive());

drop policy if exists "tasks_delete" on general_tasks;
create policy "tasks_delete"
  on general_tasks for delete
  using (instructor_id = auth.uid() or is_executive());

-- 14) schedule_entries RLS
alter table schedule_entries enable row level security;

drop policy if exists "schedule_select" on schedule_entries;
create policy "schedule_select"
  on schedule_entries for select
  using (instructor_id = auth.uid() or is_executive());

drop policy if exists "schedule_insert_exec" on schedule_entries;
create policy "schedule_insert_exec"
  on schedule_entries for insert
  with check (is_executive());

drop policy if exists "schedule_update_exec" on schedule_entries;
create policy "schedule_update_exec"
  on schedule_entries for update
  using (is_executive());

drop policy if exists "schedule_delete_exec" on schedule_entries;
create policy "schedule_delete_exec"
  on schedule_entries for delete
  using (is_executive());
