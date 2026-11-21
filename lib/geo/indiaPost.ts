import { districtKey, displayDistrict, regionNote } from "./districts";

export type DistrictResolution = {
  ok: boolean;
  pincode: string;
  district?: string; // display name, e.g. "Rangareddy"
  postal_district?: string; // raw India Post name, e.g. "K.V.Rangareddy"
  district_key?: string;
  state?: string;
  office?: string;
  source: "india_post" | "cache" | "none";
  latency_ms: number;
  note?: string | null;
  fallback_reason?: string;
  error?: string;
};

export type CacheLookup = (
  pincode: string
) => Promise<{ district: string; postal_district?: string; district_key: string; state: string; office?: string } | null>;

const API = "https://api.postalpincode.in/pincode/";

type PostOffice = { Name: string; District: string; State: string; BranchType?: string; DeliveryStatus?: string };
type ApiResponse = Array<{ Status: string; Message?: string; PostOffice: PostOffice[] | null }>;

/** Live India Post lookup with a hard timeout; returns null fields on "no such PIN". */
export async function fetchIndiaPost(
  pincode: string,
  opts: { timeoutMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<{ status: "ok"; district: string; state: string; office: string } | { status: "not_found" }> {
  const timeoutMs = opts.timeoutMs ?? 3000;
  const f = opts.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error(`India Post API timed out after ${timeoutMs} ms`)), timeoutMs);
  try {
    const res = await f(API + encodeURIComponent(pincode), {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`India Post API HTTP ${res.status}`);
    const json = (await res.json()) as ApiResponse;
    const first = Array.isArray(json) ? json[0] : null;
    if (!first || first.Status !== "Success" || !first.PostOffice?.length) return { status: "not_found" };
    // Prefer the head/sub office as the representative row.
    const po =
      first.PostOffice.find((p) => p.BranchType && p.BranchType !== "Branch Post Office") ?? first.PostOffice[0];
    return { status: "ok", district: po.District, state: po.State, office: po.Name };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve a PIN code to district/state: live India Post API first (≤3 s),
 * then the local `pincode_district` cache, clearly marked `source: "cache"`.
 */
export async function resolveDistrict(
  pincode: string,
  opts: { timeoutMs?: number; fetchImpl?: typeof fetch; cacheLookup?: CacheLookup } = {}
): Promise<DistrictResolution> {
  const t0 = Date.now();
  const pin = String(pincode).trim();
  if (!/^[1-9][0-9]{5}$/.test(pin)) {
    return { ok: false, pincode: pin, source: "none", latency_ms: 0, error: "Not a valid 6-digit Indian PIN code" };
  }
  let fallbackReason = "";
  try {
    const r = await fetchIndiaPost(pin, opts);
    if (r.status === "ok") {
      const key = districtKey(r.district);
      return {
        ok: true,
        pincode: pin,
        district: displayDistrict(r.district),
        postal_district: r.district,
        district_key: key,
        state: r.state,
        office: r.office,
        source: "india_post",
        latency_ms: Date.now() - t0,
        note: regionNote(key),
      };
    }
    fallbackReason = "India Post has no record for this PIN";
  } catch (e) {
    fallbackReason = e instanceof Error ? e.message : String(e);
  }

  if (opts.cacheLookup) {
    try {
      const c = await opts.cacheLookup(pin);
      if (c) {
        return {
          ok: true,
          pincode: pin,
          district: c.district,
          postal_district: c.postal_district,
          district_key: c.district_key,
          state: c.state,
          office: c.office,
          source: "cache",
          latency_ms: Date.now() - t0,
          note: regionNote(c.district_key),
          fallback_reason: fallbackReason,
        };
      }
    } catch {
      /* cache unavailable — fall through */
    }
  }
  return {
    ok: false,
    pincode: pin,
    source: "none",
    latency_ms: Date.now() - t0,
    fallback_reason: fallbackReason,
    error: `Could not resolve PIN ${pin}: ${fallbackReason}`,
  };
}
