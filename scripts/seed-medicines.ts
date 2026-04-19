/* eslint-disable @typescript-eslint/no-explicit-any */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createId } from "@paralleldrive/cuid2";
import { sqlClient } from "../src/lib/db/client";

type SeedMedicine = {
  brand: string;
  generic?: string;
  composition?: string;
  form?: string;
  strength?: string;
  manufacturer?: string;
  system?: "allopathic" | "ayurvedic" | "homeopathic";
  source?: string;
};

const FALLBACK: SeedMedicine[] = [
  // ---- Allopathic tablets ----
  { brand: "Crocin 500", generic: "Paracetamol", composition: "Paracetamol 500mg", form: "tablet", strength: "500mg", manufacturer: "GSK", system: "allopathic" },
  { brand: "Dolo 650", generic: "Paracetamol", composition: "Paracetamol 650mg", form: "tablet", strength: "650mg", manufacturer: "Micro Labs", system: "allopathic" },
  { brand: "Azithral 500", generic: "Azithromycin", composition: "Azithromycin 500mg", form: "tablet", strength: "500mg", manufacturer: "Alembic", system: "allopathic" },
  { brand: "Augmentin 625", generic: "Amoxicillin + Clavulanate", composition: "Amoxicillin 500mg + Clavulanic acid 125mg", form: "tablet", strength: "625mg", manufacturer: "GSK", system: "allopathic" },
  { brand: "Pan 40", generic: "Pantoprazole", composition: "Pantoprazole 40mg", form: "tablet", strength: "40mg", manufacturer: "Alkem", system: "allopathic" },
  { brand: "Cetzine 10", generic: "Cetirizine", composition: "Cetirizine 10mg", form: "tablet", strength: "10mg", manufacturer: "Dr. Reddy's", system: "allopathic" },
  { brand: "Glycomet 500", generic: "Metformin", composition: "Metformin 500mg", form: "tablet", strength: "500mg", manufacturer: "USV", system: "allopathic" },
  { brand: "Amlokind 5", generic: "Amlodipine", composition: "Amlodipine 5mg", form: "tablet", strength: "5mg", manufacturer: "Mankind", system: "allopathic" },
  { brand: "Ecosprin 75", generic: "Aspirin", composition: "Aspirin 75mg", form: "tablet", strength: "75mg", manufacturer: "USV", system: "allopathic" },
  { brand: "Montair LC", generic: "Montelukast + Levocetirizine", composition: "Montelukast 10mg + Levocetirizine 5mg", form: "tablet", strength: "10mg+5mg", manufacturer: "Cipla", system: "allopathic" },
  { brand: "Telma 40", generic: "Telmisartan", composition: "Telmisartan 40mg", form: "tablet", strength: "40mg", manufacturer: "Glenmark", system: "allopathic" },
  { brand: "Atorva 10", generic: "Atorvastatin", composition: "Atorvastatin 10mg", form: "tablet", strength: "10mg", manufacturer: "Zydus", system: "allopathic" },
  { brand: "Shelcal 500", generic: "Calcium Carbonate + Vit D3", composition: "Calcium 500mg + Vit D3 250 IU", form: "tablet", strength: "500mg", manufacturer: "Torrent", system: "allopathic" },
  { brand: "Thyronorm 50", generic: "Levothyroxine", composition: "Levothyroxine 50mcg", form: "tablet", strength: "50mcg", manufacturer: "Abbott", system: "allopathic" },
  { brand: "Concor 5", generic: "Bisoprolol", composition: "Bisoprolol 5mg", form: "tablet", strength: "5mg", manufacturer: "Merck", system: "allopathic" },
  { brand: "Clopilet 75", generic: "Clopidogrel", composition: "Clopidogrel 75mg", form: "tablet", strength: "75mg", manufacturer: "Sun Pharma", system: "allopathic" },
  { brand: "Cifran 500", generic: "Ciprofloxacin", composition: "Ciprofloxacin 500mg", form: "tablet", strength: "500mg", manufacturer: "Ranbaxy", system: "allopathic" },
  { brand: "Flagyl 400", generic: "Metronidazole", composition: "Metronidazole 400mg", form: "tablet", strength: "400mg", manufacturer: "Abbott", system: "allopathic" },
  { brand: "Brufen 400", generic: "Ibuprofen", composition: "Ibuprofen 400mg", form: "tablet", strength: "400mg", manufacturer: "Abbott", system: "allopathic" },
  { brand: "Combiflam", generic: "Ibuprofen + Paracetamol", composition: "Ibuprofen 400mg + Paracetamol 325mg", form: "tablet", strength: "400mg+325mg", manufacturer: "Sanofi", system: "allopathic" },
  { brand: "Zerodol SP", generic: "Aceclofenac + Serratiopeptidase + Paracetamol", composition: "Aceclofenac 100mg + Serratiopeptidase 15mg + Paracetamol 325mg", form: "tablet", manufacturer: "Ipca", system: "allopathic" },
  { brand: "Dytor 10", generic: "Torsemide", composition: "Torsemide 10mg", form: "tablet", strength: "10mg", manufacturer: "Cipla", system: "allopathic" },
  { brand: "Lasix 40", generic: "Furosemide", composition: "Furosemide 40mg", form: "tablet", strength: "40mg", manufacturer: "Sanofi", system: "allopathic" },
  { brand: "Rantac 150", generic: "Ranitidine", composition: "Ranitidine 150mg", form: "tablet", strength: "150mg", manufacturer: "JB Chemicals", system: "allopathic" },
  { brand: "Dexona 0.5", generic: "Dexamethasone", composition: "Dexamethasone 0.5mg", form: "tablet", strength: "0.5mg", manufacturer: "Zydus", system: "allopathic" },
  { brand: "Wysolone 10", generic: "Prednisolone", composition: "Prednisolone 10mg", form: "tablet", strength: "10mg", manufacturer: "Pfizer", system: "allopathic" },
  { brand: "Allegra 120", generic: "Fexofenadine", composition: "Fexofenadine 120mg", form: "tablet", strength: "120mg", manufacturer: "Sanofi", system: "allopathic" },
  { brand: "Dulcoflex 5", generic: "Bisacodyl", composition: "Bisacodyl 5mg", form: "tablet", strength: "5mg", manufacturer: "Boehringer", system: "allopathic" },
  { brand: "Meftal Spas", generic: "Mefenamic + Dicyclomine", composition: "Mefenamic 250mg + Dicyclomine 10mg", form: "tablet", manufacturer: "Blue Cross", system: "allopathic" },
  { brand: "Betadine Gargle", generic: "Povidone-Iodine", composition: "Povidone-Iodine 2%", form: "gargle", strength: "2%", manufacturer: "Win-Medicare", system: "allopathic" },

  // ---- Syrups ----
  { brand: "Ascoril LS Syrup", generic: "Levosalbutamol + Ambroxol + Guaifenesin", composition: "Levosalbutamol 1mg + Ambroxol 30mg + Guaifenesin 50mg / 10ml", form: "syrup", manufacturer: "Glenmark", system: "allopathic" },
  { brand: "Benadryl Syrup", generic: "Diphenhydramine + Ammonium Chloride", composition: "Diphenhydramine 14mg + NH4Cl 138mg / 10ml", form: "syrup", manufacturer: "J&J", system: "allopathic" },
  { brand: "Grilinctus Syrup", generic: "Dextromethorphan + Chlorpheniramine", composition: "Dextromethorphan 5mg + Chlorpheniramine 2.5mg / 5ml", form: "syrup", manufacturer: "Franco-Indian", system: "allopathic" },
  { brand: "Combiflam Suspension", generic: "Ibuprofen + Paracetamol", composition: "Ibuprofen 100mg + Paracetamol 162.5mg / 5ml", form: "syrup", manufacturer: "Sanofi", system: "allopathic" },
  { brand: "Cremaffin Syrup", generic: "Liquid Paraffin + Milk of Magnesia", form: "syrup", manufacturer: "Abbott", system: "allopathic" },
  { brand: "Zincovit Syrup", generic: "Multivitamin + Zinc", form: "syrup", manufacturer: "Apex", system: "allopathic" },
  { brand: "Digene Syrup", generic: "Magnesium + Aluminium Hydroxide + Simethicone", form: "syrup", manufacturer: "Abbott", system: "allopathic" },
  { brand: "P-125 Syrup", generic: "Paracetamol", composition: "Paracetamol 125mg / 5ml", form: "syrup", manufacturer: "Micro Labs", system: "allopathic" },

  // ---- Capsules ----
  { brand: "Omez 20", generic: "Omeprazole", composition: "Omeprazole 20mg", form: "capsule", strength: "20mg", manufacturer: "Dr. Reddy's", system: "allopathic" },
  { brand: "Mox 500", generic: "Amoxicillin", composition: "Amoxicillin 500mg", form: "capsule", strength: "500mg", manufacturer: "Sun Pharma", system: "allopathic" },
  { brand: "Becosules", generic: "B-complex + Vitamin C", form: "capsule", manufacturer: "Pfizer", system: "allopathic" },
  { brand: "Evion 400", generic: "Vitamin E", composition: "Vitamin E 400mg", form: "capsule", strength: "400mg", manufacturer: "Merck", system: "allopathic" },
  { brand: "Neurobion Forte", generic: "B1 + B6 + B12", form: "tablet", manufacturer: "Merck", system: "allopathic" },
  { brand: "Livogen", generic: "Ferrous Fumarate + Folic Acid", form: "capsule", manufacturer: "Merck", system: "allopathic" },
  { brand: "Supradyn", generic: "Multivitamin + Minerals", form: "tablet", manufacturer: "Abbott", system: "allopathic" },

  // ---- Injections ----
  { brand: "Monocef 1g", generic: "Ceftriaxone", composition: "Ceftriaxone 1g", form: "injection", strength: "1g", manufacturer: "Aristo", system: "allopathic" },
  { brand: "Taxim 1g", generic: "Cefotaxime", composition: "Cefotaxime 1g", form: "injection", strength: "1g", manufacturer: "Alkem", system: "allopathic" },
  { brand: "Voveran Injection", generic: "Diclofenac", composition: "Diclofenac 75mg/3ml", form: "injection", manufacturer: "Novartis", system: "allopathic" },
  { brand: "Perinorm Injection", generic: "Metoclopramide", form: "injection", manufacturer: "Ipca", system: "allopathic" },

  // ---- Ointments ----
  { brand: "Betnovate", generic: "Betamethasone", composition: "Betamethasone 0.1%", form: "ointment", strength: "0.1%", manufacturer: "GSK", system: "allopathic" },
  { brand: "Clobetasol", generic: "Clobetasol Propionate", composition: "Clobetasol 0.05%", form: "ointment", strength: "0.05%", manufacturer: "various", system: "allopathic" },
  { brand: "Framycetin", generic: "Framycetin Sulphate", composition: "Framycetin 1%", form: "ointment", strength: "1%", manufacturer: "Sanofi", system: "allopathic" },
  { brand: "Soframycin", generic: "Framycetin", form: "ointment", manufacturer: "Sanofi", system: "allopathic" },
  { brand: "Quadriderm", generic: "Betamethasone + Gentamicin + Tolnaftate + Clioquinol", form: "cream", manufacturer: "MSD", system: "allopathic" },
  { brand: "Volini Gel", generic: "Diclofenac + Menthol + Methyl Salicylate", form: "gel", manufacturer: "Sun Pharma", system: "allopathic" },

  // ---- Drops ----
  { brand: "Optimol Eye Drops", generic: "Timolol Maleate", composition: "Timolol 0.5%", form: "eye drops", strength: "0.5%", manufacturer: "Cipla", system: "allopathic" },
  { brand: "Otogesic Ear Drops", generic: "Antipyrine + Benzocaine", form: "ear drops", manufacturer: "FDC", system: "allopathic" },
  { brand: "Nasivion", generic: "Oxymetazoline", composition: "Oxymetazoline 0.05%", form: "nasal drops", strength: "0.05%", manufacturer: "Merck", system: "allopathic" },
  { brand: "Moxicip Eye Drops", generic: "Moxifloxacin", composition: "Moxifloxacin 0.5%", form: "eye drops", strength: "0.5%", manufacturer: "Cipla", system: "allopathic" },
  { brand: "Otek AC", generic: "Clotrimazole + Beclomethasone + Chloramphenicol + Lignocaine", form: "ear drops", manufacturer: "Micro Labs", system: "allopathic" },

  // ---- Ayurvedic ----
  { brand: "Triphala Churna", generic: "Triphala", composition: "Amla + Haritaki + Bibhitaki", form: "powder", manufacturer: "Baidyanath", system: "ayurvedic" },
  { brand: "Ashwagandha", generic: "Withania somnifera", form: "tablet", manufacturer: "Himalaya", system: "ayurvedic" },
  { brand: "Liv.52", generic: "Himsra + Kasani + Mandur Bhasma", form: "tablet", manufacturer: "Himalaya", system: "ayurvedic" },
  { brand: "Chyawanprash", generic: "Amla-based formulation", form: "paste", manufacturer: "Dabur", system: "ayurvedic" },
  { brand: "Arjunarishta", generic: "Terminalia arjuna", form: "liquid", manufacturer: "Baidyanath", system: "ayurvedic" },
  { brand: "Brahmi Vati", generic: "Bacopa monnieri", form: "tablet", manufacturer: "Baidyanath", system: "ayurvedic" },
  { brand: "Tulsi Drops", generic: "Ocimum sanctum", form: "drops", manufacturer: "Patanjali", system: "ayurvedic" },
  { brand: "Hingvashtak Churna", generic: "Hingvashtak", form: "powder", manufacturer: "Dabur", system: "ayurvedic" },
  { brand: "Swarna Bhasma", generic: "Gold Bhasma", form: "powder", manufacturer: "Baidyanath", system: "ayurvedic" },
  { brand: "Dashmool Kwath", generic: "Dashmool decoction", form: "liquid", manufacturer: "Baidyanath", system: "ayurvedic" },
  { brand: "Shatavari Churna", generic: "Asparagus racemosus", form: "powder", manufacturer: "Baidyanath", system: "ayurvedic" },
  { brand: "Giloy Ghanvati", generic: "Tinospora cordifolia", form: "tablet", manufacturer: "Patanjali", system: "ayurvedic" },
  { brand: "Cystone", generic: "Shilapushpa + Pashanabheda", form: "tablet", manufacturer: "Himalaya", system: "ayurvedic" },
  { brand: "Septilin", generic: "Guggul + Tinospora + Licorice", form: "tablet", manufacturer: "Himalaya", system: "ayurvedic" },
  { brand: "Mahanarayan Oil", generic: "Mahanarayan Taila", form: "oil", manufacturer: "Baidyanath", system: "ayurvedic" },

  // ---- Homeopathic ----
  { brand: "Arnica Montana 30", generic: "Arnica montana", form: "dilution", strength: "30C", manufacturer: "SBL", system: "homeopathic" },
  { brand: "Belladonna 30", generic: "Atropa belladonna", form: "dilution", strength: "30C", manufacturer: "SBL", system: "homeopathic" },
  { brand: "Bryonia Alba 200", generic: "Bryonia alba", form: "dilution", strength: "200C", manufacturer: "SBL", system: "homeopathic" },
  { brand: "Nux Vomica 30", generic: "Strychnos nux-vomica", form: "dilution", strength: "30C", manufacturer: "SBL", system: "homeopathic" },
  { brand: "Rhus Tox 200", generic: "Rhus toxicodendron", form: "dilution", strength: "200C", manufacturer: "SBL", system: "homeopathic" },
  { brand: "Pulsatilla 30", generic: "Pulsatilla nigricans", form: "dilution", strength: "30C", manufacturer: "SBL", system: "homeopathic" },
  { brand: "Hepar Sulph 200", generic: "Hepar sulphuris calcareum", form: "dilution", strength: "200C", manufacturer: "SBL", system: "homeopathic" },
  { brand: "Kali Bich 30", generic: "Kalium bichromicum", form: "dilution", strength: "30C", manufacturer: "SBL", system: "homeopathic" },
  { brand: "Ignatia 200", generic: "Ignatia amara", form: "dilution", strength: "200C", manufacturer: "SBL", system: "homeopathic" },
  { brand: "Aconite 30", generic: "Aconitum napellus", form: "dilution", strength: "30C", manufacturer: "SBL", system: "homeopathic" },
  { brand: "Sulphur 30", generic: "Sulphur", form: "dilution", strength: "30C", manufacturer: "SBL", system: "homeopathic" },
  { brand: "Calcarea Carb 200", generic: "Calcarea carbonica", form: "dilution", strength: "200C", manufacturer: "SBL", system: "homeopathic" },
  { brand: "Lycopodium 200", generic: "Lycopodium clavatum", form: "dilution", strength: "200C", manufacturer: "SBL", system: "homeopathic" },
  { brand: "Phosphorus 30", generic: "Phosphorus", form: "dilution", strength: "30C", manufacturer: "SBL", system: "homeopathic" },
  { brand: "Natrum Mur 30", generic: "Natrum muriaticum", form: "dilution", strength: "30C", manufacturer: "SBL", system: "homeopathic" },
];

function loadFromJson(): SeedMedicine[] | null {
  const path = resolve(process.cwd(), "../data/medicines.json");
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as SeedMedicine[];
  } catch (err) {
    console.warn("[seed] Failed to read/parse medicines.json:", err);
    return null;
  }
}

type MedicineInsert = {
  id: string;
  brand: string;
  generic: string | null;
  composition: string | null;
  form: string | null;
  strength: string | null;
  manufacturer: string | null;
  system: string | null;
  source: string;
};

async function main() {
  const jsonData = loadFromJson();
  const rows = jsonData ?? FALLBACK;
  const source = jsonData ? "data-agent" : "seed-fallback";
  console.log(
    `[seed] Seeding ${rows.length} medicines into Postgres from ${jsonData ? "data/medicines.json" : "built-in fallback list"}`,
  );

  const sql = sqlClient;

  // Wipe existing medicines.
  await sql`DELETE FROM medicines`;

  // Make sure pg_trgm is available and create an index for ILIKE searches.
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
    await sql`CREATE INDEX IF NOT EXISTS medicines_brand_trgm_idx ON medicines USING gin (brand gin_trgm_ops)`;
    await sql`CREATE INDEX IF NOT EXISTS medicines_generic_trgm_idx ON medicines USING gin (generic gin_trgm_ops)`;
    await sql`CREATE INDEX IF NOT EXISTS medicines_composition_trgm_idx ON medicines USING gin (composition gin_trgm_ops)`;
  } catch (err) {
    console.warn("[seed] Trigram index setup failed (non-fatal):", err);
  }

  const chunkSize = 1000;
  const startedAt = Date.now();

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk: MedicineInsert[] = rows.slice(i, i + chunkSize).map((m) => ({
      id: createId(),
      brand: m.brand,
      generic: m.generic ?? null,
      composition: m.composition ?? null,
      form: m.form ?? null,
      strength: m.strength ?? null,
      manufacturer: m.manufacturer ?? null,
      system: m.system ?? null,
      source: m.source ?? source,
    }));

    // postgres-js bulk insert: sql(rows, ...cols)
    await sql`INSERT INTO medicines ${sql(
      chunk,
      "id",
      "brand",
      "generic",
      "composition",
      "form",
      "strength",
      "manufacturer",
      "system",
      "source",
    )}`;

    if (rows.length > 5000 && (i + chunkSize) % 10000 === 0) {
      const pct = Math.round(((i + chunkSize) / rows.length) * 100);
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(
        `[seed] ${Math.min(i + chunkSize, rows.length)}/${rows.length} (${pct}%, ${elapsed}s)`,
      );
    }
  }

  const total = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[seed] Done in ${total}s.`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
