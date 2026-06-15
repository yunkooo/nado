import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../supabase/migrations",
);

describe("Supabase migrations", () => {
  it("creates the analysis usage table before altering its access rules", () => {
    const migrations = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort()
      .map((file) => ({
        file,
        sql: readFileSync(join(migrationsDir, file), "utf8"),
      }));

    const createTableIndex = migrations.findIndex((migration) =>
      migration.sql.includes("create table public.analysis_usage_limits"),
    );
    const accessRulesIndex = migrations.findIndex((migration) =>
      migration.sql.includes("analysis_usage_limits_single_identity"),
    );

    expect(createTableIndex).toBeGreaterThanOrEqual(0);
    expect(accessRulesIndex).toBeGreaterThan(createTableIndex);
  });

  it("defines an atomic analysis usage consume function", () => {
    const migrationSql = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort()
      .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
      .join("\n");

    expect(migrationSql).toContain(
      "create or replace function public.consume_analysis_usage",
    );
    expect(migrationSql).toContain(
      "grant execute on function public.consume_analysis_usage",
    );
  });

  it("includes Supabase advisor remediations for RLS and RPC configuration", () => {
    const migrationSql = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort()
      .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
      .join("\n");

    expect(migrationSql).toContain("(select auth.uid()) = user_id");
    expect(migrationSql).toContain(
      'create policy "Service role can manage analysis usage"',
    );
    expect(migrationSql).toContain(
      "alter function public.consume_analysis_usage(uuid, text, date, integer)",
    );
    expect(migrationSql).toContain("set search_path = ''");
  });

  it("defines an atomic vocabulary save function for concurrent saves", () => {
    const migrationSql = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort()
      .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
      .join("\n");

    expect(migrationSql).toContain(
      "create or replace function public.save_vocabulary_item",
    );
    expect(migrationSql).toContain(
      "on conflict (user_id, normalized_term, type)",
    );
    expect(migrationSql).toContain(
      "grant execute on function public.save_vocabulary_item",
    );
  });

  it("uses the vocabulary uniqueness constraint as the save conflict target", () => {
    const migrationSql = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort()
      .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
      .join("\n");

    expect(migrationSql).toContain(
      "on conflict on constraint vocabulary_items_user_id_normalized_term_type_key",
    );
  });

  it("broadcasts vocabulary row changes to private user topics", () => {
    const migrationSql = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort()
      .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
      .join("\n");

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
