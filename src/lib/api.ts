import type { Recipe, RecipeInput } from "../types.ts";

const TOKEN_KEY = "recepten-token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class UnauthorizedError extends Error {}
// The server could not read the link but the user can paste the text instead.
export class PasteHintError extends Error {}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api/${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== "login") {
    clearToken();
    throw new UnauthorizedError("Sessie verlopen");
  }
  if (!res.ok) {
    const { error, paste } = body as { error?: string; paste?: boolean };
    throw new (paste ? PasteHintError : Error)(error ?? `Fout ${res.status}`);
  }
  return body as T;
}

export async function login(password: string): Promise<void> {
  const { token } = await request<{ token: string }>("login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  localStorage.setItem(TOKEN_KEY, token);
}

export const listRecipes = () => request<Recipe[]>("recipes");
export const getRecipe = (id: string) => request<Recipe>(`recipes/${id}`);
export const createRecipe = (r: RecipeInput) =>
  request<Recipe>("recipes", { method: "POST", body: JSON.stringify(r) });
export const updateRecipe = (id: string, r: RecipeInput) =>
  request<Recipe>(`recipes/${id}`, { method: "PUT", body: JSON.stringify(r) });
export const deleteRecipe = (id: string) => request<{ ok: true }>(`recipes/${id}`, { method: "DELETE" });
export const importFromText = (text: string) =>
  request<RecipeInput>("import-ai", { method: "POST", body: JSON.stringify({ text }) });
export const importFromImage = (media_type: string, data: string) =>
  request<RecipeInput>("import-ai", { method: "POST", body: JSON.stringify({ image: { media_type, data } }) });
export const importFromUrl = (url: string) =>
  request<RecipeInput>("import", { method: "POST", body: JSON.stringify({ url }) });
