import { test, expect, Page } from "@playwright/test";
import { ensureDoctorProfile, ensureSeedData } from "./fixtures";

type Seed = { patientId: string; visitId: string };
let seed: Seed;

test.beforeAll(async ({ request }) => {
  const profile = await ensureDoctorProfile(request);
  test.info().annotations.push({
    type: "doctor-profile",
    description: `status=${profile.status} created=${profile.created}`,
  });
  const s = await ensureSeedData(request);
  seed = { patientId: s.patientId, visitId: s.visitId };
  test.info().annotations.push({
    type: "seed",
    description: `patient=${s.patientId} (new=${s.patientCreated}) visit=${s.visitId} (new=${s.visitCreated})`,
  });
});

async function openNewVisitEditor(page: Page) {
  await page.goto(`/patients/${seed.patientId}/visits/new`);
  await page.waitForLoadState("domcontentloaded");
  // Wait for the editor's search input to mount.
  await expect(page.getByTestId("pe-search-input")).toBeVisible();
}

async function pickParacetamolRow(page: Page) {
  const input = page.getByTestId("pe-search-input");
  await input.fill("paracetamol");
  // Wait for at least one real result card (not the "add new" link).
  const realItem = page.locator(
    ".pe-cmdk-item:not(.pe-cmdk-item-add-new)",
  );
  await expect(realItem.first()).toBeVisible({ timeout: 10_000 });
  await realItem.first().click();
  // Row should appear.
  await expect(page.locator(".pe-med-row").first()).toBeVisible();
}

test("1. Medicine search auto-focuses on editor mount", async ({ page }) => {
  await openNewVisitEditor(page);
  const focusedTestId = await page.evaluate(
    () =>
      (document.activeElement as HTMLElement | null)?.getAttribute(
        "data-testid",
      ) ?? null,
  );
  expect(focusedTestId).toBe("pe-search-input");
});

test("2. `/` key re-focuses search when focus is on body", async ({ page }) => {
  await openNewVisitEditor(page);
  // Blur the input by focusing the body.
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.evaluate(() => (document.body as HTMLElement).focus?.());
  // Dispatch the `/` key from body.
  await page.keyboard.press("/");
  const focusedTestId = await page.evaluate(
    () =>
      (document.activeElement as HTMLElement | null)?.getAttribute(
        "data-testid",
      ) ?? null,
  );
  expect(focusedTestId).toBe("pe-search-input");
});

test("3. Selecting a medicine inserts a row with dosing: null + aria-invalid", async ({
  page,
}) => {
  await openNewVisitEditor(page);
  await pickParacetamolRow(page);

  const row = page.locator(".pe-med-row").first();
  await expect(row).toHaveAttribute("aria-invalid", "true");

  // No dosing pill should be active.
  const activeDosing = row.locator('.pe-dosing-pill[data-active="true"]');
  await expect(activeDosing).toHaveCount(0);

  // "Pick frequency" sentinel is shown.
  await expect(row.locator(".pe-sched-required")).toContainText(
    /pick frequency/i,
  );
});

test("4. Class-aware default duration: paracetamol (nsaid) → 3 days", async ({
  page,
}) => {
  await openNewVisitEditor(page);
  await pickParacetamolRow(page);

  const daysInput = page
    .locator(".pe-med-row")
    .first()
    .locator('.pe-med-input input[type="number"]')
    .first();
  await expect(daysInput).toHaveValue("3");
});

test("5. Picking BID updates timesPerDay to 2", async ({ page }) => {
  await openNewVisitEditor(page);
  await pickParacetamolRow(page);

  const row = page.locator(".pe-med-row").first();
  // Click BID.
  await row
    .locator('.pe-dosing-pill', { hasText: /^BID$/ })
    .first()
    .click();

  // The BID pill is now active.
  await expect(
    row.locator('.pe-dosing-pill[data-active="true"]', {
      hasText: /^BID$/,
    }),
  ).toHaveCount(1);

  // Row is no longer aria-invalid.
  await expect(row).not.toHaveAttribute("aria-invalid", "true");

  // Summary shows ×2/day (first summary is the frequency section).
  await expect(row.locator(".pe-sched-summary").first()).toContainText(
    "×2/day",
  );
});

test("6. Save button is disabled until dosing is picked on every row", async ({
  page,
}) => {
  await openNewVisitEditor(page);

  const saveBtn = page.getByTestId("save-prescription");
  // With 0 items, disabled.
  await expect(saveBtn).toBeDisabled();

  await pickParacetamolRow(page);
  // Still disabled — dosing is null.
  await expect(saveBtn).toBeDisabled();
  await expect(page.getByTestId("save-hint")).toContainText(/Pick frequency/i);

  // Pick BID.
  const row = page.locator(".pe-med-row").first();
  await row
    .locator('.pe-dosing-pill', { hasText: /^BID$/ })
    .first()
    .click();

  // Now enabled.
  await expect(saveBtn).toBeEnabled();
});

test("7. Delete with undo: removed banner appears, Undo restores the row", async ({
  page,
}) => {
  await openNewVisitEditor(page);
  await pickParacetamolRow(page);

  const row = page.locator(".pe-med-row").first();
  const brand = await row.locator(".pe-med-brand").innerText();

  // Click the Remove button.
  await row
    .getByRole("button", { name: new RegExp(`remove\\s+${brand}`, "i") })
    .click();

  // Row is gone, banner is visible.
  await expect(page.locator(".pe-med-row")).toHaveCount(0);
  const banner = page.locator(".pe-removed-banner");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(/Removed/i);
  await expect(banner.locator(".pe-removed-brand")).toHaveText(brand);

  // Click Undo.
  await banner.getByRole("button", { name: /undo/i }).click();

  // Row restored, banner gone.
  await expect(page.locator(".pe-med-row")).toHaveCount(1);
  await expect(page.locator(".pe-removed-banner")).toHaveCount(0);
  await expect(
    page.locator(".pe-med-row .pe-med-brand").first(),
  ).toHaveText(brand);
});

test('8. Inline "+ Add new" expands a panel, not a modal', async ({ page }) => {
  await openNewVisitEditor(page);

  const input = page.getByTestId("pe-search-input");
  await input.fill("xyz-novel-med-12345");

  // Wait for "no matches" state to render the add-new row.
  const addNew = page.getByTestId("pe-add-new-link");
  await expect(addNew).toBeVisible();
  await addNew.click();

  // The inline panel should be visible.
  const panel = page.getByTestId("pe-inline-add-panel");
  await expect(panel).toBeVisible();

  // No modal dialog / backdrop present.
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  await expect(page.locator(".pe-modal-backdrop")).toHaveCount(0);
});

test("9. Regression: legacy visit displays correctly (describeDosing fired)", async ({
  page,
}) => {
  await page.goto(`/patients/${seed.patientId}/visits/${seed.visitId}`);
  await page.waitForLoadState("domcontentloaded");

  const body = await page.evaluate(() => document.body.innerText || "");
  // Legacy seed visit has frequency: ["after_breakfast"] → describeDosing →
  // "OD · After food". Either OD or "After food" must be present.
  expect(body).toMatch(/\bOD\b|After food/);
});
