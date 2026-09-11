import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// stylock platform layout helpers
export const resolveAssets = (file: string) =>
  path.join(__dirname, "..", "assets", file);
