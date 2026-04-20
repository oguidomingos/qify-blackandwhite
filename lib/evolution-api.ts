/**
 * Shared helper to call Evolution API endpoints.
 * All data-fetching routes use this instead of reading from Convex.
 */

const BASE_URL = (process.env.EVOLUTION_BASE_URL || "").trim();
const API_KEY = process.env.EVOLUTION_API_KEY || "";

export function evolutionFetch(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: API_KEY,
      ...(options.headers || {}),
    },
    cache: "no-store",
  });
}

export async function evolutionGet(path: string) {
  const res = await evolutionFetch(path);
  if (!res.ok) throw new Error(`Evolution API ${res.status}: ${path}`);
  return res.json();
}

export async function evolutionPost(path: string, body: object = {}) {
  const res = await evolutionFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Evolution API POST ${res.status}: ${path}`);
  return res.json();
}

export function encodeInstance(name: string) {
  return encodeURIComponent(name);
}
