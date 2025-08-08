// Fetch wrapper that injects Authorization automatically
import { API_URL } from "./config.js";
import { getToken, clearAuth } from "./auth.js";

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Token expired or invalid -> log out
    clearAuth();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.status === 204 ? null : res.json();
}

// Auth
export const AuthAPI = {
  login: (email, password) =>
    apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

// Vehicles
export const VehiclesAPI = {
  list: () => apiFetch("/api/car"),
  get: (id) => apiFetch(`/api/car/${id}`),
  create: (payload) =>
    apiFetch("/api/car", { method: "POST", body: JSON.stringify(payload) }),
  updatePosition: (id, payload) =>
    apiFetch(`/api/car/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteOwn: (id) => apiFetch(`/api/car/${id}`, { method: "DELETE" }),
  adminDelete: (id) => apiFetch(`/api/car/admin/${id}`, { method: "DELETE" }),
};
