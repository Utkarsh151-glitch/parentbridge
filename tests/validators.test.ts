import { describe, expect, it } from "vitest";
import { foreignIndicChars, isInLanguage, quoteInNotes, scanRedFlags, wordCount, ensureOptOut } from "@/lib/agent/validators";

describe("agent validators", () => {
  it("rejects a Malayalam message with a stray Telugu syllable", () => {
    const bad = "നమస്കാരം ശ്രീ വെങ്കട രമണ, ഒരു സൗജന്യ കോൾ {{BOOKING_LINK}}";
    expect(foreignIndicChars(bad, "ml")).toEqual(["te"]);
    expect(isInLanguage(bad, "ml")).toBe(false);
    expect(isInLanguage("നമസ്കാരം ശ്രീ വെങ്കട രമണ, ഒരു സൗജന്യ കോൾ {{BOOKING_LINK}}", "ml")).toBe(true);
  });

  it("lets English text quote a parent in Telugu", () => {
    expect(isInLanguage("Father asked “ఇది కాలేజీనా?” twice and wants proof the degree is regular, not distance mode.", "en", 0.7)).toBe(true);
  });

  it("counts words without the booking link and opt-out line", () => {
    expect(wordCount("Hello Ravi garu, book here {{BOOKING_LINK}}\n\nReply STOP to opt out")).toBe(5);
  });

  it("guarantees the opt-out line once", () => {
    expect(ensureOptOut("Hi")).toBe("Hi\n\nReply STOP to opt out");
    expect(ensureOptOut("Hi\n\nReply STOP to opt out.")).toBe("Hi\n\nReply STOP to opt out.");
  });

  it("verifies evidence quotes against the notes", () => {
    const notes = "Father worried degree is distance mode. Asked twice who receives the ₹2L.";
    expect(quoteInNotes("Asked twice who receives the ₹2L.", notes)).toBe(true);
    expect(quoteInNotes("Father says the programme is a scam", notes)).toBe(false);
  });

  it("flags overpromising on calls", () => {
    const flags = scanRedFlags("Told them placement is 100% guaranteed and the package will be 6 LPA. Fees can be reduced if they pay now.");
    expect(flags.map((f) => f.rule)).toEqual(expect.arrayContaining(["Job/placement guarantee", "Salary claim", "Fee promise"]));
    expect(scanRedFlags("I said honestly that no programme cohort has graduated yet.")).toEqual([]);
  });
});
