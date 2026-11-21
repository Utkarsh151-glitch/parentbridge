/**
 * District normalisation.
 *
 * India Post's PIN directory still reports the *pre-2022* district map
 * (e.g. Vijayawada → "Krishna", Tirupati → "Chittoor", "K.V.Rangareddy",
 * "Karim Nagar", "Cuddapah"). parent ambassadors describe themselves with today's
 * districts ("NTR", "Tirupati"). To match them we map both onto one
 * canonical `district_key` per pre-2022 parent district.
 */
const ALIASES: Record<string, string> = {
  guntur: "guntur",
  palnadu: "guntur",
  bapatla: "guntur",
  krishna: "krishna",
  ntr: "krishna",
  "ntr (vijayawada)": "krishna",
  vijayawada: "krishna",
  visakhapatnam: "visakhapatnam",
  vishakhapatnam: "visakhapatnam",
  anakapalli: "visakhapatnam",
  hyderabad: "hyderabad",
  rangareddy: "rangareddy",
  "ranga reddy": "rangareddy",
  "k.v.rangareddy": "rangareddy",
  "k.v. rangareddy": "rangareddy",
  "medchal-malkajgiri": "rangareddy",
  "medchal malkajgiri": "rangareddy",
  vikarabad: "rangareddy",
  warangal: "warangal",
  "warangal urban": "warangal",
  "warangal rural": "warangal",
  hanumakonda: "warangal",
  karimnagar: "karimnagar",
  "karim nagar": "karimnagar",
  peddapalli: "karimnagar",
  khammam: "khammam",
  "bhadradri kothagudem": "khammam",
  nellore: "nellore",
  "spsr nellore": "nellore",
  "sri potti sriramulu nellore": "nellore",
  chittoor: "chittoor",
  tirupati: "chittoor",
  kurnool: "kurnool",
  nandyal: "kurnool",
  anantapur: "anantapur",
  ananthapur: "anantapur",
  ananthapuramu: "anantapur",
  "sri sathya sai": "anantapur",
  kadapa: "kadapa",
  cuddapah: "kadapa",
  "ysr kadapa": "kadapa",
  annamayya: "kadapa",
  "east godavari": "east_godavari",
  "west godavari": "west_godavari",
  nizamabad: "nizamabad",
  mahabubnagar: "mahabubnagar",
  mahbubnagar: "mahabubnagar",
  "mahabub nagar": "mahabubnagar",
};

const DISPLAY: Record<string, string> = {
  "k.v.rangareddy": "Rangareddy",
  "k.v. rangareddy": "Rangareddy",
  "karim nagar": "Karimnagar",
  ananthapur: "Anantapur",
  cuddapah: "Kadapa",
  mahabubnagar: "Mahbubnagar",
  "mahabub nagar": "Mahbubnagar",
};

const REGION_NOTES: Record<string, string> = {
  krishna: "India Post uses the pre-2022 Krishna district, which now also covers NTR (Vijayawada).",
  chittoor: "India Post uses the pre-2022 Chittoor district, which now also covers Tirupati.",
  rangareddy: "India Post's K.V.Rangareddy also covers parts of today's Medchal & Vikarabad.",
  guntur: "Pre-2022 Guntur district also covers today's Palnadu and Bapatla.",
  kadapa: "India Post's Cuddapah = today's YSR Kadapa (+ part of Annamayya).",
};

function norm(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bdistrict\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function districtKey(name: string | null | undefined): string {
  if (!name) return "";
  const n = norm(name);
  return ALIASES[n] ?? n.replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "");
}

export function displayDistrict(postalName: string): string {
  const n = norm(postalName);
  return DISPLAY[n] ?? postalName.trim();
}

export function regionNote(key: string): string | null {
  return REGION_NOTES[key] ?? null;
}
