const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function seedMuhasibRole() {
  const role = "محاسب";

  try {
    // 1. Add to user_role ENUM if not exists
    await pool.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS '${role}'`);

    const resources = [
      "users",
      "students",
      "student_grades",
      "student_fees",
      "student_attendance",
      "departments",
      "courses",
      "finances",
      "expense_items",
      "branches",
      "activity_logs",
      "inventory",
    ];

    // 2. Insert/Update ALL permissions = true (UPSERT)
    for (const resource of resources) {
      await pool.query(
        `
        INSERT INTO role_permissions (role, resource, can_read, can_create, can_update, can_delete, updated_at)
        VALUES ($1, $2, true, true, true, true, CURRENT_TIMESTAMP)
        ON CONFLICT (role, resource) 
        DO UPDATE SET 
          can_read = true, can_create = true, can_update = true, can_delete = true,
          updated_at = CURRENT_TIMESTAMP
      `,
        [role, resource],
      );
      console.log(`✅ Set full permissions for ${resource}`);
    }

    console.log(
      `\n🎉 Created/Updated "muhasib" role with FULL permissions on all ${resources.length} resources!`,
    );
    console.log(`   - Login to UI, assign role="muhasib" to users.`);
    console.log(`   - Role visible in /roles page.`);
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
}

seedMuhasibRole();
