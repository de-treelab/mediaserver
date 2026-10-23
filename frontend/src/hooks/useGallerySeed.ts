import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router";
import { clearPagePosition } from "./useCursorPageParams";

const generateSeed = () => Math.random().toString(36).slice(2);

/**
 * Keeps the random sort seed in the `seed` search parameter so that gallery
 * URLs reproduce the same random order. While `enabled`, a seed is generated
 * if the URL has none; otherwise any seed is dropped from the URL. Also exposes
 * `reseedGallery()` to replace the seed with a fresh value.
 */
export const useGallerySeed = (enabled: boolean) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const seed = searchParams.get("seed") ?? undefined;

  useEffect(() => {
    if (enabled === !!seed) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (enabled) next.set("seed", generateSeed());
        else next.delete("seed");
        return next;
      },
      { replace: true },
    );
  }, [enabled, seed, setSearchParams]);

  const reseedGallery = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("seed", generateSeed());
      // Cursors of the previous order are meaningless in the new one
      clearPagePosition(next);
      return next;
    });
  }, [setSearchParams]);

  return { seed: enabled ? seed : undefined, reseedGallery };
};
