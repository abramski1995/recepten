import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearFinishedImages, pendingImageIds, requestImage } from "../src/lib/images.ts";

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
  vi.stubGlobal("localStorage", { getItem: () => "tok", removeItem: () => undefined });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 202 })));
});

describe("pending image jobs", () => {
  it("tracks a started job and clears it once a different photo shows up", async () => {
    await requestImage("a", true, "old.jpg");
    expect(pendingImageIds()).toEqual(["a"]);

    clearFinishedImages([{ id: "a", image_url: "old.jpg" }]); // still the old photo
    expect(pendingImageIds()).toEqual(["a"]);

    clearFinishedImages([{ id: "a", image_url: "new.jpg" }]);
    expect(pendingImageIds()).toEqual([]);
  });

  it("clears a first photo (no previous one)", async () => {
    await requestImage("b");
    clearFinishedImages([{ id: "b", image_url: null }]);
    expect(pendingImageIds()).toEqual(["b"]);
    clearFinishedImages([{ id: "b", image_url: "x.jpg" }]);
    expect(pendingImageIds()).toEqual([]);
  });

  it("ignores jobs older than 3 minutes", async () => {
    await requestImage("c");
    expect(pendingImageIds(Date.now() + 4 * 60 * 1000)).toEqual([]);
  });

  it("sends the auth header and fails on a non-2xx response", async () => {
    await requestImage("d");
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/.netlify/functions/generate-image-background");
    expect(init.headers.authorization).toBe("Bearer tok");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    await expect(requestImage("e")).rejects.toThrow();
  });
});
