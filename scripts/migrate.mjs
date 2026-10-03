import { loadEnv } from "vite";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
const env = { ...loadEnv("development", process.cwd(), ""), ...process.env };
if (!env.DATABASE_URL) throw new Error("DATABASE_URL이 필요합니다.");
const database = new URL(env.DATABASE_URL);
if (!["postgres:", "postgresql:"].includes(database.protocol)) throw new Error("PostgreSQL 연결 주소를 확인해 주세요.");
const command = process.env.PSQL_BIN || (existsSync("/opt/homebrew/opt/libpq/bin/psql") ? "/opt/homebrew/opt/libpq/bin/psql" : "psql");
const child = spawn(command, ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--file", "supabase/migrations/202610020001_commerce.sql"], {
  env: { ...process.env, PGHOST: database.hostname, PGPORT: database.port || "5432", PGUSER: decodeURIComponent(database.username),
    PGPASSWORD: decodeURIComponent(database.password), PGDATABASE: decodeURIComponent(database.pathname.slice(1)), PGSSLMODE: "require" }, stdio: ["ignore", "pipe", "pipe"],
});
for (const stream of [child.stdout, child.stderr]) stream.on("data", (data) => {
  let output = data.toString();
  for (const key of ["DATABASE_URL", "SUPABASE_SECRET_KEY", "NICEPAY_SECRET_KEY"]) if (env[key]) output = output.replaceAll(env[key], "[비공개]");
  process.stdout.write(output);
});
child.on("error", () => { console.error("psql 실행 파일을 확인해 주세요."); process.exitCode = 1; });
child.on("close", (code) => { process.exitCode = code || 0; });
