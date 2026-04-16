import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isDiscordEmbeddedConfigured, setupDiscordEmbedded } from "./lib/discordEmbedded";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (t) clearTimeout(t);
  });
}

async function bootstrap() {
  if (isDiscordEmbeddedConfigured()) {
    try {
      // Never block UI forever if Discord auth hangs (common in Activities during misconfig/outages).
      await withTimeout(setupDiscordEmbedded(), 5000, "Discord embedded setup");
    } catch (e) {
      console.warn("[Discord] Embedded setup failed; continuing without Discord auth.", e);
    }
  }
  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
