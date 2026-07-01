# نظام إدارة الصور - دليل التنفيذ الشامل

## 📋 محتويات الملفات المُنشأة

### 1. **ملفات الترحيل (Migrations)**

- `migrations/001-add-image-url-column.sql`
  - إضافة عمود `image_url` لجدول students
  - إضافة عمود `image_upload_date`
  - إضافة فهارس للأداء

### 2. **خدمات (Services)**

- `services/imageService.js`
  - فئة شاملة للتعامل مع الصور
  - تحميل الصور
  - حذف الصور
  - استبدال الصور
  - التحقق من صحة الملفات
  - تحويل Base64 إلى صور حقيقية

### 3. **المسارات (Routes)**

- `routes/studentImageRoutes.js`
  - `POST /api/students/:id/upload-image` - تحميل/استبدال الصورة
  - `DELETE /api/students/:id/image` - حذف الصورة
  - `GET /api/students/:id/image` - الحصول على معلومات الصورة

### 4. **سكريبتات (Scripts)**

- `scripts/migrate-photos-to-storage.js`
  - نقل جميع الصور القديمة من Base64 إلى Supabase Storage
  - تسجيل تفصيلي للعمليات
  - معالجة قوية للأخطاء

### 5. **التوثيق (Documentation)**

- `docs/SERVER_INTEGRATION_GUIDE.md` - دليل تكامل الخادم
- `docs/FRONTEND_INTEGRATION_GUIDE.js` - مكونات وأمثلة واجهة أمامية
- `docs/API_DOCUMENTATION.js` - توثيق كامل للـ API
- `config/environment-setup.md` - إعداد متغيرات البيئة

---

## 🚀 خطوات التنفيذ

### **الخطوة 1️⃣: إعداد متغيرات البيئة**

تعديل ملف `.env`:

```env
# أضف هذه المتغيرات
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key
```

**للحصول على المفاتيح:**

1. اذهب إلى [Supabase Dashboard](https://app.supabase.com)
2. اختر مشروعك
3. انتقل إلى **Settings** → **API**
4. انسخ **Project URL** و **Anon public key**

---

### **الخطوة 2️⃣: إنشاء Bucket في Supabase**

#### الطريقة A: عبر لوحة التحكم

1. في Supabase Dashboard، اذهب إلى **Storage**
2. انقر **Create New Bucket**
3. أدخل الاسم: `images`
4. اجعله **Public** (لتحميل الصور مباشرة)
5. حد أقصى للحجم: 5MB

#### الطريقة B: عبر CLI

```bash
supabase storage create-bucket images --public
```

---

### **الخطوة 3️⃣: تثبيت المكتبات المطلوبة**

```bash
npm install multer
```

**ملاحظة:** `@supabase/supabase-js` مثبت بالفعل

---

### **الخطوة 4️⃣: تشغيل الترحيل (Migration)**

شغّل الملف التالي في Supabase SQL Editor أو عبر CLI:

```bash
psql $DATABASE_URL < migrations/001-add-image-url-column.sql
```

أو في Supabase Dashboard:

1. اذهب إلى **SQL Editor**
2. انسخ محتوى `migrations/001-add-image-url-column.sql`
3. انقر **Execute**

---

### **الخطوة 5️⃣: دمج Routes في server.js**

**اتبع التعليمات في `docs/SERVER_INTEGRATION_GUIDE.md`:**

أضف في أعلى الملف (مع الاستيرادات):

```javascript
const imageService = require("./services/imageService");
const studentImageRoutes = require("./routes/studentImageRoutes");
```

أضف بعد تعريف الـ routes الأخرى:

```javascript
app.use("/api/students", studentImageRoutes);
```

أضف معالج حذف الصور عند حذف الطالب (انظر الدليل للتفاصيل الكاملة)

---

### **الخطوة 6️⃣: ترحيل الصور القديمة (اختياري)**

إذا كان لديك صور قديمة مخزنة بصيغة Base64:

```bash
node scripts/migrate-photos-to-storage.js
```

**ماذا يفعل:**

1. يبحث عن جميع الطلاب الذين لديهم `photo_data`
2. يحول Base64 إلى صور حقيقية
3. يرفعها إلى Supabase Storage
4. يحدث قاعدة البيانات بروابط الصور
5. ينشئ تقرير مفصل (migration-\*.log)

**بعد التنفيذ:**

1. اقرأ ملف السجل
2. تحقق من بضعة سجلات يدويًا
3. إذا كان كل شيء تمام، احذف العمود القديم:
   ```sql
   ALTER TABLE students DROP COLUMN photo_data;
   ```

---

## 📱 واجهة المستخدم (Frontend)

### **مثال: مكون React بسيط**

```jsx
import { StudentImageUpload } from "./components/StudentImageUpload";

function StudentForm({ studentId }) {
  return (
    <form>
      <input type="text" placeholder="اسم الطالب" />

      <StudentImageUpload
        studentId={studentId}
        onUploadSuccess={(imageUrl) => console.log("تم:", imageUrl)}
        onError={(error) => console.error("خطأ:", error)}
      />

      <button type="submit">حفظ</button>
    </form>
  );
}
```

**انظر `docs/FRONTEND_INTEGRATION_GUIDE.js` للمزيد من الأمثلة:**

- مكونات React جاهزة للاستخدام
- فئة API Helper
- أمثلة jQuery و Vanilla JavaScript

---

## 🔌 API Endpoints

### **تحميل صورة**

```
POST /api/students/{id}/upload-image
Content-Type: multipart/form-data

Body: image (file)
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "student": {
    "id": 1,
    "name": "أحمد",
    "image_url": "https://...",
    "image_upload_date": "2024-01-15T..."
  }
}
```

### **حذف صورة**

```
DELETE /api/students/{id}/image
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "تم حذف الصورة بنجاح"
}
```

### **الحصول على معلومات الصورة**

```
GET /api/students/{id}/image
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "student": {
    "id": 1,
    "name": "أحمد",
    "image_url": "https://...",
    "image_upload_date": "2024-01-15T..."
  }
}
```

**انظر `docs/API_DOCUMENTATION.js` للتفاصيل الكاملة**

---

## ✅ التحقق من الإعداد

### **اختبر الاتصال:**

```bash
node -e "
const supabase = require('@supabase/supabase-js');
const client = supabase.createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
console.log('✓ Supabase متصل');
"
```

### **اختبر الـ Bucket:**

```bash
curl -X GET \
  -H "Authorization: Bearer your-anon-key" \
  "https://your-project.supabase.co/storage/v1/bucket"
```

---

## 🛡️ أمان

### **معايير التحقق:**

- ✓ حد أقصى: 5MB لكل صورة
- ✓ صيغ مدعومة: JPEG, PNG, GIF, WebP
- ✓ توثيق مطلوب (Bearer token)
- ✓ حذف آمن للملفات القديمة

### **المسارات الآمنة:**

```
students/
├── student-1-1705326600000.jpg
├── student-2-1705326700000.png
└── student-3-1705326800000.gif
```

---

## 🚨 معالجة الأخطاء

### **أخطاء شائعة:**

| الخطأ                   | الحل                                    |
| ----------------------- | --------------------------------------- |
| "Invalid file type"     | استخدم صور بصيغة JPEG, PNG, GIF أو WebP |
| "File size exceeds 5MB" | استخدم صور أصغر من 5MB                  |
| "Bucket not found"      | تأكد من إنشاء bucket باسم "images"      |
| "Unauthorized"          | تحقق من token والـ API key              |
| "Student not found"     | تأكد أن معرف الطالب صحيح                |

---

## 📊 هيكل قاعدة البيانات

### **جدول students (المحدث):**

```sql
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  photo_data TEXT,              -- قديم: يمكن حذفه لاحقًا
  image_url TEXT,               -- جديد: رابط الصورة في Storage
  image_upload_date TIMESTAMP,  -- جديد: وقت الرفع
  ...
);
```

---

## 🔄 سير العمل الكامل

```
1. المستخدم يختار صورة
   ↓
2. التحقق من الملف (نوع + حجم)
   ↓
3. رفع إلى Supabase Storage
   ↓
4. الحصول على Public URL
   ↓
5. تحديث قاعدة البيانات
   ↓
6. عرض الصورة للمستخدم
```

### **عند الحذف:**

```
1. المستخدم ينقر حذف
   ↓
2. حذف من Supabase Storage
   ↓
3. مسح image_url من قاعدة البيانات
   ↓
4. تحديث واجهة المستخدم
```

---

## 📚 موارد إضافية

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Multer Docs](https://github.com/expressjs/multer)
- [Express Middleware](https://expressjs.com/en/guide/using-middleware.html)

---

## 🎯 الخطوات التالية

بعد الإعداد الأساسي:

1. ✓ اختبر تحميل صورة واحدة
2. ✓ اختبر حذف الصورة
3. ✓ اختبر استبدال الصورة
4. ✓ شغّل سكريبت الترحيل (إن وجدت صور قديمة)
5. ✓ قم بحذف العمود `photo_data` بعد التحقق

---

## 📝 ملاحظات مهمة

- **النسخ الاحتياطية:** احفظ نسخة احتياطية قبل حذف `photo_data`
- **الأداء:** استخدم CDN لـ Supabase Storage للأداء الأفضل
- **الحجم:** قد تحتاج لترقية خطة Supabase إذا كان لديك صور كثيرة جدًا
- **الخصوصية:** استخدم RLS policies إذا كنت تريد صورًا خاصة

---

**تم إنشاء النظام بواسطة:** GitHub Copilot  
**آخر تحديث:** 2024
