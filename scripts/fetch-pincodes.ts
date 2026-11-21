/**
 * One-off: verify the seed PIN codes against the configured public postal lookup and write
 * data/pincodes.json (used by the seed script and as the offline fallback cache).
 *   npx tsx scripts/fetch-pincodes.ts
 */
import { writeFileSync } from "node:fs";
import { fetchIndiaPost } from "../lib/geo/indiaPost";
import { districtKey, displayDistrict } from "../lib/geo/districts";

const CANDIDATES: Record<string, string[]> = {
  guntur: ["522001", "522002", "522003", "522004", "522006", "522007", "522201", "522601", "522101", "522503"],
  krishna: ["520001", "520002", "520003", "520004", "520007", "520008", "520010", "520011", "520012", "520013", "520015", "521101", "521001", "521301"],
  visakhapatnam: ["530001", "530002", "530003", "530013", "530016", "530017", "530020", "530022", "530024", "530026", "530040", "530041", "530045", "531001"],
  hyderabad: ["500001", "500004", "500012", "500016", "500020", "500027", "500028", "500034", "500036", "500038", "500044", "500074"],
  rangareddy: ["500032", "501218", "500030", "500070", "500075", "500097", "500079", "501301", "501505", "500086"],
  warangal: ["506001", "506002", "506003", "506004", "506007", "506009", "506013", "506015"],
  karimnagar: ["505001", "505002", "505209", "505301", "505327"],
  khammam: ["507001", "507002", "507003", "507101", "507111"],
  nellore: ["524001", "524002", "524003", "524004", "524101", "524201"],
  chittoor: ["517501", "517502", "517503", "517507", "517001", "517325"],
  kurnool: ["518001", "518002", "518003", "518004", "518501", "518301"],
  anantapur: ["515001", "515002", "515004", "515801", "515201"],
  kadapa: ["516001", "516002", "516126", "516360"],
  east_godavari: ["533101", "533001", "533103"],
  other_ts: ["503001", "509001"],
};

async function main() {
  const out: Array<Record<string, string>> = [];
  for (const [group, pins] of Object.entries(CANDIDATES)) {
    for (const pin of pins) {
      try {
        const r = await fetchIndiaPost(pin, { timeoutMs: 8000 });
        if (r.status === "ok") {
          const row = {
            pincode: pin,
            district: displayDistrict(r.district),
            postal_district: r.district,
            district_key: districtKey(r.district),
            state: r.state,
            office: r.office,
          };
          out.push(row);
          console.log(`${pin} ✓ ${row.district} (${row.postal_district}), ${row.state} [${group}→${row.district_key}]`);
        } else {
          console.log(`${pin} ✗ not found`);
        }
      } catch (e) {
        console.log(`${pin} ✗ ${(e as Error).message}`);
      }
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  writeFileSync("data/pincodes.json", JSON.stringify(out, null, 1));
  console.log(`\nWrote ${out.length} verified PIN codes to data/pincodes.json`);
}

main();
