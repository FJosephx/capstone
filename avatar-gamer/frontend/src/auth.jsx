import api from "./api/client.jsx";

export async function login(username, password) {
  const { data } = await api.post("/auth/login", { username, password });
  // Ajusta el nombre del campo según tu backend (p.ej. accessToken)
  if (data?.accessToken) localStorage.setItem("token", data.accessToken);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
}

export function isAuthenticated() {
  return !!localStorage.getItem("token");
}
