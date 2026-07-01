import React from "react";
import HasPermission from "./HasPermission";

const Button = ({ permission, onClick, children }) => {
  return (
    <HasPermission permission={permission}>
      <button onClick={onClick}>{children}</button>
    </HasPermission>
  );
};

export default Button;
