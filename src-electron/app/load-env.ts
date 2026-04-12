import { config as dotenvConfig } from "dotenv";

export function loadEnv(): void {
  dotenvConfig({ override: true });
}
