-- سكريبت لفحص حالة جداول النظام والتأكد من وجودها
DO $$
DECLARE
    required_tables TEXT[] := ARRAY[
        'tenants', 
        'branches', 
        'users', 
        'departments', 
        'students',
        'courses', 
        'finances', 
        'expense_items', 
        'student_fees',
        'student_fees_payments', 
        'student_grades', 
        'student_attendance',
        'archived_students', 
        'role_permissions'
    ];
    table_name TEXT;
    missing_count INTEGER := 0;
BEGIN
    RAISE NOTICE '--- فحص جداول نظام إدارة الأكاديمية ---';
    
    FOREACH table_name IN ARRAY required_tables
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name) THEN
            RAISE NOTICE '✅ الجدول موجود: %', table_name;
        ELSE
            RAISE WARNING '❌ الجدول مفقود: %', table_name;
            missing_count := missing_count + 1;
        END IF;
    END LOOP;

    IF missing_count = 0 THEN
        RAISE NOTICE '🎉 قاعدة البيانات مكتملة وجاهزة للعمل.';
    ELSE
        RAISE WARNING '⚠️ تنبيه: هناك % جدول مفقود. يرجى مراجعة ملفات schema.sql', missing_count;
    END IF;
END $$;