import { useEffect, useState } from "react";
import { getRecipe } from "../lib/api.ts";
import { useLoad } from "../lib/useLoad.ts";
import { go } from "../lib/useRoute.ts";

// Keeps the screen on while cooking (where the browser supports it).
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const acquire = () => {
      navigator.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => undefined);
    };
    const onVisible = () => document.visibilityState === "visible" && acquire();
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => undefined);
    };
  }, []);
}

export function CookMode({ id, onUnauthorized }: { id: string; onUnauthorized: () => void }) {
  const { data: recipe, error } = useLoad(() => getRecipe(id), onUnauthorized, [id]);
  const [step, setStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  useWakeLock();

  if (error) return <p className="p-4 text-red-700">{error}</p>;
  if (!recipe) return <p className="p-4 text-stone-500">Laden…</p>;

  const total = recipe.steps.length;
  const last = step >= total - 1;

  return (
    <main className="flex min-h-screen flex-col bg-stone-900 p-5 text-stone-50">
      <header className="flex items-center justify-between text-sm text-stone-300">
        <button onClick={() => go(`/r/${id}`)}>✕ Stoppen</button>
        <span>
          Stap {Math.min(step + 1, total)} van {total}
        </span>
        <button onClick={() => setShowIngredients((v) => !v)}>
          {showIngredients ? "Verberg" : "Ingrediënten"}
        </button>
      </header>

      {showIngredients && (
        <ul className="mt-4 space-y-1 rounded-2xl bg-stone-800 p-4 text-lg">
          {recipe.ingredients.map((ing, i) => (
            <li key={i}>{ing}</li>
          ))}
        </ul>
      )}

      <p className="flex flex-1 items-center py-6 text-3xl leading-snug">
        {total === 0 ? "Dit recept heeft nog geen stappen." : recipe.steps[step]}
      </p>

      <footer className="flex gap-3">
        <button
          className="btn flex-1 bg-stone-700 py-4 text-lg text-white"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
        >
          ← Vorige
        </button>
        <button
          className="btn flex-1 bg-orange-600 py-4 text-lg text-white"
          onClick={() => (last ? go(`/r/${id}`) : setStep(step + 1))}
        >
          {last ? "Klaar ✓" : "Volgende →"}
        </button>
      </footer>
    </main>
  );
}
