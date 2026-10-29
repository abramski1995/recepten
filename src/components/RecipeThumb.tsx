import { gerechtOf } from "../lib/taxonomy.ts";

// Placeholder colours per dish type: [background, food].
const TILES: Record<string, [string, string]> = {
  hoofdgerecht: ["#E6B99E", "#A94B2B"],
  soep: ["#E8DDB0", "#C98A2B"],
  salade: ["#C9D2AE", "#6F7F3F"],
  lunch: ["#D9C7A6", "#8A5A33"],
  gebak: ["#EBD3A8", "#B07A3A"],
  dessert: ["#EBC3B8", "#C0392B"],
};
const FALLBACK: [string, string] = ["#E9DCC8", "#B4492A"];

interface Props {
  recipe: { image_url: string | null; tags: string[] };
  className?: string;
}

// The recipe photo, or a plate in the colour of its dish type when there is no photo yet.
export function RecipeThumb({ recipe, className = "" }: Props) {
  if (recipe.image_url) {
    return <img src={recipe.image_url} alt="" loading="lazy" className={`object-cover ${className}`} />;
  }
  const [bg, food] = TILES[gerechtOf(recipe.tags) ?? ""] ?? FALLBACK;
  return (
    <div className={className} style={{ background: bg }} aria-hidden="true">
      <svg width="100%" height="100%" viewBox="0 0 170 150" preserveAspectRatio="xMidYMid slice">
        <circle cx="85" cy="78" r="56" fill="#FBF6EE" opacity="0.92" />
        <circle cx="85" cy="78" r="42" fill={food} />
        <circle cx="72" cy="70" r="8" fill="#FBF6EE" opacity="0.35" />
        <circle cx="97" cy="84" r="9" fill="#FBF6EE" opacity="0.35" />
        <circle cx="86" cy="64" r="5" fill="#FBF6EE" opacity="0.5" />
      </svg>
    </div>
  );
}
