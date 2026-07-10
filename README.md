# بوابة أعضاء هيئة التدريس

منصة ويب لأعضاء هيئة التدريس في الكلية التطبيقية (رفحاء) — جامعة الحدود الشمالية: رصد درجات التدريب الميداني، الجداول، وطلبات الاعتذار.

## الألوان
- **Butter:** `#ffefb3`
- **Green:** `#013e37`

## الخطوة 1: إعداد قاعدة البيانات

1. افتح [لوحة Supabase](https://supabase.com/dashboard/project/vebgmikrpwyydsqwgkvd/sql/new)
2. انسخ محتوى الملف `supabase/migrations/001_initial_schema.sql` والصقه في SQL Editor
3. اضغط **Run** لتنفيذ السكربت

## الخطوة 2: إنشاء حساب Admin

من Supabase → **Authentication** → **Users** → **Add user**:

- Email: بريدك
- Password: كلمة مرور
- User Metadata (JSON):
```json
{
  "role": "admin",
  "full_name": "مسؤول النظام"
}
```

## الخطوة 3: إنشاء حسابات أعضاء التدريس

نفس الخطوة مع metadata:
```json
{
  "role": "instructor",
  "full_name": "د. أحمد محمد"
}
```

## النشر (Vercel / Netlify)

### إعدادات Vercel
- **Root Directory:** اتركه فارغاً (الجذر) — ملف `vercel.json` يوجّه البناء تلقائياً
- **Environment Variables** (مطلوبة):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### إعدادات Netlify
- يستخدم `netlify.toml` تلقائياً — مجلد البناء: `app/dist`


```bash
cd app
npm install
npm run dev
```

افتح المتصفح على `http://localhost:5173`

## الاستخدام

1. **Admin:** استورد ملف Excel/CSV للطلاب → اربط كل شعبة بعضو التدريس → راقب نسبة الإنجاز → صدّر النتيجة
2. **Instructor:** اختر الشعبة → أدخل الدرجات (تُحفظ تلقائياً عند الخروج من كل خانة)

## بنية المشروع

```
Maha/
├── project-spec.md          # المواصفات الكاملة
├── supabase/
│   └── migrations/          # سكربتات قاعدة البيانات
└── app/                     # تطبيق React
    ├── src/
    │   ├── pages/           # صفحات التطبيق
    │   ├── lib/             # Supabase, استيراد, تصدير
    │   └── types/           # أنواع TypeScript
    └── .env                 # مفاتيح Supabase
```
