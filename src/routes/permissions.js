const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.post("/update", async (req, res) => {
  const { roleId, permissions } = req.body;

  try {
    // Delete old permissions for the role
    await db.query("DELETE FROM role_permissions WHERE role_id = ?", [roleId]);

    // Insert new permissions
    const values = permissions.map((permissionId) => [roleId, permissionId]);
    await db.query(
      "INSERT INTO role_permissions (role_id, permission_id) VALUES ?",
      [values],
    );

    res.status(200).json({ message: "Permissions updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating permissions", error });
  }
});

module.exports = router;
