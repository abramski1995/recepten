// Fetches a public web page for recipe import, refusing local/private targets.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    return v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:");
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http(s) URLs are allowed");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true })).map((r) => r.address);
  if (ips.length === 0 || ips.some(isPrivateIp)) throw new Error("URL points to a non-public address");
  return url;
}

export async function fetchHtml(raw: string): Promise<string> {
  let url = await assertPublicUrl(raw);
  // Follow redirects manually so every hop is checked.
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; ReceptenApp/1.0)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = await assertPublicUrl(new URL(res.headers.get("location")!, url).toString());
      continue;
    }
    if (!res.ok) throw new Error(`Page returned status ${res.status}`);
    const html = await res.text();
    return html.slice(0, 3_000_000);
  }
  throw new Error("Too many redirects");
}

export interface DownloadedImage {
  data: Buffer;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  ext: "jpg" | "png" | "webp";
}

const IMAGE_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export const MIN_IMAGE_BYTES = 15_000; // smaller files are almost always icons/logos/placeholders
export const MAX_IMAGE_BYTES = 6_000_000;

// Downloads an image from a public URL (every redirect hop is checked like in fetchHtml).
export async function fetchImage(raw: string, fetchFn: typeof fetch = fetch): Promise<DownloadedImage> {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetchFn(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; ReceptenApp/1.0)", accept: "image/*" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = await assertPublicUrl(new URL(res.headers.get("location")!, url).toString());
      continue;
    }
    if (!res.ok) throw new Error(`Image returned status ${res.status}`);
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!(type in IMAGE_EXT)) throw new Error(`Unsupported image type: ${type || "unknown"}`);
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_IMAGE_BYTES) throw new Error("Image is too large");
    const data = Buffer.from(await res.arrayBuffer());
    if (data.length > MAX_IMAGE_BYTES) throw new Error("Image is too large");
    if (data.length < MIN_IMAGE_BYTES) throw new Error("Image is too small (probably an icon)");
    const contentType = type as DownloadedImage["contentType"];
    return { data, contentType, ext: IMAGE_EXT[contentType] };
  }
  throw new Error("Too many redirects");
}
