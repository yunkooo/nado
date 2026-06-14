import { expect, test } from "@playwright/test";

const apiBaseUrl = process.env.NADO_E2E_API_BASE_URL ?? "http://127.0.0.1:4000";

test.describe("nado smoke", () => {
  test("serves the API health endpoint", async ({ request }) => {
    const response = await request.get(`${apiBaseUrl}/health`);

    expect(response.ok()).toBe(true);
    await expect(response.json()).resolves.toEqual({
      service: "nado-api",
      status: "ok",
    });
  });

  test("renders the web analysis input and validates the 200 character limit", async ({
    page,
  }) => {
    await page.goto("/");

    const input = page.getByPlaceholder(
      "영어 문장이나 짧은 문단을 붙여넣으세요",
    );
    const submitButton = page.getByRole("button", { name: "분석 요청" });

    await expect(input).toBeVisible();
    await expect(page.getByText("0 / 200")).toBeVisible();
    await expect(submitButton).toBeDisabled();

    await input.fill("I leave home.");
    await expect(page.getByText("13 / 200")).toBeVisible();
    await expect(submitButton).toBeEnabled();

    await input.fill("a".repeat(201));
    await expect(page.getByText("201 / 200")).toBeVisible();
    await expect(submitButton).toBeDisabled();
  });
});
