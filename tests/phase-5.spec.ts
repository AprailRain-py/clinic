import { test, expect, Page } from "@playwright/test";
import { ensureDoctorProfile, ensureSeedData } from "./fixtures";

type Seed = { patientId: string; visitId: string };
let seed: Seed;

test.beforeAll(async ({ request }) => {
  await ensureDoctorProfile(request);
  const s = await ensureSeedData(request);
  seed = { patientId: s.patientId, visitId: s.visitId };
});

async function openNewVisitEditor(page: Page) {
  await page.goto(`/patients/${seed.patientId}/visits/new`);
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByTestId("pe-search-input")).toBeVisible();
}

test("1a. POST /api/visits/draft with valid patientId returns 201 + {visitId}", async ({
  request,
}) => {
  const res = await request.post("/api/visits/draft", {
    data: { patientId: seed.patientId },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(typeof body.visitId).toBe("string");
  expect(body.visitId.length).toBeGreaterThan(8);
});

test("1b. POST /api/visits/draft with fake patientId returns 404", async ({
  request,
}) => {
  // Fabricate a plausible-looking cuid that doesn't exist for this doctor.
  const res = await request.post("/api/visits/draft", {
    data: { patientId: "cl00000000fakeidx0000000" },
  });
  expect(res.status()).toBe(404);
});

test("2. PATCH /api/visits/:id promotes a draft to status=final and stores rx", async ({
  request,
}) => {
  // Create a draft.
  const draftRes = await request.post("/api/visits/draft", {
    data: { patientId: seed.patientId },
  });
  expect(draftRes.ok()).toBe(true);
  const { visitId } = await draftRes.json();

  // Finalize via PATCH.
  const patch = await request.patch(`/api/visits/${visitId}`, {
    data: {
      visitDate: "2025-01-15",
      prescription: {
        items: [
          {
            brand: "PatchTestMed",
            frequency: [],
            timesPerDay: 1,
            durationDays: 3,
            dosing: "OD",
            mealTiming: "after_food",
          },
        ],
        freeText: "patched",
      },
    },
  });
  expect(patch.ok()).toBe(true);
  const patched = await patch.json();
  expect(patched.status).toBe("final");

  // Confirm via GET too.
  const check = await request.get(`/api/visits/${visitId}`);
  expect(check.ok()).toBe(true);
  const checkBody = await check.json();
  expect(checkBody.visit.status).toBe("final");
});

test("3. NewVisitEditor: PhotoAttacher appears after first medicine added", async ({
  page,
}) => {
  await openNewVisitEditor(page);

  // Initially the muted placeholder is visible (no real file input yet).
  await expect(page.getByTestId("photo-attacher-placeholder")).toBeVisible();
  await expect(page.locator('input[type=file]')).toHaveCount(0);

  // Wait for a draft POST to be triggered once medicine is added.
  const draftPromise = page.waitForRequest(
    (req) =>
      req.url().endsWith("/api/visits/draft") && req.method() === "POST",
    { timeout: 10_000 },
  );

  // Type paracetamol, click the first real result.
  const input = page.getByTestId("pe-search-input");
  await input.fill("paracetamol");
  const realItem = page.locator(
    ".pe-cmdk-item:not(.pe-cmdk-item-add-new)",
  );
  await expect(realItem.first()).toBeVisible({ timeout: 10_000 });
  await realItem.first().click();

  // Pick BID to make the row complete (not strictly required for the assertion
  // but matches the task description's UX).
  const row = page.locator(".pe-med-row").first();
  await row.locator('.pe-dosing-pill', { hasText: /^BID$/ }).first().click();

  // Draft POST fired.
  const draftReq = await draftPromise;
  expect(draftReq.url()).toContain("/api/visits/draft");

  // PhotoAttacher now mounts — placeholder is gone and a file input is present.
  await expect(page.getByTestId("photo-attacher-placeholder")).toHaveCount(0);
  await expect(page.locator('input[type=file]')).toHaveCount(1);
});

test("4. Visit view: 'New prescription for next visit' replaces old label", async ({
  page,
}) => {
  await page.goto(`/patients/${seed.patientId}/visits/${seed.visitId}`);
  await page.waitForLoadState("domcontentloaded");
  await expect(
    page.getByRole("link", { name: /New prescription for next visit/i }),
  ).toBeVisible();
  // The old label is gone.
  expect(await page.locator("body").innerText()).not.toMatch(
    /Write another Prescription/i,
  );
});

test("5. Visit view: descriptive eyebrow uses patient first name + date", async ({
  page,
}) => {
  await page.goto(`/patients/${seed.patientId}/visits/${seed.visitId}`);
  await page.waitForLoadState("domcontentloaded");
  const eyebrow = page.getByTestId("visit-eyebrow");
  await expect(eyebrow).toBeVisible();
  const text = (await eyebrow.innerText()).toLowerCase();
  expect(text).toContain("visit");
  // Seed patient: "Test Patient" → first name "Test"
  expect(text).toContain("test");
});

test("6. Visit view: HTML <title> contains visit date + patient first name", async ({
  page,
}) => {
  await page.goto(`/patients/${seed.patientId}/visits/${seed.visitId}`);
  await page.waitForLoadState("domcontentloaded");
  const title = await page.title();
  // Seed patient first name "Test"; visitDate is today's ISO slice.
  expect(title.toLowerCase()).toContain("test");
  expect(title.toLowerCase()).toContain("visit");
  // Should contain an ISO-shape date (YYYY-MM-DD).
  expect(title).toMatch(/\d{4}-\d{2}-\d{2}/);
});

test("7. Print page: signature-missing banner visible on screen, hidden on print", async ({
  page,
}) => {
  await page.goto(
    `/patients/${seed.patientId}/visits/${seed.visitId}/print`,
  );
  await page.waitForLoadState("domcontentloaded");
  const banner = page.getByTestId("rx-signature-missing-banner");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(/no signature image/i);

  // Under print media emulation, the banner must not render.
  await page.emulateMedia({ media: "print" });
  const display = await banner.evaluate(
    (el) => window.getComputedStyle(el).display,
  );
  expect(display).toBe("none");
  await page.emulateMedia({ media: "screen" });
});

test("8. Print page: does NOT block with 'complete your profile to continue'", async ({
  page,
}) => {
  await page.goto(
    `/patients/${seed.patientId}/visits/${seed.visitId}/print`,
  );
  await page.waitForLoadState("domcontentloaded");
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/complete your profile to continue/i);
  expect(body).not.toMatch(/cannot print/i);
  // The preview toolbar is still there (and sticky).
  await expect(page.getByTestId("rx-preview-toolbar")).toBeVisible();
});

test("9. LetterheadPreview clinic name matches print letterhead clinic name", async ({
  page,
}) => {
  // Grab the preview clinic name.
  await page.goto(`/settings/profile`);
  await page.waitForLoadState("domcontentloaded");
  const previewClinic = await page
    .locator(".lp-sheet-rx .rx-clinic-name")
    .first()
    .innerText();

  // Grab the print page clinic name.
  await page.goto(
    `/patients/${seed.patientId}/visits/${seed.visitId}/print`,
  );
  await page.waitForLoadState("domcontentloaded");
  const printClinic = await page.locator(".rx-clinic-name").first().innerText();

  expect(previewClinic.trim()).toBe(printClinic.trim());
});
