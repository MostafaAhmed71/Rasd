Version: v1.5.0
Date: 2026-07-11

Changes
- إضافة تبويب «موادي» لعرض مقررات عضو التدريس
- استبدال تقييمات التدريب الميداني بتقييمات المادة: أعمال سنة 40 + نصفي 20 + نهائي 40
- تحديث تصدير Excel وواجهة رصد الدرجات حسب المادة مع الإبقاء على رقم الشعبة

Files Modified
- supabase/migrations/007_course_grade_structure.sql
- app/src/types/database.ts
- app/src/pages/instructor/CoursesPage.tsx
- app/src/pages/instructor/GradesPage.tsx
- app/src/lib/exportExcel.ts
- app/src/components/InstructorNav.tsx
- app/src/App.tsx
- app/src/pages/LoginPage.tsx
- app/src/pages/RegisterPage.tsx
- app/src/components/ProtectedRoute.tsx
- VERSION.md

Previous: v1.4.3
