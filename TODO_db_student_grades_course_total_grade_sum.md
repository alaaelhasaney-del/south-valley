# TODO: course_total_grade (مجموع الدرجات) لبيانات الدرجات وبيان درجات الخريج

## الهدف

إضافة/تعديل التريجر أو دالة حساب `student_grades.course_total_grade` بحيث يكون مطابق لطلبك:

**course_total_grade = (grade) + (behavior_grade) + (activity_grade) + (sheet_grade)**

## الحالة الحالية

- يوجد عمود `course_total_grade` في `student_grades`.
- يوجد تريجر اسمه (مبدئياً) `student_grades_set_course_total_grade()`.
- لا يوجد ضمان أنه يعمل أو أنه يجمع بالطريقة المطلوبة.

## خطوات التنفيذ (مرتّبة)

1. تحديد/فتح الدالة `student_grades_set_course_total_grade()` داخل ملفات SQL أو schema.
2. إن لم تكن موجودة: إنشاء الدالة + تريجر.
3. تعديل منطق الدالة ليستخدم COALESCE لكل عمود (حتى لو كان NULL).
4. التأكد أن الدالة تعمل على:
   - BEFORE INSERT
   - BEFORE UPDATE
5. عمل SQL Test سريع:
   - INSERT صف بدرجات ناقصة (NULL)
   - UPDATE صف
   - التأكد أن `course_total_grade` تحسب تلقائياً.

## مخرجات متوقعة

- عند عرض `بيان الدرجات` و `بيان درجات الخريج` تظهر `course_total_grade` صحيحة.
