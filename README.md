# إعداد وتشغيل نظام إدارة الأكاديمية

## 1. قاعدة البيانات (Supabase)

1. اذهب https://supabase.com/dashboard/project/vtgwvjljyqjatzomebhm/sql
2. انسخ schema.sql وشغل.

## 2. الخادم

```
# في root
echo DATABASE_URL=postgresql://postgres.vtgwvjljyqjatzomebhm:01012857242A@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true > .env
node server.js
```

## 2.1. نسخ بيانات من قاعدة محلية إلى القاعدة الحالية

إذا لديك بيانات محلية وترغب في نقلها إلى قاعدة Supabase الحالية، ضع رابط المصدر في `.env` بهذه الصيغة:

```
SOURCE_DATABASE_URL=postgresql://user:password@localhost:5432/your_local_db
TARGET_DATABASE_URL=postgresql://postgres.vtgwvjljyqjatzomebhm:01012857242A@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
```

ثم شغل:

```
node copy-local-data.js
```

هذا السكربت ينسخ الفروع، الأقسام، الطلاب، المستخدمين، البنود، والحركات المالية من المصدر إلى الوجهة دون تكرار السجلات المتطابقة.

## 3. الويب (Vite)

```
cd dashboard-electron
npm run dev
```

→ http://localhost:5173

## 4. الإعدادات الجديدة

- اذهب "الإعدادات" → أضف فروع (اسم, موقع).
- ستظهر في الطلاب/الأقسام.

**تم!** Network Error محلول, الفروع تعمل.
