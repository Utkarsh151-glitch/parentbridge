/**
 * Seed MongoDB with synthetic demo data.
 *   npm run seed            (refuses if leads already exist)
 *   npm run seed -- --reset (wipes the demo collections first)
 */
import "./env";
import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../lib/db/connect";
import * as M from "../lib/db/models";
import { districtKey } from "../lib/geo/districts";
import {
  AMBASSADORS, CLOSERS, DOUBT_WEIGHTS, FEATURED, KM, LEAD_DISTRICTS, NAMES, NOTE_BANK, OPENERS, REGION,
  RELATIVES, UNI_PREF,
} from "./seed-data";
import { FEE_BANDS, UNIVERSITIES } from "../lib/constants";

type Pin = { pincode: string; district: string; postal_district: string; district_key: string; state: string; office: string };

// Deterministic RNG so the demo is reproducible.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261120);
const pick = <T>(a: readonly T[]): T => a[Math.floor(rng() * a.length)];
function weighted<T>(pairs: Array<[T, number]>): T {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of pairs) if ((r -= w) <= 0) return v;
  return pairs[pairs.length - 1][0];
}
function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const fakePhone = (n: number) => `+91 00000 ${String(n).padStart(5, "0")}`; // invalid prefix → obviously fake

function chooseLanguage(key: string): "te" | "hi" | "ta" | "kn" | "en" {
  const r = rng();
  if (r < 0.04) return "en";
  if ((key === "hyderabad" || key === "rangareddy") && r < 0.29) return "hi";
  if (key === "chittoor" && r < 0.24) return "ta";
  if ((key === "anantapur" || key === "kurnool") && r < 0.24) return "kn";
  return "te";
}

function makeNotes(lang: string, fill: Record<string, string>): string {
  const group = lang === "hi" ? "hi" : lang === "te" ? "te" : "en";
  const n = rng() < 0.55 ? 2 : 3;
  const cats = new Set<string>();
  const near = Number(fill.km) < 80; // "distance" only makes sense when the campus is far away
  while (cats.size < n) {
    const c = weighted(DOUBT_WEIGHTS as Array<[string, number]>);
    if (!(near && c === "distance")) cats.add(c);
  }
  const sentences: string[] = [];
  if (rng() < 0.3) sentences.push(pick(OPENERS[group as keyof typeof OPENERS] ?? OPENERS.en));
  for (const c of cats) {
    const bank = NOTE_BANK[c];
    const pool = group !== "en" && rng() < 0.75 ? bank[group as "te" | "hi"] : bank.en;
    sentences.push(pick(pool));
  }
  if (sentences.length < 4 && rng() < 0.5) sentences.push(pick(CLOSERS[group as keyof typeof CLOSERS] ?? CLOSERS.en));
  let text = sentences.slice(0, 4).join(" ");
  for (const [k, v] of Object.entries(fill)) text = text.replaceAll(`{${k}}`, v);
  // "{who}" sometimes starts a sentence after a quote — capitalise first letters.
  return text.replace(/(^|[.?!]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase());
}

async function main() {
  const reset = process.argv.includes("--reset");
  const dry = process.argv.includes("--dry"); // generate + print only, no database
  if (!dry) {
    await connectDB();
    console.log(`Connected to ${mongoose.connection.db!.databaseName}`);
  }

  const existing = dry ? 0 : await M.Lead.estimatedDocumentCount();
  if (existing > 0 && !reset) {
    console.log(`Database already has ${existing} leads. Re-run with --reset to wipe and reseed.`);
    await disconnectDB();
    return;
  }
  if (reset && !dry) {
    for (const m of Object.values(M)) {
      if (typeof m === "function" && "deleteMany" in m) await (m as typeof M.Lead).deleteMany({});
    }
    console.log("Wiped demo collections.");
  }

  // Indexes (incl. the TTL index for rate limits)
  if (!dry) for (const m of Object.values(M)) {
    if (typeof m === "function" && "syncIndexes" in m) await (m as typeof M.Lead).syncIndexes();
  }

  // ── pincode_district fallback cache ──
  const pins: Pin[] = JSON.parse(readFileSync("data/pincodes.json", "utf8"));
  if (!dry) await M.PincodeDistrict.insertMany(pins);
  console.log(`pincode_district: ${pins.length}`);

  // ── ambassadors ──
  const ambDocs = AMBASSADORS.map((a, i) => ({
    ...a,
    district_key: districtKey(a.district),
    phone: fakePhone(10001 + i),
    max_calls_per_week: 3,
    calls_this_week: a.calls_this_week ?? Math.floor(rng() * 2),
    active: a.active ?? true,
    consent_given: a.consent_given ?? true,
  }));
  if (!dry) await M.Ambassador.insertMany(ambDocs);
  console.log(`ambassadors: ${ambDocs.length}`);

  // ── leads ──
  const pinsByKey = pins.reduce<Record<string, Pin[]>>((m, p) => ((m[p.district_key] ??= []).push(p), m), {});
  const leads: Array<Record<string, unknown>> = [];
  let phoneN = 20001;
  for (const [key, count] of Object.entries(LEAD_DISTRICTS)) {
    const pool = pinsByKey[key];
    if (!pool?.length) throw new Error(`No verified PIN codes for ${key}`);
    for (let i = 0; i < count; i++) {
      const pin = pick(pool);
      const lang = chooseLanguage(key);
      const nameBank = NAMES[(lang === "en" ? "te" : lang) as keyof typeof NAMES];
      const female = rng() < 0.45;
      const surname = pick(nameBank.surnames);
      const parentIsMother = rng() < 0.4;
      const parent = `${pick(parentIsMother ? nameBank.parentFemale : nameBank.parentMale)} ${surname}`;
      const student = `${pick(female ? nameBank.studentFemale : nameBank.studentMale)} ${surname}`;
      const uni = rng() < 0.1 ? "" : weighted(UNI_PREF[REGION[key]] as Array<[string, number]>);
      const uniCity = UNIVERSITIES.find((u) => u.name === uni)?.city ?? "Hyderabad";
      const fee_band = weighted([["low", 0.35], ["mid", 0.4], ["high", 0.25]] as Array<["low" | "mid" | "high", number]>);
      const notes = makeNotes(lang, {
        fee: String(FEE_BANDS[fee_band]),
        uni: uni || "the university",
        city: uniCity,
        km: String(KM[key]?.[uniCity] ?? 200),
        rel: pick(RELATIVES),
        who: parentIsMother ? "Mother" : "Father",
      });
      leads.push({
        student_name: student,
        parent_name: parent,
        parent_phone: fakePhone(phoneN++),
        pincode: pin.pincode,
        district: pin.district,
        district_key: pin.district_key,
        state: pin.state,
        language: lang,
        preferred_university: uni,
        fee_band,
        counselling_date: new Date(Date.now() - (8 + Math.floor(rng() * 28)) * 86_400_000),
        counselling_notes: notes,
        status: "counselled",
        consent_whatsapp: rng() < 0.93,
        source: "seed",
        in_experiment: true,
        featured: false,
      });
    }
  }
  if (leads.length !== 400) throw new Error(`Expected 400 leads, got ${leads.length}`);

  // Random assignment: shuffle, exactly 200 treatment / 200 control.
  const order = shuffle([...leads.keys()]);
  order.forEach((idx, rank) => (leads[idx].arm = rank < 200 ? "treatment" : "control"));

  // Showcase families take the first treatment-arm slots (content only; assignment stays random).
  const pinMap = new Map(pins.map((p) => [p.pincode, p]));
  const treatmentIdx = order.slice(0, FEATURED.length);
  FEATURED.forEach((f, k) => {
    const p = pinMap.get(f.pincode);
    if (!p) throw new Error(`Featured PIN ${f.pincode} missing from data/pincodes.json`);
    Object.assign(leads[treatmentIdx[k]], {
      student_name: f.student_name,
      parent_name: f.parent_name,
      pincode: f.pincode,
      district: p.district,
      district_key: p.district_key,
      state: p.state,
      language: f.language,
      preferred_university: f.preferred_university,
      fee_band: f.fee_band,
      counselling_notes: f.counselling_notes,
      counselling_date: new Date(Date.now() - f.days_ago * 86_400_000),
      consent_whatsapp: true,
      featured: true,
    });
  });

  if (!dry) await M.Lead.insertMany(leads);
  const tally = (k: string) => leads.reduce<Record<string, number>>((m, l) => ((m[String(l[k])] = (m[String(l[k])] ?? 0) + 1), m), {});
  const byArm = tally("arm");
  const byLang = tally("language");
  console.log(`leads: ${leads.length} · arms ${JSON.stringify(byArm)} · languages ${JSON.stringify(byLang)}`);
  console.log("\nSample notes:");
  for (const l of dry ? leads.filter((_, i) => i % 37 === 0) : leads.slice(0, 4)) console.log(` - [${l.language}] ${l.counselling_notes}`);
  if (!dry) await disconnectDB();
  console.log(dry ? "\nDry run complete (nothing written)." : "\nSeed complete.");
}

main().catch(async (e) => {
  console.error(e);
  await disconnectDB();
  process.exit(1);
});
