import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./app/App";
import { ThemeProvider } from "./lib/theme";
import "./styles.css";

const client = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

// A 401 from any non-auth endpoint means the session cookie is gone. Drop the
// cache rather than showing stale member-only data to a guest.
window.addEventListener("rendez:session-expired", () => {
  client.clear();
  client.setQueryData(["me"], null);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
