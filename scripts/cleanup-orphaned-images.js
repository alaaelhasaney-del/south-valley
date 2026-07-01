const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ override: true });

// إعداد عميل Supabase باستخدام Service Role لضمان صلاحيات الحذف
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const BUCKET_NAME = "images";

async function cleanupOrphanedImages() {
  console.log("🚀 بدء عملية تنظيف الصور المهملة...");

  try {
    // 1. جلب كافة الروابط المستخدمة في قاعدة البيانات
    const [tenants, students, users] = await Promise.all([
      supabase.from("tenants").select("logo_url, seal_url, signature_url"),
      supabase.from("students").select("image_url"),
      supabase.from("users").select("photo_url"),
    ]);

    const usedPaths = new Set();

    // دالة مساعدة لاستخراج المسار النسبي من الرابط العام
    const extractPath = (url) => {
      if (!url || typeof url !== "string") return null;
      const parts = url.split(`/storage/v1/object/public/${BUCKET_NAME}/`);
      return parts.length > 1 ? parts[1] : null;
    };

    // تجميع المسارات من الجداول
    tenants.data?.forEach((t) => {
      if (t.logo_url) usedPaths.add(extractPath(t.logo_url));
      if (t.seal_url) usedPaths.add(extractPath(t.seal_url));
      if (t.signature_url) usedPaths.add(extractPath(t.signature_url));
    });
    students.data?.forEach((s) => {
      if (s.image_url) usedPaths.add(extractPath(s.image_url));
    });
    users.data?.forEach((u) => {
      if (u.photo_url) usedPaths.add(extractPath(u.photo_url));
    });

    console.log(
      `✅ تم العثور على ${usedPaths.size} ملف مستخدم في قاعدة البيانات.`,
    );

    // 2. جلب قائمة الملفات من Storage (المجلدات الأساسية)
    const folders = ["profiles", "users", "logos", "seals", "signatures"];
    let orphanedFiles = [];

    for (const folder of folders) {
      const { data: files, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(folder);

      if (error) {
        console.error(`❌ خطأ في قراءة المجلد ${folder}:`, error.message);
        continue;
      }

      files.forEach((file) => {
        const fullPath = `${folder}/${file.name}`;
        // إذا كان ملفاً وليس مجلداً، وغير موجود في قائمة الاستخدام
        if (file.id && !usedPaths.has(fullPath)) {
          orphanedFiles.push(fullPath);
        }
      });
    }

    if (orphanedFiles.length === 0) {
      console.log("✨ لا توجد صور مهملة للحذف. النظام نظيف!");
      return;
    }

    console.log(
      `⚠️ تم العثور على ${orphanedFiles.length} ملف مهمل. جاري الحذف...`,
    );

    // 3. حذف الملفات المهملة (على دفعات لتجنب الضغط على الـ API)
    const batchSize = 50;
    for (let i = 0; i < orphanedFiles.length; i += batchSize) {
      const batch = orphanedFiles.slice(i, i + batchSize);
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(batch);

      if (deleteError) {
        console.error(
          `❌ فشل حذف الدفعة ${i / batchSize + 1}:`,
          deleteError.message,
        );
      } else {
        console.log(`🗑️ تم حذف ${batch.length} ملف بنجاح.`);
      }
    }

    console.log("✅ اكتملت عملية التنظيف بنجاح.");
  } catch (err) {
    console.error("💥 حدث خطأ غير متوقع:", err.message);
  }
}

cleanupOrphanedImages();
