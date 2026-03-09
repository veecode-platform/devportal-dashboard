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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-lg w-96">
        <h2 className="text-xl font-bold text-white mb-4">
          DevPortal Dashboard
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Enter a GitHub PAT with <code>repo</code> and{" "}
          <code>workflow</code> scopes.
        </p>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ghp_xxxxxxxxxxxx"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white mb-3"
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-white font-medium"
        >
          {loading ? "Validating..." : "Connect"}
        </button>
      </form>
    </div>
  );
}
