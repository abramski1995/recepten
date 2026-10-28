import { useState } from "react";
import { getToken } from "./lib/api.ts";
import { useRoute } from "./lib/useRoute.ts";
import { CookMode } from "./pages/CookMode.tsx";
import { ImportFond } from "./pages/ImportFond.tsx";
import { Login } from "./pages/Login.tsx";
import { RecipeDetail } from "./pages/RecipeDetail.tsx";
import { RecipeForm } from "./pages/RecipeForm.tsx";
import { RecipeList } from "./pages/RecipeList.tsx";

export function App() {
  const [authed, setAuthed] = useState(() => !!getToken());
  const route = useRoute();

  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  const onUnauthorized = () => setAuthed(false);
  switch (route.name) {
    case "new":
      return <RecipeForm onUnauthorized={onUnauthorized} />;
    case "import":
      return <ImportFond onUnauthorized={onUnauthorized} />;
    case "edit":
      return <RecipeForm id={route.id} onUnauthorized={onUnauthorized} />;
    case "detail":
      return <RecipeDetail id={route.id} onUnauthorized={onUnauthorized} />;
    case "cook":
      return <CookMode id={route.id} onUnauthorized={onUnauthorized} />;
    default:
      return <RecipeList onUnauthorized={onUnauthorized} />;
  }
}
