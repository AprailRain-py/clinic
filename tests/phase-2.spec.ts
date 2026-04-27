import { test, expect } from "@playwright/test";
import {
  contrastRatio,
  ensureDoctorProfile,
  ensureSeedData,
} from "./fixtures";

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

test("1. Greeting removed from dashboard", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  const bodyText = await page.evaluate(
    () => (document.body.innerText || "").toLowerCase()
  );
  expect(bodyText).not.toContain("good morning");
  expect(bodyText).not.toContain("good afternoon");
  expect(bodyText).not.toContain("good evening");
});

test("2. Stat cards removed from dashboard", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  // No "Visits / wk" anywhere
  const visitsPerWk = await page
    .getByText(/Visits\s*\/\s*wk/)
    .count();
  expect(visitsPerWk).toBe(0);
  // No "Active cond." stat label
  const activeCond = await page.getByText("Active cond.", { exact: true }).count();
  expect(activeCond).toBe(0);
  // No "under care" phrase from the old StatCard pattern
  const underCare = await page.getByText(/under care/i).count();
  expect(underCare).toBe(0);
});

test("3. Sidebar cards (Condition register, Recent visits) removed", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  const bodyText = await page.evaluate(() => document.body.innerText || "");
  expect(bodyText).not.toContain("Condition register");
  expect(bodyText).not.toContain("Recent visits");
});

test("4. Search input auto-focused on page load", async ({ browser }) => {
  // Fresh context to guarantee new mount.
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const input = page.locator('input[type=search][aria-label="Search patients"]');
    await expect(input).toBeVisible();
    // Give React a tick for useEffect focus.
    await page.waitForTimeout(150);
    const isFocused = await input.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBe(true);
  } finally {
    await context.close();
  }
});

test("5. / keyboard shortcut focuses search input", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  const input = page.locator('input[type=search][aria-label="Search patients"]');
  await expect(input).toBeVisible();

  // Blur the input by focusing the body.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    document.body.focus();
  });
  // Click on a safe non-input area to confirm blur.
  await page.locator("h1").first().click();
  const blurred = await input.evaluate((el) => el !== document.activeElement);
  expect(blurred).toBe(true);

  // Press '/'.
  await page.keyboard.press("/");
  await page.waitForTimeout(100);

  const isFocused = await input.evaluate((el) => el === document.activeElement);
  expect(isFocused).toBe(true);

  const value = await input.inputValue();
  expect(value).toBe("");
});

test("6. New patient CTA is present and points at /patients/new", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  const cta = page.locator('a[href="/patients/new"]').first();
  await expect(cta).toBeVisible();
  await expect(cta).toHaveText(/New patient/i);
  // Verify the destination actually responds (catches broken routing without
  // depending on Next.js dev-mode Link hydration timing).
  const res = await page.request.get("/patients/new");
  expect(res.status()).toBe(200);
});

test("7a. Regression: --color-muted token still #615a52", async ({ page }) => {
  await page.goto(`/patients/${seed.patientId}`);
  const tokens = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      muted: s.getPropertyValue("--color-muted").trim(),
      paper: s.getPropertyValue("--color-paper").trim(),
    };
  });
  expect(tokens.muted).toBe("#615a52");
  const ratio = contrastRatio(tokens.muted, tokens.paper);
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});

test("7b. Regression: visit view clinic-name header is not italic", async ({
  page,
}) => {
  await page.goto(`/patients/${seed.patientId}/visits/${seed.visitId}`);
  const target = page
    .locator("text=Prescription")
    .first()
    .locator("xpath=./following-sibling::*[1]");
  await expect(target).toBeVisible();
  const fontStyle = await target.evaluate(
    (el) => getComputedStyle(el as Element).fontStyle
  );
  expect(fontStyle).not.toBe("italic");
});
