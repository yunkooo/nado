import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const barrelSource = readSource("./vocabularyRealtime.ts");
const controllerSource = readSource("./vocabularyRealtimeController.ts");
const policySource = readSource("./vocabularyRefreshPolicy.ts");

describe("vocabulary realtime module boundaries", () => {
  it("keeps the public realtime module as a compatible barrel", () => {
    expect(barrelSource).toContain(
      'export * from "./vocabularyRealtimeController.ts"',
    );
    expect(barrelSource).toContain(
      'export * from "./vocabularyRefreshPolicy.ts"',
    );
  });

  it("keeps connection setup and retry below the module size limit", () => {
    expect(controllerSource.split("\n").length).toBeLessThanOrEqual(350);
    expect(controllerSource).toContain("client.realtime.setAuth");
    expect(controllerSource).toContain("channel.subscribe");
    expect(controllerSource).toContain("scheduleReconnect");
    expect(controllerSource).not.toContain(
      "shouldRefreshVocabularyFromLifecycle",
    );
  });

  it("keeps refresh scheduling and lifecycle policy independent", () => {
    expect(policySource.split("\n").length).toBeLessThanOrEqual(350);
    expect(policySource).toContain("createVocabularyRealtimeRefreshScheduler");
    expect(policySource).toContain("shouldRefreshVocabularyFromLifecycle");
    expect(policySource).toContain("shouldStartVocabularyManualRefresh");
    expect(policySource).not.toContain("client.realtime.setAuth");
  });
});

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}
