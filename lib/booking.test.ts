import { describe, expect, it } from "vitest";
import { conflictsWithExisting } from "./booking";

const toDate = (value: string) => new Date(value);

describe("booking conflict detection", () => {
  it("detects overlap with buffer on adjacent slots", () => {
    const existing = [
      { startAtUtc: toDate("2025-01-15T10:00:00Z"), endAtUtc: toDate("2025-01-15T10:30:00Z") }
    ];

    const candidate = {
      startAtUtc: toDate("2025-01-15T10:35:00Z"),
      endAtUtc: toDate("2025-01-15T11:05:00Z")
    };

    expect(conflictsWithExisting(candidate, existing, 10)).toBe(true);
  });

  it("allows slot when buffer gap is respected", () => {
    const existing = [
      { startAtUtc: toDate("2025-01-15T10:00:00Z"), endAtUtc: toDate("2025-01-15T10:30:00Z") }
    ];

    const candidate = {
      startAtUtc: toDate("2025-01-15T10:40:00Z"),
      endAtUtc: toDate("2025-01-15T11:10:00Z")
    };

    expect(conflictsWithExisting(candidate, existing, 10)).toBe(false);
  });

  it("blocks direct overlap even without buffer", () => {
    const existing = [
      { startAtUtc: toDate("2025-01-15T09:30:00Z"), endAtUtc: toDate("2025-01-15T10:00:00Z") }
    ];

    const candidate = {
      startAtUtc: toDate("2025-01-15T09:45:00Z"),
      endAtUtc: toDate("2025-01-15T10:15:00Z")
    };

    expect(conflictsWithExisting(candidate, existing, 0)).toBe(true);
  });
});
