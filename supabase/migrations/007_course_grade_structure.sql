-- إعادة هيكلة درجات المواد: أعمال سنة 40 + نصفي 20 + نهائي 40 = 100
-- رقم الشعبة (section_number) يبقى كما هو

alter table grades drop column if exists total_score;
alter table grades drop column if exists field_supervisor_score;
alter table grades drop column if exists academic_supervisor_score;
alter table grades drop column if exists platform_course_1;
alter table grades drop column if exists platform_course_2;
alter table grades drop column if exists platform_course_3;
alter table grades drop column if exists platform_course_4;
alter table grades drop column if exists report_writing_score;
alter table grades drop column if exists report_discussion_score;

alter table grades drop column if exists coursework_score;
alter table grades drop column if exists midterm_score;
alter table grades drop column if exists final_exam_score;

alter table grades
  add column coursework_score numeric
    check (coursework_score is null or (coursework_score >= 0 and coursework_score <= 40)),
  add column midterm_score numeric
    check (midterm_score is null or (midterm_score >= 0 and midterm_score <= 20)),
  add column final_exam_score numeric
    check (final_exam_score is null or (final_exam_score >= 0 and final_exam_score <= 40)),
  add column total_score numeric generated always as (
    coalesce(coursework_score, 0) +
    coalesce(midterm_score, 0) +
    coalesce(final_exam_score, 0)
  ) stored;
