-- ============================================================
-- نظام رصد درجات التدريب الميداني — الجداول والسياسات
-- ============================================================

-- جدول الملفات الشخصية (يمتد من auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text check (role in ('admin', 'instructor')) not null default 'instructor',
  created_at timestamptz default now()
);

-- جدول الشعب
create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  section_number int unique not null,
  instructor_id uuid references profiles(id) on delete set null,
  term text,
  program text,
  course_title text,
  created_at timestamptz default now()
);

-- جدول الطلاب
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  university_id text unique not null,
  full_name text not null,
  major text,
  course text,
  type text,
  period text,
  section_id uuid references sections(id) on delete set null,
  created_at timestamptz default now()
);

-- جدول الدرجات
create table if not exists grades (
  student_id uuid references students(id) on delete cascade primary key,
  field_supervisor_score numeric check (field_supervisor_score between 0 and 40),
  academic_supervisor_score numeric check (academic_supervisor_score between 0 and 10),
  platform_course_1 numeric check (platform_course_1 between 0 and 5),
  platform_course_2 numeric check (platform_course_2 between 0 and 5),
  platform_course_3 numeric check (platform_course_3 between 0 and 5),
  platform_course_4 numeric check (platform_course_4 between 0 and 5),
  report_writing_score numeric check (report_writing_score between 0 and 20),
  report_discussion_score numeric check (report_discussion_score between 0 and 10),
  total_score numeric generated always as (
    coalesce(field_supervisor_score, 0) + coalesce(academic_supervisor_score, 0) +
    coalesce(platform_course_1, 0) + coalesce(platform_course_2, 0) +
    coalesce(platform_course_3, 0) + coalesce(platform_course_4, 0) +
    coalesce(report_writing_score, 0) + coalesce(report_discussion_score, 0)
  ) stored,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);

-- دالة مساعدة: هل المستخدم الحالي admin؟
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- دالة مساعدة: هل المستخدم الحالي مدرّس لهذه الشعبة؟
create or replace function is_section_instructor(section_uuid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from sections
    where id = section_uuid and instructor_id = auth.uid()
  );
$$;

-- تفعيل RLS
alter table profiles enable row level security;
alter table sections enable row level security;
alter table students enable row level security;
alter table grades enable row level security;

-- ── profiles ──
create policy "profiles_select_own_or_admin"
  on profiles for select
  using (id = auth.uid() or is_admin());

create policy "profiles_update_own_or_admin"
  on profiles for update
  using (id = auth.uid() or is_admin());

create policy "profiles_insert_admin"
  on profiles for insert
  with check (is_admin());

-- ── sections ──
create policy "sections_select"
  on sections for select
  using (instructor_id = auth.uid() or is_admin());

create policy "sections_insert_admin"
  on sections for insert
  with check (is_admin());

create policy "sections_update_admin"
  on sections for update
  using (is_admin());

create policy "sections_delete_admin"
  on sections for delete
  using (is_admin());

-- ── students ──
create policy "students_select"
  on students for select
  using (
    is_admin() or
    is_section_instructor(section_id)
  );

create policy "students_insert_admin"
  on students for insert
  with check (is_admin());

create policy "students_update_admin"
  on students for update
  using (is_admin());

create policy "students_delete_admin"
  on students for delete
  using (is_admin());

-- ── grades ──
create policy "grades_select"
  on grades for select
  using (
    is_admin() or
    exists (
      select 1 from students s
      where s.id = grades.student_id
        and is_section_instructor(s.section_id)
    )
  );

create policy "grades_insert"
  on grades for insert
  with check (
    is_admin() or
    exists (
      select 1 from students s
      where s.id = grades.student_id
        and is_section_instructor(s.section_id)
    )
  );

create policy "grades_update"
  on grades for update
  using (
    is_admin() or
    exists (
      select 1 from students s
      where s.id = grades.student_id
        and is_section_instructor(s.section_id)
    )
  );

create policy "grades_delete_admin"
  on grades for delete
  using (is_admin());

-- إنشاء profile تلقائياً عند تسجيل مستخدم جديد
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'instructor')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- تحديث updated_at تلقائياً
create or replace function update_grades_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists grades_updated_at on grades;
create trigger grades_updated_at
  before update on grades
  for each row execute function update_grades_timestamp();

-- فهارس للأداء
create index if not exists idx_students_section_id on students(section_id);
create index if not exists idx_sections_instructor_id on sections(instructor_id);
