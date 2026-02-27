const getApiBase = () => {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, "");
  if (import.meta.env.DEV) return "http://localhost:5174";
  return "";
};

export const apiFetch = (path, options = {}) => {
  const base = getApiBase();
  const normalizedPath = path.startsWith("/api") ? path : `/api${path.startsWith("/") ? path : `/${path}`}`;
  const url = `${base}${normalizedPath}`;
  return fetch(url, options);
};

export const apiGetJson = async (path) => {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error("Request failed");
  return res.json();
};

export const apiPostJson = async (path, body) => {
  const res = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      throw new Error(data.error || "Request failed");
    } catch {
      throw new Error(text || "Request failed");
    }
  }
  return res.json();
};
