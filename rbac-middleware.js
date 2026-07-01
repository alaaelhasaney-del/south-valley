// ============================================================================
// Dynamic RBAC System - Backend Middleware & Utilities
// File: rbac-middleware.js
// ============================================================================

const pool = require("../db"); // PostgreSQL connection pool

/**
 * Dynamic Permission Check Middleware (RBAC)
 * Checks if user has required permission from database
 *
 * Usage: app.get('/api/students', checkDynamicPermission('students', 'view'), handler)
 */
const checkDynamicPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      // Admin always has all permissions
      if (req.user?.role === "admin" || req.user?.is_system_admin) {
        return next();
      }

      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized - No user" });
      }

      const userRole = String(req.user.role || "")
        .toLowerCase()
        .trim();
      const permissionKey = `${resource}.${action}`;

      console.log(
        `🔐 Permission Check: User "${userRole}" requesting "${permissionKey}"`,
      );

      // Build query to check if user's role has this permission
      const query = `
        SELECT 1 
        FROM role_permissions rp
        JOIN roles r ON r.id = rp.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE r.name = $1 
          AND (p.key = $2 OR p.resource = '*')
          AND (r.tenant_id = $3 OR r.tenant_id = 1)
        LIMIT 1
      `;

      const result = await pool.query(query, [
        userRole,
        permissionKey,
        req.user.tenant_id || 1,
      ]);

      if (result.rows.length === 0) {
        console.warn(
          `❌ Permission Denied: "${userRole}" does not have "${permissionKey}"`,
        );
        return res.status(403).json({
          error: "ليس لديك صلاحية لهذا الإجراء",
          required: permissionKey,
        });
      }

      console.log(
        `✅ Permission Granted: "${userRole}" has "${permissionKey}"`,
      );
      next();
    } catch (err) {
      console.error("❌ Permission check error:", err.message);
      res
        .status(500)
        .json({ error: "فشل فحص الصلاحيات", details: err.message });
    }
  };
};

/**
 * Get all permissions for a specific role
 */
const getUserPermissions = async (userRole, tenantId = 1) => {
  try {
    const query = `
      SELECT 
        p.key,
        p.display_name,
        p.resource,
        p.action,
        p.description
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.name = $1 
        AND (r.tenant_id = $2 OR r.tenant_id = 1)
      ORDER BY p.resource, p.action
    `;

    const result = await pool.query(query, [userRole, tenantId]);
    return result.rows.map((row) => row.key);
  } catch (err) {
    console.error("Error fetching user permissions:", err.message);
    return [];
  }
};

/**
 * Get all roles with their permissions
 */
const getRolesWithPermissions = async (tenantId = 1) => {
  try {
    const query = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.is_system,
        json_agg(
          json_build_object(
            'id', p.id,
            'key', p.key,
            'display_name', p.display_name,
            'resource', p.resource,
            'action', p.action
          )
        ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE r.tenant_id = $1 OR r.tenant_id = 1
      GROUP BY r.id, r.name, r.description, r.is_system
      ORDER BY r.name
    `;

    const result = await pool.query(query, [tenantId]);
    return result.rows;
  } catch (err) {
    console.error("Error fetching roles with permissions:", err.message);
    return [];
  }
};

/**
 * Update permissions for a specific role
 * @param {number} roleId - Role ID
 * @param {array} permissionIds - Array of permission IDs to assign
 */
const updateRolePermissions = async (
  roleId,
  permissionIds = [],
  tenantId = 1,
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Delete existing permissions for this role
    await client.query(
      "DELETE FROM role_permissions WHERE role_id = $1 AND tenant_id = $2",
      [roleId, tenantId],
    );

    // Insert new permissions
    for (const permissionId of permissionIds) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id, tenant_id) 
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [roleId, permissionId, tenantId],
      );
    }

    await client.query("COMMIT");
    console.log(`✅ Updated permissions for role ${roleId}`);
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating role permissions:", err.message);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get all permissions (for admin/management)
 */
const getAllPermissions = async (tenantId = 1) => {
  try {
    const query = `
      SELECT 
        id,
        key,
        display_name,
        resource,
        action,
        description
      FROM permissions
      WHERE tenant_id = $1
      ORDER BY resource, action
    `;

    const result = await pool.query(query, [tenantId]);
    return result.rows;
  } catch (err) {
    console.error("Error fetching permissions:", err.message);
    return [];
  }
};

/**
 * Check if user has specific permission
 */
const hasPermission = async (userRole, permissionKey, tenantId = 1) => {
  try {
    const query = `
      SELECT 1 
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.name = $1 
        AND p.key = $2
        AND (r.tenant_id = $3 OR r.tenant_id = 1)
      LIMIT 1
    `;

    const result = await pool.query(query, [userRole, permissionKey, tenantId]);
    return result.rows.length > 0;
  } catch (err) {
    console.error("Error checking permission:", err.message);
    return false;
  }
};

module.exports = {
  checkDynamicPermission,
  getUserPermissions,
  getRolesWithPermissions,
  updateRolePermissions,
  getAllPermissions,
  hasPermission,
};
