import axios from "axios";

export const login = async (credentials) => {
  const response = await axios.post("/api/auth/login", credentials);
  const { token, permissions } = response.data;

  // Store token and permissions in local storage or context
  localStorage.setItem("token", token);
  localStorage.setItem("permissions", JSON.stringify(permissions));

  return { token, permissions };
};
