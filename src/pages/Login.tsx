import { useState, type FormEvent } from "react";
import { login } from "../lib/api.ts";

export function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(password);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inloggen mislukt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold text-orange-800">GijsRecepten</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          className="input"
          type="password"
          placeholder="Wachtwoord"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className="btn-primary" disabled={busy || !password}>
          {busy ? "Bezig…" : "Openen"}
        </button>
      </form>
    </main>
  );
}
