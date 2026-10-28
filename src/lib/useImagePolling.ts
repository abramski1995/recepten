import { useEffect } from "react";
import { clearFinishedImages, pendingImageIds } from "./images.ts";

// While photos are being generated, reload the page data every few seconds until they arrive.
export function useImagePolling(recipes: { id: string; image_url: string | null }[] | null, reload: () => void) {
  useEffect(() => {
    if (!recipes) return;
    clearFinishedImages(recipes);
    if (pendingImageIds().length === 0) return;
    const timer = setTimeout(reload, 6000);
    return () => clearTimeout(timer);
  }, [recipes, reload]);
}
