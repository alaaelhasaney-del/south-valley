// ============================================================================
// Dynamic RBAC - New API Endpoints
// Add these routes to your server.js
// ============================================================================

const express = require("express");
const rbac = require("./rbac-middleware");

const router = express.Router();

/**
 * GET /api/permissions
 * Returns the current user's permissions array
 * Response: { permissions: ['students.view', 'students.create', ...] }
 */
router.get("/permissions", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Admin gets all permissions
    if (req.user.role === "admin" || req.user.is_system_admin) {
      const allPermissions = await rbac.getAllPermissions(
        req.user.tenant_id || 1,
      );
      const permKeys = allPermissions.map((p) => p.key);
      return res.json({ permissions: permKeys });
    }

    // Get permissions for user's role
    const userRole = String(req.user.role || "").toLowerCase();
    const permissions = await rbac.getUserPermissions(
      userRole,
      req.user.tenant_id || 1,
    );

    res.json({ permissions });
  } catch (err) {
    console.error("Error fetching permissions:", err.message);
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
});

/**
 * GET /api/admin/permissions/matrix
 * Admin only: Returns all roles with their permissions
 * Response: [{ id, name, description, permissions: [...] }, ...]
 */
router.get(
  "/admin/permissions/matrix",
  rbac.checkDynamicPermission("permissions", "manage"),
  async (req, res) => {
    try {
      const roles = await rbac.getRolesWithPermissions(
        req.user?.tenant_id || 1,
      );
      res.json(roles);
    } catch (err) {
      console.error("Error fetching permissions matrix:", err.message);
      res.status(500).json({ error: "Failed to fetch permissions matrix" });
    }
  },
);

/**
 * GET /api/admin/permissions/list
 * Admin only: Returns all available permissions
 * Response: [{ id, key, display_name, resource, action, description }, ...]
 */
router.get(
  "/admin/permissions/list",
  rbac.checkDynamicPermission("permissions", "manage"),
  async (req, res) => {
    try {
      const permissions = await rbac.getAllPermissions(
        req.user?.tenant_id || 1,
      );
      res.json(permissions);
    } catch (err) {
      console.error("Error fetching permissions list:", err.message);
      res.status(500).json({ error: "Failed to fetch permissions list" });
    }
  },
);

/**
 * PUT /api/admin/permissions/roles/:roleId
 * Admin only: Update permissions for a specific role
 * Body: { permissionIds: [1, 2, 3, ...] }
 */
router.put(
  "/admin/permissions/roles/:roleId",
  rbac.checkDynamicPermission("permissions", "manage"),
  async (req, res) => {
    try {
      const { roleId } = req.params;
      const { permissionIds = [] } = req.body;

      if (!Array.isArray(permissionIds)) {
        return res
          .status(400)
          .json({ error: "permissionIds must be an array" });
      }

      await rbac.updateRolePermissions(
        roleId,
        permissionIds,
        req.user?.tenant_id || 1,
      );

      res.json({
        success: true,
        message: "تم تحديث الصلاحيات بنجاح",
        roleId,
        permissionCount: permissionIds.length,
      });
    } catch (err) {
      console.error("Error updating role permissions:", err.message);
      res.status(500).json({ error: "Failed to update permissions" });
    }
  },
);

/**
 * DELETE /api/admin/permissions/roles/:roleId/permissions/:permissionId
 * Admin only: Remove specific permission from role
 */
router.delete(
  "/admin/permissions/roles/:roleId/permissions/:permissionId",
  rbac.checkDynamicPermission("permissions", "manage"),
  async (req, res) => {
    try {
      const { roleId, permissionId } = req.params;
      const pool = require("../db"); // Import your DB pool

      await pool.query(
        "DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2 AND tenant_id = $3",
        [roleId, permissionId, req.user?.tenant_id || 1],
      );

      res.json({
        success: true,
        message: "تم حذف الصلاحية بنجاح",
      });
    } catch (err) {
      console.error("Error deleting permission:", err.message);
      res.status(500).json({ error: "Failed to delete permission" });
    }
  },
);

/**
 * GET /api/admin/roles
 * Admin only: Get all roles
 */
router.get(
  "/admin/roles",
  rbac.checkDynamicPermission("permissions", "manage"),
  async (req, res) => {
    try {
      const pool = require("../db");
      const result = await pool.query(
        "SELECT id, name, description, is_system FROM roles WHERE tenant_id = $1 ORDER BY name",
        [req.user?.tenant_id || 1],
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching roles:", err.message);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  },
);

/**
 * POST /api/admin/roles
 * Admin only: Create new role
 * Body: { name, description }
 */
router.post(
  "/admin/roles",
  rbac.checkDynamicPermission("permissions", "manage"),
  async (req, res) => {
    try {
      const { name, description } = req.body;
      const pool = require("../db");

      if (!name) {
        return res.status(400).json({ error: "Role name is required" });
      }

      const result = await pool.query(
        `INSERT INTO roles (name, description, tenant_id, is_system)
       VALUES ($1, $2, $3, false)
       RETURNING id, name, description`,
        [name, description || "", req.user?.tenant_id || 1],
      );

      res.json({
        success: true,
        message: "تم إنشاء الدور بنجاح",
        role: result.rows[0],
      });
    } catch (err) {
      console.error("Error creating role:", err.message);
      res.status(500).json({ error: "Failed to create role" });
    }
  },
);

/**
 * PUT /api/admin/roles/:roleId
 * Admin only: Update role details
 * Body: { name, description }
 */
router.put(
  "/admin/roles/:roleId",
  rbac.checkDynamicPermission("permissions", "manage"),
  async (req, res) => {
    try {
      const { roleId } = req.params;
      const { name, description } = req.body;
      const pool = require("../db");

      const result = await pool.query(
        `UPDATE roles 
       SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND tenant_id = $4 AND is_system = false
       RETURNING id, name, description`,
        [name, description, roleId, req.user?.tenant_id || 1],
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ error: "Role not found or system role cannot be modified" });
      }

      res.json({
        success: true,
        message: "تم تحديث الدور بنجاح",
        role: result.rows[0],
      });
    } catch (err) {
      console.error("Error updating role:", err.message);
      res.status(500).json({ error: "Failed to update role" });
    }
  },
);

module.exports = router;
