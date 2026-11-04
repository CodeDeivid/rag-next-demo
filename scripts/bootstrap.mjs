// One-command local setup: env file, database, migrations. Safe to run again.
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const step = (msg) => console.log(`\n\x1b[36m▸ ${msg}\x1b[0m`);
const run = (cmd) => execSync(cmd, { stdio: "inherit" });
const fail = (msg) => {
  console.error(`\x1b[31m✖ ${msg}\x1b[0m`);
  process.exit(1);
};

step("Checking requirements");
const [major] = process.versions.node.split(".").map(Number);
if (major < 20) fail(`Node 20+ required, found ${process.versions.node}`);
try {
  execSync("docker info", { stdio: "ignore" });
} catch {
  fail("Docker is not running. Start Docker and run `pnpm bootstrap` again.");
}

step("Environment file");
if (!existsSync(".env")) copyFileSync(".env.example", ".env");
let env = readFileSync(".env", "utf8");
if (/^OPENROUTER_API_KEY=\s*$/m.test(env)) {
  if (process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const key = (
      await rl.question("OpenRouter API key (free at https://openrouter.ai/keys, Enter to skip): ")
    ).trim();
    rl.close();
    if (key) {
      env = env.replace(/^OPENROUTER_API_KEY=.*$/m, `OPENROUTER_API_KEY=${key}`);
      writeFileSync(".env", env);
    }
  }
  if (/^OPENROUTER_API_KEY=\s*$/m.test(env)) {
    console.log("  No key yet: uploads and search work, answers will show a missing-key error.");
  }
} else {
  console.log("  .env already has a key, leaving it as is.");
}

step("Starting Postgres + pgvector");
run("docker compose up -d --wait");

step("Applying migrations");
run("pnpm db:migrate");

console.log("\n\x1b[32m✔ Ready.\x1b[0m Run \x1b[1mpnpm dev\x1b[0m and open http://localhost:3000");
console.log("  The first upload downloads the embedding model (~120 MB), later ones are instant.");
