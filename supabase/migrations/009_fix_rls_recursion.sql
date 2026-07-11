-- إصلاح infinite recursion بين سياسات RLS لـ programs و sections
-- السبب: سياسة programs تقرأ sections، وسياسة sections تقرأ programs

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

-- إعادة تعريف coordinates_instructor (SECURITY DEFINER يتجاوز RLS)
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

-- سياسات بدون استعلام متقاطع مباشر داخل USING
drop policy if exists "programs_select" on programs;
create policy "programs_select"
  on programs for select
  using (
    is_executive()
    or coordinator_id = auth.uid()
    or teaches_in_program(id)
  );

drop policy if exists "sections_select" on sections;
create policy "sections_select"
  on sections for select
  using (
    instructor_id = auth.uid()
    or is_executive()
    or coordinates_program(program_id)
  );

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
