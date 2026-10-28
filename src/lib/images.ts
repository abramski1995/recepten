// Client side of AI photo generation. Generation runs in a background function; the client
// triggers it and then polls the recipe until image_url shows up.
import { UnauthorizedError, clearToken, getRecipe, getToken } from "./api.ts";

const PENDING_KEY = "recepten-pending-images";
const MAX_WAIT_MS = 3 * 60 * 1000;

// recipe id -> when it started and which photo it replaces (null when there was none)
type Pending = Record<string, { started: number; previous: string | null }>;

function readPending(): Pending {
  try {
    return JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "{}") as Pending;
  } catch {
    return {};
  }
}

function writePending(p: Pending) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(p));
  } catch {
    // sessionStorage unavailable (private mode): polling just won't resume after a reload
  }
}

// Ids whose photo is expected soon (started less than 3 minutes ago).
export function pendingImageIds(now = Date.now()): string[] {
  return Object.entries(readPending())
    .filter(([, { started }]) => now - started < MAX_WAIT_MS)
    .map(([id]) => id);
}

export function clearPendingImages(ids: string[]) {
  const pending = readPending();
  ids.forEach((id) => delete pending[id]);
  writePending(pending);
}

// Drops pending entries whose recipe now has a photo different from the one it started with.
export function clearFinishedImages(recipes: { id: string; image_url: string | null }[]) {
  const pending = readPending();
  clearPendingImages(recipes.filter((r) => r.image_url && pending[r.id] && r.image_url !== pending[r.id].previous).map((r) => r.id));
}

export async function requestImage(id: string, force = false, previousUrl: string | null = null): Promise<void> {
  const res = await fetch("/.netlify/functions/generate-image-background", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${getToken() ?? ""}` },
    body: JSON.stringify({ id, force }),
  });
  if (res.status === 401) {
    clearToken();
    throw new UnauthorizedError("Sessie verlopen");
  }
  if (!res.ok) throw new Error("Foto genereren kon niet gestart worden");
  writePending({ ...readPending(), [id]: { started: Date.now(), previous: previousUrl } });
}

// Resolves true when the recipe got a (new) image within the time limit.
export async function waitForImage(id: string, previousUrl: string | null, timeoutMs = 120_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 4000));
    const { image_url } = await getRecipe(id);
    if (image_url && image_url !== previousUrl) {
      clearPendingImages([id]);
      return true;
    }
  }
  return false;
}
