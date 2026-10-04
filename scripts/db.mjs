import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseDir = path.join(root, "data", "pg");

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "carrier",
  port: 5432,
  persistent: true,
  initdbFlags: ["--locale=C", "--encoding=UTF8"],
});

if (!existsSync(path.join(databaseDir, "PG_VERSION"))) {
  console.log("initialising Postgres cluster");
  await pg.initialise();
}

await pg.start();

try {
  await pg.createDatabase("carrier");
  console.log("created database carrier");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!/already exists/i.test(message)) {
    throw error;
  }
}

console.log("Postgres listening on 127.0.0.1:5432 (database carrier)");
await new Promise(() => {});
