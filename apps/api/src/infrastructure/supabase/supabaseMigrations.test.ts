import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../supabase/migrations",
);

type Migration = {
  file: string;
  sql: string;
};

describe("Supabase migrations", () => {
  it("creates the analysis usage table before altering its access rules", () => {
    const migrations = readMigrations();
    const createTableIndex = migrations.findIndex((migration) =>
      migration.sql.includes("create table public.analysis_usage_limits"),
    );
    const accessRulesIndex = migrations.findIndex((migration) =>
      migration.sql.includes("analysis_usage_limits_single_identity"),
    );

    expect(createTableIndex).toBeGreaterThanOrEqual(0);
    expect(accessRulesIndex).toBeGreaterThan(createTableIndex);
  });

  it("defines the effective atomic analysis usage consume function", () => {
    const effectiveSql = readEffectiveMigrationTail(
      "create or replace function public.consume_analysis_usage",
    );

    expect(effectiveSql).toContain(
      "create or replace function public.consume_analysis_usage",
    );
    expect(effectiveSql).toContain(
      "grant execute on function public.consume_analysis_usage",
    );
    expect(effectiveSql).toContain(
      "alter function public.consume_analysis_usage(uuid, text, date, integer)",
    );
    expect(effectiveSql).toContain("set search_path = ''");
  });

  it("includes Supabase advisor remediations for RLS", () => {
    const migrationSql = readAllMigrationSql();

    expect(migrationSql).toContain("(select auth.uid()) = user_id");
    expect(migrationSql).toContain(
      'create policy "Service role can manage analysis usage"',
    );
  });

  it("uses only the latest atomic vocabulary save definition", () => {
    const effectiveSql = readEffectiveMigrationTail(
      "create or replace function public.save_vocabulary_item",
    );

    expect(
      effectiveSql.match(
        /create or replace function public\.save_vocabulary_item/g,
      ),
    ).toHaveLength(1);
    expect(effectiveSql).toContain(
      "on conflict on constraint vocabulary_items_user_id_normalized_term_type_key",
    );
    expect(effectiveSql).toContain(
      "jsonb_array_length(public.vocabulary_items.meanings) >= 20",
    );
    expect(effectiveSql).toContain(
      "grant execute on function public.save_vocabulary_item",
    );
    expect(effectiveSql).not.toContain(
      "on conflict (user_id, normalized_term, type)",
    );
  });

  it("deletes vocabulary meanings atomically with authenticated privileges", () => {
    const migrationSql = readLatestMigrationDefining(
      "create or replace function public.delete_vocabulary_meaning",
    ).sql;

    expect(migrationSql).toContain("security invoker");
    expect(migrationSql).toContain("set search_path = ''");
    expect(migrationSql).toContain("for update");
    expect(migrationSql).toContain("with ordinality");
    expect(migrationSql).toContain(
      "revoke all on function public.delete_vocabulary_meaning",
    );
    expect(migrationSql).toContain(
      "grant execute on function public.delete_vocabulary_meaning",
    );
  });

  it("constrains new vocabulary input without rejecting legacy rows", () => {
    const migrationSql = readLatestMigrationDefining(
      "vocabulary_items_user_updated_id_idx",
    ).sql;

    expect(migrationSql).toContain("vocabulary_items_term_max_length");
    expect(migrationSql).toContain("vocabulary_items_meanings_valid");
    expect(migrationSql).toContain("not valid");
    expect(migrationSql).not.toContain("validate constraint");
    expect(migrationSql).toContain("jsonb_array_length(p_meanings) > 20");
    expect(migrationSql).toContain(
      "entry.value - array['meaning', 'note', 'createdAt']",
    );
    expect(migrationSql).toContain(
      "on public.vocabulary_items (user_id, updated_at desc, id desc)",
    );
  });

  it("aligns vocabulary JSON with the runtime contract and limits privileges", () => {
    const migrationSql = readLatestMigrationDefining(
      "delete_expired_analysis_usage",
    ).sql;

    expect(migrationSql).toContain(
      "jsonb_typeof(entry -> 'note') is distinct from 'string'",
    );
    expect(migrationSql).toContain(
      "created_at_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T",
    );
    expect(migrationSql).toContain(
      "revoke all on table public.vocabulary_items from anon, authenticated",
    );
    expect(migrationSql).toContain(
      "grant select, insert, update, delete on table public.vocabulary_items",
    );
  });

  it("bounds new vocabulary timestamps without revalidating legacy rows", () => {
    const migrationSql = readLatestMigrationDefining(
      "char_length(created_at_text) > 40",
    ).sql;

    expect(migrationSql).toContain("char_length(created_at_text) > 40");
    expect(migrationSql).toContain(
      "and char_length(entry.value ->> 'createdAt') > 40",
    );
    expect(migrationSql).toContain(
      "drop constraint vocabulary_items_meanings_valid",
    );
    expect(migrationSql).toContain("not valid");
    expect(migrationSql).not.toContain("validate constraint");
  });

  it("defines a service-role-only 90-day usage cleanup path", () => {
    const migrationSql = readLatestMigrationDefining(
      "delete_expired_analysis_usage",
    ).sql;

    expect(migrationSql).toContain("analysis_usage_limits_period_start_idx");
    expect(migrationSql).toContain("p_retention_days integer default 90");
    expect(migrationSql).toContain("security invoker");
    expect(migrationSql).toContain("from public, anon, authenticated");
    expect(migrationSql).toContain("to service_role");
  });

  it("broadcasts vocabulary row changes to private user topics", () => {
    const migrationSql = readAllMigrationSql();

    expect(migrationSql).toContain(
      'create policy "Users can receive their vocabulary broadcasts"',
    );
    expect(migrationSql).toContain(
      "and (select realtime.topic()) =\n      'vocabulary:' || ((select auth.uid())::text)",
    );
    expect(migrationSql).toContain(
      "create or replace function public.broadcast_vocabulary_item_changes",
    );
    expect(migrationSql).toContain("realtime.broadcast_changes");
    expect(migrationSql).toContain(
      "create trigger handle_vocabulary_item_realtime_changes",
    );
  });
});

function readMigrations(): Migration[] {
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => ({
      file,
      sql: readFileSync(join(migrationsDir, file), "utf8"),
    }));
}

function readAllMigrationSql(): string {
  return readMigrations()
    .map((migration) => migration.sql)
    .join("\n");
}

function readLatestMigrationDefining(marker: string): Migration {
  const migrations = readMigrations();

  for (let index = migrations.length - 1; index >= 0; index -= 1) {
    const migration = migrations[index];

    if (migration?.sql.includes(marker)) {
      return migration;
    }
  }

  throw new Error(`No Supabase migration contains: ${marker}`);
}

function readEffectiveMigrationTail(definitionMarker: string): string {
  const migrations = readMigrations();
  const latestDefinition = readLatestMigrationDefining(definitionMarker);
  const definitionIndex = migrations.findIndex(
    (migration) => migration.file === latestDefinition.file,
  );

  return migrations
    .slice(definitionIndex)
    .map((migration) => migration.sql)
    .join("\n");
}
