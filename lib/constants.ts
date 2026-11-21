// Shared domain constants. Safe to import from client and server.

export const LANGUAGES = {
  te: { name: "Telugu", native: "తెలుగు", locale: "te-IN" },
  hi: { name: "Hindi", native: "हिन्दी", locale: "hi-IN" },
  ta: { name: "Tamil", native: "தமிழ்", locale: "ta-IN" },
  kn: { name: "Kannada", native: "ಕನ್ನಡ", locale: "kn-IN" },
  ml: { name: "Malayalam", native: "മലയാളം", locale: "ml-IN" },
  en: { name: "English", native: "English", locale: "en-IN" },
} as const;

export type LangCode = keyof typeof LANGUAGES;
export const LANG_CODES = Object.keys(LANGUAGES) as LangCode[];

export function langName(code: string | undefined | null): string {
  return (code && LANGUAGES[code as LangCode]?.name) || code || "—";
}

export const DOUBT_CATEGORIES = [
  "trust_not_a_college",
  "degree_validity",
  "two_fee_payees",
  "placement",
  "hostel_safety",
  "distance",
  "price",
  "other",
] as const;
export type DoubtCategory = (typeof DOUBT_CATEGORIES)[number];

export const DOUBT_LABELS: Record<DoubtCategory, string> = {
  trust_not_a_college: "“the programme is not a college”",
  degree_validity: "Degree validity",
  two_fee_payees: "Fees go to two parties",
  placement: "Placements / no graduated batch",
  hostel_safety: "Hostel & safety",
  distance: "Distance from home",
  price: "Price / affordability",
  other: "Other",
};

export const LEAD_STATUSES = [
  "counselled",
  "offered",
  "call_booked",
  "call_done",
  "seat_reserved",
  "withdrawn",
  "no_response",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  counselled: "Counselled",
  offered: "Offered",
  call_booked: "Call booked",
  call_done: "Call done",
  seat_reserved: "Seat reserved",
  withdrawn: "Withdrawn",
  no_response: "No response",
};

export const EVENT_TYPES = [
  "offered",
  "accepted",
  "call_done",
  "seat_reserved",
  "withdrawn_30d",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const UNIVERSITIES = [
  { name: "Chaitanya (Deemed to be University)", city: "Hyderabad", state: "Telangana" },
  { name: "Aurora Deemed University", city: "Hyderabad", state: "Telangana" },
  { name: "NRI University", city: "Vijayawada", state: "Andhra Pradesh" },
  { name: "Annamacharya University", city: "Rajampet", state: "Andhra Pradesh" },
  { name: "BEST Innovation University", city: "Anantapur", state: "Andhra Pradesh" },
] as const;

export const FEE_BANDS = { low: 2, mid: 3, high: 4.5 } as const; // ₹ lakh / year
export type FeeBand = keyof typeof FEE_BANDS;

export const CREDIT_PER_CALL_INR = 1500;
export const OPT_OUT_LINE = "Reply STOP to opt out";
export const BOOKING_PLACEHOLDER = "{{BOOKING_LINK}}";

// Experiment decision rule (Layer 2 thresholds)
export const EXPERIMENT = {
  windowDays: 14,
  winMinConversion: 0.15,
  winMinLift: 1.5,
  killBelowLift: 1.2,
  minCallAcceptance: 0.3,
} as const;
