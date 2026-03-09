import { useState } from "react";
import { validateToken } from "../lib/github";

export function AuthGate({ onAuth }: { onAuth: (token: string) => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await validateToken(input.trim());
    if (result.valid) {
      sessionStorage.setItem("gh_token", input.trim());
      onAuth(input.trim());
    } else {
      setError(result.error ?? "Authentication failed.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-card border border-border p-8 rounded-lg w-96">
        <h2 className="text-xl font-bold text-text-primary mb-4">
          DevPortal Dashboard
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          Enter a GitHub PAT with <code>repo</code> and{" "}
          <code>workflow</code> scopes.
        </p>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ghp_xxxxxxxxxxxx"
          className="w-full px-3 py-2 bg-page border border-border rounded text-text-primary mb-3"
        />
        {error && <p className="text-neon-red text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-full py-2 bg-neon-blue hover:bg-neon-blue/80 disabled:opacity-50 rounded text-white font-medium"
        >
          {loading ? "Validating..." : "Connect"}
        </button>
      </form>
    </div>
  );
}
