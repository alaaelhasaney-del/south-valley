import React from "react";
import HasPermission from "./HasPermission";

const Sidebar = () => {
  return (
    <div className="sidebar">
      <HasPermission permission="dashboard">
        <div className="sidebar-item">Dashboard</div>
      </HasPermission>
      <HasPermission permission="user_management">
        <div className="sidebar-item">User Management</div>
      </HasPermission>
      <HasPermission permission="student_management">
        <div className="sidebar-item">Student Management</div>
      </HasPermission>
      {/* Add more sidebar items with HasPermission */}
    </div>
  );
};

export default Sidebar;
