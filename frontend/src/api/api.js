const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return normalizeIds(data);
}

function normalizeIds(obj) {
  if (Array.isArray(obj)) return obj.map(normalizeIds);
  if (obj && typeof obj === "object") {
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      if (key === "_id" && val && typeof val === "object" && val.$oid) {
        result[key] = val.$oid;
      } else if (
        key === "timestamp" &&
        val &&
        typeof val === "object" &&
        val.$date
      ) {
        result[key] = val.$date;
      } else {
        result[key] = normalizeIds(val);
      }
    }
    return result;
  }
  return obj;
}

/** Games APIs */
export const gamesAPI = {
  create: (body) =>
    request("/api/games", { method: "POST", body: JSON.stringify(body) }),

  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/games${query ? "?" + query : ""}`);
  },

  getById: (id) => request(`/api/games/${id}`),

  addMove: (id, body) =>
    request(`/api/games/${id}/move`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  updateStatus: (id, body) =>
    request(`/api/games/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (id) => request(`/api/games/${id}`, { method: "DELETE" }),
};

/** Players APIs */
export const playersAPI = {
  create: (username) =>
    request("/api/players", {
      method: "POST",
      body: JSON.stringify({ username }),
    }),

  getLeaderboard: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/players${query ? "?" + query : ""}`);
  },

  getByUsername: (username) => request(`/api/players/${username}`),

  updateResult: (username, won) =>
    request(`/api/players/${username}/result`, {
      method: "PATCH",
      body: JSON.stringify({ won }),
    }),

  delete: (username) =>
    request(`/api/players/${username}`, { method: "DELETE" }),
};
