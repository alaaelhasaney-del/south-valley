const { Pool } = require("pg");
require("dotenv").config();

const sourceUrl = process.env.SOURCE_DATABASE_URL || process.argv[2];
const targetUrl = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;

if (!sourceUrl) {
  console.error(
    "Missing SOURCE_DATABASE_URL. Set it in .env or pass it as the first argument.",
  );
  process.exit(1);
}

if (!targetUrl) {
  console.error(
    "Missing TARGET_DATABASE_URL. Set it in .env or use DATABASE_URL.",
  );
  process.exit(1);
}

if (sourceUrl === targetUrl) {
  console.error(
    "SOURCE_DATABASE_URL and TARGET_DATABASE_URL must be different.",
  );
  process.exit(1);
}

const sourcePool = new Pool({ connectionString: sourceUrl, ssl: false });
const targetPool = new Pool({ connectionString: targetUrl, ssl: false });

const insertOrFind = async (
  client,
  table,
  keys,
  values,
  uniqueWhere,
  uniqueValues,
) => {
  const whereClause = uniqueWhere
    .map((col, idx) => `${col} = $${idx + 1}`)
    .join(" AND ");
  const existing = await client.query(
    `SELECT id FROM ${table} WHERE ${whereClause} LIMIT 1`,
    uniqueValues,
  );
  if (existing.rows.length) return existing.rows[0].id;
  const cols = keys.join(", ");
  const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(", ");
  const result = await client.query(
    `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING id`,
    values,
  );
  return result.rows[0].id;
};

const copyRows = async () => {
  const sourceClient = await sourcePool.connect();
  const targetClient = await targetPool.connect();

  const branchMap = new Map();
  const departmentMap = new Map();
  const studentMap = new Map();
  const expenseItemMap = new Map();

  try {
    await targetClient.query("BEGIN");

    const branchRows = (
      await sourceClient.query("SELECT * FROM branches ORDER BY id")
    ).rows;
    console.log(`Branches to copy: ${branchRows.length}`);
    for (const branch of branchRows) {
      const id = await insertOrFind(
        targetClient,
        "branches",
        ["name", "location", "created_at", "updated_at"],
        [branch.name, branch.location, branch.created_at, branch.updated_at],
        ["name", "location"],
        [branch.name, branch.location],
      );
      branchMap.set(branch.id, id);
    }

    const departmentRows = (
      await sourceClient.query("SELECT * FROM departments ORDER BY id")
    ).rows;
    console.log(`Departments to copy: ${departmentRows.length}`);
    for (const dept of departmentRows) {
      const mappedBranchId = dept.branch_id
        ? branchMap.get(dept.branch_id)
        : null;
      const id = await insertOrFind(
        targetClient,
        "departments",
        ["name", "branch_id", "description", "created_at"],
        [dept.name, mappedBranchId, dept.description, dept.created_at],
        ["name", "description", "branch_id"],
        [dept.name, dept.description, mappedBranchId],
      );
      departmentMap.set(dept.id, id);
    }

    const deptBranchRows = (
      await sourceClient.query("SELECT * FROM department_branches ORDER BY id")
    ).rows;
    console.log(`Department-branch links to copy: ${deptBranchRows.length}`);
    for (const row of deptBranchRows) {
      const targetDeptId = departmentMap.get(row.department_id);
      const targetBranchId = branchMap.get(row.branch_id);
      if (!targetDeptId || !targetBranchId) continue;
      await targetClient.query(
        `INSERT INTO department_branches (department_id, branch_id, created_at)
         SELECT $1, $2, $3
         WHERE NOT EXISTS (
           SELECT 1 FROM department_branches WHERE department_id = $1 AND branch_id = $2
         )`,
        [targetDeptId, targetBranchId, row.created_at],
      );
    }

    const userRows = (
      await sourceClient.query("SELECT * FROM users ORDER BY id")
    ).rows;
    console.log(`Users to copy: ${userRows.length}`);
    for (const user of userRows) {
      const mappedBranchId = user.branch_id
        ? branchMap.get(user.branch_id)
        : null;
      await insertOrFind(
        targetClient,
        "users",
        [
          "name",
          "email",
          "password_hash",
          "role",
          "branch_id",
          "created_at",
          "updated_at",
        ],
        [
          user.name,
          user.email,
          user.password_hash,
          user.role,
          mappedBranchId,
          user.created_at,
          user.updated_at,
        ],
        ["email"],
        [user.email],
      );
    }

    const studentRows = (
      await sourceClient.query("SELECT * FROM students ORDER BY id")
    ).rows;
    console.log(`Students to copy: ${studentRows.length}`);
    for (const student of studentRows) {
      const mappedBranchId = student.branch_id
        ? branchMap.get(student.branch_id)
        : null;
      const mappedDepartmentId = student.department_id
        ? departmentMap.get(student.department_id)
        : null;
      const uniqueWhere = [];
      const uniqueValues = [];
      if (student.national_id) {
        uniqueWhere.push("national_id");
        uniqueValues.push(student.national_id);
      }
      if (!uniqueWhere.length) {
        uniqueWhere.push("name", "phone");
        uniqueValues.push(student.name, student.phone);
      }
      const cols = [
        "name",
        "phone",
        "guardian_phone",
        "governorate",
        "city",
        "full_address",
        "national_id",
        "qualification",
        "department_id",
        "class_year",
        "photo_data",
        "branch_id",
        "enrollment_date",
        "created_at",
        "updated_at",
      ];
      const vals = [
        student.name,
        student.phone,
        student.guardian_phone,
        student.governorate,
        student.city,
        student.full_address,
        student.national_id,
        student.qualification,
        mappedDepartmentId,
        student.class_year,
        student.photo_data,
        mappedBranchId,
        student.enrollment_date,
        student.created_at,
        student.updated_at,
      ];
      const existing = await targetClient.query(
        `SELECT id FROM students WHERE ${uniqueWhere.map((col, i) => `${col} = $${i + 1}`).join(" AND ")} LIMIT 1`,
        uniqueValues,
      );
      let id;
      if (existing.rows.length) {
        id = existing.rows[0].id;
      } else {
        const result = await targetClient.query(
          `INSERT INTO students (${cols.join(", ")}) VALUES (${cols.map((_, idx) => `$${idx + 1}`).join(", ")}) RETURNING id`,
          vals,
        );
        id = result.rows[0].id;
      }
      studentMap.set(student.id, id);
    }

    const courseRows = (
      await sourceClient.query("SELECT * FROM courses ORDER BY id")
    ).rows;
    console.log(`Courses to copy: ${courseRows.length}`);
    for (const course of courseRows) {
      const mappedDepartmentId = departmentMap.get(course.department_id);
      if (!mappedDepartmentId) continue;
      await insertOrFind(
        targetClient,
        "courses",
        ["name", "department_id", "duration", "price", "created_at"],
        [
          course.name,
          mappedDepartmentId,
          course.duration,
          course.price,
          course.created_at,
        ],
        ["name", "department_id"],
        [course.name, mappedDepartmentId],
      );
    }

    const financeRows = (
      await sourceClient.query("SELECT * FROM finances ORDER BY id")
    ).rows;
    console.log(`Finances to copy: ${financeRows.length}`);
    for (const finance of financeRows) {
      const mappedBranchId = branchMap.get(finance.branch_id);
      if (!mappedBranchId) continue;
      await insertOrFind(
        targetClient,
        "finances",
        [
          "branch_id",
          "date",
          "revenue",
          "expenses",
          "cash_balance",
          "notes",
          "created_at",
        ],
        [
          mappedBranchId,
          finance.date,
          finance.revenue,
          finance.expenses,
          finance.cash_balance,
          finance.notes,
          finance.created_at,
        ],
        ["branch_id", "date"],
        [mappedBranchId, finance.date],
      );
    }

    const expenseRows = (
      await sourceClient.query("SELECT * FROM expense_items ORDER BY id")
    ).rows;
    console.log(`Expense items to copy: ${expenseRows.length}`);
    for (const item of expenseRows) {
      const mappedDepartmentId = item.department_id
        ? departmentMap.get(item.department_id)
        : null;
      const id = await insertOrFind(
        targetClient,
        "expense_items",
        [
          "name",
          "department_id",
          "class_year",
          "amount",
          "is_mandatory",
          "is_service",
          "description",
          "created_at",
          "updated_at",
        ],
        [
          item.name,
          mappedDepartmentId,
          item.class_year,
          item.amount,
          item.is_mandatory,
          item.is_service,
          item.description,
          item.created_at,
          item.updated_at,
        ],
        ["name", "department_id", "class_year", "amount"],
        [item.name, mappedDepartmentId, item.class_year, item.amount],
      );
      expenseItemMap.set(item.id, id);
    }

    const studentFeesRows = (
      await sourceClient.query("SELECT * FROM student_fees ORDER BY id")
    ).rows;
    console.log(`Student fees to copy: ${studentFeesRows.length}`);
    for (const fee of studentFeesRows) {
      const mappedStudentId = studentMap.get(fee.student_id);
      const mappedExpenseId = expenseItemMap.get(fee.expense_item_id);
      if (!mappedStudentId || !mappedExpenseId) continue;
      await targetClient.query(
        `INSERT INTO student_fees (student_id, expense_item_id, is_selected, amount_due, amount_paid, due_date, paid_date, status, created_at)
         SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9
         WHERE NOT EXISTS (
           SELECT 1 FROM student_fees WHERE student_id = $1 AND expense_item_id = $2
         )`,
        [
          mappedStudentId,
          mappedExpenseId,
          fee.is_selected,
          fee.amount_due,
          fee.amount_paid,
          fee.due_date,
          fee.paid_date,
          fee.status,
          fee.created_at,
        ],
      );
    }

    const gradeRows = (
      await sourceClient.query("SELECT * FROM student_grades ORDER BY id")
    ).rows;
    console.log(`Student grades to copy: ${gradeRows.length}`);
    for (const grade of gradeRows) {
      const mappedStudentId = studentMap.get(grade.student_id);
      if (!mappedStudentId) continue;
      await targetClient.query(
        `INSERT INTO student_grades (student_id, course, grade, comment, created_at, updated_at)
         SELECT $1, $2, $3, $4, $5, $6
         WHERE NOT EXISTS (
           SELECT 1 FROM student_grades WHERE student_id = $1 AND course = $2
         )`,
        [
          mappedStudentId,
          grade.course,
          grade.grade,
          grade.comment,
          grade.created_at,
          grade.updated_at,
        ],
      );
    }

    const attendanceRows = (
      await sourceClient.query("SELECT * FROM student_attendance ORDER BY id")
    ).rows;
    console.log(`Student attendance to copy: ${attendanceRows.length}`);
    for (const record of attendanceRows) {
      const mappedStudentId = studentMap.get(record.student_id);
      if (!mappedStudentId) continue;
      await targetClient.query(
        `INSERT INTO student_attendance (student_id, date, status, notes, created_at, updated_at)
         SELECT $1, $2, $3, $4, $5, $6
         WHERE NOT EXISTS (
           SELECT 1 FROM student_attendance WHERE student_id = $1 AND date = $2
         )`,
        [
          mappedStudentId,
          record.date,
          record.status,
          record.notes,
          record.created_at,
          record.updated_at,
        ],
      );
    }

    await targetClient.query("COMMIT");
    console.log("Migration completed successfully.");
  } catch (error) {
    await targetClient.query("ROLLBACK");
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    sourceClient.release();
    targetClient.release();
    await sourcePool.end();
    await targetPool.end();
  }
};

copyRows().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
