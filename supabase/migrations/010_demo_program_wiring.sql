-- ربط بيانات العرض التجريبي: منسق البرنامج + شعب الأعضاء ببرنامج واحد
-- اختياري للبيئات التي تستخدم حسابات Maha01/02/03

-- عيّن منسق برنامج الطاقة إلى مها عياد (Maha02) إن وُجد الحساب
update programs
set coordinator_id = (
  select id from profiles where id = '440181f2-e64c-48ec-af0b-4d9ce3980fbf'
)
where id = '6406de99-8c6a-4d4c-9fda-3e90078400d8'
  and exists (select 1 from profiles where id = '440181f2-e64c-48ec-af0b-4d9ce3980fbf');

-- تأكد من أدوار وأسماء الحسابات التجريبية
update profiles set role = 'executive_director', full_name = 'د. خلف الشمري'
  where id = '4584c67e-7fe6-41ec-ae2a-7f59c0f14c72';
update profiles set role = 'program_coordinator', full_name = 'مها العنزي'
  where id = '440181f2-e64c-48ec-af0b-4d9ce3980fbf';
update profiles set role = 'instructor', full_name = 'د. مها عياد'
  where id = '7a9a4c25-9add-4641-bd0d-c8db48eca53d';

-- اربط شعب عضو التدريس التجريبي + صاحب طلب الاعتذار ببرنامج الطاقة
update sections
set program_id = '6406de99-8c6a-4d4c-9fda-3e90078400d8'
where instructor_id in (
  '7a9a4c25-9add-4641-bd0d-c8db48eca53d',
  'b873fc76-1b18-46f9-8f44-185c3136af63'
);
