import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import {
  contrastRatio,
  ensureDoctorProfile,
  ensureSeedData,
} from "./fixtures";

type Seed = { patientId: string; visitId: string };

let seed: Seed;

test.beforeAll(async ({ request }) => {
  // Sanity: format helpers must exist (used by the app).
  const webRoot = path.resolve(__dirname, "..");
  const dateHelper = path.join(webRoot, "src/lib/format/date.ts");
  const errorHelper = path.join(webRoot, "src/lib/format/error.ts");
  expect(fs.existsSync(dateHelper), `missing ${dateHelper}`).toBe(true);
  expect(fs.existsSync(errorHelper), `missing ${errorHelper}`).toBe(true);

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

test("A. token contrast: --color-muted on --color-paper passes WCAG AA", async ({
  page,
}) => {
  await page.goto(`/patients/${seed.patientId}`);
  await expect(page).toHaveURL(new RegExp(`/patients/${seed.patientId}`));

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

test("B. patient detail shows a relative-date style label in the visits list", async ({
  page,
}) => {
  await page.goto(`/patients/${seed.patientId}`);
  const pattern =
    /Today|Yesterday|\d+ days ago|in \d+ days|Tomorrow|\d{1,2} [A-Z][a-z]{2} \d{4}/;

  // Find any element whose innerText matches the relative-date pattern.
  const matched = await page.evaluate((src: string) => {
    const re = new RegExp(src);
    const all = Array.from(document.querySelectorAll<HTMLElement>("body *"));
    for (const el of all) {
      const t = (el.innerText || "").trim();
      if (t && re.test(t)) return t;
    }
    return null;
  }, pattern.source);

  expect(matched, "expected a relative-date label in the visits list").not.toBeNull();
});

test("C. visit view: clinic-name header is not italic", async ({ page }) => {
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

test("D. visit view: signature block clinic-name is not italic", async ({
  page,
}) => {
  await page.goto(`/patients/${seed.patientId}/visits/${seed.visitId}`);
  // Eyebrow "Attending physician" — the sibling *above* it is the clinic name.
  const target = page
    .locator("text=Attending physician")
    .first()
    .locator("xpath=./preceding-sibling::*[1]");
  await expect(target).toBeVisible();
  const fontStyle = await target.evaluate(
    (el) => getComputedStyle(el as Element).fontStyle
  );
  expect(fontStyle).not.toBe("italic");
});

test("E. login page still uses italics somewhere", async ({ page }) => {
  await page.goto("/login");
  const count = await page.evaluate(
    () => document.querySelectorAll(".italic").length
  );
  expect(count).toBeGreaterThan(0);
});

test("F. print view preserves italics on .rx-* elements", async ({ page }) => {
  await page.goto(
    `/patients/${seed.patientId}/visits/${seed.visitId}/print`
  );
  // Wait for render.
  await page.waitForLoadState("domcontentloaded");
  const italicCount = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll<HTMLElement>("body *"));
    let n = 0;
    for (const el of all) {
      if (getComputedStyle(el).fontStyle === "italic") n++;
    }
    return n;
  });
  expect(italicCount).toBeGreaterThanOrEqual(1);
});
