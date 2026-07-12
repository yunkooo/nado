import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configSource = readFileSync(
  resolve(repoRoot, "supabase/config.toml"),
  "utf8",
);
const projectId = configSource.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];

if (!projectId) {
  throw new Error("supabase/config.toml must define project_id.");
}

const databaseContainer =
  process.env.SUPABASE_DB_CONTAINER ?? `supabase_db_${projectId}`;
const fixtureDir = resolve(repoRoot, "supabase/fixtures/upgrade");
const migrationDir = resolve(repoRoot, "supabase/migrations");
const vocabularyContractMigrations = [
  "20260711075241_constrain_vocabulary_and_add_pagination_index.sql",
  "20260711123213_align_vocabulary_contract_and_usage_retention.sql",
  "20260711165808_enforce_vocabulary_timestamp_length.sql",
];
const migrationVersions = readdirSync(migrationDir)
  .map((filename) => filename.match(/^(\d+)_.*\.sql$/)?.[1])
  .filter(Boolean)
  .sort();

resetLocalDatabase();
runSqlSource(`
  alter table public.vocabulary_items
    drop constraint if exists vocabulary_items_term_max_length;
  alter table public.vocabulary_items
    drop constraint if exists vocabulary_items_meanings_valid;
  drop index if exists public.vocabulary_items_user_updated_id_idx;
`);
runSql(resolve(fixtureDir, "legacy_vocabulary_before_contract.sql"));

for (const migration of vocabularyContractMigrations) {
  runSql(resolve(migrationDir, migration));
}

runSql(resolve(fixtureDir, "legacy_vocabulary_after_upgrade.sql"));
runSqlSource(`
  delete from auth.users
  where id = '00000000-0000-0000-0000-000000000101';

  do $$
  begin
    if exists (
      select 1
      from public.vocabulary_items
      where user_id = '00000000-0000-0000-0000-000000000101'
    ) then
      raise exception 'legacy upgrade fixture cleanup failed';
    end if;
  end;
  $$;
`);

console.log("Supabase legacy-data upgrade verification passed.");

function resetLocalDatabase() {
  const resetStatus = runForStatus("pnpm", ["supabase:reset"]);

  if (resetStatus === 0) {
    return;
  }

  const expectedVersions = migrationVersions
    .map((version) => `'${version}'`)
    .join(", ");
  const verificationSource = `
    do $$
    begin
      if to_regclass('public.vocabulary_items') is null
        or to_regclass('public.analysis_usage_limits') is null then
        raise exception 'reset did not restore the application tables';
      end if;

      if (
        select count(*)
        from supabase_migrations.schema_migrations
      ) <> ${migrationVersions.length} or (
        select count(*)
        from supabase_migrations.schema_migrations
        where version = any (array[${expectedVersions}]::text[])
      ) <> ${migrationVersions.length} then
        raise exception 'reset did not apply every repository migration';
      end if;

      if exists (select 1 from public.vocabulary_items)
        or exists (select 1 from public.analysis_usage_limits)
        or exists (select 1 from auth.users) then
        raise exception 'reset did not clear application data';
      end if;
    end;
    $$;
  `;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (tryRunSqlSource(verificationSource)) {
      console.warn(
        "Supabase readiness check failed after reset, but the clean database and every migration were verified directly.",
      );
      return;
    }

    sleep(1_000);
  }

  process.exit(resetStatus);
}

function run(command, args, input) {
  const status = runForStatus(command, args, input);

  if (status !== 0) {
    process.exit(status);
  }
}

function runForStatus(command, args, input) {
  const executable =
    process.platform === "win32" && command === "pnpm" ? "pnpm.cmd" : command;
  const result = spawnSync(executable, args, {
    cwd: repoRoot,
    encoding: "utf8",
    input,
    stdio: input === undefined ? "inherit" : ["pipe", "inherit", "inherit"],
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

function runSql(path) {
  runSqlSource(readFileSync(path, "utf8"));
}

function runSqlSource(source) {
  run(
    "docker",
    [
      "exec",
      "-i",
      databaseContainer,
      "psql",
      "--set",
      "ON_ERROR_STOP=1",
      "--username",
      "postgres",
      "--dbname",
      "postgres",
    ],
    source,
  );
}

function tryRunSqlSource(source) {
  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      databaseContainer,
      "psql",
      "--set",
      "ON_ERROR_STOP=1",
      "--username",
      "postgres",
      "--dbname",
      "postgres",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      input: source,
      stdio: ["pipe", "ignore", "ignore"],
    },
  );

  return !result.error && result.status === 0;
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}
