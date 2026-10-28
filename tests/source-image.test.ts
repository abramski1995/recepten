import { describe, expect, it, vi } from "vitest";
import { fetchSourceImage, findSourceImageUrl } from "../netlify/lib/source-image.ts";
import { MIN_IMAGE_BYTES, fetchImage } from "../netlify/lib/safe-fetch.ts";

const page = (head: string) => `<html><head>${head}</head><body></body></html>`;
const jsonld = (image: unknown) =>
  `<script type="application/ld+json">${JSON.stringify({ "@type": "Recipe", name: "X", image })}</script>`;

describe("findSourceImageUrl", () => {
  it("prefers the recipe schema image over og:image", () => {
    const html = page(jsonld(["https://x.nl/recipe.jpg"]) + '<meta property="og:image" content="https://x.nl/og.jpg">');
    expect(findSourceImageUrl(html, "https://x.nl/r")).toBe("https://x.nl/recipe.jpg");
  });
  it("falls back to og:image (resolving relative URLs) and then twitter:image", () => {
    expect(findSourceImageUrl(page('<meta property="og:image" content="/img/og.jpg">'), "https://x.nl/r/1")).toBe("https://x.nl/img/og.jpg");
    expect(findSourceImageUrl(page('<meta name="twitter:image" content="https://x.nl/t.jpg">'), "https://x.nl/r")).toBe("https://x.nl/t.jpg");
  });
  it("ignores non-http URLs and pages without images", () => {
    expect(findSourceImageUrl(page('<meta property="og:image" content="data:image/png;base64,AAA">'), "https://x.nl")).toBeNull();
    expect(findSourceImageUrl(page(""), "https://x.nl")).toBeNull();
  });
});

const imageResponse = (bytes: number, type = "image/jpeg", status = 200) =>
  new Response(Buffer.alloc(bytes, 1), { status, headers: { "content-type": type } });

describe("fetchImage", () => {
  it("downloads a jpeg and reports its type", async () => {
    const f = vi.fn().mockResolvedValue(imageResponse(MIN_IMAGE_BYTES + 1));
    const img = await fetchImage("http://93.184.216.34/a.jpg", f as never);
    expect(img).toMatchObject({ contentType: "image/jpeg", ext: "jpg" });
    expect(img.data.length).toBe(MIN_IMAGE_BYTES + 1);
  });
  it("rejects tiny files, wrong types, errors and private addresses", async () => {
    await expect(fetchImage("http://93.184.216.34/a.jpg", vi.fn().mockResolvedValue(imageResponse(100)) as never)).rejects.toThrow("too small");
    await expect(fetchImage("http://93.184.216.34/a", vi.fn().mockResolvedValue(imageResponse(20000, "text/html")) as never)).rejects.toThrow("Unsupported");
    await expect(fetchImage("http://93.184.216.34/a", vi.fn().mockResolvedValue(imageResponse(20000, "image/jpeg", 404)) as never)).rejects.toThrow("404");
    await expect(fetchImage("http://127.0.0.1/a.jpg", vi.fn() as never)).rejects.toThrow();
  });
  it("checks redirect targets too", async () => {
    const f = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: "http://169.254.169.254/x" } }));
    await expect(fetchImage("http://93.184.216.34/a.jpg", f as never)).rejects.toThrow();
  });
});

describe("fetchSourceImage", () => {
  it("returns null when the page has no image and propagates fetch errors", async () => {
    const noImage = { fetchHtml: vi.fn().mockResolvedValue(page("")), fetchImage: vi.fn() };
    expect(await fetchSourceImage("https://x.nl", noImage as never)).toBeNull();
    expect(noImage.fetchImage).not.toHaveBeenCalled();
    await expect(fetchSourceImage("https://x.nl", { fetchHtml: vi.fn().mockRejectedValue(new Error("blocked")) } as never)).rejects.toThrow("blocked");
  });
  it("downloads the image found on the page", async () => {
    const deps = {
      fetchHtml: vi.fn().mockResolvedValue(page('<meta property="og:image" content="https://x.nl/og.jpg">')),
      fetchImage: vi.fn().mockResolvedValue({ ext: "jpg" }),
    };
    expect(await fetchSourceImage("https://x.nl/r", deps as never)).toEqual({ ext: "jpg" });
    expect(deps.fetchImage).toHaveBeenCalledWith("https://x.nl/og.jpg");
  });
});
