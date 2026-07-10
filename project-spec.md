# نظام رصد درجات التدريب الميداني — مواصفات المشروع

## نظرة عامة
تطبيق ويب لرصد درجات طلاب التدريب الميداني/التطبيقي. كل عضو تدريس (دكتور) يدخل على حسابه، يرى شعبته/شعبه فقط، ويرصد درجات طلابه. مسؤول النظام (Admin) يرفع بيانات الطلاب والشعب، ويقدر يصدّر النتيجة النهائية بنفس شكل شيت الإكسل الأصلي.

**الحجم المتوقع:** ~1000 طالب، ~30 عضو تدريس، دخول متزامن من الكل في نفس الوقت.

**قابلية الاستخدام:** لازم يشتغل بالكامل من المتصفح على أي جهاز (كمبيوتر، آيباد، موبايل) بدون أي تثبيت.

---

## Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Backend / DB / Auth:** Supabase
  - PostgreSQL كقاعدة بيانات
  - Supabase Auth لتسجيل الدخول (إيميل + باسورد، أو Magic Link)
  - **Row Level Security (RLS)** لفرض إن كل عضو تدريس يشوف/يعدّل درجات شعبه بس — من غير ما نحتاج نكتب طبقة Backend منفصلة
  - Supabase Storage (اختياري) لتخزين ملفات الاستيراد/التصدير
- **تصدير الإكسل:** مكتبة `exceljs` (تشتغل في المتصفح أو في Supabase Edge Function) — بتدعم دمج الخلايا والألوان والخطوط، وده مهم عشان التصدير يطلع بنفس تصميم الشيت الأصلي بالظبط

---

## الأدوار (Roles)

### 1) Admin (مسؤول النظام)
- يرفع/يدير بيانات الطلاب (استيراد من CSV/Excel): الرقم الجامعي، اسم الطالب، التخصص، المقرر، النوع، الفترة، اسم عضو التدريس، رقم الشعبة
- يرفع/يدير حسابات أعضاء التدريس، ويربط كل عضو تدريس بالشعب اللي بيدرّسها
- يشوف كل الشعب وكل الدرجات (قراءة، وتعديل لو احتاج)
- **يصدّر النتيجة النهائية بنفس تصميم شيت الإكسل الأصلي** (تفاصيل التصميم تحت)

### 2) Instructor (عضو تدريس)
- يسجّل دخول بحسابه
- يشوف قائمة الشعب المخصصة له بس (مفروضة تلقائيًا عبر RLS، مش مجرد فلترة في الواجهة)
- يختار شعبة، تظهر له قائمة طلابها تلقائيًا
- يدخل درجات كل طالب، وتتحفظ فورًا (Auto-save) بدون داعي لزرار "حفظ"
- ميقدرش يشوف أو يعدّل درجات شعب مش بتاعته (ده بيتفرض من قاعدة البيانات نفسها عبر RLS، مش بس من الواجهة)

---

## بنية قاعدة البيانات (Supabase / PostgreSQL)

```sql
-- جدول المستخدمين (يمتد من auth.users بتاع Supabase)
create table profiles (
  id uuid references auth.users primary key,
  full_name text,
  role text check (role in ('admin', 'instructor')),
  created_at timestamptz default now()
);

create table sections (
  id uuid primary key default gen_random_uuid(),
  section_number int unique not null,
  instructor_id uuid references profiles(id),
  term text,
  program text,
  course_title text,
  created_at timestamptz default now()
);

create table students (
  id uuid primary key default gen_random_uuid(),
  university_id text unique not null,
  full_name text not null,
  major text,
  course text,
  type text,
  period text,
  section_id uuid references sections(id),
  created_at timestamptz default now()
);

create table grades (
  student_id uuid references students(id) primary key,
  field_supervisor_score   numeric check (field_supervisor_score between 0 and 40),
  academic_supervisor_score numeric check (academic_supervisor_score between 0 and 10),
  platform_course_1 numeric check (platform_course_1 between 0 and 5),
  platform_course_2 numeric check (platform_course_2 between 0 and 5),
  platform_course_3 numeric check (platform_course_3 between 0 and 5),
  platform_course_4 numeric check (platform_course_4 between 0 and 5),
  report_writing_score numeric check (report_writing_score between 0 and 20),
  report_discussion_score numeric check (report_discussion_score between 0 and 10),
  total_score numeric generated always as (
    coalesce(field_supervisor_score,0) + coalesce(academic_supervisor_score,0) +
    coalesce(platform_course_1,0) + coalesce(platform_course_2,0) +
    coalesce(platform_course_3,0) + coalesce(platform_course_4,0) +
    coalesce(report_writing_score,0) + coalesce(report_discussion_score,0)
  ) stored,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);
```

**توزيع الـ 100 درجة (زي النظام الحالي بالظبط):**
المشرف الميداني (40) + المشرف الأكاديمي (10) + تدريب المنصات: 4 دورات (5×4=20) + كتابة التقرير (20) + مناقشة التقرير (10) = 100

### RLS Policies (أهم جزء أمني)
```sql
alter table grades enable row level security;
alter table students enable row level security;
alter table sections enable row level security;

-- عضو التدريس يشوف بس شعبه
create policy "instructor sees own sections"
on sections for select
using (instructor_id = auth.uid() or exists (
  select 1 from profiles where id = auth.uid() and role = 'admin'
));

-- نفس المبدأ لجدول الطلاب والدرجات (join على section_id -> instructor_id = auth.uid())
-- Admin عنده policy منفصلة بصلاحية كاملة (select/update/insert) على كل الجداول
```

---

## الصفحات / الشاشات المطلوبة

### صفحة تسجيل الدخول
- إيميل + باسورد (Supabase Auth)
- توجيه تلقائي لصفحة Admin أو Instructor حسب `profiles.role`

### لوحة تحكم عضو التدريس
- Dropdown لاختيار رقم الشعبة (بس الشعب المخصصة له، عبر RLS)
- جدول: الرقم الجامعي، الاسم، وخانات الدرجات الثمانية + عمود مجموع (محسوب تلقائيًا في القاعدة `total_score`)
- كل خانة تتحفظ فور الخروج منها (`onBlur` → `supabase.from('grades').update(...)`)، مع مؤشر "تم الحفظ ✓"
- تصميم متجاوب (Responsive) لشاشات الآيباد/الموبايل

### لوحة تحكم Admin
- استيراد بيانات الطلاب/الشعب (رفع Excel/CSV، parsing بمكتبة `xlsx` أو `papaparse`)
- إدارة حسابات أعضاء التدريس وربطهم بالشعب
- عرض نسبة إنجاز كل شعبة (كام طالب اترصدله درجات من كام)
- **زرار "تصدير النتيجة" بتصميم الإكسل الأصلي**

---

## مواصفات التصدير (Excel Export) — أهم نقطة

المطلوب: ملف `.xlsx` مطابق لتصميم الشيت الأصلي (نفس الأعمدة، العناوين المدمجة، الألوان)، مبني بمكتبة `exceljs`:

**بنية الأعمدة (من اليمين لليسار في العرض، لكن في الملف الفعلي من اليسار):**
| العمود | المحتوى |
|---|---|
| A | الرقم الجامعي |
| B | اسم الطالب |
| C | المشرف الميداني (من 40) |
| D | المشرف الأكاديمي (من 10) |
| E:H | تدريب المنصات — الدورة 1، 2، 3، 4 (5 لكل واحدة) — عنوان مجمّع (Merged) فوق الأربعة أعمدة |
| I | كتابة التقرير (من 20) |
| J | مناقشة التقرير (من 10) |
| K | المجموع (من 100) |

**التنسيق المطلوب في exceljs:**
- دمج خلايا العنوان الرئيسي "التدريب الميداني" فوق C:D، و"تدريب المنصات" فوق E:H (زي `worksheet.mergeCells('C1:D1')`)
- ألوان الخلفية: أصفر فاتح لعمودي المشرف الميداني/الأكاديمي، أزرق فاتح لعمود تدريب المنصات، برتقالي للتقرير والمناقشة، أخضر لعمود المجموع
- خط عريض (Bold) للعناوين، ومحاذاة وسط (center) لكل الخلايا
- تجميد الصف الأول (`worksheet.views = [{ state: 'frozen', ySplit: 1 }]`) لسهولة القراءة لو الملف طويل
- **التصدير يكون بشيت منفصل لكل شعبة** داخل نفس ملف الإكسل (`workbook.addWorksheet(`شعبة ${section_number}`)`) — كل شيت بعنوانه (رقم الشعبة، اسم عضو التدريس، المقرر) فوق جدول طلابه، بنفس تنسيق الأعمدة والألوان الموضّح فوق

---

## API / Data Layer
مفيش حاجة لـ Backend منفصل — التعامل مباشر مع Supabase من الـ Frontend عبر `@supabase/supabase-js`، والحماية بتتفرض بالكامل عبر RLS Policies. الاستثناء الوحيد المحتاج Edge Function (اختياري):
- **Edge Function للتصدير** (لو عايزين توليد ملف الإكسل من السيرفر بدل المتصفح، خصوصًا لو عدد الطلاب كبير وممكن يبطّئ المتصفح)

---

## متطلبات غير وظيفية
- **دخول متزامن:** Postgres (عبر Supabase) بيتحمل كتابة متزامنة من 30 مستخدم بسهولة، مفيش داعي لأي حل إضافي
- **الحفظ:** كل خانة درجة تتحفظ لوحدها فور الإدخال، مش batch كامل الشعبة
- **التحقق من صحة المدخلات:** الحدود القصوى لكل خانة (0-40، 0-10، 0-5، إلخ) متأكدة منها بـ `CHECK constraints` في القاعدة نفسها، مش بس في الواجهة
- **HTTPS:** مضمون تلقائيًا مع Supabase + أي استضافة Frontend حديثة (Vercel/Netlify)

---

## خطة التنفيذ المقترحة (Milestones)
1. إعداد مشروع Supabase (الجداول + RLS Policies)
2. إعداد مشروع React + TypeScript + Vite + Tailwind + Supabase client
3. صفحة تسجيل الدخول + التوجيه حسب الدور
4. استيراد بيانات الطلاب والشعب (Admin)
5. لوحة تحكم عضو التدريس (العرض + الإدخال + الحفظ التلقائي)
6. لوحة تحكم Admin (إدارة + نسبة الإنجاز)
7. **ميزة التصدير بتصميم الإكسل الأصلي (exceljs)**
8. اختبار الدخول المتزامن (محاكاة عدة مستخدمين بيكتبوا في نفس الوقت)
9. النشر (Vercel/Netlify للـ Frontend، Supabase مُستضاف أصلًا)

---

## بيانات مرجعية من النظام الحالي (Excel)
النظام ده بديل لملف إكسل كان بيحتوي على:
- ورقة "البيانات": كل الطلاب (~1000 صف) بالأعمدة: الرقم الجامعي، اسم الطالب، التخصص، المقرر، النوع، الفترة، مدرس المقرر، رقم الشعبة
- ورقة "الدرجات": نفس الطلاب + 8 خانات درجات (المشرف الميداني، المشرف الأكاديمي، 4 دورات منصات، كتابة تقرير، مناقشة تقرير) + مجموع
- كانت فيه مشاكل: عدم توافق مع الآيباد (VBA مش مدعوم)، تعارض عند الفتح المتزامن من عدة مستخدمين — وهي بالظبط المشاكل اللي التطبيق ده جاي يحلها.
