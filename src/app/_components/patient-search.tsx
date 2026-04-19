"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PatientRow } from "@/lib/db/schema";

type Props = { patients: PatientRow[] };

export function PatientSearch({ patients }: Props) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return patients;
    return patients.filter((p) => p.name.toLowerCase().includes(needle));
  }, [patients, q]);

  return (
    <section>
      <input
        type="search"
        placeholder="Search patients by name..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-4 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none"
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          {patients.length === 0
            ? "No patients yet. Click \u201cNew Patient\u201d to add one."
            : "No patients match your search."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Age</th>
                <th className="px-4 py-2 font-medium">First visit</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-2 font-medium">{p.name}</td>
                  <td className="px-4 py-2 text-zinc-600">{p.age}</td>
                  <td className="px-4 py-2 text-zinc-600">
                    {p.firstVisitDate}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/patients/${p.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
