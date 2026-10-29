import { useEffect, useState } from "react";

// Minimal hash router: "#/", "#/favorites", "#/more", "#/new", "#/import", "#/r/:id", "#/edit/:id", "#/cook/:id".
export type Route =
  | { name: "list" }
  | { name: "favorites" }
  | { name: "more" }
  | { name: "new" }
  | { name: "import" }
  | { name: "detail"; id: string }
  | { name: "edit"; id: string }
  | { name: "cook"; id: string };

export function parseHash(hash: string): Route {
  const [, a, b] = hash.replace(/^#/, "").split("/");
  if (a === "favorites") return { name: "favorites" };
  if (a === "more") return { name: "more" };
  if (a === "new") return { name: "new" };
  if (a === "import") return { name: "import" };
  if (a === "r" && b) return { name: "detail", id: b };
  if (a === "edit" && b) return { name: "edit", id: b };
  if (a === "cook" && b) return { name: "cook", id: b };
  return { name: "list" };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export const go = (path: string) => {
  location.hash = path;
};
