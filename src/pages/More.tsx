import { useState } from "react";
import { BottomNav } from "../components/BottomNav.tsx";
import { clearToken, listRecipes } from "../lib/api.ts";
import { useLoad } from "../lib/useLoad.ts";
import { useMaintenance } from "../lib/useMaintenance.ts";

function Row({ title, hint, onClick, href, disabled }: { title: string; hint: string; onClick?: () => void; href?: string; disabled?: boolean }) {
  const className =
    "flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left disabled:opacity-50";
  const content = (
    <>
      <span>
        <span className="block text-base font-medium">{title}</span>
        <span className="mt-0.5 block text-[13px] text-stone-600">{hint}</span>
      </span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 5l7 7-7 7" />
      </svg>
    </>
  );
  return href ? (
    <a href={href} className={className}>
      {content}
    </a>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {content}
    </button>
  );
}

export function More({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [reload, setReload] = useState(0);
  const { data } = useLoad(listRecipes, onUnauthorized, [reload], true);
  const { label, tidyTags, translateAll } = useMaintenance(data, onUnauthorized, () => setReload((n) => n + 1));

  return (
    <main className="mx-auto max-w-3xl px-4 pb-32 pt-7">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Meer</h1>
      <div className="mt-5 flex flex-col gap-2.5">
        <Row href="#/import" title="Importeren uit Fond" hint="Haal je recepten uit een Fond-export (.json)" />
        <Row
          title={label && label.startsWith("Categorie") ? label : "Categorieën opschonen"}
          hint="Zet bij elk recept één gerecht en de juiste ingrediënt-tags"
          onClick={tidyTags}
          disabled={!data || !!label}
        />
        <Row
          title={label && label.startsWith("Vertalen") ? label : "Engelse recepten vertalen"}
          hint="Vertaalt recepten die nog niet in het Nederlands zijn"
          onClick={translateAll}
          disabled={!data || !!label}
        />
        <Row
          title="Uitloggen"
          hint="Je moet daarna opnieuw je wachtwoord invoeren"
          onClick={() => {
            clearToken();
            onUnauthorized();
          }}
        />
      </div>
      <BottomNav active="more" />
    </main>
  );
}
