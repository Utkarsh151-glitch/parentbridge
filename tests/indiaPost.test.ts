import { describe, expect, it } from "vitest";
import { resolveDistrict } from "@/lib/geo/indiaPost";
import { districtKey } from "@/lib/geo/districts";

describe("resolve_district (India Post PIN code API)", () => {
  it("resolves 522002 to Guntur, Andhra Pradesh via the live API", async () => {
    const r = await resolveDistrict("522002", { timeoutMs: 8000 });
    expect(r.ok).toBe(true);
    expect(r.source).toBe("india_post");
    expect(r.district).toBe("Guntur");
    expect(r.state).toBe("Andhra Pradesh");
    expect(r.district_key).toBe("guntur");
  });

  it("falls back to the local cache when the API is slower than the timeout", async () => {
    const hang: typeof fetch = (_url, init) =>
      new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal!.reason)));
    const r = await resolveDistrict("522002", {
      timeoutMs: 50,
      fetchImpl: hang,
      cacheLookup: async () => ({ district: "Guntur", district_key: "guntur", state: "Andhra Pradesh" }),
    });
    expect(r.ok).toBe(true);
    expect(r.source).toBe("cache");
    expect(r.district).toBe("Guntur");
    expect(r.fallback_reason).toMatch(/timed out/);
  });

  it("rejects malformed PIN codes without calling the API", async () => {
    const r = await resolveDistrict("12AB");
    expect(r.ok).toBe(false);
    expect(r.source).toBe("none");
  });
});

describe("district keys bridge India Post's pre-2022 names and today's districts", () => {
  it.each([
    ["Krishna", "NTR (Vijayawada)"],
    ["Chittoor", "Tirupati"],
    ["K.V.Rangareddy", "Rangareddy"],
    ["Karim Nagar", "Karimnagar"],
    ["Cuddapah", "YSR Kadapa"],
  ])("%s ≈ %s", (postal, modern) => {
    expect(districtKey(postal)).toBe(districtKey(modern));
  });
});
