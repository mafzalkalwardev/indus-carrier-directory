import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const venvDir = path.join(root, "ingest", ".venv");
const venvPython = path.join(venvDir, "Scripts", "python.exe");
const systemPython = path.join(process.env.LOCALAPPDATA ?? "", "Programs", "Python", "Python312", "python.exe");

function loadEnv() {
  const file = path.join(root, ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

if (!existsSync(venvPython)) {
  const base = existsSync(systemPython) ? systemPython : "python";
  const created = spawnSync(base, ["-m", "venv", venvDir], { stdio: "inherit" });
  if (created.status !== 0) process.exit(created.status ?? 1);
  const installed = spawnSync(venvPython, ["-m", "pip", "install", "-r", path.join(root, "ingest", "requirements.txt")], {
    stdio: "inherit",
  });
  if (installed.status !== 0) process.exit(installed.status ?? 1);
}

const child = spawnSync(venvPython, ["-m", "fmcsa_ingest", "sync", ...process.argv.slice(2)], {
  cwd: path.join(root, "ingest"),
  stdio: "inherit",
  env: process.env,
});

process.exit(child.status ?? 1);
