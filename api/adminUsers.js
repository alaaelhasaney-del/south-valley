const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const router = express.Router();

function requireAdmin(req, res) {
  const role = req?.user?.role;
  if (
    !req.user || // لا يوجد كائن مستخدم يعني عدم المصادقة
    !(
      role === "admin" ||
      role === "system admin" ||
      role === "system_admin" || // أدوار الأدمن الصارمة
      role === "general manager" ||
      role === "general_manager" ||
      role === "مدير عام"
    ) // أدوار المدير العام
  ) {
    res.status(403).json({ error: "Admin access only" });
    return false;
  }
  return true;
}

// إعداد اتصال قاعدة البيانات للاستخدام في الـ Transaction
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

router.post("/create", async (req, res) => {
  // req.user must be provided by authenticateToken middleware in the parent server
  if (!requireAdmin(req, res)) return;

  const {
    email,
    password,
    tenant_id,
    role,
    branch_ids,
    name,
    photo_data,
    status,
    is_approved,
  } = req.body || {};
  if (!email || !password || !role) {
    return res
      .status(400)
      .json({ error: "email, password, role are required" });
  }

  const dbClient = await pool.connect();
  let authUserId = null;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res
      .status(500)
      .json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const cleanEmail = String(email).trim().toLowerCase();

    // 1) التحقق من وجود المستخدم في الجدول المحلي (هل هو يتيم أم مكرر؟)
    const checkEmail = await dbClient.query(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [cleanEmail],
    );

    let existingOrphanId = null;
    if (checkEmail.rows.length > 0) {
      const existingUser = checkEmail.rows[0];
      // التحقق هل المعرف الحالي مرتبط بحساب Auth فعلي؟
      const { data: authCheck } = await supabaseAdmin.auth.admin.getUserById(
        existingUser.id,
      );

      if (authCheck && authCheck.user) {
        return res.status(409).json({
          error: "هذا البريد الإلكتروني مسجل بالفعل ومرتبط بحساب نشط.",
        });
      }
      // إذا لم يوجد في Auth، فهو مستخدم يتيم سنقوم بـ "تحويله"
      existingOrphanId = existingUser.id;
    }

    // 2) إنشاء المستخدم في Supabase Auth
    const { data: authData, error: createAuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          name: name || "",
          tenant_id: tenant_id ?? 1,
          role,
          branch_ids: Array.isArray(branch_ids) ? branch_ids : [],
        },
      });

    if (createAuthError) {
      // Normalize known message to match the UI expectation
      const msg = createAuthError?.message || "Failed to create auth user";
      console.error("Supabase Auth Admin Create User Error:", createAuthError); // تسجيل تفصيلي للخطأ
      return res.status(400).json({
        error: msg.includes("User not allowed")
          ? "لم يتم السماح بالعملية. تأكد من استخدام Service Role Key في إعدادات الاتصال بسوبابيس."
          : msg,
      });
    }

    authUserId = authData.user.id;
    console.log("[adminUsers/create] authUserId:", authUserId);

    // 3) حفظ البيانات في قاعدة البيانات
    await dbClient.query("BEGIN");

    const hashedPassword = await bcrypt.hash(password, 10);
    const branchIds = Array.isArray(branch_ids) ? branch_ids : [];
    const primaryBranch = branchIds.length ? branchIds[0] : null;

    // فحص ما إذا كان هناك سجل قد تم إنشاؤه بالفعل بواسطة Trigger في سوبابيس
    const { rows: triggeredRows } = await dbClient.query(
      "SELECT id FROM users WHERE id = $1",
      [authUserId],
    );

    if (triggeredRows.length > 0) {
      // إذا وجد سجل (بسبب التريجر)، نقوم بتحديثه فقط
      await dbClient.query(
        `UPDATE users SET name=$2, role=$3, branch_ids=$4, branch_id=$5, status=$6, password_hash=$7, is_approved=$8 WHERE id=$1`,
        [
          authUserId,
          name || "",
          role,
          branchIds,
          primaryBranch,
          status || "active",
          hashedPassword,
          is_approved ?? true,
        ],
      );

      // وإذا كان هناك "يتيم" قديم بنفس الإيميل، نحذفه الآن لأننا استبدلناه
      if (existingOrphanId && existingOrphanId !== authUserId) {
        await dbClient.query("DELETE FROM users WHERE id = $1", [
          existingOrphanId,
        ]);
      }
    } else if (existingOrphanId) {
      // تحويل "اليتم" بدون تحديث PK (id) لأن users.id مربوط بـ auth.users(id)
      // وأي لحظة أثناء UPDATE قد تسبب Foreign Key violation.
      // الحل: حذف السجل القديم ثم INSERT بالـ authUserId الجديد.
      await dbClient.query("DELETE FROM users WHERE id = $1", [
        existingOrphanId,
      ]);

      await dbClient.query(
        `INSERT INTO users (id, name, email, role, tenant_id, branch_ids, branch_id, status, password_hash, is_approved)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          authUserId,
          name || "",
          cleanEmail,
          role,
          tenant_id ?? 1,
          branchIds,
          primaryBranch,
          status || "active",
          hashedPassword,
          is_approved ?? true,
        ],
      );
    } else {
      // إضافة مستخدم جديد كلياً
      await dbClient.query(
        `INSERT INTO users (id, name, email, role, tenant_id, branch_ids, branch_id, status, password_hash, is_approved)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          authUserId,
          name || "",
          cleanEmail,
          role,
          tenant_id ?? 1,
          branchIds,
          primaryBranch,
          status || "active",
          hashedPassword,
          is_approved ?? true,
        ],
      );
    }

    await dbClient.query("COMMIT");

    return res.status(201).json({ user_id: authData.user.id });
  } catch (err) {
    await dbClient.query("ROLLBACK");
    // إذا فشل الحفظ في الجدول، نحذف المستخدم من Auth لضمان الربط
    if (authUserId) await supabaseAdmin.auth.admin.deleteUser(authUserId);

    console.error("Admin create user error:", err);
    return res.status(500).json({ error: err.message || String(err) });
  } finally {
    dbClient.release();
  }
});

router.post("/update", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const {
    userId,
    email,
    password,
    role,
    branch_ids,
    name,
    photo_data,
    status,
    is_approved,
  } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: "userId مطلوب" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: "متغيرات بيئة Supabase غير موجودة" });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const dbClient = await pool.connect();

  try {
    // التحقق هل المستخدم موجود في Auth أصلاً؟ (لمعالجة المستخدمين المعلقين/الأيتام)
    const { data: authUser, error: fetchAuthError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (fetchAuthError || !authUser) {
      return res.status(404).json({
        error:
          "هذا المستخدم 'معلق' ولا يملك حساباً في نظام المصادقة. يرجى حذفه وإعادة إضافته لضمان الربط الصحيح.",
      });
    }

    // 1) تحديث المستخدم في Supabase Auth (إذا تغير البريد الإلكتروني/كلمة المرور/الدور)
    const authUpdatePayload = {};
    if (email) authUpdatePayload.email = String(email).trim();
    if (password) authUpdatePayload.password = password;

    // تحديث user_metadata للدور والفروع
    authUpdatePayload.user_metadata = {
      name: name || "",
      role: role,
      branch_ids: Array.isArray(branch_ids) ? branch_ids : [],
    };

    if (Object.keys(authUpdatePayload).length > 0) {
      const { error: updateAuthError } =
        await supabaseAdmin.auth.admin.updateUserById(
          userId,
          authUpdatePayload,
        );
      if (updateAuthError) {
        console.error(
          "Supabase Auth Admin Update User Error:",
          updateAuthError,
        );
        return res.status(400).json({
          error: `فشل تحديث المستخدم في Auth: ${updateAuthError.message}`,
        });
      }
    }

    // 2) تحديث صف البروفايل في public.users
    const branchIds = Array.isArray(branch_ids) ? branch_ids : [];
    const payload = {
      name: name ?? null,
      email: String(email).trim(),
      role,
      tenant_id: req.user.tenant_id ?? 1, // نفترض أن الأدمن أيضاً جزء من Tenant
      branch_ids: branchIds,
      branch_id: branchIds.length ? branchIds[0] : null,
      photo_data: photo_data ?? "",
      status: status ?? "pending",
      is_approved: Boolean(is_approved),
    };

    // استخدام dbClient لضمان تجاوز أي مشاكل في الصلاحيات أو الـ RLS أثناء تحديث الأدمن
    await dbClient.query(
      `UPDATE users 
       SET name=$1, email=$2, role=$3, branch_ids=$4, branch_id=$5, photo_data=$6, status=$7, is_approved=$8, updated_at=NOW()
       WHERE id=$9`,
      [
        payload.name,
        payload.email,
        payload.role,
        payload.branch_ids,
        payload.branch_id,
        payload.photo_data,
        payload.status,
        payload.is_approved,
        userId,
      ],
    );

    return res.status(200).json({ success: true, user_id: userId });
  } catch (err) {
    console.error("Admin update user error:", err);
    return res.status(500).json({ error: err.message || String(err) });
  } finally {
    dbClient.release();
  }
});

router.post("/delete", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res
      .status(500)
      .json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // حذف كامل: حذف من Auth + حذف صف profile من public.users

    // 1) حذف المستخدم من Supabase Auth
    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error("Supabase Auth Delete Error:", authError);
      return res.status(400).json({
        error: `فشل حذف المستخدم من نظام المصادقة: ${authError.message}`,
      });
    }

    // ملاحظة: تم إزالة حذف السجل من جدول users يدوياً
    // لأننا نعتمد الآن على ON DELETE CASCADE في قاعدة البيانات.
    // بمجرد حذف المستخدم من Auth، سيُحذف بروفايله تلقائياً.

    // 3) (اختياري) أي cleanup للبيانات الأخرى إن وجدت يمكن إضافتها هنا

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
});

module.exports = router;
