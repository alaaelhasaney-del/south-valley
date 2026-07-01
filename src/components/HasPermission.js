import React from "react";
import { usePermissions } from "../context/PermissionsContext";

const HasPermission = ({ permission, children }) => {
  const permissions = usePermissions();

  if (permissions.includes(permission)) {
    return children;
  }

  return null;
};

export default HasPermission;
