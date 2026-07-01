#!/bin/bash
# Quick Testing Guide - أمثلة curl لاختبار الـ API

# ===================================
# متغيرات التهيئة
# ===================================

API_URL="http://localhost:3000"
STUDENT_ID="1"
TOKEN="your-auth-token-here"

# تغيير المتغيرات حسب احتياجاتك:
# export API_URL="http://localhost:3000"
# export STUDENT_ID="1"
# export TOKEN=$(cat token.txt)  # اقرأ الـ token من ملف

# ===================================
# 1. اختبر اتصال الخادم
# ===================================

echo "=== Test 1: API Connection ==="
echo "اختبار اتصال الخادم..."
curl -s http://localhost:3000/api/health \
  -H "Content-Type: application/json" | jq '.'
echo ""

# ===================================
# 2. احصل على معلومات الطالب الحالية
# ===================================

echo "=== Test 2: Get Student Info ==="
echo "الحصول على معلومات الطالب..."
curl -s $API_URL/api/students/$STUDENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# ===================================
# 3. احصل على معلومات الصورة الحالية
# ===================================

echo "=== Test 3: Get Current Image Info ==="
echo "الحصول على معلومات الصورة الحالية..."
curl -s $API_URL/api/students/$STUDENT_ID/image \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# ===================================
# 4. رفع صورة اختبار
# ===================================

echo "=== Test 4: Upload Image ==="
echo "رفع صورة اختبار..."

# تحقق من وجود صورة اختبار
if [ ! -f "test-image.jpg" ]; then
  echo "⚠️  لم أجد test-image.jpg"
  echo "استخدم صورة موجودة أو أنشئ واحدة"
  # إنشاء صورة اختبار بسيطة (1x1 pixel JPEG)
  # يمكنك استخدام أي صورة فعلية
  echo "💡 Tip: استخدم صورة موجودة لديك"
else
  curl -s -X POST $API_URL/api/students/$STUDENT_ID/upload-image \
    -H "Authorization: Bearer $TOKEN" \
    -F "image=@test-image.jpg" | jq '.'
fi
echo ""

# ===================================
# 5. احصل على معلومات الصورة بعد الرفع
# ===================================

echo "=== Test 5: Get Image After Upload ==="
echo "الحصول على معلومات الصورة بعد الرفع..."
curl -s $API_URL/api/students/$STUDENT_ID/image \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# ===================================
# 6. اختبر حذف الصورة
# ===================================

echo "=== Test 6: Delete Image ==="
echo "اختبار حذف الصورة..."
read -p "هل تريد حذف الصورة؟ (y/n): " confirm
if [ "$confirm" = "y" ]; then
  curl -s -X DELETE $API_URL/api/students/$STUDENT_ID/image \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" | jq '.'
else
  echo "تم الإلغاء"
fi
echo ""

# ===================================
# 7. اختبر رفع صورة بحجم كبير (اختبار الخطأ)
# ===================================

echo "=== Test 7: Test Large File Error ==="
echo "اختبار خطأ الملف الكبير..."

# إنشاء ملف وهمي كبير (بدون فعل رفع فعلي)
echo "سيتم اختبار الخطأ - حاول رفع ملف > 5MB"
echo "💡 هذا سيرجع خطأ: File size exceeds 5MB limit"
echo ""

# ===================================
# 8. اختبر ملف بنوع خاطئ (اختبار الخطأ)
# ===================================

echo "=== Test 8: Test Invalid File Type ==="
echo "اختبار خطأ نوع الملف..."

# إنشاء ملف نصي
echo "This is not an image" > test.txt

curl -s -X POST $API_URL/api/students/$STUDENT_ID/upload-image \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@test.txt" | jq '.'

rm test.txt
echo ""

# ===================================
# 9. اختبر الوصول بدون توثيق (اختبار الخطأ)
# ===================================

echo "=== Test 9: Test Unauthorized Access ==="
echo "اختبار الوصول بدون توثيق..."
curl -s $API_URL/api/students/$STUDENT_ID/image \
  -H "Content-Type: application/json" | jq '.'
echo ""

# ===================================
# 10. اختبر معرف طالب غير صحيح
# ===================================

echo "=== Test 10: Test Invalid Student ID ==="
echo "اختبار معرف طالب غير صحيح..."
curl -s $API_URL/api/students/99999/image \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# ===================================
# أمثلة إضافية - استخدام في السكريبت
# ===================================

# ===================================
# الحصول على الـ image_url بسهولة
# ===================================

echo "=== Bonus: Extract Image URL ==="
echo "استخراج رابط الصورة فقط..."

RESPONSE=$(curl -s $API_URL/api/students/$STUDENT_ID/image \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

IMAGE_URL=$(echo $RESPONSE | jq -r '.student.image_url')

if [ "$IMAGE_URL" != "null" ]; then
  echo "✓ رابط الصورة: $IMAGE_URL"
  echo ""
  echo "يمكنك استخدام هذا الرابط في <img> tag:"
  echo '<img src="'$IMAGE_URL'" alt="student photo">'
else
  echo "✗ لا توجد صورة لهذا الطالب"
fi
echo ""

# ===================================
# اختبار الأداء - رفع صور متعددة
# ===================================

echo "=== Bonus: Batch Upload Test ==="
echo "اختبار رفع صور متعددة..."

# نموذج
# for i in {1..5}; do
#   echo "رفع الصورة #$i..."
#   curl -s -X POST $API_URL/api/students/$STUDENT_ID/upload-image \
#     -H "Authorization: Bearer $TOKEN" \
#     -F "image=@test-image.jpg" | jq '.success'
#   sleep 0.5  # تأخير بين العمليات
# done

echo ""
echo "💡 Tip: عند رفع صور متعددة، أضف تأخير (sleep) بين الطلبات"
echo ""

# ===================================
# ملخص النتائج المتوقعة
# ===================================

cat << 'EOF'

=====================================
ملخص الاختبارات المتوقع
=====================================

✓ Test 1: الخادم يرد بـ 200 OK
✓ Test 2: معلومات الطالب مع/بدون صورة
✓ Test 3: معلومات الصورة (قد تكون فارغة في البداية)
✓ Test 4: تحميل الصورة بنجاح
✓ Test 5: معلومات الصورة الجديدة
✓ Test 6: حذف الصورة بنجاح
✗ Test 7: خطأ "File too large"
✗ Test 8: خطأ "Invalid file type"
✗ Test 9: خطأ "Unauthorized"
✗ Test 10: خطأ "Student not found"

=====================================
الرموز المستخدمة:
=====================================

✓ = يجب أن يكون ناجح
✗ = يجب أن يكون خطأ (normal)
200 = OK
201 = Created
400 = Bad Request
404 = Not Found
500 = Server Error

=====================================

EOF

# ===================================
# نصائح الاستخدام
# ===================================

cat << 'EOF'

💡 نصائح للاستخدام:
=====================================

1. تحديث المتغيرات:
   export API_URL="http://localhost:3000"
   export STUDENT_ID="1"
   export TOKEN="your-token"

2. استخدام jq لتحليل JSON:
   curl ... | jq '.student.image_url'

3. حفظ الـ response في ملف:
   curl ... > response.json

4. اختبار مع POST data:
   curl -X POST ... -d '{"key":"value"}'

5. إضافة timeout:
   curl --max-time 10 ...

6. عرض معلومات الـ request:
   curl -v ... (verbose)

7. اختبار بدون follow redirects:
   curl -L ... (follow redirects)

EOF

# ===================================
# أوامر مفيدة إضافية
# ===================================

cat << 'EOF'

🔧 أوامر مفيدة:
=====================================

# احصل على الـ token (مثال)
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' | jq '.token'

# اختبر اتصال الـ database
psql $DATABASE_URL -c "SELECT 1;"

# عرض logs الخادم في real-time
npm run dev 2>&1 | grep -E "error|Error|200|POST|DELETE"

# اختبر صحة البيئة
npm run test:images

# ترحيل الصور القديمة
npm run migrate:photos

EOF

echo ""
echo "✨ اختبارات جاهزة! اختر ما تريد تشغيله."
echo ""
