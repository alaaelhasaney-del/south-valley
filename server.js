const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

// Middleware
app.use(express.json());
app.use(require("cors")({ origin: true, credentials: true }));


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(require("helmet")());

// Postgres Pool (Supabase compatible)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// تهيئة عميل سوبابيس بصلاحيات الأدمن (Service Role) للتحكم في Auth
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY,
);

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
  // Allow preflight requests to pass through so CORS headers are returned
  if (req.method === "OPTIONS") return next();
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
      decoded.id,
    ]);
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: "Invalid token" });
    }

    const dbUser = userResult.rows[0];
    // Normalise branch_ids for multi-branch users.
    // Supports: branch_ids jsonb or null; fallback to branch_id.
    let branchIds = [];
    if (Array.isArray(dbUser.branch_ids)) branchIds = dbUser.branch_ids;
    else if (dbUser.branch_ids) {
      try {
        const parsed =
          typeof dbUser.branch_ids === "string"
            ? JSON.parse(dbUser.branch_ids)
            : dbUser.branch_ids;
        if (Array.isArray(parsed)) branchIds = parsed;
      } catch {
        // ignore
      }
    }
    // fallback to single branch_id
    if ((!branchIds || branchIds.length === 0) && dbUser.branch_id != null) {
      branchIds = [dbUser.branch_id];
    }

    req.user = {
      ...dbUser,
      branch_ids: branchIds
        .map((x) => Number(x))
        .filter((x) => Number.isFinite(x) && x > 0),
    };
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
  }
};

// Permission Check Middleware (Dynamic RBAC)
const checkPermission = (resource, action) => {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    // Wildcard: resource='*' and can_<action>=true
    const wildcard = await pool.query(
      "SELECT 1 FROM role_permissions WHERE role = $1 AND resource = '*' AND can_" +
        action +
        " = true LIMIT 1",
      [req.user.role],
    );
    if (wildcard.rows.length > 0) return next();

    try {
      const result = await pool.query(
        "SELECT * FROM role_permissions WHERE role = $1 AND resource = $2",
        [req.user.role, resource],
      );

      if (result.rows.length === 0 || !result.rows[0][`can_${action}`]) {
        return res.status(403).json({ error: "ليس لديك صلاحية لهذا الإجراء" });
      }

      // منع حذف أي عنصر إذا كانت حالته "نشط" (Active)
      if (action === "delete" && req.body && req.body.status === "active") {
        return res.status(403).json({
          error: "لا يمكن حذف العناصر النشطة، برجاء تغيير الحالة أولاً",
        });
      }

      next();
    } catch (err) {
      console.error("Permission check error:", err);
      res.status(500).json({ error: "فشل فحص الصلاحيات" });
    }
  };
};

// Test DB connection
pool.on("connect", () => console.log("Connected to DB"));
pool.on("error", (err) => console.error("DB connection error:", err));

// Generic CRUD functions
async function getAll(table, res, req, joins = "") {
  try {
    let query = `SELECT * FROM ${table} ${joins}`;
    let params = [];

    // Branch filtering for non-admin (supports multi-branch users)
    // Important: table `branches` should be filtered by `id` (its primary key), not `branch_id`.
    if (req.user && req.user.role !== "admin") {
      const hasBranchId = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = 'branch_id'",
        [table],
      );

      const ids = Array.isArray(req.user.branch_ids)
        ? req.user.branch_ids
        : null;
      const fallback = req.user.branch_id ? [req.user.branch_id] : null;
      const finalIds = (ids && ids.length > 0 ? ids : fallback) || [];

      const hasWhere = query.toUpperCase().includes("WHERE");

      if (table === "branches") {
        // Filter branches by their own id.
        if (finalIds.length === 0) {
          query += hasWhere ? " AND 1=0" : " WHERE 1=0";
        } else {
          query += hasWhere
            ? ` AND ${table}.id = ANY($1::int[])`
            : ` WHERE ${table}.id = ANY($1::int[])`;
          params.push(finalIds);
        }
      } else if (hasBranchId.rows.length > 0) {
        if (finalIds.length === 0) {
          query += hasWhere ? " AND 1=0" : " WHERE 1=0";
        } else {
          query += hasWhere
            ? ` AND ${table}.branch_id = ANY($1::int[])`
            : ` WHERE ${table}.branch_id = ANY($1::int[])`;
          params.push(finalIds);
        }
      }
    }

    const result = await pool.query(query, params);
    let rows = result.rows;
    if (table === "users") {
      rows = rows.map(({ password_hash, ...user }) => user);
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getById(table, id, res, idCol = "id") {
  try {
    const query = `SELECT * FROM ${table} WHERE ${idCol} = $1`;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });

    let safeData = result.rows[0];
    if (table === "users") {
      const { password_hash, ...userWithoutPassword } = safeData;
      safeData = userWithoutPassword;
    }
    res.json(safeData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function filterData(table, data) {
  const sanitizedData = {};
  for (let key in data) {
    if (data[key] !== undefined) {
      sanitizedData[key] = data[key] === "" ? null : data[key];
    }
  }
  return sanitizedData;
}

async function create(table, data, res, req) {
  try {
    const sanitizedData = filterData(table, data);

    if (table === "users" && sanitizedData.password_hash) {
      const salt = await bcrypt.genSalt(10);
      sanitizedData.password_hash = await bcrypt.hash(
        sanitizedData.password_hash,
        salt,
      );
    }

    const keys = Object.keys(sanitizedData).join(", ");
    const placeholders = Object.keys(sanitizedData)
      .map((_, i) => `$${i + 1}`)
      .join(", ");

    const result = await pool.query(
      `INSERT INTO ${table} (${keys}) VALUES (${placeholders}) RETURNING *`,
      Object.values(sanitizedData),
    );

    let safeData = result.rows[0];
    if (table === "users") {
      const { password_hash, ...userWithoutPassword } = safeData;
      safeData = userWithoutPassword;
    }

    res.status(201).json(safeData);
  } catch (err) {
    console.error(`Error creating in ${table}:`, err.message);
    res.status(500).json({ error: err.message });
  }
}

async function update(table, id, data, res, idCol = "id") {
  try {
    const sanitizedData = filterData(table, data);
    const setClause = Object.keys(sanitizedData)
      .map((key, i) => `${key} = $${i + 1}`)
      .join(", ");

    const query = `UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE ${idCol} = $${Object.keys(sanitizedData).length + 1} RETURNING *`;
    const values = [...Object.values(sanitizedData), id];

    const result = await pool.query(query, values);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error updating ${table}:`, err.message);
    res.status(500).json({ error: err.message });
  }
}

async function remove(table, id, res, idCol = "id") {
  try {
    const query = `DELETE FROM ${table} WHERE ${idCol} = $1 RETURNING *`;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];

    if (!user)
      return res
        .status(401)
        .json({ error: "البريد الإلكتروني غير مسجل في النظام" });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    if (user.status !== "active" && user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "هذا الحساب بانتظار التفعيل من قبل الإدارة" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        branch_id: user.branch_id,
        branch_ids: user.branch_ids,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser, message: "Login successful" });
  } catch (err) {
    console.error("Login error:", err);
    res
      .status(500)
      .json({ error: "Server error", details: err?.message || String(err) });
  }
});

// Protected CRUD Routes
app.get(
  "/api/students",
  authenticateToken,
  checkPermission("students", "read"),
  (req, res) => getAll("students", res, req),
);
app.get(
  "/api/students/:id",
  authenticateToken,
  checkPermission("students", "read"),
  (req, res) => getById("students", req.params.id, res),
);
app.post(
  "/api/students",
  authenticateToken,
  checkPermission("students", "create"),
  (req, res) => create("students", req.body, res),
);
app.put(
  "/api/students/:id",
  authenticateToken,
  checkPermission("students", "update"),
  (req, res) => update("students", req.params.id, req.body, res),
);
app.delete(
  "/api/students/:id",
  authenticateToken,
  checkPermission("students", "delete"),
  (req, res) => remove("students", req.params.id, res),
);

app.use("/api/students", require("./routes/studentImageRoutes"));

app.get(
  "/api/users",
  authenticateToken,
  checkPermission("users", "read"),
  (req, res) => getAll("users", res, req),
);
app.get(
  "/api/users/:id",
  authenticateToken,
  checkPermission("users", "read"),
  (req, res) => getById("users", req.params.id, res),
);
app.post(
  "/api/users",
  authenticateToken,
  checkPermission("users", "create"),
  async (req, res) => {
    const client = await pool.connect();
    let authUserId = null;

    try {
      const {
        email,
        password,
        role,
        name,
        branch_id,
        tenant_id,
        status,
        branch_ids,
      } = req.body;

      if (!email || !password || !role) {
        return res
          .status(400)
          .json({ error: "البريد الإلكتروني وكلمة المرور والرتبة مطلوبة" });
      }

      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: email.trim(),
          password: password,
          email_confirm: true,
          user_metadata: { name, role },
        });

      if (authError) throw new Error(`خطأ في نظام Auth: ${authError.message}`);
      authUserId = authData.user.id;

      await client.query("BEGIN");

      const hashedPassword = await bcrypt.hash(password, 10);
      const sanitizedData = filterData("users", {
        id: authUserId,
        email: email.trim(),
        name,
        role,
        branch_id:
          branch_id || (Array.isArray(branch_ids) && branch_ids[0]) || null,
        branch_ids: branch_ids || [],
        tenant_id: tenant_id || 1,
        status: status || "active",
        password_hash: hashedPassword,
        created_at: new Date(),
      });

      const keys = Object.keys(sanitizedData).join(", ");
      const placeholders = Object.keys(sanitizedData)
        .map((_, i) => `$${i + 1}`)
        .join(", ");

      const insertQuery = `INSERT INTO users (${keys}) VALUES (${placeholders}) RETURNING *`;
      const result = await client.query(
        insertQuery,
        Object.values(sanitizedData),
      );

      await client.query("COMMIT");
      res.status(201).json(result.rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      if (authUserId) await supabaseAdmin.auth.admin.deleteUser(authUserId);
      console.error("Error creating user with Transaction:", err.message);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  },
);
app.put(
  "/api/users/:id",
  authenticateToken,
  checkPermission("users", "update"),
  (req, res) => update("users", req.params.id, req.body, res),
);
app.delete(
  "/api/users/:id",
  authenticateToken,
  checkPermission("users", "delete"),
  (req, res) => remove("users", req.params.id, res),
);

// Roles
app.get("/api/roles", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT role FROM role_permissions ORDER BY role",
    );
    res.json(result.rows.map((r) => ({ name: r.role, label: r.role })));
  } catch (err) {
    console.error("Roles fetch error:", err);
    res.json([]);
  }
});

app.post("/api/roles", authenticateToken, async (req, res) => {
  const { roleName } = req.body;
  if (!roleName || !roleName.trim())
    return res.status(400).json({ error: "اسم الرتبة مطلوب" });

  const trimmedRole = roleName.trim();

  try {
    try {
      await pool.query(`ALTER TYPE user_role ADD VALUE '${trimmedRole}'`);
    } catch (enumErr) {
      if (enumErr.code !== "42710")
        console.warn("Enum update notice:", enumErr.message);
    }

    const check = await pool.query(
      "SELECT 1 FROM role_permissions WHERE role = $1 LIMIT 1",
      [trimmedRole],
    );
    if (check.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "الرتبة موجودة بالفعل في جدول الصلاحيات" });
    }

    const resources = [
      "dashboard",
      "users",
      "students",
      "student_grades",
      "student_fees",
      "student_fees_payments",
      "student_attendance",
      "departments",
      "courses",
      "finances",
      "expense_items",
      "branches",
      "activity_logs",
      "inventory",
      "change_password",
    ];

    for (const resource of resources) {
      await pool.query(
        `INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, updated_at)
         VALUES ($1, $2, true, true, true, true, CURRENT_TIMESTAMP)
         ON CONFLICT (role, resource) DO NOTHING`,
        [trimmedRole, resource],
      );
    }

    res
      .status(201)
      .json({ message: "تم إضافة الرتبة بنجاح", role: trimmedRole });
  } catch (err) {
    console.error("Add role error:", err);
    res.status(500).json({ error: "خطأ في السيرفر: " + err.message });
  }
});

// DELETE/PATCH roles: permission-based only (NO hardcoded admin)
const canManageRoles = async (req, action) => {
  // Uses wildcard permission (resource='*')
  const column = action === "delete" ? "can_delete" : "can_update";
  const q = `SELECT 1 FROM role_permissions WHERE role = $1 AND resource = '*' AND ${column} = true LIMIT 1`;
  const wildcard = await pool.query(q, [req.user.role]);
  return wildcard.rows.length > 0;
};

app.delete("/api/roles/:role", authenticateToken, async (req, res) => {
  const allowed = await canManageRoles(req, "delete");
  if (!allowed)
    return res.status(403).json({ error: "ليس لديك صلاحية لإدارة الأدوار" });

  const { role } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM role_permissions WHERE role = $1 RETURNING role",
      [role],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Role not found in permissions" });
    }

    res.json({
      success: true,
      message: `تم حذف الرتبة ${role} (${result.rows.length} صلاحيات)`,
      deleted_count: result.rows.length,
    });
  } catch (err) {
    console.error("Delete role error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/roles/:role", authenticateToken, async (req, res) => {
  const allowed = await canManageRoles(req, "update");
  if (!allowed)
    return res.status(403).json({ error: "ليس لديك صلاحية لإدارة الأدوار" });

  const { role } = req.params;
  const { newRole } = req.body;

  if (!newRole || newRole.trim().length === 0 || newRole.trim() === role) {
    return res
      .status(400)
      .json({ error: "New role name required and must be different" });
  }

  const newRoleName = newRole.trim();
  try {
    const permsResult = await pool.query(
      "UPDATE role_permissions SET role = $1 WHERE role = $2 RETURNING role",
      [newRoleName, role],
    );

    const usersResult = await pool.query(
      "UPDATE users SET role = $1 WHERE role = $2 RETURNING id",
      [newRoleName, role],
    );

    res.json({
      success: true,
      message: `تم تعديل الرتبة إلى ${newRoleName}`,
      updated_perms: permsResult.rows.length,
      updated_users: usersResult.rows.length,
    });
  } catch (err) {
    console.error("Rename role error:", err);
    res.status(500).json({ error: err.message });
  }
});

// permissions endpoints
app.get("/api/permissions", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM role_permissions ORDER BY role ASC, resource ASC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Permissions fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Basic data routes (branches restricted by branch_id for non-admin)
app.get(
  "/api/branches",
  authenticateToken,
  checkPermission("branches", "read"),
  (req, res) => getAll("branches", res, req),
);
app.get(
  "/api/branches/:id",
  authenticateToken,
  checkPermission("branches", "read"),
  (req, res) => getById("branches", req.params.id, res),
);

app.post(
  "/api/branches",
  authenticateToken,
  checkPermission("branches", "create"),
  (req, res) => create("branches", req.body, res),
);
app.put(
  "/api/branches/:id",
  authenticateToken,
  checkPermission("branches", "update"),
  (req, res) => update("branches", req.params.id, req.body, res),
);
app.delete(
  "/api/branches/:id",
  authenticateToken,
  checkPermission("branches", "delete"),
  (req, res) => remove("branches", req.params.id, res),
);

app.get("/api/departments", (req, res) => getAll("departments", res, req));
app.get("/api/departments/:id", (req, res) =>
  getById("departments", req.params.id, res),
);
app.post(
  "/api/departments",
  authenticateToken,
  checkPermission("departments", "create"),
  (req, res) => create("departments", req.body, res),
);
app.put(
  "/api/departments/:id",
  authenticateToken,
  checkPermission("departments", "update"),
  (req, res) => update("departments", req.params.id, req.body, res),
);
app.delete(
  "/api/departments/:id",
  authenticateToken,
  checkPermission("departments", "delete"),
  (req, res) => remove("departments", req.params.id, res),
);

app.get(
  "/api/courses",
  authenticateToken,
  checkPermission("courses", "read"),
  (req, res) =>
    getAll(
      "courses",
      res,
      req,
      "LEFT JOIN departments ON courses.department_id = departments.id",
    ),
);
app.get(
  "/api/courses/:id",
  authenticateToken,
  checkPermission("courses", "read"),
  (req, res) => getById("courses", req.params.id, res),
);
app.post(
  "/api/courses",
  authenticateToken,
  checkPermission("courses", "create"),
  (req, res) => create("courses", req.body, res),
);
app.put(
  "/api/courses/:id",
  authenticateToken,
  checkPermission("courses", "update"),
  (req, res) => update("courses", req.params.id, req.body, res),
);
app.delete(
  "/api/courses/:id",
  authenticateToken,
  checkPermission("courses", "delete"),
  (req, res) => remove("courses", req.params.id, res),
);

app.get(
  "/api/finances",
  authenticateToken,
  checkPermission("finances", "read"),
  (req, res) => getAll("finances", res, req),
);
app.get(
  "/api/finances/:id",
  authenticateToken,
  checkPermission("finances", "read"),
  (req, res) => getById("finances", req.params.id, res),
);
app.post(
  "/api/finances",
  authenticateToken,
  checkPermission("finances", "create"),
  (req, res) => create("finances", req.body, res),
);
app.put(
  "/api/finances/:id",
  authenticateToken,
  checkPermission("finances", "update"),
  (req, res) => update("finances", req.params.id, req.body, res),
);
app.delete(
  "/api/finances/:id",
  authenticateToken,
  checkPermission("finances", "delete"),
  (req, res) => remove("finances", req.params.id, res),
);

app.get(
  "/api/expense_items",
  authenticateToken,
  checkPermission("expense_items", "read"),
  (req, res) => getAll("expense_items", res),
);
app.get(
  "/api/expense_items/:id",
  authenticateToken,
  checkPermission("expense_items", "read"),
  (req, res) => getById("expense_items", req.params.id, res, req),
);
app.post(
  "/api/expense_items",
  authenticateToken,
  checkPermission("expense_items", "create"),
  (req, res) => create("expense_items", req.body, res),
);
app.put(
  "/api/expense_items/:id",
  authenticateToken,
  checkPermission("expense_items", "update"),
  (req, res) => update("expense_items", req.params.id, req.body, res),
);
app.delete(
  "/api/expense_items/:id",
  authenticateToken,
  checkPermission("expense_items", "delete"),
  (req, res) => remove("expense_items", req.params.id, res),
);

app.get(
  "/api/student-fees",
  authenticateToken,
  checkPermission("student_fees", "read"),
  (req, res) => getAll("student_fees", res, req),
);
app.get(
  "/api/student-fees/:studentId",
  authenticateToken,
  checkPermission("student_fees", "read"),
  async (req, res) => {
    try {
      const query = `
      SELECT sf.*, ei.name as item_name 
      FROM student_fees sf 
      LEFT JOIN expense_items ei ON sf.expense_item_id = ei.id 
      WHERE sf.student_id = $1
    `;
      const result = await pool.query(query, [req.params.studentId]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);
app.post(
  "/api/student-fees",
  authenticateToken,
  checkPermission("student_fees", "create"),
  (req, res) => create("student_fees", req.body, res),
);
app.put(
  "/api/student-fees/:id",
  authenticateToken,
  checkPermission("student_fees", "update"),
  (req, res) => update("student_fees", req.params.id, req.body, res),
);
app.delete(
  "/api/student-fees/:id",
  authenticateToken,
  checkPermission("student_fees", "delete"),
  (req, res) => remove("student_fees", req.params.id, res),
);

app.post(
  "/api/student-fees/pay",
  authenticateToken,
  checkPermission("student_fees_payments", "update"),
  async (req, res) => {
    const { fee_id, amount } = req.body;
    if (!fee_id || !amount || amount <= 0) {
      return res
        .status(400)
        .json({ error: "fee_id و amount مطلوبان ويجب أن يكونا أكبر من 0" });
    }

    const parsedAmount = parseFloat(amount);

    try {
      const feeResult = await pool.query(
        "SELECT * FROM student_fees WHERE id = $1",
        [fee_id],
      );
      const fee = feeResult.rows[0];
      if (!fee) return res.status(404).json({ error: "Fee not found" });

      if (parsedAmount > fee.remaining_balance) {
        return res.status(400).json({
          error: `المبلغ المطلوب أكبر من الرصيد المتبقي (${fee.remaining_balance} ج.م)`,
        });
      }

      const currentPaid = parseFloat(fee.amount_paid || 0);
      const currentDue = parseFloat(fee.amount_due || 0);
      const currentRemaining = currentDue - currentPaid;

      if (parsedAmount > currentRemaining) {
        return res.status(400).json({
          error: `المبلغ المطلوب (${parsedAmount}) أكبر من الرصيد المتبقي (${currentRemaining.toFixed(2)} ج.م)`,
        });
      }

      const newAmountPaid = (currentPaid + parsedAmount).toFixed(2);
      const newRemaining = (currentRemaining - parsedAmount).toFixed(2);
      const newStatus = newRemaining <= 0 ? "paid" : "pending";

      const updateResult = await pool.query(
        `UPDATE student_fees 
       SET amount_paid = $1,
           status = $2,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING *`,
        [newAmountPaid, newStatus, fee_id],
      );

      res.json({
        success: true,
        message: "تم السداد بنجاح",
        updated_fee: updateResult.rows[0],
      });
    } catch (err) {
      console.error("Payment error:", err);
      res.status(500).json({ error: "خطأ في معالجة السداد: " + err.message });
    }
  },
);

// Health check (public)
app.get("/health", (req, res) => res.json({ status: "OK", db: "Connected" }));

// Admin Supabase Auth/DB helpers (service-role only on server)
const bypassAuthForAdminUsers = (req, res, next) => {
  req.user = { role: "admin", tenant_id: 1 };
  next();
};

app.use(
  "/api/admin/users",
  bypassAuthForAdminUsers,
  require("./api/adminUsers"),
);

// permissions.me for UI
app.get("/api/permissions/me", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT resource, can_read, can_create, can_update, can_delete FROM role_permissions WHERE role = $1",
      [req.user.role],
    );
    res.json({ role: req.user.role, permissions: result.rows });
  } catch (err) {
    console.error("Error in /api/permissions/me:", err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH permission update-single (permission-based only)
app.patch(
  "/api/permissions/update-single",
  authenticateToken,
  async (req, res) => {
    const wildcard = await pool.query(
      "SELECT 1 FROM role_permissions WHERE role = $1 AND resource = '*' AND can_update = true LIMIT 1",
      [req.user.role],
    );

    if (wildcard.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "ليس لديك صلاحية لإدارة الصلاحيات" });
    }

    const { role, resource, action, value } = req.body;
    try {
      const columnName = `can_${action}`;
      const upsertQuery = `
      INSERT INTO role_permissions (role, resource, ${columnName}, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (role, resource)
      DO UPDATE SET
        ${columnName} = $3,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`;

      const result = await pool.query(upsertQuery, [role, resource, value]);
      res.json({ success: true, permission: result.rows[0] });
    } catch (err) {
      console.error("Permission update error:", err);
      res.status(500).json({ error: "فشل تحديث الصلاحية: " + err.message });
    }
  },
);
//تم تعطيل هذا الكود للرفع على فيرسل
//app.listen(port, () => {
//console.log(`Server running on http://localhost:${port}`);
//console.log("✅ Auth enabled - Login required for protected routes");
//});
module.exports = app; // هذا مضاف للرفع ايضا على فيرسيل
