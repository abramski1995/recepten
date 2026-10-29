import { useEffect, useState } from "react";
import { Chip } from "./Chip.tsx";
import { cleanTags, customOnly, GERECHTEN, INGREDIENTEN, isGerecht, isMeatKind, VLEESSOORTEN } from "../lib/taxonomy.ts";

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
}

const parseLabels = (text: string) => [...new Set(text.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];

// Picks tags from the fixed categories (no free-form typing for those) plus optional own labels.
export function TagPicker({ value, onChange }: Props) {
  const gerecht = value.find(isGerecht) ?? null;
  const meatOn = value.includes("vlees");

  // Own labels are typed as comma separated text and committed on blur, so typing a comma never eats it.
  const [labelText, setLabelText] = useState(customOnly(value).join(", "));
  useEffect(() => {
    if (parseLabels(labelText).join("|") !== customOnly(value).join("|")) setLabelText(customOnly(value).join(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const set = (tags: string[]) => onChange(cleanTags(tags, []));
  const toggle = (id: string) => set(value.includes(id) ? value.filter((t) => t !== id) : [...value, id]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 text-sm font-medium text-stone-700">Gerecht</div>
        <div className="flex flex-wrap gap-2">
          {GERECHTEN.map((g) => (
            <Chip key={g.id} pressed={gerecht === g.id} onClick={() => set([...value.filter((t) => !isGerecht(t)), ...(gerecht === g.id ? [] : [g.id])])}>
              {g.label}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-stone-700">Hoofdingrediënt</div>
        <div className="flex flex-wrap gap-2">
          {INGREDIENTEN.map((i) => (
            <Chip
              key={i.id}
              tone="olive"
              pressed={value.includes(i.id)}
              onClick={() => (i.id === "vlees" && meatOn ? set(value.filter((t) => t !== "vlees" && !isMeatKind(t))) : toggle(i.id))}
            >
              {i.label}
            </Chip>
          ))}
        </div>
        {meatOn && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl bg-lime-50 px-3 py-2.5">
            <span className="text-[13px] font-medium text-lime-900">Soort vlees</span>
            {VLEESSOORTEN.map((v) => (
              <Chip key={v.id} size="sm" tone="olive" pressed={value.includes(v.id)} onClick={() => toggle(v.id)}>
                {v.label}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-stone-700">Eigen labels (optioneel, komma-gescheiden)</span>
        <input
          className="input"
          value={labelText}
          onChange={(e) => setLabelText(e.target.value)}
          onBlur={() => set([...value.filter((t) => !customOnly([t]).length), ...parseLabels(labelText)])}
        />
      </label>
      <p className="-mt-2 text-xs text-stone-500">De tijd (snel, rustig, langzaam) wordt automatisch bepaald uit de totale tijd.</p>
    </div>
  );
}
