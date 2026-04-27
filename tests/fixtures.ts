import type { APIRequestContext } from "@playwright/test";

/**
 * Ensure the dev doctor has a complete profile so the `requireDoctor()`
 * gate lets clinical pages render. Idempotent: PUTs the minimum profile
 * whenever any gate-required field is missing.
 */
export async function ensureDoctorProfile(request: APIRequestContext): Promise<{
  created: boolean;
  status: number;
}> {
  const existing = await request.get("/api/doctor");
  if (existing.ok()) {
    const body = await existing.json();
    const hasClinic =
      typeof body?.clinicName === "string" && body.clinicName.trim().length > 0;
    const hasReg =
      typeof body?.registrationNumber === "string" &&
      body.registrationNumber.trim().length > 0;
    const degrees = Array.isArray(body?.degrees) ? body.degrees : [];
    if (hasClinic && hasReg && degrees.length > 0) {
      return { created: false, status: existing.status() };
    }
  }

  const put = await request.put("/api/doctor", {
    data: {
      clinicName: "Test Clinic",
      clinicAddress: null,
      clinicPhone: null,
      registrationNumber: "MCI-TEST-001",
      degrees: ["MBBS"],
      specialty: null,
      timings: null,
      signatureDataUrl: null,
    },
  });
  if (!put.ok()) {
    const text = await put.text();
    throw new Error(
      `ensureDoctorProfile: PUT /api/doctor failed (${put.status()}): ${text}`
    );
  }
  return { created: true, status: put.status() };
}

export async function ensureSeedData(request: APIRequestContext): Promise<{
  patientId: string;
  visitId: string;
  patientCreated: boolean;
  visitCreated: boolean;
}> {
  // Find or create a patient.
  const listRes = await request.get("/api/patients");
  if (!listRes.ok()) {
    throw new Error(
      `ensureSeedData: GET /api/patients failed (${listRes.status()}): ${await listRes.text()}`
    );
  }
  const listBody = await listRes.json();
  const existingPatient =
    Array.isArray(listBody?.patients) && listBody.patients.length > 0
      ? listBody.patients[0]
      : null;

  let patientId: string;
  let patientCreated = false;
  if (existingPatient?.id) {
    patientId = existingPatient.id;
  } else {
    const today = new Date().toISOString().slice(0, 10);
    const createRes = await request.post("/api/patients", {
      data: {
        name: "Test Patient",
        age: 42,
        firstVisitDate: today,
        conditions: [],
        notes: "",
      },
    });
    if (!createRes.ok()) {
      throw new Error(
        `ensureSeedData: POST /api/patients failed (${createRes.status()}): ${await createRes.text()}`
      );
    }
    const created = await createRes.json();
    patientId = created.id;
    patientCreated = true;
  }

  // Find or create a visit for that patient.
  const visitsRes = await request.get(`/api/patients/${patientId}/visits`);
  if (!visitsRes.ok()) {
    throw new Error(
      `ensureSeedData: GET /api/patients/${patientId}/visits failed (${visitsRes.status()}): ${await visitsRes.text()}`
    );
  }
  const visitsBody = await visitsRes.json();
  const existingVisit =
    Array.isArray(visitsBody?.visits) && visitsBody.visits.length > 0
      ? visitsBody.visits[0]
      : null;

  let visitId: string;
  let visitCreated = false;
  if (existingVisit?.id) {
    visitId = existingVisit.id;
  } else {
    const today = new Date().toISOString().slice(0, 10);
    const visitRes = await request.post(`/api/patients/${patientId}/visits`, {
      data: {
        visitDate: today,
        prescription: {
          items: [
            {
              brand: "Test Med",
              generic: "testosterone-free placebo",
              form: "tablet",
              strength: "500 mg",
              frequency: ["after_breakfast"],
              timesPerDay: 1,
              durationDays: 5,
              notes: "",
            },
          ],
          freeText: "Seeded visit for Phase 1 smoke tests.",
        },
      },
    });
    if (!visitRes.ok()) {
      throw new Error(
        `ensureSeedData: POST visit failed (${visitRes.status()}): ${await visitRes.text()}`
      );
    }
    const createdVisit = await visitRes.json();
    visitId = createdVisit.id;
    visitCreated = true;
  }

  return { patientId, visitId, patientCreated, visitCreated };
}

// ---------- Helpers used by specs ----------

function parseHex(hex: string): [number, number, number] | null {
  const m = hex.trim().replace(/^#/, "");
  if (m.length === 3) {
    const r = parseInt(m[0] + m[0], 16);
    const g = parseInt(m[1] + m[1], 16);
    const b = parseInt(m[2] + m[2], 16);
    return [r, g, b];
  }
  if (m.length === 6) {
    const r = parseInt(m.slice(0, 2), 16);
    const g = parseInt(m.slice(2, 4), 16);
    const b = parseInt(m.slice(4, 6), 16);
    return [r, g, b];
  }
  return null;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

export function contrastRatio(fgHex: string, bgHex: string): number {
  const fg = parseHex(fgHex);
  const bg = parseHex(bgHex);
  if (!fg || !bg) return 0;
  const lf = relativeLuminance(fg);
  const lb = relativeLuminance(bg);
  const L1 = Math.max(lf, lb);
  const L2 = Math.min(lf, lb);
  return (L1 + 0.05) / (L2 + 0.05);
}
