import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = resolve(fileURLToPath(import.meta.url), '../..')
