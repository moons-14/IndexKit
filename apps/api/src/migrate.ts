import { migrate } from "drizzle-orm/postgres-js/migrator";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db/index.js";

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../drizzle",
);

console.log("Running database migrations...");
await migrate(db, { migrationsFolder });
console.log("Migrations complete.");
process.exit(0);
