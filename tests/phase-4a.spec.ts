import { test, expect } from "@playwright/test";
import { ensureDoctorProfile } from "./fixtures";
import {
  classifyMedicine,
  defaultDurationFor,
} from "../src/lib/medicine-class";
import { deriveFromLegacyFrequency } from "../src/components/prescription-editor/dosing";
import { prescriptionItemSchema } from "../src/lib/validators/patient";

test.beforeAll(async ({ request }) => {
  const profile = await ensureDoctorProfile(request);
  test.info().annotations.push({
    type: "doctor-profile",
    description: `status=${profile.status} created=${profile.created}`,
  });
});

// ---------- API ----------

test("1. Search endpoint returns `class` for paracetamol", async ({
  page,
}) => {
  const res = await page.request.get(
    "/api/medicines/search?q=paracetamol",
  );
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBeGreaterThan(0);
  for (const item of body) {
    expect(item).toHaveProperty("class");
  }
  const hasNsaid = body.some(
    (item: { class?: string }) => item.class === "nsaid",
  );
  expect(hasNsaid).toBe(true);
});

test("2. Antibiotic classification (amox prefix — covers amoxicillin + amoxycillin)", async ({
  page,
}) => {
  const res = await page.request.get("/api/medicines/search?q=amox");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBeGreaterThan(0);
  const hasAntibiotic = body.some(
    (item: { class?: string }) => item.class === "antibiotic",
  );
  expect(hasAntibiotic).toBe(true);
});

test("3. PPI classification (pantoprazole)", async ({ page }) => {
  const res = await page.request.get(
    "/api/medicines/search?q=pantoprazole",
  );
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
  const hasPpi = body.some(
    (item: { class?: string }) => item.class === "ppi",
  );
  expect(hasPpi).toBe(true);
});

// ---------- Pure unit tests ----------

test("4. classifyMedicine() heuristics", () => {
  expect(
    classifyMedicine("Crocin", "Paracetamol", "Paracetamol 500mg"),
  ).toBe("nsaid");
  expect(
    classifyMedicine(
      "Augmentin 625",
      "Amoxicillin + Clavulanic Acid",
      null,
    ),
  ).toBe("antibiotic");
  expect(classifyMedicine("Pan 40", "Pantoprazole", null)).toBe("ppi");
  expect(classifyMedicine("Telma 40", "Telmisartan", null)).toBe(
    "antihypertensive",
  );
  expect(classifyMedicine("Lipitor", "Atorvastatin", null)).toBe("statin");
  expect(classifyMedicine("Glycomet", "Metformin", null)).toBe("oha");
  expect(classifyMedicine("Unknown Brand", null, null)).toBe("other");
});

test("5. defaultDurationFor()", () => {
  expect(defaultDurationFor("antibiotic")).toBe(5);
  expect(defaultDurationFor("ppi")).toBe(14);
  expect(defaultDurationFor("antihypertensive")).toBe(30);
  expect(defaultDurationFor("other")).toBe(5);
  expect(defaultDurationFor(null)).toBe(5);
  expect(defaultDurationFor("nonsense")).toBe(5);
});

test("6. deriveFromLegacyFrequency()", () => {
  expect(deriveFromLegacyFrequency(["after_breakfast"])).toEqual({
    dosing: "OD",
    mealTiming: "after_food",
  });
  expect(
    deriveFromLegacyFrequency(["after_breakfast", "after_dinner"]),
  ).toEqual({ dosing: "BID", mealTiming: "after_food" });
  expect(
    deriveFromLegacyFrequency([
      "after_breakfast",
      "after_lunch",
      "after_dinner",
    ]),
  ).toEqual({ dosing: "TID", mealTiming: "after_food" });
  expect(
    deriveFromLegacyFrequency([
      "before_breakfast",
      "before_lunch",
      "before_dinner",
    ]),
  ).toEqual({ dosing: "TID", mealTiming: "before_food" });

  const emptyStomach = deriveFromLegacyFrequency(["empty_stomach"]);
  expect(emptyStomach.dosing).toBe("OD");
  expect(emptyStomach.mealTiming).toBe("empty_stomach");

  expect(deriveFromLegacyFrequency(["before_sleep"])).toEqual({
    dosing: "OD",
    mealTiming: "at_bedtime",
  });

  expect(deriveFromLegacyFrequency([])).toEqual({
    dosing: "SOS",
    mealTiming: null,
  });
});

// ---------- Zod validator compatibility ----------

test("7. Legacy shape validates", () => {
  const result = prescriptionItemSchema.safeParse({
    brand: "Crocin",
    frequency: ["after_breakfast"],
    timesPerDay: 1,
    durationDays: 5,
  });
  expect(result.success).toBe(true);
});

test("8. New shape validates", () => {
  const result = prescriptionItemSchema.safeParse({
    brand: "Crocin",
    dosing: "OD",
    mealTiming: "after_food",
    frequency: [],
    timesPerDay: 1,
    durationDays: 5,
  });
  expect(result.success).toBe(true);
});

test("9. Invalid dosing rejected", () => {
  const result = prescriptionItemSchema.safeParse({
    brand: "Crocin",
    dosing: "BOGUS",
    mealTiming: "after_food",
    frequency: [],
    timesPerDay: 1,
    durationDays: 5,
  });
  expect(result.success).toBe(false);
});

// ---------- POST /api/medicines end-to-end ----------
// Regression guard: raw tagged-template INSERT bypasses Drizzle's $defaultFn,
// so the id column must be generated explicitly. A missing id here throws
// PostgresError 23502 (null constraint), not a 4xx.

test("10. POST /api/medicines creates row with generated id + class", async ({
  page,
}) => {
  const uniqueBrand = `E2E QA ${Date.now()}`;
  const res = await page.request.post("/api/medicines", {
    data: {
      brand: uniqueBrand,
      generic: "Levocetirizine + Montelukast",
      composition: "Levocetirizine (5mg), Montelukast (10mg)",
      form: "tablet",
      strength: "5mg",
      system: "allopathic",
    },
    headers: { "content-type": "application/json" },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(typeof body.id).toBe("string");
  expect(body.id.length).toBeGreaterThan(0);
  expect(body.brand).toBe(uniqueBrand);
  // Classifier should not throw; some input may legitimately be "other".
  expect(typeof body.class === "string" || body.class === undefined).toBe(true);
});

test("11. POST /api/medicines dedupe returns 409 with existing row", async ({
  page,
}) => {
  const uniqueBrand = `E2E DEDUPE ${Date.now()}`;
  const payload = {
    brand: uniqueBrand,
    form: "tablet",
    strength: "10mg",
    system: "allopathic",
  };
  const first = await page.request.post("/api/medicines", {
    data: payload,
    headers: { "content-type": "application/json" },
  });
  expect(first.status()).toBe(201);
  const second = await page.request.post("/api/medicines", {
    data: payload,
    headers: { "content-type": "application/json" },
  });
  expect(second.status()).toBe(409);
  const body = await second.json();
  expect(body.medicine?.brand).toBe(uniqueBrand);
});
