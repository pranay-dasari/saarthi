import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local from the project root (saarthi/)
config({ path: resolve(process.cwd(), ".env.local") });
