import { RecipeThumb } from "./RecipeThumb.tsx";
import { gerechtOf, labelOf } from "../lib/taxonomy.ts";
import type { Recipe } from "../types.ts";

interface Props {
  recipe: Recipe;
  favorite: boolean;
  onToggleFavorite: () => void;
}

export function RecipeCard({ recipe, favorite, onToggleFavorite }: Props) {
  const gerecht = gerechtOf(recipe.tags);
  const meta = [recipe.total_minutes ? `${recipe.total_minutes} min` : null, gerecht ? labelOf(gerecht) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="relative">
      <a href={`#/r/${recipe.id}`} className="block">
        <div className="relative overflow-hidden rounded-[20px]">
          <RecipeThumb recipe={recipe} className="h-[150px] w-full" />
          {recipe.tags.includes("vegetarisch") && (
            <span className="absolute bottom-2 left-2 flex h-6 items-center rounded-full bg-lime-100 px-2.5 text-xs font-semibold text-lime-900">
              Vegetarisch
            </span>
          )}
        </div>
        <h2 className="mt-2 line-clamp-2 px-0.5 text-base font-medium leading-tight">{recipe.title}</h2>
        {meta && <p className="mt-0.5 px-0.5 text-[13px] text-stone-600">{meta}</p>}
      </a>
      <button
        type="button"
        aria-pressed={favorite}
        aria-label={favorite ? `Verwijder ${recipe.title} uit favorieten` : `Bewaar ${recipe.title} als favoriet`}
        onClick={onToggleFavorite}
        className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90">
          <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"
            fill={favorite ? "#b4492a" : "none"} stroke={favorite ? "#b4492a" : "#2b2420"}>
            <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
          </svg>
        </span>
      </button>
    </article>
  );
}

export function RecipeCardSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="h-[150px] rounded-[20px] bg-stone-200" />
      <div className="mt-2 h-4 w-3/4 rounded bg-stone-200" />
      <div className="mt-1.5 h-3 w-1/2 rounded bg-stone-200" />
    </div>
  );
}
