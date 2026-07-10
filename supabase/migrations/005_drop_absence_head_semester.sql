alter table absence_requests
  drop column if exists department_head,
  drop column if exists semester;
