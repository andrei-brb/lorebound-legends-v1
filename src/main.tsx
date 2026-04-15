import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isDiscordEmbeddedConfigured, setupDiscordEmbedded } from "./lib/discordEmbedded";

async function bootstrap() {
  if (isDiscordEmbeddedConfigured()) {
    try {
      await setupDiscordEmbedded();
    } catch (e) {
      console.warn("[Discord] Embedded setup failed; continuing without Discord auth.", e);
    }
  }
  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
