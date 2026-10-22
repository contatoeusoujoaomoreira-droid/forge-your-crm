import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Evita tela branca quando uma função do servidor responde 401 (sessão expirada)
window.addEventListener("unhandledrejection", (e) => {
  const msg = String((e.reason as any)?.message || e.reason || "");
  const status = (e.reason as any)?.context?.status;
  if (status === 401 || /401|Unauthorized|Sessão expirada/i.test(msg)) {
    e.preventDefault();
    console.warn("Sessão expirada ou sem autorização:", msg);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
