import axios from "axios";

/** ============ Instancia Axios ============ */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Adjunta token si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// (Opcional) Manejo simple de 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      // Puedes redirigir a /login o limpiar token
      // localStorage.removeItem("access_token");
    }
    return Promise.reject(err);
  }
);

export default api;

/** ============ Tipos útiles ============ */
export type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // página actual (0-based)
  size: number;
};

export type UserListItem = {
  id: number;
  username: string;
  email: string;
};

/** ============ Helpers de Auth ============ */
export function setAccessToken(token?: string) {
  if (token) localStorage.setItem("access_token", token);
  else localStorage.removeItem("access_token");
}

export function logout() {
  localStorage.removeItem("access_token");
}

/** ============ Endpoints Auth mínimos ============ */
export async function login(credentials: { username: string; password: string }) {
  const { data } = await api.post("/auth/login", credentials);
  // Ajusta el nombre si tu backend devuelve otra propiedad
  const token: string | undefined = data.token ?? data.access_token;
  if (token) setAccessToken(token);
  return data;
}

export async function getMe() {
  const { data } = await api.get("/auth/me");
  return data;
}

/** ============ CU-02: Listado de usuarios ============ */
export type UsersQuery = {
  query?: string;
  page?: number; // default 0
  size?: number; // default 10
  sort?: string; // ej: "id,desc"
};

export async function fetchUsers(params: UsersQuery = {}): Promise<Page<UserListItem>> {
  const { query, page = 0, size = 10, sort } = params;

  const { data } = await api.get<Page<UserListItem>>("/users", {
    params: {
      ...(query ? { query } : {}),
      page,
      size,
      ...(sort ? { sort } : {}),
    },
  });

  return data;
}
