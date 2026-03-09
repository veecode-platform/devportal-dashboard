import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AuthGate } from "./components/AuthGate";
import { Pipeline } from "./components/Pipeline";
import { resetOctokit, validateToken } from "./lib/github";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchInterval: 30_000, staleTime: 15_000 },
  },
});

function logout(setToken: (t: string) => void) {
  sessionStorage.removeItem("gh_token");
  resetOctokit();
  queryClient.clear();
  setToken("");
}

export default function App() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("gh_token") ?? ""
  );
  const [validating, setValidating] = useState(() => !!sessionStorage.getItem("gh_token"));

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    validateToken(token).then((r) => {
      if (cancelled) return;
      if (!r.valid) logout(setToken);
      setValidating(false);
    });
    return () => { cancelled = true; };
  }, [token]);

  if (!token) return <AuthGate onAuth={setToken} />;
  if (validating) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center text-text-secondary">
        Validating session…
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-page text-text-primary p-6">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">DevPortal Release Pipeline</h1>
          <button
            onClick={() => logout(setToken)}
            className="text-sm text-text-secondary hover:text-white"
          >
            Logout
          </button>
        </header>
        <Pipeline token={token} />
      </div>
    </QueryClientProvider>
  );
}
