// Load .env.local for CLI scripts (Next.js does this automatically for the app).
import { existsSync } from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (existsSync(f)) {
    try {
      process.loadEnvFile(f);
    } catch {
      /* ignore malformed lines */
    }
  }
}
