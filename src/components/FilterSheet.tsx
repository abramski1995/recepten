import { useEffect, useRef, useState } from "react";
import { Chip } from "./Chip.tsx";
import { noFilters, type Filters } from "../lib/filter.ts";
import { GERECHTEN, INGREDIENTEN, TIJDEN, VLEESSOORTEN } from "../lib/taxonomy.ts";

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  count: number;
  labels: string[]; // own labels that exist
  onClose: () => void;
}

const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-stone-500">{title}</h3>
      <div className="mt-2.5 flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

// Bottom sheet with all filters. Changes apply live; the button shows how many recipes match.
export function FilterSheet({ filters, onChange, count, labels, onClose }: Props) {
  const [showLabels, setShowLabels] = useState(filters.eigen.length > 0);
  const meatOn = filters.ingredienten.includes("vlees");

  const dialogRef = useRef<HTMLDivElement>(null);

  // Move focus into the sheet and give it back to the filter button when the sheet closes.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => opener?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // keep the page behind from scrolling
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  function toggleIngredient(id: string) {
    const next = toggleIn(filters.ingredienten, id);
    // Turning "Vlees" off also clears the meat kinds, which only make sense with it.
    onChange({ ...filters, ingredienten: next, vlees: id === "vlees" && !next.includes("vlees") ? [] : filters.vlees });
  }

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-stone-900/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[90vh] max-w-2xl flex-col rounded-t-[28px] bg-[#fffaf3] px-5 pt-2.5 outline-none"
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-stone-300" aria-hidden="true" />
        <div className="mt-3 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Filters</h2>
          <button
            type="button"
            className="h-11 px-1 text-[15px] font-semibold text-orange-700"
            onClick={() => onChange({ ...noFilters })}
          >
            Wis alles
          </button>
        </div>

        <div className="mt-2 flex-1 overflow-y-auto pb-4">
          <Group title="Gerecht">
            {GERECHTEN.map((g) => (
              <Chip
                key={g.id}
                pressed={filters.gerecht === g.id}
                onClick={() => onChange({ ...filters, gerecht: filters.gerecht === g.id ? null : g.id })}
              >
                {g.label}
              </Chip>
            ))}
          </Group>

          <Group title="Hoofdingrediënt">
            {INGREDIENTEN.map((i) => (
              <Chip key={i.id} tone="olive" pressed={filters.ingredienten.includes(i.id)} onClick={() => toggleIngredient(i.id)}>
                {i.label}
              </Chip>
            ))}
          </Group>
          {meatOn && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-2xl bg-lime-50 px-3 py-2.5">
              <span className="text-[13px] font-medium text-lime-900">Soort vlees</span>
              {VLEESSOORTEN.map((v) => (
                <Chip
                  key={v.id}
                  size="sm"
                  tone="olive"
                  pressed={filters.vlees.includes(v.id)}
                  onClick={() => onChange({ ...filters, vlees: toggleIn(filters.vlees, v.id) })}
                >
                  {v.label}
                </Chip>
              ))}
            </div>
          )}

          <Group title="Tijd">
            {TIJDEN.map((t) => (
              <Chip
                key={t.id}
                pressed={filters.tijd === t.id}
                onClick={() => onChange({ ...filters, tijd: filters.tijd === t.id ? null : t.id })}
              >
                {t.label}
              </Chip>
            ))}
          </Group>

          {labels.length > 0 && (
            <Group title="Eigen labels">
              {showLabels ? (
                labels.map((l) => (
                  <Chip key={l} pressed={filters.eigen.includes(l)} onClick={() => onChange({ ...filters, eigen: toggleIn(filters.eigen, l) })}>
                    {l}
                  </Chip>
                ))
              ) : (
                <button
                  type="button"
                  onClick={() => setShowLabels(true)}
                  className="h-11 rounded-full border border-dashed border-stone-400 px-[18px] text-[15px] font-medium text-stone-600"
                >
                  Toon mijn labels
                </button>
              )}
            </Group>
          )}
        </div>

        <div className="border-t border-stone-200 pb-6 pt-3">
          <button type="button" onClick={onClose} className="btn-primary h-14 w-full !rounded-2xl !text-[17px] !font-semibold">
            {count === 0 ? "Geen recepten gevonden" : count === 1 ? "Toon 1 recept" : `Toon ${count} recepten`}
          </button>
        </div>
      </div>
    </div>
  );
}
