import { describe, expect, it } from "vitest";
import {
  agentsSource,
  ciWorkflowSource,
  dependabotConfigSource,
  issueTemplateConfigSource,
  issueWorkflowSource,
  notionTicketReviewDispatchWorkflowSource,
  notionTicketSchemaSource,
  notionTicketSkillSource,
  notionTicketSyncWorkflowSource,
  prTemplateSource,
  prWorkflowSource,
  prettierIgnoreSource,
  rootPackageJson,
  slackFailureActionSource,
  slackPrNotificationWorkflowSource,
  workflowReadmeSource,
  workflowJobSource,
} from "./test-helpers.mjs";

describe("Notion workflow repository contracts", () => {
  it("keeps Notion secrets out of PR-controlled CI code", () => {
    const reviewDispatchJob = workflowJobSource(
      notionTicketReviewDispatchWorkflowSource,
      "review-dispatch",
    );
    const prEventJob = workflowJobSource(
      notionTicketSyncWorkflowSource,
      "pr-event",
      "review-result",
    );
    const reviewResultJob = workflowJobSource(
      notionTicketSyncWorkflowSource,
      "review-result",
      "ci-result",
    );
    const ciResultJob = workflowJobSource(
      notionTicketSyncWorkflowSource,
      "ci-result",
    );

    expect(ciWorkflowSource).toContain(
      "types: [opened, synchronize, reopened, ready_for_review]",
    );
    expect(ciWorkflowSource).not.toContain(
      "types: [opened, synchronize, reopened, edited, ready_for_review]",
    );
    expect(ciWorkflowSource).not.toContain("NOTION_TOKEN");
    expect(ciWorkflowSource).not.toContain("NOTION_TICKETS_DATA_SOURCE_ID");
    expect(ciWorkflowSource).not.toContain("notion-ticket-sync:");
    expect(notionTicketSyncWorkflowSource).toContain("pull_request_target:");
    expect(notionTicketSyncWorkflowSource).toContain("branches: [main]");
    expect(notionTicketSyncWorkflowSource).toContain("workflow_run:");
    expect(notionTicketSyncWorkflowSource).toContain(
      "workflows: [CI, Notion Ticket Review Dispatch]",
    );
    expect(notionTicketSyncWorkflowSource).not.toContain("workflow_dispatch:");
    expect(notionTicketSyncWorkflowSource).not.toContain(
      "pull_request_review:",
    );
    expect(notionTicketSyncWorkflowSource).not.toContain("sync_event:");
    expect(notionTicketSyncWorkflowSource).not.toContain("review_action:");
    expect(notionTicketSyncWorkflowSource).not.toContain("review_state:");
    expect(notionTicketReviewDispatchWorkflowSource).toContain(
      "pull_request_review:",
    );
    expect(notionTicketReviewDispatchWorkflowSource).not.toContain(
      "NOTION_TOKEN",
    );
    expect(notionTicketReviewDispatchWorkflowSource).not.toContain(
      "NOTION_TICKETS_DATA_SOURCE_ID",
    );
    expect(notionTicketReviewDispatchWorkflowSource).not.toContain(
      "actions: write",
    );
    expect(notionTicketReviewDispatchWorkflowSource).toContain(
      "permissions: {}",
    );
    expect(notionTicketSyncWorkflowSource).not.toContain(
      "ref: ${{ github.event.pull_request.base.sha }}",
    );
    expect(prEventJob).toContain("Checkout trusted default branch code");
    expect(prEventJob).toContain("group: notion-ticket-pr-events");
    expect(prEventJob).toContain("cancel-in-progress: false");
    expect(prEventJob).toContain("queue: max");
    expect(prEventJob).toContain(
      "ref: ${{ github.event.repository.default_branch }}",
    );
    expect(notionTicketSyncWorkflowSource).toContain(
      "Checkout trusted default branch code",
    );
    expect(reviewResultJob).toContain("Checkout trusted default branch code");
    expect(reviewResultJob).toContain(
      "github.event.workflow_run.event == 'pull_request_review'",
    );
    expect(notionTicketReviewDispatchWorkflowSource).not.toContain(
      "gh workflow run notion-ticket-sync.yml",
    );
    expect(notionTicketReviewDispatchWorkflowSource).not.toContain(
      "gh workflow view notion-ticket-sync.yml",
    );
    expect(notionTicketSyncWorkflowSource).not.toContain(
      "gh workflow run notion-ticket-sync.yml",
    );
    expect(notionTicketSyncWorkflowSource).toContain(
      "Skip unavailable trusted sync script",
    );
    expect(notionTicketSyncWorkflowSource).toContain(
      "github.event_name == 'pull_request_target'",
    );
    expect(notionTicketSyncWorkflowSource).not.toContain(
      "github.event_name == 'pull_request_target' ||",
    );
    expect(reviewDispatchJob).toContain(
      "github.event.pull_request.head.repo.full_name == github.repository",
    );
    expect(reviewDispatchJob).toContain(
      "github.event.pull_request.base.ref == github.event.repository.default_branch",
    );
    expect(reviewDispatchJob).not.toContain("NOTION_TOKEN");
    expect(reviewDispatchJob).not.toContain("NOTION_TICKETS_DATA_SOURCE_ID");
    expect(reviewDispatchJob).not.toContain(
      "node scripts/notion-ticket-sync.mjs",
    );
    expect(reviewResultJob).toContain("NOTION_TOKEN");
    expect(reviewResultJob).toContain("node scripts/notion-ticket-sync.mjs");
    expect(ciResultJob).toContain("actions: read");
  });

  it("keeps repository workflow hardening and release gates configured", () => {
    const verificationJob = workflowJobSource(
      ciWorkflowSource,
      "verification",
      "verify",
    );
    const verifyGateJob = workflowJobSource(
      ciWorkflowSource,
      "verify",
      "database",
    );
    const e2eJob = workflowJobSource(ciWorkflowSource, "e2e");

    expect(ciWorkflowSource).toContain("concurrency:");
    expect(ciWorkflowSource).toContain("cancel-in-progress: true");
    expect(ciWorkflowSource).not.toContain("pull-requests: read");
    expect(verificationJob).toContain("fail-fast: false");
    expect(verificationJob).toContain("target: quality");
    expect(verificationJob).toContain("target: mobile");
    expect(verificationJob).toContain("target: desktop");
    expect(verificationJob).toContain("pnpm --filter '@nado/mobile^...' build");
    expect(verifyGateJob).toContain("name: Lint, typecheck, test, build");
    expect(verifyGateJob).toContain("needs: [verification]");
    expect(verifyGateJob).toContain("if: ${{ always() }}");
    expect(verifyGateJob).toContain(
      "VERIFICATION_RESULT: ${{ needs.verification.result }}",
    );
    expect(e2eJob).not.toContain("needs:");
    expect(ciWorkflowSource).toContain(
      "expo prebuild --no-install --platform ios",
    );
    expect(ciWorkflowSource).toContain(
      "git diff --exit-code -- apps/mobile/package.json apps/mobile/ios",
    );
    expect(ciWorkflowSource).toContain(
      "pnpm --filter @nado/mobile verify:ios-pods",
    );
    expect(ciWorkflowSource).toContain("expo export --platform all");
    expect(ciWorkflowSource).toContain("tauri:build --no-bundle --ci");
    expect(ciWorkflowSource).toContain("pnpm test:db:upgrade");
    expect(ciWorkflowSource).toContain("pnpm supabase:advisors");
    expect(rootPackageJson.scripts["test:db:upgrade"]).toBe(
      "node scripts/verify-supabase-upgrade.mjs",
    );
    expect(rootPackageJson.scripts["supabase:advisors"]).toBe(
      "supabase db advisors --local --type all --level warn --fail-on warn",
    );
    expect(rootPackageJson.scripts["test:db"]).toBe(
      "supabase test db supabase/tests/database_contracts.test.sql --local",
    );
    expect(prettierIgnoreSource).not.toContain(".agents/skills/\n");
    expect(prettierIgnoreSource).toContain(".agents/skills/supabase/\n");
    expect(prettierIgnoreSource).toContain(
      ".agents/skills/supabase-postgres-best-practices/\n",
    );
    expect(prettierIgnoreSource).not.toContain("docs/superpowers/\n");

    for (const workflowSource of [
      ciWorkflowSource,
      notionTicketSyncWorkflowSource,
    ]) {
      const actionReferences = Array.from(
        workflowSource.matchAll(/uses:\s+actions\/[^@\s]+@([^\s#]+)/g),
      );

      expect(actionReferences.length).toBeGreaterThan(0);

      for (const [, actionReference] of actionReferences) {
        expect(actionReference).toMatch(/^[0-9a-f]{40}$/);
      }
    }

    expect(dependabotConfigSource).toContain(
      "package-ecosystem: github-actions",
    );
    expect(dependabotConfigSource).toContain("package-ecosystem: npm");
    expect(dependabotConfigSource).toContain("package-ecosystem: cargo");
    expect(issueTemplateConfigSource).toContain("blank_issues_enabled: false");
  });

  it("refreshes the Desktop Rust target cache when build inputs change", () => {
    const verificationJob = workflowJobSource(
      ciWorkflowSource,
      "verification",
      "verify",
    );

    expect(verificationJob).toContain(
      "- name: Resolve Desktop Rust cache context",
    );
    expect(verificationJob).toContain("rustc --version --verbose");
    expect(verificationJob).toContain("git ls-files -s --");
    expect(verificationJob).toContain("- name: Cache Cargo dependencies");
    expect(verificationJob).toContain(`path: |
            ~/.cargo/git
            ~/.cargo/registry`);
    expect(verificationJob).toContain("- name: Cache Desktop Rust target");
    expect(verificationJob).toContain("path: apps/desktop/src-tauri/target");
    expect(verificationJob).toContain(
      "steps.rust-cache-context.outputs.toolchain",
    );
    expect(verificationJob).toContain(
      "steps.rust-cache-context.outputs.cargo_lock",
    );
    expect(verificationJob).toContain(
      "steps.rust-cache-context.outputs.desktop_inputs",
    );
    expect(verificationJob).toContain(
      "${{ runner.os }}-${{ runner.arch }}-desktop-target-v1-",
    );
    expect(verificationJob).toContain(
      "- name: Report Desktop Rust cache outcomes",
    );
    expect(verificationJob).not.toContain("- name: Cache Rust dependencies");
  });

  it("keeps scheduled Dependabot version updates disabled", () => {
    const ecosystemConfigs = dependabotConfigSource
      .split("\n  - package-ecosystem: ")
      .slice(1);

    for (const ecosystem of ["github-actions", "npm", "cargo"]) {
      const ecosystemConfig = ecosystemConfigs.find((config) =>
        config.startsWith(ecosystem),
      );

      expect(ecosystemConfig).toContain("open-pull-requests-limit: 0");
    }

    expect(dependabotConfigSource).not.toContain("groups:");
    expect(dependabotConfigSource).not.toContain("allow:");
    expect(dependabotConfigSource).not.toContain("ignore:");
    expect(workflowReadmeSource).toContain(
      "Dependabot Alerts와 security update는 유지",
    );
    expect(workflowReadmeSource).toContain("월 1회 대표 유지보수 티켓");
  });

  it("escapes Slack mrkdwn metadata and uses actual newline escapes", () => {
    expect(slackFailureActionSource).toContain("import html");
    expect(slackFailureActionSource).toContain(
      "html.escape(value, quote=False)",
    );
    expect(slackPrNotificationWorkflowSource).toContain("import html");
    expect(slackPrNotificationWorkflowSource).toContain("permissions: {}");
    expect(slackPrNotificationWorkflowSource).toContain(
      '"text": f"*Author:*\\n{author}",',
    );
    expect(slackPrNotificationWorkflowSource).not.toContain(
      '"text": f"*Author:*\\\\n',
    );
  });

  it("documents typed ticket creation and push metadata rules", () => {
    for (const workType of [
      "기능",
      "수정",
      "문서",
      "테스트",
      "리팩터",
      "설정",
      "보안",
      "운영",
    ]) {
      expect(notionTicketSchemaSource).toContain(workType);
      expect(notionTicketSkillSource).toContain(workType);
    }

    for (const requiredSection of [
      "배경",
      "작업 범위",
      "완료 조건",
      "제외 범위",
      "검증 계획",
    ]) {
      expect(notionTicketSkillSource).toContain(requiredSection);
    }

    expect(notionTicketSchemaSource).toContain("Last Push At");
    expect(notionTicketSchemaSource).toContain("Last Head SHA");
    expect(notionTicketSchemaSource).toContain("Last Push Summary");
    expect(notionTicketSchemaSource).toContain("pull_request_review");
    expect(notionTicketSchemaSource).toContain("fork PR");
    expect(notionTicketSchemaSource).toContain(
      "`head.repo`가 없거나 `null`인 PR",
    );
    expect(notionTicketSchemaSource).toContain("2025-09-03");
    expect(notionTicketSchemaSource).toContain("활성 change request");
    expect(notionTicketSchemaSource).toContain("per_page=100");
    expect(notionTicketSchemaSource).toContain("COMMENTED");
    expect(notionTicketSchemaSource).toContain(
      "더 오래된 `pull_request synchronize` job",
    );
    expect(notionTicketSchemaSource).toContain(
      "`pull_request_target` 이벤트는 Notion 업데이트 전에 현재 PR 상태를 다시 조회한다",
    );
    expect(notionTicketSchemaSource).toContain(
      "`PR closed without merge` blocker를 쓰지 않는다",
    );
    expect(notionTicketSchemaSource).not.toContain("workflow_dispatch");
    expect(notionTicketSchemaSource).toContain("read-only signal job");
    expect(notionTicketSchemaSource).toContain(
      "`actions: write` 권한을 받지 않고",
    );
    expect(notionTicketSchemaSource).toContain(
      "workflow_run`으로 이 signal workflow의 완료",
    );
    expect(notionTicketSchemaSource).toContain(
      "`Review Status`를 `Pending`으로 되돌리지 않는다",
    );
    expect(notionTicketSchemaSource).toContain(
      "`CI Status`를 `Pending`으로 되돌리지 않는다",
    );
    expect(notionTicketSchemaSource).toContain("workflow_run.pull_requests");
    expect(notionTicketSchemaSource).toContain("workflow_run.head_repository");
    expect(notionTicketSchemaSource).toContain("dismissed-only");
    expect(notionTicketSchemaSource).toContain("최신 run/attempt");
    expect(notionTicketSchemaSource).toContain(
      "`GitHub PR` URL로 data source를 역조회",
    );
    expect(notionTicketSchemaSource).toContain("`next_cursor`를 따라가며");
    expect(notionTicketSchemaSource).toContain(
      "전역 concurrency group과 `queue: max`로 직렬화",
    );
    expect(notionTicketSchemaSource).toContain("PR base가 default branch인");
    expect(notionTicketSchemaSource).toContain(
      "CI-result sync도 fetch한 PR base가 default branch가 아니면",
    );
  });

  it("keeps the ticket binding and field ownership contract aligned across guidance", () => {
    expect(agentsSource).toContain(
      "실제 작업 시작 시 `IN-progrss`와 `시작일`까지만 기록한다",
    );
    expect(agentsSource).toContain(
      "유효한 `Ticket:` URL이 한 번 결속되면 다른 티켓으로 바꾸지 않는다",
    );

    expect(notionTicketSkillSource).toContain("Notion에 접근할 수 없을 때");
    expect(notionTicketSkillSource).toContain("tracking parent라면");
    expect(notionTicketSkillSource).toContain(
      "PR base가 저장소 default branch인지 확인한다",
    );
    expect(notionTicketSkillSource).toContain(
      "CI 성공이나 review 통과를 추측해 기록하지 않는다",
    );
    expect(notionTicketSkillSource).toContain(
      "실제 외부 중단 사유의 수동 `Blocker`",
    );

    expect(issueWorkflowSource).toContain(
      "tracking parent에는 직접 branch나 PR을 만들지 않는다",
    );
    expect(issueWorkflowSource).toContain(
      "작업 branch는 default branch를 기준으로 만들고",
    );
    expect(prWorkflowSource).toContain(
      "유효한 티켓 A를 유효한 티켓 B로 바꾸는 편집은 허용하지 않는다",
    );
    expect(prWorkflowSource).toContain(
      "URL을 비웠다가 다른 티켓을 넣는 방식으로도 기존 결속을 바꿀 수 없다",
    );

    expect(prTemplateSource).toContain(
      "최초 결속 후 다른 티켓 URL로 바꾸지 마세요",
    );
    expect(prTemplateSource).toContain("Status before PR: `IN-progrss`");
    expect(prTemplateSource).not.toContain("`TODO` / `IN-progrss`");

    expect(notionTicketSchemaSource).toContain("최초 PR 결속");
    expect(notionTicketSchemaSource).toContain(
      "유효한 티켓 A에서 유효한 티켓 B로 바꾸는 편집",
    );
    expect(notionTicketSchemaSource).toContain(
      "수동으로 작성한 `Blocker` 값은 자동화가 덮어쓰거나 지우지 않는다",
    );
    expect(notionTicketSchemaSource).toContain(
      "공백을 포함한 원문이 정확히 `PR closed without merge`",
    );
    expect(notionTicketSchemaSource).toContain(
      "CI 성공이나 review 통과를 추측하거나 기존 값을 덮어쓰지 않는다",
    );
  });
});
