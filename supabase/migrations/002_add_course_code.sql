-- إضافة رمز المقرر لجداول الطلاب والشعب
alter table students add column if not exists course_code text;
alter table sections add column if not exists course_code text;
